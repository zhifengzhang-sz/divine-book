/** §6 HP-Based Calculations — 7 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	MinLostHpThresholdSchema,
	PerEnemyLostHpSchema,
	PerSelfLostHpSchema,
	PercentCurrentHpDamageSchema,
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
		patterns: ["本神通施放/造成伤害时，自身每多损失1%最大气血值，会使本次伤害提升{x}%"],
		fields: [{ name: "per_percent", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.hp"],
			writes: ["self.damage"],
		},
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["opponent.hp"],
			writes: ["self.damage"],
		},
	},
	{
		type: "min_lost_hp_threshold",
		schema: MinLostHpThresholdSchema,
		group: "hp_based_calculations",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: ["(根据自身已损气血值计算伤害时)至少按已损{x}%计算"],
		fields: [{ name: "value", unit: Unit.PctLostHp }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			reads: ["self.hp"],
			writes: ["self.damage"],
		},
	},
	{
		type: "self_hp_cost",
		schema: SelfHpCostSchema,
		group: "hp_based_calculations",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: ["消耗自身{x}%当前气血值"],
		fields: [{ name: "value", unit: Unit.PctCurrentHp }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["self.hp"],
			writes: ["self.hp"],
		},
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
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			reads: ["self.hp"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "percent_current_hp_damage",
		schema: PercentCurrentHpDamageSchema,
		group: "hp_based_calculations",
		zones: [Zone.D_ortho],
		scope: Scope.Same,
		patterns: ["额外造成目标当前气血值{x}%的伤害"],
		fields: [
			{ name: "value", unit: Unit.PctCurrentHp },
			{ name: "per_prior_hit", unit: Unit.Bool, optional: true },
		],
		exec: {
			trigger: Trigger.PerHit,
			target: ExecTarget.Opponent,
			reads: ["opponent.hp"],
			writes: ["opponent.hp"],
		},
	},
	{
		type: "self_damage_taken_increase",
		schema: SelfDamageTakenIncreaseSchema,
		group: "hp_based_calculations",
		zones: [Zone.DR_A],
		scope: Scope.Same,
		patterns: ["施放期间自身受到的伤害(也)提升/提高{x}%", "释放后自身{d}秒内受到伤害提高{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			writes: ["self.def"],
		},
	},
];
