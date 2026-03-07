/**
 * Amplification model — zone-aware amplifier discovery.
 *
 * Given an affix, finds all other affixes that amplify its output,
 * categorized by relationship:
 *
 * 1. **Cross-cutting** — multiplies ALL effects on the skill
 *    (probability_multiplier, probability_to_certain)
 * 2. **Multiplicative** — outputs in a different damage formula zone
 *    (e.g., attack_bonus amplifies per_self_lost_hp because S_coeff ≠ M_dmg)
 * 3. **Additive** — outputs in the same zone (diminishing returns)
 * 4. **Input-side** — feeds the target's input resource
 *    (e.g., self_damage_taken_increase feeds per_self_lost_hp's HP loss input)
 *
 * Zone data comes from the EffectTypeDef registry (effects/*.ts).
 * Input-side relationships come from the chain graph (chains.ts MODIFIER_EDGES).
 */

import { Zone } from "./enums.js";
import { registry } from "./registry.js";
import type { AffixBinding } from "./bindings.js";
import { AFFIX_BINDINGS, getBinding } from "./bindings.js";

// ---------------------------------------------------------------------------
// Zone classification
// ---------------------------------------------------------------------------

/** Zones that contribute to the skill's damage formula output */
const OFFENSE_ZONES = new Set([
	Zone.D_base,
	Zone.D_flat,
	Zone.M_dmg,
	Zone.M_skill,
	Zone.M_final,
	Zone.M_crit,
	Zone.M_buff,
	Zone.M_state,
	Zone.M_enlight,
	Zone.S_coeff,
	Zone.D_res,
	Zone.sigma_R,
	Zone.M_synchro,
	Zone.D_ortho,
]);

/** Cross-cutting zones — amplify everything on the skill, not a specific zone */
const CROSS_CUTTING_ZONES = new Set([
	Zone.M_synchro,
	Zone.M_state,
	Zone.M_enlight,
]);

/**
 * Input-side amplifiers: effect types that feed a resource consumed by
 * other effect types. Keyed by the consumer effect type, valued by the
 * feeder effect types.
 *
 * These relationships are structural (one creates a resource, the other
 * reads it) and cannot be derived from zone membership alone.
 */
const INPUT_FEEDERS: Record<string, string[]> = {
	// per_self_lost_hp reads A.hp_pct_lost — anything that increases HP loss feeds it
	per_self_lost_hp: [
		"self_damage_taken_increase", // +50% damage taken → faster HP loss
		"self_hp_cost", // spend own HP → creates HP loss
		"min_lost_hp_threshold", // floor on HP loss calculation
	],
	// per_enemy_lost_hp reads B.hp_pct_lost — anything that damages opponent feeds it
	// (too broad to enumerate — damage is inherent)
	// dot amplifiers need a dot source
	dot_extra_per_tick: ["dot", "shield_destroy_dot", "extended_dot"],
	dot_damage_increase: ["dot", "shield_destroy_dot", "extended_dot"],
	dot_frequency_increase: ["dot", "shield_destroy_dot", "extended_dot"],
	// buff amplifiers need a buff source
	buff_strength: ["self_buff", "random_buff", "counter_buff", "next_skill_buff"],
	buff_duration: ["self_buff", "random_buff", "counter_buff", "next_skill_buff"],
	buff_stack_increase: ["self_buff"],
	// debuff amplifiers need a debuff source
	debuff_strength: [
		"debuff",
		"conditional_debuff",
		"cross_slot_debuff",
		"counter_debuff",
		"random_debuff",
	],
	debuff_stack_increase: [
		"debuff",
		"conditional_debuff",
		"cross_slot_debuff",
		"counter_debuff",
	],
	debuff_stack_chance: [
		"debuff",
		"conditional_debuff",
		"cross_slot_debuff",
		"counter_debuff",
	],
	// shield amplifiers need a shield source
	shield_strength: ["damage_to_shield"],
	on_shield_expire: ["damage_to_shield"],
	// healing amplifiers need a healing source
	healing_increase: ["lifesteal", "conditional_heal_buff"],
	healing_to_damage: ["lifesteal", "conditional_heal_buff"],
	// probability enabler needs probability source
	probability_to_certain: ["probability_multiplier"],
};

