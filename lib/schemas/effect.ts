/**
 * Typed Effect Schema — Zod discriminated union for all effect types.
 *
 * Each schema validates a single row from normalized.data.md.
 * Rows have `type` (= effect_type) and `key=value` fields.
 *
 * Organized by keyword.map.md sections (§0–§13).
 * Unit annotations: every z.number() carries .describe("unit:X") matching
 * the unit definitions in keyword.map.md. These are metadata only.
 *
 * Structural fields `parent` (optional string) and `name` (optional string)
 * are valid on any effect type — used for nested effect flattening in
 * normalized.data.md (e.g., `parent=罗天魔咒`).
 */

import { z } from "zod";

// =============================================================================
// Enum vocabularies — from keyword.map.md
// =============================================================================

/** Legal values for `condition` fields (keyword.map.md §4, Condition Vocabulary) */
export const ConditionEnum = z.enum([
	"target_controlled",
	"target_hp_below_30",
	"target_has_debuff",
	"target_has_no_healing",
	"target_has_shield",
	"enlightenment_max",
	"enlightenment_10",
]);

/** Legal values for debuff `target` fields (keyword.map.md §12) */
export const DebuffTargetEnum = z.enum([
	"healing_received",
	"damage_reduction",
	"final_damage_reduction",
]);

/** Legal values for per_hit_escalation `stat` field (keyword.map.md §5) */
export const EscalationStatEnum = z.enum(["damage", "skill_bonus"]);

/** Legal values for next_skill_buff `stat` field (keyword.map.md §11) */
export const NextSkillStatEnum = z.enum(["skill_damage_increase"]);

/** Legal values for cross_slot_debuff `trigger` field (keyword.map.md §12) */
export const DebuffTriggerEnum = z.enum(["on_attacked"]);

// =============================================================================
// Structural fields — present on every effect type
// =============================================================================

/** Fields that can appear on any row for parent/child flattening */
export const structuralFields = {
	parent: z.string().optional(),
	name: z.string().optional(),
};

// =============================================================================
// §0. Shared Mechanics (All Schools)
// =============================================================================

export const FusionFlatDamageSchema = z.object({
	type: z.literal("fusion_flat_damage"),
	...structuralFields,
	fusion_level: z.number().describe("unit:count"),
	value: z.number().describe("unit:%atk"),
});

export const MasteryExtraDamageSchema = z.object({
	type: z.literal("mastery_extra_damage"),
	...structuralFields,
	fusion_level: z.number().describe("unit:count"),
	value: z.number().describe("unit:%atk"),
});

export const EnlightenmentDamageSchema = z.object({
	type: z.literal("enlightenment_damage"),
	...structuralFields,
	value: z.number().describe("unit:%atk"),
});

export const CooldownSchema = z.object({
	type: z.literal("cooldown"),
	...structuralFields,
	value: z.number().describe("unit:seconds"),
});

// =============================================================================
// §1. Base Damage
// =============================================================================

export const BaseAttackSchema = z.object({
	type: z.literal("base_attack"),
	...structuralFields,
	hits: z.number().describe("unit:count").optional(),
	total: z.number().describe("unit:%atk").optional(),
});

export const PercentMaxHpDamageSchema = z.object({
	type: z.literal("percent_max_hp_damage"),
	...structuralFields,
	value: z.number().describe("unit:%max_hp"),
	cap_vs_monster: z.number().describe("unit:%atk"),
});

export const ShieldDestroyDamageSchema = z.object({
	type: z.literal("shield_destroy_damage"),
	...structuralFields,
	shields_per_hit: z.number().describe("unit:count"),
	percent_max_hp: z.number().describe("unit:%max_hp"),
	cap_vs_monster: z.number().describe("unit:%atk"),
	no_shield_double_cap: z.number().describe("unit:%atk"),
});

// =============================================================================
// §2. Damage Multiplier Zones
// =============================================================================

