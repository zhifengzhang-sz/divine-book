/**
 * Effect Types — the canonical contract between parser and simulator.
 *
 * Every interface here is verified against the semantic actions that produce it
 * and the raw Chinese text it derives from. See docs/parser/effect-catalog.md.
 *
 * Variable fields use `V = string | number`:
 *   - `string` before tier resolution (variable reference like "x", "y")
 *   - `number` after tier resolution (concrete value)
 *
 * Handlers use `Resolved<T>` (from lib/sim/handlers/types.ts) to narrow V → number.
 */

import { z } from "zod";

// ── Variable type ───────────────────────────────────────
/** String before tier resolution, number after */
export type V = string | number;
const V_Schema = z.union([z.string(), z.number()]);

/**
 * Pipeline metadata added by resolveTiers() — not part of the parsed effect,
 * but attached during tier resolution. The index signature allows generic
 * field iteration in pipeline code (resolveTiers, emit).
 */
export interface EffectMeta {
	/** Tier label, e.g. "enlightenment=0" or ["enlightenment=10", "fusion=51"] */
	data_state?: string | string[];
	/** Allow generic field access in pipeline code */
	[k: string]: unknown;
}

/** Effect with pipeline metadata — used in parser pipeline and YAML */
export type EffectWithMeta = Effect & EffectMeta;

// ══════════════════════════════════════════════════════════
// §1 Skill Effects — Damage
// ══════════════════════════════════════════════════════════

/** All 28 books. "造成N段共x%攻击力的(灵法)伤害" */
export interface BaseAttack {
	type: "base_attack";
	/** 六段 — number of hits */
	hits: number;
	/** x% — total damage as % of ATK across all hits */
	total: V;
}
export const BaseAttackSchema = z.object({
	type: z.literal("base_attack"),
	hits: z.number(),
	total: V_Schema,
}).passthrough() satisfies z.ZodType<BaseAttack>;

/** 千锋聚灵剑, 皓月剑诀, 玉书天戈符, 天轮魔经. "V%最大气血值的伤害" */
export interface PercentMaxHpDamage {
	type: "percent_max_hp_damage";
	/** y% — damage as % of target's max HP */
	value: V;
	/** 对怪物不超过z%攻击力 */
	cap_vs_monster?: V;
	/** 玉书天戈符: "每段伤害附加" */
	per_hit?: boolean;
	/** 天轮魔经: triggered on steal */
	trigger?: string;
}
export const PercentMaxHpDamageSchema = z.object({
	type: z.literal("percent_max_hp_damage"),
	value: V_Schema,
	cap_vs_monster: V_Schema.optional(),
	per_hit: z.boolean().optional(),
	trigger: z.string().optional(),
}).passthrough() satisfies z.ZodType<PercentMaxHpDamage>;

/** 无极御剑诀. "额外附加V%目标当前气血值的伤害" */
export interface PercentCurrentHpDamage {
	type: "percent_current_hp_damage";
	/** x% — damage as % of target's current HP */
	value: V;
	/** 无极御剑诀: cross-skill accumulation */
	accumulation?: "cross_skill";
	/** per prior hit flag */
	per_prior_hit?: boolean;
}
export const PercentCurrentHpDamageSchema = z.object({
	type: z.literal("percent_current_hp_damage"),
	value: V_Schema,
	accumulation: z.literal("cross_skill").optional(),
	per_prior_hit: z.boolean().optional(),
}).passthrough() satisfies z.ZodType<PercentCurrentHpDamage>;

