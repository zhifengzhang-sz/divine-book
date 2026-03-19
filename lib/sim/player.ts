/**
 * Player state machine — implements design §5.2 (Player as Event Processor)
 * and design.reactive.md §5 (The Player as Event Bus).
 *
 * The player:
 *   - Spawns book actors (one per slot) on entry to alive state
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
import type { EffectRow } from "../data/types.js";
import { bookMachine, extractHits } from "./book-machine.js";
import type { AffixesYaml, BooksYaml } from "./config.js";
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
	/** Spawned book actor refs, keyed by slot number */
	bookRefs: Record<number, AnyActorRef>;
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
	| { type: "CHECK_DEATH" }
	| {
			type: "REGISTER_LISTENERS";
			listeners: ListenerRegistration[];
	  }
	| { type: "BOOK_CAST_ERROR"; errors: string[]; slot: number }
	| { type: "DELIVER_HIT"; hit: HitEvent }
	| { type: "BOOK_CAST_HITS"; hits: HitEvent[] };

// ── Helpers ─────────────────────────────────────────────────────────

// Need SimulationClock type import (used in context)
import type { SimulationClock } from "./clock.js";

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
		let found = false;
		// Check universal affixes
		if (affixesYaml.universal[opName]) {
			effects.push(...affixesYaml.universal[opName].effects);
			found = true;
		}
		// Check school affixes
		if (!found) {
			for (const school of Object.values(affixesYaml.school)) {
				if (school[opName]) {
					effects.push(...school[opName].effects);
					found = true;
					break;
				}
			}
		}
		// Check exclusive affixes (look up by affix name across all books)
		if (!found) {
			for (const book of Object.values(booksYaml.books)) {
				if (book.exclusive_affix?.name === opName) {
					effects.push(...book.exclusive_affix.effects);
					found = true;
					break;
				}
			}
		}
	}
	return effects;
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
		bookRefs: {},
	}),
	initial: "alive",
	states: {
		alive: {
			// Spawn book actors on entry
			entry: assign(({ context, spawn, self }) => {
				const bookRefs: Record<number, AnyActorRef> = {};
				for (const slot of context.bookSlots) {
					const bookData = context.booksYaml.books[slot.platform];
					if (!bookData) continue;
					const affixEffects = resolveAffixEffects(
						slot,
						context.booksYaml,
						context.affixesYaml,
					);
					bookRefs[slot.slot] = spawn(bookMachine, {
						input: {
							bookData,
							affixEffects,
							bookSlot: slot,
							progression: context.progression,
							rng: context.rng,
							clock: context.clock,
							label: context.label,
							ownerRef: self,
							hits: extractHits(bookData, context.progression),
						},
					});
				}
				return { bookRefs };
			}),
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
						const bookRef = context.bookRefs[slot];
						if (!bookRef) return;

						const bookSlot = context.bookSlots.find((b) => b.slot === slot);
						const bookLabel = bookSlot
							? [bookSlot.platform, bookSlot.op1, bookSlot.op2]
									.filter(Boolean)
									.join(" + ")
							: `slot_${slot}`;

						// Emit CAST_START
						enqueue(
							emit({
								type: "CAST_START" as const,
								player: context.label,
								slot,
								book: bookLabel,
								t: context.clock.now(),
							}),
						);

						// Delegate to book actor
						enqueue(
							sendTo(bookRef, {
								type: "CAST",
								playerState: context.state,
								opponentRef: context.opponentRef,
							}),
						);
					}),
				},
				HIT: {
					actions: enqueueActions(({ context, event, enqueue, self }) => {
						resolveHit(context, event as HitEvent, enqueue, self);
					}),
				},
				HP_DAMAGE: {
					actions: enqueueActions(({ context, event, enqueue }) => {
						resolveHpDamage(context, event as HpDamageEvent, enqueue);
					}),
				},
				APPLY_STATE: {
					actions: enqueueActions(({ context, event, enqueue, self }) => {
						applyState(
							context,
							(event as ApplyStateEvent).state,
							enqueue,
							self,
						);
					}),
				},
				APPLY_DOT: {
					actions: enqueueActions(({ context, event, enqueue, self }) => {
						applyDot(context, event as ApplyDotEvent, enqueue, self);
					}),
				},
				HEAL: {
					actions: enqueueActions(({ context, event, enqueue, self }) => {
						resolveHeal(context, (event as HealEvent).value, enqueue, self);
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
				LIFESTEAL: {
					actions: enqueueActions(({ context, event, enqueue, self }) => {
						const ev = event as {
							percent: number;
							damageDealt: number;
						};
						resolveHeal(
							context,
							(ev.percent / 100) * ev.damageDealt,
							enqueue,
							self,
						);
					}),
				},
				REGISTER_LISTENERS: {
					actions: assign(({ context, event }) => {
						const ev = event as {
							listeners: ListenerRegistration[];
						};
						return {
							...context,
							listeners: [...context.listeners, ...ev.listeners],
						};
					}),
				},
				BOOK_CAST_ERROR: {
					actions: enqueueActions(({ context, event, enqueue }) => {
						const ev = event as {
							errors: string[];
							slot: number;
						};
						for (const error of ev.errors) {
							enqueue(
								emit({
									type: "HANDLER_ERROR" as const,
									player: context.label,
									slot: ev.slot,
									message: error,
									t: context.clock.now(),
								}),
							);
						}
					}),
				},
				BOOK_CAST_HITS: {
					actions: enqueueActions(({ event, enqueue, self }) => {
						const { hits } = event as { hits: HitEvent[] };
						// Schedule HITs with ~1s gap via delayed sendTo
						const hitGapMs = 1000;
						for (let i = 0; i < hits.length; i++) {
							enqueue(
								sendTo(
									self,
									{ type: "DELIVER_HIT", hit: hits[i] },
									{ delay: i * hitGapMs },
								),
							);
						}
					}),
				},
				DELIVER_HIT: {
					actions: enqueueActions(({ context, event, enqueue }) => {
						const { hit } = event as { hit: HitEvent };
						if (context.opponentRef) {
							enqueue(sendTo(context.opponentRef, hit));
						}
					}),
				},
				STATE_TICK_INTERNAL: {
					actions: enqueueActions(({ context, event, enqueue, self }) => {
						const name = (event as { type: string; name: string }).name;
						const t = context.clock.now();

						const stateInst = context.state.states.find((s) => s.name === name);
						// If state was already removed (expired/dispelled), no-op
						if (!stateInst) return;

						enqueue(
							emit({
								type: "STATE_TICK" as const,
								player: context.label,
								name,
								t,
							}),
						);

						// Fire per_tick listeners for this state
						fireListeners(context, name, "per_tick", enqueue, self);

						// DoT damage (if damagePerTick exists on this state)
						if (stateInst.damagePerTick && stateInst.damagePerTick > 0) {
							const prev = context.state.hp;
							context.state.hp = Math.max(
								context.state.hp - stateInst.damagePerTick,
								0,
							);
							enqueue(
								emit({
									type: "HP_CHANGE" as const,
									player: context.label,
									prev,
									next: context.state.hp,
									cause: "dot",
									t,
								}),
							);
						}

						// Schedule next tick (self-scheduling pattern)
						if (stateInst.tickInterval) {
							enqueue(
								sendTo(
									self,
									{ type: "STATE_TICK_INTERNAL", name },
									{ delay: stateInst.tickInterval * 1000 },
								),
							);
						}
					}),
				},
				STATE_EXPIRE_INTERNAL: {
					actions: enqueueActions(({ context, event, enqueue, self }) => {
						const name = (event as { type: string; name: string }).name;
						removeState(context, name, "expired", enqueue, self);
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
// biome-ignore lint/suspicious/noExplicitAny: XState self type is deeply nested
type Self = any;

function resolveHit(
	ctx: PlayerContext,
	hit: HitEvent,
	enqueue: Enqueue,
	self: Self,
): void {
	const s = ctx.state;
	const f = ctx.formulas;
	const t = ctx.clock.now();

	// 1. DR
	const baseDR = s.def / (s.def + f.dr_constant);
	const buffDR = sumStatEffects(s.states, "damage_reduction") / 100;
	const totalDR = Math.min(Math.max(baseDR + buffDR, 0), 1);
	const mitigated = hit.damage * (1 - totalDR);

	// 2. SP → shield: "消耗灵力值产生护盾抵挡伤害"
	const spConsumed =
		s.sp > 0 ? Math.min(s.sp, mitigated / f.sp_shield_ratio) : 0;
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

	// 3. Skill-generated shield absorb
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
		if (s.hp !== prevHp) {
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
		}
	}

	// 5. SP damage (resonance)
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
				const rawDamage = (effect.percent / 100) * s.maxHp;
				resolveHit(
					ctx,
					{
						type: "HIT",
						hitIndex: -1,
						damage: rawDamage,
						spDamage: 0,
					},
					enqueue,
					self,
				);
			} else if (effect.type === "HIT") {
				resolveHit(ctx, effect, enqueue, self);
			} else if (effect.type === "HP_DAMAGE") {
				resolveHpDamage(ctx, effect, enqueue);
			}
		}
	}

	// 7. on_attacked triggers
	if (ctx.chainDepth < ctx.maxChainDepth) {
		ctx.chainDepth++;
		fireListeners(ctx, null, "on_attacked", enqueue, self);
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
}

function resolveHeal(
	ctx: PlayerContext,
	value: number,
	enqueue: Enqueue,
	_self: Self,
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
		// Fire heal echo listeners — results go to OPPONENT
		for (const listener of ctx.listeners) {
			if (listener.parent !== "__heal__") continue;
			const events = listener.handler({
				sourcePlayer: ctx.state,
				targetPlayerRef: ctx.opponentRef ?? null,
				rng: ctx.rng,
				book: listener.parent,
			});
			for (const ev of events) {
				if (ctx.opponentRef) enqueue(sendTo(ctx.opponentRef, ev));
			}
		}
	}
}

function applyState(
	ctx: PlayerContext,
	state: StateInstance,
	enqueue: Enqueue,
	self: Self,
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
		enqueue(
			sendTo(
				self,
				{
					type: "STATE_EXPIRE_INTERNAL",
					name: state.name,
				} as PlayerMachineEvent,
				{ delay: state.remainingDuration * 1000 },
			),
		);
	}

	// Schedule first tick if trigger is per_tick
	if (state.trigger === "per_tick" && state.tickInterval) {
		enqueue(
			sendTo(
				self,
				{
					type: "STATE_TICK_INTERNAL",
					name: state.name,
				} as PlayerMachineEvent,
				{ delay: state.tickInterval * 1000 },
			),
		);
	}

	// Fire on_apply listeners
	fireListeners(ctx, state.name, "on_apply", enqueue, self);

	// Recalculate effective stats
	recalcStats(ctx, enqueue);
}

function applyDot(
	ctx: PlayerContext,
	ev: ApplyDotEvent,
	enqueue: Enqueue,
	self: Self,
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
		tickInterval: ev.tickInterval,
		damagePerTick: ev.damagePerTick,
	};
	applyState(ctx, dotState, enqueue, self);
}

function removeState(
	ctx: PlayerContext,
	name: string,
	_cause: string,
	enqueue: Enqueue,
	self: Self,
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
		removeState(ctx, child.name, "parent_expired", enqueue, self);
	}

	// Fire on_expire listeners
	fireListeners(ctx, name, "on_expire", enqueue, self);

	// Recalculate effective stats
	recalcStats(ctx, enqueue);
}

function fireListeners(
	ctx: PlayerContext,
	stateName: string | null,
	trigger: string,
	enqueue: Enqueue,
	self: Self,
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
			targetPlayerRef: ctx.opponentRef ?? null,
			rng: ctx.rng,
			book: listener.parent,
		});

		for (const ev of events) {
			// Self-targeted events go back to this player,
			// opponent-targeted events go to opponent
			if (isSelfTargeted(ev)) {
				enqueue(sendTo(self, ev));
			} else if (ctx.opponentRef) {
				enqueue(sendTo(ctx.opponentRef, ev));
			}
		}
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

export type PlayerActor = ActorRefFrom<typeof playerMachine>;