// ---------------------------------------------------------------------------
// Zone resolution
// ---------------------------------------------------------------------------

/**
 * Get all offense zones an affix's outputs contribute to.
 * Uses the registry's EffectTypeDef zone annotations.
 */
export function getOffenseZones(affix: string): Set<Zone> {
	const binding = getBinding(affix);
	if (!binding) return new Set();

	const zones = new Set<Zone>();
	for (const output of binding.outputs) {
		const def = registry.getType(output);
		if (def) {
			for (const zone of def.zones) {
				if (OFFENSE_ZONES.has(zone)) {
					zones.add(zone);
				}
			}
		}
	}
	return zones;
}

// ---------------------------------------------------------------------------
// Amplifier discovery
// ---------------------------------------------------------------------------

export interface AmplifierResult {
	/** The target affix being analyzed */
	target: string;
	/** Target's offense zones */
	targetZones: Zone[];
	/** Cross-cutting: multiplies ALL effects on the skill (M_synchro) */
	crossCutting: AffixBinding[];
	/** Outputs in a different offense zone — multiplicative with target */
	multiplicative: AffixBinding[];
	/** Outputs in the same offense zone — additive with target */
	additive: AffixBinding[];
	/** Feeds the target's input resource (structural relationship) */
	inputSide: AffixBinding[];
}

/**
 * Find all affixes that amplify the given affix's output.
 *
 * @param affix - The affix name to find amplifiers for
 * @param candidates - Optional: restrict search to these affixes (default: all 61)
 */
export function findAmplifiers(
	affix: string,
	candidates?: AffixBinding[],
): AmplifierResult {
	const targetZones = getOffenseZones(affix);
	const targetBinding = getBinding(affix);
	const pool = candidates ?? AFFIX_BINDINGS;

	const crossCutting: AffixBinding[] = [];
	const multiplicative: AffixBinding[] = [];
	const additive: AffixBinding[] = [];
	const inputSide: AffixBinding[] = [];

	// Collect input-side effect types for the target's outputs
	const targetInputFeeders = new Set<string>();
	if (targetBinding) {
		for (const output of targetBinding.outputs) {
			const feeders = INPUT_FEEDERS[output];
			if (feeders) {
				for (const f of feeders) targetInputFeeders.add(f);
			}
		}
	}

	for (const candidate of pool) {
		if (candidate.affix === affix) continue;

		const candidateZones = getOffenseZones(candidate.affix);
		if (candidateZones.size === 0) continue;

		// Check if candidate feeds target's inputs
		const feedsInput = candidate.outputs.some((o) =>
			targetInputFeeders.has(o),
		);
		if (feedsInput) {
			inputSide.push(candidate);
			// Don't continue — an affix can be both input-side and zone-based
			// (e.g., 意坠深渊 has min_lost_hp_threshold AND damage_increase)
		}

		// Check if candidate is cross-cutting
		const isCrossCutting = [...candidateZones].some((z) =>
			CROSS_CUTTING_ZONES.has(z),
		);
		if (isCrossCutting) {
			crossCutting.push(candidate);
			continue;
		}

		// Zone relationship: multiplicative (different zone) vs additive (same zone)
		const candidateOffenseZones = [...candidateZones].filter(
			(z) => !CROSS_CUTTING_ZONES.has(z),
		);
		if (candidateOffenseZones.length === 0) continue;

		const hasNewZone = candidateOffenseZones.some((z) => !targetZones.has(z));
		const allSameZone = candidateOffenseZones.every((z) =>
			targetZones.has(z),
		);

		if (hasNewZone) {
			// At least one output in a different zone → multiplicative value
			multiplicative.push(candidate);
		} else if (allSameZone) {
			// All outputs in the same zone → purely additive (diminishing returns)
			additive.push(candidate);
		}
	}

	return {
		target: affix,
		targetZones: [...targetZones],
		crossCutting,
		multiplicative,
		additive,
		inputSide,
	};
}
