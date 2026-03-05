/**
 * Candidate enumeration: Cₙ category → all affixes with matching effects.
 *
 * Pure library — no side effects. Given parsed effects data and groups
 * taxonomy, enumerates every affix (exclusive, school, universal) that
 * contains at least one effect of a type belonging to the target category.
 * Results are clustered by effect type within the category.
 */

import type { GroupsOutput } from "./parse.groups.js";
import type { EffectRow, ParseOutput } from "./parse.js";
import type { TargetCategory } from "./domain/enums.js";
import { AFFIX_BINDINGS } from "./domain/bindings.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AffixSource {
	/** Affix name (e.g., "心逐神随") */
	affix: string;
	scope: "exclusive" | "school" | "universal";
	/** Book name — exclusive only */
	book?: string;
	/** School name — exclusive and school */
	school?: string;
	/** ALL effects on this affix (not just the matching one) */
	effects: EffectRow[];
}

export interface Cluster {
	/** Effect type name (e.g., "probability_multiplier") */
	type: string;
	candidates: AffixSource[];
}

export interface CategoryCandidates {
	category: number | string;
	label: string;
	clusters: Cluster[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function candidatesByCategory(
	data: ParseOutput,
	groups: GroupsOutput,
	category: number | string,
): CategoryCandidates | null {
	const group = groups.groups.find((g) => g.section === `§${category}`);
	if (!group) return null;

	const targetTypes = new Set(group.types);

	// Collect every affix source that has at least one matching effect
	const sources: { source: AffixSource; types: Set<string> }[] = [];

	// Exclusive affixes (28 books)
	for (const [bookName, book] of Object.entries(data.books)) {
		const affix = book.exclusive_affix;
		if (!affix) continue;
		const matched = affix.effects
			.filter((e) => targetTypes.has(e.type))
			.map((e) => e.type);
		if (matched.length > 0) {
			sources.push({
				source: {
					affix: affix.name,
					scope: "exclusive",
					book: bookName,
					school: book.school,
					effects: affix.effects,
				},
				types: new Set(matched),
			});
		}
	}

	// School affixes (4 schools × ~4 each)
	for (const [school, affixes] of Object.entries(data.school_affixes)) {
		for (const [affixName, effects] of Object.entries(affixes)) {
			const matched = effects
				.filter((e) => targetTypes.has(e.type))
				.map((e) => e.type);
			if (matched.length > 0) {
				sources.push({
					source: {
						affix: affixName,
						scope: "school",
						school,
						effects,
					},
					types: new Set(matched),
				});
			}
		}
	}

	// Universal affixes (16)
	for (const [affixName, effects] of Object.entries(data.universal_affixes)) {
		const matched = effects
			.filter((e) => targetTypes.has(e.type))
			.map((e) => e.type);
		if (matched.length > 0) {
			sources.push({
				source: {
					affix: affixName,
					scope: "universal",
					effects,
				},
				types: new Set(matched),
			});
		}
	}

	// Build clusters: one per effect type, only types that have candidates
	const clusters: Cluster[] = group.types
		.map((type) => ({
			type,
			candidates: sources
				.filter(({ types }) => types.has(type))
				.map(({ source }) => source),
		}))
		.filter((c) => c.candidates.length > 0);

	return { category, label: group.label, clusters };
}

// ---------------------------------------------------------------------------
// Binding-aware filtering
// ---------------------------------------------------------------------------

/**
 * Filter affix sources by binding satisfaction.
 *
 * Given a set of available target categories (from platform + selected affixes),
 * returns only affix sources whose `requires` are satisfied.
 */
export function filterByAvailableCategories(
	candidates: AffixSource[],
	availableCategories: Set<TargetCategory>,
): AffixSource[] {
	return candidates.filter((source) => {
		const binding = AFFIX_BINDINGS.find((b) => b.affix === source.affix);
		if (!binding) return true; // unknown affix, don't prune
		if (binding.requires === "free") return true;
		// OR semantics: at least one required category must be available
		return binding.requires.some((cat) => availableCategories.has(cat));
	});
}
