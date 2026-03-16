/**
 * Damage handlers: base_attack, percent_max_hp_damage, flat_extra_damage
 */

import { register } from "./registry.js";

// base_attack: { hits, total, data_state }
// Provides the base damage percent and hit count for the damage chain.
register("base_attack", (effect) => ({
	basePercent: effect.total as number,
	hitsOverride: effect.hits as number,
}));

// percent_max_hp_damage: { value, cap_vs_monster?, data_state }
// Per-hit %maxHP damage — bypasses DR and shields. Emitted as HP_DAMAGE per hit.
register("percent_max_hp_damage", (effect, _ctx) => {
	const percent = effect.value as number;
	return {
		perHitEffects: () => [
			{ type: "HP_DAMAGE" as const, percent, basis: "max" as const },
		],
	};
});

// flat_extra_damage: { value }
// Flat extra damage added to the damage chain (e.g., 斩岳: 2000% ATK).
register("flat_extra_damage", (effect, ctx) => ({
	flatExtra: ((effect.value as number) / 100) * ctx.atk,
}));
