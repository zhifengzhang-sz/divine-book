/**
 * Chain discovery engine — deterministic combo search.
 *
 * Implements the revised 8-step algorithm from domain.graph.md §IX:
 * 1. Select platform → get target categories provided
 * 2. Filter operators → prune affixes with unsatisfied requires
 * 3-8. Graph search → trace chains through valid combos
 */

import { TargetCategory } from "./enums.js";
import type { AffixBinding } from "./bindings.js";
import { AFFIX_BINDINGS } from "./bindings.js";
import type { Platform } from "./platforms.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChainNode {
	affix: string;
	binding: AffixBinding;
	/** What this affix contributes to the available pool */
	contributedCategories: TargetCategory[];
}

export interface ComboResult {
	platform: Platform;
	/** Valid affixes after binding-based pruning */
	validAffixes: AffixBinding[];
	/** Affixes pruned due to unsatisfied requires */
	prunedAffixes: AffixBinding[];
	/** Available target categories from platform + valid providers */
	availableCategories: Set<TargetCategory>;
}

// ---------------------------------------------------------------------------
// Step 1-2: Platform-first pruning (operator model)
// ---------------------------------------------------------------------------

/**
 * T7 (State) is a superset: any affix providing T2-T6 implicitly provides T7.
 */
const T7_SUBTYPES = new Set([
	TargetCategory.Debuff,
	TargetCategory.Buff,
	TargetCategory.Dot,
	TargetCategory.Shield,
	TargetCategory.Healing,
]);

function expandWithSuperset(categories: Set<TargetCategory>): Set<TargetCategory> {
	const expanded = new Set(categories);
	// If any T2-T6 is present, T7 is implicitly satisfied
	for (const cat of categories) {
		if (T7_SUBTYPES.has(cat)) {
			expanded.add(TargetCategory.State);
			break;
		}
	}
	return expanded;
}

/**
 * Check if an affix's requires are satisfied by available categories.
 *
 * For requires=[T_A, T_B, ...], the logic depends on the affix:
 * - Most affixes: requires ANY ONE of the listed categories (OR)
 * - 九雷真解 specifically requires at least one of T3∨T2∨T5
 */
function isRequireSatisfied(
	requires: TargetCategory[] | "free",
	available: Set<TargetCategory>,
): boolean {
	if (requires === "free") return true;
	// OR semantics: at least one required category must be available
	return requires.some((cat) => available.has(cat));
}

/**
 * Collect all target categories available from a platform plus a set of
 * provider affixes. Includes T7 superset expansion.
 */
function collectAvailable(
	platform: Platform,
	providers: AffixBinding[],
): Set<TargetCategory> {
	const categories = new Set<TargetCategory>(platform.provides);
	for (const binding of providers) {
		for (const cat of binding.provides) {
			categories.add(cat);
		}
	}
	return expandWithSuperset(categories);
}

/**
 * Given a platform, filter all 61 affixes to only those whose requires
 * can be satisfied. Uses iterative expansion: provider affixes may
 * unlock other affixes that were previously pruned.
 */
export function filterByBinding(platform: Platform): ComboResult {
	// Start with platform provides
	let available = collectAvailable(platform, []);
	const allBindings = [...AFFIX_BINDINGS];

	// Iterative expansion: keep adding providers until stable
	let changed = true;
	while (changed) {
		changed = false;
		const newProviders = allBindings.filter(
			(b) =>
				b.provides.length > 0 &&
				isRequireSatisfied(b.requires, available) &&
				b.provides.some((cat) => !available.has(cat)),
		);
		for (const provider of newProviders) {
			for (const cat of provider.provides) {
				if (!available.has(cat)) {
					available.add(cat);
					changed = true;
				}
			}
		}
		available = expandWithSuperset(available);
	}

	// Final partition
	const valid: AffixBinding[] = [];
	const pruned: AffixBinding[] = [];
	for (const binding of allBindings) {
		if (isRequireSatisfied(binding.requires, available)) {
			valid.push(binding);
		} else {
			pruned.push(binding);
		}
	}

	return {
		platform,
		validAffixes: valid,
		prunedAffixes: pruned,
		availableCategories: available,
	};
}

// ---------------------------------------------------------------------------
// Step 3-8: Chain search (graph framework)
// ---------------------------------------------------------------------------

