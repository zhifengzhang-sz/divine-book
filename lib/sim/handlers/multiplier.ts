/**
 * Multiplier handlers: probability_multiplier, damage_increase, skill_damage_increase
 */

import { register } from "./registry.js";

// probability_multiplier: { chance_4x, chance_3x, chance_2x }
// 心逐神随: All effects multiplied by 2×/3×/4× with given probabilities.
// chance_Nx is the cumulative chance (e.g., chance_4x=60, chance_3x=80, chance_2x=100).
// Roll once per cast — same multiplier applies to everything.
register("probability_multiplier", (effect, ctx) => {
	const c4 = (effect.chance_4x as number) / 100;
	const c3 = (effect.chance_3x as number) / 100;
	const c2 = (effect.chance_2x as number) / 100;

	// Tiers: 4× with prob c4, 3× with prob (c3-c4), 2× with prob (c2-c3)
	const mult = ctx.rng.weightedPick([
		{ weight: c4, value: 4 },
		{ weight: c3 - c4, value: 3 },
		{ weight: c2 - c3, value: 2 },
		{ weight: 1 - c2, value: 1 },
	]);

	return { zones: { M_synchro: mult } };
});

// damage_increase: { value }
// Additive contribution to the M_dmg zone.
register("damage_increase", (effect) => ({
	zones: { M_dmg: (effect.value as number) / 100 },
}));

// skill_damage_increase: { value }
// Additive contribution to the M_skill zone.
register("skill_damage_increase", (effect) => ({
	zones: { M_skill: (effect.value as number) / 100 },
}));

// attack_bonus: { value }
// ATK scaling zone (S_coeff in combat.md §2.1).
// Cast-scoped: multiplies ATK within the damage chain for this cast.
// NOT a persistent state — it's a zone like M_dmg or M_skill.
register("attack_bonus", (effect) => ({
	zones: { S_coeff: (effect.value as number) / 100 },
}));
