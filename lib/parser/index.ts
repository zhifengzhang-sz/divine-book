/**
 * Main Skills Parser — Orchestrator
 *
 * Wires all parser layers together:
 * 1. Read 主书.md → MD Table Reader → per-book raw cells
 * 2. For each book: Split Engine (using grammar from lookup table) → effects
 * 3. (Optional) Read 专属词缀.md → exclusive affix parser → merge into books
 * 4. Emit YAML output
 */

import { BOOK_TABLE } from "./book-table.js";
import type { BookData } from "./emit.js";
import { emitBooks, formatYaml } from "./emit.js";
import { parseExclusiveAffix, readExclusiveAffixTable } from "./exclusive.js";
import { readMainSkillTables, splitCell } from "./md-table.js";
import { type ParsedBook, parseBook } from "./split.js";

export interface ParseResult {
	books: Record<string, BookData>;
	warnings: string[];
	/** Books that failed to parse */
	errors: string[];
}

/**
 * Parse all main skills from raw markdown.
 * Optionally merge exclusive affixes from a second markdown source.
 */
export function parseMainSkills(
	markdown: string,
	exclusiveMarkdown?: string,
): ParseResult {
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

			// Attach raw text from source
			parsed.skillText = entry.skillText.replace(/<br\s*\/?>/gi, "\n");
			parsed.affixText = entry.affixText.replace(/<br\s*\/?>/gi, "\n");

			// Validate: must have at least base_attack
			const hasBaseAttack = parsed.skill.some((e) => e.type === "base_attack");
			if (!hasBaseAttack && parsed.skill.length > 0) {
				warnings.push(`${entry.name}: no base_attack found in skill effects`);
			}

			parsedBooks.set(entry.name, parsed);
		} catch (err) {
			errors.push(
				`${entry.name}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	// Merge exclusive affixes if provided
	if (exclusiveMarkdown) {
		const exclusiveEntries = readExclusiveAffixTable(exclusiveMarkdown);
		for (const entry of exclusiveEntries) {
			const parsed = parsedBooks.get(entry.bookName);
			if (!parsed) {
				warnings.push(`Exclusive affix for unknown book: ${entry.bookName}`);
				continue;
			}

			try {
				const states = parsed.states ?? {};
				const exclusive = parseExclusiveAffix(entry, states);
				parsed.exclusiveAffix = exclusive;
				// Update states if new ones were added
				if (Object.keys(states).length > 0) {
					parsed.states = states;
				}
			} catch (err) {
				errors.push(
					`${entry.bookName} exclusive: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}
	}

	const books = emitBooks(parsedBooks);
	return { books, warnings, errors };
}

/**
 * Parse and format as YAML string.
 */
export function parseMainSkillsToYaml(
	markdown: string,
	exclusiveMarkdown?: string,
): {
	yaml: string;
	warnings: string[];
	errors: string[];
} {
	const result = parseMainSkills(markdown, exclusiveMarkdown);
	const yaml = formatYaml(result.books);
	return { yaml, warnings: result.warnings, errors: result.errors };
}

/**
 * Parse a single book by name (for debugging).
 */
export function parseSingleBook(
	markdown: string,
	bookName: string,
	exclusiveMarkdown?: string,
): ParsedBook | null {
	const entries = readMainSkillTables(markdown);
	const entry = entries.find((e) => e.name === bookName);
	if (!entry) return null;

	const meta = BOOK_TABLE[entry.name];
	if (!meta) return null;

	const skillCell = splitCell(entry.skillText);
	const affixCell = splitCell(entry.affixText);

	const parsed = parseBook(
		entry.name,
		entry.school,
		meta.grammar,
		skillCell,
		affixCell,
	);

	// Attach raw text from source
	parsed.skillText = entry.skillText.replace(/<br\s*\/?>/gi, "\n");
	parsed.affixText = entry.affixText.replace(/<br\s*\/?>/gi, "\n");

	// Merge exclusive affix if provided
	if (exclusiveMarkdown) {
		const exclusiveEntries = readExclusiveAffixTable(exclusiveMarkdown);
		const exclusiveEntry = exclusiveEntries.find(
			(e) => e.bookName === bookName,
		);
		if (exclusiveEntry) {
			const states = parsed.states ?? {};
			parsed.exclusiveAffix = parseExclusiveAffix(exclusiveEntry, states);
			if (Object.keys(states).length > 0) {
				parsed.states = states;
			}
		}
	}

	return parsed;
}
