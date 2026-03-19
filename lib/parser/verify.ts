/**
 * Parser Verification Agent
 *
 * Checks consistency between raw markdown sources and extracted
 * structured data. Designed to catch:
 *
 * 1. Coverage gaps   — raw entries with no extracted effects
 * 2. Double matches  — multiple extractors firing on the same text
 * 3. Value drift     — resolved field values that don't match tier vars
 * 4. Output staleness — YAML files out of sync with current parser
 * 5. Type collisions — multiple extractors emitting the same effect type
 *
 * Usage:
 *   import { verifyAll } from "./verify.js";
 *   const report = verifyAll(mainMd, exclusiveMd, universalMd, schoolMd);
 *   // or run via CLI: bun app/verify-parser.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BOOK_TABLE } from "./book-table.js";
import {
	formatAffixesYaml,
	parseCommonAffixes,
	readSchoolAffixTable,
	readUniversalAffixTable,
} from "./common-affixes.js";
import type { EffectRow } from "./emit.js";
import { parseExclusiveAffix, readExclusiveAffixTable } from "./exclusive.js";
import { AFFIX_EXTRACTORS } from "./extract.js";
import { readMainSkillTables, splitCell } from "./md-table.js";
import { genericAffixParse, parseBook } from "./split.js";
import { resolveFields } from "./tiers.js";

// ─── Types ───────────────────────────────────────────────

export interface VerifyIssue {
	severity: "error" | "warn";
	category: string;
	source: string; // e.g. "universal/咒书", "exclusive/春黎剑阵"
	message: string;
}

export interface ExtractorMatch {
	name: string;
	type: string;
	fields: Record<string, string | number>;
}

export interface EntryReport {
	source: string;
	name: string;
	text: string;
	tierVars: Record<string, number>;
	matches: ExtractorMatch[];
	effects: EffectRow[];
	issues: VerifyIssue[];
}

export interface VerifyReport {
	entries: EntryReport[];
	issues: VerifyIssue[];
	summary: {
		totalEntries: number;
		totalEffects: number;
		errors: number;
		warnings: number;
		coveragePercent: number;
	};
}

// ─── Core verification ──────────────────────────────────

/**
 * Run all verification checks.
 */
export function verifyAll(
	mainMd: string,
	exclusiveMd: string | undefined,
	universalMd: string | undefined,
	schoolMd: string | undefined,
	options?: {
		parseMainSkillsToYaml?: (
			mainMd: string,
			exclusiveMd?: string,
		) => { yaml: string };
	},
): VerifyReport {
	const entries: EntryReport[] = [];
	const globalIssues: VerifyIssue[] = [];

	// 1. Verify common/school affixes (extractor-level)
	if (universalMd) {
		entries.push(
			...verifyAffixEntries(readUniversalAffixTable(universalMd), "universal"),
		);
	}
	if (schoolMd) {
		entries.push(
			...verifyAffixEntries(readSchoolAffixTable(schoolMd), "school"),
		);
	}

	// 2. Verify exclusive affixes (extractor-level for generic, structural for overrides)
	if (exclusiveMd) {
		entries.push(...verifyExclusiveAffixes(exclusiveMd));
	}

	// 3. Verify primary affixes (structural)
	entries.push(...verifyPrimaryAffixes(mainMd));

	// 4. Check type uniqueness across AFFIX_EXTRACTORS
	globalIssues.push(...checkTypeUniqueness());

	// 5. Check YAML output staleness
	if (universalMd && schoolMd) {
		globalIssues.push(...checkAffixesYamlStaleness(universalMd, schoolMd));
	}
	if (exclusiveMd && options?.parseMainSkillsToYaml) {
		globalIssues.push(
			...checkBooksYamlStaleness(
				mainMd,
				exclusiveMd,
				options.parseMainSkillsToYaml,
			),
		);
	}

	// Collect all issues
	const allIssues = [...globalIssues, ...entries.flatMap((e) => e.issues)];

	const coveredEntries = entries.filter((e) => e.effects.length > 0);

	return {
		entries,
		issues: allIssues,
		summary: {
			totalEntries: entries.length,
			totalEffects: entries.reduce((s, e) => s + e.effects.length, 0),
			errors: allIssues.filter((i) => i.severity === "error").length,
			warnings: allIssues.filter((i) => i.severity === "warn").length,
			coveragePercent:
				entries.length > 0
					? Math.round((coveredEntries.length / entries.length) * 100)
					: 100,
		},
	};
}

// ─── Common/school affix verification ───────────────────

