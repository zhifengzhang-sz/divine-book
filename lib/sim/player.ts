/**
 * Player state machine — the only XState v5 machine in the simulator.
 *
 * Implements design §5.2 (Player as Event Processor) and
 * design.reactive.md §5 (The Player as Event Bus).
 *
 * The player:
 *   - Receives intent events (HIT, HEAL, APPLY_STATE, etc.)
 *   - Reacts by mutating its own state
 *   - Emits state-change events to subscribers (via `emit`)
 *   - Routes named state lifecycle events to registered affix listeners
 *   - Sends new intent events to opponent (via `sendTo`)
 *   - Terminates at DEATH (absorbing boundary → XState `final` state)
 */

import {
	type ActorRefFrom,
	type AnyActorRef,
	assign,
	emit,
	enqueueActions,
	sendTo,
	setup,
} from "xstate";
import type { BookData, EffectRow } from "../data/types.js";
import { processBook } from "./book.js";
import type { SimulationClock } from "./clock.js";
import type { AffixesYaml, BooksYaml } from "./config.js";
import { selectTiers } from "./config.js";
import type { SeededRNG } from "./rng.js";
import type {
	ApplyDotEvent,
	ApplyStateEvent,
	BookSlot,
	FormulasConfig,
	HealEvent,
	HitEvent,
	HpCostEvent,
	HpDamageEvent,
	IntentEvent,
	ListenerRegistration,
	PlayerState,
	ProgressionConfig,
	ShieldEvent,
	StateChangeEvent,
	StateInstance,
} from "./types.js";

// ── Player Machine Input ────────────────────────────────────────────

export interface PlayerInput {
	label: string;
	initialState: PlayerState;
	formulas: FormulasConfig;
	progression: ProgressionConfig;
	bookSlots: BookSlot[];
	booksYaml: BooksYaml;
	affixesYaml: AffixesYaml;
	clock: SimulationClock;
	rng: SeededRNG;
	maxChainDepth: number;
	opponentRef?: AnyActorRef;
}

// ── Player Machine Context ──────────────────────────────────────────

interface PlayerContext {
	label: string;
	state: PlayerState;
	formulas: FormulasConfig;
	progression: ProgressionConfig;
	bookSlots: BookSlot[];
	booksYaml: BooksYaml;
	affixesYaml: AffixesYaml;
	clock: SimulationClock;
	rng: SeededRNG;
	listeners: ListenerRegistration[];
	maxChainDepth: number;
	chainDepth: number;
	/** Reference to opponent player actor for sendTo */
	opponentRef?: AnyActorRef;
	/** Clock callback IDs for cleanup */
	clockCallbackIds: number[];
}

// ── Player Machine Events ───────────────────────────────────────────

type PlayerMachineEvent =
	| { type: "SET_OPPONENT"; ref: AnyActorRef }
	| { type: "CAST_SLOT"; slot: number }
	| HitEvent
	| HpDamageEvent
	| ApplyStateEvent
	| ApplyDotEvent
	| HealEvent
	| ShieldEvent
	| HpCostEvent
	| { type: "DISPEL"; count: number }
	| { type: "BUFF_STEAL"; count: number }
	| { type: "LIFESTEAL"; percent: number; damageDealt: number }
	| { type: "SELF_CLEANSE"; count?: number }
	| { type: "HP_FLOOR"; minPercent: number }
	| { type: "STATE_TICK_INTERNAL"; name: string }
	| { type: "STATE_EXPIRE_INTERNAL"; name: string }
	| { type: "CLOCK_TICK"; dt: number }
	| { type: "CHECK_DEATH" };

// ── Helpers ─────────────────────────────────────────────────────────

function sumStatEffects(states: StateInstance[], stat: string): number {
	let total = 0;
	for (const s of states) {
		for (const e of s.effects) {
			if (e.stat === stat) total += e.value * s.stacks;
		}
	}
	return total;
}

