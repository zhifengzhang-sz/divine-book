/** §2 Damage Multiplier Zones — 8 types */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	AttackBonusSchema,
	CritDamageBonusSchema,
	DamageIncreaseSchema,
	EnemySkillDamageReductionSchema,
	FinalDamageBonusSchema,
	FlatExtraDamageSchema,
	SkillDamageIncreaseSchema,
	TechniqueDamageIncreaseSchema,
} from "../../schemas/effect.js";

export const MULTIPLIER_DEFS: EffectTypeDef[] = [
	{
		type: "attack_bonus",
		schema: AttackBonusSchema,
		group: "damage_multiplier_zones",
		zones: [Zone.S_coeff],
		scope: Scope.Same,
		patterns: ["提升{x}%攻击力的效果"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "damage_increase",
		schema: DamageIncreaseSchema,
		group: "damage_multiplier_zones",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: [
			"造成的伤害提升{x}%",
			"伤害提升{x}%",
			"提升{x}%伤害",
		],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "skill_damage_increase",
		schema: SkillDamageIncreaseSchema,
		group: "damage_multiplier_zones",
		zones: [Zone.M_skill],
		scope: Scope.Same,
		patterns: ["提升{x}%神通伤害", "{x}%的神通伤害加深"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "enemy_skill_damage_reduction",
		schema: EnemySkillDamageReductionSchema,
		group: "damage_multiplier_zones",
		zones: [Zone.M_skill],
		scope: Scope.Same,
		patterns: ["目标对本神通提升{x}%神通伤害减免"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "final_damage_bonus",
		schema: FinalDamageBonusSchema,
		group: "damage_multiplier_zones",
		zones: [Zone.M_final],
		scope: Scope.Same,
		patterns: ["最终伤害加深提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "crit_damage_bonus",
		schema: CritDamageBonusSchema,
		group: "damage_multiplier_zones",
		zones: [Zone.M_crit],
		scope: Scope.Same,
		patterns: ["暴击伤害提升{x}%", "致命伤害提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "technique_damage_increase",
		schema: TechniqueDamageIncreaseSchema,
		group: "damage_multiplier_zones",
		zones: [Zone.M_skill],
		scope: Scope.Same,
		patterns: ["{x}%的技能伤害加深"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		notes: "No data instances in normalized.data.md yet",
	},
	{
		type: "flat_extra_damage",
		schema: FlatExtraDamageSchema,
		group: "damage_multiplier_zones",
		zones: [Zone.D_flat],
		scope: Scope.Same,
		patterns: ["(额外)造成{x}%攻击力的伤害"],
		fields: [{ name: "value", unit: Unit.PctAtk }],
	},
];
