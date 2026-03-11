/** §1 Base Damage — 3 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	BaseAttackSchema,
	PercentMaxHpDamageSchema,
	ShieldDestroyDamageSchema,
} from "../../schemas/effect.js";

export const BASE_DAMAGE_DEFS: EffectTypeDef[] = [
	{
		type: "base_attack",
		schema: BaseAttackSchema,
		group: "base_damage",
		zones: [Zone.D_base],
		scope: Scope.Same,
		patterns: [
			"{n}段共(计){x}%攻击力的灵法伤害",
			"造成{x}%攻击力的灵法伤害",
		],
		fields: [
			{ name: "hits", unit: Unit.Count, optional: true },
			{ name: "total", unit: Unit.PctAtk, optional: true },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			reads: ["self.atk"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "percent_max_hp_damage",
		schema: PercentMaxHpDamageSchema,
		group: "base_damage",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: [
			"每段攻击造成目标{x}%最大气血值的伤害（对怪物伤害不超过自身{z}%攻击力）",
		],
		fields: [
			{ name: "value", unit: Unit.PctMaxHp },
			{ name: "cap_vs_monster", unit: Unit.PctAtk },
		],
		exec: {
			trigger: Trigger.PerHit,
			target: ExecTarget.Opponent,
			reads: ["opponent.hp"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "shield_destroy_damage",
		schema: ShieldDestroyDamageSchema,
		group: "base_damage",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: [
			"湮灭敌方{n}个护盾，并额外造成{x}%敌方最大气血值的伤害（对怪物最多造成{y}%攻击力的伤害）；对无盾目标造成双倍伤害（对怪物最多造成{z}%攻击力的伤害）",
		],
		fields: [
			{ name: "shields_per_hit", unit: Unit.Count },
			{ name: "percent_max_hp", unit: Unit.PctMaxHp },
			{ name: "cap_vs_monster", unit: Unit.PctAtk },
			{ name: "no_shield_double_cap", unit: Unit.PctAtk },
		],
		exec: {
			trigger: Trigger.PerHit,
			target: ExecTarget.Opponent,
			reads: ["opponent.hp", "opponent.shield"],
			writes: ["opponent.hp", "opponent.shield"],
		},
	},
];
