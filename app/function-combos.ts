#!/usr/bin/env bun
/**
 * Function-combo CLI — rank aux-affix pairs for a combat function.
 *
 * Usage:
 *   bun app/function-combos.ts --catalog
 *   bun app/function-combos.ts --fn F_burst --platform 皓月剑诀 --top 5
 *   bun app/function-combos.ts --fn F_burst --platform 皓月剑诀 --top 5 --json
 */

import { listCatalog, rankCombos } from "../lib/construct/function-combos.js";
import { loadAffixesYaml, loadBooksYaml } from "../lib/sim/config.js";

// ── Parse args ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
	const idx = args.indexOf(`--${name}`);
	if (idx === -1) return undefined;
	return args[idx + 1];
}
const hasFlag = (name: string) => args.includes(`--${name}`);

// ── Catalog mode ───────────────────────────────────────────────────

if (hasFlag("catalog")) {
	const catalog = listCatalog();
	for (const [id, fn] of Object.entries(catalog)) {
		console.log(`\n${id} — ${fn.name} [${fn.category}]`);
		console.log(`  Platforms:  ${fn.nativePlatforms.join(", ") || "(none)"}`);
		console.log(`  Core aux:   ${fn.coreAux.join(", ") || "(none)"}`);
		console.log(`  Amplifiers: ${fn.amplifierAux.join(", ") || "(none)"}`);
	}
	process.exit(0);
}

// ── Ranking mode ───────────────────────────────────────────────────

const fnId = getArg("fn");
const platformId = getArg("platform");

if (!fnId || !platformId) {
	console.error(
		"Usage: bun app/function-combos.ts --fn <fnId> --platform <book> [--top N] [--json]",
	);
	console.error("       bun app/function-combos.ts --catalog");
	process.exit(1);
}

const topN = Number(getArg("top") ?? "10");
const booksYaml = loadBooksYaml();
const affixesYaml = loadAffixesYaml();

const combos = rankCombos(fnId, platformId, booksYaml, affixesYaml, topN);

if (hasFlag("json")) {
	console.log(JSON.stringify(combos, null, 2));
	process.exit(0);
}

// Text table
console.log(
	`\nTop ${topN} combos for ${fnId} on ${platformId}:\n`,
);
console.log(
	`${"Rank".padEnd(6)}${"Aux 1 (type)".padEnd(24)}${"Aux 2 (type)".padEnd(24)}${"Score".padEnd(8)}Functions`,
);
console.log("-".repeat(90));

for (let i = 0; i < combos.length; i++) {
	const c = combos[i];
	const a1 = `${c.aux1.name} (${c.aux1.kind})`;
	const a2 = `${c.aux2.name} (${c.aux2.kind})`;
	const fns = c.functionCoverage.join(", ");
	console.log(
		`${String(i + 1).padEnd(6)}${a1.padEnd(24)}${a2.padEnd(24)}${String(c.score).padEnd(8)}${fns}`,
	);
}
