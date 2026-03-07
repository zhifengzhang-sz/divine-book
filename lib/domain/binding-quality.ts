/**
 * Binding quality — measures how well a combo serves the platform.
 *
 * The platform is the primary consumer: its damage chain (气血 + 灵力)
 * consumes operator outputs. BQ measures how much of the operators'
 * potential is actually utilized in the full system context:
 *
 *   System = Platform (skill + primary) + Op1 + Op2
 *
 * Three dimensions:
 *
 * A. **Effect activation**: are all outputs functional? Dead outputs
 *    (e.g., buff_strength without any Buff source) are pure waste.
 *
 * B. **Platform fit**: do the operators amplify the platform's chain?
 *    Outputs that feed the multiplicative chain (M_dmg, M_skill, D_res...)
 *    are consumed by the platform. Only side-provisions with no consumer
 *    are wasted.
 *
 * C. **Zone coverage**: do the operators cover distinct zones?
 *    Two operators both adding M_dmg is additive (low synergy).
 *    One adding M_skill, the other D_res is multiplicative (high synergy).
 */

import { TargetCategory } from "./enums.js";
import type { AffixBinding } from "./bindings.js";
import type { Platform } from "./platforms.js";

const T = TargetCategory;

// ---------------------------------------------------------------------------
// Effect activation requirements
// ---------------------------------------------------------------------------

/**
 * Maps effect types to the target categories they need to be active.
 * If absent, the effect is unconditionally active.
 */
const EFFECT_NEEDS: Record<string, TargetCategory[]> = {
	buff_strength: [T.Buff],
	buff_duration: [T.Buff],
	buff_stack_increase: [T.Buff],
	per_buff_stack_damage: [T.Buff],
	debuff_strength: [T.Debuff],
	debuff_stack_chance: [T.Debuff],
	debuff_stack_increase: [T.Debuff],
	per_debuff_stack_damage: [T.Debuff],
	per_debuff_stack_true_damage: [T.Debuff],
	dot_damage_increase: [T.Dot],
	dot_frequency_increase: [T.Dot],
	dot_extra_per_tick: [T.Dot],
	all_state_duration: [T.State],
	shield_strength: [T.Shield],
	on_shield_expire: [T.Shield],
	healing_increase: [T.Healing],
	healing_to_damage: [T.Healing],
	per_self_lost_hp: [T.LostHp],
	on_dispel: [T.Dot],
	on_buff_debuff_shield_trigger: [T.Buff, T.Debuff, T.Shield],
	conditional_heal_buff: [T.Debuff],
	conditional_buff: [T.Dot],
};

// ---------------------------------------------------------------------------
// Effect → zone mapping (which damage chain zone does this output feed?)
// ---------------------------------------------------------------------------

/**
 * Maps effect types to the damage chain zones they feed.
 * An output that maps to a zone is "consumed by the platform's chain" —
 * it amplifies the platform's damage output. Outputs that don't map to
 * any zone only provide target categories (structural, not factor value).
 */
const EFFECT_ZONE: Record<string, string[]> = {
	// Main chain multipliers
	attack_bonus: ["S_coeff"],
	damage_increase: ["M_dmg"],
	conditional_damage: ["M_dmg"],
	per_hit_escalation: ["M_dmg"],
	per_self_lost_hp: ["M_dmg"],
	per_enemy_lost_hp: ["M_dmg"],
	skill_damage_increase: ["M_skill"],
	final_damage_bonus: ["M_final"],
	crit_damage_bonus: ["M_crit"],
	conditional_crit_rate: ["M_crit"],
	conditional_crit: ["M_crit"],
	ignore_damage_reduction: ["M_dmg"],

	// Resonance line (灵力)
	guaranteed_resonance: ["D_res", "sigma_R"],

	// Synchrony wrapper
	probability_multiplier: ["M_synchro"],
	probability_to_certain: ["M_synchro"],

	// Flat / orthogonal damage
	flat_extra_damage: ["D_flat"],
	dot: ["D_ortho"],
	extended_dot: ["D_ortho"],
	shield_destroy_dot: ["D_ortho"],
	on_dispel: ["D_ortho"],
	per_buff_stack_damage: ["D_ortho"],
	per_debuff_stack_damage: ["D_ortho"],
	per_debuff_stack_true_damage: ["D_ortho"],
	dot_damage_increase: ["D_ortho"],
	dot_frequency_increase: ["D_ortho"],
	dot_extra_per_tick: ["D_ortho"],
	on_shield_expire: ["D_ortho"],
	healing_to_damage: ["D_ortho"],
	enlightenment_bonus: ["M_enlight"],
	on_buff_debuff_shield_trigger: ["D_ortho"],

	// Defensive
	lifesteal: ["H_A"],
	healing_increase: ["H_A"],
	conditional_heal_buff: ["H_A"],
	self_damage_reduction_during_cast: ["DR_A"],
	damage_to_shield: ["S_A"],
	shield_strength: ["S_A"],

	// Anti-heal (offensive utility)
	debuff: ["H_red"],
	debuff_strength: ["H_red"],
	cross_slot_debuff: ["H_red"],
	conditional_debuff: ["H_red"],
	random_debuff: ["H_red"],

	// State duration amplifiers touch the same zones as their targets
	all_state_duration: ["M_state"],

	// Buff amplifiers
	buff_strength: ["M_buff"],
	buff_duration: ["M_buff"],
	buff_stack_increase: ["M_buff"],

	// Self-damage taken (feeds lost_hp chain)
	self_damage_taken_increase: ["DR_A"], // negative: increases damage taken
	min_lost_hp_threshold: ["M_dmg"], // enables per_self_lost_hp scaling
};

