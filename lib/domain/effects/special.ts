/** §13 Special Mechanics — 20 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	AttackReductionSchema,
	BuffStealSchema,
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
	SelfCleanseSchema,
	SelfHpFloorSchema,
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			reads: ["self.atk", "self.hp", "self.def"],
			writes: ["opponent.hp"],
		},
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
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: ["self.state"],
		},
	},
	// §13.2 Buff Steal
	{
		type: "buff_steal",
		schema: BuffStealSchema,
		group: "special_mechanics",
		zones: [Zone.H_red],
		scope: Scope.Same,
		patterns: ["窃取敌方{n}个增益状态"],
		fields: [{ name: "count", unit: Unit.Count }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			reads: ["opponent.state"],
			writes: ["self.state", "opponent.state"],
		},
	},
	// §13.3 Self Cleanse
	{
		type: "self_cleanse",
		schema: SelfCleanseSchema,
		group: "special_mechanics",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: ["驱散自身{n}个减益状态"],
		fields: [{ name: "count", unit: Unit.Count }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.state"],
			writes: ["self.state"],
		},
	},
	// §13.4 HP Floor
	{
		type: "self_hp_floor",
		schema: SelfHpFloorSchema,
		group: "special_mechanics",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: ["气血值不会低于最大气血值的{x}%"],
		fields: [{ name: "value", unit: Unit.PctMaxHp }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			reads: ["self.hp"],
			writes: ["self.hp"],
		},
	},
	// §13.5 Untargetable State
	{
		type: "untargetable_state",
		schema: UntargetableStateSchema,
		group: "special_mechanics",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: ["在{d}秒内不可被选中"],
		fields: [{ name: "duration", unit: Unit.Seconds }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			writes: ["self.state"],
		},
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
			{ name: "count", unit: Unit.Count, optional: true },
			{ name: "interval", unit: Unit.Seconds, optional: true },
			{ name: "duration", unit: Unit.Seconds, optional: true },
			{ name: "damage_percent_of_skill", unit: Unit.PctStat, optional: true },
			{ name: "no_buff_double", unit: Unit.Bool, optional: true },
		],
		exec: {
			trigger: Trigger.PerTick,
			target: ExecTarget.Opponent,
			reads: ["opponent.state", "self.damage"],
			writes: ["opponent.state", "opponent.hp"],
		},
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
		exec: {
			trigger: Trigger.PerTick,
			target: ExecTarget.Self,
			reads: ["self.state"],
			writes: ["self.state"],
		},
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			reads: ["self.atk", "self.damage"],
			writes: ["opponent.hp", "opponent.state"],
		},
	},
	{
		type: "delayed_burst_increase",
		schema: DelayedBurstIncreaseSchema,
		group: "special_mechanics",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: ["[name]状态结束时的伤害提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: ["self.damage"],
		},
	},
	// §13.5 Random Effects
	{
		type: "random_buff",
		schema: RandomBuffSchema,
		group: "special_mechanics",
		zones: [Zone.S_coeff],
		scope: Scope.Same,
		patterns: ["获得以下任意1个加成：[效果列表]"],
		fields: [{ name: "options", unit: Unit.Str, optional: true }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			writes: ["self.atk", "self.crit_damage", "self.damage"],
		},
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			writes: ["opponent.atk", "opponent.crit_rate", "opponent.crit_damage"],
		},
	},
	{
		type: "attack_reduction",
		schema: AttackReductionSchema,
		group: "special_mechanics",
		zones: [Zone.H_red],
		scope: Scope.Same,
		patterns: ["攻击降低{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			writes: ["opponent.atk"],
		},
	},
	{
		type: "crit_rate_reduction",
		schema: CritRateReductionSchema,
		group: "special_mechanics",
		zones: [Zone.H_red],
		scope: Scope.Same,
		patterns: ["暴击率降低{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			writes: ["opponent.crit_rate"],
		},
	},
	{
		type: "crit_damage_reduction",
		schema: CritDamageReductionSchema,
		group: "special_mechanics",
		zones: [Zone.H_red],
		scope: Scope.Same,
		patterns: ["暴击伤害降低{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			writes: ["opponent.crit_damage"],
		},
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.state"],
			writes: ["self.damage"],
		},
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["opponent.state"],
			writes: ["self.damage"],
		},
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			reads: ["opponent.state", "opponent.hp"],
			writes: ["opponent.hp"],
		},
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
		exec: {
			trigger: Trigger.OnEvent,
			target: ExecTarget.Opponent,
			reads: ["self.damage"],
			writes: ["opponent.hp"],
		},
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["opponent.state"],
			writes: ["self.healing"],
		},
	},
];
