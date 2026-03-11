/**
 * Function definitions — atomic slot-level purposes.
 *
 * Each function specifies what effect types qualify an affix for that role,
 * which platforms can serve it, and how to score combos.
 *
 * Source: docs/data/chain.md §D Function Catalog.
 */

import type { AffixBinding } from "./bindings.js";
import { AFFIX_BINDINGS } from "./bindings.js";
import { getOffenseZones, findAmplifiers } from "./amplifiers.js";
import { isComboValid } from "./binding-quality.js";
import type { Platform } from "./platforms.js";
import { PLATFORMS } from "./platforms.js";
import { Zone, TargetCategory } from "./enums.js";
import { buildFactorVector, comboDistance } from "../model/model-data.js";
import type { AffixModel } from "../schemas/affix.model.js";

// ---------------------------------------------------------------------------
// Function definition
// ---------------------------------------------------------------------------

export interface FunctionDef {
	id: string;
	purpose: string;
	/** Effect types that make an affix "serve" this function directly */
	coreEffects: string[];
	/** Effect types that amplify the core (same-灵書 amplifiers) */
	amplifierEffects: string[];
	/**
	 * Platform qualification criteria (AND logic).
	 * - TargetCategory values: platform.provides must include this
	 * - Empty array: all platforms qualify (unless requiresPrimaryOverlap)
	 */
	requiresPlatform: TargetCategory[];
	/**
	 * If true, platform must have primaryAffixOutputs overlapping with
	 * this function's coreEffects to qualify.
	 */
	requiresPrimaryOverlap?: boolean;
	/**
	 * Minimum baseline factor values required for platform qualification.
	 * E.g., { D_base: 10000 } means only platforms with baseline D_base >= 10000 qualify.
	 */
	requiresBaseline?: Partial<Record<"D_base" | "S_coeff" | "DR_A", number>>;
	/**
	 * AffixModel factor keys relevant to this function's purpose.
	 * Used by comboDistance to score only the dimensions that matter.
	 * If absent, all dimensions are used (legacy behavior).
	 */
	relevantFactors?: (keyof import("../schemas/affix.model.js").AffixModel)[];
}

// Factor dimension groups for relevantFactors
const OFFENSE = ["D_base", "D_flat", "M_dmg", "M_skill", "M_final", "D_res", "sigma_R", "M_synchro", "D_ortho"] as const;
const DEFENSE = ["DR_A", "S_A"] as const;