export const AttackBonusSchema = z.object({
	type: z.literal("attack_bonus"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const DamageIncreaseSchema = z.object({
	type: z.literal("damage_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const SkillDamageIncreaseSchema = z.object({
	type: z.literal("skill_damage_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const EnemySkillDamageReductionSchema = z.object({
	type: z.literal("enemy_skill_damage_reduction"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const FinalDamageBonusSchema = z.object({
	type: z.literal("final_damage_bonus"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const CritDamageBonusSchema = z.object({
	type: z.literal("crit_damage_bonus"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const TechniqueDamageIncreaseSchema = z.object({
	type: z.literal("technique_damage_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const FlatExtraDamageSchema = z.object({
	type: z.literal("flat_extra_damage"),
	...structuralFields,
	value: z.number().describe("unit:%atk"),
});

// =============================================================================
// §3. Resonance System (会心)
// =============================================================================

export const GuaranteedResonanceSchema = z.object({
	type: z.literal("guaranteed_resonance"),
	...structuralFields,
	base_mult: z.number().describe("unit:multiplier"),
	enhanced_mult: z.number().describe("unit:multiplier"),
	enhanced_chance: z.number().describe("unit:probability"),
});

// =============================================================================
// §3b. Synchrony System (心逐)
// =============================================================================

/**
 * Each row is one probability tier (prob + mult).
 * keyword.map §3b defines `tiers→list of {prob, mult}` but normalized.data
 * emits one row per tier: `prob=11, mult=4` / `prob=31, mult=3` / etc.
 */
export const ProbabilityMultiplierSchema = z.object({
	type: z.literal("probability_multiplier"),
	...structuralFields,
	prob: z.number().describe("unit:probability"),
	mult: z.number().describe("unit:multiplier"),
});

// =============================================================================
// §3c. Standard Crit (暴击)
// =============================================================================

export const ConditionalCritSchema = z.object({
	type: z.literal("conditional_crit"),
	...structuralFields,
	condition: z.union([ConditionEnum, z.string()]),
});

export const ConditionalCritRateSchema = z.object({
	type: z.literal("conditional_crit_rate"),
	...structuralFields,
	value: z.number().describe("unit:probability"),
	condition: z.union([ConditionEnum, z.string()]),
});

// =============================================================================
// §4. Conditional Triggers
// =============================================================================

export const ConditionalDamageSchema = z.object({
	type: z.literal("conditional_damage"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
	condition: z.union([ConditionEnum, z.string()]),
	escalated_value: z.number().describe("unit:%stat").optional(),
});

/** Variable stat fields: percent_max_hp_increase, percent_lost_hp_increase, damage_increase */
export const ConditionalBuffSchema = z.object({
	type: z.literal("conditional_buff"),
	...structuralFields,
	condition: z.union([ConditionEnum, z.string()]),
	damage_increase: z.number().describe("unit:%stat").optional(),
	percent_max_hp_increase: z.number().describe("unit:%stat").optional(),
	percent_lost_hp_increase: z.number().describe("unit:%stat").optional(),
});

export const ProbabilityToCertainSchema = z.object({
	type: z.literal("probability_to_certain"),
	...structuralFields,
});

export const IgnoreDamageReductionSchema = z.object({
	type: z.literal("ignore_damage_reduction"),
	...structuralFields,
});

// =============================================================================
// §5. Per-Hit Escalation
// =============================================================================

export const PerHitEscalationSchema = z.object({
	type: z.literal("per_hit_escalation"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
	stat: EscalationStatEnum,
	max: z.number().describe("unit:%stat").optional(),
});

export const PeriodicEscalationSchema = z.object({
	type: z.literal("periodic_escalation"),
	...structuralFields,
	every_n_hits: z.number().describe("unit:count"),
	multiplier: z.number().describe("unit:multiplier"),
	max_stacks: z.number().describe("unit:count"),
});

// =============================================================================
// §6. HP-Based Calculations
// =============================================================================

export const PerSelfLostHpSchema = z.object({
	type: z.literal("per_self_lost_hp"),
	...structuralFields,
	per_percent: z.number().describe("unit:%stat"),
});

export const PerEnemyLostHpSchema = z.object({
	type: z.literal("per_enemy_lost_hp"),
	...structuralFields,
	per_percent: z.number().describe("unit:%stat"),
});

export const MinLostHpThresholdSchema = z.object({
	type: z.literal("min_lost_hp_threshold"),
	...structuralFields,
	value: z.number().describe("unit:%lost_hp"),
});

export const SelfHpCostSchema = z.object({
	type: z.literal("self_hp_cost"),
	...structuralFields,
	value: z.number().describe("unit:%current_hp"),
});

export const SelfLostHpDamageSchema = z.object({
	type: z.literal("self_lost_hp_damage"),
	...structuralFields,
	value: z.number().describe("unit:%lost_hp"),
	on_last_hit: z.boolean().optional(),
	heal_equal: z.boolean().optional(),
});

export const SelfDamageTakenIncreaseSchema = z.object({
	type: z.literal("self_damage_taken_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

// =============================================================================
// §7. Healing and Survival
// =============================================================================

export const LifestealSchema = z.object({
	type: z.literal("lifesteal"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const HealingToDamageSchema = z.object({
	type: z.literal("healing_to_damage"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const HealingIncreaseSchema = z.object({
	type: z.literal("healing_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const SelfDamageReductionDuringCastSchema = z.object({
	type: z.literal("self_damage_reduction_during_cast"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

// =============================================================================
// §8. Shield System
// =============================================================================

export const ShieldStrengthSchema = z.object({
	type: z.literal("shield_strength"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const OnShieldExpireSchema = z.object({
	type: z.literal("on_shield_expire"),
	...structuralFields,
	damage_percent_of_shield: z.number().describe("unit:%stat"),
});

export const DamageToShieldSchema = z.object({
	type: z.literal("damage_to_shield"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
	duration: z.number().describe("unit:seconds"),
});

// =============================================================================
// §9. State Modifiers
// =============================================================================

export const BuffStrengthSchema = z.object({
	type: z.literal("buff_strength"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const DebuffStrengthSchema = z.object({
	type: z.literal("debuff_strength"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const BuffDurationSchema = z.object({
	type: z.literal("buff_duration"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const AllStateDurationSchema = z.object({
	type: z.literal("all_state_duration"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const BuffStackIncreaseSchema = z.object({
	type: z.literal("buff_stack_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const DebuffStackIncreaseSchema = z.object({
	type: z.literal("debuff_stack_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const DebuffStackChanceSchema = z.object({
	type: z.literal("debuff_stack_chance"),
	...structuralFields,
	value: z.number().describe("unit:probability"),
});

// =============================================================================
// §10. Damage over Time (DoT)
// =============================================================================

export const DotSchema = z.object({
	type: z.literal("dot"),
	...structuralFields,
	tick_interval: z.number().describe("unit:seconds"),
	duration: z.number().describe("unit:seconds"),
	damage_per_tick: z.number().describe("unit:%atk").optional(),
	percent_current_hp: z.number().describe("unit:%current_hp").optional(),
	percent_lost_hp: z.number().describe("unit:%lost_hp").optional(),
	max_stacks: z.number().describe("unit:count").optional(),
});

export const ShieldDestroyDotSchema = z.object({
	type: z.literal("shield_destroy_dot"),
	...structuralFields,
	tick_interval: z.number().describe("unit:seconds"),
	per_shield_damage: z.number().describe("unit:%atk"),
	no_shield_assumed: z.number().describe("unit:count"),
});

export const DotExtraPerTickSchema = z.object({
	type: z.literal("dot_extra_per_tick"),
	...structuralFields,
	value: z.number().describe("unit:%lost_hp"),
});

export const DotDamageIncreaseSchema = z.object({
	type: z.literal("dot_damage_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const DotFrequencyIncreaseSchema = z.object({
	type: z.literal("dot_frequency_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const ExtendedDotSchema = z.object({
	type: z.literal("extended_dot"),
	...structuralFields,
	extra_seconds: z.number().describe("unit:seconds"),
	tick_interval: z.number().describe("unit:seconds"),
});

export const OnDispelSchema = z.object({
	type: z.literal("on_dispel"),
	...structuralFields,
	damage: z.number().describe("unit:%atk").optional(),
	stun: z.number().describe("unit:seconds").optional(),
});

// =============================================================================
// §11. Self Buffs
// =============================================================================

export const SelfBuffSchema = z.object({
	type: z.literal("self_buff"),
	...structuralFields,
	duration: z.number().describe("unit:seconds"),
	max_stacks: z.number().describe("unit:count").optional(),
	attack_bonus: z.number().describe("unit:%stat").optional(),
	defense_bonus: z.number().describe("unit:%stat").optional(),
	hp_bonus: z.number().describe("unit:%stat").optional(),
	damage_reduction: z.number().describe("unit:%stat").optional(),
	healing_bonus: z.number().describe("unit:%stat").optional(),
});

export const SelfBuffExtendSchema = z.object({
	type: z.literal("self_buff_extend"),
	...structuralFields,
	buff_name: z.string(),
	value: z.number().describe("unit:seconds"),
});

/** Variable stat fields (e.g., healing_bonus) */
export const SelfBuffExtraSchema = z.object({
	type: z.literal("self_buff_extra"),
	...structuralFields,
	buff_name: z.string().optional(),
	healing_bonus: z.number().describe("unit:%stat").optional(),
	value: z.number().describe("unit:%stat").optional(),
});

export const CounterBuffSchema = z.object({
	type: z.literal("counter_buff"),
	...structuralFields,
	duration: z.number().describe("unit:seconds"),
	reflect_received_damage: z.number().describe("unit:%stat").optional(),
	reflect_percent_lost_hp: z.number().describe("unit:%lost_hp").optional(),
});

export const NextSkillBuffSchema = z.object({
	type: z.literal("next_skill_buff"),
	...structuralFields,
	stat: NextSkillStatEnum,
	value: z.number().describe("unit:%stat"),
});

export const EnlightenmentBonusSchema = z.object({
	type: z.literal("enlightenment_bonus"),
	...structuralFields,
	value: z.number().describe("unit:count"),
	max: z.number().describe("unit:count"),
});

// =============================================================================
// §12. Debuffs
// =============================================================================

export const DebuffSchema = z.object({
	type: z.literal("debuff"),
	...structuralFields,
	target: DebuffTargetEnum,
	value: z.number().describe("unit:%stat"),
	duration: z.number().describe("unit:seconds"),
	dispellable: z.boolean().optional(),
});

/**
 * Duration can be a number (seconds) or `same_as_trigger` (string).
 * keyword.map §12: `与触发的增益状态相同` → `duration=same_as_trigger`
 */
export const ConditionalDebuffSchema = z.object({
	type: z.literal("conditional_debuff"),
	...structuralFields,
	condition: z.union([ConditionEnum, z.string()]),
	target: DebuffTargetEnum,
	value: z.number().describe("unit:%stat"),
	duration: z
		.union([z.number().describe("unit:seconds"), z.literal("same_as_trigger")])
		.optional(),
	per_hit: z.boolean().optional(),
});

export const CrossSlotDebuffSchema = z.object({
	type: z.literal("cross_slot_debuff"),
	...structuralFields,
	target: DebuffTargetEnum,
	value: z.number().describe("unit:%stat"),
	duration: z.number().describe("unit:seconds"),
	trigger: DebuffTriggerEnum,
});

/**
 * Flat row model — effects (dots) are separate child rows with `parent=`.
 * The counter_debuff row itself carries only: name, duration,
 * on_attacked_chance, max_stacks.
 */
export const CounterDebuffSchema = z.object({
	type: z.literal("counter_debuff"),
	...structuralFields,
	duration: z.number().describe("unit:seconds"),
	on_attacked_chance: z.number().describe("unit:probability"),
	max_stacks: z.number().describe("unit:count").optional(),
});

export const CounterDebuffUpgradeSchema = z.object({
	type: z.literal("counter_debuff_upgrade"),
	...structuralFields,
	on_attacked_chance: z.number().describe("unit:probability"),
});

// =============================================================================
// §13. Special Mechanics
// =============================================================================

// §13.1 Summons and Clones

export const SummonSchema = z.object({
	type: z.literal("summon"),
	...structuralFields,
	inherit_stats: z.number().describe("unit:%stat"),
	duration: z.number().describe("unit:seconds"),
	damage_taken_multiplier: z.number().describe("unit:%stat"),
});

export const SummonBuffSchema = z.object({
	type: z.literal("summon_buff"),
	...structuralFields,
	damage_taken_reduction_to: z.number().describe("unit:%stat"),
	damage_increase: z.number().describe("unit:%stat"),
});

// §13.2 Untargetable State

export const UntargetableStateSchema = z.object({
	type: z.literal("untargetable_state"),
	...structuralFields,
	duration: z.number().describe("unit:seconds"),
});

// §13.3 Dispel and Crowd Control

export const PeriodicDispelSchema = z.object({
	type: z.literal("periodic_dispel"),
	...structuralFields,
	interval: z.number().describe("unit:seconds"),
	duration: z.number().describe("unit:seconds"),
	damage_percent_of_skill: z.number().describe("unit:%stat"),
	no_buff_double: z.boolean(),
});

export const PeriodicCleanseSchema = z.object({
	type: z.literal("periodic_cleanse"),
	...structuralFields,
	chance: z.number().describe("unit:probability"),
	interval: z.number().describe("unit:seconds"),
	cooldown: z.number().describe("unit:seconds"),
	max_triggers: z.number().describe("unit:count"),
});

// §13.4 Delayed Burst

export const DelayedBurstSchema = z.object({
	type: z.literal("delayed_burst"),
	...structuralFields,
	duration: z.number().describe("unit:seconds"),
	damage_increase_during: z.number().describe("unit:%stat"),
	burst_base: z.number().describe("unit:%atk"),
	burst_accumulated_pct: z.number().describe("unit:%stat"),
});

export const DelayedBurstIncreaseSchema = z.object({
	type: z.literal("delayed_burst_increase"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

// §13.5 Random Effects
// Each option is a separate child row with `parent=`. The parent row has no
// `options` array — just the type discriminator (and optionally a name).

export const RandomBuffSchema = z.object({
	type: z.literal("random_buff"),
	...structuralFields,
	options: z.string().optional(),
});

export const RandomDebuffSchema = z.object({
	type: z.literal("random_debuff"),
	...structuralFields,
	options: z.string().optional(),
});

// §13.5 Random Effect Option Types (child rows with parent=)

export const AttackReductionSchema = z.object({
	type: z.literal("attack_reduction"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const CritRateReductionSchema = z.object({
	type: z.literal("crit_rate_reduction"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

export const CritDamageReductionSchema = z.object({
	type: z.literal("crit_damage_reduction"),
	...structuralFields,
	value: z.number().describe("unit:%stat"),
});

// §13.6 Stack-Based Damage

export const PerBuffStackDamageSchema = z.object({
	type: z.literal("per_buff_stack_damage"),
	...structuralFields,
	per_n_stacks: z.number().describe("unit:count"),
	value: z.number().describe("unit:%stat"),
	max: z.number().describe("unit:%stat"),
});

export const PerDebuffStackDamageSchema = z.object({
	type: z.literal("per_debuff_stack_damage"),
	...structuralFields,
	per_n_stacks: z.number().describe("unit:count"),
	value: z.number().describe("unit:%stat"),
	max: z.number().describe("unit:%stat"),
	dot_half: z.boolean().optional(),
});

export const PerDebuffStackTrueDamageSchema = z.object({
	type: z.literal("per_debuff_stack_true_damage"),
	...structuralFields,
	per_stack: z.number().describe("unit:%max_hp"),
	max: z.number().describe("unit:%max_hp"),
});

// §13.7 Other Triggers

export const OnBuffDebuffShieldTriggerSchema = z.object({
	type: z.literal("on_buff_debuff_shield_trigger"),
	...structuralFields,
	damage_percent_of_skill: z.number().describe("unit:%stat"),
});

export const ConditionalHealBuffSchema = z.object({
	type: z.literal("conditional_heal_buff"),
	...structuralFields,
	condition: z.union([ConditionEnum, z.string()]),
	value: z.number().describe("unit:%stat"),
	duration: z.number().describe("unit:seconds"),
});

// =============================================================================
// DataState Schema — validates data_state column values
// =============================================================================

/** Single data_state token */
const DataStateTokenSchema = z.union([
	z.string().regex(/^enlightenment=\d+$/),
	z.string().regex(/^fusion=\d+$/),
	z.literal("max_fusion"),
	z.literal("locked"),
]);

/**
 * data_state column values:
 * - empty string or undefined (default for that school)
 * - single token: `enlightenment=0`, `fusion=54`, `max_fusion`, `locked`
 * - array of tokens: `[enlightenment=1, fusion=20]`
 */
export const DataStateSchema = z.union([
	z.undefined(),
	z.literal(""),
	DataStateTokenSchema,
	z.array(DataStateTokenSchema),
]);

export type DataState = z.infer<typeof DataStateSchema>;

// =============================================================================
// Discriminated union — now derived from registry
// =============================================================================

// EffectSchema is exported from lib/domain/registry.ts (registry.effectSchema).
// It cannot be re-exported here due to circular dependency:
//   effect.ts → registry.ts → effects/*.ts → effect.ts
// Consumers should import from registry:
//   import { registry } from "./domain/registry.js";
//   const EffectSchema = registry.effectSchema;