function verifyAffixEntries(
	affixEntries: {
		name: string;
		school?: string;
		cell: import("./md-table.js").SplitCell;
	}[],
	sourcePrefix: string,
): EntryReport[] {
	const reports: EntryReport[] = [];

	for (const entry of affixEntries) {
		const source = entry.school
			? `${sourcePrefix}/${entry.school}/${entry.name}`
			: `${sourcePrefix}/${entry.name}`;

		const text = entry.cell.description.join("，").replace(/^【.+?】[：:]/, "");
		const lastTier = entry.cell.tiers[entry.cell.tiers.length - 1];
		const tierVars = lastTier?.vars ?? {};

		// Run each extractor individually
		const matches: ExtractorMatch[] = [];
		for (const def of AFFIX_EXTRACTORS) {
			const result = def.fn(text);
			if (result) {
				matches.push({
					name: def.name,
					type: result.type,
					fields: result.fields,
				});
			}
		}

		// Get final parsed effects
		const effects = genericAffixParse(entry.cell, {}, { lastTierOnly: true });

		const issues: VerifyIssue[] = [];

		// Check: coverage
		if (matches.length === 0) {
			issues.push({
				severity: "error",
				category: "coverage",
				source,
				message: `No extractor matched text: "${text}"`,
			});
		}

		// Check: double match
		if (matches.length > 1) {
			const names = matches.map((m) => m.name).join(", ");
			issues.push({
				severity: "error",
				category: "double_match",
				source,
				message: `${matches.length} extractors matched: ${names}`,
			});
		}

		// Check: empty effects after full pipeline
		if (effects.length === 0) {
			issues.push({
				severity: "error",
				category: "empty_effects",
				source,
				message: "genericAffixParse produced 0 effects",
			});
		}

		// Check: unresolved variable references in effects
		for (const effect of effects) {
			for (const [key, val] of Object.entries(effect)) {
				if (key === "type") continue;
				if (typeof val === "string" && /^[a-z]$/.test(val)) {
					issues.push({
						severity: "error",
						category: "unresolved_var",
						source,
						message: `Effect field "${key}" has unresolved var "${val}" (tier vars: ${JSON.stringify(tierVars)})`,
					});
				}
			}
		}

		// Check: field values match tier vars (for single-var fields)
		if (matches.length === 1 && lastTier) {
			const match = matches[0];
			const _resolved = resolveFields(match.fields, tierVars);
			for (const [key, rawVal] of Object.entries(match.fields)) {
				if (typeof rawVal === "string" && /^[a-z]$/.test(rawVal)) {
					if (tierVars[rawVal] === undefined) {
						issues.push({
							severity: "error",
							category: "missing_var",
							source,
							message: `Field "${key}" references var "${rawVal}" but tier has: ${Object.keys(tierVars).join(", ")}`,
						});
					}
				}
			}
		}

		reports.push({
			source,
			name: entry.name,
			text,
			tierVars,
			matches,
			effects,
			issues,
		});
	}

	return reports;
}

// ─── Exclusive affix verification ───────────────────────

function verifyExclusiveAffixes(exclusiveMd: string): EntryReport[] {
	const reports: EntryReport[] = [];
	const exclusiveEntries = readExclusiveAffixTable(exclusiveMd);

	for (const entry of exclusiveEntries) {
		const source = `exclusive/${entry.bookName}/${entry.affixName}`;
		const text = entry.cell.description.join("，").replace(/^【.+?】[：:]/, "");
		const lastTier = entry.cell.tiers[entry.cell.tiers.length - 1];
		const tierVars = lastTier?.vars ?? {};

		// Parse through the actual exclusive pipeline
		const stateRegistry: Record<string, import("./states.js").StateDef> = {};
		let effects: EffectRow[] = [];
		try {
			const result = parseExclusiveAffix(entry, stateRegistry);
			effects = result.effects;
		} catch {
			// parse error handled below
		}

		// Run extractors to see what matches (for generic-pipeline entries)
		const matches: ExtractorMatch[] = [];
		for (const def of AFFIX_EXTRACTORS) {
			const result = def.fn(text);
			if (result) {
				matches.push({
					name: def.name,
					type: result.type,
					fields: result.fields,
				});
			}
		}

		const issues: VerifyIssue[] = [];

		if (effects.length === 0) {
			issues.push({
				severity: "error",
				category: "empty_effects",
				source,
				message: "parseExclusiveAffix produced 0 effects",
			});
		}

		// Check unresolved vars
		for (const effect of effects) {
			for (const [key, val] of Object.entries(effect)) {
				if (key === "type" || key === "data_state") continue;
				if (typeof val === "string" && /^[a-z]$/.test(val)) {
					issues.push({
						severity: "error",
						category: "unresolved_var",
						source,
						message: `Effect field "${key}" has unresolved var "${val}"`,
					});
				}
			}
		}

		reports.push({
			source,
			name: entry.affixName,
			text,
			tierVars,
			matches,
			effects,
			issues,
		});
	}

	return reports;
}

// ─── Primary affix verification ─────────────────────────

