/**
 * DoT handler: dot
 */

import { register } from "./registry.js";

// dot: { name, duration, tick_interval, damage_per_tick, data_state }
// Creates a periodic damage debuff on the opponent.
register("dot", (effect) => ({
	intents: [
		{
			type: "APPLY_DOT" as const,
			name: (effect.name as string) ?? "dot",
			damagePerTick: effect.damage_per_tick as number,
			tickInterval: effect.tick_interval as number,
			duration: effect.duration as number,
			source: "",
		},
	],
}));