export const FUNCTIONS: FunctionDef[] = [
	{
		id: "F_burst",
		purpose: "Maximize single-slot damage output",
		coreEffects: [
			"base_attack",
			"guaranteed_resonance",
			"probability_multiplier",
		],
		amplifierEffects: [
			"attack_bonus",
			"damage_increase",
			"skill_damage_increase",
			"final_damage_bonus",
			"crit_damage_bonus",
			"flat_extra_damage",
			"per_hit_escalation",
			"periodic_escalation",
			"conditional_damage",
			"conditional_buff",
			"conditional_crit",
			"conditional_crit_rate",
			"per_self_lost_hp",
			"per_enemy_lost_hp",
			"ignore_damage_reduction",
			"probability_to_certain",
		],
		requiresPlatform: [],
		requiresBaseline: { D_base: 10000 },
		relevantFactors: [...OFFENSE],
	},
	{
		id: "F_dr_remove",
		purpose: "Remove / bypass enemy DR",
		coreEffects: ["cross_slot_debuff", "ignore_damage_reduction"],
		amplifierEffects: ["damage_increase", "all_state_duration"],
		requiresPlatform: [],
		relevantFactors: ["H_red", "M_dmg", "M_final"],
	},
	{
		id: "F_buff",
		purpose: "Persistent team stat buff",
		coreEffects: ["self_buff", "random_buff"],
		amplifierEffects: [
			"buff_strength",
			"buff_duration",
			"buff_stack_increase",
			"all_state_duration",
			"self_buff_extend",
			"self_buff_extra",
		],
		requiresPlatform: [],
		requiresBaseline: { S_coeff: 1 },
		relevantFactors: ["S_coeff", "M_dmg", "M_skill", "M_final"],
	},
	{
		id: "F_hp_exploit",
		purpose: "Convert own HP loss → damage",
		coreEffects: ["per_self_lost_hp"],
		amplifierEffects: [
			"self_damage_taken_increase",
			"self_hp_cost",
			"min_lost_hp_threshold",
			"damage_increase",
			"attack_bonus",
			"final_damage_bonus",
			"guaranteed_resonance",
		],
		requiresPlatform: [TargetCategory.LostHp],
		relevantFactors: [...OFFENSE],
	},
	{
		id: "F_antiheal",
		purpose: "Suppress enemy healing",
		coreEffects: ["debuff", "conditional_debuff", "random_debuff"],
		amplifierEffects: [
			"debuff_strength",
			"debuff_stack_increase",
			"all_state_duration",
		],
		requiresPlatform: [],
		relevantFactors: ["H_red"],
	},
	{
		id: "F_survive",
		purpose: "CC cleanse + damage reduction",
		coreEffects: [
			"periodic_cleanse",
			"self_damage_reduction_during_cast",
			"untargetable_state",
		],
		amplifierEffects: [],
		requiresPlatform: [],
		relevantFactors: [...DEFENSE],
	},
	{
		id: "F_truedmg",
		purpose: "True damage from debuff stacks",
		coreEffects: ["per_debuff_stack_true_damage"],
		amplifierEffects: [
			"debuff",
			"counter_debuff",
			"debuff_stack_increase",
			"conditional_buff",
		],
		requiresPlatform: [TargetCategory.Debuff],
		relevantFactors: ["D_ortho", "M_dmg", "M_final"],
	},
	{
		id: "F_exploit",
		purpose: "Secondary high-damage source (%maxHP)",
		coreEffects: ["percent_max_hp_damage", "shield_destroy_damage", "shield_destroy_dot"],
		amplifierEffects: [
			"attack_bonus",
			"damage_increase",
			"final_damage_bonus",
			"guaranteed_resonance",
			"probability_multiplier",
		],
		requiresPlatform: [],
		requiresPrimaryOverlap: true,
		relevantFactors: ["D_ortho", ...OFFENSE],
	},
	{
		id: "F_dot",
		purpose: "Sustained DoT damage",
		coreEffects: [
			"dot",
			"extended_dot",
			"shield_destroy_dot",
			"on_dispel",
		],
		amplifierEffects: [
			"dot_damage_increase",
			"dot_frequency_increase",
			"dot_extra_per_tick",
			"all_state_duration",
		],
		requiresPlatform: [TargetCategory.Dot],
		relevantFactors: ["D_base", "D_flat", "M_dmg", "M_final"],
	},
	{
		id: "F_counter",
		purpose: "Reflect enemy attacks",
		coreEffects: ["counter_buff"],
		amplifierEffects: ["buff_strength", "buff_duration", "all_state_duration"],
		requiresPlatform: [],
		requiresPrimaryOverlap: true,
		relevantFactors: [...DEFENSE, "D_ortho", "S_coeff"],
	},
	{
		id: "F_sustain",
		purpose: "Lifesteal / self-healing",
		coreEffects: ["lifesteal", "conditional_heal_buff"],
		amplifierEffects: [
			"healing_increase",
			"healing_to_damage",
		],
		requiresPlatform: [TargetCategory.Healing],
		relevantFactors: ["H_A"],
	},
	{
		id: "F_dispel",
		purpose: "Strip enemy buffs",
		coreEffects: ["periodic_dispel"],
		amplifierEffects: ["damage_increase", "attack_bonus"],
		requiresPlatform: [],
		relevantFactors: [...OFFENSE],
	},
	{
		id: "F_delayed",
		purpose: "Delayed burst accumulation",
		coreEffects: ["delayed_burst", "delayed_burst_increase"],
		amplifierEffects: [
			"all_state_duration",
			"damage_increase",
		],
		requiresPlatform: [],
		requiresPrimaryOverlap: true,
		relevantFactors: ["D_base", "M_dmg", "M_final"],
	},
];

// ---------------------------------------------------------------------------
// Combo enumeration
// ---------------------------------------------------------------------------

export interface Combo {
	op1: AffixBinding;
	op2: AffixBinding;
	/** How op1 serves the function: "core" | "amplifier" | "neither" */
	op1Role: "core" | "amplifier" | "neither";
	op2Role: "core" | "amplifier" | "neither";
	/** Both ops serve the function (core or amplifier) */
	bothServe: boolean;
	/** Distinct offense zones covered by the pair */
	zones: Set<Zone>;
	/** Number of distinct offense zones */
	zoneCount: number;
	/** Zone relationship between the two operators */
	relationship: "multiplicative" | "additive" | "independent" | "cross-cutting";
	/** Combined factor vector (platform + primary + two operators) */
	factors: AffixModel;
	/** Distance from platform baseline across all factor dimensions */
	distance: number;
}

function classifyRole(
	affix: AffixBinding,
	fn: FunctionDef,
): "core" | "amplifier" | "neither" {
	if (affix.outputs.some((o) => fn.coreEffects.includes(o))) return "core";
	if (affix.outputs.some((o) => fn.amplifierEffects.includes(o)))
		return "amplifier";
	return "neither";
}

/**
 * Enumerate all valid (op1, op2) combos for a function on a platform.
 *
 * Rules:
 * 1. Both ops must be in the platform's valid affix pool (requires satisfied)
 * 2. School compatibility (school affixes must match platform school)
 * 3. At least one op must serve the function (core or amplifier)
 * 4. op1 ≠ op2
 *
 * @param strictBoth - If true, require BOTH ops to serve the function.
 *   If false (default), allow one op from another function (cross-function combos).
 */
