/**
 * Verification test — players communicate directly via sendTo.
 *
 * Caster sends CAST_SLOT → book produces intents → sendTo opponent.
 * Target resolves intents against own state → emits state-change events.
 */

import { describe, expect, test } from "bun:test";
import { createActor } from "xstate";
import { SimulationClock } from "./clock.js";
import { loadAffixesYaml, loadBooksYaml } from "./config.js";
import { playerMachine } from "./player.js";
import { SeededRNG } from "./rng.js";
import type {
	HpChangeEvent,
	PlayerState,
	ShieldChangeEvent,
	SpChangeEvent,
	StateChangeEvent,
} from "./types.js";

const booksYaml = loadBooksYaml();
const affixesYaml = loadAffixesYaml();

const ATK = 1000;
const DEF = 9e5;
const DR_CONSTANT = 1e6;
const MAX_HP = 1e8;
const DR = DEF / (DEF + DR_CONSTANT);

function makeState(overrides?: Partial<PlayerState>): PlayerState {
	return {
		hp: MAX_HP,
		maxHp: MAX_HP,
		sp: 5000,
		maxSp: 5000,
		spRegen: 100,
		shield: 0,
		atk: ATK,
		baseAtk: ATK,
		def: DEF,
		baseDef: DEF,
		states: [],
		alive: true,
		...overrides,
	};
}

// ── Full cast flow: caster → target via sendTo ──────────────────────

describe("Full cast: 千锋聚灵剑 → target via sendTo", () => {
	const clockA = new SimulationClock();
	const clockB = new SimulationClock();

	const caster = createActor(playerMachine, {
		input: {
			label: "A",
			initialState: makeState(),
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: 1.0 },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots: [{ slot: 1, platform: "千锋聚灵剑" }],
			booksYaml,
			affixesYaml,
			clock: clockA,
			rng: new SeededRNG(42),
			maxChainDepth: 10,
		},
		clock: clockA,
	});
	const target = createActor(playerMachine, {
		input: {
			label: "B",
			initialState: makeState({ sp: 0, shield: 0 }),
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: 1.0 },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots: [],
			booksYaml,
			affixesYaml,
			clock: clockB,
			rng: new SeededRNG(99),
			maxChainDepth: 10,
		},
		clock: clockB,
	});

	const targetEvents: StateChangeEvent[] = [];
	target.on("*", (ev: StateChangeEvent) => targetEvents.push(ev));

	caster.start();
	target.start();
	caster.getSnapshot().context.opponentRef = target;
	caster.send({ type: "CAST_SLOT", slot: 1 });

	const hpChanges = targetEvents.filter(
		(e) => e.type === "HP_CHANGE",
	) as HpChangeEvent[];

	test("target receives HP_CHANGE events from caster's HITs", () => {
		expect(hpChanges.length).toBeGreaterThan(0);
	});

	test("first ATK hit mitigated by DR", () => {
		const perHitBase = (20265 / 6 / 100) * ATK;
		const expectedMitigated = perHitBase * (1 - DR);
		const actual = hpChanges[0].prev - hpChanges[0].next;
		expect(actual).toBeCloseTo(expectedMitigated, 0);
	});

	test("HP_CHANGE events chain correctly", () => {
		for (let i = 1; i < hpChanges.length; i++) {
			expect(hpChanges[i].prev).toBe(hpChanges[i - 1].next);
		}
	});

	test("target receives debuff (灵涸) via APPLY_STATE", () => {
		const stateApplies = targetEvents.filter((e) => e.type === "STATE_APPLY");
		const linghe = stateApplies.find(
			(e) => e.type === "STATE_APPLY" && e.state.name === "灵涸",
		);
		expect(linghe).toBeDefined();
	});

	test("target survives one cast at ATK=1000 (DR mitigates %maxHP)", () => {
		expect(target.getSnapshot().context.state.alive).toBe(true);
		expect(target.getSnapshot().context.state.hp).toBeGreaterThan(0);
	});
});

// ── SP Shield Generation ────────────────────────────────────────────

describe("SP shield (divisive DR layer)", () => {
	const clock = new SimulationClock();
	const SP_AMOUNT = 10000;
	// sp_shield_ratio = K_sp in SP/(SP+K_sp). At SP=K_sp, reduction = 50%.
	const K_SP = SP_AMOUNT; // 50% reduction

	const target = createActor(playerMachine, {
		input: {
			label: "B",
			initialState: makeState({ sp: SP_AMOUNT, shield: 0 }),
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: K_SP },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots: [],
			booksYaml,
			affixesYaml,
			clock,
			rng: new SeededRNG(42),
			maxChainDepth: 10,
		},
		clock,
	});
	target.start();

	const events: StateChangeEvent[] = [];
	target.on("*", (ev: StateChangeEvent) => events.push(ev));
	target.send({ type: "HIT", hitIndex: 0, damage: 50000, spDamage: 0 });

	test("SP NOT consumed by shield (only resonance drains SP)", () => {
		const spChange = events.find(
			(e) => e.type === "SP_CHANGE" && e.cause === "shield_gen",
		);
		expect(spChange).toBeUndefined();
	});

	test("shield absorbs portion of damage", () => {
		expect(
			events.some((e) => e.type === "SHIELD_CHANGE" && e.cause === "shield_gen"),
		).toBe(true);
		expect(
			events.some((e) => e.type === "SHIELD_CHANGE" && e.cause === "absorb"),
		).toBe(true);
	});

	test("HP takes partial damage (not full)", () => {
		const hpChange = events.find((e) => e.type === "HP_CHANGE") as { prev: number; next: number } | undefined;
		expect(hpChange).toBeDefined();
		// With DR from DEF + 50% SP reduction, HP damage < mitigated damage
		const hpDamage = (hpChange?.prev ?? 0) - (hpChange?.next ?? 0);
		expect(hpDamage).toBeGreaterThan(0);
		expect(hpDamage).toBeLessThan(50000); // less than raw damage
	});
});

// ── Conservation ────────────────────────────────────────────────────

describe("Conservation: HP changes sum correctly", () => {
	const clock = new SimulationClock();
	const target = createActor(playerMachine, {
		input: {
			label: "B",
			initialState: makeState({ sp: 0, def: 0, baseDef: 0 }),
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: 0 },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots: [],
			booksYaml,
			affixesYaml,
			clock,
			rng: new SeededRNG(42),
			maxChainDepth: 10,
		},
		clock,
	});
	target.start();

	const events: StateChangeEvent[] = [];
	target.on("*", (ev: StateChangeEvent) => events.push(ev));

	target.send({ type: "HIT", hitIndex: 0, damage: 1000, spDamage: 0 });
	target.send({ type: "HIT", hitIndex: 1, damage: 2000, spDamage: 0 });
	target.send({ type: "HIT", hitIndex: 2, damage: 3000, spDamage: 0 });

	test("total HP lost equals sum of damages (DEF=0)", () => {
		const finalHp = target.getSnapshot().context.state.hp;
		expect(MAX_HP - finalHp).toBeCloseTo(6000, 0);
	});

	test("HP_CHANGE events chain correctly", () => {
		const hpChanges = events.filter(
			(e) => e.type === "HP_CHANGE",
		) as HpChangeEvent[];
		for (let i = 1; i < hpChanges.length; i++) {
			expect(hpChanges[i].prev).toBe(hpChanges[i - 1].next);
		}
	});
});
