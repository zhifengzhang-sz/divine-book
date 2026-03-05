/** §3 Resonance System (会心) — 1 type */

import { Scope, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import { GuaranteedResonanceSchema } from "../../schemas/effect.js";

export const RESONANCE_DEFS: EffectTypeDef[] = [
	{
		type: "guaranteed_resonance",
		schema: GuaranteedResonanceSchema,
		group: "resonance_system",
		zones: [Zone.M_res, Zone.sigma_R],
		scope: Scope.Same,
		patterns: [
			"必定会心造成{x}倍伤害，并有{p}%概率将之提升至{y}倍",
		],
		fields: [
			{ name: "base_mult", unit: Unit.Multiplier },
			{ name: "enhanced_mult", unit: Unit.Multiplier },
			{ name: "enhanced_chance", unit: Unit.Probability },
		],
	},
];
