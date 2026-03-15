/**
 * CLI: Combat Simulator
 *
 * Usage:
 *   bun app/simulate.ts --book-a 通天剑诀 --book-b 新-青元剑诀 [--hp 1000000] [--atk 50000] [--verbose]
 */

import { parseArgs } from "node:util";
import { loadBooks, simulate } from "../lib/simulator/index.js";
import { DEFAULT_COMBAT_CONFIG } from "../lib/simulator/types.js";

const { values } = parseArgs({
	options: {
		"book-a": { type: "string" },
		"book-b": { type: "string" },
		hp: { type: "string" },
		atk: { type: "string" },
		def: { type: "string" },
		rounds: { type: "string" },
		verbose: { type: "boolean", default: false },
		list: { type: "boolean", default: false },
	},
	strict: true,
});

const books = loadBooks("data/yaml/books.yaml");

if (values.list) {
	console.log("Available books:");
	for (const name of Object.keys(books).sort()) {
		const b = books[name];
		const affixNames = [
			b.primary_affix?.name,
			b.exclusive_affix?.name,
		].filter(Boolean).join(", ");
		console.log(`  ${name} (${b.school}) — ${affixNames || "no affix"}`);
	}
	process.exit(0);
}

if (!values["book-a"] || !values["book-b"]) {
	console.error("Usage: bun app/simulate.ts --book-a <name> --book-b <name> [--hp N] [--atk N] [--verbose]");
	console.error("       bun app/simulate.ts --list");
	process.exit(1);
}

const config = {
	hp: values.hp ? Number(values.hp) : DEFAULT_COMBAT_CONFIG.hp,
	atk: values.atk ? Number(values.atk) : DEFAULT_COMBAT_CONFIG.atk,
	def: values.def ? Number(values.def) : DEFAULT_COMBAT_CONFIG.def,
	max_rounds: values.rounds ? Number(values.rounds) : DEFAULT_COMBAT_CONFIG.max_rounds,
};

const result = simulate(books, values["book-a"], values["book-b"], config);

// ─── Output ─────────────────────────────────────────────────────

console.log(`\n⚔  ${values["book-a"]}  vs  ${values["book-b"]}`);
console.log(`   HP: ${config.hp.toLocaleString()}  ATK: ${config.atk.toLocaleString()}  DEF: ${config.def?.toLocaleString()}`);
console.log(`─────────────────────────────────────────────`);

if (values.verbose) {
	for (const r of result.log) {
		console.log(`\nRound ${r.round}:`);
		console.log(`  ${values["book-a"]} HP: ${r.a_hp.toLocaleString()} (dealt ${r.a_damage_dealt.toLocaleString()})`);
		console.log(`  ${values["book-b"]} HP: ${r.b_hp.toLocaleString()} (dealt ${r.b_damage_dealt.toLocaleString()})`);
		for (const e of r.events) {
			console.log(`    ${e}`);
		}
	}
} else {
	// Summary table: show every 10th round + last 5
	const show = new Set<number>();
	for (let i = 0; i < result.rounds; i += 10) show.add(i);
	for (let i = Math.max(0, result.rounds - 5); i < result.rounds; i++) show.add(i);

	console.log(`${"Round".padStart(6)}  ${"A HP".padStart(12)}  ${"B HP".padStart(12)}  ${"A dmg".padStart(10)}  ${"B dmg".padStart(10)}`);
	for (let i = 0; i < result.log.length; i++) {
		if (show.has(i)) {
			const r = result.log[i];
			console.log(
				`${String(r.round).padStart(6)}  ${r.a_hp.toLocaleString().padStart(12)}  ${r.b_hp.toLocaleString().padStart(12)}  ${r.a_damage_dealt.toLocaleString().padStart(10)}  ${r.b_damage_dealt.toLocaleString().padStart(10)}`,
			);
		}
	}
}

console.log(`\n─────────────────────────────────────────────`);
console.log(`Result: ${result.winner === "draw" ? "DRAW" : `${result.winner} wins`}`);
console.log(`Rounds: ${result.rounds}`);
console.log(`${values["book-a"]} final HP: ${result.a_final_hp.toLocaleString()}`);
console.log(`${values["book-b"]} final HP: ${result.b_final_hp.toLocaleString()}`);
