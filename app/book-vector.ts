#!/usr/bin/env bun
/**
 * CLI: Time-series book vector evaluation.
 *
 * Computes vec(t) per second for a divine book (platform + 2 operators),
 * then integrates over time to produce the book factor vector.
 *
 * Usage:
 *   bun app/book-vector.ts --platform 春黎剑阵 --op1 清灵 --op2 灵威
 *   bun app/book-vector.ts --platform 念剑诀 --op1 仙露护元 --op2 灵威 --samples
 *   bun app/book-vector.ts --platform 春黎剑阵 --op1 清灵 --op2 灵威 --json
 */

import { parseArgs } from "node:util";
import { evaluateBook } from "../lib/model/time-series.js";

const { values } = parseArgs({
	options: {
		platform: { type: "string", short: "p" },
		op1: { type: "string" },
		op2: { type: "string" },
		gap: { type: "string", short: "g" },
		samples: { type: "boolean", default: false },
		json: { type: "boolean", default: false },
	},
});

if (!values.platform) {
	console.error(
		"Usage: bun app/book-vector.ts --platform <book> --op1 <affix> --op2 <affix> [--gap 4] [--samples] [--json]",
	);
	process.exit(1);
}

const platform = values.platform;
const op1 = values.op1 ?? "";
const op2 = values.op2 ?? "";
const T_gap = values.gap ? parseInt(values.gap, 10) : 4;

const result = evaluateBook(platform, op1, op2, T_gap);

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------

if (values.json) {
	const { samples: _, ...summary } = result;
	const output = values.samples ? result : summary;
	console.log(JSON.stringify(output, null, 2));
	process.exit(0);
}

// ---------------------------------------------------------------------------
// Human-readable output
// ---------------------------------------------------------------------------

console.log(`\n${"═".repeat(80)}`);
console.log(`Time-Series Book Vector: ${platform}`);
if (op1 || op2) console.log(`Operators: 【${op1 || "—"}】+ 【${op2 || "—"}】`);
console.log(`T_active: ${result.T_active}s   Slot coverage: ${result.slot_coverage} (T_gap=${T_gap}s)`);
if (result.summon) {
	console.log(`Summon: ×${result.summon.multiplier.toFixed(2)} for ${result.summon.duration}s`);
}
console.log(`${"═".repeat(80)}\n`);

// ---------------------------------------------------------------------------
// Integrated book vector (primary output)
// ---------------------------------------------------------------------------

// Identify non-trivial factors
const allFactors = Object.keys(result.averaged);
const isIdentity = (f: string, v: number) =>
	(f === "D_res" || f === "M_synchro") && v === 1;

const displayFactors = allFactors.filter(
	(f) =>
		!(
			isIdentity(f, result.averaged[f]) &&
			isIdentity(f, result.permanent[f]) &&
			isIdentity(f, result.peak[f])
		) &&
		(result.averaged[f] !== 0 || result.permanent[f] !== 0 || result.peak[f] !== 0),
);

// Identify which factors have temporal variation
const temporalFactors = new Set(
	displayFactors.filter((f) =>
		result.samples.some(
			(s) => Math.abs((s.factors[f] ?? 0) - (result.permanent[f] ?? 0)) > 0.01,
		),
	),
);

console.log(
	`${"Factor".padEnd(12)}  ${"∫ vec(t)dt/T".padStart(12)}  ${"Peak".padStart(10)}  ${"Permanent".padStart(10)}  ${"Temporal".padStart(10)}`,
);
console.log(`${"─".repeat(68)}`);

for (const f of displayFactors) {
	const perm = result.permanent[f] ?? 0;
	const avg = result.averaged[f] ?? 0;
	const peak = result.peak[f] ?? 0;
	const temporal = avg - perm;
	const tempStr = temporalFactors.has(f)
		? (temporal > 0 ? `+${fmt(temporal)}` : fmt(temporal))
		: "—";

	console.log(
		`${f.padEnd(12)}  ${fmt(avg).padStart(12)}  ${fmt(peak).padStart(10)}  ${fmt(perm).padStart(10)}  ${tempStr.padStart(10)}`,
	);
}
console.log();

// ---------------------------------------------------------------------------
// Per-second samples (optional)
// ---------------------------------------------------------------------------

if (values.samples) {
	const sampleFactors = [...temporalFactors];

	if (sampleFactors.length > 0) {
		console.log("vec(t) per second (time-varying factors only):");
		console.log(
			`${"t".padStart(4)}  ${sampleFactors.map((f) => f.padStart(10)).join("  ")}`,
		);
		console.log(`${"─".repeat(4 + sampleFactors.length * 12)}`);

		for (const s of result.samples) {
			console.log(
				`${String(s.t).padStart(4)}  ${sampleFactors.map((f) => fmt(s.factors[f] ?? 0).padStart(10)).join("  ")}`,
			);
		}
		console.log();
	} else {
		console.log("No time-varying factors — all factors are permanent.\n");
	}
}

function fmt(v: number): string {
	if (Number.isInteger(v)) return v.toString();
	return v.toFixed(2);
}
