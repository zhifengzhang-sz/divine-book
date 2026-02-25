/**
 * CLI: normalized.data.md -> effects.yaml
 *
 * Side-effectful entry point. Reads input, runs the pure parser,
 * writes output, reports warnings.
 *
 * Usage: bun app/parse.ts <input> <output>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify } from "yaml";
import { parse } from "../lib/parse.js";

const [inputArg, outputArg] = process.argv.slice(2);

if (!inputArg || !outputArg) {
	console.error("Usage: bun app/parse.ts <input.md> <output.yaml>");
	process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);

const md = readFileSync(input, "utf-8");
const { data, warnings } = parse(md);

const header = [
	`# Divine Book effects — generated from ${inputArg}`,
	"# Do not edit manually. Regenerate with: bun app/parse.ts",
	"",
].join("\n");

writeFileSync(output, header + stringify(data, { lineWidth: 0 }));

console.log(`Wrote ${output}`);
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