function resolveAffixEffects(
	slot: BookSlot,
	booksYaml: BooksYaml,
	affixesYaml: AffixesYaml,
): EffectRow[] {
	const effects: EffectRow[] = [];
	for (const opName of [slot.op1, slot.op2]) {
		if (!opName) continue;
		// Check universal affixes
		if (affixesYaml.universal[opName]) {
			effects.push(...affixesYaml.universal[opName].effects);
			continue;
		}
		// Check school affixes
		for (const school of Object.values(affixesYaml.school)) {
			if (school[opName]) {
				effects.push(...school[opName].effects);
				break;
			}
		}
		// Exclusive affixes are already on the book's exclusive_affix
		// (handled by processBook reading bookData.exclusive_affix)
	}
	return effects;
}

// ── Player Machine Definition ───────────────────────────────────────

export const playerMachine = setup({
	types: {
		context: {} as PlayerContext,
		input: {} as PlayerInput,
		events: {} as PlayerMachineEvent,
		emitted: {} as StateChangeEvent,
	},
	guards: {
		isDead: ({ context }) => context.state.hp <= 0,
	},
}).createMachine({
	id: "player",
	context: ({ input }) => ({
		label: input.label,
		state: { ...input.initialState },
		formulas: input.formulas,
		progression: input.progression,
		bookSlots: input.bookSlots,
		booksYaml: input.booksYaml,
		affixesYaml: input.affixesYaml,
		clock: input.clock,
		rng: input.rng,
		listeners: [],
		maxChainDepth: input.maxChainDepth,
		chainDepth: 0,
		opponentRef: input.opponentRef,
		clockCallbackIds: [],
	}),
	initial: "alive",
	states: {
		alive: {
			on: {
				SET_OPPONENT: {
					actions: assign(({ context, event }) => ({
						...context,
						opponentRef: event.ref,
					})),
				},
				CAST_SLOT: {
					actions: enqueueActions(({ context, event, enqueue }) => {
						const slot = event.slot;
						const bookSlot = context.bookSlots.find((b) => b.slot === slot);
						if (!bookSlot) return;

						const bookData = context.booksYaml.books[bookSlot.platform];
						if (!bookData) return;

						const affixEffects = resolveAffixEffects(
							bookSlot,
							context.booksYaml,
							context.affixesYaml,
						);

						const t = context.clock.now();
						const bookLabel = [bookSlot.platform, bookSlot.op1, bookSlot.op2]
							.filter(Boolean)
							.join(" + ");

						// Emit CAST_START with full divine book label
						enqueue(
							emit({
								type: "CAST_START" as const,
								player: context.label,
								slot,
								book: bookLabel,
								t,
							}),
						);

						// Step 1: Run book function to get all events
						const result = processBook(
							bookData,
							affixEffects,
							{
								sourcePlayer: context.state,
								targetPlayer: context.state,
								book: bookSlot.platform,
								slot,
								rng: context.rng,
								atk: context.state.atk,
								hits: extractHits(bookData, context.progression),
							},
							context.progression,
						);

						// Emit handler errors as events
						for (const error of result.errors) {
							enqueue(
								emit({
									type: "HANDLER_ERROR" as const,
									player: context.label,
									slot,
									message: error,
									t: context.clock.now(),
								}),
							);
						}

						// Register reactive listeners
						for (const listener of result.listeners) {
							context.listeners.push(listener);
						}

						// Separate HIT events (spread over time) from other intents (immediate)
						const hitEvents = result.directEvents.filter(
							(ev) => ev.type === "HIT",
						);
						const otherEvents = result.directEvents.filter(
							(ev) => ev.type !== "HIT",
						);

						// Send non-HIT events immediately (buffs, debuffs, shields, etc.)
						for (const ev of otherEvents) {
							if (isSelfTargeted(ev)) {
								processSelfIntent(context, ev, enqueue);
							} else if (context.opponentRef) {
								enqueue(sendTo(context.opponentRef, ev));
							}
						}

						// Schedule HIT events spread over cast duration (~1s per hit)
						const hitGapMs = 1000;
						for (let i = 0; i < hitEvents.length; i++) {
							const hitEv = hitEvents[i];
							const opponent = context.opponentRef;
							if (!opponent) continue;
							context.clockCallbackIds.push(
								context.clock.setTimeout(() => {
									opponent.send(hitEv);
								}, i * hitGapMs),
							);
						}

						// Schedule CAST_END after all hits
						const castDurationMs = hitEvents.length > 0
							? (hitEvents.length - 1) * hitGapMs
							: 0;
						context.clock.setTimeout(() => {
							// Emit via direct mutation since we're in a clock callback
						}, castDurationMs);
					}),
				},
				HIT: {
	
					actions: enqueueActions(({ context, event, enqueue }) => {
						resolveHit(context, event as HitEvent, enqueue);
					}),
				},
				HP_DAMAGE: {
	
					actions: enqueueActions(({ context, event, enqueue }) => {
						resolveHpDamage(context, event as HpDamageEvent, enqueue);
					}),
				},
				APPLY_STATE: {
	
					actions: enqueueActions(({ context, event, enqueue }) => {
						applyState(context, (event as ApplyStateEvent).state, enqueue);
					}),
				},
				APPLY_DOT: {
	
					actions: enqueueActions(({ context, event, enqueue }) => {
						applyDot(context, event as ApplyDotEvent, enqueue);
					}),
				},
				HEAL: {
	
					actions: enqueueActions(({ context, event, enqueue }) => {
						resolveHeal(context, (event as HealEvent).value, enqueue);
					}),
				},
				SHIELD: {
	
					actions: enqueueActions(({ context, event, enqueue }) => {
						const ev = event as ShieldEvent;
						const prev = context.state.shield;
						context.state.shield += ev.value;
						enqueue(
							emit({
								type: "SHIELD_CHANGE" as const,
								player: context.label,
								prev,
								next: context.state.shield,
								cause: "shield_applied",
								t: context.clock.now(),
							}),
						);
					}),
				},
				HP_COST: {
	
					actions: enqueueActions(({ context, event, enqueue }) => {
						const ev = event as HpCostEvent;
						const basis =
							ev.basis === "current" ? context.state.hp : context.state.maxHp;
						const cost = (ev.percent / 100) * basis;
						const prev = context.state.hp;
						context.state.hp = Math.max(context.state.hp - cost, 0);
						enqueue(
							emit({
								type: "HP_CHANGE" as const,
								player: context.label,
								prev,
								next: context.state.hp,
								cause: "hp_cost",
								t: context.clock.now(),
							}),
						);
						// Death is deferred to CHECK_DEATH
					}),
				},
				STATE_TICK_INTERNAL: {
	
					actions: enqueueActions(({ context, event, enqueue }) => {
						const name = (event as { type: string; name: string }).name;
						const t = context.clock.now();

						enqueue(
							emit({
								type: "STATE_TICK" as const,
								player: context.label,
								name,
								t,
							}),
						);

						// Fire per_tick listeners for this state
						fireListeners(context, name, "per_tick", enqueue);
					}),
				},
				STATE_EXPIRE_INTERNAL: {
					actions: enqueueActions(({ context, event, enqueue }) => {
						const name = (event as { type: string; name: string }).name;
						removeState(context, name, "expired", enqueue);
					}),
				},
				CLOCK_TICK: {
					actions: enqueueActions(({ context, event, enqueue }) => {
						const dt = (event as { type: string; dt: number }).dt / 1000;
						// SP regen
						if (
							context.state.spRegen > 0 &&
							context.state.sp < context.state.maxSp
						) {
							const prev = context.state.sp;
							context.state.sp = Math.min(
								context.state.sp + context.state.spRegen * dt,
								context.state.maxSp,
							);
							if (context.state.sp !== prev) {
								enqueue(
									emit({
										type: "SP_CHANGE" as const,
										player: context.label,
										prev,
										next: context.state.sp,
										cause: "regen",
										t: context.clock.now(),
									}),
								);
							}
						}
					}),
				},
				CHECK_DEATH: {
					target: "dead",
					guard: "isDead",
				},
			},
		},
		dead: {
			type: "final",
			entry: [
				assign(({ context }) => {
					context.state.alive = false;
					return context;
				}),
				emit(({ context }) => ({
					type: "DEATH" as const,
					player: context.label,
					t: context.clock.now(),
				})),
			],
		},
	},
});