/** Effect type → affix name edges from the graph */
const MODIFIER_EDGES: Record<string, string[]> = {
	// DoT chain: dot → amplifiers
	dot: [
		"古魔之魂", // dot_damage_increase
		"天魔真解", // dot_frequency_increase
		"追神真诀", // dot_extra_per_tick
		"鬼印", // dot_extra_per_tick (weaker)
		"业焰", // all_state_duration
		"真言不灭", // all_state_duration
	],
	// Buff chain: self_buff → amplifiers
	self_buff: [
		"清灵", // buff_strength
		"龙象护身", // buff_strength (5x)
		"仙露护元", // buff_duration
		"真极穿空", // buff_stack_increase + stack→damage
		"业焰", // all_state_duration
		"真言不灭", // all_state_duration
	],
	// Debuff chain: debuff → amplifiers
	debuff: [
		"咒书", // debuff_strength
		"奇能诡道", // debuff_stack_chance
		"心魔惑言", // debuff_stack_increase + stack→damage
		"业焰", // all_state_duration
		"真言不灭", // all_state_duration
	],
	// Shield chain
	damage_to_shield: [
		"灵盾", // shield_strength
		"青云灵盾", // shield_strength (2.5x)
		"玉石俱焚", // on_shield_expire
	],
	// Healing chain
	lifesteal: [
		"长生天则", // healing_increase
		"瑶光却邪", // healing_to_damage
	],
	// HP exploitation chain
	per_self_lost_hp: [
		"破釜沉舟", // self_damage_taken_increase (accelerator)
		"意坠深渊", // min_lost_hp_threshold (floor)
	],
	// Probability chain
	probability_multiplier: [
		"天命有归", // probability_to_certain
	],
};

/** Bridge conversions: from effect type → to effect type */
const BRIDGE_EDGES: Array<{ from: string; to: string; via: string }> = [
	{ from: "damage", to: "healing", via: "lifesteal" },
	{ from: "healing", to: "damage", via: "healing_to_damage" },
	{ from: "damage", to: "shield", via: "damage_to_shield" },
	{ from: "shield", to: "damage", via: "on_shield_expire" },
	{ from: "buff_stacks", to: "damage", via: "per_buff_stack_damage" },
	{ from: "debuff_stacks", to: "damage", via: "per_debuff_stack_damage" },
	{ from: "hp_loss", to: "damage", via: "per_self_lost_hp" },
	{ from: "enemy_hp_loss", to: "damage", via: "per_enemy_lost_hp" },
];

export interface Chain {
	/** Source effect type */
	source: string;
	/** Ordered nodes in the chain */
	nodes: ChainNode[];
	/** Bridge edges traversed */
	bridges: string[];
}

/**
 * Discover chains given a platform and selected affixes.
 * This is a simplified chain enumeration that identifies which
 * modifier chains are active in the build.
 */
export function discoverChains(
	platform: Platform,
	selectedAffixes: AffixBinding[],
): Chain[] {
	const chains: Chain[] = [];
	const selectedNames = new Set(selectedAffixes.map((a) => a.affix));

	// For each modifier chain, check if source + amplifiers exist
	for (const [source, amplifiers] of Object.entries(MODIFIER_EDGES)) {
		const activeAmplifiers = amplifiers.filter((a) => selectedNames.has(a));
		if (activeAmplifiers.length > 0) {
			const nodes: ChainNode[] = activeAmplifiers.map((affix) => {
				const binding = AFFIX_BINDINGS.find((b) => b.affix === affix)!;
				return { affix, binding, contributedCategories: binding.provides };
			});
			chains.push({ source, nodes, bridges: [] });
		}
	}

	// Check bridge paths
	for (const bridge of BRIDGE_EDGES) {
		const bridgeAffixes = selectedAffixes.filter((a) => {
			// Check if this affix provides the bridge effect
			const effectTypes = getEffectTypesForAffix(a.affix);
			return effectTypes.includes(bridge.via);
		});
		if (bridgeAffixes.length > 0) {
			chains.push({
				source: bridge.from,
				nodes: bridgeAffixes.map((a) => ({
					affix: a.affix,
					binding: a,
					contributedCategories: a.provides,
				})),
				bridges: [bridge.via],
			});
		}
	}

	return chains;
}

/** Get effect types for an affix from its binding outputs */
function getEffectTypesForAffix(affix: string): string[] {
	const binding = AFFIX_BINDINGS.find((b) => b.affix === affix);
	return binding?.outputs ?? [];
}
