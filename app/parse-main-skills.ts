#!/usr/bin/env bun
/**
 * CLI: Parse main skills + exclusive affixes → books.yaml
 *
 * Usage:
 *   bun app/parse-main-skills.ts                  # parse all, write to stdout
 *   bun app/parse-main-skills.ts --book 千锋聚灵剑  # parse single book
 *   bun app/parse-main-skills.ts -o data/yaml/books.yaml  # write to file
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	parseMainSkills,
	parseMainSkillsToYaml,
	parseSingleBook,
} from "../lib/parser/index.js";

const { values } = parseArgs({
	options: {
		book: { type: "string", short: "b" },
		output: { type: "string", short: "o" },
		help: { type: "boolean", short: "h" },
	},
});

if (values.help) {
	console.log(`Usage: bun app/parse-main-skills.ts [options]

Options:
  --book, -b <name>   Parse single book (for debugging)
  --output, -o <path> Write YAML to file instead of stdout
  --help, -h          Show this help`);
	process.exit(0);
}

const rawPath = resolve("data/raw/主书.md");
const exclusivePath = resolve("data/raw/专属词缀.md");

if (!existsSync(rawPath)) {
	console.error(`Error: ${rawPath} not found`);
	process.exit(1);
}

const markdown = readFileSync(rawPath, "utf-8");
const exclusiveMarkdown = existsSync(exclusivePath)
	? readFileSync(exclusivePath, "utf-8")
	: undefined;

// Single book mode
if (values.book) {
	const parsed = parseSingleBook(markdown, values.book, exclusiveMarkdown);
	if (!parsed) {
		console.error(`Book not found: ${values.book}`);
		process.exit(1);
	}
	console.log(JSON.stringify(parsed, null, 2));
	process.exit(0);
}

// Full parse
const result = parseMainSkills(markdown, exclusiveMarkdown);

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
let skillCount = 0;
let primaryCount = 0;
let exclusiveCount = 0;
for (const b of Object.values(result.books)) {
	skillCount += b.skill?.length ?? 0;
	primaryCount += b.primary_affix?.effects.length ?? 0;
	exclusiveCount += b.exclusive_affix?.effects.length ?? 0;
}
console.error(
	`\nParsed ${bookCount} books: ${skillCount} skill effects, ${primaryCount} primary affix effects, ${exclusiveCount} exclusive affix effects`,
);

// Output
const { yaml } = parseMainSkillsToYaml(markdown, exclusiveMarkdown);

if (values.output) {
	writeFileSync(values.output, yaml);
	console.error(`Written to ${values.output}`);
} else {
	console.log(yaml);
}
