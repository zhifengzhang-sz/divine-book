/**
 * Buff handlers: self_buff, damage_reduction_during_cast
 */

import type { StateInstance } from "../types.js";
import { register } from "./registry.js";

// self_buff: { attack_bonus?, defense_bonus?, final_damage_bonus?,
//              skill_damage_increase?, duration, name? }
// Creates a buff state on self with stat modifiers.
register("self_buff", (effect) => {
	const effects: { stat: string; value: number }[] = [];
	const statFields = [
		"attack_bonus",
		"defense_bonus",
		"final_damage_bonus",
		"skill_damage_increase",
		"damage_reduction",
		"crit_rate",
		"healing_bonus",
	];
	for (const stat of statFields) {
		if (typeof effect[stat] === "number") {
			effects.push({ stat, value: effect[stat] as number });
		}
	}

	const state: StateInstance = {
		name: (effect.name as string) ?? "self_buff",
		kind: "buff",
		source: "",
		target: "self",
		effects,
		remainingDuration: (effect.duration as number) ?? 0,
		stacks: 1,
		maxStacks: (effect.max_stacks as number) ?? 1,
		dispellable: true,
	};

	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// damage_reduction_during_cast: { value }
// Temporary DR buff during cast (e.g., 金汤: 10%).
register("damage_reduction_during_cast", (effect) => {
	const state: StateInstance = {
		name: "casting_dr",
		kind: "buff",
		source: "",
		target: "self",
		effects: [{ stat: "damage_reduction", value: effect.value as number }],
		remainingDuration: 0, // lasts for cast duration — managed by cast state
		stacks: 1,
		maxStacks: 1,
		dispellable: false,
	};
	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});
