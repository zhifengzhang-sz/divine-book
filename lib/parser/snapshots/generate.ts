/**
 * Snapshot generator — run with `bun lib/parser/snapshots/generate.ts`
 *
 * Parses all books + common affixes from source markdown and writes
 * JSON snapshot files used by snapshot tests.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCommonAffixes } from "../common-affixes.js";
import { parseMainSkills } from "../index.js";

const root = resolve(import.meta.dir, "../../..");

// Generate books snapshot
const mainMd = readFileSync(resolve(root, "data/raw/主书.md"), "utf-8");
const exclusiveMd = readFileSync(
	resolve(root, "data/raw/专属词缀.md"),
	"utf-8",
);
const result = parseMainSkills(mainMd, exclusiveMd);

if (result.errors.length > 0) {
	console.error("Parse errors:", result.errors);
	process.exit(1);
}

mkdirSync(resolve(import.meta.dir), { recursive: true });
writeFileSync(
	resolve(import.meta.dir, "books.json"),
	`${JSON.stringify(result.books, null, 2)}\n`,
);
console.log(`Books: ${Object.keys(result.books).length} entries`);

if (result.warnings.length > 0) {
	console.warn("Warnings:", result.warnings);
}

// Generate affixes snapshot
const universalMd = readFileSync(
	resolve(root, "data/raw/通用词缀.md"),
	"utf-8",
);
const schoolMd = readFileSync(resolve(root, "data/raw/修为词缀.md"), "utf-8");
const affixes = parseCommonAffixes(universalMd, schoolMd);

writeFileSync(
	resolve(import.meta.dir, "affixes.json"),
	`${JSON.stringify({ universal: affixes.universal, school: affixes.school }, null, 2)}\n`,
);

const schoolAffixCount = Object.values(affixes.school).reduce(
	(s, g) => s + Object.keys(g).length,
	0,
);
console.log(
	`Affixes: ${Object.keys(affixes.universal).length} universal, ${schoolAffixCount} school`,
);

if (affixes.warnings.length > 0) {
	console.warn("Affix warnings:", affixes.warnings);
}