/** 惊蜇化龙, 十方真魄, 煞影千幻, 九重天凤诀, 天煞破虚诀, 玄煞灵影诀. "自身V%已损失气血值的伤害" */
export interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	/** x% — damage as % of own lost HP */
	value: V;
	/** 十方真魄: "等额恢复自身气血" */
	self_heal?: boolean;
	/** 九重天凤诀, 天煞破虚诀: per hit */
	per_hit?: boolean;
	/** 玄煞灵影诀: per-second DoT variant */
	tick_interval?: number;
	/** 玄煞灵影诀 affix: every N hits */
	every_n_hits?: V;
	/** 天煞破虚诀: affects next skill */
	next_skill_hits?: V;
}
export const SelfLostHpDamageSchema = z.object({
	type: z.literal("self_lost_hp_damage"),
	value: V_Schema,
	self_heal: z.boolean().optional(),
	per_hit: z.boolean().optional(),
	tick_interval: z.number().optional(),
	every_n_hits: V_Schema.optional(),
	next_skill_hits: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<SelfLostHpDamage>;

/** 皓月剑诀. "湮灭敌方N个护盾，并额外造成V%最大气血值的伤害" */
export interface ShieldDestroyDamage {
	type: "shield_destroy_damage";
	/** N个护盾 */
	shields_per_hit: V;
	/** V%最大气血值 */
	percent_max_hp: V;
	/** 对怪物不超过... */
	cap_vs_monster?: V;
}
export const ShieldDestroyDamageSchema = z.object({
	type: z.literal("shield_destroy_damage"),
	shields_per_hit: V_Schema,
	percent_max_hp: V_Schema,
	cap_vs_monster: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<ShieldDestroyDamage>;

/** 皓月剑诀. "对无盾目标造成双倍伤害" */
export interface NoShieldDoubleDamage {
	type: "no_shield_double_damage";
	/** 对怪物不超过... */
	cap_vs_monster?: V;
}
export const NoShieldDoubleDamageSchema = z.object({
	type: z.literal("no_shield_double_damage"),
	cap_vs_monster: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<NoShieldDoubleDamage>;

/** 星元化岳. "伤害值为当次伤害的V%" */
export interface EchoDamage {
	type: "echo_damage";
	/** V% — echo damage ratio */
	value: V;
	/** 该伤害不受伤害加成影响 */
	ignore_damage_bonus?: boolean;
	/** duration of echo state */
	duration?: V;
}
export const EchoDamageSchema = z.object({
	type: z.literal("echo_damage"),
	value: V_Schema,
	ignore_damage_bonus: z.boolean().optional(),
	duration: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<EchoDamage>;

/** 周天星元. "附加临摹期间所恢复气血值的等额伤害" */
export interface HealEchoDamage {
	type: "heal_echo_damage";
	/** always 1 */
	ratio: number;
}
export const HealEchoDamageSchema = z.object({
	type: z.literal("heal_echo_damage"),
	ratio: z.number(),
}).passthrough() satisfies z.ZodType<HealEchoDamage>;

/** 解体化形, 天魔降临咒, 天轮魔经. "每具有一个减益状态，伤害提升V%" */
export interface PerDebuffStackDamage {
	type: "per_debuff_stack_damage";
	/** V% — damage increase per stack */
	value: V;
	/** 最多V% */
	max: V;
	/** 天魔降临咒: per layer */
	per_n_stacks?: number;
	/** state context */
	parent?: string;
	/** 天轮魔经: per stack value */
	per_stack?: V;
}
export const PerDebuffStackDamageSchema = z.object({
	type: z.literal("per_debuff_stack_damage"),
	value: V_Schema,
	max: V_Schema,
	per_n_stacks: z.number().optional(),
	parent: z.string().optional(),
	per_stack: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<PerDebuffStackDamage>;

/** 惊蜇化龙. "每层...真实伤害" */
export interface PerDebuffStackTrueDamage {
	type: "per_debuff_stack_true_damage";
	/** per stack damage */
	per_stack: V;
	/** max stacks */
	max: V;
}
export const PerDebuffStackTrueDamageSchema = z.object({
	type: z.literal("per_debuff_stack_true_damage"),
	per_stack: V_Schema,
	max: V_Schema,
}).passthrough() satisfies z.ZodType<PerDebuffStackTrueDamage>;

/** 念剑诀. "每造成N次伤害时，伤害提升V倍" */
export interface PeriodicEscalation {
	type: "periodic_escalation";
	/** N次 — hits per escalation step */
	every_n_hits: V;
	/** V倍 — multiplier per step */
	multiplier: V;
	/** max stacks */
	max_stacks: V;
}
export const PeriodicEscalationSchema = z.object({
	type: z.literal("periodic_escalation"),
	every_n_hits: V_Schema,
	multiplier: V_Schema,
	max_stacks: V_Schema,
}).passthrough() satisfies z.ZodType<PeriodicEscalation>;

/** 无相魔劫咒. Delayed state-end damage burst */
export interface DelayedBurst {
	type: "delayed_burst";
	/** state name */
	name: V;
	/** damage increase during state */
	increase: V;
	/** % of accumulated damage */
	burst_damage: V;
	/** + % attack power */
	burst_atk_damage: V;
	/** base burst damage as % of ATK (handler alias for burst_atk_damage) */
	burst_base?: V;
	/** duration in seconds */
	duration?: V;
}
export const DelayedBurstSchema = z.object({
	type: z.literal("delayed_burst"),
	name: V_Schema,
	increase: V_Schema,
	burst_damage: V_Schema,
	burst_atk_damage: V_Schema,
	burst_base: V_Schema.optional(),
	duration: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<DelayedBurst>;

/** 九天真雷诀, 通天剑诀. Conditional bonus damage */
export interface ConditionalDamage {
	type: "conditional_damage";
	/** V% — bonus damage */
	value: V;
	/** 九天真雷诀: based on self max HP */
	damage_base?: "self_max_hp";
	/** per hit flag */
	per_hit?: boolean;
	/** condition type */
	condition: string;
	/** 通天剑诀: per % hp loss */
	per_step?: V;
	/** 九天真雷诀: "接下来的三个神通" — number of next skills affected */
	next_skill_count?: number;
}
export const ConditionalDamageSchema = z.object({
	type: z.literal("conditional_damage"),
	value: V_Schema,
	damage_base: z.literal("self_max_hp").optional(),
	per_hit: z.boolean().optional(),
	condition: z.string(),
	per_step: V_Schema.optional(),
	next_skill_count: z.number().optional(),
}).passthrough() satisfies z.ZodType<ConditionalDamage>;

// ══════════════════════════════════════════════════════════
// §2 Skill Effects — Cost
// ══════════════════════════════════════════════════════════

/** 7 books. "消耗V%当前气血值" */
export interface SelfHpCost {
	type: "self_hp_cost";
	/** V% — cost as % of current HP */
	value: V;
	/** 玄煞灵影诀: per-second cost */
	tick_interval?: number;
	/** 九重天凤诀: cost per hit */
	per_hit?: boolean;
}
export const SelfHpCostSchema = z.object({
	type: z.literal("self_hp_cost"),
	value: V_Schema,
	tick_interval: z.number().optional(),
	per_hit: z.boolean().optional(),
}).passthrough() satisfies z.ZodType<SelfHpCost>;

// ══════════════════════════════════════════════════════════
// §3 Skill Effects — DoT
// ══════════════════════════════════════════════════════════

/** 春黎剑阵, 大罗幻诀, 梵圣真魔咒. Damage over time */
export interface Dot {
	type: "dot";
	/** seconds between ticks */
	tick_interval: V;
	/** 春黎剑阵 */
	state?: V;
	/** 大罗幻诀 state name */
	name?: string;
	/** 春黎剑阵 */
	damage_per_tick?: V;
	/** 大罗幻诀, 梵圣真魔咒 */
	percent_current_hp?: V;
	/** 大罗幻诀 variant */
	percent_lost_hp?: V;
	/** duration of DoT */
	duration?: V;
	/** 梵圣真魔咒 */
	trigger_stack?: V;
	/** 梵圣真魔咒 */
	source_state?: V;
}
export const DotSchema = z.object({
	type: z.literal("dot"),
	tick_interval: V_Schema,
	state: V_Schema.optional(),
	name: z.string().optional(),
	damage_per_tick: V_Schema.optional(),
	percent_current_hp: V_Schema.optional(),
	percent_lost_hp: V_Schema.optional(),
	duration: V_Schema.optional(),
	trigger_stack: V_Schema.optional(),
	source_state: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<Dot>;

// ══════════════════════════════════════════════════════════
// §4 Skill Effects — Healing / Shield
// ══════════════════════════════════════════════════════════

/** 周天星元. "恢复共V%最大气血值" */
export interface SelfHeal {
	type: "self_heal";
	/** state name (for per-tick form) */
	name?: string;
	/** total heal value */
	value?: V;
	/** per-second healing */
	per_tick?: V;
	/** total over duration */
	total?: V;
	/** seconds between ticks */
	tick_interval?: number;
}
export const SelfHealSchema = z.object({
	type: z.literal("self_heal"),
	value: V_Schema.optional(),
	per_tick: V_Schema.optional(),
	total: V_Schema.optional(),
	tick_interval: z.number().optional(),
}).passthrough() satisfies z.ZodType<SelfHeal>;

/** 煞影千幻, 周天星元. "添加V%最大气血值的护盾" */
export interface Shield {
	type: "shield";
	/** V% — shield value */
	value: V;
	/** duration in seconds */
	duration?: V;
	/** 周天星元 灵鹤 */
	source?: "self_max_hp";
	/** 周天星元 灵鹤 */
	trigger?: "per_tick";
	/** parent state for reactive registration */
	parent?: string;
}
export const ShieldSchema = z.object({
	type: z.literal("shield"),
	value: V_Schema,
	duration: V_Schema.optional(),
	source: z.literal("self_max_hp").optional(),
	trigger: z.literal("per_tick").optional(),
}).passthrough() satisfies z.ZodType<Shield>;

// ══════════════════════════════════════════════════════════
// §5 Skill Effects — Buff
// ══════════════════════════════════════════════════════════

/** Multiple books. Stat buff on self — exactly one or more stat fields set per instance */
export interface SelfBuff {
	type: "self_buff";
	/** state context name */
	name?: string;
	/** 攻击力提升 */
	attack_bonus?: V;
	/** 伤害提升 */
	damage_increase?: V;
	/** 神通伤害提升 */
	skill_damage_increase?: V;
	/** 最终伤害提升 */
	final_damage_bonus?: V;
	/** 伤害减免 */
	damage_reduction?: V;
	/** 暴击率 */
	crit_rate?: V;
	/** 治疗量提升 */
	healing_bonus?: V;
	/** 防御力提升 */
	defense_bonus?: V;
	/** 气血值提升 */
	hp_bonus?: V;
	/** duration in seconds */
	duration?: V;
	/** max stack count */
	max_stacks?: V;
	/** 天刹真魔: "enemy_has_debuff" */
	condition?: string;
	/** Allow dynamic stat field iteration in handler */
	[k: string]: unknown;
}
export const SelfBuffSchema = z.object({
	type: z.literal("self_buff"),
	name: z.string().optional(),
	attack_bonus: V_Schema.optional(),
	damage_increase: V_Schema.optional(),
	skill_damage_increase: V_Schema.optional(),
	final_damage_bonus: V_Schema.optional(),
	damage_reduction: V_Schema.optional(),
	crit_rate: V_Schema.optional(),
	healing_bonus: V_Schema.optional(),
	defense_bonus: V_Schema.optional(),
	hp_bonus: V_Schema.optional(),
	duration: V_Schema.optional(),
	max_stacks: V_Schema.optional(),
	condition: z.string().optional(),
}).passthrough() satisfies z.ZodType<SelfBuff>;

// ══════════════════════════════════════════════════════════
// §6 Skill Effects — Debuff
// ══════════════════════════════════════════════════════════

/** Multiple books. Named debuff on target */
export interface Debuff {
	type: "debuff";
	/** state name */
	name?: string;
	/** target stat: "skill_damage", "next_skill_cooldown", etc. */
	target?: string;
	/** debuff value */
	value?: V;
	/** duration in seconds */
	duration?: V;
	/** 最多叠加N层 */
	max_stacks?: V;
	/** 可驱散 (default true) */
	dispellable?: boolean;
	/** 新青元剑诀: sequenced cooldown */
	sequenced?: boolean;
	/** 天刹真魔: "on_hit" */
	trigger?: string;
	/** 无相魔劫咒: heal reduction component */
	heal_reduction?: V;
	/** 无相魔劫咒: damage increase component */
	damage_increase?: V;
	/** 无相魔劫咒: enhanced damage increase */
	enhanced_damage_increase?: V;
}
export const DebuffSchema = z.object({
	type: z.literal("debuff"),
	name: z.string().optional(),
	target: z.string().optional(),
	value: V_Schema.optional(),
	duration: V_Schema.optional(),
	max_stacks: V_Schema.optional(),
	dispellable: z.boolean().optional(),
	sequenced: z.boolean().optional(),
	trigger: z.string().optional(),
	heal_reduction: V_Schema.optional(),
	damage_increase: V_Schema.optional(),
	enhanced_damage_increase: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<Debuff>;

// ══════════════════════════════════════════════════════════
// §7 Skill Effects — Complex / Multi-clause
// ══════════════════════════════════════════════════════════

/** 天轮魔经. "偷取目标N个增益状态" */
export interface BuffSteal {
	type: "buff_steal";
	/** N个 — number to steal */
	value: V;
	/** handler alias for value — number of buffs to steal */
	count?: V;
}
export const BuffStealSchema = z.object({
	type: z.literal("buff_steal"),
	value: V_Schema,
	count: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<BuffSteal>;

/** 念剑诀. "N秒内不可被选中" */
export interface Untargetable {
	type: "untargetable";
	/** N秒 — duration */
	value: V;
	/** duration in seconds (handler alias for value) */
	duration?: V;
}
export const UntargetableSchema = z.object({
	type: z.literal("untargetable"),
	value: V_Schema,
	duration: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<Untargetable>;

/** 大罗幻诀. "受到伤害时，各有N%概率添加N层..." */
export interface CounterDebuff {
	type: "counter_debuff";
	/** "on_attacked" */
	trigger: string;
	/** N% — probability */
	chance: V;
	/** legacy alias for chance (handler reads this) */
	on_attacked_chance?: V;
	/** N层 — stacks to add */
	count: V;
	/** state name */
	name: V;
	/** child state names (may be stripped during YAML serialization) */
	states?: V[];
	/** 最多叠加N层 */
	max_stacks?: V;
	/** 持续N秒 */
	duration?: V;
	/** parent state for reactive registration */
	parent?: string;
}
export const CounterDebuffSchema = z.object({
	type: z.literal("counter_debuff"),
	trigger: z.string(),
	chance: V_Schema,
	count: V_Schema,
	name: V_Schema,
	states: z.array(V_Schema).optional(),
	max_stacks: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<CounterDebuff>;

/** 天刹真魔, 疾风九变. "受到伤害时..." */
export interface CounterBuff {
	type: "counter_buff";
	/** state name */
	name?: string;
	/** "on_attacked" */
	trigger?: string;
	/** 天刹真魔: heal on damage taken */
	heal_on_damage_taken?: V;
	/** 天刹真魔: no healing bonus */
	no_healing_bonus?: boolean;
	/** 疾风九变: reflect received damage */
	reflect_received_damage?: V;
	/** 疾风九变: reflect % of lost HP */
	reflect_percent_lost_hp?: V;
	/** 持续N秒 */
	duration?: V;
}
export const CounterBuffSchema = z.object({
	type: z.literal("counter_buff"),
	trigger: z.string().optional(),
	heal_on_damage_taken: V_Schema.optional(),
	no_healing_bonus: z.boolean().optional(),
	reflect_received_damage: V_Schema.optional(),
	reflect_percent_lost_hp: V_Schema.optional(),
	duration: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<CounterBuff>;

/** 春黎剑阵. "创建分身，继承V%属性" */
export interface Summon {
	type: "summon";
	/** V% — inherit percentage */
	inherit_stats: V;
	/** duration in seconds */
	duration?: V;
	/** trigger type */
	trigger?: "on_cast";
	/** damage taken multiplier */
	damage_taken_multiplier?: V;
}
export const SummonSchema = z.object({
	type: z.literal("summon"),
	inherit_stats: V_Schema,
	duration: V_Schema.optional(),
	trigger: z.literal("on_cast").optional(),
	damage_taken_multiplier: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<Summon>;

/** 通天剑诀. "暴击伤害提高V%" */
export interface CritDmgBonus {
	type: "crit_dmg_bonus";
	/** V% — crit damage bonus */
	value: V;
}
export const CritDmgBonusSchema = z.object({
	type: z.literal("crit_dmg_bonus"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<CritDmgBonus>;

/** 通天剑诀, 十方真魄. "自身受到伤害提高V%" */
export interface SelfDamageTakenIncrease {
	type: "self_damage_taken_increase";
	/** N秒 — duration (通天剑诀) */
	duration?: V;
	/** V% — increase amount */
	value: V;
}
export const SelfDamageTakenIncreaseSchema = z.object({
	type: z.literal("self_damage_taken_increase"),
	duration: V_Schema.optional(),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<SelfDamageTakenIncrease>;

/** 九天真雷诀. "驱散自身N个负面状态" */
export interface SelfCleanse {
	type: "self_cleanse";
	/** N个 — number to cleanse */
	count: V;
}
export const SelfCleanseSchema = z.object({
	type: z.literal("self_cleanse"),
	count: V_Schema,
}).passthrough() satisfies z.ZodType<SelfCleanse>;

// ══════════════════════════════════════════════════════════
// §8 Skill Effects — State References
// ══════════════════════════════════════════════════════════

/** "获得/添加/进入/施加 【name】" */
export interface StateRef {
	type: "state_ref";
	/** state name */
	state: V;
	/** 无相魔劫咒: "持续12秒" */
	duration?: V;
}
export const StateRefSchema = z.object({
	type: z.literal("state_ref"),
	state: V_Schema,
	duration: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<StateRef>;

/** "为自身/对其 添加N层 【name】" */
export interface StateAdd {
	type: "state_add";
	/** state name */
	state: V;
	/** N层 — stack count */
	count?: V;
	/** per hit flag */
	per_hit?: boolean;
	/** 煞影千幻: cannot be dispelled */
	undispellable?: boolean;
	/** 持续N秒 */
	duration?: V;
}
export const StateAddSchema = z.object({
	type: z.literal("state_add"),
	state: V_Schema,
	count: V_Schema.optional(),
	per_hit: z.boolean().optional(),
	undispellable: z.boolean().optional(),
	duration: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<StateAdd>;

// ══════════════════════════════════════════════════════════
// §9 Common Affixes (通用词缀)
// ══════════════════════════════════════════════════════════

/** 咒书. "减益效果强度提升x%" */
export interface DebuffStrength {
	type: "debuff_strength";
	/** x% */
	value: V;
}
export const DebuffStrengthSchema = z.object({
	type: z.literal("debuff_strength"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DebuffStrength>;

/** 清灵. "增益效果强度提升x%" */
export interface BuffStrength {
	type: "buff_strength";
	/** x% */
	value: V;
}
export const BuffStrengthSchema = z.object({
	type: z.literal("buff_strength"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<BuffStrength>;

/** 业焰, 疾风九变. "所有状态效果持续时间延长x%" */
export interface AllStateDuration {
	type: "all_state_duration";
	/** x% */
	value: V;
}
export const AllStateDurationSchema = z.object({
	type: z.literal("all_state_duration"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<AllStateDuration>;

/** 击瑕, 煞影千幻. "若敌方处于控制效果，伤害提升x%" */
export interface ConditionalDamageControlled {
	type: "conditional_damage_controlled";
	/** x% */
	value: V;
}
export const ConditionalDamageControlledSchema = z.object({
	type: z.literal("conditional_damage_controlled"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<ConditionalDamageControlled>;

/** 破竹, 修为_剑修. Affix form: "每造成1段伤害，剩余段数伤害提升x%" */
export interface PerHitEscalationAffix {
	type: "per_hit_escalation";
	/** 1段 — hits per step */
	hits: V;
	/** x% — per-hit escalation */
	per_hit: V;
	/** y% — maximum cap */
	max: V;
}

/** 千锋聚灵剑 primary affix. Book form: "每段攻击提升x%神通加成" */
export interface PerHitEscalationBook {
	type: "per_hit_escalation";
	/** x% — escalation per hit */
	value: V;
	/** which multiplier zone */
	stat: "skill_bonus";
	/** direct effect */
	parent: "this";
}

export const PerHitEscalationSchema = z.union([
	z.object({ type: z.literal("per_hit_escalation"), hits: V_Schema, per_hit: V_Schema, max: V_Schema }).passthrough(),
	z.object({ type: z.literal("per_hit_escalation"), value: V_Schema, stat: z.literal("skill_bonus"), parent: z.literal("this") }).passthrough(),
]);

/** 金汤, 修为_体修. "施放期间提升自身x%伤害减免" */
export interface DamageReductionDuringCast {
	type: "damage_reduction_during_cast";
	/** x% */
	value: V;
}
export const DamageReductionDuringCastSchema = z.object({
	type: z.literal("damage_reduction_during_cast"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DamageReductionDuringCast>;

/** 怒目, 修为_魔修. "若敌方气血值低于N%，伤害提升x%" */
export interface ExecuteConditional {
	type: "execute_conditional";
	/** N% — HP threshold */
	hp_threshold: V;
	/** x% — damage increase */
	damage_increase: V;
	/** 通用: 暴击率提升y% */
	crit_rate_increase?: V;
	/** 修为_魔修: guaranteed crit */
	guaranteed_crit?: number;
}
export const ExecuteConditionalSchema = z.object({
	type: z.literal("execute_conditional"),
	hp_threshold: V_Schema,
	damage_increase: V_Schema,
	crit_rate_increase: V_Schema.optional(),
	guaranteed_crit: z.number().optional(),
}).passthrough() satisfies z.ZodType<ExecuteConditional>;

/** 鬼印, 皓月剑诀 exclusive. "持续伤害触发时，额外造成x%已损失气血值的伤害" */
export interface DotExtraPerTick {
	type: "dot_extra_per_tick";
	/** x% */
	value: V;
}
export const DotExtraPerTickSchema = z.object({
	type: z.literal("dot_extra_per_tick"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DotExtraPerTick>;

/** 福荫, 修为_剑修, 修为_法修. "获得任意1个加成：攻击x%、致命伤害x%、伤害x%" */
export interface RandomBuff {
	type: "random_buff";
	/** x% — all three options share same variable */
	attack: V;
}
export const RandomBuffSchema = z.object({
	type: z.literal("random_buff"),
	attack: V_Schema,
}).passthrough() satisfies z.ZodType<RandomBuff>;

/** 战意, 玄煞灵影诀 exclusive. "自身每多损失1%气血，伤害提升x%" */
export interface PerSelfLostHp {
	type: "per_self_lost_hp";
	/** x% */
	value: V;
}
export const PerSelfLostHpSchema = z.object({
	type: z.literal("per_self_lost_hp"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<PerSelfLostHp>;

/** 斩岳, 修为_体修. "额外造成x%攻击力的伤害" */
export interface FlatExtraDamage {
	type: "flat_extra_damage";
	/** x% */
	value: V;
}
export const FlatExtraDamageSchema = z.object({
	type: z.literal("flat_extra_damage"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<FlatExtraDamage>;

/** 吞海, 修为_体修. "敌方每多损失1%气血，伤害提升x%" */
export interface PerEnemyLostHp {
	type: "per_enemy_lost_hp";
	/** 1% — per N% step (通用 lit "1", 体修 parameterized) */
	per_percent: V;
	/** x% — damage increase per step */
	value: V;
}
export const PerEnemyLostHpSchema = z.object({
	type: z.literal("per_enemy_lost_hp"),
	per_percent: V_Schema,
	value: V_Schema,
}).passthrough() satisfies z.ZodType<PerEnemyLostHp>;

/** 灵盾, 修为_体修. "护盾值提升x%" */
export interface ShieldValueIncrease {
	type: "shield_value_increase";
	/** x% */
	value: V;
}
export const ShieldValueIncreaseSchema = z.object({
	type: z.literal("shield_value_increase"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<ShieldValueIncrease>;

/** 灵威, 新青元剑诀. "下一个神通额外获得x%伤害加深" */
export interface NextSkillBuff {
	type: "next_skill_buff";
	/** x% */
	value: V;
}
export const NextSkillBuffSchema = z.object({
	type: z.literal("next_skill_buff"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<NextSkillBuff>;

/** 摧山, 修为_剑修, 元磁神光, 解体化形. "攻击力提升x%" */
export interface AttackBonus {
	type: "attack_bonus";
	/** x% */
	value: V;
	/** 元磁神光: per state stack */
	per_state_stack?: V;
	/** 解体化形: per debuff stack */
	per_debuff_stack?: boolean;
	/** 解体化形: max stacks */
	max_stacks?: V;
	/** 解体化形: "pre_cast" */
	timing?: string;
}
export const AttackBonusSchema = z.object({
	type: z.literal("attack_bonus"),
	value: V_Schema,
	per_state_stack: V_Schema.optional(),
	per_debuff_stack: z.boolean().optional(),
	max_stacks: V_Schema.optional(),
	timing: z.string().optional(),
}).passthrough() satisfies z.ZodType<AttackBonus>;

/** 通明, 修为_剑修. "必定会心造成x倍伤害" */
export interface GuaranteedResonance {
	type: "guaranteed_resonance";
	/** x倍 — base crit multiplier */
	base_multiplier: V;
	/** y% — upgrade chance */
	chance: V;
	/** z倍 — upgraded crit multiplier */
	upgraded_multiplier: V;
}
export const GuaranteedResonanceSchema = z.object({
	type: z.literal("guaranteed_resonance"),
	base_multiplier: V_Schema,
	chance: V_Schema,
	upgraded_multiplier: V_Schema,
}).passthrough() satisfies z.ZodType<GuaranteedResonance>;

// ══════════════════════════════════════════════════════════
// §10 School Affixes (修为词缀)
// ══════════════════════════════════════════════════════════

/** 修为_剑修. "攻击力x%、伤害提升y%、致命伤害z%" */
export interface TripleBonus {
	type: "triple_bonus";
	/** x% */
	attack_bonus: V;
	/** y% */
	damage_increase: V;
	/** z% */
	crit_damage_increase: V;
}
export const TripleBonusSchema = z.object({
	type: z.literal("triple_bonus"),
	attack_bonus: V_Schema,
	damage_increase: V_Schema,
	crit_damage_increase: V_Schema,
}).passthrough() satisfies z.ZodType<TripleBonus>;

/** 修为_法修. "概率类效果必定触发" */
export interface ProbabilityToCertain {
	type: "probability_to_certain";
	/** bonus damage increase % when probability becomes certain */
	damage_increase?: V;
}
export const ProbabilityToCertainSchema = z.object({
	type: z.literal("probability_to_certain"),
	damage_increase: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<ProbabilityToCertain>;

/** 修为_法修, 通天剑诀, 皓月剑诀, 玉书天戈符, 十方真魄, 惊蜇化龙. "伤害提升x%" */
export interface DamageIncrease {
	type: "damage_increase";
	/** x% */
	value: V;
}
export const DamageIncreaseSchema = z.object({
	type: z.literal("damage_increase"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DamageIncrease>;

/** 修为_法修. "最终伤害提升x%" */
export interface FinalDmgBonus {
	type: "final_dmg_bonus";
	/** x% */
	value: V;
}
export const FinalDmgBonusSchema = z.object({
	type: z.literal("final_dmg_bonus"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<FinalDmgBonus>;

/** 修为_法修. "治疗量提升x%" */
export interface HealingIncrease {
	type: "healing_increase";
	/** x% */
	value: V;
}
export const HealingIncreaseSchema = z.object({
	type: z.literal("healing_increase"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<HealingIncrease>;

/** 修为_魔修. "治疗转化为伤害x%" */
export interface HealingToDamage {
	type: "healing_to_damage";
	/** x% */
	value: V;
}
export const HealingToDamageSchema = z.object({
	type: z.literal("healing_to_damage"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<HealingToDamage>;

/** 修为_魔修. "伤害转化为护盾x%" */
export interface DamageToShield {
	type: "damage_to_shield";
	/** x% */
	value: V;
	/** duration in seconds */
	duration: V;
}
export const DamageToShieldSchema = z.object({
	type: z.literal("damage_to_shield"),
	value: V_Schema,
	duration: V_Schema,
}).passthrough() satisfies z.ZodType<DamageToShield>;

/** 修为_魔修. "随机施加减益：攻击x%、暴击率y%、致命伤害z%" */
export interface RandomDebuff {
	type: "random_debuff";
	/** x% — attack reduction */
	attack: V;
	/** y% — crit rate reduction */
	crit_rate: V;
	/** z% — crit damage reduction */
	crit_damage: V;
}
export const RandomDebuffSchema = z.object({
	type: z.literal("random_debuff"),
	attack: V_Schema,
	crit_rate: V_Schema,
	crit_damage: V_Schema,
}).passthrough() satisfies z.ZodType<RandomDebuff>;

/** 修为_体修. "最低损失气血x%，伤害提升y%" */
export interface MinLostHpThreshold {
	type: "min_lost_hp_threshold";
	/** x% — minimum lost HP threshold */
	min_percent: V;
	/** y% — damage increase */
	damage_increase: V;
}
export const MinLostHpThresholdSchema = z.object({
	type: z.literal("min_lost_hp_threshold"),
	min_percent: V_Schema,
	damage_increase: V_Schema,
}).passthrough() satisfies z.ZodType<MinLostHpThreshold>;

// ══════════════════════════════════════════════════════════
// §11 Per-book Primary Affixes (主词缀)
// ══════════════════════════════════════════════════════════

/** 春黎剑阵. "分身受到伤害降低，伤害提升" */
export interface SummonBuff {
	type: "summon_buff";
	/** damage taken reduction */
	damage_taken_reduction_to: V;
	/** damage increase */
	damage_increase: V;
}
export const SummonBuffSchema = z.object({
	type: z.literal("summon_buff"),
	damage_taken_reduction_to: V_Schema,
	damage_increase: V_Schema,
}).passthrough() satisfies z.ZodType<SummonBuff>;

/** 皓月剑诀. "护盾销毁持续伤害" */
export interface ShieldDestroyDot {
	type: "shield_destroy_dot";
	/** state name */
	state: V;
	/** tick interval */
	interval: V;
	/** damage per tick */
	value: V;
	/** parent state name (handler alias for state) */
	parent?: string;
	/** damage % ATK per destroyed shield */
	per_shield_damage?: V;
	/** assumed shield count when none destroyed */
	no_shield_assumed?: V;
}
export const ShieldDestroyDotSchema = z.object({
	type: z.literal("shield_destroy_dot"),
	state: V_Schema,
	interval: V_Schema,
	value: V_Schema,
	parent: z.string().optional(),
	per_shield_damage: V_Schema.optional(),
	no_shield_assumed: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<ShieldDestroyDot>;

/** 念剑诀. "持续伤害延长N秒" */
export interface ExtendedDot {
	type: "extended_dot";
	/** N秒 — extra seconds */
	extra_seconds: V;
	/** tick interval */
	interval: V;
}
export const ExtendedDotSchema = z.object({
	type: z.literal("extended_dot"),
	extra_seconds: V_Schema,
	interval: V_Schema,
}).passthrough() satisfies z.ZodType<ExtendedDot>;

/** 天刹真魔. "在状态下额外获得增益" */
export interface SelfBuffExtra {
	type: "self_buff_extra";
	/** source state (【不灭魔体】) */
	state: V;
	/** target state to debuff (【天人五衰】) */
	target_state: V;
	/** rotation interval in seconds (每3秒轮流) */
	interval?: V;
	/** 致命率 x% */
	crit_rate: V;
	/** 暴击伤害 x% */
	crit_damage?: V;
	/** 暴击率 x% (second crit stat in rotation) */
	crit_rate_2?: V;
	/** 攻击力 y% */
	attack?: V;
	/** 最终伤害减免 y% */
	final_damage_reduction?: V;
	/** duration in seconds */
	duration: V;
	/** generic handler reads buff_name, max_stacks, stat fields dynamically */
	[k: string]: unknown;
}
export const SelfBuffExtraSchema = z.object({
	type: z.literal("self_buff_extra"),
	state: V_Schema,
	target_state: V_Schema,
	interval: V_Schema.optional(),
	crit_rate: V_Schema,
	crit_damage: V_Schema.optional(),
	crit_rate_2: V_Schema.optional(),
	attack: V_Schema.optional(),
	final_damage_reduction: V_Schema.optional(),
	duration: V_Schema,
}).passthrough() satisfies z.ZodType<SelfBuffExtra>;

/** 十方真魄. "延长自身增益状态持续时间" */
export interface SelfBuffExtend {
	type: "self_buff_extend";
	/** duration extension */
	value: V;
	/** state name */
	state: V;
}
export const SelfBuffExtendSchema = z.object({
	type: z.literal("self_buff_extend"),
	value: V_Schema,
	state: V_Schema,
}).passthrough() satisfies z.ZodType<SelfBuffExtend>;

/** 十方真魄. "每N秒有x%概率净化" */
export interface PeriodicCleanse {
	type: "periodic_cleanse";
	/** x% — chance */
	chance: V;
	/** state to cleanse */
	target: string;
	/** N秒 — interval */
	cooldown: V;
	/** max triggers */
	max_times: V;
	/** tick interval in seconds (handler alias for cooldown) */
	interval?: V;
	/** max number of triggers (handler alias for max_times) */
	max_triggers?: V;
	/** parent state name this effect is attached to */
	parent?: string;
}
export const PeriodicCleanseSchema = z.object({
	type: z.literal("periodic_cleanse"),
	chance: V_Schema,
	target: z.string(),
	cooldown: V_Schema,
	max_times: V_Schema,
	interval: V_Schema.optional(),
	max_triggers: V_Schema.optional(),
	parent: z.string().optional(),
}).passthrough() satisfies z.ZodType<PeriodicCleanse>;

/** 疾风九变. "附带吸血效果" */
export interface LifestealWithParent {
	type: "lifesteal_with_parent";
	/** parent state */
	state: V;
	/** lifesteal % */
	value: V;
}
export const LifestealWithParentSchema = z.object({
	type: z.literal("lifesteal_with_parent"),
	state: V_Schema,
	value: V_Schema,
}).passthrough() satisfies z.ZodType<LifestealWithParent>;

/** 煞影千幻. "护盾强度提升x%" */
export interface ShieldStrength {
	type: "shield_strength";
	/** x% */
	value: V;
	/** 持续N秒 */
	duration?: V;
}
export const ShieldStrengthSchema = z.object({
	type: z.literal("shield_strength"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<ShieldStrength>;

/** 大罗幻诀. "反击减益升级" */
export interface CounterDebuffUpgrade {
	type: "counter_debuff_upgrade";
	/** state name */
	state: V;
	/** upgrade amount */
	value: V;
}
export const CounterDebuffUpgradeSchema = z.object({
	type: z.literal("counter_debuff_upgrade"),
	state: V_Schema,
	value: V_Schema,
}).passthrough() satisfies z.ZodType<CounterDebuffUpgrade>;

/** 天魔降临咒. "持续伤害为最大气血%" */
export interface DotPermanentMaxHp {
	type: "dot_permanent_max_hp";
	/** state name */
	state: V;
	/** x% */
	value: V;
}
export const DotPermanentMaxHpSchema = z.object({
	type: z.literal("dot_permanent_max_hp"),
	state: V_Schema,
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DotPermanentMaxHp>;

/** 天魔降临咒. "每层减益提升伤害" */
export interface PerDebuffDamageUpgrade {
	type: "per_debuff_damage_upgrade";
	/** state name */
	state: V;
	/** x% */
	value: V;
}
export const PerDebuffDamageUpgradeSchema = z.object({
	type: z.literal("per_debuff_damage_upgrade"),
	state: V_Schema,
	value: V_Schema,
}).passthrough() satisfies z.ZodType<PerDebuffDamageUpgrade>;

/** 天轮魔经. "每偷取一个增益，施加减益" */
export interface PerStolenBuffDebuff {
	type: "per_stolen_buff_debuff";
	/** state name */
	state: V;
	/** debuff value */
	value: V;
	/** duration */
	duration: V;
}
export const PerStolenBuffDebuffSchema = z.object({
	type: z.literal("per_stolen_buff_debuff"),
	state: V_Schema,
	value: V_Schema,
	duration: V_Schema,
}).passthrough() satisfies z.ZodType<PerStolenBuffDebuff>;

/** 无相魔劫咒. "延迟爆发伤害提升" */
export interface DelayedBurstIncrease {
	type: "delayed_burst_increase";
	/** state name */
	state: V;
	/** x% */
	value: V;
}
export const DelayedBurstIncreaseSchema = z.object({
	type: z.literal("delayed_burst_increase"),
	state: V_Schema,
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DelayedBurstIncrease>;

/** 惊蜇化龙. "最大气血%伤害(词缀版)" */
export interface PercentMaxHpAffix {
	type: "percent_max_hp_affix";
	/** x% */
	value: V;
	/** state context */
	state: V;
	/** trigger stack count */
	trigger_stack: V;
}
export const PercentMaxHpAffixSchema = z.object({
	type: z.literal("percent_max_hp_affix"),
	value: V_Schema,
	state: V_Schema,
	trigger_stack: V_Schema,
}).passthrough() satisfies z.ZodType<PercentMaxHpAffix>;

/** 浩然星灵诀, 玉书天戈符. Conditional stat-scaling damage */
export interface ConditionalHpScaling {
	type: "conditional_hp_scaling";
	/** threshold % */
	hp_threshold: V;
	/** damage value */
	value: V;
	/** 浩然星灵诀: cap */
	max?: V;
	/** 玉书天戈符: per step */
	per_step?: V;
	/** Scaling basis: "hp" (玉书天戈符) or "final_damage_bonus" (浩然星灵诀) */
	basis?: string;
}
export const ConditionalHpScalingSchema = z.object({
	type: z.literal("conditional_hp_scaling"),
	hp_threshold: V_Schema,
	value: V_Schema,
	max: V_Schema.optional(),
	per_step: V_Schema.optional(),
	basis: z.string().optional(),
}).passthrough() satisfies z.ZodType<ConditionalHpScaling>;

/** 元磁神光. "每层增益状态提升伤害" */
export interface PerBuffStackDamage {
	type: "per_buff_stack_damage";
	/** per N stacks */
	per_stack: V;
	/** damage % */
	value: V;
	/** cap */
	max: V;
}
export const PerBuffStackDamageSchema = z.object({
	type: z.literal("per_buff_stack_damage"),
	per_stack: V_Schema,
	value: V_Schema,
	max: V_Schema,
}).passthrough() satisfies z.ZodType<PerBuffStackDamage>;

/** 元磁神光. "增益层数增加x%" */
export interface BuffStackIncrease {
	type: "buff_stack_increase";
	/** x% */
	value: V;
}
export const BuffStackIncreaseSchema = z.object({
	type: z.literal("buff_stack_increase"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<BuffStackIncrease>;

/** 天轮魔经. "减益层数增加x%" */
export interface DebuffStackIncrease {
	type: "debuff_stack_increase";
	/** x% */
	value: V;
}
export const DebuffStackIncreaseSchema = z.object({
	type: z.literal("debuff_stack_increase"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DebuffStackIncrease>;

/** 周天星元. "减益触发概率x%" */
export interface DebuffStackChance {
	type: "debuff_stack_chance";
	/** x% */
	value: V;
}
export const DebuffStackChanceSchema = z.object({
	type: z.literal("debuff_stack_chance"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DebuffStackChance>;

/** 念剑诀. "增益持续时间延长x%" */
export interface BuffDuration {
	type: "buff_duration";
	/** x% */
	value: V;
}
export const BuffDurationSchema = z.object({
	type: z.literal("buff_duration"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<BuffDuration>;

// ══════════════════════════════════════════════════════════
// §12 Exclusive Affixes (专属词缀)
// ══════════════════════════════════════════════════════════

/** 千锋聚灵剑, 甲元仙符. "治疗量降低x%" */
export interface HealReduction {
	type: "heal_reduction";
	/** x% — heal reduction */
	value: V;
	/** state name */
	state: V;
	/** duration in seconds */
	duration: V;
	/** 千锋聚灵剑: 无法被驱散 */
	undispellable?: boolean;
	/** 甲元仙符: enhanced reduction */
	enhanced_value?: V;
	/** 甲元仙符: HP threshold */
	hp_threshold?: V;
}
export const HealReductionSchema = z.object({
	type: z.literal("heal_reduction"),
	value: V_Schema,
	state: V_Schema,
	duration: V_Schema,
	undispellable: z.boolean().optional(),
	enhanced_value: V_Schema.optional(),
	hp_threshold: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<HealReduction>;

/** 星元化岳. "吸血x%" */
export interface Lifesteal {
	type: "lifesteal";
	/** x% */
	value: V;
}
export const LifestealSchema = z.object({
	type: z.literal("lifesteal"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<Lifesteal>;

/** 春黎剑阵. "驱散时造成伤害" */
export interface OnDispel {
	type: "on_dispel";
	/** damage % */
	damage: V;
	/** stun duration */
	stun_duration: V;
	/** parent state name this effect is attached to */
	parent?: string;
}
export const OnDispelSchema = z.object({
	type: z.literal("on_dispel"),
	damage: V_Schema,
	stun_duration: V_Schema,
	parent: z.string().optional(),
}).passthrough() satisfies z.ZodType<OnDispel>;

/** 九重天凤诀, 天煞破虚诀. "定期驱散敌方增益" */
export interface PeriodicDispel {
	type: "periodic_dispel";
	/** number to dispel */
	count?: V;
	/** seconds between dispels */
	interval?: number;
	/** total duration */
	duration?: V;
	/** 天煞破虚诀: damage as % of skill */
	damage_percent_of_skill?: V;
	/** 天煞破虚诀: double if no buff */
	no_buff_double?: boolean;
}
export const PeriodicDispelSchema = z.object({
	type: z.literal("periodic_dispel"),
	count: V_Schema.optional(),
	interval: z.number().optional(),
	duration: V_Schema.optional(),
	damage_percent_of_skill: V_Schema.optional(),
	no_buff_double: z.boolean().optional(),
}).passthrough() satisfies z.ZodType<PeriodicDispel>;

/** 九重天凤诀. "护盾到期时造成伤害" */
export interface OnShieldExpire {
	type: "on_shield_expire";
	/** damage % of shield value */
	value: V;
	/** damage as % of shield value (handler alias for value) */
	damage_percent_of_shield?: V;
}
export const OnShieldExpireSchema = z.object({
	type: z.literal("on_shield_expire"),
	value: V_Schema,
	damage_percent_of_shield: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<OnShieldExpire>;

/** 九天真雷诀. "增益/减益/护盾触发伤害" */
export interface OnBuffDebuffShield {
	type: "on_buff_debuff_shield";
	/** trigger kind */
	trigger_kind: string;
	/** x% */
	value: V;
	/** damage as % of max HP per trigger (handler alias) */
	damage_percent?: V;
}
export const OnBuffDebuffShieldSchema = z.object({
	type: z.literal("on_buff_debuff_shield"),
	trigger_kind: z.string(),
	value: V_Schema,
	damage_percent: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<OnBuffDebuffShield>;

/** 解体化形. "概率倍增伤害" */
export interface ProbabilityMultiplier {
	type: "probability_multiplier";
	/** 4x chance */
	chance_4x: V;
	/** 3x chance */
	chance_3x: V;
	/** 2x chance */
	chance_2x: V;
}
export const ProbabilityMultiplierSchema = z.object({
	type: z.literal("probability_multiplier"),
	chance_4x: V_Schema,
	chance_3x: V_Schema,
	chance_2x: V_Schema,
}).passthrough() satisfies z.ZodType<ProbabilityMultiplier>;

/** 大罗幻诀. "持续伤害提升x%" */
export interface DotDamageIncrease {
	type: "dot_damage_increase";
	/** x% */
	value: V;
}
export const DotDamageIncreaseSchema = z.object({
	type: z.literal("dot_damage_increase"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DotDamageIncrease>;

/** 梵圣真魔咒. "持续伤害频率提升x%" */
export interface DotFrequencyIncrease {
	type: "dot_frequency_increase";
	/** x% */
	value: V;
}
export const DotFrequencyIncreaseSchema = z.object({
	type: z.literal("dot_frequency_increase"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<DotFrequencyIncrease>;

/** 天魔降临咒. "有减益时伤害提升x%" */
export interface ConditionalDamageDebuff {
	type: "conditional_damage_debuff";
	/** x% */
	value: V;
}
export const ConditionalDamageDebuffSchema = z.object({
	type: z.literal("conditional_damage_debuff"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<ConditionalDamageDebuff>;

/** 九重天凤诀. "气血不会低于x%" */
export interface SelfHpFloor {
	type: "self_hp_floor";
	/** x% */
	value: V;
}
export const SelfHpFloorSchema = z.object({
	type: z.literal("self_hp_floor"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<SelfHpFloor>;

/** 玉书天戈符. "悟境等级加1，伤害提升x%" */
export interface EnlightenmentBonus {
	type: "enlightenment_bonus";
	/** x% */
	value: V;
}
export const EnlightenmentBonusSchema = z.object({
	type: z.literal("enlightenment_bonus"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<EnlightenmentBonus>;

/** 通天剑诀. "无视伤害减免" */
export interface IgnoreDamageReduction {
	type: "ignore_damage_reduction";
}
export const IgnoreDamageReductionSchema = z.object({
	type: z.literal("ignore_damage_reduction"),
}).passthrough() satisfies z.ZodType<IgnoreDamageReduction>;

/** 无极御剑诀. "神通伤害提升x%" */
export interface SkillDamageIncreaseAffix {
	type: "skill_damage_increase_affix";
	/** x% */
	value: V;
}
export const SkillDamageIncreaseAffixSchema = z.object({
	type: z.literal("skill_damage_increase_affix"),
	value: V_Schema,
}).passthrough() satisfies z.ZodType<SkillDamageIncreaseAffix>;

/** 周天星元, 大罗幻诀. "跨神通位施加减益" */
export interface CrossSlotDebuff {
	type: "cross_slot_debuff";
	/** 周天星元 variant */
	state?: V;
	/** 大罗幻诀 variant */
	name?: V;
	/** target stat */
	target?: string;
	/** debuff value */
	value: V;
	/** duration */
	duration?: V;
	/** trigger type */
	trigger?: string;
	/** parent state for reactive registration */
	parent?: string;
}
export const CrossSlotDebuffSchema = z.object({
	type: z.literal("cross_slot_debuff"),
	state: V_Schema.optional(),
	name: V_Schema.optional(),
	target: z.string().optional(),
	value: V_Schema,
	duration: V_Schema.optional(),
	trigger: z.string().optional(),
}).passthrough() satisfies z.ZodType<CrossSlotDebuff>;

/** 煞影千幻. "x%概率触发效果" */
export interface Chance {
	type: "chance";
	/** x% */
	value: V;
	/** effect description */
	effect: string;
}
export const ChanceSchema = z.object({
	type: z.literal("chance"),
	value: V_Schema,
	effect: z.string(),
}).passthrough() satisfies z.ZodType<Chance>;

/** 皓月剑诀, 惊蜇化龙 exclusive (compound parser). Conditional stat boost at enlightenment threshold */
export interface ConditionalBuff {
	type: "conditional_buff";
	condition: string;
	percent_max_hp_increase?: V;
	percent_lost_hp_increase?: V;
	damage_increase?: V;
	[k: string]: unknown;
}
export const ConditionalBuffSchema = z.object({
	type: z.literal("conditional_buff"),
	condition: z.string(),
	percent_max_hp_increase: V_Schema.optional(),
	percent_lost_hp_increase: V_Schema.optional(),
	damage_increase: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<ConditionalBuff>;

/** 周天星元, 天刹真魔 exclusive (compound parser). Conditional debuff on target */
export interface ConditionalDebuffCompound {
	type: "conditional_debuff";
	condition?: string;
	name?: string;
	target?: string;
	value?: V;
	multiplier?: V;
	duration?: V;
	[k: string]: unknown;
}
export const ConditionalDebuffCompoundSchema = z.object({
	type: z.literal("conditional_debuff"),
	condition: z.string().optional(),
	name: z.string().optional(),
	target: z.string().optional(),
	value: V_Schema.optional(),
	multiplier: V_Schema.optional(),
	duration: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<ConditionalDebuffCompound>;

/** 天刹真魔 exclusive (compound parser). Conditional heal buff */
export interface ConditionalHealBuff {
	type: "conditional_heal_buff";
	condition: string;
	value: V;
	duration?: V;
	[k: string]: unknown;
}
export const ConditionalHealBuffSchema = z.object({
	type: z.literal("conditional_heal_buff"),
	condition: z.string(),
	value: V_Schema,
	duration: V_Schema.optional(),
}).passthrough() satisfies z.ZodType<ConditionalHealBuff>;

// ══════════════════════════════════════════════════════════
// §13 Union type
// ══════════════════════════════════════════════════════════

export type Effect =
	// Damage
	| BaseAttack
	| PercentMaxHpDamage
	| PercentCurrentHpDamage
	| SelfLostHpDamage
	| ShieldDestroyDamage
	| NoShieldDoubleDamage
	| EchoDamage
	| HealEchoDamage
	| PerDebuffStackDamage
	| PerDebuffStackTrueDamage
	| PeriodicEscalation
	| DelayedBurst
	| ConditionalDamage
	| FlatExtraDamage
	// Cost
	| SelfHpCost
	// DoT
	| Dot
	// Healing / Shield
	| SelfHeal
	| Shield
	// Buff
	| SelfBuff
	// Debuff
	| Debuff
	// Complex
	| BuffSteal
	| Untargetable
	| CounterDebuff
	| CounterBuff
	| Summon
	| CritDmgBonus
	| SelfDamageTakenIncrease
	| SelfCleanse
	// State
	| StateRef
	| StateAdd
	// Common affixes
	| DebuffStrength
	| BuffStrength
	| AllStateDuration
	| ConditionalDamageControlled
	| PerHitEscalationAffix
	| PerHitEscalationBook
	| DamageReductionDuringCast
	| ExecuteConditional
	| DotExtraPerTick
	| RandomBuff
	| PerSelfLostHp
	| PerEnemyLostHp
	| ShieldValueIncrease
	| NextSkillBuff
	| AttackBonus
	| GuaranteedResonance
	// School affixes
	| TripleBonus
	| ProbabilityToCertain
	| DamageIncrease
	| FinalDmgBonus
	| HealingIncrease
	| HealingToDamage
	| DamageToShield
	| RandomDebuff
	| MinLostHpThreshold
	// Primary affixes
	| SummonBuff
	| ShieldDestroyDot
	| ExtendedDot
	| SelfBuffExtra
	| SelfBuffExtend
	| PeriodicCleanse
	| LifestealWithParent
	| ShieldStrength
	| CounterDebuffUpgrade
	| DotPermanentMaxHp
	| PerDebuffDamageUpgrade
	| PerStolenBuffDebuff
	| DelayedBurstIncrease
	| PercentMaxHpAffix
	| ConditionalHpScaling
	| PerBuffStackDamage
	| BuffStackIncrease
	| DebuffStackIncrease
	| DebuffStackChance
	| BuffDuration
	// Exclusive affixes
	| HealReduction
	| Lifesteal
	| OnDispel
	| PeriodicDispel
	| OnShieldExpire
	| OnBuffDebuffShield
	| ProbabilityMultiplier
	| DotDamageIncrease
	| DotFrequencyIncrease
	| ConditionalDamageDebuff
	| SelfHpFloor
	| EnlightenmentBonus
	| IgnoreDamageReduction
	| SkillDamageIncreaseAffix
	| CrossSlotDebuff
	| Chance
	// Compound parser types (legacy exclusive affixes)
	| ConditionalBuff
	| ConditionalDebuffCompound
	| ConditionalHealBuff;

// All schemas for discriminated union (per_hit_escalation handled separately)
const allSchemas = [
	BaseAttackSchema, PercentMaxHpDamageSchema, PercentCurrentHpDamageSchema,
	SelfLostHpDamageSchema, ShieldDestroyDamageSchema, NoShieldDoubleDamageSchema,
	EchoDamageSchema, HealEchoDamageSchema, PerDebuffStackDamageSchema,
	PerDebuffStackTrueDamageSchema, PeriodicEscalationSchema, DelayedBurstSchema,
	ConditionalDamageSchema, FlatExtraDamageSchema, SelfHpCostSchema, DotSchema,
	SelfHealSchema, ShieldSchema, SelfBuffSchema, DebuffSchema, BuffStealSchema,
	UntargetableSchema, CounterDebuffSchema, CounterBuffSchema, SummonSchema,
	CritDmgBonusSchema, SelfDamageTakenIncreaseSchema, SelfCleanseSchema,
	StateRefSchema, StateAddSchema, DebuffStrengthSchema, BuffStrengthSchema,
	AllStateDurationSchema, ConditionalDamageControlledSchema,
	DamageReductionDuringCastSchema, ExecuteConditionalSchema, DotExtraPerTickSchema,
	RandomBuffSchema, PerSelfLostHpSchema, PerEnemyLostHpSchema,
	ShieldValueIncreaseSchema, NextSkillBuffSchema, AttackBonusSchema,
	GuaranteedResonanceSchema, TripleBonusSchema, ProbabilityToCertainSchema,
	DamageIncreaseSchema, FinalDmgBonusSchema, HealingIncreaseSchema,
	HealingToDamageSchema, DamageToShieldSchema, RandomDebuffSchema,
	MinLostHpThresholdSchema, SummonBuffSchema, ShieldDestroyDotSchema,
	ExtendedDotSchema, SelfBuffExtraSchema, SelfBuffExtendSchema,
	PeriodicCleanseSchema, LifestealWithParentSchema, ShieldStrengthSchema,
	CounterDebuffUpgradeSchema, DotPermanentMaxHpSchema, PerDebuffDamageUpgradeSchema,
	PerStolenBuffDebuffSchema, DelayedBurstIncreaseSchema, PercentMaxHpAffixSchema,
	ConditionalHpScalingSchema, PerBuffStackDamageSchema, BuffStackIncreaseSchema,
	DebuffStackIncreaseSchema, DebuffStackChanceSchema, BuffDurationSchema,
	HealReductionSchema, LifestealSchema, OnDispelSchema, PeriodicDispelSchema,
	OnShieldExpireSchema, OnBuffDebuffShieldSchema, ProbabilityMultiplierSchema,
	DotDamageIncreaseSchema, DotFrequencyIncreaseSchema, ConditionalDamageDebuffSchema,
	SelfHpFloorSchema, EnlightenmentBonusSchema, IgnoreDamageReductionSchema,
	SkillDamageIncreaseAffixSchema, CrossSlotDebuffSchema, ChanceSchema,
	ConditionalBuffSchema, ConditionalDebuffCompoundSchema, ConditionalHealBuffSchema,
] as const;

/** Validates a single effect object. Handles per_hit_escalation specially (shared type string). */
export function parseEffect(data: unknown): Effect {
	if (typeof data === "object" && data !== null && "type" in data && (data as {type: string}).type === "per_hit_escalation") {
		return PerHitEscalationSchema.parse(data) as Effect;
	}
	return z.discriminatedUnion("type", [...allSchemas]).parse(data) as Effect;
}

/** Validates an array of effects */
export function parseEffects(data: unknown[]): Effect[] {
	return data.map(parseEffect);
}
