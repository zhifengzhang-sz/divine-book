/**
 * Embedding-based combo search — find combos similar to known-good ones.
 *
 * Approach:
 * 1. Compute factor vectors for known-good combos (reference points)
 * 2. Enumerate all legal combos for a platform
 * 3. Rank by weighted distance to reference
 * 4. Surface nearest neighbors as candidates worth testing
 *
 * Usage:
 *   bun app/embed-search.ts --platform 春黎剑阵                     # compare to known-good for this platform
 *   bun app/embed-search.ts --platform 春黎剑阵 --ref 心逐神随,灵犀九重  # custom reference combo
 *   bun app/embed-search.ts --platform 春黎剑阵 --top 20            # show top N
 *   bun app/embed-search.ts --list                                  # list known-good combos
 */

import { parseArgs } from "node:util";
import { filterByBinding } from "../lib/domain/chains.js";
import { getPlatform, PLATFORMS } from "../lib/domain/platforms.js";
import { buildFactorVector } from "../lib/model/model-data.js";
import type { AffixModel } from "../schemas/affix.model.js";

// ---------------------------------------------------------------------------
// Known-good combos — ground truth from pvp.zz.md (in-game validated)
// ---------------------------------------------------------------------------

interface KnownCombo {
	platform: string;
	slot: number;
	op1: string;
	op2: string;
	label: string;
}

const KNOWN_GOOD: KnownCombo[] = [
	{ platform: "春黎剑阵", slot: 1, op1: "心逐神随", op2: "灵犀九重", label: "Alpha strike (灵力 drain + M_synchro)" },
	{ platform: "皓月剑诀", slot: 2, op1: "玄心剑魄", op2: "无极剑阵", label: "%maxHP finisher + M_skill zone" },
	{ platform: "甲元仙符", slot: 3, op1: "奇能诡道", op2: "龙象护身", label: "Buff amplifier + debuff setup" },
	{ platform: "千锋聚灵剑", slot: 4, op1: "追神真诀", op2: "破釜沉舟", label: "%maxHP shred + amplifier" },
];

// ---------------------------------------------------------------------------
// Zone weights — scarce zones get higher weight
//
// Based on pvp.zz.md Affix Selection Framework:
// - D_res (灵力 attack) is highest value — separate attack line
// - M_skill, M_final are scarce multiplicative zones
// - M_dmg is crowded — low marginal value
// - M_synchro is independent outer wrapper
// ---------------------------------------------------------------------------

const ZONE_WEIGHTS: Record<string, number> = {
	D_res: 10,       // Tier 1: separate attack line on 灵力
	M_synchro: 8,    // Tier 1: outer wrapper on ALL effects
	M_skill: 6,      // Tier 2: scarce multiplicative zone
	M_final: 6,      // Tier 2: very scarce
	D_ortho: 5,      // Tier 2: %maxHP / true damage bypasses defense
	S_coeff: 3,      // Tier 4: ATK scaling (additive with base)
	M_dmg: 2,        // Tier 4: crowded zone
	D_base: 1,       // Tier 4: base damage (always present)
	D_flat: 1,       // Tier 4: flat extra
	sigma_R: 3,      // Variance from resonance (matters for consistency)
	H_A: 2,          // Defensive
	DR_A: 2,         // Defensive
	S_A: 2,          // Defensive
	H_red: 3,        // Offensive utility — anti-heal
};

// ---------------------------------------------------------------------------
// Weighted distance
// ---------------------------------------------------------------------------

function factorVector(f: AffixModel): [string, number][] {
	return [
		["D_base", f.D_base],
		["D_flat", f.D_flat],
		["S_coeff", f.S_coeff],
		["M_dmg", f.M_dmg],
		["M_skill", f.M_skill],
		["M_final", f.M_final],
		["D_res", (f.D_res - 1) * 100],       // normalize: 1 = no resonance
		["sigma_R", f.sigma_R * 100],
		["M_synchro", (f.M_synchro - 1) * 100], // normalize: 1 = no synchrony
		["D_ortho", f.D_ortho],
		["H_A", f.H_A],
		["DR_A", f.DR_A],
		["S_A", f.S_A],
		["H_red", f.H_red],
	];
}

function weightedDistance(a: AffixModel, b: AffixModel): number {
	const va = factorVector(a);
	const vb = factorVector(b);
	let sum = 0;
	for (let i = 0; i < va.length; i++) {
		const w = ZONE_WEIGHTS[va[i][0]] ?? 1;
		const d = va[i][1] - vb[i][1];
		sum += w * d * d;
	}
	return Math.sqrt(sum);
}

/**
 * Cosine similarity between two factor vectors (weighted).
 * Returns -1 to 1 where 1 = identical direction.
 */
