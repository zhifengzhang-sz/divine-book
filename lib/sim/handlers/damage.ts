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
// Per-hit %maxHP damage. "造成目标27%最大气血值的伤害" — damage based on
// TARGET's maxHP, goes through DR. Source doesn't know target's state,
// so we emit a PERCENT_MAX_HP_HIT carrying the percentage. The target
// resolves it using their own maxHp.
register("percent_max_hp_damage", (effect, _ctx) => {
	const percent = effect.value as number;
	return {
		perHitEffects: () => [
			{
				type: "PERCENT_MAX_HP_HIT" as const,
				percent,
			},
		],
	};
});

// flat_extra_damage: { value }
// Flat extra damage added to the damage chain (e.g., 斩岳: 2000% ATK).
register("flat_extra_damage", (effect, ctx) => ({
	flatExtra: ((effect.value as number) / 100) * ctx.atk,
}));
