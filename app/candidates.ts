/**
 * CLI: enumerate all affix candidates for a Cₙ category.
 *
 * Usage: bun app/candidates.ts <n>   (n = 0–13)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { AffixSource, Cluster } from "../lib/candidates.js";
import { candidatesByCategory } from "../lib/candidates.js";
import type { GroupsOutput } from "../lib/parse.groups.js";
import type { ParseOutput } from "../lib/parse.js";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const arg = process.argv[2];

if (!arg) {
	console.error("Usage: bun app/candidates.ts <n>  (n = 0–13, from Cₙ)");
	process.exit(1);
}

const n = Number(arg);
if (Number.isNaN(n) || n < 0 || n > 13) {
	console.error(`Invalid category: ${arg}. Expected 0–13.`);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------

const data: ParseOutput = parseYaml(
	readFileSync(resolve("data/yaml/effects.yaml"), "utf-8"),
);
const groups: GroupsOutput = parseYaml(
	readFileSync(resolve("data/yaml/groups.yaml"), "utf-8"),
);

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const result = candidatesByCategory(data, groups, n);

if (!result) {
	console.error(`No group found for C${n}`);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Format output
// ---------------------------------------------------------------------------

/** Display width accounting for CJK double-width characters */
function displayWidth(s: string): number {
	let w = 0;
	for (const ch of s) {
		w += ch.charCodeAt(0) > 0x7f ? 2 : 1;
	}
	return w;
}

function padEnd(s: string, width: number): string {
	const diff = width - displayWidth(s);
	return diff > 0 ? s + " ".repeat(diff) : s;
}

function formatOrigin(c: AffixSource): string {
	if (c.scope === "exclusive") return `exclusive: ${c.book} [${c.school}]`;
	if (c.scope === "school") return `${c.school} school`;
	return "universal";
}

function formatEffect(e: Record<string, unknown>): string {
	const parts: string[] = [];
	for (const [k, v] of Object.entries(e)) {
		if (k === "type" || k === "parent") continue;
		parts.push(`${k}=${v}`);
	}
	return parts.join(", ");
}

function formatCluster(cluster: Cluster): void {
	console.log(`\n── ${cluster.type} ──`);
	for (const c of cluster.candidates) {
		console.log(`  ${padEnd(c.affix, 14)}  [${formatOrigin(c)}]`);
		for (const e of c.effects) {
			const fields = formatEffect(e);
			if (fields) {
				console.log(`  ${" ".repeat(14)}  ${e.type}: ${fields}`);
			} else {
				console.log(`  ${" ".repeat(14)}  ${e.type}`);
			}
		}
	}
}

console.log(`\nC${result.category} ${result.label}`);
console.log("═".repeat(40));
for (const cluster of result.clusters) {
	formatCluster(cluster);
}
console.log();
