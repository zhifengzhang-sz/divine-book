/**
 * DoT handler: dot
 */

import { register } from "./registry.js";

// dot: { name, duration, tick_interval, damage_per_tick, data_state }
// Creates a periodic damage debuff on the opponent.
// damage_per_tick is in %ATK units (e.g., 550 = 550% ATK).
register("dot", (effect, ctx) => ({
	intents: [
		{
			type: "APPLY_DOT" as const,
			name: (effect.name as string) ?? "dot",
			damagePerTick: ((effect.damage_per_tick as number) / 100) * ctx.atk,
			tickInterval: effect.tick_interval as number,
			duration: effect.duration as number,
			source: "",
		},
	],
}));
