/**
 * Effect Types — derived bottom-up from all 28 book grammars + affix grammars.
 *
 * Each type represents a distinct semantic output from a grammar rule's semantic action.
 * Types are grouped by category. Field values are either:
 *   - `string` — a variable reference like "x", "y" (resolved by tier lookup)
 *   - `number` — a literal value parsed from the text
 *   - `boolean` — a flag derived from presence of a grammar rule
 *
 * Source of truth: the .ohm files in grammars/books/ and grammars/affixes/.
 * If this file disagrees with a grammar, the grammar wins.
 */

// ── Variable reference ──────────────────────────────────
// Most numeric fields are unresolved variable references (e.g., "x", "y")
// that get resolved to concrete numbers via tier lookup.
type VarRef = string;

// ══════════════════════════════════════════════════════════
// §1 Skill Effects — Damage
// ══════════════════════════════════════════════════════════

/** All 28 books. "造成N段共V%攻击力的(灵法)伤害" */
interface BaseAttack {
	type: "base_attack";
	hits: number; // parsed from cnNumber, default 1
	total: VarRef;
}

/** 千锋聚灵剑, 皓月剑诀. "V%最大气血值的伤害（对怪物不超过V%攻击力）" */
interface PercentMaxHpDamage {
	type: "percent_max_hp_damage";
	value: VarRef;
	cap_vs_monster?: VarRef;
	per_hit?: boolean; // 玉书天戈符: "每段伤害附加"
}

/** 无极御剑诀. "额外附加V%目标当前气血值的伤害" */
interface PercentCurrentHpDamage {
	type: "percent_current_hp_damage";
	value: VarRef;
	accumulation?: "cross_skill"; // 无极御剑诀
	per_prior_hit?: boolean;
}

/** 惊蜇化龙, 十方真魄, 煞影千幻, 九重天凤诀, 天煞破虚诀. "自身V%已损(失)气血值的伤害" */
interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	value: VarRef;
	self_heal?: boolean; // 十方真魄: "等额恢复自身气血"
	per_hit?: boolean; // 九重天凤诀, 天煞破虚诀
	tick_interval?: number; // 玄煞灵影诀: per-second DoT variant
	every_n_hits?: VarRef; // 星猿之怒 affix
	next_skill_hits?: VarRef; // 天煞破虚诀: affects next skill
	name?: string; // state context
}

/** 皓月剑诀. "湮灭敌方N个护盾，并额外造成V%敌方最大气血值的伤害" */
interface ShieldDestroyDamage {
	type: "shield_destroy_damage";
	shields_per_hit: VarRef;
	percent_max_hp: VarRef;
	cap_vs_monster?: VarRef;
}

/** 皓月剑诀. "对无盾目标造成双倍伤害" */
interface NoShieldDoubleDamage {
	type: "no_shield_double_damage";
	cap_vs_monster?: VarRef;
}

/** 星元化岳. "伤害值为当次伤害的V%" */
interface EchoDamage {
	type: "echo_damage";
	value: VarRef;
	ignore_damage_bonus?: boolean; // "该伤害不受伤害加成影响"
	duration?: VarRef;
}

/** 周天星元. "附加临摹期间所恢复气血值的等额伤害" */
interface HealEchoDamage {
	type: "heal_echo_damage";
	ratio: number; // always 1
}

/** 解体化形. "每具有一个减益状态效果，伤害提升V%" */
interface PerDebuffStackDamage {
	type: "per_debuff_stack_damage";
	value: VarRef;
	max: VarRef;
	per_n_stacks?: number; // 天魔降临咒 inline: per layer
	parent?: string; // state context
}

/** 念剑诀. "每造成N次伤害时，伤害提升V倍" */
interface PeriodicEscalation {
	type: "periodic_escalation";
	hits: VarRef;
	multiplier: VarRef;
	max: VarRef;
}

/** 无相魔劫咒. Delayed state-end damage burst */
interface DelayedBurst {
	type: "delayed_burst";
	name: string; // state name
	duration?: VarRef;
	increase: VarRef; // damage increase during state
	burst_damage: VarRef; // % of accumulated damage
	burst_atk_damage: VarRef; // + % attack power
}

/** 九天真雷诀. "若净化...附加V%自身最大气血值的伤害" */
interface ConditionalDamage {
	type: "conditional_damage";
	value: VarRef;
	damage_base: "self_max_hp";
	per_hit: boolean;
	condition: "cleanse_excess";
}

// ══════════════════════════════════════════════════════════
// §2 Skill Effects — Cost
// ══════════════════════════════════════════════════════════

/** 6 books. "消耗(自身)V%当前气血值" */
interface SelfHpCost {
	type: "self_hp_cost";
	value: VarRef;
	tick_interval?: number; // 玄煞灵影诀: per-second cost
	per_hit?: boolean; // 九重天凤诀: cost per hit
}

