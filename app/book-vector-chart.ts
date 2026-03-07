#!/usr/bin/env bun
/**
 * CLI: Time-series factor vector visualization.
 *
 * Generates an HTML file with Chart.js line charts showing how each
 * factor varies over time for a divine book configuration.
 *
 * Usage:
 *   bun app/book-vector-chart.ts --platform 春黎剑阵
 *   bun app/book-vector-chart.ts --platform 甲元仙符 --op1 业焰 --op2 灵威
 *   bun app/book-vector-chart.ts --platform 甲元仙符 --op1 仙露护元 --op2 灵威 -o tmp/chart.html
 */

import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { evaluateBook, type TimeSeriesResult } from "../lib/model/time-series.js";

const { values } = parseArgs({
	options: {
		platform: { type: "string", short: "p" },
		op1: { type: "string" },
		op2: { type: "string" },
		gap: { type: "string", short: "g" },
		output: { type: "string", short: "o" },
	},
});

if (!values.platform) {
	console.error(
		"Usage: bun app/book-vector-chart.ts --platform <book> [--op1 <affix>] [--op2 <affix>] [--gap 4] [-o file.html]",
	);
	process.exit(1);
}

const platform = values.platform;
const op1 = values.op1 ?? "";
const op2 = values.op2 ?? "";
const T_gap = values.gap ? parseInt(values.gap, 10) : 4;

const result = evaluateBook(platform, op1, op2, T_gap);
const html = generateHTML(result, T_gap);

