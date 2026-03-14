/** §10 Damage over Time (DoT) — 7 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	DotDamageIncreaseSchema,
	DotExtraPerTickSchema,
	DotFrequencyIncreaseSchema,
	DotSchema,
	ExtendedDotSchema,
	OnDispelSchema,
	ShieldDestroyDotSchema,
} from "../../schemas/effect.js";

export const DOT_DEFS: EffectTypeDef[] = [
	{
		type: "dot",
		schema: DotSchema,
		group: "damage_over_time",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: [
			"每{t}秒(造成/受到){x}%攻击力的伤害，持续{d}秒",
			"每{t}秒额外造成目标{x}%[hp_type]的伤害，持续{d}秒",
		],
		fields: [
			{ name: "tick_interval", unit: Unit.Seconds },
			{ name: "duration", unit: Unit.Seconds },
			{ name: "damage_per_tick", unit: Unit.PctAtk, optional: true },
			{ name: "percent_current_hp", unit: Unit.PctCurrentHp, optional: true },
			{ name: "percent_lost_hp", unit: Unit.PctLostHp, optional: true },
			{ name: "max_stacks", unit: Unit.Count, optional: true },
		],
		exec: {
			trigger: Trigger.PerTick,
			target: ExecTarget.Opponent,
			reads: ["self.atk", "opponent.hp"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "shield_destroy_dot",
		schema: ShieldDestroyDotSchema,
		group: "damage_over_time",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: [
			"每{t}秒对目标造成湮灭护盾的总个数*{x}%攻击力的伤害（若...敌方无护盾加持，则计算湮灭{n}个护盾）",
		],
		fields: [
			{ name: "tick_interval", unit: Unit.Seconds },
			{ name: "per_shield_damage", unit: Unit.PctAtk },
			{ name: "no_shield_assumed", unit: Unit.Count },
		],
		exec: {
			trigger: Trigger.PerTick,
			target: ExecTarget.Opponent,
			reads: ["self.atk", "opponent.shield"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "dot_extra_per_tick",
		schema: DotExtraPerTickSchema,
		group: "damage_over_time",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: [
			"(当)本神通所添加的持续伤害触发时，额外造成目标{x}%已损失气血值的伤害",
		],
		fields: [{ name: "value", unit: Unit.PctLostHp }],
		exec: {
			trigger: Trigger.PerTick,
			target: ExecTarget.Opponent,
			reads: ["opponent.hp"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "dot_damage_increase",
		schema: DotDamageIncreaseSchema,
		group: "damage_over_time",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: ["使本神通添加的持续伤害上升/提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: ["self.damage"],
		},
	},
	{
		type: "dot_frequency_increase",
		schema: DotFrequencyIncreaseSchema,
		group: "damage_over_time",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: ["使本神通添加的持续伤害效果触发间隙缩短{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: ["self.state"],
		},
	},
	{
		type: "extended_dot",
		schema: ExtendedDotSchema,
		group: "damage_over_time",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: [
			"技能结束后...额外持续存在{x}秒，每{t}秒造成一次伤害",
		],
		fields: [
			{ name: "extra_seconds", unit: Unit.Seconds },
			{ name: "tick_interval", unit: Unit.Seconds },
		],
		exec: {
			trigger: Trigger.PerTick,
			target: ExecTarget.Opponent,
			reads: ["self.atk"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "on_dispel",
		schema: OnDispelSchema,
		group: "damage_over_time",
		zones: [Zone.D_ortho],
		scope: Scope.Cross,
		patterns: [
			"若被驱散，立即受到{x}%攻击力的伤害，并眩晕{d}秒",
		],
		fields: [
			{ name: "damage", unit: Unit.PctAtk, optional: true },
			{ name: "stun", unit: Unit.Seconds, optional: true },
		],
		exec: {
			trigger: Trigger.OnEvent,
			target: ExecTarget.Opponent,
			reads: ["self.atk"],
			writes: ["opponent.hp", "opponent.state"],
		},
	},
];
