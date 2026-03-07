/**
 * Radar chart visualization of embedding search results.
 *
 * Generates an HTML file with a Chart.js radar chart comparing
 * combos similar to a known-good reference.
 *
 * Usage:
 *   bun app/embed-radar.ts --platform 春黎剑阵
 *   bun app/embed-radar.ts --platform 春黎剑阵 --ref 心逐神随,灵犀九重
 *   bun app/embed-radar.ts --platform 春黎剑阵 --top 10 --threshold 0.98
 */

import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { filterByBinding } from "../lib/domain/chains.js";
import { getPlatform } from "../lib/domain/platforms.js";
import { buildFactorVector } from "../lib/model/model-data.js";
import type { AffixModel } from "../schemas/affix.model.js";

// ---------------------------------------------------------------------------
// Known-good combos (same as embed-search.ts)
// ---------------------------------------------------------------------------

interface KnownCombo {
	platform: string;
	slot: number;
	op1: string;
	op2: string;
	label: string;
}

const KNOWN_GOOD: KnownCombo[] = [
	{ platform: "春黎剑阵", slot: 1, op1: "心逐神随", op2: "灵犀九重", label: "Alpha strike" },
	{ platform: "皓月剑诀", slot: 2, op1: "玄心剑魄", op2: "无极剑阵", label: "%maxHP finisher + M_skill" },
	{ platform: "甲元仙符", slot: 3, op1: "奇能诡道", op2: "龙象护身", label: "Buff amplifier" },
	{ platform: "千锋聚灵剑", slot: 4, op1: "追神真诀", op2: "破釜沉舟", label: "%maxHP shred" },
];

// ---------------------------------------------------------------------------
// Factor extraction — only operator-contributed dimensions
// ---------------------------------------------------------------------------

interface RadarPoint {
	label: string;
	value: number;
}

/** Extract the operator-only contribution (subtract platform baseline) */
function operatorDelta(platform: string, op1: string, op2: string): Record<string, number> {
	const base = buildFactorVector(platform, "", "");
	const combo = buildFactorVector(platform, op1, op2);
	return {
		"S_coeff": combo.S_coeff - base.S_coeff,
		"M_dmg": combo.M_dmg - base.M_dmg,
		"M_skill": combo.M_skill - base.M_skill,
		"M_final": combo.M_final - base.M_final,
		"D_res": (combo.D_res - base.D_res) * 100,
		"σ_R": (combo.sigma_R - base.sigma_R) * 100,
		"M_synchro": (combo.M_synchro - base.M_synchro) * 100,
		"D_ortho": combo.D_ortho - base.D_ortho,
		"H_A": combo.H_A - base.H_A,
		"DR_A": combo.DR_A - base.DR_A,
		"H_red": combo.H_red - base.H_red,
	};
}

// ---------------------------------------------------------------------------
// Cosine similarity (weighted)
// ---------------------------------------------------------------------------

const ZONE_WEIGHTS: Record<string, number> = {
	D_res: 10, M_synchro: 8, M_skill: 6, M_final: 6, D_ortho: 5,
	S_coeff: 3, M_dmg: 2, "σ_R": 3, H_A: 2, DR_A: 2, H_red: 3,
};

function cosineSim(a: Record<string, number>, b: Record<string, number>): number {
	let dot = 0, nA = 0, nB = 0;
	for (const k of Object.keys(a)) {
		const w = ZONE_WEIGHTS[k] ?? 1;
		const ai = w * (a[k] ?? 0);
		const bi = w * (b[k] ?? 0);
		dot += ai * bi;
		nA += ai * ai;
		nB += bi * bi;
	}
	if (nA === 0 || nB === 0) return 0;
	return dot / (Math.sqrt(nA) * Math.sqrt(nB));
}

// ---------------------------------------------------------------------------
// Enumerate and score
// ---------------------------------------------------------------------------

interface ScoredCombo {
	op1: string;
	op2: string;
	cosine: number;
	delta: Record<string, number>;
}

