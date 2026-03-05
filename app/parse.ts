/**
 * CLI: normalized.data.md -> effects.yaml + groups.yaml
 *
 * Side-effectful entry point. Reads inputs, runs pure parsers,
 * writes outputs, reports warnings.
 *
 * Groups are derived from the TypeScript registry (single source of truth).
 *
 * Usage: bun app/parse.ts <normalized-data.md> <output-dir>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { registry } from "../lib/domain/registry.js";
import { parse } from "../lib/parse.js";

const [dataArg, outDirArg] = process.argv.slice(2);

if (!dataArg || !outDirArg) {
	console.error(
		"Usage: bun app/parse.ts <normalized-data.md> <output-dir>",
	);
	process.exit(1);
}

const outDir = resolve(outDirArg);

// --- effects.yaml ---

const dataMd = readFileSync(resolve(dataArg), "utf-8");
const { data, warnings } = parse(dataMd);

const effectsHeader = [
	`# Divine Book effects — generated from ${dataArg}`,
	"# Do not edit manually. Regenerate with: bun app/parse.ts",
	"",
].join("\n");

const effectsPath = join(outDir, "effects.yaml");
writeFileSync(effectsPath, effectsHeader + stringify(data, { lineWidth: 0 }));
console.log(`Wrote ${effectsPath}`);

// --- groups.yaml (from registry) ---

const groupsData = registry.groupsOutput;

const groupsHeader = [
	"# Effect groups — derived from TypeScript registry",
	"# Do not edit manually. Regenerate with: bun app/parse.ts",
	"",
].join("\n");

const groupsPath = join(outDir, "groups.yaml");
writeFileSync(
	groupsPath,
	groupsHeader + stringify(groupsData, { lineWidth: 0 }),
);
console.log(`Wrote ${groupsPath}`);

// --- Warnings ---

for (const w of warnings) {
	console.warn(
		`WARN [${w.context}] type=${w.type}\n${w.issues.map((i) => `  ${i}`).join("\n")}`,
	);
}
if (warnings.length > 0) {
	console.log(`${warnings.length} validation warning(s)`);
	process.exit(1);
}
console.log("All rows validated successfully.");
