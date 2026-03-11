#!/usr/bin/env bun
/**
 * CLI: Book set time-series chart visualization.
 *
 * Generates an HTML file with Chart.js charts showing how factors
 * vary over the full 6-slot rotation timeline.
 *
 * Usage:
 *   bun app/bookset-chart.ts --config builds/test.json
 *   bun app/bookset-chart.ts --config builds/test.json -o tmp/bookset.html
 */

import { parseArgs } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { evaluateBookSet } from "../lib/model/time-series.js";
import type { BookSlot, BookSetResult } from "../lib/model/time-series.js";

const { values } = parseArgs({
	options: {
		config: { type: "string", short: "c" },
		gap: { type: "string", short: "g" },
		output: { type: "string", short: "o" },
	},
});

if (!values.config) {
	console.error(
		"Usage: bun app/bookset-chart.ts --config <file.json> [--gap 4] [-o file.html]",
	);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FACTOR_NAMES = [
	"D_base", "D_flat", "M_dmg", "M_skill", "M_final", "S_coeff",
	"D_res", "sigma_R", "M_synchro", "D_ortho",
	"H_A", "DR_A", "S_A", "H_red",
];

const palette = [
	{ line: "rgb(224, 108, 117)", fill: "rgba(224, 108, 117, 0.08)" },
	{ line: "rgb(97, 175, 239)", fill: "rgba(97, 175, 239, 0.08)" },
	{ line: "rgb(152, 195, 121)", fill: "rgba(152, 195, 121, 0.08)" },
	{ line: "rgb(229, 192, 123)", fill: "rgba(229, 192, 123, 0.08)" },
	{ line: "rgb(198, 120, 221)", fill: "rgba(198, 120, 221, 0.08)" },
	{ line: "rgb(86, 182, 194)", fill: "rgba(86, 182, 194, 0.08)" },
	{ line: "rgb(209, 154, 102)", fill: "rgba(209, 154, 102, 0.08)" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const config = JSON.parse(readFileSync(values.config, "utf-8"));
const books: BookSlot[] = config.books;
const T_gap = values.gap ? parseInt(values.gap, 10) : 4;

const result = evaluateBookSet(books, T_gap);
const html = generateHTML(result, T_gap);

const outFile = values.output ?? "tmp/bookset-timeseries.html";
writeFileSync(outFile, html);
console.log(`Created ${outFile}`);
console.log(`Open in browser to view book set time-series chart.`);

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateHTML(r: BookSetResult, T_gap: number): string {
	// Identify varying vs static factors
	const varyingFactors = FACTOR_NAMES.filter((f) =>
		r.samples.some((s) => Math.abs((s.factors[f] ?? 0) - (r.permanent[f] ?? 0)) > 0.01),
	);
	const staticFactors = FACTOR_NAMES.filter(
		(f) =>
			!varyingFactors.includes(f) &&
			Math.abs(r.averaged[f]) > 0.01 &&
			!(f === "D_res" && r.averaged[f] === 1) &&
			!(f === "M_synchro" && r.averaged[f] === 1),
	);

	const labels = r.samples.map((s) => s.t);

	// Scale grouping
	const largeFactors = varyingFactors.filter((f) =>
		r.samples.some((s) => Math.abs(s.factors[f] ?? 0) > 500),
	);
	const smallFactors = varyingFactors.filter((f) => !largeFactors.includes(f));

	const charts: { id: string; title: string; factors: string[] }[] = [];
	if (largeFactors.length > 0)
		charts.push({ id: "chart_large", title: "Factors (large scale)", factors: largeFactors });
	if (smallFactors.length > 0)
		charts.push({ id: "chart_small", title: "Factors (percentage-point scale)", factors: smallFactors });
	if (charts.length === 0)
		charts.push({ id: "chart_static", title: "Static factors (no temporal variation)", factors: staticFactors });

	function buildDatasets(factors: string[]): string {
		return factors
			.map((f, i) => {
				const color = palette[i % palette.length];
				const data = r.samples.map((s) => s.factors[f] ?? 0);
				return `{
					label: '${f}',
					data: [${data.join(",")}],
					borderColor: '${color.line}',
					backgroundColor: '${color.fill}',
					fill: true, tension: 0, stepped: true,
					borderWidth: 2, pointRadius: 0, pointHitRadius: 8
				}`;
			})
			.join(",");
	}

	// Slot fire annotations
	const slotAnnotations = r.books
		.map(
			(b) => `slot_${b.slot}: {
				type: 'line',
				xMin: ${(b.slot - 1) * T_gap}, xMax: ${(b.slot - 1) * T_gap},
				borderColor: 'rgba(97, 175, 239, 0.6)',
				borderWidth: 1.5, borderDash: [4, 4],
				label: {
					display: true,
					content: 'S${b.slot} ${b.platform}',
					position: 'start',
					color: '#61afef',
					font: { size: 10 }
				}
			}`,
		)
		.join(",\n");

	// Summon zone annotations
	const summonAnnotations = r.perBook
		.map((br, i) => {
			if (!br.summon) return "";
			const fireTime = (r.books[i].slot - 1) * T_gap;
			return `,summon_${i}: {
				type: 'box',
				xMin: ${fireTime}, xMax: ${fireTime + br.summon.duration},
				backgroundColor: 'rgba(229, 192, 123, 0.06)',
				borderColor: 'rgba(229, 192, 123, 0.3)',
				borderWidth: 1,
				label: {
					display: true,
					content: 'summon \\u00d7${br.summon.multiplier.toFixed(2)}',
					position: { x: 'center', y: 'start' },
					color: '#e5c07b', font: { size: 10 }
				}
			}`;
		})
		.filter(Boolean)
		.join("");

	function buildChartJS(id: string, factors: string[]): string {
		return `
		new Chart(document.getElementById('${id}').getContext('2d'), {
			type: 'line',
			data: { labels: [${labels.join(",")}], datasets: [${buildDatasets(factors)}] },
			options: {
				responsive: true,
				interaction: { mode: 'index', intersect: false },
				scales: {
					x: {
						title: { display: true, text: 'Time (s)', color: '#abb2bf' },
						grid: { color: '#4b526340' }, ticks: { color: '#abb2bf' }
					},
					y: {
						title: { display: true, text: 'Value', color: '#abb2bf' },
						grid: { color: '#4b526340' }, ticks: { color: '#abb2bf' },
						beginAtZero: true
					}
				},
				plugins: {
					legend: {
						labels: { color: '#abb2bf', font: { size: 12 }, usePointStyle: true },
						position: 'bottom'
					},
					tooltip: {
						backgroundColor: '#3e4451', titleColor: '#e5c07b',
						bodyColor: '#abb2bf', borderColor: '#4b5263', borderWidth: 1
					},
					annotation: {
						annotations: { ${slotAnnotations} ${summonAnnotations} }
					}
				}
			}
		});`;
	}

	// Summary table
	const displayFactors = [...new Set([...varyingFactors, ...staticFactors])];
	const summaryRows = displayFactors
		.map((f) => {
			const perm = r.permanent[f] ?? 0;
			const avg = r.averaged[f] ?? 0;
			const tot = r.total[f] ?? 0;
			const delta = avg - perm;
			const deltaClass = delta > 0.01 ? "pos" : delta < -0.01 ? "neg" : "";
			const isVarying = varyingFactors.includes(f);
			return `<tr>
				<td>${f}</td>
				<td>${fmt(perm)}</td>
				<td${isVarying ? ' class="highlight"' : ""}>${fmt(avg)}</td>
				<td>${fmt(tot)}</td>
				<td class="${deltaClass}">${delta > 0 ? "+" : ""}${fmt(delta)}</td>
			</tr>`;
		})
		.join("");

	// Per-book table
	const bookRows = r.books
		.map((b, i) => {
			const br = r.perBook[i];
			const sumStr = br.summon ? `&times;${br.summon.multiplier.toFixed(2)}` : "&mdash;";
			return `<tr>
				<td>S${b.slot}</td>
				<td>${b.platform}</td>
				<td>${b.op1 || "&mdash;"}</td>
				<td>${b.op2 || "&mdash;"}</td>
				<td>${(b.slot - 1) * T_gap}s</td>
				<td>${br.T_active}s</td>
				<td>${sumStr}</td>
			</tr>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Book Set Time-Series</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation"></script>
<style>
	body {
		background: #282c34; color: #abb2bf;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
		margin: 0; padding: 20px 40px; line-height: 1.6;
	}
	h1 { color: #fff; margin-bottom: 4px; }
	h2 { color: #e5c07b; margin-top: 36px; }
	.meta { color: #5c6370; font-size: 13px; margin: 4px 0 20px; }
	.meta span { margin-right: 20px; }
	.meta .val { color: #98c379; }
	.chart-container {
		width: 95%; max-width: 1200px; margin: 16px auto;
		background: #2c313a; border-radius: 8px; padding: 20px;
	}
	table { border-collapse: collapse; margin: 16px 0; font-size: 13px; }
	th, td { border: 1px solid #4b5263; padding: 5px 12px; text-align: right; }
	th { background: #3e4451; color: #e5c07b; text-align: center; }
	td:first-child { text-align: left; font-family: monospace; color: #61afef; }
	td { background: #2c313a; }
	td.pos { color: #98c379; }
	td.neg { color: #e06c75; }
	td.highlight { color: #e5c07b; font-weight: bold; }
	.note { color: #5c6370; font-size: 12px; }
</style>
</head>
<body>

<h1>Book Set Time-Series</h1>
<div class="meta">
	<span>Books: <span class="val">${r.books.length}</span></span>
	<span>T_gap: <span class="val">${T_gap}s</span></span>
	<span>T_active: <span class="val">${r.T_active}s</span></span>
</div>

<h2>Slot Configuration</h2>
<table>
	<thead>
		<tr><th>Slot</th><th>Platform</th><th>Op1</th><th>Op2</th><th>Fire</th><th>T_active</th><th>Summon</th></tr>
	</thead>
	<tbody>${bookRows}</tbody>
</table>

${charts.map((c) => `<h2>${c.title}</h2>\n<div class="chart-container"><canvas id="${c.id}"></canvas></div>`).join("\n")}

<h2>Combined Factor Summary</h2>
<table>
	<thead>
		<tr><th>Factor</th><th>Permanent</th><th>&int;/T</th><th>&int; total</th><th>Temporal</th></tr>
	</thead>
	<tbody>${summaryRows}</tbody>
</table>
<p class="note">Permanent = sum of all books' always-on baselines. &int;/T = time-averaged. Temporal = &int;/T &minus; Permanent. Yellow = time-varying.</p>

<script>
${charts.map((c) => buildChartJS(c.id, c.factors)).join("\n")}
</script>

</body>
</html>`;
}

function fmt(v: number): string {
	if (Math.abs(v) < 0.005) return "0";
	if (Number.isInteger(v)) return v.toLocaleString();
	return v.toFixed(2);
}