// ── Resolution Functions ────────────────────────────────────────────
// These are called from enqueueActions. They mutate context directly
// and enqueue emit/sendTo actions.

// biome-ignore lint/suspicious/noExplicitAny: XState enqueue type is deeply nested and impractical to extract
type Enqueue = any;

function resolveHit(ctx: PlayerContext, hit: HitEvent, enqueue: Enqueue): void {
	const s = ctx.state;
	const f = ctx.formulas;
	const t = ctx.clock.now();

	// 1. DR
	const baseDR = s.def / (s.def + f.dr_constant);
	const buffDR = sumStatEffects(s.states, "damage_reduction") / 100;
	const totalDR = Math.min(Math.max(baseDR + buffDR, 0), 1);
	const mitigated = hit.damage * (1 - totalDR);

	// 2. SP → shield: "消耗灵力值产生护盾抵挡伤害"
	// SP is CONSUMED to produce shield. 1 SP consumed → ratio points of shield.
	// sp_consumed = min(currentSP, mitigated / ratio)
	// shield = sp_consumed × ratio (absorbs that much damage)
	// remaining damage after shield → HP
	const spConsumed = s.sp > 0 ? Math.min(s.sp, mitigated / f.sp_shield_ratio) : 0;
	const shieldAmount = spConsumed * f.sp_shield_ratio;
	const afterShield = mitigated - shieldAmount;
	if (spConsumed > 0) {
		const prevSp = s.sp;
		s.sp -= spConsumed;
		enqueue(
			emit({
				type: "SP_CHANGE" as const,
				player: ctx.label,
				prev: prevSp,
				next: s.sp,
				cause: "shield_gen",
				t,
			}),
		);
	}

	// 3. Skill-generated shield absorb (from 玄女护心, 煞影千幻, etc.)
	const absorbed = Math.min(afterShield, s.shield);
	if (absorbed > 0) {
		const prevShield = s.shield;
		s.shield -= absorbed;
		enqueue(
			emit({
				type: "SHIELD_CHANGE" as const,
				player: ctx.label,
				prev: prevShield,
				next: s.shield,
				cause: "absorb",
				t,
			}),
		);
	}

	// 4. HP
	const hpDamage = afterShield - absorbed;
	if (hpDamage > 0) {
		const prevHp = s.hp;
		s.hp = Math.max(s.hp - hpDamage, 0);
		enqueue(
			emit({
				type: "HP_CHANGE" as const,
				player: ctx.label,
				prev: prevHp,
				next: s.hp,
				cause: `hit_${hit.hitIndex}`,
				t,
			}),
		);
		// Death is deferred to CHECK_DEATH — do not set alive=false here
	}

	// 5. SP damage (resonance — 灵力 attack line)
	if (hit.spDamage > 0) {
		const prevSp = s.sp;
		s.sp = Math.max(s.sp - hit.spDamage, 0);
		enqueue(
			emit({
				type: "SP_CHANGE" as const,
				player: ctx.label,
				prev: prevSp,
				next: s.sp,
				cause: "resonance",
				t,
			}),
		);
	}

	// 6. Per-hit effects (e.g., %maxHP damage)
	if (hit.perHitEffects) {
		for (const effect of hit.perHitEffects) {
			if (effect.type === "PERCENT_MAX_HP_HIT") {
				// Resolve against TARGET's own maxHp, then apply DR
				const rawDamage = (effect.percent / 100) * s.maxHp;
				resolveHit(
					ctx,
					{ type: "HIT", hitIndex: -1, damage: rawDamage, spDamage: 0 },
					enqueue,
				);
			} else if (effect.type === "HIT") {
				resolveHit(ctx, effect, enqueue);
			} else if (effect.type === "HP_DAMAGE") {
				resolveHpDamage(ctx, effect, enqueue);
			}
		}
	}

	// 7. on_attacked triggers
	if (ctx.chainDepth < ctx.maxChainDepth) {
		ctx.chainDepth++;
		fireListeners(ctx, null, "on_attacked", enqueue);
		ctx.chainDepth--;
	}
}

