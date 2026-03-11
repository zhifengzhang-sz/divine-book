#!/usr/bin/env bun
/**
 * CLI: enumerate complete 6-slot book set candidates from themes.
 *
 * Two-layer architecture:
 *   Layer 1: Per-slot → locked pair or fixed affix + flex alternatives
 *   Layer 2: Cartesian product with cross-slot affix uniqueness
 *
 * Usage:
 *   bun app/build-candidates.ts --theme all_attack
 *   bun app/build-candidates.ts --theme all_attack --top 5
 *   bun app/build-candidates.ts --slot 春黎剑阵 --fn F_burst     # analyze one slot
 *   bun app/build-candidates.ts --list                            # list all themes
 *   bun app/build-candidates.ts --all                             # run all themes
 */

import { parseArgs } from "node:util";
import {
	THEMES,
	analyzeSlot,
	analyzeThemeSlots,
	enumerateSets,
	getTheme,
} from "../lib/domain/build-candidates.js";
import type { SlotAnalysis } from "../lib/domain/build-candidates.js";

const { values } = parseArgs({
	options: {
		theme: { type: "string", short: "t" },
		top: { type: "string", short: "n" },
		alt: { type: "string", short: "a" },
		slot: { type: "string", short: "s" },
		fn: { type: "string", short: "f" },
		list: { type: "boolean", short: "l" },
		all: { type: "boolean" },
		json: { type: "boolean" },
	},
});

// ---------------------------------------------------------------------------
// List themes
// ---------------------------------------------------------------------------

if (values.list) {
	console.log("\nAvailable themes:\n");
	for (const t of THEMES) {
		console.log(`  ${padEnd(t.id, 24)}  α=${t.alpha.toFixed(1)}  ${t.name}`);
		for (let i = 0; i < t.slots.length; i++) {
			const s = t.slots[i];
			console.log(`    S${i + 1}: ${padEnd(s.platform, 14)}  → ${s.functions.join(", ")}`);
		}
	}
	console.log();
	process.exit(0);
}

// ---------------------------------------------------------------------------
// Single slot analysis
// ---------------------------------------------------------------------------

if (values.slot) {
	const fnId = values.fn ?? "F_burst";
	const maxAlt = values.alt ? parseInt(values.alt, 10) : 10;
	const analysis = analyzeSlot(values.slot, fnId, 20, 0.6, maxAlt);

	if (!analysis) {
		console.error(`Could not analyze slot: ${values.slot} × ${fnId}`);
		process.exit(1);
	}

	if (values.json) {
		console.log(JSON.stringify(analysis, null, 2));
		process.exit(0);
	}

	printSlotAnalysis(analysis);
	process.exit(0);
}

// ---------------------------------------------------------------------------
// Theme run
// ---------------------------------------------------------------------------

const maxSets = values.top ? parseInt(values.top, 10) : 50;
const maxAlt = values.alt ? parseInt(values.alt, 10) : 10;

if (values.all) {
	for (const theme of THEMES) {
		runTheme(theme.id, maxSets, maxAlt);
	}
	process.exit(0);
}

if (!values.theme) {
	console.error(
		"Usage:\n" +
		"  bun app/build-candidates.ts --theme <id> [--top N] [--alt N]\n" +
		"  bun app/build-candidates.ts --slot <platform> --fn <fnId>\n" +
		"  bun app/build-candidates.ts --list\n" +
		"  bun app/build-candidates.ts --all",
	);
	process.exit(1);
}

runTheme(values.theme, maxSets, maxAlt);

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

function runTheme(themeId: string, maxSets: number, maxAlt: number): void {
	const theme = getTheme(themeId);
	if (!theme) {
		console.error(`Unknown theme: ${themeId}`);
		process.exit(1);
	}

	const analyses = analyzeThemeSlots(theme, 20, maxAlt);

	if (values.json) {
		const sets = enumerateSets(theme, analyses, maxSets);
		console.log(JSON.stringify({ analyses, sets }, null, 2));
		return;
	}

	// Layer 1: per-slot analysis
	console.log(`\n${"═".repeat(60)}`);
	console.log(`Theme: ${theme.name} (${theme.id}, α=${theme.alpha})`);
	console.log("═".repeat(60));

	console.log("\n── Layer 1: Per-slot candidates ──\n");
	for (const sa of analyses) {
		printSlotAnalysis(sa);
	}

	// Layer 2: set-level enumeration
	const sets = enumerateSets(theme, analyses, maxSets);

	console.log(`── Layer 2: Book sets (${sets.length} valid) ──\n`);

	for (let i = 0; i < sets.length; i++) {
		const s = sets[i];
		console.log(`  Set #${i + 1}  (total: ${s.totalScore.toFixed(1)})`);
		for (const sl of s.slots) {
			console.log(
				`    S${sl.slot}: ${padEnd(sl.platform, 14)}  ` +
				`${padEnd(sl.op1, 10)} + ${padEnd(sl.op2, 10)}  ` +
				`(${sl.score.toFixed(1)})`,
			);
		}
		console.log();
	}

	if (sets.length === 0) {
		console.log("  No valid sets (affix conflicts). Try --alt N to increase alternatives.\n");
	}
}

function printSlotAnalysis(sa: SlotAnalysis): void {
	if (sa.kind === "locked") {
		console.log(
			`  S${sa.slot}: ${padEnd(sa.platform, 14)}  [${sa.fn}]  LOCKED` +
			`  ${sa.lockedOp1} + ${sa.lockedOp2}  (${sa.lockedScore?.toFixed(1)})`,
		);
	} else {
		console.log(
			`  S${sa.slot}: ${padEnd(sa.platform, 14)}  [${sa.fn}]  FLEXIBLE` +
			`  fixed: ${sa.fixedAffix} (pos ${sa.fixedPosition})`,
		);
		if (sa.alternatives) {
			for (const alt of sa.alternatives) {
				console.log(`    ${padEnd(alt.affix, 14)}  (${alt.score.toFixed(1)})`);
			}
		}
	}
	console.log();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function displayWidth(s: string): number {
	let w = 0;
	for (const ch of s) {
		w += ch.charCodeAt(0) > 0x7f ? 2 : 1;
	}
	return w;
}

function padEnd(s: string, width: number): string {
	const diff = width - displayWidth(s);
	return diff > 0 ? s + " ".repeat(diff) : s;
}
