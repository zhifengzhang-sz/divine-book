/**
 * Construction constraints — affix pairing rules for 灵书 builds.
 * Extracted from app/simulate.ts sweep logic.
 */

import type { AffixesYaml, BooksYaml } from "../data/store.js";

export interface AffixEntry {
	name: string;
	kind: "universal" | "school" | "exclusive";
	sourceBook?: string;
}

/** Collect all affixes from parsed YAML data with source tracking. */
export function collectAllAffixes(
	booksYaml: BooksYaml,
	affixesYaml: AffixesYaml,
): AffixEntry[] {
	const all: AffixEntry[] = [];
	for (const n of Object.keys(affixesYaml.universal))
		all.push({ name: n, kind: "universal" });
	for (const m of Object.values(affixesYaml.school))
		for (const n of Object.keys(m)) all.push({ name: n, kind: "school" });
	for (const [bookName, book] of Object.entries(booksYaml.books))
		if (book.exclusive_affix)
			all.push({
				name: book.exclusive_affix.name,
				kind: "exclusive",
				sourceBook: bookName,
			});
	return all;
}

/** Is this pair of aux affixes valid for the given main book? */
export function isValidPair(
	mainBook: string,
	a: AffixEntry,
	b: AffixEntry,
): boolean {
	// Rule 1: main book's own exclusive is unavailable (main book is in 主位, not 辅助位)
	if (a.kind === "exclusive" && a.sourceBook === mainBook) return false;
	if (b.kind === "exclusive" && b.sourceBook === mainBook) return false;
	// Rule 2: two exclusives from the same book is impossible (each aux is a different book)
	if (
		a.kind === "exclusive" &&
		b.kind === "exclusive" &&
		a.sourceBook === b.sourceBook
	)
		return false;
	// Rule 3: same affix twice is impossible
	if (a.name === b.name) return false;
	return true;
}