const outFile = values.output ?? `tmp/${platform}-timeseries.html`;
writeFileSync(outFile, html);
console.log(`Created ${outFile}`);
console.log(`Open in browser to view time-series chart.`);

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateHTML(r: TimeSeriesResult, T_gap: number): string {
	// Identify factors that actually vary over time (exclude flat lines)
	const allFactors = Object.keys(r.averaged);
	const varyingFactors = allFactors.filter((f) =>
		r.samples.some((s) => {
			const v = s.factors[f] ?? 0;
			const base = r.permanent[f] ?? 0;
			return Math.abs(v - base) > 0.01;
		}),
	);
	const staticFactors = allFactors.filter(
		(f) =>
			!varyingFactors.includes(f) &&
			Math.abs(r.averaged[f]) > 0.01 &&
			!(f === "D_res" && r.averaged[f] === 1) &&
			!(f === "M_synchro" && r.averaged[f] === 1),
	);

	// Time labels
	const labels = r.samples.map((s) => s.t);

	// Slot boundary annotations
	const slotBoundaries: number[] = [];
	for (let t = T_gap; t < r.T_active; t += T_gap) {
		slotBoundaries.push(t);
	}

	// Color palette (Atom One Dark inspired)
	const palette = [
		{ line: "rgb(224, 108, 117)", fill: "rgba(224, 108, 117, 0.08)" },  // red
		{ line: "rgb(97, 175, 239)", fill: "rgba(97, 175, 239, 0.08)" },    // blue
		{ line: "rgb(152, 195, 121)", fill: "rgba(152, 195, 121, 0.08)" },  // green
		{ line: "rgb(229, 192, 123)", fill: "rgba(229, 192, 123, 0.08)" },  // yellow
		{ line: "rgb(198, 120, 221)", fill: "rgba(198, 120, 221, 0.08)" },  // purple
		{ line: "rgb(86, 182, 194)", fill: "rgba(86, 182, 194, 0.08)" },    // cyan
		{ line: "rgb(209, 154, 102)", fill: "rgba(209, 154, 102, 0.08)" },  // orange
	];

	// Group factors by scale for multi-axis charts
	// Large values (D_base, D_ortho) vs small values (M_dmg, S_coeff, etc.)
	const largeFactors = varyingFactors.filter((f) =>
		r.samples.some((s) => Math.abs(s.factors[f] ?? 0) > 500),
	);
	const smallFactors = varyingFactors.filter((f) => !largeFactors.includes(f));

	// Build chart configs
	const charts: { id: string; title: string; factors: string[] }[] = [];
	if (largeFactors.length > 0) {
		charts.push({ id: "chart_large", title: "Factors (large scale)", factors: largeFactors });
	}
	if (smallFactors.length > 0) {
		charts.push({ id: "chart_small", title: "Factors (percentage-point scale)", factors: smallFactors });
	}
	if (charts.length === 0 && varyingFactors.length === 0) {
		// No temporal variation — show static as a single chart
		charts.push({ id: "chart_static", title: "Static factors (no temporal variation)", factors: staticFactors });
	}

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
					fill: true,
					tension: 0,
					stepped: true,
					borderWidth: 2,
					pointRadius: 0,
					pointHitRadius: 8
				}`;
			})
			.join(",");
	}

	// Slot annotations plugin config
	const annotationsJS = slotBoundaries
		.map(
			(t, i) => `slot_${i}: {
				type: 'line',
				xMin: ${t},
				xMax: ${t},
				borderColor: 'rgba(92, 99, 112, 0.5)',
				borderWidth: 1,
				borderDash: [4, 4],
				label: {
					display: true,
					content: 'slot ${i + 2}',
					position: 'start',
					color: '#5c6370',
					font: { size: 10 }
				}
			}`,
		)
		.join(",\n");

	// Summon annotation
	const summonAnnotation = r.summon
		? `,summon_zone: {
				type: 'box',
				xMin: 0,
				xMax: ${r.summon.duration},
				backgroundColor: 'rgba(229, 192, 123, 0.06)',
				borderColor: 'rgba(229, 192, 123, 0.3)',
				borderWidth: 1,
				label: {
					display: true,
					content: 'summon ×${r.summon.multiplier.toFixed(2)}',
					position: { x: 'center', y: 'start' },
					color: '#e5c07b',
					font: { size: 11 }
				}
			}`
		: "";

	function buildChartJS(id: string, factors: string[]): string {
		return `
		new Chart(document.getElementById('${id}').getContext('2d'), {
			type: 'line',
			data: {
				labels: [${labels.join(",")}],
				datasets: [${buildDatasets(factors)}]
			},
			options: {
				responsive: true,
				interaction: { mode: 'index', intersect: false },
				scales: {
					x: {
						title: { display: true, text: 'Time (s)', color: '#abb2bf' },
						grid: { color: '#4b526340' },
						ticks: { color: '#abb2bf' }
					},
					y: {
						title: { display: true, text: 'Value', color: '#abb2bf' },
						grid: { color: '#4b526340' },
						ticks: { color: '#abb2bf' },
						beginAtZero: true
					}
				},
				plugins: {
					legend: {
						labels: { color: '#abb2bf', font: { size: 12 }, usePointStyle: true },
						position: 'bottom'
					},
					tooltip: {
						backgroundColor: '#3e4451',
						titleColor: '#e5c07b',
						bodyColor: '#abb2bf',
						borderColor: '#4b5263',
						borderWidth: 1
					},
					annotation: {
						annotations: {
							${annotationsJS}
							${summonAnnotation}
						}
					}
				}
			}
		});`;
	}

	// Summary table
	const displayFactors = [...new Set([...varyingFactors, ...staticFactors])];
	const summaryRows = displayFactors
		.map((f) => {
			const s = r.permanent[f] ?? 0;
			const a = r.averaged[f] ?? 0;
			const p = r.peak[f] ?? 0;
			const delta = a - s;
			const deltaClass = delta > 0.01 ? "pos" : delta < -0.01 ? "neg" : "";
			const isVarying = varyingFactors.includes(f);
			return `<tr>
				<td>${f}</td>
				<td>${fmt(s)}</td>
				<td${isVarying ? ' class="highlight"' : ""}>${fmt(a)}</td>
				<td>${fmt(p)}</td>
				<td class="${deltaClass}">${delta > 0 ? "+" : ""}${fmt(delta)}</td>
			</tr>`;
		})
		.join("");

	const opLabel =
		op1 || op2
			? `<span class="op-label">【${op1 || "—"}】+ 【${op2 || "—"}】</span>`
			: "";

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Time-Series — ${platform}</title>
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
	.op-label { color: #61afef; }
	.meta { color: #5c6370; font-size: 13px; margin: 4px 0 20px; }
	.meta span { margin-right: 20px; }
	.meta .val { color: #98c379; }
	.chart-container {
		width: 95%; max-width: 1000px; margin: 16px auto;
		background: #2c313a; border-radius: 8px; padding: 20px;
	}
	table {
		border-collapse: collapse; margin: 16px 0; font-size: 13px;
	}
	th, td {
		border: 1px solid #4b5263; padding: 5px 12px; text-align: right;
	}
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

<h1>Time-Series Book Vector: ${platform}</h1>
<p>${opLabel}</p>
<div class="meta">
	<span>T_active: <span class="val">${r.T_active}s</span></span>
	<span>Slot coverage: <span class="val">${r.slot_coverage}</span> (T_gap=${T_gap}s)</span>
	${r.summon ? `<span>Summon: <span class="val">×${r.summon.multiplier.toFixed(2)}</span> for ${r.summon.duration}s</span>` : ""}
</div>

${charts.map((c) => `<h2>${c.title}</h2>\n<div class="chart-container"><canvas id="${c.id}"></canvas></div>`).join("\n")}

<h2>Factor Summary</h2>
<table>
	<thead>
		<tr><th>Factor</th><th>Permanent</th><th>&int;vec(t)dt/T</th><th>Peak</th><th>Temporal</th></tr>
	</thead>
	<tbody>
		${summaryRows}
	</tbody>
</table>
<p class="note">&int;vec(t)dt/T = time-integrated factor divided by T_active. Permanent = always-on baseline. Temporal = &int; &minus; Permanent. Yellow = time-varying.</p>

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
