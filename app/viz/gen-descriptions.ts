#!/usr/bin/env bun
/**
 * Generate book-descriptions.json for the viz.
 * Extracts raw skill/affix text from data/raw/主书.md.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readMainSkillTables } from "../../lib/parser/md-table.js";

const rawPath = resolve("data/raw/主书.md");
const markdown = readFileSync(rawPath, "utf-8");
const entries = readMainSkillTables(markdown);

const descriptions: Record<string, { skillText: string; affixText: string }> =
	{};
for (const entry of entries) {
	// Clean up <br> to newlines for display
	descriptions[entry.name] = {
		skillText: entry.skillText.replace(/<br\s*\/?>/gi, "\n"),
		affixText: entry.affixText.replace(/<br\s*\/?>/gi, "\n"),
	};
}

const outPath = resolve("app/viz/src/book-descriptions.json");
writeFileSync(outPath, JSON.stringify(descriptions, null, 2));
console.log(
	`Written ${Object.keys(descriptions).length} book descriptions to ${outPath}`,
);
