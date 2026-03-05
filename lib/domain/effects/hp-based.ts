/** §6 HP-Based Calculations — 6 types */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	MinLostHpThresholdSchema,
	PerEnemyLostHpSchema,
	PerSelfLostHpSchema,
	SelfDamageTakenIncreaseSchema,
	SelfHpCostSchema,
	SelfLostHpDamageSchema,
} from "../../schemas/effect.js";

export const HP_BASED_DEFS: EffectTypeDef[] = [
	{
		type: "per_self_lost_hp",
		schema: PerSelfLostHpSchema,
		group: "hp_based_calculations",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: ["自身每多损失1%最大气血值，会使本次伤害提升{x}%"],
		fields: [{ name: "per_percent", unit: Unit.PctStat }],
	},
	{
		type: "per_enemy_lost_hp",
		schema: PerEnemyLostHpSchema,
		group: "hp_based_calculations",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: [
			"敌方每多损失1%最大(值)气血值，会使本次伤害提升{x}%",
		],
		fields: [{ name: "per_percent", unit: Unit.PctStat }],
	},
	{
		type: "min_lost_hp_threshold",
		schema: MinLostHpThresholdSchema,
		group: "hp_based_calculations",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: ["(根据自身已损气血值计算伤害时)至少按已损{x}%计算"],
		fields: [{ name: "value", unit: Unit.PctLostHp }],
	},
	{
		type: "self_hp_cost",
		schema: SelfHpCostSchema,
		group: "hp_based_calculations",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: ["消耗自身{x}%当前气血值"],
		fields: [{ name: "value", unit: Unit.PctCurrentHp }],
	},
	{
		type: "self_lost_hp_damage",
		schema: SelfLostHpDamageSchema,
		group: "hp_based_calculations",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: ["额外对其造成自身{x}%已损失气血值的伤害"],
		fields: [
			{ name: "value", unit: Unit.PctLostHp },
			{ name: "on_last_hit", unit: Unit.Bool, optional: true },
			{ name: "heal_equal", unit: Unit.Bool, optional: true },
		],
	},
	{
		type: "self_damage_taken_increase",
		schema: SelfDamageTakenIncreaseSchema,
		group: "hp_based_calculations",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: ["施放期间自身受到的伤害(也)提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
];
