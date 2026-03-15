/**
 * Combat Simulator — public API
 *
 * Loads books from the parser and runs combat.
 */

import { readFileSync } from "node:fs";
import YAML from "yaml";
import type { BookData } from "../parser/emit.js";
import type { CombatConfig, CombatResult } from "./types.js";
import { DEFAULT_COMBAT_CONFIG } from "./types.js";
import { runCombat } from "./arena.js";

/**
 * Load all books from persisted YAML (data/yaml/books.yaml).
 * Regenerate with: bun app/parse-main-skills.ts -o data/yaml/books.yaml
 */
export function loadBooks(yamlPath: string): Record<string, BookData> {
	const raw = readFileSync(yamlPath, "utf-8");
	const parsed = YAML.parse(raw);
	return (parsed.books ?? parsed) as Record<string, BookData>;
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
