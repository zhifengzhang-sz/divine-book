/**
 * Function combo enumerator — generates combo tables per function × platform.
 *
 * Usage:
 *   bun app/function-combos.ts                          # all functions, all platforms
 *   bun app/function-combos.ts --fn F_burst             # one function, all qualifying platforms
 *   bun app/function-combos.ts --fn F_burst --platform 春黎剑阵  # one function, one platform
 *   bun app/function-combos.ts --fn F_burst --top 10    # limit to top N combos
 *   bun app/function-combos.ts --list                   # list all functions
 */

import { parseArgs } from "node:util";
import {
	FUNCTIONS,
	enumerateCombos,
	getQualifyingPlatforms,
} from "../lib/domain/functions.js";
import { getPlatform } from "../lib/domain/platforms.js";
import type { Combo } from "../lib/domain/functions.js";
import { Zone } from "../lib/domain/enums.js";

const { values } = parseArgs({
	options: {
		fn: { type: "string", short: "f" },
		platform: { type: "string", short: "p" },
		top: { type: "string", short: "n" },
		list: { type: "boolean", short: "l" },
		strict: { type: "boolean", short: "s" },
	},
});

if (values.list) {
	console.log("Functions:\n");
	for (const fn of FUNCTIONS) {
		const platforms = getQualifyingPlatforms(fn);
		const platStr =
			fn.qualifyingPlatforms.length > 0
				? fn.qualifyingPlatforms.join(", ")
				: "all";
		console.log(`  ${fn.id}: ${fn.purpose}`);
		console.log(`    core: ${fn.coreEffects.join(", ")}`);
		console.log(`    platforms: ${platStr} (${platforms.length})`);
		console.log();
	}
	process.exit(0);
}

const topN = values.top ? parseInt(values.top, 10) : 20;

// Select functions
const fns = values.fn
	? FUNCTIONS.filter((f) => f.id === values.fn)
	: FUNCTIONS;

if (fns.length === 0) {
	console.error(`Unknown function: ${values.fn}`);
	console.error("Use --list to see available functions.");
	process.exit(1);
}

function formatZones(zones: Set<Zone>): string {
	return [...zones].join("+");
}

function formatCombo(c: Combo, rank: number): string {
	const r1 = c.op1Role === "core" ? "D" : c.op1Role === "amplifier" ? "A" : "·";
	const r2 = c.op2Role === "core" ? "D" : c.op2Role === "amplifier" ? "A" : "·";
	const carrier1 = c.op1.book ? `(${c.op1.book})` : `[${c.op1.category}]`;
	const carrier2 = c.op2.book ? `(${c.op2.book})` : `[${c.op2.category}]`;
	const req1 =
		c.op1.requires === "free" ? "" : ` req:${(c.op1.requires as string[]).join("∨")}`;
	const req2 =
		c.op2.requires === "free" ? "" : ` req:${(c.op2.requires as string[]).join("∨")}`;
	const rel =
		c.relationship === "cross-cutting"
			? "×ALL"
			: c.relationship === "multiplicative"
				? "×MUL"
				: c.relationship === "additive"
					? "+ADD"
					: "INDP";

	return `| ${String(rank).padStart(2)} | 【${c.op1.affix}】(${r1}) ${carrier1}${req1} | 【${c.op2.affix}】(${r2}) ${carrier2}${req2} | ${rel} | ${c.zoneCount} | ${formatZones(c.zones)} |`;
}

// Run
for (const fn of fns) {
	const platforms = values.platform
		? [getPlatform(values.platform)!].filter(Boolean)
		: getQualifyingPlatforms(fn);

	if (platforms.length === 0) {
		console.error(
			`No qualifying platforms for ${fn.id}${values.platform ? ` (${values.platform})` : ""}`,
		);
		continue;
	}

	console.log(`\n${"═".repeat(70)}`);
	console.log(`${fn.id}: ${fn.purpose}`);
	console.log(`Core effects: ${fn.coreEffects.join(", ")}`);
	console.log(`${"═".repeat(70)}`);

	for (const platform of platforms) {
		const combos = enumerateCombos(fn, platform, values.strict);
		const shown = combos.slice(0, topN);

		console.log(`\n### ${platform.book} (${platform.school})`);
		console.log(`Valid combos: ${combos.length} (showing top ${shown.length})`);
		console.log();
		console.log(
			`|  # | Op1 | Op2 | Rel | Zones | Zone set |`,
		);
		console.log(
			`|:---|:----|:----|:----|:------|:---------|`,
		);
		for (let i = 0; i < shown.length; i++) {
			console.log(formatCombo(shown[i], i + 1));
		}

		// Summary stats
		const crossCut = combos.filter(
			(c) => c.relationship === "cross-cutting",
		).length;
		const mult = combos.filter(
			(c) => c.relationship === "multiplicative",
		).length;
		const add = combos.filter(
			(c) => c.relationship === "additive",
		).length;
		const indp = combos.filter(
			(c) => c.relationship === "independent",
		).length;
		console.log(
			`\nSummary: ${crossCut} cross-cutting, ${mult} multiplicative, ${add} additive, ${indp} independent`,
		);
	}
}

console.log();
