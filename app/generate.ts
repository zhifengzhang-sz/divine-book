/**
 * CLI: Generate markdown and YAML from TypeScript registry
 *
 * Generates:
 * - data/keyword/keyword.map.md — keyword → effect type mapping
 * - data/yaml/groups.yaml — effect group classification
 *
 * Usage: bun app/generate.ts
 */

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { registry } from "../lib/domain/registry.js";
import { generateKeywordMap } from "../lib/generators/keyword-map.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- keyword.map.md (English) and keyword.map.cn.md (Chinese patterns preserved) ---

const keywordMapContent = generateKeywordMap(registry);
const keywordMapPath = join(ROOT, "data/keyword/keyword.map.md");
writeFileSync(keywordMapPath, keywordMapContent);
console.log(`Wrote ${keywordMapPath}`);

// Also write the canonical CN file for pipeline authors who prefer the Chinese primary document.
const keywordMapCnPath = join(ROOT, "data/keyword/keyword.map.cn.md");
writeFileSync(keywordMapCnPath, keywordMapContent);
console.log(`Wrote ${keywordMapCnPath}`);

// --- groups.yaml ---

const groupsData = registry.groupsOutput;
const groupsHeader = [
	"# Effect groups — derived from TypeScript registry",
	"# Do not edit manually. Regenerate with: bun app/generate.ts",
	"",
].join("\n");

const groupsPath = join(ROOT, "data/yaml/groups.yaml");
writeFileSync(
	groupsPath,
	groupsHeader + stringify(groupsData, { lineWidth: 0 }),
);
console.log(`Wrote ${groupsPath}`);

console.log("Generation complete.");