function resolveHpDamage(
	ctx: PlayerContext,
	ev: HpDamageEvent,
	enqueue: Enqueue,
): void {
	const s = ctx.state;
	let basis: number;
	switch (ev.basis) {
		case "max":
			basis = s.maxHp;
			break;
		case "current":
			basis = s.hp;
			break;
		case "lost":
			basis = s.maxHp - s.hp;
			break;
	}
	const damage = (ev.percent / 100) * basis;
	const prev = s.hp;
	s.hp = Math.max(s.hp - damage, 0);
	enqueue(
		emit({
			type: "HP_CHANGE" as const,
			player: ctx.label,
			prev,
			next: s.hp,
			cause: "hp_damage",
			t: ctx.clock.now(),
		}),
	);
	// Death is deferred to CHECK_DEATH
}

function resolveHeal(
	ctx: PlayerContext,
	value: number,
	enqueue: Enqueue,
): void {
	const s = ctx.state;
	const healMult = 1 + sumStatEffects(s.states, "healing_received") / 100;
	const effective = value * Math.max(healMult, 0);
	const prev = s.hp;
	s.hp = Math.min(s.hp + effective, s.maxHp);
	if (s.hp !== prev) {
		enqueue(
			emit({
				type: "HP_CHANGE" as const,
				player: ctx.label,
				prev,
				next: s.hp,
				cause: "heal",
				t: ctx.clock.now(),
			}),
		);
	}
}

