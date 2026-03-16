/**
 * Shield handler: shield_strength
 */

import { register } from "./registry.js";

// shield_strength: { value }
// Increases shield value. The `value` is a percentage of some source.
// In the context of the damage chain, this produces a SHIELD intent.
register("shield_strength", (effect, ctx) => ({
	intents: [
		{
			type: "SHIELD" as const,
			value: ((effect.value as number) / 100) * ctx.atk,
			duration: (effect.duration as number) ?? 0,
		},
	],
}));
