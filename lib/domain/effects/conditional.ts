/** §4 Conditional Triggers — 4 types */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	ConditionalBuffSchema,
	ConditionalDamageSchema,
	IgnoreDamageReductionSchema,
	ProbabilityToCertainSchema,
} from "../../schemas/effect.js";

export const CONDITIONAL_DEFS: EffectTypeDef[] = [
	{
		type: "conditional_damage",
		schema: ConditionalDamageSchema,
		group: "conditional_triggers",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: [
			"若敌方[condition]，则使本次伤害提升{x}%",
			"攻击带有[state]的敌方时，(会使本次)伤害提升{x}%",
			"伤害提升{x}%，若[condition]，(伤害提升效果)进一步提升至{y}%",
		],
		fields: [
			{ name: "value", unit: Unit.PctStat },
			{ name: "condition", unit: Unit.Str },
			{ name: "escalated_value", unit: Unit.PctStat, optional: true },
		],
	},
	{
		type: "conditional_buff",
		schema: ConditionalBuffSchema,
		group: "conditional_triggers",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: [
			"在神通悟境(的条件下)：本神通附加[stat]的伤害提高{x}%，并(且/使)造成的伤害提升{y}%",
		],
		fields: [
			{ name: "condition", unit: Unit.Str },
			{ name: "damage_increase", unit: Unit.PctStat, optional: true },
			{ name: "percent_max_hp_increase", unit: Unit.PctStat, optional: true },
			{ name: "percent_lost_hp_increase", unit: Unit.PctStat, optional: true },
		],
	},
	{
		type: "probability_to_certain",
		schema: ProbabilityToCertainSchema,
		group: "conditional_triggers",
		zones: [Zone.M_synchro],
		scope: Scope.Same,
		patterns: ["概率触发效果提升为必定触发"],
		fields: [],
	},
	{
		type: "ignore_damage_reduction",
		schema: IgnoreDamageReductionSchema,
		group: "conditional_triggers",
		zones: [Zone.M_final],
		scope: Scope.Same,
		patterns: ["无视敌方所有伤害减免效果"],
		fields: [],
	},
];