export function enumerateCombos(
	fn: FunctionDef,
	platform: Platform,
	strictBoth = false,
): Combo[] {
	// Use full affix list — isComboValid() checks per-combo binding validity
	// (platform + both operators' provides). School affixes come from aux
	// book's school, not platform's, so no school filter.
	const pool = AFFIX_BINDINGS;

	const combos: Combo[] = [];

	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			const op1 = pool[i];
			const op2 = pool[j];

			// Per-combo binding check
			if (!isComboValid(op1, op2, platform)) continue;

			const role1 = classifyRole(op1, fn);
			const role2 = classifyRole(op2, fn);

			// At least one must serve the function
			if (role1 === "neither" && role2 === "neither") continue;
			// In strict mode, both must serve
			if (strictBoth && (role1 === "neither" || role2 === "neither"))
				continue;

			// Compute zone coverage
			const zones1 = getOffenseZones(op1.affix);
			const zones2 = getOffenseZones(op2.affix);
			const combined = new Set([...zones1, ...zones2]);

			// Determine relationship
			let relationship: Combo["relationship"];
			if (zones1.size === 0 || zones2.size === 0) {
				relationship = "independent";
			} else {
				const z1Arr = [...zones1];
				const z2Arr = [...zones2];
				const CROSS = new Set([Zone.M_synchro, Zone.M_state, Zone.M_enlight]);
				const hasCross =
					z1Arr.some((z) => CROSS.has(z)) ||
					z2Arr.some((z) => CROSS.has(z));

				if (hasCross) {
					relationship = "cross-cutting";
				} else {
					const allSame =
						z1Arr.every((z) => zones2.has(z)) &&
						z2Arr.every((z) => zones1.has(z));
					relationship = allSame ? "additive" : "multiplicative";
				}
			}

			const factors = buildFactorVector(platform.book, op1.affix, op2.affix);
			const distance = comboDistance(
				platform.book, op1.affix, op2.affix,
				fn.relevantFactors as string[] | undefined,
			);

			combos.push({
				op1,
				op2,
				op1Role: role1,
				op2Role: role2,
				bothServe: role1 !== "neither" && role2 !== "neither",
				zones: combined,
				zoneCount: combined.size,
				relationship,
				factors,
				distance,
			});
		}
	}

	// Sort by distance from platform baseline (all dimensions)
	combos.sort((a, b) => b.distance - a.distance);

	return combos;
}

/**
 * Get qualifying platforms for a function.
 *
 * Qualification checks (AND logic):
 * 1. requiresPlatform: platform.provides must include all listed TargetCategories
 * 2. requiresPrimaryOverlap: platform.primaryAffixOutputs must overlap with fn.coreEffects
 * 3. requiresBaseline: platform.baseline must meet minimum thresholds
 *
 * All empty = all platforms qualify.
 */
export function getQualifyingPlatforms(fn: FunctionDef): Platform[] {
	return PLATFORMS.filter((p) => {
		if (fn.requiresPlatform.length > 0) {
			if (!fn.requiresPlatform.every((cat) => p.provides.includes(cat)))
				return false;
		}
		if (fn.requiresPrimaryOverlap) {
			if (!p.primaryAffixOutputs.some((o) => fn.coreEffects.includes(o)))
				return false;
		}
		if (fn.requiresBaseline) {
			for (const [key, min] of Object.entries(fn.requiresBaseline)) {
				if ((p.baseline[key as keyof typeof p.baseline] ?? 0) < min)
					return false;
			}
		}
		return true;
	});
}

// ---------------------------------------------------------------------------
// Aux affix enumeration — which affixes serve a function in aux position
// ---------------------------------------------------------------------------

export interface AuxAffix {
	affix: string;
	role: "core" | "amplifier";
	/** The matching effect types from this affix */
	matchingEffects: string[];
}

/**
 * Find all affixes that can serve a function in aux position.
 *
 * An affix serves a function if its outputs overlap with the function's
 * coreEffects (role=core) or amplifierEffects (role=amplifier).
 *
 * Exclusive affixes (book-locked) are excluded — they can't be placed
 * in aux position on a different platform.
 */
export function getAuxAffixes(fn: FunctionDef): AuxAffix[] {
	const result: AuxAffix[] = [];

	for (const binding of AFFIX_BINDINGS) {
		// Exclusive affixes are book-locked, not usable as aux on other platforms
		if (binding.category === "exclusive") continue;

		const coreMatches = binding.outputs.filter((o) =>
			fn.coreEffects.includes(o),
		);
		if (coreMatches.length > 0) {
			result.push({
				affix: binding.affix,
				role: "core",
				matchingEffects: coreMatches,
			});
			continue;
		}

		const ampMatches = binding.outputs.filter((o) =>
			fn.amplifierEffects.includes(o),
		);
		if (ampMatches.length > 0) {
			result.push({
				affix: binding.affix,
				role: "amplifier",
				matchingEffects: ampMatches,
			});
		}
	}

	return result;
}
