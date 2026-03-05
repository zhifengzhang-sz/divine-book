/** §13 Special Mechanics — 17 types */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	AttackReductionSchema,
	ConditionalHealBuffSchema,
	CritDamageReductionSchema,
	CritRateReductionSchema,
	DelayedBurstIncreaseSchema,
	DelayedBurstSchema,
	OnBuffDebuffShieldTriggerSchema,
	PerBuffStackDamageSchema,
	PerDebuffStackDamageSchema,
	PerDebuffStackTrueDamageSchema,
	PeriodicCleanseSchema,
	PeriodicDispelSchema,
	RandomBuffSchema,
	RandomDebuffSchema,
	SummonBuffSchema,
	SummonSchema,
	UntargetableStateSchema,
} from "../../schemas/effect.js";

export const SPECIAL_DEFS: EffectTypeDef[] = [
	// §13.1 Summons and Clones
	{
		type: "summon",
		schema: SummonSchema,
		group: "special_mechanics",
		zones: [Zone.D_base],
		scope: Scope.Same,
		patterns: [
			"持续存在{d}秒的分身，继承自身{x}%的属性...分身受到的伤害为自身的{y}%",
		],
		fields: [
			{ name: "inherit_stats", unit: Unit.PctStat },
			{ name: "duration", unit: Unit.Seconds },
			{ name: "damage_taken_multiplier", unit: Unit.PctStat },
		],
	},
	{
		type: "summon_buff",
		schema: SummonBuffSchema,
		group: "special_mechanics",
		zones: [Zone.D_base],
		scope: Scope.Same,
		patterns: [
			"分身受到伤害降低至自身的{x}%，造成的伤害增加{y}%",
		],
		fields: [
			{ name: "damage_taken_reduction_to", unit: Unit.PctStat },
			{ name: "damage_increase", unit: Unit.PctStat },
		],
	},
	// §13.2 Untargetable State
	{
		type: "untargetable_state",
		schema: UntargetableStateSchema,
		group: "special_mechanics",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: ["在{d}秒内不可被选中"],
		fields: [{ name: "duration", unit: Unit.Seconds }],
	},
	// §13.3 Dispel and Crowd Control
	{
		type: "periodic_dispel",
		schema: PeriodicDispelSchema,
		group: "special_mechanics",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: [
			"每秒驱散敌方{n}个增益状态，持续{d}秒...每驱散一个状态(对敌方)造成本神通{x}%的灵法伤害，若无驱散状态(，则)造成双倍伤害",
		],
		fields: [
			{ name: "interval", unit: Unit.Seconds },
			{ name: "duration", unit: Unit.Seconds },
			{ name: "damage_percent_of_skill", unit: Unit.PctStat },
			{ name: "no_buff_double", unit: Unit.Bool },
		],
	},
	{
		type: "periodic_cleanse",
		schema: PeriodicCleanseSchema,
		group: "special_mechanics",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: [
			"每秒有{x}%概率驱散自身所有控制状态，{d}秒内最多触发{n}次",
		],
		fields: [
			{ name: "chance", unit: Unit.Probability },
			{ name: "interval", unit: Unit.Seconds },
			{ name: "cooldown", unit: Unit.Seconds },
			{ name: "max_triggers", unit: Unit.Count },
		],
	},
	// §13.4 Delayed Burst
	{
		type: "delayed_burst",
		schema: DelayedBurstSchema,
		group: "special_mechanics",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: [
			"施加[name]，持续{d}秒。期间敌方受到的神通伤害增加{y}%，(并且)时间结束时，对目标造成{z}%期间提升的伤害+{w}%攻击力的伤害",
		],
		fields: [
			{ name: "duration", unit: Unit.Seconds },
			{ name: "damage_increase_during", unit: Unit.PctStat },
			{ name: "burst_base", unit: Unit.PctAtk },
			{ name: "burst_accumulated_pct", unit: Unit.PctStat },
		],
	},
	{
		type: "delayed_burst_increase",
		schema: DelayedBurstIncreaseSchema,
		group: "special_mechanics",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: ["[name]状态结束时的伤害提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	// §13.5 Random Effects
	{
		type: "random_buff",
		schema: RandomBuffSchema,
		group: "special_mechanics",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: ["获得以下任意1个加成：[效果列表]"],
		fields: [{ name: "options", unit: Unit.Str, optional: true }],
	},
	{
		type: "random_debuff",
		schema: RandomDebuffSchema,
		group: "special_mechanics",
		zones: [Zone.H_red],
		scope: Scope.Same,
		patterns: [
			"对敌方添加以下任意1个减益效果：[效果列表]",
		],
		fields: [{ name: "options", unit: Unit.Str, optional: true }],
	},
	{
		type: "attack_reduction",
		schema: AttackReductionSchema,
		group: "special_mechanics",
		zones: [Zone.H_red],
		scope: Scope.Same,
		patterns: ["攻击降低{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "crit_rate_reduction",
		schema: CritRateReductionSchema,
		group: "special_mechanics",
		zones: [Zone.H_red],
		scope: Scope.Same,
		patterns: ["暴击率降低{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "crit_damage_reduction",
		schema: CritDamageReductionSchema,
		group: "special_mechanics",
		zones: [Zone.H_red],
		scope: Scope.Same,
		patterns: ["暴击伤害降低{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	// §13.6 Stack-Based Damage
	{
		type: "per_buff_stack_damage",
		schema: PerBuffStackDamageSchema,
		group: "special_mechanics",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: [
			"(自身)每{n}层增益状态，提升{x}%伤害，最大提升{m}%",
		],
		fields: [
			{ name: "per_n_stacks", unit: Unit.Count },
			{ name: "value", unit: Unit.PctStat },
			{ name: "max", unit: Unit.PctStat },
		],
	},
	{
		type: "per_debuff_stack_damage",
		schema: PerDebuffStackDamageSchema,
		group: "special_mechanics",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: [
			"(敌方)每(有){n}层减益状态...伤害提升{x}%，最大(提升){m}%",
		],
		fields: [
			{ name: "per_n_stacks", unit: Unit.Count },
			{ name: "value", unit: Unit.PctStat },
			{ name: "max", unit: Unit.PctStat },
			{ name: "dot_half", unit: Unit.Bool, optional: true },
		],
	},
	{
		type: "per_debuff_stack_true_damage",
		schema: PerDebuffStackTrueDamageSchema,
		group: "special_mechanics",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: [
			"目标每有1层减益状态...额外造成目标{x}%最大气血值的真实伤害，最多(造成){m}%最大气血值的真实伤害",
		],
		fields: [
			{ name: "per_stack", unit: Unit.PctMaxHp },
			{ name: "max", unit: Unit.PctMaxHp },
		],
	},
	// §13.7 Other Triggers
	{
		type: "on_buff_debuff_shield_trigger",
		schema: OnBuffDebuffShieldTriggerSchema,
		group: "special_mechanics",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: [
			"每次施加增益/减益状态或添加护盾时，(引动真雷轰击敌方，)造成一次本神通{x}%的灵法伤害",
		],
		fields: [{ name: "damage_percent_of_skill", unit: Unit.PctStat }],
	},
	{
		type: "conditional_heal_buff",
		schema: ConditionalHealBuffSchema,
		group: "special_mechanics",
		zones: [Zone.H_A],
		scope: Scope.Cross,
		patterns: [
			"(命中时，)若敌方具有减益状态，则提升自身{x}%的治疗量，持续{d}秒",
		],
		fields: [
			{ name: "condition", unit: Unit.Str },
			{ name: "value", unit: Unit.PctStat },
			{ name: "duration", unit: Unit.Seconds },
		],
	},
];