// ══════════════════════════════════════════════════════════
// §3 Skill Effects — DoT
// ══════════════════════════════════════════════════════════

/** 大罗幻诀, 梵圣真魔咒. Damage over time */
interface Dot {
	type: "dot";
	tick_interval: VarRef;
	percent_current_hp?: VarRef;
	percent_lost_hp?: VarRef;
	damage_per_tick?: VarRef;
	name?: string; // state context
	duration?: VarRef;
}

// ══════════════════════════════════════════════════════════
// §4 Skill Effects — Healing / Shield
// ══════════════════════════════════════════════════════════

/** 周天星元. "恢复共V%最大气血值" */
interface SelfHeal {
	type: "self_heal";
	value?: VarRef;
	per_tick?: VarRef; // 周天星元 灵鹤: per-second healing
	total?: VarRef;
	tick_interval?: number;
}

/** 煞影千幻. "添加V%最大气血值的护盾" */
interface Shield {
	type: "shield";
	value: VarRef;
	duration?: VarRef;
	source?: "self_max_hp"; // 天书灵盾 affix
	trigger?: "per_tick"; // 天书灵盾 affix
}

// ══════════════════════════════════════════════════════════
// §5 Skill Effects — Buff / Self-buff (context-dependent)
// ══════════════════════════════════════════════════════════

/** Stat buff — produced by stat rules when NOT in affix context.
 * Fields vary: exactly one stat field is set per effect, or multiple via conjunction. */
interface SelfBuff {
	type: "self_buff";
	name?: string; // state context
	attack_bonus?: VarRef;
	damage_increase?: VarRef;
	skill_damage_increase?: VarRef;
	final_damage_bonus?: VarRef;
	damage_reduction?: VarRef;
	crit_rate?: VarRef;
	healing_bonus?: VarRef;
	defense_bonus?: VarRef;
	hp_bonus?: VarRef;
	duration?: VarRef | "permanent";
	max_stacks?: VarRef;
}

// ══════════════════════════════════════════════════════════
// §6 Skill Effects — Debuff
// ══════════════════════════════════════════════════════════

/** 煞影千幻 落星, 天魔降临咒 inline. Named debuff with target field */
interface Debuff {
	type: "debuff";
	name?: string;
	target?: string; // "final_damage_reduction", "damage_taken", "echo_damage", etc.
	value?: VarRef;
	duration?: VarRef;
	ignore_damage_bonus?: boolean;
	sequenced?: boolean; // 新青元剑诀
}

// ══════════════════════════════════════════════════════════
// §7 Skill Effects — Complex / Multi-clause
// ══════════════════════════════════════════════════════════

/** 天轮魔经. "偷取目标N个增益状态" */
interface BuffSteal {
	type: "buff_steal";
	value: VarRef;
}

/** 念剑诀. "N秒内不可被选中" */
interface Untargetable {
	type: "untargetable";
	value: VarRef;
}

/** 大罗幻诀 罗天魔咒. "受到伤害时，各有N%概率对攻击方添加N层..." */
interface CounterDebuff {
	type: "counter_debuff";
	trigger: "on_attacked";
	chance: VarRef;
	count: VarRef;
	name: string;
	states: string[];
	max_stacks?: number;
	per_child_stacks?: boolean;
	duration?: number;
}

/** 天刹真魔 不灭魔体. "受到伤害时，恢复..." */
interface CounterBuff {
	type: "counter_buff";
	trigger?: "on_attacked";
	heal_on_damage_taken?: VarRef;
	no_healing_bonus?: boolean;
	reflect_received_damage?: VarRef; // 疾风九变 极怒
	reflect_percent_lost_hp?: VarRef;
}

/** 春黎剑阵. "创建分身，继承V%属性" */
interface Summon {
	type: "summon";
	value: VarRef; // inherit percentage
	duration?: VarRef;
	trigger?: "on_cast";
	damage_taken_multiplier?: VarRef;
}

/** 通天剑诀. "暴击伤害提高V%" */
interface CritDmgBonus {
	type: "crit_dmg_bonus";
	value: VarRef;
}

/** 通天剑诀. "自身N秒内受到伤害提高V%" */
interface SelfDamageTakenIncrease {
	type: "self_damage_taken_increase";
	duration: VarRef;
	value: VarRef;
}

/** 九天真雷诀. "驱散自身N个负面状态" */
interface SelfCleanse {
	type: "self_cleanse";
	count: VarRef;
}

// ══════════════════════════════════════════════════════════
// §8 Skill Effects — State References
// ══════════════════════════════════════════════════════════

/** "获得/添加/进入/施加 【name】" */
interface StateRef {
	type: "state_ref";
	state: string;
}

