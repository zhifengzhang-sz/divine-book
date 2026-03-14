/**
 * Shared types and event schemas for the combat simulator actor system.
 */

// ---------------------------------------------------------------------------
// Factor vector — input to pure damage computation
// ---------------------------------------------------------------------------

export interface FactorVector {
	D_base: number;       // base attack % (raw, /100 in resolveHit)
	D_flat: number;       // flat damage % (raw, /100 in resolveHit)
	D_ortho: number;      // orthogonal damage % (raw, /100 in resolveHit)
	S_coeff: number;      // ATK bonus (fractional: 0.7 = +70% ATK)
	M_dmg: number;        // damage multiplier (fractional: 0.4 = +40%)
	M_skill: number;      // skill multiplier (fractional)
	M_final: number;      // final multiplier (fractional)
	M_crit: number;       // crit multiplier (fractional)
	sigma_R: number;      // resonance coefficient (multiplicative, base=1)
	D_res: number;        // DR bypass (fractional: 0.5 = ignore 50% of target DR)
	H_A: number;          // healing % of ATK per activation (raw, /100 to apply)
}

export const ZERO_FACTORS: FactorVector = {
	D_base: 0,
	D_flat: 0,
	D_ortho: 0,
	S_coeff: 0,
	M_dmg: 0,
	M_skill: 0,
	M_final: 0,
	M_crit: 0,
	sigma_R: 1,
	D_res: 0,
	H_A: 0,
};

// ---------------------------------------------------------------------------
// State effect definitions — declarative config for what a slot spawns
// ---------------------------------------------------------------------------

/** Who the state effect targets, resolved by the slot at spawn time */
export type StateTarget = "self" | "opponent";

export interface StateDef {
	id: string;
	duration: number;
	target: StateTarget;
	modifiers: Partial<FactorVector>;
	dr_modifier?: number;
	healing_modifier?: number;
	damage_per_tick?: number;
	shield_hp?: number;
	counter_damage?: number;
	burst_damage?: number;         // damage dealt when state expires (delayed_burst)
	on_dispel_damage?: number;     // damage dealt when this state is dispelled
	atk_modifier?: number;         // fractional: 0.7 = +70% ATK (additive with other atk_modifiers)
	def_modifier?: number;         // fractional: 0.7 = +70% DEF (additive with other def_modifiers)
	stacks?: number;               // initial stack count
	max_stacks?: number;           // stack cap
	trigger?: "on_cast" | "on_attacked" | "per_tick";  // when this state is created
	chance?: number;               // probability 0–100 (roll before creating)
	per_hit_stack?: boolean;       // send STACK per hit instead of creating once
	dispellable?: boolean;         // false → ignore DISPEL events (default true)
}

// ---------------------------------------------------------------------------
// Conditional factor sources — evaluated at slot activation time
// ---------------------------------------------------------------------------

export interface ConditionalFactor {
	/** What condition triggers this bonus */
	condition:
		| "per_enemy_lost_hp"      // M_dmg per % of enemy HP lost (e.g., 吞海: 0.4 per %)
		| "per_self_lost_hp"       // M_dmg per % of self HP lost (e.g., 战意: 2.95 per %)
		| "min_lost_hp_threshold"  // floor on lost HP % calculation (e.g., 意坠深渊: 11%)
		| "target_hp_below"        // activates when target HP < threshold (e.g., 怒目: 30%)
		| "ignore_dr"              // DR bypass = 100% (e.g., 神威冲云)
		| "target_has_debuff"      // activates when target has any debuff (e.g., 引灵摘魂)
		| "per_hit_escalation"     // M_skill/M_dmg per hit segment (e.g., 破竹: +40% per hit)
		| "per_debuff_stack"       // per N debuff stacks on target (e.g., 解体化形)
		| "per_buff_stack"         // per N buff stacks on self (e.g., 真极穿空)
		| "self_lost_hp_damage"    // D_ortho from self HP cost (e.g., 玄煞灵影诀)
		| "probability_multiplier" // expected value: prob × mult (e.g., 心逐神随)
		| "enemy_dr_reduction"     // reduce opponent effective DR (e.g., 无极剑阵)
		| "self_dr_during_cast"    // self DR boost during activation (e.g., 金汤)
		| "conditional_crit";      // conditional M_crit bonus (e.g., 溃魂击瑕)
	/** Which factor to modify */
	factor: keyof FactorVector;
	/** Per-% multiplier (per_lost_hp), flat bonus (target_hp_below), or threshold (min_lost_hp) */
	value: number;
	/** HP% threshold for conditional triggers */
	threshold?: number;
	/** Max stacks for per_hit_escalation, per_debuff_stack, per_buff_stack */
	max_stacks?: number;
	/** For per_debuff_stack/per_buff_stack: every N stacks */
	per_n_stacks?: number;
	/** Probability for probability_multiplier (0.0–1.0) */
	probability?: number;
}

// ---------------------------------------------------------------------------
// Definitions — declarative config, not runtime state
// ---------------------------------------------------------------------------

export interface SlotDef {
	id: string;
	platform: string;
	hit_count: number;
	base_factors: FactorVector;
	conditional_factors: ConditionalFactor[];
	states_to_create: StateDef[];
	target_entity: string;         // systemId of the entity to hit
	owner_entity: string;          // systemId of the entity that owns this slot

	// Slot-level actions (executed on activation)
	self_hp_cost?: number;         // % of max HP to deduct from self
	lifesteal?: number;            // % of damage dealt → heal self
	self_heal?: number;            // flat heal amount on activation
	self_cleanse_count?: number;   // remove N debuffs from self
	buff_steal_count?: number;     // steal N buffs from opponent
}

export interface EntityDef {
	id: string;
	hp: number;                  // 气血
	atk: number;                 // 攻击
	sp: number;                  // 灵力 — shield generation
	def: number;                 // 守御 — damage reduction (raw value)
	dr_constant: number;         // K in DR = def / (def + K)
}

// ---------------------------------------------------------------------------
// Events — the contracts between actors
// ---------------------------------------------------------------------------

/** Slot → Entity (target). Also DoT → Entity, Entity → Entity (counter). */
export type HitEvent = {
	type: "HIT";
	damage: number;              // raw damage (before target DR)
	source: string;              // systemId of attacker entity
	is_crit: boolean;
	hit_index: number;
	dr_bypass: number;           // D_res: fraction of target DR to ignore (0.0–1.0)
	healing: number;             // H_A: amount to heal source entity
};

/** Arena → State Effects */
export type TickEvent = { type: "TICK"; dt: number };

/** Slot → Arena: state created, register it */
export type StateCreatedEvent = {
	type: "STATE_CREATED";
	state_id: string;            // systemId of the state effect actor
	target_entity: string;       // who it affects
};

/** Arena → Entity: a new state effect is now active on you */
export type StateAppliedEvent = {
	type: "STATE_APPLIED";
	state_id: string;            // systemId of the state effect actor
};


/** Anyone → State Effect */
export type DispelEvent = { type: "DISPEL" };

/** Arena/Slot → State Effect: increment stacks */
export type StackEvent = { type: "STACK" };

/** Entity → State Effect (shield): absorb incoming damage */
export type AbsorbEvent = { type: "ABSORB"; amount: number };

/** Slot → Entity (self): heal from H_A / lifesteal */
export type HealEvent = { type: "HEAL"; amount: number; source: string };
