/** §3c Standard Crit (暴击) — 2 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	ConditionalCritRateSchema,
	ConditionalCritSchema,
} from "../../schemas/effect.js";

export const CRIT_DEFS: EffectTypeDef[] = [
	{
		type: "conditional_crit",
		schema: ConditionalCritSchema,
		group: "standard_crit",
		zones: [Zone.M_crit],
		scope: Scope.Same,
		patterns: ["若敌方[condition]...必定暴击"],
		fields: [{ name: "condition", unit: Unit.Str }],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["opponent.state"],
			writes: ["self.crit_rate"],
		},
	},
	{
		type: "conditional_crit_rate",
		schema: ConditionalCritRateSchema,
		group: "standard_crit",
		zones: [Zone.M_crit],
		scope: Scope.Same,
		patterns: ["暴击率提升{x}%"],
		fields: [
			{ name: "value", unit: Unit.Probability },
			{ name: "condition", unit: Unit.Str },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Self,
			reads: ["opponent.state"],
			writes: ["self.crit_rate"],
		},
	},
];
