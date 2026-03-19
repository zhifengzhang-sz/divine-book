/**
 * Simulator types — implements design.md §3, §4, §10.
 *
 * Two layers of events:
 *   Intent events  — cross-player (sendTo). A does not know B's state.
 *   State-change events — within-player (emit). Observable by all subscribers.
 */

// ── Player State (design §3.1) ──────────────────────────────────────

export interface PlayerState {
	hp: number;
	maxHp: number;
	sp: number;
	maxSp: number;
	spRegen: number;
	shield: number;
	atk: number;
	baseAtk: number;
	def: number;
	baseDef: number;
	states: StateInstance[];
	alive: boolean;
}

// ── State Instance (design §3.2) ────────────────────────────────────

export interface StateInstance {
	name: string;
	kind: "buff" | "debuff" | "named";
	source: string;
	target: "self" | "opponent";
	effects: StateEffect[];
	remainingDuration: number; // Infinity = permanent
	stacks: number;
	maxStacks: number;
	dispellable: boolean;
	trigger?: "on_cast" | "on_attacked" | "per_tick";
	parent?: string;
	tickInterval?: number; // seconds between ticks (per_tick states)
	damagePerTick?: number; // damage per tick (DoT states)
}

export interface StateEffect {
	stat: string;
	value: number; // per stack
}

// ── Reactive Listener Registration (design §3.4) ───────────────────

export interface ListenerRegistration {
	parent: string;
	trigger: "on_apply" | "on_expire" | "per_tick" | "on_attacked" | "on_cast";
	handler: (ctx: ListenerContext) => IntentEvent[];
}

export interface ListenerContext {
	sourcePlayer: Readonly<PlayerState>;
	targetPlayerRef: unknown; // XState ActorRef — typed loosely to avoid circular deps
	rng: SeededRNGInterface;
	book: string;
}

export interface SeededRNGInterface {
	next(): number;
	chance(p: number): boolean;
	weightedPick<T>(tiers: { weight: number; value: T }[]): T;
}

// ── Intent Events (design §4.1, cross-player via sendTo) ───────────

export type IntentEvent =
	| HitEvent
	| PercentMaxHpHitEvent
	| HpDamageEvent
	| ApplyStateEvent
	| ApplyDotEvent
	| HealEvent
	| ShieldEvent
	| HpCostEvent
	| DispelEvent
	| BuffStealEvent
	| DelayedBurstEvent
	| LifestealEvent
	| SelfCleanseEvent
	| HpFloorEvent;

export interface HitEvent {
	type: "HIT";
	hitIndex: number;
	damage: number;
	spDamage: number;
	perHitEffects?: IntentEvent[];
}

export interface PercentMaxHpHitEvent {
	type: "PERCENT_MAX_HP_HIT";
	percent: number;
}

export interface HpDamageEvent {
	type: "HP_DAMAGE";
	percent: number;
	basis: "max" | "current" | "lost";
}

export interface ApplyStateEvent {
	type: "APPLY_STATE";
	state: StateInstance;
}

export interface ApplyDotEvent {
	type: "APPLY_DOT";
	name: string;
	damagePerTick: number;
	tickInterval: number;
	duration: number;
	source: string;
}

export interface HealEvent {
	type: "HEAL";
	value: number;
}

export interface ShieldEvent {
	type: "SHIELD";
	value: number;
	duration: number;
}

export interface HpCostEvent {
	type: "HP_COST";
	percent: number;
	basis: "current" | "max";
}

export interface DispelEvent {
	type: "DISPEL";
	count: number;
}

export interface BuffStealEvent {
	type: "BUFF_STEAL";
	count: number;
}

export interface DelayedBurstEvent {
	type: "DELAYED_BURST";
	damage: number;
	delay: number;
}

export interface LifestealEvent {
	type: "LIFESTEAL";
	percent: number;
	damageDealt: number;
}

export interface SelfCleanseEvent {
	type: "SELF_CLEANSE";
	count?: number;
}

export interface HpFloorEvent {
	type: "HP_FLOOR";
	minPercent: number;
}

// ── State-Change Events (design §4.1, emitted via emit) ────────────

export type StateChangeEvent =
	| CastStartEvent
	| CastEndEvent
	| HpChangeEvent
	| SpChangeEvent
	| ShieldChangeEvent
	| StatChangeEvent
	| StateApplyEvent
	| StateExpireEvent
	| StateTickEvent
	| StateTriggeredEvent
	| StateRemoveEvent
	| DeathEvent
	| HandlerErrorEvent;

export interface HandlerErrorEvent {
	type: "HANDLER_ERROR";
	player: string;
	slot: number;
	message: string;
	t: number;
}

export interface CastStartEvent {
	type: "CAST_START";
	player: string;
	slot: number;
	book: string;
	t: number;
}

export interface CastEndEvent {
	type: "CAST_END";
	player: string;
	slot: number;
	t: number;
}

export interface HpChangeEvent {
	type: "HP_CHANGE";
	player: string;
	prev: number;
	next: number;
	cause: string;
	t: number;
}

export interface SpChangeEvent {
	type: "SP_CHANGE";
	player: string;
	prev: number;
	next: number;
	cause: string;
	t: number;
}

export interface ShieldChangeEvent {
	type: "SHIELD_CHANGE";
	player: string;
	prev: number;
	next: number;
	cause: string;
	t: number;
}

export interface StatChangeEvent {
	type: "STAT_CHANGE";
	player: string;
	stat: string;
	prev: number;
	next: number;
	t: number;
}

export interface StateApplyEvent {
	type: "STATE_APPLY";
	player: string;
	state: StateInstance;
	t: number;
}

export interface StateExpireEvent {
	type: "STATE_EXPIRE";
	player: string;
	name: string;
	t: number;
}

export interface StateTickEvent {
	type: "STATE_TICK";
	player: string;
	name: string;
	t: number;
}

export interface StateTriggeredEvent {
	type: "STATE_TRIGGERED";
	player: string;
	name: string;
	trigger: string;
	t: number;
}

export interface StateRemoveEvent {
	type: "STATE_REMOVE";
	player: string;
	name: string;
	cause: string;
	t: number;
}

export interface DeathEvent {
	type: "DEATH";
	player: string;
	t: number;
}

// ── Player Machine Events (union of all receivable events) ──────────

export type PlayerEvent =
	| { type: "CAST_SLOT"; slot: number }
	| IntentEvent
	| { type: "STATE_TICK_INTERNAL"; name: string }
	| { type: "STATE_EXPIRE_INTERNAL"; name: string }
	| { type: "CLOCK_TICK"; dt: number };

// ── Configuration (design §10) ──────────────────────────────────────

export interface EntityConfig {
	hp: number;
	atk: number;
	sp: number;
	def: number;
	spRegen: number;
}

export interface FormulasConfig {
	dr_constant: number;
	sp_shield_ratio: number;
}

export interface ProgressionConfig {
	enlightenment: number;
	fusion: number;
}

export interface BookSlot {
	slot: number;
	platform: string;
	op1?: string;
	op2?: string;
}

export interface PlayerConfig {
	entity: EntityConfig;
	formulas: FormulasConfig;
	progression: ProgressionConfig;
	books: BookSlot[];
}

export interface ArenaConfig {
	playerA: PlayerConfig;
	playerB: PlayerConfig;
	tGap: number;
	maxEvents: number;
	maxChainDepth: number;
	seed: number;
}
