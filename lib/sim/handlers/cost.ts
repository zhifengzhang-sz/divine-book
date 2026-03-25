/**
 * HP cost handler: self_hp_cost
 */

import type { SelfHpCost } from "../../parser/schema/玄煞灵影诀.js";
import type { Resolved } from "./types.js";
import { register } from "./registry.js";

// self_hp_cost: { value (percent of current HP), per_hit?, tick_interval?, duration? }
// Reduces own HP. Bypasses DR and shields.
register<Resolved<SelfHpCost>>("self_hp_cost", (effect) => ({
	intents: [
		{
			type: "HP_COST" as const,
			percent: effect.value,
			basis: "current" as const,
		},
	],
}));
