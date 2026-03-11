/** §0 Shared Mechanics (All Schools) — 4 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	CooldownSchema,
	EnlightenmentDamageSchema,
	FusionFlatDamageSchema,
	MasteryExtraDamageSchema,
} from "../../schemas/effect.js";

export const SHARED_DEFS: EffectTypeDef[] = [
	{
		type: "fusion_flat_damage",
		schema: FusionFlatDamageSchema,
		group: "shared_mechanics",
		zones: [Zone.D_flat],
		scope: Scope.Same,
		patterns: ["第{n}重：本神通增加{x}%攻击力的伤害"],
		fields: [
			{ name: "fusion_level", unit: Unit.Count },
			{ name: "value", unit: Unit.PctAtk },
		],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Opponent,
			writes: ["opponent.hp"],
		},
	},
	{
		type: "mastery_extra_damage",
		schema: MasteryExtraDamageSchema,
		group: "shared_mechanics",
		zones: [Zone.D_flat],
		scope: Scope.Same,
		patterns: ["化境（融合{n}重）：本神通对目标额外造成{x}%攻击力的伤害"],
		fields: [
			{ name: "fusion_level", unit: Unit.Count },
			{ name: "value", unit: Unit.PctAtk },
		],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Opponent,
			writes: ["opponent.hp"],
		},
	},
	{
		type: "enlightenment_damage",
		schema: EnlightenmentDamageSchema,
		group: "shared_mechanics",
		zones: [Zone.D_flat],
		scope: Scope.Same,
		patterns: ["每次融合使本神通增加{x}%攻击力的悟境伤害"],
		fields: [{ name: "value", unit: Unit.PctAtk }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Opponent,
			writes: ["opponent.hp"],
		},
	},
	{
		type: "cooldown",
		schema: CooldownSchema,
		group: "shared_mechanics",
		zones: [],
		scope: Scope.Same,
		patterns: ["施法间隙：{x}秒"],
		fields: [{ name: "value", unit: Unit.Seconds }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: [],
		},
	},
];
