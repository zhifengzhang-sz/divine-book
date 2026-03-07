/**
 * Combo clustering + binding quality analysis.
 *
 * 1. Clusters all legal combos by factor vector similarity (k-means)
 *    → reveals distinct strategic archetypes for a platform
 * 2. Scores each combo's binding quality at the effect level:
 *    how many outputs are activated, how many provisions are consumed
 *
 * Usage:
 *   bun app/combo-cluster.ts --platform 春黎剑阵
 *   bun app/combo-cluster.ts --platform 春黎剑阵 --k 6 --top 5
 */

import { parseArgs } from "node:util";
import { filterByBinding } from "../lib/domain/chains.js";
import { getPlatform } from "../lib/domain/platforms.js";
import { buildFactorVector, buildBookModel } from "../lib/model/model-data.js";
import type { AffixBinding } from "../lib/domain/bindings.js";
import { isComboValid, computeBindingQuality, type BindingQualityResult } from "../lib/domain/binding-quality.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComboEntry {
	op1: string;
	op2: string;
	b1: AffixBinding;
	b2: AffixBinding;
	vec: number[];
	rawDelta: Record<string, number>;
	D_skill: number;
	D_res: number;
	bq: BindingQualityResult;
	score: number;
	cluster: number;
}

// ---------------------------------------------------------------------------
// Factor vector extraction (operator delta)
// ---------------------------------------------------------------------------

const AXES = [
	"S_coeff", "M_dmg", "M_skill", "M_final",
	"D_res", "sigma_R", "M_synchro",
	"D_ortho", "H_A", "DR_A", "H_red",
] as const;

function operatorDelta(platform: string, op1: string, op2: string): Record<string, number> {
	const base = buildFactorVector(platform, "", "");
	const combo = buildFactorVector(platform, op1, op2);
	return {
		S_coeff: combo.S_coeff - base.S_coeff,
		M_dmg: combo.M_dmg - base.M_dmg,
		M_skill: combo.M_skill - base.M_skill,
		M_final: combo.M_final - base.M_final,
		D_res: (combo.D_res - base.D_res) * 100,
		sigma_R: (combo.sigma_R - base.sigma_R) * 100,
		M_synchro: (combo.M_synchro - base.M_synchro) * 100,
		D_ortho: combo.D_ortho - base.D_ortho,
		H_A: combo.H_A - base.H_A,
		DR_A: combo.DR_A - base.DR_A,
		H_red: combo.H_red - base.H_red,
	};
}

function deltaToVec(d: Record<string, number>): number[] {
	return AXES.map(k => d[k] ?? 0);
}

// ---------------------------------------------------------------------------
// K-means clustering
// ---------------------------------------------------------------------------

function standardize(vecs: number[][]): number[][] {
	const n = vecs.length;
	const dims = vecs[0].length;
	const means = new Array(dims).fill(0);
	const stds = new Array(dims).fill(0);
	for (const v of vecs) for (let d = 0; d < dims; d++) means[d] += v[d];
	for (let d = 0; d < dims; d++) means[d] /= n;
	for (const v of vecs) for (let d = 0; d < dims; d++) stds[d] += (v[d] - means[d]) ** 2;
	for (let d = 0; d < dims; d++) stds[d] = Math.sqrt(stds[d] / n) || 1;
	return vecs.map(v => v.map((x, d) => (x - means[d]) / stds[d]));
}

function euclidean(a: number[], b: number[]): number {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
	return Math.sqrt(s);
}

function kmeans(vecs: number[][], k: number, maxIter = 50) {
	const n = vecs.length;
	const dims = vecs[0].length;
	const centroids: number[][] = [];
	centroids.push([...vecs[Math.floor(Math.random() * n)]]);
	for (let c = 1; c < k; c++) {
		const dists = vecs.map(v => Math.min(...centroids.map(ctr => euclidean(v, ctr))));
		const totalDist = dists.reduce((a, b) => a + b, 0);
		let r = Math.random() * totalDist;
		for (let i = 0; i < n; i++) {
			r -= dists[i];
			if (r <= 0) { centroids.push([...vecs[i]]); break; }
		}
		if (centroids.length <= c) centroids.push([...vecs[Math.floor(Math.random() * n)]]);
	}
	const assignments = new Array(n).fill(0);
	for (let iter = 0; iter < maxIter; iter++) {
		let changed = false;
		for (let i = 0; i < n; i++) {
			let bestDist = Infinity, bestC = 0;
			for (let c = 0; c < k; c++) {
				const d = euclidean(vecs[i], centroids[c]);
				if (d < bestDist) { bestDist = d; bestC = c; }
			}
			if (assignments[i] !== bestC) { assignments[i] = bestC; changed = true; }
		}
		if (!changed) break;
		for (let c = 0; c < k; c++) {
			const members = vecs.filter((_, i) => assignments[i] === c);
			if (members.length === 0) continue;
			for (let d = 0; d < dims; d++) {
				centroids[c][d] = members.reduce((s, v) => s + v[d], 0) / members.length;
			}
		}
	}
	let inertia = 0;
	for (let i = 0; i < n; i++) inertia += euclidean(vecs[i], centroids[assignments[i]]) ** 2;
	return { assignments, centroids, inertia };
}

