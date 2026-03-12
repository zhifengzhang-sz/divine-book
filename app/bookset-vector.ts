#!/usr/bin/env bun
/**
 * CLI: Time-series book set evaluation.
 *
 * Evaluates a 6-book set by merging individual book timelines.
 * Each book fires at (slot-1) × T_gap, with temporal events offset accordingly.
 *
 * Usage:
 *   bun app/bookset-vector.ts --config config/example.json
 *   bun app/bookset-vector.ts --config config/example.json --samples
 *   bun app/bookset-vector.ts --config config/example.json --json
 *
 * Config file format (JSON):
 *   {
 *     "books": [
 *       { "slot": 1, "platform": "甲元仙符", "op1": "龙象护身", "op2": "真极穿空" },
 *       { "slot": 2, "platform": "春黎剑阵", "op1": "灵犀九重", "op2": "心逐神随" },
 *       ...
 *     ]
 *   }
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { evaluateBookSet, evaluateBook } from "../lib/model/time-series.js";
import type { BookSlot } from "../lib/model/time-series.js";

const { values } = parseArgs({
	options: {
		config: { type: "string", short: "c" },
		gap: { type: "string", short: "g" },
		samples: { type: "boolean", default: false },
		json: { type: "boolean", default: false },
	},
});

if (!values.config) {
	console.error(
		"Usage: bun app/bookset-vector.ts --config <file.json> [--gap 4] [--samples] [--json]",
	);
	process.exit(1);
}

const config = JSON.parse(readFileSync(values.config, "utf-8"));
const books: BookSlot[] = config.books;
const T_gap = values.gap ? parseInt(values.gap, 10) : 4;

const result = evaluateBookSet(books, T_gap);

// ---------------------------------------------------------------------------
// Factor display helpers
// ---------------------------------------------------------------------------

const FACTOR_NAMES = [
	"D_base", "D_flat", "M_dmg", "M_skill", "M_final", "S_coeff",
	"D_res", "sigma_R", "M_synchro", "D_ortho",
	"H_A", "DR_A", "S_A", "H_red",
];

const isIdentity = (f: string, v: number) =>
	(f === "D_res" || f === "M_synchro") && v === 1;

function fmt(v: number): string {
	if (Number.isInteger(v)) return v.toString();
	return v.toFixed(2);
}

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------

if (values.json) {
	const { samples: _, perBook, ...summary } = result;
	const output = values.samples
		? { ...summary, samples: result.samples, perBook: perBook.map(b => {
			const { samples: _, ...rest } = b;
			return rest;
		})}
		: { ...summary, perBook: perBook.map(b => {
			const { samples: _, ...rest } = b;
			return rest;
		})};
	console.log(JSON.stringify(output, null, 2));
	process.exit(0);
}

// ---------------------------------------------------------------------------
// Human-readable output
// ---------------------------------------------------------------------------

console.log(`\n${"═".repeat(80)}`);
console.log("Book Set Time-Series Evaluation");
console.log(`T_gap: ${T_gap}s   T_active: ${result.T_active}s`);
console.log(`${"═".repeat(80)}\n`);

// Per-book summary
console.log("## Per-Book Summary\n");
console.log(
	`${"Slot".padEnd(5)}  ${"Platform".padEnd(14)}  ${"Op1".padEnd(10)}  ${"Op2".padEnd(10)}  ${"T_active".padStart(8)}  ${"Summon".padStart(8)}`,
);
console.log(`${"─".repeat(65)}`);

for (let i = 0; i < result.books.length; i++) {
	const book = result.books[i];
	const br = result.perBook[i];
	const sumStr = br.summon ? `×${br.summon.multiplier.toFixed(2)}` : "—";
	console.log(
		`${String(book.slot).padEnd(5)}  ${book.platform.padEnd(14)}  ${(book.op1 || "—").padEnd(10)}  ${(book.op2 || "—").padEnd(10)}  ${`${br.T_active}s`.padStart(8)}  ${sumStr.padStart(8)}`,
	);
}
console.log();

// Combined factor summary
const displayFactors = FACTOR_NAMES.filter(
	(f) =>
		!(
			isIdentity(f, result.averaged[f]) &&
			isIdentity(f, result.permanent[f])
		) &&
		(result.averaged[f] !== 0 || result.permanent[f] !== 0),
);

const temporalFactors = new Set(
	displayFactors.filter((f) =>
		result.samples.some(
			(s) => Math.abs((s.factors[f] ?? 0) - (result.permanent[f] ?? 0)) > 0.01,
		),
	),
);

console.log("## Combined Factor Vector\n");
console.log(
	`${"Factor".padEnd(12)}  ${"∫/T".padStart(10)}  ${"∫ total".padStart(10)}  ${"Permanent".padStart(10)}  ${"Temporal".padStart(10)}`,
);
console.log(`${"─".repeat(60)}`);

for (const f of displayFactors) {
	const perm = result.permanent[f] ?? 0;
	const avg = result.averaged[f] ?? 0;
	const tot = result.total[f] ?? 0;
	const temporal = avg - perm;
	const tempStr = temporalFactors.has(f)
		? (temporal > 0 ? `+${fmt(temporal)}` : fmt(temporal))
		: "—";

	console.log(
		`${f.padEnd(12)}  ${fmt(avg).padStart(10)}  ${fmt(tot).padStart(10)}  ${fmt(perm).padStart(10)}  ${tempStr.padStart(10)}`,
	);
}
console.log();

// Per-second samples (optional)
if (values.samples) {
	const sampleFactors = [...temporalFactors];

	if (sampleFactors.length > 0) {
		console.log("## vec(t) per second (time-varying factors only)\n");

		// Show slot fire times
		console.log("Slot fire times:", result.books.map(b => `S${b.slot}@${(b.slot - 1) * T_gap}s`).join("  "));
		console.log();

		console.log(
			`${"t".padStart(4)}  ${sampleFactors.map((f) => f.padStart(10)).join("  ")}`,
		);
		console.log(`${"─".repeat(4 + sampleFactors.length * 12)}`);

		for (const s of result.samples) {
			// Mark slot fire times
			const slotMarker = result.books.find(b => (b.slot - 1) * T_gap === s.t);
			const marker = slotMarker ? ` ← S${slotMarker.slot}` : "";
			console.log(
				`${String(s.t).padStart(4)}  ${sampleFactors.map((f) => fmt(s.factors[f] ?? 0).padStart(10)).join("  ")}${marker}`,
			);
		}
		console.log();
	} else {
		console.log("No time-varying factors — all factors are permanent.\n");
	}
}