// ---------------------------------------------------------------------------
// T7 expansion
// ---------------------------------------------------------------------------

const T7_SUBTYPES = new Set([T.Debuff, T.Buff, T.Dot, T.Shield, T.Healing]);

function expandWithT7(cats: Set<TargetCategory>): Set<TargetCategory> {
	const out = new Set(cats);
	for (const c of cats) {
		if (T7_SUBTYPES.has(c)) { out.add(T.State); break; }
	}
	return out;
}

// ---------------------------------------------------------------------------
// System categories (platform + both operators)
// ---------------------------------------------------------------------------

function systemCategories(
	platform: Platform,
	b1: AffixBinding,
	b2: AffixBinding,
): Set<TargetCategory> {
	return expandWithT7(new Set([
		...platform.provides,
		...b1.provides,
		...b2.provides,
	]));
}

// ---------------------------------------------------------------------------
// Effect activation (same as before)
// ---------------------------------------------------------------------------

function effectUtilization(
	affix: AffixBinding,
	available: Set<TargetCategory>,
): { active: number; total: number; dead: string[] } {
	const dead: string[] = [];
	let active = 0;
	for (const output of affix.outputs) {
		const needs = EFFECT_NEEDS[output];
		if (!needs || needs.some(cat => available.has(cat))) {
			active++;
		} else {
			dead.push(output);
		}
	}
	return { active, total: affix.outputs.length, dead };
}

// ---------------------------------------------------------------------------
// Platform fit: do outputs feed the damage chain?
// ---------------------------------------------------------------------------

/**
 * For each active output of an affix, check whether it feeds
 * a damage chain zone. Outputs that feed a zone are "consumed by
 * the platform" — they amplify the platform's damage output.
 *
 * Outputs that DON'T feed a zone and only provide categories are
 * "structural" — they're consumed only if someone else in the system
 * needs the category they provide.
 *
 * Returns: { chainFed, structural, wasted }
 */
function outputDisposition(
	affix: AffixBinding,
	available: Set<TargetCategory>,
	systemNeeds: Set<TargetCategory>,
): { chainFed: number; structural: number; wasted: number; wastedCats: TargetCategory[] } {
	let chainFed = 0;
	let structural = 0;
	let wasted = 0;
	const wastedCats: TargetCategory[] = [];

	for (const output of affix.outputs) {
		const needs = EFFECT_NEEDS[output];
		const isActive = !needs || needs.some(cat => available.has(cat));
		if (!isActive) continue; // dead output, handled by utilization

		// Does this output feed a damage chain zone?
		const zones = EFFECT_ZONE[output];
		if (zones && zones.length > 0) {
			chainFed++;
			continue;
		}

		// No zone mapping — this output only provides categories.
		// Is the provided category consumed by the system?
		// (Check if any other output in the system needs this category)
		const providedCats = affix.provides.length > 0 ? affix.provides : [];
		// For simplicity: an output that has no zone and no provides is a no-op
		// (shouldn't happen in practice)
		if (providedCats.length > 0) {
			if (providedCats.some(cat => systemNeeds.has(cat))) {
				structural++;
			} else {
				wasted++;
				wastedCats.push(...providedCats.filter(c => !systemNeeds.has(c)));
			}
		} else {
			structural++; // e.g., summon_buff, next_skill_buff — platform-internal
		}
	}

	return { chainFed, structural, wasted, wastedCats };
}

/**
 * Collect what categories the system NEEDS — i.e., what categories
 * are consumed by any output in the system (platform + both operators).
 *
 * An output like buff_strength CONSUMES [Buff]. If the system has
 * buff_strength anywhere, then [Buff] is a system need.
 */
function collectSystemNeeds(
	platform: Platform,
	b1: AffixBinding,
	b2: AffixBinding,
): Set<TargetCategory> {
	const needs = new Set<TargetCategory>();

	// What do the operators' outputs consume?
	for (const output of [...b1.outputs, ...b2.outputs]) {
		const cats = EFFECT_NEEDS[output];
		if (cats) for (const c of cats) needs.add(c);
	}

	// Operators' binding-level requires
	for (const b of [b1, b2]) {
		if (b.requires !== "free") {
			for (const r of b.requires) needs.add(r);
		}
	}

	return expandWithT7(needs);
}

