/**
 * Combat Simulator — public API
 *
 * Loads books from the parser and runs combat.
 */

import { readFileSync } from "node:fs";
import { parseMainSkills } from "../parser/index.js";
import type { BookData } from "../parser/emit.js";
import type { CombatConfig, CombatResult } from "./types.js";
import { DEFAULT_COMBAT_CONFIG } from "./types.js";
import { runCombat } from "./arena.js";

/**
 * Load all books from the raw markdown.
 */
export function loadBooks(markdownPath: string): Record<string, BookData> {
	const md = readFileSync(markdownPath, "utf-8");
	const result = parseMainSkills(md);
	if (result.errors.length > 0) {
		console.warn("Parse errors:", result.errors);
	}
	return result.books;
}

/**
 * Run a combat between two named books.
 */
export function simulate(
	books: Record<string, BookData>,
	nameA: string,
	nameB: string,
	config: Partial<CombatConfig> = {},
): CombatResult {
	const bookA = books[nameA];
	const bookB = books[nameB];
	if (!bookA) throw new Error(`Book not found: ${nameA}`);
	if (!bookB) throw new Error(`Book not found: ${nameB}`);

	const fullConfig = { ...DEFAULT_COMBAT_CONFIG, ...config };
	return runCombat(bookA, bookB, nameA, nameB, fullConfig);
}

export { runCombat } from "./arena.js";
export { simulateBook, resolveSlot } from "./simulate.js";
export { Entity } from "./entity.js";
export type { CombatConfig, CombatResult, RoundLog } from "./types.js";
export { DEFAULT_COMBAT_CONFIG } from "./types.js";
