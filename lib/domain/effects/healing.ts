/** §7 Healing and Survival — 4 types */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	HealingIncreaseSchema,
	HealingToDamageSchema,
	LifestealSchema,
	SelfDamageReductionDuringCastSchema,
} from "../../schemas/effect.js";

export const HEALING_DEFS: EffectTypeDef[] = [
	{
		type: "lifesteal",
		schema: LifestealSchema,
		group: "healing_and_survival",
		zones: [Zone.H_A],
		scope: Scope.Same,
		patterns: ["{x}%的吸血效果", "恢复...造成伤害{x}%的气血值"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "healing_to_damage",
		schema: HealingToDamageSchema,
		group: "healing_and_survival",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: [
			"造成治疗效果时，会对敌方额外造成治疗量{x}%的伤害",
		],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "healing_increase",
		schema: HealingIncreaseSchema,
		group: "healing_and_survival",
		zones: [Zone.H_A],
		scope: Scope.Same,
		patterns: [
			"(所有)治疗效果提升{x}%",
			"提升自身{x}%的治疗量",
		],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "self_damage_reduction_during_cast",
		schema: SelfDamageReductionDuringCastSchema,
		group: "healing_and_survival",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: ["(会在)施放期间提升自身{x}%的伤害减免"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
];
