/**
 * Function definitions — atomic slot-level purposes.
 *
 * Each function specifies what effect types qualify an affix for that role,
 * which platforms can serve it, and how to score combos.
 *
 * Source: chain.md §D Function Catalog.
 */

import type { AffixBinding } from "./bindings.js";
import { getOffenseZones, findAmplifiers } from "./amplifiers.js";
import { filterByBinding } from "./chains.js";
import type { Platform } from "./platforms.js";
import { PLATFORMS } from "./platforms.js";
import { Zone } from "./enums.js";

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
	/** Platform book names that qualify (empty = any) */
	qualifyingPlatforms: string[];
}

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
		qualifyingPlatforms: [],
	},
	{
		id: "F_dr_remove",
		purpose: "Remove / bypass enemy DR",
		coreEffects: ["cross_slot_debuff", "ignore_damage_reduction"],
		amplifierEffects: ["damage_increase", "all_state_duration"],
		qualifyingPlatforms: [],
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
		qualifyingPlatforms: ["甲元仙符", "十方真魄"],
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
		qualifyingPlatforms: [],
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
		qualifyingPlatforms: [],
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
		qualifyingPlatforms: ["十方真魄"],
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
		qualifyingPlatforms: [],
	},
	{
		id: "F_exploit",
		purpose: "Secondary high-damage source (%maxHP)",
		coreEffects: ["percent_max_hp_damage", "shield_destroy_damage"],
		amplifierEffects: [
			"attack_bonus",
			"damage_increase",
			"final_damage_bonus",
			"guaranteed_resonance",
			"probability_multiplier",
		],
		qualifyingPlatforms: ["千锋聚灵剑", "皓月剑诀"],
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
		qualifyingPlatforms: [],
	},
	{
		id: "F_counter",
		purpose: "Reflect enemy attacks",
		coreEffects: ["counter_buff"],
		amplifierEffects: ["buff_strength", "buff_duration", "all_state_duration"],
		qualifyingPlatforms: ["疾风九变"],
	},
	{
		id: "F_sustain",
		purpose: "Lifesteal / self-healing",
		coreEffects: ["lifesteal", "conditional_heal_buff"],
		amplifierEffects: [
			"healing_increase",
			"healing_to_damage",
		],
		qualifyingPlatforms: [],
	},
	{
		id: "F_dispel",
		purpose: "Strip enemy buffs",
		coreEffects: ["periodic_dispel"],
		amplifierEffects: ["damage_increase", "attack_bonus"],
		qualifyingPlatforms: [],
	},
	{
		id: "F_delayed",
		purpose: "Delayed burst accumulation",
		coreEffects: ["delayed_burst"],
		amplifierEffects: [
			"delayed_burst_increase",
			"all_state_duration",
			"damage_increase",
		],
		qualifyingPlatforms: ["无相魔劫咒"],
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
	const { validAffixes } = filterByBinding(platform);

	// Filter: school-category affixes must match platform school.
	// Exclusive and universal affixes can go on any platform.
	const pool = validAffixes.filter(
		(a) =>
			a.category !== "school" || a.school === platform.school,
	);

	const combos: Combo[] = [];

	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			const op1 = pool[i];
			const op2 = pool[j];

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

			combos.push({
				op1,
				op2,
				op1Role: role1,
				op2Role: role2,
				bothServe: role1 !== "neither" && role2 !== "neither",
				zones: combined,
				zoneCount: combined.size,
				relationship,
			});
		}
	}

	// Sort: both-serve first, then cross-cutting > multiplicative, then zone count
	const relOrder = {
		"cross-cutting": 0,
		multiplicative: 1,
		independent: 2,
		additive: 3,
	};
	combos.sort(
		(a, b) =>
			(a.bothServe === b.bothServe ? 0 : a.bothServe ? -1 : 1) ||
			relOrder[a.relationship] - relOrder[b.relationship] ||
			b.zoneCount - a.zoneCount,
	);

	return combos;
}

/**
 * Get qualifying platforms for a function.
 */
export function getQualifyingPlatforms(fn: FunctionDef): Platform[] {
	if (fn.qualifyingPlatforms.length > 0) {
		return fn.qualifyingPlatforms
			.map((name) => PLATFORMS.find((p) => p.book === name)!)
			.filter(Boolean);
	}
	return PLATFORMS;
}