/** "为自身/对其 添加N层 【name】" */
interface StateAdd {
	type: "state_add";
	state: string;
	count?: VarRef;
	undispellable?: boolean;
	per_hit?: boolean;
	inherited?: boolean; // conjunction ("与") inheritance
}

// ══════════════════════════════════════════════════════════
// §9 Affix Effects — Common (通用词缀)
// ══════════════════════════════════════════════════════════

interface DebuffStrength { type: "debuff_strength"; value: VarRef }
interface BuffStrength { type: "buff_strength"; value: VarRef }
interface AllStateDuration { type: "all_state_duration"; value: VarRef }
interface ConditionalDamageControlled { type: "conditional_damage_controlled"; value: VarRef }
interface PerHitEscalation { type: "per_hit_escalation"; value?: VarRef; hits?: VarRef; per_hit?: VarRef; max?: VarRef }
interface DamageReductionDuringCast { type: "damage_reduction_during_cast"; value: VarRef }
interface ExecuteConditional { type: "execute_conditional"; hp_threshold: VarRef; damage_increase: VarRef; crit_rate_increase?: VarRef; guaranteed_crit?: number }
interface DotExtraPerTick { type: "dot_extra_per_tick"; value: VarRef }
interface RandomBuff { type: "random_buff"; attack: VarRef }
interface PerSelfLostHp { type: "per_self_lost_hp"; value: VarRef }
interface FlatExtraDamage { type: "flat_extra_damage"; value: VarRef }
interface PerEnemyLostHp { type: "per_enemy_lost_hp"; per_percent: VarRef; value: VarRef }
interface ShieldValueIncrease { type: "shield_value_increase"; value: VarRef }
interface NextSkillBuff { type: "next_skill_buff"; value: VarRef }
interface AttackBonus { type: "attack_bonus"; value: VarRef; per_debuff_stack?: boolean; max_stacks?: VarRef; timing?: "pre_cast" }
interface GuaranteedResonance { type: "guaranteed_resonance"; base_multiplier: VarRef; chance: VarRef; upgraded_multiplier: VarRef }
interface TripleBonus { type: "triple_bonus"; attack_bonus: VarRef; damage_increase: VarRef; crit_damage_increase: VarRef }
interface ProbabilityToCertain { type: "probability_to_certain" }
interface DamageIncrease { type: "damage_increase"; value: VarRef }
interface FinalDmgBonus { type: "final_dmg_bonus"; value: VarRef }
interface HealingIncrease { type: "healing_increase"; value: VarRef }
interface HealingToDamage { type: "healing_to_damage"; value: VarRef }
interface DamageToShield { type: "damage_to_shield"; value: VarRef; duration: VarRef }
interface RandomDebuff { type: "random_debuff"; attack: VarRef; crit_rate: VarRef; crit_damage: VarRef }
interface BuffDuration { type: "buff_duration"; value: VarRef }
interface BuffStackIncrease { type: "buff_stack_increase"; value: VarRef }
interface DebuffStackIncrease { type: "debuff_stack_increase"; value: VarRef }
interface DebuffStackChance { type: "debuff_stack_chance"; value: VarRef }

// ══════════════════════════════════════════════════════════
// §10 Affix Effects — Per-book Primary (主词缀)
// ══════════════════════════════════════════════════════════

interface SummonBuff { type: "summon_buff"; damage_taken: VarRef; damage_dealt: VarRef }
interface ShieldDestroyDot { type: "shield_destroy_dot"; state: string; interval: VarRef; value: VarRef }
interface ExtendedDot { type: "extended_dot"; duration: VarRef; interval: VarRef }
interface DebuffSkillDmg { type: "debuff_skill_dmg"; value: VarRef; duration: VarRef }
interface SelfBuffExtra { type: "self_buff_extra"; state?: string; buff_name?: string }
interface SelfBuffExtend { type: "self_buff_extend"; value: VarRef; state: string }
interface PeriodicCleanse { type: "periodic_cleanse"; chance: VarRef; target: string; cooldown: VarRef; max_times: VarRef }
interface LifestealWithParent { type: "lifesteal_with_parent"; state: string; value: VarRef }
interface ShieldStrength { type: "shield_strength"; value: VarRef }
interface CounterDebuffUpgrade { type: "counter_debuff_upgrade"; state: string; value: VarRef }
interface DotPermanentMaxHp { type: "dot_permanent_max_hp"; state: string; value: VarRef }
interface PerDebuffDamageUpgrade { type: "per_debuff_damage_upgrade"; state: string; value: VarRef }
interface PerStolenBuffDebuff { type: "per_stolen_buff_debuff"; state: string; value: VarRef; duration: VarRef }
interface DelayedBurstIncrease { type: "delayed_burst_increase"; state: string; value: VarRef }
interface PercentMaxHpAffix { type: "percent_max_hp_affix"; value: VarRef }
interface ConditionalHpScaling { type: "conditional_hp_scaling"; hp_threshold: VarRef; per_step: VarRef; value: VarRef }
interface PerBuffStackDamage { type: "per_buff_stack_damage"; per_stack: VarRef; value: VarRef; max: VarRef }