function applyState(
	ctx: PlayerContext,
	state: StateInstance,
	enqueue: Enqueue,
): void {
	// Check for existing state with same name (stacking)
	const existing = ctx.state.states.find((s) => s.name === state.name);
	if (existing && existing.stacks < existing.maxStacks) {
		existing.stacks++;
		enqueue(
			emit({
				type: "STATE_APPLY" as const,
				player: ctx.label,
				state: existing,
				t: ctx.clock.now(),
			}),
		);
		return;
	}

	// Add new state
	ctx.state.states.push({ ...state });
	enqueue(
		emit({
			type: "STATE_APPLY" as const,
			player: ctx.label,
			state,
			t: ctx.clock.now(),
		}),
	);

	// Schedule expiry if duration is finite
	if (
		state.remainingDuration > 0 &&
		state.remainingDuration < Number.POSITIVE_INFINITY
	) {
		const id = ctx.clock.setTimeout(() => {
			// This is a clock callback — we need to send an event to the actor
			// The arena will handle this by sending STATE_EXPIRE_INTERNAL
		}, state.remainingDuration * 1000);
		ctx.clockCallbackIds.push(id);
	}

	// Schedule ticks if trigger is per_tick
	if (state.trigger === "per_tick") {
		// Ticks are scheduled by the arena/runner
	}

	// Fire on_apply listeners
	fireListeners(ctx, state.name, "on_apply", enqueue);

	// Recalculate effective stats
	recalcStats(ctx, enqueue);
}

function applyDot(
	ctx: PlayerContext,
	ev: ApplyDotEvent,
	enqueue: Enqueue,
): void {
	const dotState: StateInstance = {
		name: ev.name,
		kind: "debuff",
		source: ev.source,
		target: "self",
		effects: [],
		remainingDuration: ev.duration,
		stacks: 1,
		maxStacks: 1,
		dispellable: true,
		trigger: "per_tick",
	};
	applyState(ctx, dotState, enqueue);
	// DoT ticks are scheduled by the arena/runner using the clock
}

function removeState(
	ctx: PlayerContext,
	name: string,
	cause: string,
	enqueue: Enqueue,
): void {
	const idx = ctx.state.states.findIndex((s) => s.name === name);
	if (idx === -1) return;

	ctx.state.states.splice(idx, 1);
	enqueue(
		emit({
			type: "STATE_EXPIRE" as const,
			player: ctx.label,
			name,
			t: ctx.clock.now(),
		}),
	);

	// Remove children
	const children = ctx.state.states.filter((s) => s.parent === name);
	for (const child of children) {
		removeState(ctx, child.name, "parent_expired", enqueue);
	}

	// Fire on_expire listeners
	fireListeners(ctx, name, "on_expire", enqueue);

	// Recalculate effective stats
	recalcStats(ctx, enqueue);
}

