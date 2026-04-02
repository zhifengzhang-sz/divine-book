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
import {
	type AffixEntry,
	collectAllAffixes,
	isValidPair,
} from "../lib/construct/constraints.js";
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

// ── --sweep ──────────────────────────────────────────────────────────

if (hasFlag("sweep")) {
	const platform = getArg("a");
	const opponent = getArg("b") ?? "千锋聚灵剑+通明+斩岳";
	if (!platform) {
		console.error('Usage: bun app/simulate.ts --sweep --a "十方真魄" --b "千锋聚灵剑+通明+斩岳"');
		process.exit(1);
	}

	// Collect all affixes with source tracking for construction constraints
	const allAffixes = collectAllAffixes(booksYaml, affixesYaml);

	const topN = Number(getArg("top") ?? "20");
	const sweepHp = Number(getArg("hp") ?? "1e8");
	const sweepAtk = Number(getArg("atk") ?? String(sweepHp / 100));
	const sweepSp = Number(getArg("sp") ?? String(sweepHp / 10));
	const sweepDef = Number(getArg("def") ?? String(sweepAtk));
	const sweepSeed = Number(getArg("seed") ?? "42");
	const sweepProg = { enlightenment: 10, fusion: 51 };

	const sweepConfig = {
		entity: { hp: sweepHp, atk: sweepAtk, sp: sweepSp, def: sweepDef, spRegen: sweepSp / 100 },
		formulas: { dr_constant: sweepAtk * 10, sp_shield_ratio: 1.0 },
	};

	function runSim(aSpec: string, bSpec: string): { aHp: number; bHp: number; bDmgTaken: number; ttk: number } {
		const clockS = new SimulationClock();
		const rngS = new SeededRNG(sweepSeed);
		const parseSpec = (s: string) => { const p = s.split("+").map(x => x.trim()); return { platform: p[0], op1: p[1], op2: p[2] }; };
		const slotAS = { slot: 1, ...parseSpec(aSpec), progression: sweepProg };
		const slotBS = { slot: 1, ...parseSpec(bSpec), progression: sweepProg };

		try {
			validatePlayerConfig({ ...sweepConfig, books: [slotAS] }, booksYaml, affixesYaml);
			validatePlayerConfig({ ...sweepConfig, books: [slotBS] }, booksYaml, affixesYaml);
		} catch { return { aHp: 0, bHp: sweepHp, bDmgTaken: 0, ttk: Infinity }; }

		const mkPlayer = (label: string, slot: typeof slotAS) => createActor(playerMachine, {
			input: {
				label, initialState: {
					hp: sweepHp, maxHp: sweepHp, sp: sweepSp, maxSp: sweepSp,
					spRegen: sweepSp / 100, shield: 0, shields: [], destroyedShieldsTotal: 0,
					atk: sweepAtk, baseAtk: sweepAtk, def: sweepDef, baseDef: sweepDef,
					states: [], alive: true,
				} as PlayerState, formulas: sweepConfig.formulas,
				bookSlots: [slot], booksYaml, affixesYaml,
				clock: clockS, rng: rngS, maxChainDepth: 10,
			}, clock: clockS,
		});

		const pA = mkPlayer("A", slotAS);
		const pB = mkPlayer("B", slotBS);
		pA.start(); pB.start();
		pA.send({ type: "SET_OPPONENT", ref: pB });
		pB.send({ type: "SET_OPPONENT", ref: pA });

		const CAST_GAP = 25_000;
		const MAX_TIME = 300_000;
		let ttkMs = MAX_TIME;

		for (let t = 0; t <= MAX_TIME; t += CAST_GAP) {
			if (t > 0) clockS.advanceTo(t);
			const aAlive = pA.getSnapshot().context.state.alive;
			const bAlive = pB.getSnapshot().context.state.alive;
			if (!aAlive || !bAlive) { ttkMs = t; break; }
			pA.send({ type: "CAST_SLOT", slot: 1 });
			pB.send({ type: "CAST_SLOT", slot: 1 });
			clockS.advanceTo(t + CAST_GAP - 1);
		}

		const aFin = pA.getSnapshot().context.state;
		const bFin = pB.getSnapshot().context.state;
		pA.stop(); pB.stop();
		return { aHp: aFin.hp, bHp: bFin.hp, bDmgTaken: sweepHp - bFin.hp, ttk: ttkMs / 1000 };
	}

	// Enumerate valid pairs only
	const validPairs: [AffixEntry, AffixEntry][] = [];
	for (let i = 0; i < allAffixes.length; i++) {
		for (let j = i + 1; j < allAffixes.length; j++) {
			if (isValidPair(platform, allAffixes[i], allAffixes[j])) {
				validPairs.push([allAffixes[i], allAffixes[j]]);
			}
		}
	}

	console.log(`Sweeping ${platform} affix pairs vs ${opponent}`);
	console.log(`  ${allAffixes.length} affixes, ${validPairs.length} valid pairs (construction rules applied)\n`);

	const results: { op1: string; k1: string; src1?: string; op2: string; k2: string; src2?: string; bDmgTaken: number; aHp: number; ttk: number }[] = [];

	for (const [a, b] of validPairs) {
		const spec = `${platform}+${a.name}+${b.name}`;
		const r = runSim(spec, opponent);
		results.push({ op1: a.name, k1: a.kind, src1: a.sourceBook, op2: b.name, k2: b.kind, src2: b.sourceBook, bDmgTaken: r.bDmgTaken, aHp: r.aHp, ttk: r.ttk });
	}

	results.sort((a, b) => b.bDmgTaken - a.bDmgTaken);

	if (hasFlag("json")) {
		const topResults = results.slice(0, topN).map((r, i) => ({
			rank: i + 1,
			affix1: { name: r.op1, kind: r.k1, ...(r.src1 ? { sourceBook: r.src1 } : {}) },
			affix2: { name: r.op2, kind: r.k2, ...(r.src2 ? { sourceBook: r.src2 } : {}) },
			damageDealt: r.bDmgTaken,
			hpPercent: r.bDmgTaken / sweepHp * 100,
			ttk: r.ttk === Infinity ? null : r.ttk,
		}));
		const output = {
			platform,
			opponent,
			stats: { hp: sweepHp, atk: sweepAtk, sp: sweepSp, def: sweepDef },
			results: topResults,
		};
		console.log(JSON.stringify(output, null, 2));
	} else {
		console.log(`Top ${topN} by damage dealt to opponent:\n`);
		console.log("Rank | Affix 1 (type) + Affix 2 (type)                        | Dmg Dealt | Self HP% | TTK");
		console.log("-----|--------------------------------------------------------|-----------|----------|----");
		for (let i = 0; i < Math.min(topN, results.length); i++) {
			const r = results[i];
			const pctSelf = (r.aHp / sweepHp * 100).toFixed(1);
			const pctDmg = (r.bDmgTaken / sweepHp * 100).toFixed(1);
			const label = `${r.op1}(${r.k1}) + ${r.op2}(${r.k2})`;
			console.log(`${String(i + 1).padStart(4)} | ${label.padEnd(54)} | ${pctDmg.padStart(8)}% | ${pctSelf.padStart(7)}% | ${r.ttk === Infinity ? " ∞" : String(r.ttk.toFixed(0)).padStart(3)}s`);
		}
	}

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
const atk = Number(getArg("atk") ?? String(hp / 100));  // HP = 100 × ATK
const sp = Number(getArg("sp") ?? String(hp / 10));      // HP = 10 × SP
const def = Number(getArg("def") ?? String(atk));         // DEF ≈ ATK
const spRegen = Number(getArg("spRegen") ?? String(sp / 100));

const playerConfig = {
	entity: { hp, atk, sp, def, spRegen },
	formulas: { dr_constant: atk * 10, sp_shield_ratio: 1.0 },
};

const progression = { enlightenment: 10, fusion: 51 };
const slotA = { slot: 1, ...bookA, progression };
const slotB = { slot: 1, ...bookB, progression };

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
				shields: [],
				destroyedShieldsTotal: 0,
				atk,
				baseAtk: atk,
				def,
				baseDef: def,
				states: [],
				alive: true,
			} as PlayerState,
			formulas: playerConfig.formulas,
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

// Wire opponent refs via SET_OPPONENT event (not direct context mutation)
playerA.send({ type: "SET_OPPONENT", ref: playerB });
playerB.send({ type: "SET_OPPONENT", ref: playerA });

// Combat loop: cast every 25 seconds until someone dies or 5 minutes
const CAST_GAP = 25_000;
const MAX_TIME = 300_000;

for (let t = 0; t <= MAX_TIME; t += CAST_GAP) {
	// Advance clock to this cast time — fires pending ticks, expiries, hit deliveries
	if (t > 0) clock.advanceTo(t);

	const aAlive = playerA.getSnapshot().context.state.alive;
	const bAlive = playerB.getSnapshot().context.state.alive;
	if (!aAlive || !bAlive) break;

	playerA.send({ type: "CAST_SLOT", slot: 1 });
	playerB.send({ type: "CAST_SLOT", slot: 1 });

	// Advance to just before next cast — processes all hit delivery (1s gaps) and state events
	clock.advanceTo(t + CAST_GAP - 1);
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