// ══════════════════════════════════════════════════════════
// §11 Affix Effects — Exclusive (专属词缀)
// ══════════════════════════════════════════════════════════

interface Lifesteal { type: "lifesteal"; value: VarRef }
interface OnDispel { type: "on_dispel"; value: VarRef }
interface PeriodicDispel { type: "periodic_dispel"; count?: string | number; interval?: number; duration?: VarRef; damage_percent_of_skill?: VarRef; no_buff_double?: boolean }
interface OnShieldExpire { type: "on_shield_expire"; value: VarRef }
interface OnBuffDebuffShield { type: "on_buff_debuff_shield"; trigger_kind: string; value: VarRef }
interface ProbabilityMultiplier { type: "probability_multiplier"; chance_4x: VarRef; chance_3x: VarRef; chance_2x: VarRef }
interface DotDamageIncrease { type: "dot_damage_increase"; value: VarRef }
interface DotFrequencyIncrease { type: "dot_frequency_increase"; value: VarRef }
interface ConditionalDamageDebuff { type: "conditional_damage_debuff"; value: VarRef }
interface PerDebuffTrueDamage { type: "per_debuff_true_damage"; value: VarRef; max: VarRef }
interface SelfHpFloor { type: "self_hp_floor"; value: VarRef }
interface EnlightenmentBonus { type: "enlightenment_bonus"; value: VarRef }
interface IgnoreDamageReduction { type: "ignore_damage_reduction" }
interface SkillDamageIncreaseAffix { type: "skill_damage_increase_affix"; value: VarRef }
interface MinLostHpThreshold { type: "min_lost_hp_threshold"; min_percent: VarRef; damage_increase: VarRef }
interface CrossSlotDebuff { type: "cross_slot_debuff"; target: string; value: VarRef; duration: VarRef; name: string; trigger: string }
interface HealReduction { type: "heal_reduction"; value: VarRef; enhanced_value?: VarRef; hp_threshold?: VarRef }

// ══════════════════════════════════════════════════════════
// §12 Union type
// ══════════════════════════════════════════════════════════

export type Effect =
	// Damage
	| BaseAttack | PercentMaxHpDamage | PercentCurrentHpDamage | SelfLostHpDamage
	| ShieldDestroyDamage | NoShieldDoubleDamage | EchoDamage | HealEchoDamage
	| PerDebuffStackDamage | PeriodicEscalation | DelayedBurst | ConditionalDamage
	| FlatExtraDamage
	// Cost
	| SelfHpCost
	// DoT
	| Dot
	// Healing / Shield
	| SelfHeal | Shield
	// Buff
	| SelfBuff
	// Debuff
	| Debuff
	// Complex
	| BuffSteal | Untargetable | CounterDebuff | CounterBuff | Summon
	| CritDmgBonus | SelfDamageTakenIncrease | SelfCleanse
	// State
	| StateRef | StateAdd
	// Common affixes
	| DebuffStrength | BuffStrength | AllStateDuration | ConditionalDamageControlled
	| PerHitEscalation | DamageReductionDuringCast | ExecuteConditional
	| DotExtraPerTick | RandomBuff | PerSelfLostHp | PerEnemyLostHp
	| ShieldValueIncrease | NextSkillBuff | AttackBonus | GuaranteedResonance
	| TripleBonus | ProbabilityToCertain | DamageIncrease | FinalDmgBonus
	| HealingIncrease | HealingToDamage | DamageToShield | RandomDebuff
	| BuffDuration | BuffStackIncrease | DebuffStackIncrease | DebuffStackChance
	// Primary affixes
	| SummonBuff | ShieldDestroyDot | ExtendedDot | DebuffSkillDmg
	| SelfBuffExtra | SelfBuffExtend | PeriodicCleanse | LifestealWithParent
	| ShieldStrength | CounterDebuffUpgrade | DotPermanentMaxHp | PerDebuffDamageUpgrade
	| PerStolenBuffDebuff | DelayedBurstIncrease | PercentMaxHpAffix
	| ConditionalHpScaling | PerBuffStackDamage
	// Exclusive affixes
	| Lifesteal | OnDispel | PeriodicDispel | OnShieldExpire | OnBuffDebuffShield
	| ProbabilityMultiplier | DotDamageIncrease | DotFrequencyIncrease
	| ConditionalDamageDebuff | PerDebuffTrueDamage | SelfHpFloor
	| EnlightenmentBonus | IgnoreDamageReduction | SkillDamageIncreaseAffix
	| MinLostHpThreshold | CrossSlotDebuff | HealReduction;
