/**
 * Multiplier handlers: probability_multiplier, damage_buff, skill_damage_buff,
 * attack_buff, crit_damage_bonus, ignore_damage_reduction, buff_strength,
 * dot_damage_buff, dot_frequency_increase, dot_extra_per_tick,
 * enlightenment_bonus, periodic_escalation
 */

import type { ProbabilityMultiplier } from "../../parser/schema/解体化形.js";
import type {
	DamageBuff,
	IgnoreDamageReduction,
} from "../../parser/schema/通天剑诀.js";
import type {
	BuffStrength,
	AttackBuff,
} from "../../parser/schema/通用词缀.js";
import type { DotDamageBuff } from "../../parser/schema/大罗幻诀.js";
import type { DotFrequencyIncrease } from "../../parser/schema/梵圣真魔咒.js";
import type { DotExtraPerTick } from "../../parser/schema/皓月剑诀.js";
import type { PeriodicEscalation } from "../../parser/schema/念剑诀.js";
import type {
	CritDamageBuff,
	EnlightenmentBonus,
	SkillDamageBuff,
} from "../../parser/schema/effects.js";
import type { Resolved } from "./types.js";
import { register } from "./registry.js";

// probability_multiplier: { chance_4x, chance_3x, chance_2x }
// 心逐神随: All effects multiplied by 2×/3×/4× with given probabilities.
// chance_Nx is the cumulative chance (e.g., chance_4x=60, chance_3x=80, chance_2x=100).
// Roll once per cast — same multiplier applies to everything.
register<Resolved<ProbabilityMultiplier>>("probability_multiplier", (effect, ctx) => {
	const c4 = effect.chance_4x / 100;
	const c3 = effect.chance_3x / 100;
	const c2 = effect.chance_2x / 100;

	// Tiers: 4× with prob c4, 3× with prob (c3-c4), 2× with prob (c2-c3)
	const mult = ctx.rng.weightedPick([
		{ weight: c4, value: 4 },
		{ weight: c3 - c4, value: 3 },
		{ weight: c2 - c3, value: 2 },
		{ weight: 1 - c2, value: 1 },
	]);

	return { zones: { M_synchro: mult } };
});

// damage_buff: { value }
// Additive contribution to the M_dmg zone.
register<Resolved<DamageBuff>>("damage_buff", (effect) => ({
	zones: { M_dmg: effect.value / 100 },
}));

// skill_damage_buff — schema: lib/parser/schema/effects.ts (SkillDamageBuff)
// Additive contribution to the M_skill zone.
register<SkillDamageBuff>("skill_damage_buff", (effect) => ({
	zones: { M_skill: (effect.value as number) / 100 },
}));

// attack_buff: { value }
// ATK scaling zone (S_coeff in combat.md §2.1).
// Cast-scoped: multiplies ATK within the damage chain for this cast.
// NOT a persistent state — it's a zone like M_dmg or M_skill.
register<Resolved<AttackBuff>>("attack_buff", (effect) => ({
	zones: { S_coeff: effect.value / 100 },
}));

// crit_damage_bonus: { value }
// Additive M_dmg zone bonus (crit damage modeled as damage increase).
// Untyped: type string mismatch (schema type is "crit_damage_buff")
register<CritDamageBuff>("crit_damage_buff", (effect) => ({
	zones: { M_dmg: (effect.value as number) / 100 },
}));

// ignore_damage_reduction: {}
// Ignores target's DR. The target's DEF-based DR is bypassed.
// Modeled by adding M_final to compensate for the DR that would
// normally reduce damage. At typical DR (47%), M_final ≈ 0.9 restores
// the full pre-DR damage: damage × (1-0.47) × (1+0.9) ≈ damage × 1.0.
register<Resolved<IgnoreDamageReduction>>("ignore_damage_reduction", () => ({
	zones: { M_final: 0.9 },
}));

// buff_strength: { value }
// Increases buff effectiveness. Modeled as M_dmg zone.
register<Resolved<BuffStrength>>("buff_strength", (effect) => ({
	zones: { M_dmg: effect.value / 100 },
}));

// dot_damage_buff: { value }
// Increases DoT damage. Modeled as M_dmg zone.
register<Resolved<DotDamageBuff>>("dot_damage_buff", (effect) => ({
	zones: { M_dmg: effect.value / 100 },
}));

// dot_frequency_increase: { value }
// Increases DoT tick frequency. Modeled as M_dmg zone (more ticks ≈ more damage).
register<Resolved<DotFrequencyIncrease>>("dot_frequency_increase", (effect) => ({
	zones: { M_dmg: effect.value / 100 },
}));

// dot_extra_per_tick: { value }
// Extra damage per DoT tick. Modeled as flat extra.
register<Resolved<DotExtraPerTick>>("dot_extra_per_tick", (effect, ctx) => ({
	flatExtra: (effect.value / 100) * ctx.atk,
}));

// enlightenment_bonus: { value, damage_buff }
// Bonus based on enlightenment level. Treat as damage increase.
// Untyped: handler reads `damage_buff`, schema (玉书天戈符.EnlightenmentBonus) has `value`
register<EnlightenmentBonus>("enlightenment_bonus", (effect) => ({
	zones: { M_dmg: ((effect.value as number) ?? 0) / 100 },
}));

// periodic_escalation: { every_n_hits, multiplier, max_stacks }
// Damage escalation every N hits. Similar to per_hit_escalation.
register<Resolved<PeriodicEscalation>>("periodic_escalation", (effect) => {
	const everyN = effect.every_n_hits ?? 2;
	const mult = effect.multiplier ?? 1.4;
	const maxStacks = effect.max_stacks ?? 10;
	return {
		perHitEscalation: (hitIndex: number) => {
			const stacks = Math.min(Math.floor(hitIndex / everyN), maxStacks);
			return { M_skill: stacks * (mult - 1) };
		},
	};
});
