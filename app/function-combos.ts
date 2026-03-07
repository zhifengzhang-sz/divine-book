/**
 * Function combo enumerator — generates combo tables per function × platform.
 *
 * Usage:
 *   bun app/function-combos.ts                          # all functions, all platforms
 *   bun app/function-combos.ts --fn F_burst             # one function, all qualifying platforms
 *   bun app/function-combos.ts --fn F_burst --platform 春黎剑阵  # one function, one platform
 *   bun app/function-combos.ts --fn F_burst --top 10    # top N affix blocks
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

const topN = values.top ? parseInt(values.top, 10) : 10;

// Select functions
const fns = values.fn
	? FUNCTIONS.filter((f) => f.id === values.fn)
	: FUNCTIONS;

if (fns.length === 0) {
	console.error(`Unknown function: ${values.fn}`);
	console.error("Use --list to see available functions.");
	process.exit(1);
}

/** Format non-zero/non-default factors as a compact string (all in % units) */
function formatFactors(c: Combo): string {
	const f = c.factors;
	const parts: string[] = [];
	if (f.D_base) parts.push(`D_base=${f.D_base}`);
	if (f.D_flat) parts.push(`D_flat=${f.D_flat}`);
	if (f.S_coeff) parts.push(`S=${f.S_coeff}`);
	if (f.M_dmg) parts.push(`M_dmg=${f.M_dmg}`);
	if (f.M_skill) parts.push(`M_skill=${f.M_skill}`);
	if (f.M_final) parts.push(`M_final=${f.M_final}`);
	// D_res and M_synchro stored as raw multipliers — display as % for consistency
	if (f.D_res !== 1) parts.push(`D_res=${Math.round(f.D_res * 100)}`);
	if (f.sigma_R) parts.push(`σ=${Math.round(f.sigma_R * 100)}`);
	if (f.M_synchro !== 1) parts.push(`M_syn=${Math.round(f.M_synchro * 100)}`);
	if (f.D_ortho) parts.push(`D_orth=${f.D_ortho}`);
	if (f.H_A) parts.push(`H=${f.H_A}`);
	if (f.DR_A) parts.push(`DR=${f.DR_A}`);
	if (f.S_A) parts.push(`S_A=${f.S_A}`);
	if (f.H_red) parts.push(`H_red=${f.H_red}`);
	return parts.join(" ");
}

/** Find the most frequent affix in the top of a combo pool */
function findDominant(pool: Combo[]): string {
	const top = pool.slice(0, Math.min(20, pool.length));
	const freq = new Map<string, number>();
	for (const c of top) {
		freq.set(c.op1.affix, (freq.get(c.op1.affix) ?? 0) + 1);
		freq.set(c.op2.affix, (freq.get(c.op2.affix) ?? 0) + 1);
	}
	return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
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
		const all = enumerateCombos(fn, platform, values.strict);

		console.log(`\n### ${platform.book} (${platform.school})`);
		console.log(`Valid combos: ${all.length}\n`);

		// Iterative collapse: find dominant affix, show best pair, remove, repeat
		let pool = all;
		for (let rank = 1; rank <= topN; rank++) {
			if (pool.length === 0) break;

			const dominant = findDominant(pool);
			const blockSize = pool.filter(
				(c) => c.op1.affix === dominant || c.op2.affix === dominant,
			).length;
			const best = pool.find(
				(c) => c.op1.affix === dominant || c.op2.affix === dominant,
			)!;
			const partner =
				best.op1.affix === dominant ? best.op2.affix : best.op1.affix;

			const r1 = best.op1Role === "core" ? "D" : best.op1Role === "amplifier" ? "A" : "·";
			const r2 = best.op2Role === "core" ? "D" : best.op2Role === "amplifier" ? "A" : "·";

			console.log(
				`${String(rank).padStart(2)}. 【${dominant}】+ 【${partner}】  (${blockSize} combos)`,
			);
			console.log(`    ${formatFactors(best)}`);
			console.log();

			// Remove dominant affix from pool
			pool = pool.filter(
				(c) => c.op1.affix !== dominant && c.op2.affix !== dominant,
			);
		}
	}
}

console.log();
