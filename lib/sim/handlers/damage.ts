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
// Per-hit %maxHP damage. The source text says "伤害" (damage), not "真实伤害"
// (true damage), so it goes through normal DR + shield resolution.
// The damage VALUE is computed from target's maxHP, but it's resolved as a
// normal HIT — the target applies their own DR and shields.
register("percent_max_hp_damage", (effect, ctx) => {
	const percent = effect.value as number;
	// Compute absolute damage from target's maxHP
	const damagePerHit = (percent / 100) * ctx.targetPlayer.maxHp;
	return {
		perHitEffects: () => [
			{
				type: "HIT" as const,
				hitIndex: -1, // supplementary hit
				damage: damagePerHit,
				spDamage: 0,
			},
		],
	};
});

// flat_extra_damage: { value }
// Flat extra damage added to the damage chain (e.g., 斩岳: 2000% ATK).
register("flat_extra_damage", (effect, ctx) => ({
	flatExtra: ((effect.value as number) / 100) * ctx.atk,
}));
