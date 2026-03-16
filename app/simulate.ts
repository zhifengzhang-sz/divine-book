#!/usr/bin/env bun
/**
 * Combat simulator CLI.
 *
 * Usage:
 *   bun app/simulate.ts --a 千锋聚灵剑 --b 星元化岳
 *   bun app/simulate.ts --a 千锋聚灵剑 --b 星元化岳 --speed 2
 *   bun app/simulate.ts --a 千锋聚灵剑 --b 星元化岳 --instant
 *   bun app/simulate.ts --list
 */

import { createActor } from "xstate";
import { SimulationClock } from "../lib/sim/clock.js";
import {
	loadAffixesYaml,
	loadBooksYaml,
	selectTiers,
	validatePlayerConfig,
} from "../lib/sim/config.js";
import { hasHandler, registeredTypes } from "../lib/sim/handlers/index.js";
import { playerMachine } from "../lib/sim/player.js";
import { SeededRNG } from "../lib/sim/rng.js";
import type { PlayerState, StateChangeEvent } from "../lib/sim/types.js";

// ── Parse args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
	const idx = args.indexOf(`--${name}`);
	if (idx === -1) return undefined;
	return args[idx + 1];
}
const hasFlag = (name: string) => args.includes(`--${name}`);

const booksYaml = loadBooksYaml();
const affixesYaml = loadAffixesYaml();

// ── --list ──────────────────────────────────────────────────────────

if (hasFlag("list")) {
	const prog = { enlightenment: 10, fusion: 51 };
	console.log("Books and handler coverage:\n");
	for (const [name, book] of Object.entries(booksYaml.books)) {
		const allEffects = [
			...(book.skill ?? []),
			...(book.primary_affix?.effects ?? []),
			...(book.exclusive_affix?.effects ?? []),
		];
		const tiered = selectTiers(allEffects, prog);
		const missing = [
			...new Set(tiered.filter((e) => !hasHandler(e.type)).map((e) => e.type)),
		];
		if (missing.length === 0) {
			console.log(`  ✓ ${name}`);
		} else {
			console.log(`  ✗ ${name} — missing: ${missing.join(", ")}`);
		}
	}
	console.log(`\nHandlers: ${registeredTypes().join(", ")}`);
	process.exit(0);
}

// ── Config ──────────────────────────────────────────────────────────

const platformA = getArg("a");
const platformB = getArg("b");
if (!platformA || !platformB) {
	console.error(
		"Usage: bun app/simulate.ts --a <book> --b <book> [--speed N] [--instant]",
	);
	console.error("       bun app/simulate.ts --list");
	process.exit(1);
}

const speed = Number(getArg("speed") ?? "1");
const instant = hasFlag("instant");
const seed = Number(getArg("seed") ?? "42");
const hp = Number(getArg("hp") ?? "1e8");
const atk = Number(getArg("atk") ?? "1000");
const def = Number(getArg("def") ?? "9e5");
const sp = Number(getArg("sp") ?? "5000");

const playerConfig = {
	entity: { hp, atk, sp, def, spRegen: 100 },
	formulas: { dr_constant: 1e6, sp_shield_ratio: 1.0 },
	progression: { enlightenment: 10, fusion: 51 },
};

// Validate
try {
	validatePlayerConfig(
		{ ...playerConfig, books: [{ slot: 1, platform: platformA }] },
		booksYaml,
		affixesYaml,
	);
	validatePlayerConfig(
		{ ...playerConfig, books: [{ slot: 1, platform: platformB }] },
		booksYaml,
		affixesYaml,
	);
} catch (e) {
	console.error(`Config error: ${(e as Error).message}`);
	process.exit(1);
}

// ── Run simulation (instant) ────────────────────────────────────────

const clock = new SimulationClock();
const rng = new SeededRNG(seed);

function makePlayer(label: string, platform: string) {
	return createActor(playerMachine, {
		input: {
			label,
			initialState: {
				hp,
				maxHp: hp,
				sp,
				maxSp: sp,
				spRegen: 100,
				shield: 0,
				atk,
				baseAtk: atk,
				def,
				baseDef: def,
				states: [],
				alive: true,
			} as PlayerState,
			formulas: playerConfig.formulas,
			progression: playerConfig.progression,
			bookSlots: [{ slot: 1, platform }],
			booksYaml,
			affixesYaml,
			clock,
			rng,
			maxChainDepth: 10,
		},
		clock,
	});
}

const playerA = makePlayer("A", platformA);
const playerB = makePlayer("B", platformB);

