/** §8 Shield System — 4 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	DamageToShieldSchema,
	OnShieldExpireSchema,
	ShieldSchema,
	ShieldStrengthSchema,
} from "../../schemas/effect.js";

export const SHIELD_DEFS: EffectTypeDef[] = [
	{
		type: "shield",
		schema: ShieldSchema,
		group: "shield_system",
		zones: [Zone.S_A],
		scope: Scope.Same,
		patterns: [
			"获得自身最大气血值{x}%的护盾，持续{d}秒",
		],
		fields: [
			{ name: "value", unit: Unit.PctStat },
			{ name: "source", unit: Unit.Str },
			{ name: "duration", unit: Unit.Seconds },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.hp"],
			writes: ["self.shield"],
		},
	},
	{
		type: "shield_strength",
		schema: ShieldStrengthSchema,
		group: "shield_system",
		zones: [Zone.S_A],
		scope: Scope.Same,
		patterns: ["使本神通添加的护盾值提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: ["self.shield"],
		},
	},
	{
		type: "on_shield_expire",
		schema: OnShieldExpireSchema,
		group: "shield_system",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: ["当本神通所添加的护盾消失时，会对敌方额外造成护盾值{x}%的伤害"],
		fields: [{ name: "damage_percent_of_shield", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnEvent,
			target: ExecTarget.Opponent,
			reads: ["self.shield"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "damage_to_shield",
		schema: DamageToShieldSchema,
		group: "shield_system",
		zones: [Zone.S_A],
		scope: Scope.Same,
		patterns: [
			"本神通造成伤害后，(自身会)获得1个本次神通伤害值的{x}%的护盾，护盾持续{d}秒",
		],
		fields: [
			{ name: "value", unit: Unit.PctStat },
			{ name: "duration", unit: Unit.Seconds },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.damage"],
			writes: ["self.shield"],
		},
	},
];
