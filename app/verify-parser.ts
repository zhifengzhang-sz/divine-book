#!/usr/bin/env bun
/**
 * CLI: Verify parser consistency
 *
 * Checks that raw markdown sources and extracted structured data
 * are consistent. Run after any extractor or parser change.
 *
 * Usage:
 *   bun app/verify-parser.ts           # full verification
 *   bun app/verify-parser.ts --verbose  # show per-entry details
 *   bun app/verify-parser.ts --json     # machine-readable output
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseMainSkillsToYaml } from "../lib/parser/index.js";
import { type EntryReport, verifyAll } from "../lib/parser/verify.js";

const { values } = parseArgs({
	options: {
		verbose: { type: "boolean", short: "v" },
		json: { type: "boolean" },
		help: { type: "boolean", short: "h" },
	},
});

if (values.help) {
	console.log(`Usage: bun app/verify-parser.ts [options]

Options:
  --verbose, -v  Show per-entry extractor match details
  --json         Output as JSON
  --help, -h     Show this help

Checks:
  coverage        Every raw entry produces ≥1 effect
  double_match    No text matches >1 extractor
  unresolved_var  No field contains unresolved variable reference
  missing_var     No field references a var absent from tier
  yaml_stale      YAML output files match current parser
  duplicate_registry  No extractor registered twice`);
	process.exit(0);
}

const mainPath = resolve("data/raw/主书.md");
const exclusivePath = resolve("data/raw/专属词缀.md");
const universalPath = resolve("data/raw/通用词缀.md");
const schoolPath = resolve("data/raw/修为词缀.md");

const mainMd = existsSync(mainPath) ? readFileSync(mainPath, "utf-8") : "";
const exclusiveMd = existsSync(exclusivePath)
	? readFileSync(exclusivePath, "utf-8")
	: undefined;
const universalMd = existsSync(universalPath)
	? readFileSync(universalPath, "utf-8")
	: undefined;
const schoolMd = existsSync(schoolPath)
	? readFileSync(schoolPath, "utf-8")
	: undefined;

const report = verifyAll(mainMd, exclusiveMd, universalMd, schoolMd, {
	parseMainSkillsToYaml,
});

if (values.json) {
	console.log(JSON.stringify(report, null, 2));
	process.exit(report.summary.errors > 0 ? 1 : 0);
}

// ─── Human-readable output ──────────────────────────────

// Group entries by source prefix
const groups = new Map<string, EntryReport[]>();
for (const entry of report.entries) {
	const prefix = entry.source.split("/")[0];
	if (!groups.has(prefix)) groups.set(prefix, []);
	groups.get(prefix)?.push(entry);
}

for (const [prefix, entries] of groups) {
	const label =
		{
			universal: "Universal Affixes (通用词缀)",
			school: "School Affixes (修为词缀)",
			exclusive: "Exclusive Affixes (专属词缀)",
			primary: "Primary Affixes (主词缀)",
		}[prefix] ?? prefix;

	console.log(`\n═══ ${label} ═══`);

	const ok = entries.filter((e) => e.issues.length === 0);
	const bad = entries.filter((e) => e.issues.length > 0);

	if (values.verbose) {
		for (const entry of entries) {
			const status = entry.issues.length === 0 ? "✓" : "✗";
			const matchStr =
				entry.matches.length > 0
					? entry.matches.map((m) => m.name).join(", ")
					: "(none)";
			console.log(`  ${status} ${entry.source}`);
			console.log(
				`    text: ${entry.text.slice(0, 80)}${entry.text.length > 80 ? "..." : ""}`,
			);
			console.log(`    tier: ${JSON.stringify(entry.tierVars)}`);
			console.log(`    extractors: ${matchStr}`);
			console.log(`    effects: ${entry.effects.length}`);
			for (const issue of entry.issues) {
				console.log(
					`    ${issue.severity === "error" ? "✗" : "⚠"} [${issue.category}] ${issue.message}`,
				);
			}
		}
	} else {
		// Compact: just show issues
		for (const entry of bad) {
			for (const issue of entry.issues) {
				const icon = issue.severity === "error" ? "✗" : "⚠";
				console.log(
					`  ${icon} ${entry.source}: [${issue.category}] ${issue.message}`,
				);
			}
		}
	}

	console.log(`  ${ok.length}/${entries.length} clean`);
}

// Global issues
if (report.issues.filter((i) => !i.source.includes("/")).length > 0) {
	console.log("\n═══ Global Checks ═══");
	for (const issue of report.issues) {
		if (issue.source.includes("/")) continue; // already shown above
		const icon = issue.severity === "error" ? "✗" : "⚠";
		console.log(
			`  ${icon} [${issue.category}] ${issue.source}: ${issue.message}`,
		);
	}
}

// Summary
console.log(`\n─── Summary ───`);
console.log(`  Entries: ${report.summary.totalEntries}`);
console.log(`  Effects: ${report.summary.totalEffects}`);
console.log(`  Coverage: ${report.summary.coveragePercent}%`);
console.log(`  Errors: ${report.summary.errors}`);
console.log(`  Warnings: ${report.summary.warnings}`);

if (report.summary.errors > 0) {
	console.log("\nFAILED — fix errors above");
	process.exit(1);
} else if (report.summary.warnings > 0) {
	console.log("\nPASSED with warnings");
} else {
	console.log("\nPASSED");
}
