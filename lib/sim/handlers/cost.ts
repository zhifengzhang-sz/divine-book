/**
 * HP cost handler: self_hp_cost
 */

import { register } from "./registry.js";

// self_hp_cost: { value (percent of current HP), per_hit?, tick_interval?, duration? }
// Reduces own HP. Bypasses DR and shields.
register("self_hp_cost", (effect) => ({
	intents: [
		{
			type: "HP_COST" as const,
			percent: effect.value as number,
			basis: "current" as const,
		},
	],
}));
