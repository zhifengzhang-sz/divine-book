/**
 * Debuff handler: debuff
 */

import type { StateInstance } from "../types.js";
import { register } from "./registry.js";

// debuff: { target (stat), value, duration, dispellable?, name?, max_stacks? }
// Creates a debuff state on the opponent.
register("debuff", (effect) => {
	const state: StateInstance = {
		name: (effect.name as string) ?? "debuff",
		kind: "debuff",
		source: "",
		target: "opponent",
		effects: [
			{
				stat: effect.target as string,
				value: effect.value as number,
			},
		],
		remainingDuration: (effect.duration as number) ?? 0,
		stacks: 1,
		maxStacks: (effect.max_stacks as number) ?? 1,
		dispellable: (effect.dispellable as boolean) ?? true,
	};

	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});
