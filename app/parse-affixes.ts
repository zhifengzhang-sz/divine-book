#!/usr/bin/env bun
/**
 * CLI: Parse common & school affixes → affixes.yaml
 *
 * Usage:
 *   bun app/parse-affixes.ts                          # parse all, write to stdout
 *   bun app/parse-affixes.ts -o data/yaml/affixes.yaml  # write to file
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	formatAffixesYaml,
	parseCommonAffixes,
} from "../lib/parser/common-affixes.js";

const { values } = parseArgs({
	options: {
		output: { type: "string", short: "o" },
		help: { type: "boolean", short: "h" },
	},
});

if (values.help) {
	console.log(`Usage: bun app/parse-affixes.ts [options]

Options:
  --output, -o <path> Write YAML to file instead of stdout
  --help, -h          Show this help`);
	process.exit(0);
}

const universalPath = resolve("data/raw/通用词缀.md");
const schoolPath = resolve("data/raw/修为词缀.md");

if (!existsSync(universalPath)) {
	console.error(`Error: ${universalPath} not found`);
	process.exit(1);
}
if (!existsSync(schoolPath)) {
	console.error(`Error: ${schoolPath} not found`);
	process.exit(1);
}

const universalMd = readFileSync(universalPath, "utf-8");
const schoolMd = readFileSync(schoolPath, "utf-8");

const result = parseCommonAffixes(universalMd, schoolMd);

// Print warnings
if (result.warnings.length > 0) {
	console.error("Warnings:");
	for (const w of result.warnings) {
		console.error(`  ⚠ ${w}`);
	}
}

// Summary
const uCount = Object.keys(result.universal).length;
const sCount = Object.values(result.school).reduce(
	(sum, group) => sum + Object.keys(group).length,
	0,
);
let totalEffects = 0;
for (const d of Object.values(result.universal))
	totalEffects += d.effects.length;
for (const group of Object.values(result.school)) {
	for (const d of Object.values(group)) totalEffects += d.effects.length;
}
console.error(
	`\nParsed ${uCount} universal + ${sCount} school = ${uCount + sCount} affixes, ${totalEffects} total effects`,
);

// Output
const yaml = formatAffixesYaml(result);

if (values.output) {
	writeFileSync(values.output, yaml);
	console.error(`Written to ${values.output}`);
} else {
	console.log(yaml);
}
