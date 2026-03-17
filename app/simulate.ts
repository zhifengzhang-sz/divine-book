#!/usr/bin/env bun
/**
 * Combat simulator CLI — divine book vs divine book.
 *
 * A divine book = platform + up to 2 auxiliary affixes.
 *
 * Usage:
 *   bun app/simulate.ts --a 千锋聚灵剑+通明+斩岳 --b 星元化岳+摧山+灵犀九重
 *   bun app/simulate.ts --a 千锋聚灵剑 --b 星元化岳 --speed 2
 *   bun app/simulate.ts --a 千锋聚灵剑+通明+斩岳 --b 星元化岳 --instant
 *   bun app/simulate.ts --list
 *
 * Format: --a "platform+affix1+affix2" (affixes optional)
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

function parseBookArg(raw: string): {
	platform: string;
	op1?: string;
	op2?: string;
} {
	const parts = raw.split("+").map((s) => s.trim());
	return { platform: parts[0], op1: parts[1], op2: parts[2] };
}

const rawA = getArg("a");
const rawB = getArg("b");
if (!rawA || !rawB) {
	console.error(
		'Usage: bun app/simulate.ts --a "platform+affix1+affix2" --b "platform+affix1+affix2"',
	);
	console.error("       bun app/simulate.ts --list");
	process.exit(1);
}

const bookA = parseBookArg(rawA);
const bookB = parseBookArg(rawB);

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

const slotA = { slot: 1, ...bookA };
const slotB = { slot: 1, ...bookB };

// Validate
try {
	validatePlayerConfig(
		{ ...playerConfig, books: [slotA] },
		booksYaml,
		affixesYaml,
	);
	validatePlayerConfig(
		{ ...playerConfig, books: [slotB] },
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

function makePlayer(label: string, bookSlot: typeof slotA) {
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
			bookSlots: [bookSlot],
			booksYaml,
			affixesYaml,
			clock,
			rng,
			maxChainDepth: 10,
		},
		clock,
	});
}

const playerA = makePlayer("A", slotA);
const playerB = makePlayer("B", slotB);

// Collect all events with timestamps
const events: StateChangeEvent[] = [];
playerA.on("*", (ev: StateChangeEvent) => events.push({ ...ev, player: "A" }));
playerB.on("*", (ev: StateChangeEvent) => events.push({ ...ev, player: "B" }));

playerA.start();
playerB.start();

// Wire opponent refs — players send intents directly to each other
playerA.getSnapshot().context.opponentRef = playerB;
playerB.getSnapshot().context.opponentRef = playerA;

// Arena is just a clock — send CAST_SLOT, players handle everything
playerA.send({ type: "CAST_SLOT", slot: 1 });
playerB.send({ type: "CAST_SLOT", slot: 1 });

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

function formatBook(b: {
	platform: string;
	op1?: string;
	op2?: string;
}): string {
	const parts = [b.platform];
	if (b.op1) parts.push(b.op1);
	if (b.op2) parts.push(b.op2);
	return parts.join(" + ");
}

const labelA = formatBook(bookA);
const labelB = formatBook(bookB);
const aFinal = playerA.getSnapshot().context.state;
const bFinal = playerB.getSnapshot().context.state;
const winner =
	aFinal.alive && !bFinal.alive
		? `A (${labelA})`
		: !aFinal.alive && bFinal.alive
			? `B (${labelB})`
			: aFinal.alive
				? "Draw (both alive)"
				: "Draw (both dead)";

// ── JSON output mode ────────────────────────────────────────────────

if (hasFlag("json")) {
	const output = {
		config: {
			playerA: { label: "A", book: labelA, ...playerConfig.entity },
			playerB: { label: "B", book: labelB, ...playerConfig.entity },
			seed,
		},
		events,
		result: {
			winner: winner.startsWith("A")
				? "A"
				: winner.startsWith("B")
					? "B"
					: null,
			aFinalHp: aFinal.hp,
			bFinalHp: bFinal.hp,
		},
	};
	console.log(JSON.stringify(output));
	process.exit(0);
}

// ── Interactive replay ──────────────────────────────────────────────

async function replay() {
	console.log(`\n⚔  ${labelA}  vs  ${labelB}`);
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
		`  A (${labelA}): HP=${aFinal.hp.toLocaleString()} ${aFinal.alive ? "alive" : "dead"}`,
	);
	console.log(
		`  B (${labelB}): HP=${bFinal.hp.toLocaleString()} ${bFinal.alive ? "alive" : "dead"}`,
	);
}

await replay();
