/**
 * Resonance handler: guaranteed_resonance
 */

import type { GuaranteedResonance } from "../../parser/schema/通用词缀.js";
import type { Resolved } from "./types.js";
import { register } from "./registry.js";

// guaranteed_resonance: { base_multiplier, chance (%), upgraded_multiplier }
// 会心: separate attack line targeting 灵力.
// base_multiplier always applies. With `chance`% probability, upgrades to upgraded_multiplier.
// Example: 通明 — base 1.2×, 25% chance → 1.5×
// Example: 灵犀九重 — base 2.97×, 25% chance → 3.97×
register<Resolved<GuaranteedResonance>>("guaranteed_resonance", (effect, ctx) => {
	const baseMult = effect.base_multiplier;
	const upgradedMult = effect.upgraded_multiplier;
	const chance = effect.chance / 100;

	const mult = ctx.rng.chance(chance) ? upgradedMult : baseMult;

	return {
		spDamage: mult * ctx.atk,
	};
});
