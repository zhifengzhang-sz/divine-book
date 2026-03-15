/**
 * Combat Simulator — Core Types
 *
 * Intent-based architecture: entities communicate via intents,
 * receiver evaluates against its own state.
 */

// ─── Owner / Snapshot ───────────────────────────────────────────

/** Stats the entity provides to the book on activation */
export interface OwnerStats {
	id: string;
	atk: number;
	effective_atk: number;
	hp: number;
	max_hp: number;
	def: number;
	sp: number;
}

/** Frozen snapshot for simultaneous resolution */
export interface EntitySnapshot extends OwnerStats {
	debuff_count: number;
	buff_count: number;
	has_shield: boolean;
	shield_amount: number;
	effective_dr: number;
	lost_hp: number;
}

// ─── Operators (formulas the receiver evaluates) ────────────────

export type Operator =
	| { kind: "per_enemy_lost_hp"; per_percent: number }
	| { kind: "per_debuff_stack"; value: number; max_stacks: number }
	| { kind: "conditional"; condition: string; bonus_percent: number }
	| { kind: "per_self_lost_hp"; per_percent: number };

// ─── Intents ────────────────────────────────────────────────────

export interface AtkDamageIntent {
	type: "ATK_DAMAGE";
	amount_per_hit: number;
	hits: number;
	source: string;
	dr_bypass: number;
	crit_bonus: number;
	operators: Operator[];
}

export interface HpDamageIntent {
	type: "HP_DAMAGE";
	percent: number;
	basis: "max" | "current" | "lost";
	source: string;
	per_prior_hit?: boolean;
}

export interface ApplyDebuffIntent {
	type: "APPLY_DEBUFF";
	id: string;
	stat: string;
	value: number;
	duration: number | "permanent";
	stacks?: number;
	max_stacks?: number;
	per_hit_stack?: boolean;
	dispellable?: boolean;
}

export interface ApplyDotIntent {
	type: "APPLY_DOT";
	id: string;
	percent: number;
	basis: "max" | "current" | "lost";
	tick_interval: number;
	duration: number;
	stacks?: number;
	max_stacks?: number;
	per_hit_stack?: boolean;
	damage_per_tick?: number;
}

export interface HpCostIntent {
	type: "HP_COST";
	amount: number;
	per_hit?: boolean;
	tick_interval?: number;
	duration?: number | "permanent";
}

export interface SelfBuffIntent {
	type: "SELF_BUFF";
	id: string;
	duration: number | "permanent";
	atk_percent?: number;
	def_percent?: number;
	hp_percent?: number;
	healing_percent?: number;
	skill_damage_increase?: number;
	crit_rate?: number;
	damage_reduction?: number;
	per_hit_stack?: boolean;
	max_stacks?: number;
}

export interface ShieldIntent {
	type: "SHIELD";
	amount: number;
	duration: number;
}

export interface HealIntent {
	type: "HEAL";
	amount: number;
}

export interface CounterStateDef {
	reflect_received_damage?: number;
	reflect_percent_lost_hp?: number;
	chance?: number;
	apply_to_attacker?: Intent[];
}

export interface CounterStateIntent {
	type: "COUNTER_STATE";
	id: string;
	duration: number | "permanent";
	on_hit: CounterStateDef;
}

export interface DelayedBurstIntent {
	type: "DELAYED_BURST";
	id: string;
	duration: number;
	damage_increase_during: number;
	burst_base_amount: number;
	burst_accumulated_pct: number;
}

export interface DispelIntent {
	type: "DISPEL";
	count: number;
}

export interface BuffStealIntent {
	type: "BUFF_STEAL";
	count: number;
	source: string;
}

export interface ShieldDestroyIntent {
	type: "SHIELD_DESTROY";
	count: number;
	bonus_hp_damage: number;
	no_shield_double: boolean;
	source: string;
}

export interface CleanseIntent {
	type: "CLEANSE";
	count: number;
}

export interface SummonIntent {
	type: "SUMMON";
	inherit_percent: number;
	duration: number;
}

export interface UntargetableIntent {
	type: "UNTARGETABLE";
	duration: number;
}

export interface LifestealIntent {
	type: "LIFESTEAL";
	percent: number;
}

export interface SelfDamageIncreaseIntent {
	type: "SELF_DAMAGE_INCREASE";
	percent: number;
	duration: number;
}

export interface CritBonusIntent {
	type: "CRIT_BONUS";
	value: number;
}

export interface HpFloorIntent {
	type: "HP_FLOOR";
	percent: number;
}

export interface SelfBuffExtendIntent {
	type: "SELF_BUFF_EXTEND";
	value: number;
}

export type Intent =
	| AtkDamageIntent
	| HpDamageIntent
	| ApplyDebuffIntent
	| ApplyDotIntent
	| HpCostIntent
	| SelfBuffIntent
	| ShieldIntent
	| HealIntent
	| CounterStateIntent
	| DelayedBurstIntent
	| DispelIntent
	| BuffStealIntent
	| ShieldDestroyIntent
	| CleanseIntent
	| SummonIntent
	| UntargetableIntent
	| LifestealIntent
	| SelfDamageIncreaseIntent
	| CritBonusIntent
	| HpFloorIntent
	| SelfBuffExtendIntent;

// ─── Slot Resolution Result ─────────────────────────────────────

export interface HitEvent {
	damage: number;
	source: string;
	dr_bypass: number;
	is_dot: boolean;
}

export interface HealEvent {
	amount: number;
	source: string;
}

export interface StateSpawn {
	intent: Intent;
	target: "self" | "opponent";
}

/** What the arena dispatches after resolving a slot */
export interface SlotResult {
	self_intents: Intent[];
	opponent_intents: Intent[];
}

// ─── Active State (runtime state on an entity) ──────────────────

export interface ActiveState {
	id: string;
	kind: "buff" | "debuff" | "dot" | "shield" | "counter" | "delayed_burst" | "hp_floor" | "damage_increase";
	remaining: number | "permanent";
	stacks: number;
	/** The full intent that spawned this state */
	source_intent: Intent;
}

// ─── Combat Config ──────────────────────────────────────────────

export interface CombatConfig {
	hp: number;
	atk: number;
	def: number;
	sp: number;
	max_rounds: number;
	/** Seconds per round (skill activation cycle) */
	round_duration: number;
	/** Tick interval for state effects (seconds) */
	tick_interval: number;
}

export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
	hp: 1_000_000,
	atk: 50_000,
	def: 10_000,
	sp: 5_000,
	max_rounds: 100,
	round_duration: 1,
	tick_interval: 0.5,
};

// ─── Round Log ──────────────────────────────────────────────────

export interface RoundLog {
	round: number;
	a_hp: number;
	b_hp: number;
	a_damage_dealt: number;
	b_damage_dealt: number;
	events: string[];
}

export interface CombatResult {
	winner: string | "draw";
	rounds: number;
	a_final_hp: number;
	b_final_hp: number;
	log: RoundLog[];
}
