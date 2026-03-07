/**
 * Combo ranking — absolute scoring of all legal combos.
 *
 * Unlike embed-search (cosine similarity to a reference), this ranks combos
 * by their absolute contribution to damage output. The score captures the
 * multiplicative nature of the damage model:
 *
 *   score = D_skill_ratio × w_skill + D_res × w_res + D_ortho × w_ortho + ...
 *
 * where D_skill_ratio = combo_D_skill / baseline_D_skill.
 *
 * Usage:
 *   bun app/combo-rank.ts --platform 春黎剑阵
 *   bun app/combo-rank.ts --platform 春黎剑阵 --top 20 --slot 1
 */

import { parseArgs } from "node:util";
import { filterByBinding } from "../lib/domain/chains.js";
import { getPlatform } from "../lib/domain/platforms.js";
import { buildBookModel, buildFactorVector } from "../lib/model/model-data.js";
import { isComboValid } from "../lib/domain/binding-quality.js";

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

interface RankedCombo {
	op1: string;
	op2: string;
	D_skill: number;
	D_res: number;
	D_ortho: number;
	M_synchro: number;
	H_red: number;
	H_A: number;
	DR_A: number;
	score: number;
}

/**
 * Composite score — weighted sum of normalized contributions.
 *
 * Why not just D_skill?
 * - D_res (灵力 attack) is a separate damage channel not captured in D_skill
 * - D_ortho (%maxHP, true damage) bypasses defense entirely
 * - H_red (anti-heal) reduces effective HP, amplifying all damage
 * - M_synchro wraps ALL effects (already in D_skill but deserves bonus for cross-slot carry)
 *
 * Weights reflect strategic value from pvp.zz.md framework.
 */
function compositeScore(
	D_skill_ratio: number,
	D_res: number,
	D_ortho: number,
	M_synchro: number,
	H_red: number,
	H_A: number,
	DR_A: number,
): number {
	return (
		D_skill_ratio * 40 +       // 气血 chain output (core value)
		(D_res - 1) * 100 * 30 +   // 灵力 attack line (very high value)
		D_ortho * 0.1 +            // %maxHP / true damage (scaled by magnitude)
		(M_synchro - 1) * 100 * 20 + // synchrony bonus (cross-slot carry)
		H_red * 5 +                // anti-heal utility
		H_A * 2 +                  // healing (survival)
		DR_A * 2                   // damage reduction (survival)
	);
}

// ---------------------------------------------------------------------------
// Enumerate and rank
// ---------------------------------------------------------------------------

function rankCombos(platformName: string, slot: number, topN: number): {
	combos: RankedCombo[];
	baseline_D_skill: number;
} {
	const platform = getPlatform(platformName)!;
	const { validAffixes } = filterByBinding(platform);
	const pool = validAffixes.filter(a => a.category !== "school" || a.school === platform.school);

	// Baseline: platform with no operator affixes
	const baseBook = buildBookModel(platformName, "", "", slot);
	const baseline_D_skill = baseBook.D_skill;

	const results: RankedCombo[] = [];
	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			// Per-combo binding check
			if (!isComboValid(pool[i], pool[j], platform)) continue;

			const op1 = pool[i].affix;
			const op2 = pool[j].affix;
			const book = buildBookModel(platformName, op1, op2, slot);
			const factors = buildFactorVector(platformName, op1, op2);

			const D_skill_ratio = baseline_D_skill > 0 ? book.D_skill / baseline_D_skill : 0;

			const combo: RankedCombo = {
				op1, op2,
				D_skill: book.D_skill,
				D_res: book.D_res,
				D_ortho: book.D_ortho,
				M_synchro: factors.M_synchro,
				H_red: book.H_red,
				H_A: book.H_A,
				DR_A: book.DR_A,
				score: compositeScore(D_skill_ratio, book.D_res, book.D_ortho, factors.M_synchro, book.H_red, book.H_A, book.DR_A),
			};
			results.push(combo);
		}
	}

	results.sort((a, b) => b.score - a.score);
	return { combos: results.slice(0, topN), baseline_D_skill };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values } = parseArgs({
	options: {
		platform: { type: "string", short: "p" },
		top: { type: "string", short: "n" },
		slot: { type: "string", short: "s" },
	},
});

if (!values.platform) {
	console.error("Usage: bun app/combo-rank.ts --platform <book_name> [--top N] [--slot 1]");
	process.exit(1);
}

const platformName = values.platform;
const topN = values.top ? parseInt(values.top, 10) : 30;
const slot = values.slot ? parseInt(values.slot, 10) : 1;

const { combos, baseline_D_skill } = rankCombos(platformName, slot, topN);

console.log(`\n${"═".repeat(90)}`);
console.log(`Combo ranking: ${platformName} (slot ${slot})`);
console.log(`Baseline D_skill: ${baseline_D_skill.toFixed(0)} (no operators)`);
console.log(`${"═".repeat(90)}\n`);

console.log(
	`${"#".padStart(3)}  ${"score".padStart(7)}  ${"D_skill".padStart(10)}  ${"D_res".padStart(6)}  ${"M_syn".padStart(6)}  ${"D_orth".padStart(6)}  ${"H_red".padStart(6)}  combo`
);
console.log(`${"─".repeat(90)}`);

for (let i = 0; i < combos.length; i++) {
	const c = combos[i];
	const ratio = baseline_D_skill > 0 ? (c.D_skill / baseline_D_skill).toFixed(2) : "?";
	console.log(
		`${String(i + 1).padStart(3)}  ${c.score.toFixed(1).padStart(7)}  ${c.D_skill.toFixed(0).padStart(7)}(${ratio})  ${((c.D_res - 1) * 100).toFixed(0).padStart(5)}%  ${((c.M_synchro - 1) * 100).toFixed(0).padStart(5)}%  ${c.D_ortho.toFixed(0).padStart(6)}  ${c.H_red.toFixed(0).padStart(6)}  【${c.op1}】+【${c.op2}】`
	);
}

console.log();
