/** §9 State Modifiers — 7 types */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	AllStateDurationSchema,
	BuffDurationSchema,
	BuffStackIncreaseSchema,
	BuffStrengthSchema,
	DebuffStackChanceSchema,
	DebuffStackIncreaseSchema,
	DebuffStrengthSchema,
} from "../../schemas/effect.js";

export const STATE_MOD_DEFS: EffectTypeDef[] = [
	{
		type: "buff_strength",
		schema: BuffStrengthSchema,
		group: "state_modifiers",
		zones: [Zone.M_buff],
		scope: Scope.Cross,
		patterns: ["增益效果强度提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "debuff_strength",
		schema: DebuffStrengthSchema,
		group: "state_modifiers",
		zones: [Zone.H_red],
		scope: Scope.Cross,
		patterns: ["减益效果强度提升{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "buff_duration",
		schema: BuffDurationSchema,
		group: "state_modifiers",
		zones: [Zone.M_buff],
		scope: Scope.Cross,
		patterns: ["增益(状态)持续时间延长{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "all_state_duration",
		schema: AllStateDurationSchema,
		group: "state_modifiers",
		zones: [Zone.M_state],
		scope: Scope.Cross,
		patterns: ["所有状态(效果)持续时间延长{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "buff_stack_increase",
		schema: BuffStackIncreaseSchema,
		group: "state_modifiers",
		zones: [Zone.M_buff],
		scope: Scope.Cross,
		patterns: ["增益状态层数增加{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "debuff_stack_increase",
		schema: DebuffStackIncreaseSchema,
		group: "state_modifiers",
		zones: [Zone.H_red],
		scope: Scope.Cross,
		patterns: ["减益状态层数增加{x}%"],
		fields: [{ name: "value", unit: Unit.PctStat }],
	},
	{
		type: "debuff_stack_chance",
		schema: DebuffStackChanceSchema,
		group: "state_modifiers",
		zones: [Zone.H_red],
		scope: Scope.Cross,
		patterns: ["有{x}%概率额外多附加1层该减益状态"],
		fields: [{ name: "value", unit: Unit.Probability }],
	},
];
