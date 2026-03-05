/**
 * Combo search CLI — enumerate valid affix combinations for a platform.
 *
 * Usage:
 *   bun app/combo-search.ts --platform 疾风九变
 *   bun app/combo-search.ts --platform 十方真魄
 *   bun app/combo-search.ts --list
 */

import { parseArgs } from "node:util";
import { filterByBinding, discoverChains } from "../lib/domain/chains.js";
import { PLATFORMS, getPlatform } from "../lib/domain/platforms.js";
import { NAMED_ENTITIES } from "../lib/domain/named-entities.js";
import type { ComboResult } from "../lib/domain/chains.js";

const { values } = parseArgs({
	options: {
		platform: { type: "string", short: "p" },
		list: { type: "boolean", short: "l" },
	},
});

if (values.list) {
	console.log("Available platforms:\n");
	for (const p of PLATFORMS) {
		const entities = p.namedEntities.length > 0
			? ` → ${p.namedEntities.map((e) => `【${e}】`).join(", ")}`
			: "";
		console.log(
			`  ${p.book} + ${p.primaryAffix} (${p.school})${entities}`,
		);
		console.log(
			`    provides: ${p.provides.join(", ")}`,
		);
	}
	process.exit(0);
}

if (!values.platform) {
	console.error("Usage: bun app/combo-search.ts --platform <book_name>");
	console.error("       bun app/combo-search.ts --list");
	process.exit(1);
}

const platform = getPlatform(values.platform);
if (!platform) {
	console.error(`Unknown platform: ${values.platform}`);
	console.error("Use --list to see available platforms.");
	process.exit(1);
}

// Step 1-2: Platform-first pruning
const result: ComboResult = filterByBinding(platform);

console.log(`\n${"=".repeat(60)}`);
console.log(`Platform: ${platform.book} + ${platform.primaryAffix}`);
console.log(`School: ${platform.school}`);
console.log(`Provides: ${[...result.availableCategories].join(", ")}`);
if (platform.namedEntities.length > 0) {
	console.log(
		`Named entities: ${platform.namedEntities.map((e) => `【${e}】`).join(", ")}`,
	);
	for (const name of platform.namedEntities) {
		const entity = NAMED_ENTITIES.find((e) => e.name === name);
		if (entity) {
			console.log(`  ${entity.name}: ${entity.transform}`);
			if (entity.inputs.length > 0) {
				console.log(
					`    inputs: ${entity.inputs.map((i) => i.input).join(", ")}`,
				);
			}
			console.log(
				`    operator ports: ${entity.operatorPorts.join(", ")}`,
			);
		}
	}
}
console.log(`${"=".repeat(60)}\n`);

// Valid affixes
console.log(`Valid affixes (${result.validAffixes.length}):`);
const byCategory = {
	universal: result.validAffixes.filter((a) => a.category === "universal"),
	school: result.validAffixes.filter((a) => a.category === "school"),
	exclusive: result.validAffixes.filter((a) => a.category === "exclusive"),
};
for (const [cat, affixes] of Object.entries(byCategory)) {
	if (affixes.length === 0) continue;
	console.log(`\n  ${cat} (${affixes.length}):`);
	for (const a of affixes) {
		const req =
			a.requires === "free" ? "free" : a.requires.join("∨");
		const prov = a.provides.length > 0 ? a.provides.join(", ") : "—";
		const extra = a.book ? ` (${a.book})` : a.school ? ` [${a.school}]` : "";
		console.log(`    【${a.affix}】${extra}  provides=${prov}  requires=${req}`);
	}
}

// Pruned affixes
if (result.prunedAffixes.length > 0) {
	console.log(`\nPruned affixes (${result.prunedAffixes.length}):`);
	for (const a of result.prunedAffixes) {
		const req =
			a.requires === "free" ? "free" : a.requires.join("∨");
		const extra = a.book ? ` (${a.book})` : a.school ? ` [${a.school}]` : "";
		console.log(`    【${a.affix}】${extra}  requires=${req} — NOT SATISFIED`);
	}
}

// Chain discovery with all valid affixes
console.log(`\n${"─".repeat(60)}`);
console.log("Chain discovery (all valid affixes selected):\n");
const chains = discoverChains(platform, result.validAffixes);
for (const chain of chains) {
	const bridgeStr = chain.bridges.length > 0 ? ` via [${chain.bridges.join(", ")}]` : "";
	console.log(`  ${chain.source}${bridgeStr}:`);
	for (const node of chain.nodes) {
		console.log(`    → 【${node.affix}】`);
	}
}

console.log("");
