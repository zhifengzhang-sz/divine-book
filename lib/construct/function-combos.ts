/**
 * Function-combo ranking — given a combat function and a platform (main book),
 * enumerate all valid aux-affix pairs, score them by how well they serve
 * the function, and return the top N combos.
 */

import type { AffixesYaml, BooksYaml } from "../data/store.js";
import {
	type AffixEntry,
	collectAllAffixes,
	isValidPair,
} from "./constraints.js";
import {
	FUNCTION_CATALOG,
	type FunctionDef,
	getAuxAffixesForFunction,
} from "./function-catalog.js";

// ── Types ──────────────────────────────────────────────────────────

export interface ComboRank {
	aux1: { name: string; kind: string; sourceBook?: string };
	aux2: { name: string; kind: string; sourceBook?: string };
	score: number;
	functionCoverage: string[]; // which functions this combo serves
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * For a given affix name, return all function IDs it appears in
 * (as either core or amplifier).
 */
function functionsServedBy(affixName: string): string[] {
	const result: string[] = [];
	for (const [fnId, fn] of Object.entries(FUNCTION_CATALOG)) {
		if (fn.coreAux.includes(affixName) || fn.amplifierAux.includes(affixName)) {
			result.push(fnId);
		}
	}
	return result;
}

/**
 * Score an individual affix against a function's core/amplifier lists.
 */
function scoreAffix(
	affixName: string,
	core: string[],
	amplifier: string[],
): number {
	if (core.includes(affixName)) return 2;
	if (amplifier.includes(affixName)) return 1;
	return 0;
}

// ── Main ranking ───────────────────────────────────────────────────

/**
 * Rank all valid aux-affix pairs for a given function + platform.
 *
 * Scoring:
 *   +2 per affix in the function's core list
 *   +1 per affix in the function's amplifier list
 *   +0.5 synergy bonus if both affixes serve the same function
 */
export function rankCombos(
	fnId: string,
	platformId: string,
	booksYaml: BooksYaml,
	affixesYaml: AffixesYaml,
	topN = 10,
): ComboRank[] {
	const { core, amplifier } = getAuxAffixesForFunction(fnId);
	const relevantNames = new Set([...core, ...amplifier]);

	// Collect all affixes and filter to those relevant to this function
	const allAffixes = collectAllAffixes(booksYaml, affixesYaml);
	const relevant = allAffixes.filter((a) => relevantNames.has(a.name));

	// Deduplicate by name (same affix may appear in multiple school categories)
	const seen = new Set<string>();
	const deduped: AffixEntry[] = [];
	for (const a of relevant) {
		if (!seen.has(a.name)) {
			seen.add(a.name);
			deduped.push(a);
		}
	}

	// Enumerate all valid pairs
	const combos: ComboRank[] = [];

	for (let i = 0; i < deduped.length; i++) {
		for (let j = i + 1; j < deduped.length; j++) {
			const a = deduped[i];
			const b = deduped[j];

			if (!isValidPair(platformId, a, b)) continue;

			// Score
			const scoreA = scoreAffix(a.name, core, amplifier);
			const scoreB = scoreAffix(b.name, core, amplifier);
			let total = scoreA + scoreB;

			// Synergy bonus: +0.5 if both affixes serve at least one common function
			const fnsA = functionsServedBy(a.name);
			const fnsB = new Set(functionsServedBy(b.name));
			const shared = fnsA.some((f) => fnsB.has(f));
			if (shared) total += 0.5;

			// Function coverage: union of all functions served by either affix
			const coverageSet = new Set([...fnsA, ...fnsB]);
			const functionCoverage = [...coverageSet].sort();

			combos.push({
				aux1: { name: a.name, kind: a.kind, sourceBook: a.sourceBook },
				aux2: { name: b.name, kind: b.kind, sourceBook: b.sourceBook },
				score: total,
				functionCoverage,
			});
		}
	}

	// Sort descending by score, then alphabetically by aux1 name for stability
	combos.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return a.aux1.name.localeCompare(b.aux1.name);
	});

	return combos.slice(0, topN);
}

// ── Catalog export ─────────────────────────────────────────────────

/** Return the full function catalog for CLI --catalog mode. */
export function listCatalog(): Record<string, FunctionDef> {
	return FUNCTION_CATALOG;
}