function enumerate(platformName: string, refDelta: Record<string, number>, threshold: number, topN: number): ScoredCombo[] {
	const platform = getPlatform(platformName)!;
	const { validAffixes } = filterByBinding(platform);
	const pool = validAffixes.filter(a => a.category !== "school" || a.school === platform.school);

	const results: ScoredCombo[] = [];
	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			const delta = operatorDelta(platformName, pool[i].affix, pool[j].affix);
			const cosine = cosineSim(delta, refDelta);
			if (cosine >= threshold) {
				results.push({ op1: pool[i].affix, op2: pool[j].affix, cosine, delta });
			}
		}
	}
	results.sort((a, b) => b.cosine - a.cosine);
	return results.slice(0, topN);
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateHTML(
	platformName: string,
	refLabel: string,
	refDelta: Record<string, number>,
	combos: ScoredCombo[],
): string {
	// Determine which axes have nonzero values across all combos
	const allDeltas = [refDelta, ...combos.map(c => c.delta)];
	const axes = Object.keys(refDelta).filter(k =>
		allDeltas.some(d => Math.abs(d[k] ?? 0) > 0.01)
	);

	// Find max absolute value per axis for normalization
	const maxVals: Record<string, number> = {};
	for (const k of axes) {
		maxVals[k] = Math.max(...allDeltas.map(d => Math.abs(d[k] ?? 0)), 1);
	}

	// Normalize to 0-100 scale
	const normalize = (d: Record<string, number>) =>
		axes.map(k => Math.round(((d[k] ?? 0) / maxVals[k]) * 100));

	// Color palette (Atom One Dark inspired)
	const colors = [
		{ bg: "rgba(224, 108, 117, 0.15)", border: "rgb(224, 108, 117)" },  // red - reference
		{ bg: "rgba(97, 175, 239, 0.10)", border: "rgb(97, 175, 239)" },   // blue
		{ bg: "rgba(152, 195, 121, 0.10)", border: "rgb(152, 195, 121)" }, // green
		{ bg: "rgba(229, 192, 123, 0.10)", border: "rgb(229, 192, 123)" }, // yellow
		{ bg: "rgba(198, 120, 221, 0.10)", border: "rgb(198, 120, 221)" }, // purple
		{ bg: "rgba(86, 182, 194, 0.10)", border: "rgb(86, 182, 194)" },   // cyan
		{ bg: "rgba(209, 154, 102, 0.10)", border: "rgb(209, 154, 102)" }, // orange
		{ bg: "rgba(190, 80, 70, 0.10)", border: "rgb(190, 80, 70)" },     // dark red
		{ bg: "rgba(75, 150, 200, 0.10)", border: "rgb(75, 150, 200)" },   // steel blue
		{ bg: "rgba(130, 170, 100, 0.10)", border: "rgb(130, 170, 100)" }, // olive
	];

	// Build datasets
	const datasets: string[] = [];

	// Reference combo first (thicker line)
	const refData = normalize(refDelta);
	datasets.push(`{
		label: '⭐ ${refLabel} (reference)',
		data: [${refData.join(",")}],
		backgroundColor: '${colors[0].bg}',
		borderColor: '${colors[0].border}',
		borderWidth: 3,
		pointRadius: 4
	}`);

	// Other combos
	for (let i = 0; i < combos.length; i++) {
		const c = combos[i];
		const data = normalize(c.delta);
		const ci = (i + 1) % colors.length;
		datasets.push(`{
			label: '【${c.op1}】+【${c.op2}】 (${c.cosine.toFixed(4)})',
			data: [${data.join(",")}],
			backgroundColor: '${colors[ci].bg}',
			borderColor: '${colors[ci].border}',
			borderWidth: 1.5,
			pointRadius: 3
		}`);
	}

	// Build raw values table
	const tableRows = [{ label: `⭐ ${refLabel}`, delta: refDelta, cosine: 1.0 },
		...combos.map(c => ({ label: `【${c.op1}】+【${c.op2}】`, delta: c.delta, cosine: c.cosine }))
	];

	const tableHTML = `
	<table>
		<thead>
			<tr>
				<th>#</th><th>Combo</th><th>Cosine</th>
				${axes.map(a => `<th>${a}</th>`).join("")}
			</tr>
		</thead>
		<tbody>
			${tableRows.map((r, i) => `
			<tr${i === 0 ? ' style="background:#3e4451;font-weight:bold"' : ""}>
				<td>${i === 0 ? "ref" : i}</td>
				<td>${r.label}</td>
				<td>${r.cosine.toFixed(4)}</td>
				${axes.map(a => {
					const v = Math.round(r.delta[a] ?? 0);
					const cls = v > 0 ? "pos" : v < 0 ? "neg" : "";
					return `<td class="${cls}">${v || ""}</td>`;
				}).join("")}
			</tr>`).join("")}
		</tbody>
	</table>`;

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Embedding Radar — ${platformName}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
	body {
		background: #282c34; color: #abb2bf;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
		margin: 0; padding: 20px 40px;
	}
	h1 { color: #fff; }
	h2 { color: #e5c07b; margin-top: 40px; }
	.chart-container {
		width: 90%; max-width: 800px; margin: 20px auto;
		background: #2c313a; border-radius: 8px; padding: 20px;
	}
	table {
		border-collapse: collapse; margin: 20px 0; font-size: 13px;
	}
	th, td {
		border: 1px solid #4b5263; padding: 6px 10px; text-align: center;
	}
	th { background: #3e4451; color: #e5c07b; }
	td { background: #2c313a; }
	td.pos { color: #98c379; }
	td.neg { color: #e06c75; }
	.note { color: #5c6370; font-size: 12px; margin-top: 8px; }
</style>
</head>
<body>
<h1>Embedding Radar — ${platformName}</h1>
<p>Reference: ${refLabel}</p>
<p class="note">Axes show operator-only contribution (platform baseline subtracted). Normalized to % of max value per axis.</p>

<div class="chart-container">
	<canvas id="radar"></canvas>
</div>

<h2>Raw Values (operator delta)</h2>
${tableHTML}

<p class="note">Cosine similarity uses weighted distance: D_res×10, M_synchro×8, M_skill×6, M_final×6, D_ortho×5, σ_R/H_red×3, S_coeff×3, M_dmg×2, H_A/DR_A×2</p>

<script>
const ctx = document.getElementById('radar').getContext('2d');
new Chart(ctx, {
	type: 'radar',
	data: {
		labels: ${JSON.stringify(axes)},
		datasets: [${datasets.join(",")}]
	},
	options: {
		responsive: true,
		scales: {
			r: {
				angleLines: { color: '#4b5263' },
				grid: { color: '#4b526380' },
				pointLabels: { color: '#abb2bf', font: { size: 13 } },
				ticks: { display: false },
				suggestedMin: -20,
				suggestedMax: 100
			}
		},
		plugins: {
			legend: {
				labels: { color: '#abb2bf', font: { size: 12 } },
				position: 'bottom'
			}
		}
	}
});
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values } = parseArgs({
	options: {
		platform: { type: "string", short: "p" },
		ref: { type: "string", short: "r" },
		top: { type: "string", short: "n" },
		threshold: { type: "string", short: "t" },
		output: { type: "string", short: "o" },
	},
});

if (!values.platform) {
	console.error("Usage: bun app/embed-radar.ts --platform <book_name> [--top N] [--threshold 0.98]");
	process.exit(1);
}

const platformName = values.platform;
const topN = values.top ? parseInt(values.top, 10) : 10;
const threshold = values.threshold ? parseFloat(values.threshold) : 0.90;

// Build reference
let refOp1: string, refOp2: string, refLabel: string;
if (values.ref) {
	[refOp1, refOp2] = values.ref.split(",");
	refLabel = `【${refOp1}】+【${refOp2}】`;
} else {
	const known = KNOWN_GOOD.find(k => k.platform === platformName);
	if (!known) {
		console.error(`No known-good combo for ${platformName}. Use --ref op1,op2`);
		process.exit(1);
	}
	refOp1 = known.op1;
	refOp2 = known.op2;
	refLabel = `【${refOp1}】+【${refOp2}】 (${known.label})`;
}

const refDelta = operatorDelta(platformName, refOp1, refOp2);
const combos = enumerate(platformName, refDelta, threshold, topN);

// Exclude the reference combo itself from results
const filtered = combos.filter(c =>
	!(c.op1 === refOp1 && c.op2 === refOp2) && !(c.op1 === refOp2 && c.op2 === refOp1)
);

const html = generateHTML(platformName, refLabel, refDelta, filtered);
const outFile = values.output ?? `tmp/${platformName}-radar.html`;

writeFileSync(outFile, html);
console.log(`Created ${outFile} (${filtered.length} combos, threshold=${threshold})`);
console.log(`Open in browser to view radar chart.`);
