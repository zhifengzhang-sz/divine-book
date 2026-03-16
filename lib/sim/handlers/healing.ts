/**
 * Healing handler: lifesteal
 */

import { register } from "./registry.js";

// lifesteal: { value (percent), parent? }
// Heals for `value`% of damage dealt. The actual damage is not known
// at handler time — the LIFESTEAL intent carries the percentage, and
// the player resolves it after damage is dealt.
register("lifesteal", (effect) => ({
	intents: [
		{
			type: "LIFESTEAL" as const,
			percent: effect.value as number,
			damageDealt: 0, // filled in at resolution time
		},
	],
}));