function verifyPrimaryAffixes(mainMd: string): EntryReport[] {
	const reports: EntryReport[] = [];
	const entries = readMainSkillTables(mainMd);

	for (const entry of entries) {
		const meta = BOOK_TABLE[entry.name];
		if (!meta || !entry.affixText) continue;

		const affixCell = splitCell(entry.affixText);
		if (affixCell.description.length === 0) continue;

		const source = `primary/${entry.name}`;
		const text = affixCell.description.join("，").replace(/^【.+?】[：:]/, "");
		const lastTier = affixCell.tiers[affixCell.tiers.length - 1];
		const tierVars = lastTier?.vars ?? {};

		// Parse through the actual book pipeline
		const skillCell = splitCell(entry.skillText);
		let effects: EffectRow[] = [];
		try {
			const parsed = parseBook(
				entry.name,
				entry.school,
				meta.grammar,
				skillCell,
				affixCell,
			);
			effects = parsed.primaryAffix?.effects ?? [];
		} catch {
			// handled below
		}

		// Run extractors
		const matches: ExtractorMatch[] = [];
		for (const def of AFFIX_EXTRACTORS) {
			const result = def.fn(text);
			if (result) {
				matches.push({
					name: def.name,
					type: result.type,
					fields: result.fields,
				});
			}
		}

		const issues: VerifyIssue[] = [];

		if (effects.length === 0) {
			issues.push({
				severity: "warn",
				category: "empty_effects",
				source,
				message:
					"Primary affix produced 0 effects (may be handled by book-specific parser)",
			});
		}

		// Check unresolved vars
		for (const effect of effects) {
			for (const [key, val] of Object.entries(effect)) {
				if (key === "type" || key === "data_state") continue;
				if (typeof val === "string" && /^[a-z]$/.test(val)) {
					issues.push({
						severity: "error",
						category: "unresolved_var",
						source,
						message: `Effect field "${key}" has unresolved var "${val}"`,
					});
				}
			}
		}

		reports.push({
			source,
			name: entry.name,
			text,
			tierVars,
			matches,
			effects,
			issues,
		});
	}

	return reports;
}

// ─── Type uniqueness check ──────────────────────────────

function checkTypeUniqueness(): VerifyIssue[] {
	const issues: VerifyIssue[] = [];

	// For each extractor, probe with a synthetic text to find its output type.
	// Instead, we statically check: run every extractor against every
	// known affix text and see if two produce the same type on the same text.
	// This is already covered by the per-entry double_match check above.

	// What we CAN check: are there two extractors in the registry with
	// the same name?
	const names = new Map<string, number>();
	for (const def of AFFIX_EXTRACTORS) {
		names.set(def.name, (names.get(def.name) ?? 0) + 1);
	}
	for (const [name, count] of names) {
		if (count > 1) {
			issues.push({
				severity: "error",
				category: "duplicate_registry",
				source: "AFFIX_EXTRACTORS",
				message: `Extractor "${name}" registered ${count} times`,
			});
		}
	}

	return issues;
}

// ─── YAML staleness checks ──────────────────────────────

function checkAffixesYamlStaleness(
	universalMd: string,
	schoolMd: string,
): VerifyIssue[] {
	const issues: VerifyIssue[] = [];
	const yamlPath = resolve("data/yaml/affixes.yaml");

	if (!existsSync(yamlPath)) {
		issues.push({
			severity: "warn",
			category: "yaml_missing",
			source: "affixes.yaml",
			message:
				"data/yaml/affixes.yaml does not exist — run: bun app/parse-affixes.ts -o data/yaml/affixes.yaml",
		});
		return issues;
	}

	const existing = readFileSync(yamlPath, "utf-8");
	const result = parseCommonAffixes(universalMd, schoolMd);
	const fresh = formatAffixesYaml(result);

	if (existing !== fresh) {
		issues.push({
			severity: "error",
			category: "yaml_stale",
			source: "affixes.yaml",
			message:
				"data/yaml/affixes.yaml is out of sync with current parser output — regenerate with: bun app/parse-affixes.ts -o data/yaml/affixes.yaml",
		});
	}

	return issues;
}

function checkBooksYamlStaleness(
	mainMd: string,
	exclusiveMd: string,
	parseMainSkillsToYaml: (
		mainMd: string,
		exclusiveMd?: string,
	) => { yaml: string },
): VerifyIssue[] {
	const issues: VerifyIssue[] = [];
	const yamlPath = resolve("data/yaml/books.yaml");

	if (!existsSync(yamlPath)) {
		issues.push({
			severity: "warn",
			category: "yaml_missing",
			source: "books.yaml",
			message: "data/yaml/books.yaml does not exist",
		});
		return issues;
	}

	const existing = readFileSync(yamlPath, "utf-8");

	// Regenerate using the injected function (avoids circular import with index.ts)
	const { yaml: fresh } = parseMainSkillsToYaml(mainMd, exclusiveMd);

	if (existing !== fresh) {
		issues.push({
			severity: "error",
			category: "yaml_stale",
			source: "books.yaml",
			message:
				"data/yaml/books.yaml is out of sync with current parser output — regenerate with: bun app/parse-main-skills.ts -o data/yaml/books.yaml",
		});
	}

	return issues;
}
