/**
 * Main Skills Parser — Orchestrator
 *
 * Wires all parser layers together:
 * 1. Read 主书.md → MD Table Reader → per-book raw cells
 * 2. For each book: Reactive pipeline (reader → context → handlers) → effects
 * 3. For each book: Primary affix → reactive pipeline → effects
 * 4. (Optional) Read 专属词缀.md → exclusive affix parser → merge into books
 * 5. Emit YAML output
 */

import type { ParsedBook } from "../data/types.js";
import { BOOK_TABLE } from "./book-table.js";
import type { BookData } from "./emit.js";
import { emitBooks, formatYaml } from "./emit.js";
import { parseExclusiveAffix, readExclusiveAffixTable } from "./exclusive.js";
import { readMainSkillTables } from "./md-table.js";
import { runPipeline } from "./pipeline.js";

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
			// Skill effects via reactive pipeline
			const skillResult = runPipeline("skill", entry.skillText, entry.name);

			const parsed: ParsedBook = {
				school: entry.school,
				skill: skillResult.effects,
				skillText: entry.skillText.replace(/<br\s*\/?>/gi, "\n"),
				affixText: entry.affixText.replace(/<br\s*\/?>/gi, "\n"),
			};

			// States from the reactive pipeline
			if (Object.keys(skillResult.states).length > 0) {
				parsed.states = skillResult.states;
			}

			// Primary affix via reactive pipeline
			if (entry.affixText) {
				const affixResult = runPipeline("exclusive", entry.affixText);
				if (affixResult.effects.length > 0) {
					// Extract affix name from 【name】
					const nameMatch = entry.affixText.match(/【(.+?)】/);
					const affixName = nameMatch ? nameMatch[1] : "";
					parsed.primaryAffix = {
						name: affixName,
						effects: affixResult.effects,
					};
				}
			}

			// Validate: must have at least base_attack
			const hasBaseAttack = parsed.skill.some((e) => e.type === "base_attack");
			if (!hasBaseAttack && parsed.skill.length > 0) {
				warnings.push(`${entry.name}: no base_attack found in skill effects`);
			}

			// Collect pipeline diagnostics as warnings
			for (const err of skillResult.errors) {
				warnings.push(`${entry.name}: ${err}`);
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
				parsed.exclusiveAffixText = entry.rawText;
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

	// Skill effects via reactive pipeline
	const skillResult = runPipeline("skill", entry.skillText, entry.name);

	const parsed: ParsedBook = {
		school: entry.school,
		skill: skillResult.effects,
		skillText: entry.skillText.replace(/<br\s*\/?>/gi, "\n"),
		affixText: entry.affixText.replace(/<br\s*\/?>/gi, "\n"),
	};

	if (Object.keys(skillResult.states).length > 0) {
		parsed.states = skillResult.states;
	}

	// Primary affix via reactive pipeline
	if (entry.affixText) {
		const affixResult = runPipeline("exclusive", entry.affixText);
		if (affixResult.effects.length > 0) {
			const nameMatch = entry.affixText.match(/【(.+?)】/);
			const affixName = nameMatch ? nameMatch[1] : "";
			parsed.primaryAffix = {
				name: affixName,
				effects: affixResult.effects,
			};
		}
	}

	// Merge exclusive affix if provided
	if (exclusiveMarkdown) {
		const exclusiveEntries = readExclusiveAffixTable(exclusiveMarkdown);
		const exclusiveEntry = exclusiveEntries.find(
			(e) => e.bookName === bookName,
		);
		if (exclusiveEntry) {
			const states = parsed.states ?? {};
			parsed.exclusiveAffix = parseExclusiveAffix(exclusiveEntry, states);
			parsed.exclusiveAffixText = exclusiveEntry.rawText;
			if (Object.keys(states).length > 0) {
				parsed.states = states;
			}
		}
	}

	return parsed;
}