function cosineSimilarity(a: AffixModel, b: AffixModel): number {
	const va = factorVector(a);
	const vb = factorVector(b);
	let dot = 0, normA = 0, normB = 0;
	for (let i = 0; i < va.length; i++) {
		const w = ZONE_WEIGHTS[va[i][0]] ?? 1;
		const ai = w * va[i][1];
		const bi = w * vb[i][1];
		dot += ai * bi;
		normA += ai * ai;
		normB += bi * bi;
	}
	if (normA === 0 || normB === 0) return 0;
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------------------------------------------------------------------
// Combo search
// ---------------------------------------------------------------------------

interface ScoredCombo {
	op1: string;
	op2: string;
	distance: number;
	cosine: number;
	factors: AffixModel;
}

function searchCombos(
	platformName: string,
	refVector: AffixModel,
	topN: number,
): ScoredCombo[] {
	const platform = getPlatform(platformName);
	if (!platform) throw new Error(`Unknown platform: ${platformName}`);

	const { validAffixes } = filterByBinding(platform);

	// Filter to school-compatible affixes
	const pool = validAffixes.filter(
		(a) => a.category !== "school" || a.school === platform.school,
	);

	const results: ScoredCombo[] = [];

	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			const op1 = pool[i].affix;
			const op2 = pool[j].affix;
			const factors = buildFactorVector(platformName, op1, op2);
			const distance = weightedDistance(factors, refVector);
			const cosine = cosineSimilarity(factors, refVector);

			results.push({ op1, op2, distance, cosine, factors });
		}
	}

	// Sort by cosine similarity (higher = more similar direction)
	results.sort((a, b) => b.cosine - a.cosine);

	return results.slice(0, topN);
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function formatDelta(combo: AffixModel, ref: AffixModel): string {
	const parts: string[] = [];
	const show = (name: string, cv: number, rv: number) => {
		const d = cv - rv;
		if (Math.abs(d) < 0.01) return;
		const sign = d > 0 ? "+" : "";
		parts.push(`${name}${sign}${Math.round(d)}`);
	};
	show("D_base", combo.D_base, ref.D_base);
	show("S", combo.S_coeff, ref.S_coeff);
	show("M_dmg", combo.M_dmg, ref.M_dmg);
	show("M_skill", combo.M_skill, ref.M_skill);
	show("M_final", combo.M_final, ref.M_final);
	show("D_res", (combo.D_res - 1) * 100, (ref.D_res - 1) * 100);
	show("M_syn", (combo.M_synchro - 1) * 100, (ref.M_synchro - 1) * 100);
	show("D_orth", combo.D_ortho, ref.D_ortho);
	show("H_red", combo.H_red, ref.H_red);
	show("DR", combo.DR_A, ref.DR_A);
	return parts.join("  ") || "(identical)";
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values } = parseArgs({
	options: {
		platform: { type: "string", short: "p" },
		ref: { type: "string", short: "r" },
		top: { type: "string", short: "n" },
		list: { type: "boolean", short: "l" },
	},
});

if (values.list) {
	console.log("Known-good combos (from pvp.zz.md):\n");
	for (const k of KNOWN_GOOD) {
		const factors = buildFactorVector(k.platform, k.op1, k.op2);
		console.log(`  Slot ${k.slot}: ${k.platform} + 【${k.op1}】+ 【${k.op2}】`);
		console.log(`    ${k.label}`);
		const v = factorVector(factors);
		const nonzero = v.filter(([, val]) => Math.abs(val) > 0.01);
		console.log(`    vector: ${nonzero.map(([k, v]) => `${k}=${Math.round(v)}`).join("  ")}`);
		console.log();
	}
	process.exit(0);
}

if (!values.platform) {
	console.error("Usage: bun app/embed-search.ts --platform <book_name>");
	console.error("       bun app/embed-search.ts --platform <book_name> --ref affix1,affix2");
	console.error("       bun app/embed-search.ts --list");
	process.exit(1);
}

const topN = values.top ? parseInt(values.top, 10) : 15;
const platformName = values.platform;

// Build reference vector
let refVector: AffixModel;
let refLabel: string;

if (values.ref) {
	const [op1, op2] = values.ref.split(",");
	refVector = buildFactorVector(platformName, op1, op2);
	refLabel = `【${op1}】+ 【${op2}】`;
} else {
	const known = KNOWN_GOOD.find((k) => k.platform === platformName);
	if (!known) {
		console.error(`No known-good combo for ${platformName}. Use --ref to specify one.`);
		console.error("Known platforms:", KNOWN_GOOD.map((k) => k.platform).join(", "));
		process.exit(1);
	}
	refVector = buildFactorVector(known.platform, known.op1, known.op2);
	refLabel = `【${known.op1}】+ 【${known.op2}】 (${known.label})`;
}

console.log(`\n${"═".repeat(70)}`);
console.log(`Embedding search: ${platformName}`);
console.log(`Reference: ${refLabel}`);
console.log(`${"═".repeat(70)}\n`);

const results = searchCombos(platformName, refVector, topN);

console.log(`Top ${results.length} by cosine similarity:\n`);
console.log(`${"#".padStart(3)}  ${"cosine".padStart(6)}  ${"combo".padEnd(40)}  delta vs reference`);
console.log(`${"─".repeat(90)}`);

for (let i = 0; i < results.length; i++) {
	const r = results[i];
	const combo = `【${r.op1}】+ 【${r.op2}】`;
	const delta = formatDelta(r.factors, refVector);
	console.log(
		`${String(i + 1).padStart(3)}  ${r.cosine.toFixed(4).padStart(6)}  ${combo.padEnd(40)}  ${delta}`,
	);
}

console.log();