function fireListeners(
	ctx: PlayerContext,
	stateName: string | null,
	trigger: string,
	enqueue: Enqueue,
): void {
	for (const listener of ctx.listeners) {
		if (trigger !== listener.trigger) continue;
		// For on_attacked, fire all listeners regardless of parent
		// For named state events, match parent name
		if (stateName !== null && listener.parent !== stateName) continue;
		if (
			stateName === null &&
			trigger === "on_attacked" &&
			!ctx.state.states.some((s) => s.name === listener.parent)
		)
			continue;

		const events = listener.handler({
			sourcePlayer: ctx.state,
			targetPlayerRef: null, // filled by arena when needed
			rng: ctx.rng,
			book: listener.parent,
		});

		for (const ev of events) {
			processSelfIntent(ctx, ev, enqueue);
		}
	}
}

function processSelfIntent(
	ctx: PlayerContext,
	ev: IntentEvent,
	enqueue: Enqueue,
): void {
	switch (ev.type) {
		case "APPLY_STATE":
			applyState(ctx, ev.state, enqueue);
			break;
		case "HEAL":
			resolveHeal(ctx, ev.value, enqueue);
			break;
		case "SHIELD": {
			const prev = ctx.state.shield;
			ctx.state.shield += ev.value;
			enqueue(
				emit({
					type: "SHIELD_CHANGE" as const,
					player: ctx.label,
					prev,
					next: ctx.state.shield,
					cause: "shield_applied",
					t: ctx.clock.now(),
				}),
			);
			break;
		}
		case "HP_COST": {
			const basis = ev.basis === "current" ? ctx.state.hp : ctx.state.maxHp;
			const cost = (ev.percent / 100) * basis;
			const prev = ctx.state.hp;
			ctx.state.hp = Math.max(ctx.state.hp - cost, 0);
			enqueue(
				emit({
					type: "HP_CHANGE" as const,
					player: ctx.label,
					prev,
					next: ctx.state.hp,
					cause: "hp_cost",
					t: ctx.clock.now(),
				}),
			);
			// Death is deferred to CHECK_DEATH
			break;
		}
		case "LIFESTEAL":
			resolveHeal(ctx, (ev.percent / 100) * ev.damageDealt, enqueue);
			break;
		default:
			// Other self-targeted intents can be added here
			break;
	}
}

function recalcStats(ctx: PlayerContext, enqueue: Enqueue): void {
	const s = ctx.state;
	const t = ctx.clock.now();

	const newAtk =
		s.baseAtk * (1 + sumStatEffects(s.states, "attack_bonus") / 100);
	if (newAtk !== s.atk) {
		const prev = s.atk;
		s.atk = newAtk;
		enqueue(
			emit({
				type: "STAT_CHANGE" as const,
				player: ctx.label,
				stat: "atk",
				prev,
				next: newAtk,
				t,
			}),
		);
	}

	const newDef =
		s.baseDef * (1 + sumStatEffects(s.states, "defense_bonus") / 100);
	if (newDef !== s.def) {
		const prev = s.def;
		s.def = newDef;
		enqueue(
			emit({
				type: "STAT_CHANGE" as const,
				player: ctx.label,
				stat: "def",
				prev,
				next: newDef,
				t,
			}),
		);
	}
}

function extractHits(
	bookData: BookData,
	progression: ProgressionConfig,
): number {
	if (!bookData.skill) return 0;
	const tiered = selectTiers(bookData.skill, progression);
	const baseAttack = tiered.find((e) => e.type === "base_attack");
	return (baseAttack?.hits as number) ?? 0;
}

function isSelfTargeted(ev: IntentEvent): boolean {
	switch (ev.type) {
		case "APPLY_STATE":
			return ev.state.target === "self";
		case "HEAL":
		case "SHIELD":
		case "HP_COST":
		case "HP_FLOOR":
		case "SELF_CLEANSE":
		case "LIFESTEAL":
			return true;
		default:
			return false;
	}
}

export type PlayerActor = ActorRefFrom<typeof playerMachine>;