// ---------------------------------------------------------------------------
// Zone coverage: do the two operators cover distinct zones?
// ---------------------------------------------------------------------------

function zoneCoverage(
	b1: AffixBinding,
	b2: AffixBinding,
	available: Set<TargetCategory>,
): { distinct: number; shared: number; total: number } {
	const z1 = new Set<string>();
	const z2 = new Set<string>();

	for (const output of b1.outputs) {
		const needs = EFFECT_NEEDS[output];
		if (needs && !needs.some(c => available.has(c))) continue;
		const zones = EFFECT_ZONE[output];
		if (zones) for (const z of zones) z1.add(z);
	}
	for (const output of b2.outputs) {
		const needs = EFFECT_NEEDS[output];
		if (needs && !needs.some(c => available.has(c))) continue;
		const zones = EFFECT_ZONE[output];
		if (zones) for (const z of zones) z2.add(z);
	}

	const all = new Set([...z1, ...z2]);
	const shared = [...z1].filter(z => z2.has(z)).length;
	return { distinct: all.size, shared, total: z1.size + z2.size };
}

// ---------------------------------------------------------------------------
// Combined binding quality
// ---------------------------------------------------------------------------

export interface BindingQualityResult {
	/** Overall quality score 0-1 */
	quality: number;
	/** Effect activation: fraction of outputs that are active */
	utilization: number;
	/** Platform fit: fraction of active outputs that feed the chain */
	platformFit: number;
	/** Zone coverage: fraction of operator zones that are distinct (not shared) */
	zoneCoverage: number;
	/** Zone breadth: how many distinct zones the combo touches (normalized 0-1) */
	zoneBreadth: number;
	/** Dead outputs (not activated) */
	deadOutputs: string[];
	/** Wasted provisions (provided categories nobody needs) */
	wastedProvisions: TargetCategory[];
	/** Counts */
	activeOutputs: number;
	totalOutputs: number;
	chainFedOutputs: number;
	distinctZones: number;
}

export function computeBindingQuality(
	b1: AffixBinding,
	b2: AffixBinding,
	platform: Platform,
): BindingQualityResult {
	const available = systemCategories(platform, b1, b2);
	const systemNeeds = collectSystemNeeds(platform, b1, b2);

	// A. Effect activation
	const u1 = effectUtilization(b1, available);
	const u2 = effectUtilization(b2, available);
	const totalOutputs = u1.total + u2.total;
	const activeOutputs = u1.active + u2.active;
	const utilization = totalOutputs > 0 ? activeOutputs / totalOutputs : 1;

	// B. Platform fit — do active outputs feed the damage chain?
	const d1 = outputDisposition(b1, available, systemNeeds);
	const d2 = outputDisposition(b2, available, systemNeeds);
	const chainFed = d1.chainFed + d2.chainFed;
	const totalActive = activeOutputs;
	const platformFit = totalActive > 0 ? chainFed / totalActive : 0;

	// C. Zone coverage — distinct vs shared zones
	const zc = zoneCoverage(b1, b2, available);
	const zcScore = zc.total > 0 ? (zc.total - zc.shared) / zc.total : 0;

	// Wasted provisions
	const wastedProvisions = [...new Set([...d1.wastedCats, ...d2.wastedCats])];

	// D. Zone breadth — how many distinct zones does the combo touch?
	// More zones = more multiplicative dimensions = structurally superior.
	// Cap at 5 (practical max for a 2-operator combo).
	const ZONE_BREADTH_CAP = 5;
	const zbScore = Math.min(zc.distinct, ZONE_BREADTH_CAP) / ZONE_BREADTH_CAP;

	// Combined quality:
	// - Utilization is a hard gate (dead outputs are waste)
	// - Platform fit is the main signal (outputs that don't feed the chain are underused)
	// - Zone coverage rewards distinct zones over shared (multiplicative > additive)
	// - Zone breadth rewards touching more zones (more multiplicative dimensions)
	const quality = utilization * (0.4 * platformFit + 0.25 * zcScore + 0.2 * zbScore + 0.15);

	return {
		quality,
		utilization,
		platformFit,
		zoneCoverage: zcScore,
		zoneBreadth: zbScore,
		deadOutputs: [...u1.dead, ...u2.dead],
		wastedProvisions,
		activeOutputs,
		totalOutputs,
		chainFedOutputs: chainFed,
		distinctZones: zc.distinct,
	};
}

/**
 * Check if a specific combo (op1, op2) is valid on this platform.
 */
export function isComboValid(
	b1: AffixBinding,
	b2: AffixBinding,
	platform: Platform,
): boolean {
	const available = systemCategories(platform, b1, b2);
	const req1ok = b1.requires === "free" || b1.requires.some(r => available.has(r));
	const req2ok = b2.requires === "free" || b2.requires.some(r => available.has(r));
	return req1ok && req2ok;
}
