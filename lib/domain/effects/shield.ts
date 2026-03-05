/** §8 Shield System — 3 types */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	DamageToShieldSchema,
	OnShieldExpireSchema,
	ShieldStrengthSchema,
} from "../../schemas/effect.js";

export const SHIELD_DEFS: EffectTypeDef[] = [
	{
		type: "shield_strength",
		schema: ShieldStrengthSchema,
		group: "shield_system",
		zones: [Zone.S_A],
		scope: Scope.Same,
		patterns: ["护盾值提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "on_shield_expire",
		schema: OnShieldExpireSchema,
		group: "shield_system",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: ["护盾消失时，会对敌方额外造成护盾值{x}%的伤害"],
		fields: [{ name: "damage_percent_of_shield", unit: Unit.PctStat }],
	},
	{
		type: "damage_to_shield",
		schema: DamageToShieldSchema,
		group: "shield_system",
		zones: [Zone.S_A],
		scope: Scope.Same,
		patterns: [
			"获得1个本次神通伤害值的{x}%的护盾，护盾持续{d}秒",
		],
		fields: [
			{ name: "value", unit: Unit.PctStat },
			{ name: "duration", unit: Unit.Seconds },
		],
	},
];
