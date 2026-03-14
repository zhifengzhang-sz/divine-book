/**
 * Main Skills Parser — Orchestrator
 *
 * Wires all parser layers together:
 * 1. Read 主书.md → MD Table Reader → per-book raw cells
 * 2. For each book: Split Engine (using grammar from lookup table) → effects
 * 3. Emit YAML output
 */

import { readMainSkillTables, splitCell } from "./md-table.js";
import { BOOK_TABLE } from "./book-table.js";
import { parseBook, type ParsedBook } from "./split.js";
import { emitBooks, formatYaml } from "./emit.js";
import type { BookData } from "./emit.js";

export interface ParseResult {
	books: Record<string, BookData>;
	warnings: string[];
	/** Books that failed to parse */
	errors: string[];
}

/**
 * Parse all main skills from raw markdown.
 */
export function parseMainSkills(markdown: string): ParseResult {
	const entries = readMainSkillTables(markdown);
	const warnings: string[] = [];
	const errors: string[] = [];
	const parsedBooks = new Map<string, ParsedBook>();

	for (const entry of entries) {
		const meta = BOOK_TABLE[entry.name];
		if (!meta) {
			warnings.push(`Unknown book: ${entry.name} (not in lookup table)`);
			continue;
		}

		// Cross-check school
		if (meta.school !== entry.school) {
			warnings.push(
				`School mismatch for ${entry.name}: table says ${entry.school}, lookup says ${meta.school}`,
			);
		}

		try {
			const skillCell = splitCell(entry.skillText);
			const affixCell = splitCell(entry.affixText);

			const parsed = parseBook(
				entry.name,
				entry.school,
				meta.grammar,
				skillCell,
				affixCell,
			);

			// Validate: must have at least base_attack
			const hasBaseAttack = parsed.skill.some(
				(e) => e.type === "base_attack",
			);
			if (!hasBaseAttack && parsed.skill.length > 0) {
				warnings.push(
					`${entry.name}: no base_attack found in skill effects`,
				);
			}

			parsedBooks.set(entry.name, parsed);
		} catch (err) {
			errors.push(
				`${entry.name}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	const books = emitBooks(parsedBooks);
	return { books, warnings, errors };
}

/**
 * Parse and format as YAML string.
 */
export function parseMainSkillsToYaml(markdown: string): {
	yaml: string;
	warnings: string[];
	errors: string[];
} {
	const result = parseMainSkills(markdown);
	const yaml = formatYaml(result.books);
	return { yaml, warnings: result.warnings, errors: result.errors };
}

/**
 * Parse a single book by name (for debugging).
 */
export function parseSingleBook(
	markdown: string,
	bookName: string,
): ParsedBook | null {
	const entries = readMainSkillTables(markdown);
	const entry = entries.find((e) => e.name === bookName);
	if (!entry) return null;

	const meta = BOOK_TABLE[entry.name];
	if (!meta) return null;

	const skillCell = splitCell(entry.skillText);
	const affixCell = splitCell(entry.affixText);

	return parseBook(
		entry.name,
		entry.school,
		meta.grammar,
		skillCell,
		affixCell,
	);
}
