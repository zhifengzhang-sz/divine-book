#!/usr/bin/env bun
/**
 * CLI: Parse main skills from 主书.md → effects.yaml books section
 *
 * Usage:
 *   bun app/parse-main-skills.ts                  # parse all, write to stdout
 *   bun app/parse-main-skills.ts --book 千锋聚灵剑  # parse single book
 *   bun app/parse-main-skills.ts --verify          # compare with existing effects.yaml
 *   bun app/parse-main-skills.ts -o data/yaml/effects-main.yaml  # write to file
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import YAML from "yaml";
import {
	parseMainSkills,
	parseMainSkillsToYaml,
	parseSingleBook,
} from "../lib/parser/index.js";

const { values } = parseArgs({
	options: {
		book: { type: "string", short: "b" },
		verify: { type: "boolean", short: "v" },
		output: { type: "string", short: "o" },
		help: { type: "boolean", short: "h" },
	},
});

if (values.help) {
	console.log(`Usage: bun app/parse-main-skills.ts [options]

Options:
  --book, -b <name>   Parse single book (for debugging)
  --verify, -v        Compare output against existing effects.yaml
  --output, -o <path> Write YAML to file instead of stdout
  --help, -h          Show this help`);
	process.exit(0);
}

const rawPath = resolve("data/raw/主书.md");
if (!existsSync(rawPath)) {
	console.error(`Error: ${rawPath} not found`);
	process.exit(1);
}

const markdown = readFileSync(rawPath, "utf-8");

// Single book mode
if (values.book) {
	const parsed = parseSingleBook(markdown, values.book);
	if (!parsed) {
		console.error(`Book not found: ${values.book}`);
		process.exit(1);
	}
	console.log(JSON.stringify(parsed, null, 2));
	process.exit(0);
}

// Full parse
const result = parseMainSkills(markdown);

// Print warnings/errors
if (result.warnings.length > 0) {
	console.error("Warnings:");
	for (const w of result.warnings) {
		console.error(`  ⚠ ${w}`);
	}
}
if (result.errors.length > 0) {
	console.error("Errors:");
	for (const e of result.errors) {
		console.error(`  ✗ ${e}`);
	}
}

// Summary
const bookCount = Object.keys(result.books).length;
const effectCount = Object.values(result.books).reduce((sum, b) => {
	return (
		sum +
		(b.skill?.length ?? 0) +
		(b.primary_affix?.effects.length ?? 0)
	);
}, 0);
console.error(
	`\nParsed ${bookCount} books, ${effectCount} total effects`,
);

// Verify mode: compare with existing effects.yaml
if (values.verify) {
	const existingPath = resolve("data/yaml/effects.yaml");
	if (!existsSync(existingPath)) {
		console.error(`Error: ${existingPath} not found`);
		process.exit(1);
	}

	const existing = YAML.parse(readFileSync(existingPath, "utf-8"));
	const existingBooks = existing.books || {};

	console.error("\n── Verification Report ──");
	let matches = 0;
	let mismatches = 0;

	for (const [name, newBook] of Object.entries(result.books)) {
		const oldBook = existingBooks[name];
		if (!oldBook) {
			console.error(`  + NEW: ${name}`);
			continue;
		}

		// Compare school
		if (
			(newBook as { school: string }).school !==
			(oldBook as { school: string }).school
		) {
			console.error(`  ✗ ${name}: school mismatch`);
			mismatches++;
			continue;
		}

		// Compare skill effect count
		const newSkillCount = (newBook as { skill?: unknown[] }).skill?.length ?? 0;
		const oldSkillCount = (oldBook as { skill?: unknown[] }).skill?.length ?? 0;
		const newAffixCount = (newBook as { primary_affix?: { effects: unknown[] } }).primary_affix?.effects.length ?? 0;
		const oldAffixCount = (oldBook as { primary_affix?: { effects: unknown[] } }).primary_affix?.effects.length ?? 0;

		if (newSkillCount === oldSkillCount && newAffixCount === oldAffixCount) {
			matches++;
		} else {
			console.error(
				`  ~ ${name}: skill ${oldSkillCount}→${newSkillCount}, affix ${oldAffixCount}→${newAffixCount}`,
			);
			mismatches++;
		}
	}

	// Check for books in old but not new
	for (const name of Object.keys(existingBooks)) {
		if (!result.books[name]) {
			console.error(`  - MISSING: ${name}`);
		}
	}

	console.error(
		`\n${matches} match, ${mismatches} differ`,
	);
	process.exit(0);
}

// Output
const { yaml } = parseMainSkillsToYaml(markdown);

if (values.output) {
	writeFileSync(values.output, yaml);
	console.error(`Written to ${values.output}`);
} else {
	console.log(yaml);
}
