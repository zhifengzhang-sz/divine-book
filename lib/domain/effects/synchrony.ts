/** §3b Synchrony System (心逐) — 1 type */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import { ProbabilityMultiplierSchema } from "../../schemas/effect.js";

export const SYNCHRONY_DEFS: EffectTypeDef[] = [
	{
		type: "probability_multiplier",
		schema: ProbabilityMultiplierSchema,
		group: "synchrony_system",
		zones: [Zone.M_synchro],
		scope: Scope.Same,
		patterns: [
			"{p1}%概率提升{m1}倍，{p2}%概率提升{m2}倍，{p3}%概率提升{m3}倍",
		],
		fields: [
			{ name: "prob", unit: Unit.Probability },
			{ name: "mult", unit: Unit.Multiplier },
		],
	},
];
