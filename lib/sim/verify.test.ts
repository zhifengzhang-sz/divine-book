/**
 * Verification test — hand-calculated snapshot.
 *
 * Verifies the implementation produces results matching the design formulas.
 *
 * Test case: 千锋聚灵剑 at enlightenment=10, fusion=51
 *   ATK=1000, DEF=9e5, K=1e6, SP=0, shield=0, maxHp=1e8
 *
 * Design §6 (damage chain):
 *   base_attack: 20265%, 6 hits
 *   per_hit_escalation: +42.5% M_skill per hit (惊神剑光, parent=this)
 *   percent_max_hp_damage: 27% of target's maxHp per hit (goes through DR)
 *
 * Design §7 (hit resolution):
 *   DR = DEF / (DEF + K) = 9e5 / 1.9e6 = 0.473684...
 *   mitigated = damage × (1 - DR)
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

// ── Constants ───────────────────────────────────────────────────────

const ATK = 1000;
const DEF = 9e5;
const DR_CONSTANT = 1e6;
const SP = 0;
const MAX_HP = 1e8;
const HITS = 6;
const BASE_PERCENT = 20265;
const ESCALATION_PER_HIT = 0.425;
const MAX_HP_PERCENT = 27;

const DR = DEF / (DEF + DR_CONSTANT); // 0.473684...
const PER_HIT_BASE = (BASE_PERCENT / HITS / 100) * ATK; // 33775

// ── Expected values per hit ─────────────────────────────────────────

function expectedHitDamage(hitIndex: number): number {
	return PER_HIT_BASE * (1 + hitIndex * ESCALATION_PER_HIT);
}

function expectedMitigated(hitIndex: number): number {
	return expectedHitDamage(hitIndex) * (1 - DR);
}

function expectedMaxHpDamageRaw(): number {
	return (MAX_HP_PERCENT / 100) * MAX_HP;
}

function expectedMaxHpMitigated(): number {
	// %maxHP now goes through DR as a normal HIT
	return expectedMaxHpDamageRaw() * (1 - DR);
}

// ── Test ────────────────────────────────────────────────────────────

describe("Verification: 千锋聚灵剑 hand-calculated snapshot", () => {
	const clock = new SimulationClock();
	const caster = createActor(playerMachine, {
		input: {
			label: "A",
			initialState: {
				hp: MAX_HP, maxHp: MAX_HP, sp: 5000, maxSp: 5000, spRegen: 100,
				shield: 0, atk: ATK, baseAtk: ATK, def: DEF, baseDef: DEF,
				states: [], alive: true,
			},
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: 1.0 },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots: [{ slot: 1, platform: "千锋聚灵剑" }],
			booksYaml, affixesYaml, clock, rng: new SeededRNG(42), maxChainDepth: 10,
		},
		clock,
	});
	caster.start();
	caster.send({ type: "CAST_SLOT", slot: 1 });
	const pendingHits = caster.getSnapshot().context.pendingHits;

	test("produces exactly 6 HIT events", () => {
		expect(pendingHits).toHaveLength(HITS);
	});

	test("hit damage matches design §6 damage chain formula", () => {
		for (let k = 0; k < HITS; k++) {
			expect(pendingHits[k].damage).toBeCloseTo(expectedHitDamage(k), 0);
		}
	});

	test("each hit carries %maxHP per-hit effect as HIT (not HP_DAMAGE)", () => {
		for (const hit of pendingHits) {
			expect(hit.perHitEffects).toBeDefined();
			expect(hit.perHitEffects).toHaveLength(1);
			// %maxHP is now a HIT event (goes through DR), not HP_DAMAGE
			expect(hit.perHitEffects?.[0].type).toBe("HIT");
			if (hit.perHitEffects?.[0].type === "HIT") {
				expect(hit.perHitEffects[0].damage).toBeCloseTo(expectedMaxHpDamageRaw(), 0);
			}
		}
	});

	// Send hits to a target and verify resolution
	describe("target resolution (design §7)", () => {
		const targetClock = new SimulationClock();
		const target = createActor(playerMachine, {
			input: {
				label: "B",
				initialState: {
					hp: MAX_HP, maxHp: MAX_HP, sp: SP, maxSp: 5000, spRegen: 0,
					shield: 0, atk: ATK, baseAtk: ATK, def: DEF, baseDef: DEF,
					states: [], alive: true,
				},
				formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: 1.0 },
				progression: { enlightenment: 10, fusion: 51 },
				bookSlots: [], booksYaml, affixesYaml,
				clock: targetClock, rng: new SeededRNG(99), maxChainDepth: 10,
			},
			clock: targetClock,
		});
		target.start();

		const events: StateChangeEvent[] = [];
		target.on("*", (ev: StateChangeEvent) => events.push(ev));

		for (const hit of pendingHits) {
			target.send(hit);
		}

		const hpChanges = events.filter((e) => e.type === "HP_CHANGE") as HpChangeEvent[];

		test("first ATK hit mitigated damage matches DR formula", () => {
			const firstHpChange = hpChanges[0];
			const actualDamage = firstHpChange.prev - firstHpChange.next;
			expect(actualDamage).toBeCloseTo(expectedMitigated(0), 0);
		});

		test("total damage per hit pair (ATK + %maxHP) matches formula", () => {
			// Each ATK hit is followed by its %maxHP HIT — both go through DR
			// First pair: hpChanges[0] (ATK hit_0) + hpChanges[1] (%maxHP hit_0)
			const atkDmg = hpChanges[0].prev - hpChanges[0].next;
			const maxHpDmg = hpChanges[1].prev - hpChanges[1].next;
			const totalPair = atkDmg + maxHpDmg;
			const expectedPair = expectedMitigated(0) + expectedMaxHpMitigated();
			expect(totalPair).toBeCloseTo(expectedPair, 0);
		});

		test("HP_CHANGE events chain correctly", () => {
			for (let i = 1; i < hpChanges.length; i++) {
				expect(hpChanges[i].prev).toBe(hpChanges[i - 1].next);
			}
		});

		test("target survives 6 hits at ATK=1000 (DR mitigates %maxHP)", () => {
			// Total mitigated per hit ≈ 17,776 + 14,210,526 ≈ 14.23M
			// 6 hits ≈ 85.4M < 100M HP
			expect(target.getSnapshot().context.state.alive).toBe(true);
			expect(target.getSnapshot().context.state.hp).toBeGreaterThan(0);
		});
	});
});

// ── SP Shield Generation ────────────────────────────────────────────

describe("Verification: SP shield generation", () => {
	const clock = new SimulationClock();
	const SP_AMOUNT = 10000;
	const SP_SHIELD_RATIO = 1.0;
	const HIT_DAMAGE = 50000;

	const target = createActor(playerMachine, {
		input: {
			label: "B",
			initialState: {
				hp: MAX_HP, maxHp: MAX_HP, sp: SP_AMOUNT, maxSp: SP_AMOUNT, spRegen: 0,
				shield: 0, atk: ATK, baseAtk: ATK, def: DEF, baseDef: DEF,
				states: [], alive: true,
			},
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: SP_SHIELD_RATIO },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots: [], booksYaml, affixesYaml,
			clock, rng: new SeededRNG(42), maxChainDepth: 10,
		},
		clock,
	});
	target.start();

	const events: StateChangeEvent[] = [];
	target.on("*", (ev: StateChangeEvent) => events.push(ev));
	target.send({ type: "HIT", hitIndex: 0, damage: HIT_DAMAGE, spDamage: 0 });

	const mitigated = HIT_DAMAGE * (1 - DR);

	test("SP consumed for shield generation", () => {
		const spGen = events.find(
			(e) => e.type === "SP_CHANGE" && e.cause === "shield_gen",
		) as SpChangeEvent | undefined;
		expect(spGen).toBeDefined();
		expect(spGen?.prev).toBe(SP_AMOUNT);
		expect(spGen?.next).toBeCloseTo(0, 0);
	});

	test("shield generated from SP", () => {
		const shieldGen = events.find(
			(e) => e.type === "SHIELD_CHANGE" && e.cause === "shield_gen",
		) as ShieldChangeEvent | undefined;
		expect(shieldGen).toBeDefined();
		expect(shieldGen?.next).toBeCloseTo(SP_AMOUNT * SP_SHIELD_RATIO, 0);
	});

	test("shield absorbs damage", () => {
		const shieldAbsorb = events.find(
			(e) => e.type === "SHIELD_CHANGE" && e.cause === "absorb",
		) as ShieldChangeEvent | undefined;
		expect(shieldAbsorb).toBeDefined();
		expect(shieldAbsorb?.next).toBe(0);
	});

	test("HP takes remaining damage after shield", () => {
		const hpChange = events.find((e) => e.type === "HP_CHANGE") as HpChangeEvent | undefined;
		expect(hpChange).toBeDefined();
		const hpLost = (hpChange?.prev ?? 0) - (hpChange?.next ?? 0);
		expect(hpLost).toBeCloseTo(mitigated - SP_AMOUNT * SP_SHIELD_RATIO, 0);
	});
});

// ── Conservation ────────────────────────────────────────────────────

describe("Conservation: HP changes sum correctly", () => {
	const clock = new SimulationClock();
	const target = createActor(playerMachine, {
		input: {
			label: "B",
			initialState: {
				hp: MAX_HP, maxHp: MAX_HP, sp: 0, maxSp: 0, spRegen: 0,
				shield: 0, atk: ATK, baseAtk: ATK, def: 0, baseDef: 0,
				states: [], alive: true,
			},
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: 0 },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots: [], booksYaml, affixesYaml,
			clock, rng: new SeededRNG(42), maxChainDepth: 10,
		},
		clock,
	});
	target.start();

	const events: StateChangeEvent[] = [];
	target.on("*", (ev: StateChangeEvent) => events.push(ev));

	target.send({ type: "HIT", hitIndex: 0, damage: 1000, spDamage: 0 });
	target.send({ type: "HIT", hitIndex: 1, damage: 2000, spDamage: 0 });
	target.send({ type: "HIT", hitIndex: 2, damage: 3000, spDamage: 0 });

	test("total HP lost equals sum of raw damages (DEF=0, no DR)", () => {
		const finalHp = target.getSnapshot().context.state.hp;
		expect(MAX_HP - finalHp).toBeCloseTo(1000 + 2000 + 3000, 0);
	});

	test("each HP_CHANGE delta matches the hit damage", () => {
		const hpChanges = events.filter((e) => e.type === "HP_CHANGE") as HpChangeEvent[];
		expect(hpChanges).toHaveLength(3);
		expect(hpChanges[0].prev - hpChanges[0].next).toBeCloseTo(1000, 0);
		expect(hpChanges[1].prev - hpChanges[1].next).toBeCloseTo(2000, 0);
		expect(hpChanges[2].prev - hpChanges[2].next).toBeCloseTo(3000, 0);
	});

	test("HP_CHANGE events chain correctly", () => {
		const hpChanges = events.filter((e) => e.type === "HP_CHANGE") as HpChangeEvent[];
		for (let i = 1; i < hpChanges.length; i++) {
			expect(hpChanges[i].prev).toBe(hpChanges[i - 1].next);
		}
	});
});
