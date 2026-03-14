/** §7 Healing and Survival — 5 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	HealingIncreaseSchema,
	HealingToDamageSchema,
	LifestealSchema,
	SelfDamageReductionDuringCastSchema,
	SelfHealSchema,
} from "../../schemas/effect.js";

export const HEALING_DEFS: EffectTypeDef[] = [
	{
		type: "self_heal",
		schema: SelfHealSchema,
		group: "healing_and_survival",
		zones: [Zone.H_A],
		scope: Scope.Same,
		patterns: [
			"恢复自身{x}%最大气血值",
			"持续{d}秒，期间恢复...气血",
		],
		fields: [
			{ name: "value", unit: Unit.PctMaxHp },
			{ name: "duration", unit: Unit.Seconds, optional: true },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.hp"],
			writes: ["self.hp"],
		},
	},
	{
		type: "lifesteal",
		schema: LifestealSchema,
		group: "healing_and_survival",
		zones: [Zone.H_A],
		scope: Scope.Same,
		patterns: ["本神通造成伤害时，会使本次神通获得{x}%的吸血效果", "恢复...造成伤害{x}%的气血值"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.damage"],
			writes: ["self.hp"],
		},
	},
	{
		type: "healing_to_damage",
		schema: HealingToDamageSchema,
		group: "healing_and_survival",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: [
			"当本神通造成治疗效果时，会对敌方额外造成治疗量{x}%的伤害",
		],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnEvent,
			target: ExecTarget.Opponent,
			reads: ["self.healing"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "healing_increase",
		schema: HealingIncreaseSchema,
		group: "healing_and_survival",
		zones: [Zone.H_A],
		scope: Scope.Same,
		patterns: [
			"使本神通的(所有)治疗效果提升{x}%",
			"提升自身{x}%的治疗量",
		],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			writes: ["self.healing"],
		},
	},
	{
		type: "self_damage_reduction_during_cast",
		schema: SelfDamageReductionDuringCastSchema,
		group: "healing_and_survival",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: ["本神通施放时，(会在)施放期间提升自身{x}%的伤害减免"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			writes: ["self.def"],
		},
	},
];