function kmeansStable(vecs: number[][], k: number, runs = 10) {
	let best: ReturnType<typeof kmeans> | null = null;
	for (let r = 0; r < runs; r++) {
		const result = kmeans(vecs, k);
		if (!best || result.inertia < best.inertia) best = result;
	}
	return best!;
}

function detectK(vecs: number[][], maxK = 10): number {
	const inertias: number[] = [];
	for (let k = 2; k <= Math.min(maxK, Math.floor(vecs.length / 3)); k++) {
		inertias.push(kmeansStable(vecs, k, 5).inertia);
	}
	let bestK = 2, maxDrop = 0;
	for (let i = 1; i < inertias.length - 1; i++) {
		const dropBefore = inertias[i - 1] - inertias[i];
		const dropAfter = inertias[i] - inertias[i + 1];
		const ratio = dropAfter > 0 ? dropBefore / dropAfter : dropBefore;
		if (ratio > maxDrop) { maxDrop = ratio; bestK = i + 2; }
	}
	return bestK;
}

// ---------------------------------------------------------------------------
// Label clusters by dominant axes
// ---------------------------------------------------------------------------

function labelCluster(combos: ComboEntry[]): string {
	const avgAbs: Record<string, number> = {};
	for (const k of AXES) {
		avgAbs[k] = combos.reduce((s, c) => s + Math.abs(c.rawDelta[k] ?? 0), 0) / combos.length;
	}
	const ranked = [...AXES].sort((a, b) => avgAbs[b] - avgAbs[a]);
	const dominant = ranked.filter(k => avgAbs[k] > 0.1).slice(0, 3);
	if (dominant.length === 0) return "Baseline (minimal contribution)";
	return dominant.join(" + ");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { values } = parseArgs({
	options: {
		platform: { type: "string", short: "p" },
		k: { type: "string" },
		top: { type: "string", short: "n" },
	},
});

if (!values.platform) {
	console.error("Usage: bun app/combo-cluster.ts --platform <book_name> [--k N] [--top 5]");
	process.exit(1);
}

const platformName = values.platform;
const topPerCluster = values.top ? parseInt(values.top, 10) : 5;
const platform = getPlatform(platformName)!;
const { validAffixes } = filterByBinding(platform);
const pool = validAffixes.filter(a => a.category !== "school" || a.school === platform.school);

const baseBook = buildBookModel(platformName, "", "", 1);
const baseline_D = baseBook.D_skill;

// Enumerate valid combos
console.log(`Enumerating combos for ${platformName}...`);
const combos: ComboEntry[] = [];
let skippedBinding = 0;

for (let i = 0; i < pool.length; i++) {
	for (let j = i + 1; j < pool.length; j++) {
		const b1 = pool[i];
		const b2 = pool[j];
		if (!isComboValid(b1, b2, platform)) { skippedBinding++; continue; }

		const rawDelta = operatorDelta(platformName, b1.affix, b2.affix);
		const vec = deltaToVec(rawDelta);
		const book = buildBookModel(platformName, b1.affix, b2.affix, 1);
		const factors = buildFactorVector(platformName, b1.affix, b2.affix);
		const bq = computeBindingQuality(b1, b2, platform);
		const D_ratio = baseline_D > 0 ? book.D_skill / baseline_D : 0;

		const rawScore =
			D_ratio * 40 +
			(book.D_res - 1) * 100 * 30 +
			book.D_ortho * 0.1 +
			(factors.M_synchro - 1) * 100 * 20 +
			book.H_red * 5;
		// BQ scales score: fully utilized combo gets full credit
		const score = rawScore * (0.5 + bq.quality * 0.5);

		combos.push({
			op1: b1.affix, op2: b2.affix,
			b1, b2, vec, rawDelta,
			D_skill: book.D_skill,
			D_res: book.D_res,
			bq, score,
			cluster: -1,
		});
	}
}

console.log(`${combos.length} valid combos (${skippedBinding} rejected by per-combo binding check).`);

// Cluster
const rawVecs = combos.map(c => c.vec);
const normVecs = standardize(rawVecs);
const k = values.k ? parseInt(values.k, 10) : detectK(normVecs);
console.log(`Clustering into k=${k} groups...\n`);

const result = kmeansStable(normVecs, k, 20);
for (let i = 0; i < combos.length; i++) combos[i].cluster = result.assignments[i];

// Report
console.log(`${"═".repeat(100)}`);
console.log(`Combo clusters: ${platformName} (k=${k}, ${combos.length} combos)`);
console.log(`Baseline D_skill: ${baseline_D.toFixed(0)}`);
console.log(`${"═".repeat(100)}\n`);

for (let c = 0; c < k; c++) {
	const members = combos.filter(e => e.cluster === c);
	if (members.length === 0) continue;
	members.sort((a, b) => b.score - a.score);
	const label = labelCluster(members);

	console.log(`── Cluster ${c + 1}: ${label} (${members.length} combos) ──`);
	console.log(
		`${"#".padStart(3)}  ${"score".padStart(7)}  ${"BQ".padStart(5)}  ${"pFit".padStart(5)}  ${"zCov".padStart(5)}  ${"chain".padStart(6)}  ${"zones".padStart(5)}  ${"D_skill".padStart(10)}  combo`
	);

	const showN = Math.min(topPerCluster, members.length);
	for (let i = 0; i < showN; i++) {
		const e = members[i];
		const ratio = baseline_D > 0 ? (e.D_skill / baseline_D).toFixed(2) : "?";
		console.log(
			`${String(i + 1).padStart(3)}  ${e.score.toFixed(1).padStart(7)}  ${e.bq.quality.toFixed(2).padStart(5)}  ${e.bq.platformFit.toFixed(2).padStart(5)}  ${e.bq.zoneCoverage.toFixed(2).padStart(5)}  ${String(e.bq.chainFedOutputs).padStart(3)}/${e.bq.totalOutputs.toString().padStart(2)}   ${String(e.bq.distinctZones).padStart(4)}   ${e.D_skill.toFixed(0).padStart(7)}(${ratio})  【${e.op1}】+【${e.op2}】`
		);
	}
	console.log();
}

// Summary: best per cluster
console.log(`── Summary: Best per cluster ──`);
for (let c = 0; c < k; c++) {
	const members = combos.filter(e => e.cluster === c);
	if (members.length === 0) continue;
	members.sort((a, b) => b.score - a.score);
	const best = members[0];
	const label = labelCluster(members);
	console.log(`  C${c + 1} (${label}): 【${best.op1}】+【${best.op2}】 score=${best.score.toFixed(1)} BQ=${best.bq.quality.toFixed(2)} pFit=${best.bq.platformFit.toFixed(2)} zones=${best.bq.distinctZones}`);
}

// Highlight highest BQ combos across all clusters
console.log(`\n── Top 10 by binding quality ──`);
const byBQ = [...combos].sort((a, b) => b.bq.quality - a.bq.quality);
console.log(
	`${"#".padStart(3)}  ${"BQ".padStart(5)}  ${"pFit".padStart(5)}  ${"zCov".padStart(5)}  ${"chain".padStart(6)}  ${"zones".padStart(5)}  ${"score".padStart(7)}  combo`
);
for (let i = 0; i < Math.min(10, byBQ.length); i++) {
	const e = byBQ[i];
	console.log(
		`${String(i + 1).padStart(3)}  ${e.bq.quality.toFixed(2).padStart(5)}  ${e.bq.platformFit.toFixed(2).padStart(5)}  ${e.bq.zoneCoverage.toFixed(2).padStart(5)}  ${String(e.bq.chainFedOutputs).padStart(3)}/${e.bq.totalOutputs.toString().padStart(2)}   ${String(e.bq.distinctZones).padStart(4)}   ${e.score.toFixed(1).padStart(7)}  【${e.op1}】+【${e.op2}】`
	);
}
console.log();
