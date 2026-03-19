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
import type { HpChangeEvent, PlayerState, StateChangeEvent } from "./types.js";

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
			bookSlots: [
				{
					slot: 1,
					platform: "千锋聚灵剑",
					progression: { enlightenment: 10, fusion: 51 },
				},
			],
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
	caster.send({ type: "SET_OPPONENT", ref: target });
	caster.send({ type: "CAST_SLOT", slot: 1 });
	clockA.drain(); // Fire all scheduled hits

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

describe("SP shield (consumable pool)", () => {
	const clock = new SimulationClock();
	const SP_AMOUNT = 10000;
	const RATIO = 10; // 1 SP consumed → 10 damage absorbed

	const target = createActor(playerMachine, {
		input: {
			label: "B",
			initialState: makeState({ sp: SP_AMOUNT, shield: 0 }),
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: RATIO },
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
	// After DR: 50000 * (1 - 900000/1900000) ≈ 26316
	// SP can absorb: min(10000, 26316/10) × 10 = 10000 × 10 = all of it if enough SP
	// SP consumed: min(10000, 26316/10) = min(10000, 2632) = 2632
	// shield = 2632 × 10 = 26316 (covers full mitigated damage)
	target.send({ type: "HIT", hitIndex: 0, damage: 50000, spDamage: 0 });

	test("SP consumed for shield generation", () => {
		const spChange = events.find(
			(e) => e.type === "SP_CHANGE" && e.cause === "shield_gen",
		) as { prev: number; next: number } | undefined;
		expect(spChange).toBeDefined();
		expect(spChange?.next).toBeLessThan(SP_AMOUNT);
		expect(spChange?.next).toBeGreaterThan(0); // not fully depleted
	});

	test("HP takes reduced damage (shield absorbed some)", () => {
		const hpChange = events.find((e) => e.type === "HP_CHANGE") as
			| { prev: number; next: number }
			| undefined;
		// With SP=10000 and ratio=10, total shield capacity = 100000
		// mitigated ≈ 26316, which is < 100000, so shield covers it all → no HP damage
		expect(hpChange).toBeUndefined();
	});

	test("SP depletes when shield capacity exceeded", () => {
		// Send a massive hit that exceeds remaining SP shield capacity
		const events2: StateChangeEvent[] = [];
		target.on("*", (ev: StateChangeEvent) => events2.push(ev));
		target.send({ type: "HIT", hitIndex: 1, damage: 5000000, spDamage: 0 });

		// SP should be fully consumed
		const spChange = events2
			.filter((e) => e.type === "SP_CHANGE" && e.cause === "shield_gen")
			.pop() as { next: number } | undefined;
		expect(spChange).toBeDefined();
		expect(spChange?.next).toBeCloseTo(0, 0);

		// HP should take the remainder
		const hpChange = events2.find((e) => e.type === "HP_CHANGE");
		expect(hpChange).toBeDefined();
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
