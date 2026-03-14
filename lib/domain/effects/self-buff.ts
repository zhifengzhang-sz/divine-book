/** §11 Self Buffs — 6 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	CounterBuffSchema,
	EnlightenmentBonusSchema,
	NextSkillBuffSchema,
	SelfBuffExtendSchema,
	SelfBuffExtraSchema,
	SelfBuffSchema,
} from "../../schemas/effect.js";

export const SELF_BUFF_DEFS: EffectTypeDef[] = [
	{
		type: "self_buff",
		schema: SelfBuffSchema,
		group: "self_buffs",
		zones: [Zone.S_coeff, Zone.DR_A],
		scope: Scope.Cross,
		patterns: [
			"获得[name](状态)，提升自身{x}%的[stats]，持续{d}秒",
			"[name]上限{n}层，持续{d}秒",
		],
		fields: [
			{ name: "duration", unit: Unit.Seconds },
			{ name: "max_stacks", unit: Unit.Count, optional: true },
			{ name: "attack_bonus", unit: Unit.PctStat, optional: true },
			{ name: "defense_bonus", unit: Unit.PctStat, optional: true },
			{ name: "hp_bonus", unit: Unit.PctStat, optional: true },
			{ name: "damage_reduction", unit: Unit.PctStat, optional: true },
			{ name: "healing_bonus", unit: Unit.PctStat, optional: true },
			{ name: "damage_increase", unit: Unit.PctStat, optional: true },
			{ name: "final_damage_bonus", unit: Unit.PctStat, optional: true },
			{ name: "skill_damage_increase", unit: Unit.PctStat, optional: true },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			writes: ["self.atk", "self.def", "self.hp", "self.healing", "self.state"],
		},
	},
	{
		type: "self_buff_extend",
		schema: SelfBuffExtendSchema,
		group: "self_buffs",
		zones: [Zone.S_coeff],
		scope: Scope.Cross,
		patterns: ["延长{x}秒[name]持续时间"],
		fields: [
			{ name: "buff_name", unit: Unit.Str },
			{ name: "value", unit: Unit.Seconds },
		],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: ["self.state"],
		},
	},
	{
		type: "self_buff_extra",
		schema: SelfBuffExtraSchema,
		group: "self_buffs",
		zones: [Zone.S_coeff],
		scope: Scope.Cross,
		patterns: ["[name]状态额外使自身获得{x}%[stat]"],
		fields: [
			{ name: "buff_name", unit: Unit.Str, optional: true },
			{ name: "healing_bonus", unit: Unit.PctStat, optional: true },
			{ name: "value", unit: Unit.PctStat, optional: true },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.state"],
			writes: ["self.healing", "self.state"],
		},
	},
	{
		type: "counter_buff",
		schema: CounterBuffSchema,
		group: "self_buffs",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: [
			"每秒对目标反射自身所受到伤害值的{x}%与自身{y}%已损失气血值的伤害，持续{d}秒",
		],
		fields: [
			{ name: "duration", unit: Unit.Seconds },
			{ name: "reflect_received_damage", unit: Unit.PctStat, optional: true },
			{ name: "reflect_percent_lost_hp", unit: Unit.PctLostHp, optional: true },
		],
		exec: {
			trigger: Trigger.OnAttacked,
			target: ExecTarget.Opponent,
			reads: ["self.hp", "self.damage"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "next_skill_buff",
		schema: NextSkillBuffSchema,
		group: "self_buffs",
		zones: [Zone.M_skill],
		scope: Scope.Cross,
		patterns: [
			"本神通施放后，(使)下一个施放的神通(释放时)额外获得{x}%的神通伤害加深",
		],
		fields: [
			{ name: "stat", unit: Unit.Str },
			{ name: "value", unit: Unit.PctStat },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			writes: ["self.damage"],
		},
	},
	{
		type: "enlightenment_bonus",
		schema: EnlightenmentBonusSchema,
		group: "self_buffs",
		zones: [Zone.M_enlight],
		scope: Scope.Cross,
		patterns: ["悟境等级加{x}（最高不超过{m}级）"],
		fields: [
			{ name: "value", unit: Unit.Count },
			{ name: "max", unit: Unit.Count },
		],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: ["self.damage"],
		},
	},
];