// Collect all events with timestamps
const events: StateChangeEvent[] = [];
playerA.on("*", (ev: StateChangeEvent) => events.push({ ...ev, player: "A" }));
playerB.on("*", (ev: StateChangeEvent) => events.push({ ...ev, player: "B" }));

playerA.start();
playerB.start();

// Cast slot 1
playerA.send({ type: "CAST_SLOT", slot: 1 });
playerB.send({ type: "CAST_SLOT", slot: 1 });

// Interleave hits
const aHits = playerA.getSnapshot().context.pendingHits;
const bHits = playerB.getSnapshot().context.pendingHits;
const maxHits = Math.max(aHits.length, bHits.length);

for (let i = 0; i < maxHits; i++) {
	if (i < aHits.length && playerB.getSnapshot().context.state.alive) {
		playerB.send(aHits[i]);
	}
	if (i < bHits.length && playerA.getSnapshot().context.state.alive) {
		playerA.send(bHits[i]);
	}
}

// Non-HIT intents
if (playerB.getSnapshot().context.state.alive) {
	for (const intent of playerA.getSnapshot().context.pendingIntents) {
		playerB.send(intent);
	}
}
if (playerA.getSnapshot().context.state.alive) {
	for (const intent of playerB.getSnapshot().context.pendingIntents) {
		playerA.send(intent);
	}
}

// ── Format event for display ────────────────────────────────────────

function formatEvent(ev: StateChangeEvent): string | null {
	const t = `t=${((ev.t ?? 0) / 1000).toFixed(1).padStart(5)}`;
	const p = ev.player;

	switch (ev.type) {
		case "CAST_START":
			return `${t}  ⚔  ${p} casts ${ev.book} (slot ${ev.slot})`;
		case "HP_CHANGE": {
			const delta = ev.next - ev.prev;
			const sign = delta > 0 ? "+" : "";
			return `${t}  ${p} HP: ${ev.prev.toLocaleString()} → ${ev.next.toLocaleString()} (${sign}${delta.toLocaleString()}) [${ev.cause}]`;
		}
		case "SP_CHANGE":
			return `${t}  ${p} SP: ${ev.prev.toLocaleString()} → ${ev.next.toLocaleString()} [${ev.cause}]`;
		case "SHIELD_CHANGE":
			return `${t}  ${p} Shield: ${ev.prev.toLocaleString()} → ${ev.next.toLocaleString()} [${ev.cause}]`;
		case "STATE_APPLY":
			return `${t}  ${p} +${ev.state.name} (${ev.state.kind})`;
		case "STATE_EXPIRE":
			return `${t}  ${p} -${ev.name} (expired)`;
		case "STATE_TICK":
			return `${t}  ${p} ⟳ ${ev.name} tick`;
		case "STAT_CHANGE":
			return `${t}  ${p} ${ev.stat}: ${ev.prev.toLocaleString()} → ${ev.next.toLocaleString()}`;
		case "DEATH":
			return `${t}  💀 ${p} DIES`;
		default:
			return null;
	}
}

// ── Output ──────────────────────────────────────────────────────────

const aFinal = playerA.getSnapshot().context.state;
const bFinal = playerB.getSnapshot().context.state;
const winner =
	aFinal.alive && !bFinal.alive
		? `A (${platformA})`
		: !aFinal.alive && bFinal.alive
			? `B (${platformB})`
			: aFinal.alive
				? "Draw (both alive)"
				: "Draw (both dead)";

async function replay() {
	console.log(`\n⚔  ${platformA}  vs  ${platformB}`);
	console.log(
		`   HP: ${hp.toLocaleString()}  ATK: ${atk.toLocaleString()}  DEF: ${def.toLocaleString()}  SP: ${sp.toLocaleString()}`,
	);
	console.log(`   Seed: ${seed}  Speed: ${instant ? "instant" : `${speed}x`}`);
	console.log("─".repeat(70));
	console.log("");

	let lastT = 0;
	for (const ev of events) {
		const line = formatEvent(ev);
		if (!line) continue;

		const evT = (ev.t ?? 0) / 1000;
		if (!instant && evT > lastT) {
			const delay = ((evT - lastT) / speed) * 1000;
			await new Promise((r) => globalThis.setTimeout(r, delay));
			lastT = evT;
		}

		console.log(line);
	}

	console.log("");
	console.log("─".repeat(70));
	console.log(`Result: ${winner}`);
	console.log(
		`  A (${platformA}): HP=${aFinal.hp.toLocaleString()} ${aFinal.alive ? "alive" : "dead"}`,
	);
	console.log(
		`  B (${platformB}): HP=${bFinal.hp.toLocaleString()} ${bFinal.alive ? "alive" : "dead"}`,
	);
}

await replay();
