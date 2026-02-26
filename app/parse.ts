/**
 * CLI: normalized.data.md + keyword.map.md -> effects.yaml + groups.yaml
 *
 * Side-effectful entry point. Reads inputs, runs pure parsers,
 * writes outputs, reports warnings.
 *
 * Usage: bun app/parse.ts <normalized-data.md> <keyword-map.md> <output-dir>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { parseGroups } from "../lib/parse.groups.js";
import { parse } from "../lib/parse.js";

const [dataArg, mapArg, outDirArg] = process.argv.slice(2);

if (!dataArg || !mapArg || !outDirArg) {
	console.error(
		"Usage: bun app/parse.ts <normalized-data.md> <keyword-map.md> <output-dir>",
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

// --- groups.yaml ---

const mapMd = readFileSync(resolve(mapArg), "utf-8");
const groupsData = parseGroups(mapMd);

const groupsHeader = [
	`# Effect groups — generated from ${mapArg}`,
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
