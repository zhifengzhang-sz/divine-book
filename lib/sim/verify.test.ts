/**
 * Verification test — hand-calculated snapshot.
 *
 * Verifies the simulator does what design.md says, by computing
 * expected values from the design formulas and comparing against
 * the actual event stream from the Player machine.
 *
 * Test case: 千锋聚灵剑 at enlightenment=10, fusion=51
 *   ATK=1000, DEF=9e5, K=1e6, SP=0, shield=0, maxHp=1e8
 *
 * Design §6 (damage chain):
 *   base_attack: 20265%, 6 hits
 *   per_hit_escalation: +42.5% M_skill per hit (惊神剑光, parent=this)
 *
 * Design §7 (hit resolution):
 *   DR = DEF / (DEF + K) = 9e5 / 1.9e6 = 0.473684...
 *   mitigated = damage × (1 - DR)
 *
 * Design §2 (%maxHP per hit):
 *   percent_max_hp_damage: 27% of maxHp per hit, bypasses DR
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
const SP = 0; // no SP → no shield generation
const MAX_HP = 1e8;
const HITS = 6;
const BASE_PERCENT = 20265; // 千锋聚灵剑 at e10/f51
const ESCALATION_PER_HIT = 0.425; // 惊神剑光: 42.5% M_skill per hit
const MAX_HP_PERCENT = 27; // percent_max_hp_damage per hit

// Derived
const DR = DEF / (DEF + DR_CONSTANT); // 0.473684...
const PER_HIT_BASE = (BASE_PERCENT / HITS / 100) * ATK; // 33775

// ── Expected values per hit ─────────────────────────────────────────

function expectedHitDamage(hitIndex: number): number {
	// Design §6: perHitDamage × (1 + M_skill)
	// M_skill = hitIndex × 0.425 (from per_hit_escalation)
	return PER_HIT_BASE * (1 + hitIndex * ESCALATION_PER_HIT);
}

function expectedMitigated(hitIndex: number): number {
	// Design §7: damage × (1 - DR)
	return expectedHitDamage(hitIndex) * (1 - DR);
}

function expectedMaxHpDamage(): number {
	// Design §2: percent% of maxHp, bypasses DR
	return (MAX_HP_PERCENT / 100) * MAX_HP;
}

// ── Test ────────────────────────────────────────────────────────────

describe("Verification: 千锋聚灵剑 hand-calculated snapshot", () => {
	// Create player A (caster) and collect the pending hits
	const clock = new SimulationClock();
	const caster = createActor(playerMachine, {
		input: {
			label: "A",
			initialState: {
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
			},
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: 1.0 },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots: [{ slot: 1, platform: "千锋聚灵剑" }],
			booksYaml,
			affixesYaml,
			clock,
			rng: new SeededRNG(42),
			maxChainDepth: 10,
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
			const hit = pendingHits[k];
			const expected = expectedHitDamage(k);
			expect(hit.damage).toBeCloseTo(expected, 0);
		}
	});

	test("hit 0 has no escalation bonus", () => {
		expect(pendingHits[0].damage).toBeCloseTo(PER_HIT_BASE, 0);
	});

	test("hit 1 has +42.5% M_skill escalation", () => {
		expect(pendingHits[1].damage).toBeCloseTo(
			PER_HIT_BASE * (1 + ESCALATION_PER_HIT),
			0,
		);
	});

	test("hit 5 (last) has +212.5% M_skill escalation", () => {
		expect(pendingHits[5].damage).toBeCloseTo(
			PER_HIT_BASE * (1 + 5 * ESCALATION_PER_HIT),
			0,
		);
	});

	test("each hit carries %maxHP per-hit effect", () => {
		for (const hit of pendingHits) {
			expect(hit.perHitEffects).toBeDefined();
			expect(hit.perHitEffects).toHaveLength(1);
			expect(hit.perHitEffects?.[0]).toMatchObject({
				type: "HP_DAMAGE",
				percent: MAX_HP_PERCENT,
				basis: "max",
			});
		}
	});

	// Now send these hits to a target player and verify resolution
	describe("target resolution (design §7)", () => {
		const targetClock = new SimulationClock();
		const target = createActor(playerMachine, {
			input: {
				label: "B",
				initialState: {
					hp: MAX_HP,
					maxHp: MAX_HP,
					sp: SP,
					maxSp: 5000,
					spRegen: 0,
					shield: 0,
					atk: ATK,
					baseAtk: ATK,
					def: DEF,
					baseDef: DEF,
					states: [],
					alive: true,
				},
				formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: 1.0 },
				progression: { enlightenment: 10, fusion: 51 },
				bookSlots: [],
				booksYaml,
				affixesYaml,
				clock: targetClock,
				rng: new SeededRNG(99),
				maxChainDepth: 10,
			},
			clock: targetClock,
		});
		target.start();

		const events: StateChangeEvent[] = [];
		target.on("*", (ev: StateChangeEvent) => events.push(ev));

		// Send all 6 hits
		for (const hit of pendingHits) {
			target.send(hit);
		}

		const hpChanges = events.filter(
			(e) => e.type === "HP_CHANGE",
		) as HpChangeEvent[];

		// Death trace: 27% maxHP = 27M per hit. Target dies during hit 3's %maxHP.
		//   hit 0 mitigated: 100M → 100M - 17,776 = 99,982,224
		//   hit 0 %maxHP:    99,982,224 - 27M = 72,982,224
		//   hit 1 mitigated: 72,982,224 - 25,331 = 72,956,893
		//   hit 1 %maxHP:    72,956,893 - 27M = 45,956,893
		//   hit 2 mitigated: 45,956,893 - 32,885 = 45,924,008
		//   hit 2 %maxHP:    45,924,008 - 27M = 18,924,008
		//   hit 3 mitigated: 18,924,008 - 40,440 = 18,883,568
		//   hit 3 %maxHP:    18,883,568 - 27M < 0 → DEATH (absorbing boundary)
		//   hits 4-5: not processed (machine in final state)

		test("target dies during hit 3 (8 HP_CHANGE events, not 12)", () => {
			// 4 hits × 2 HP_CHANGE each (mitigated + %maxHP) = 8
			expect(hpChanges.length).toBe(8);
		});

		test("first hit mitigated damage matches DR formula", () => {
			const firstHpChange = hpChanges[0];
			const expectedMit = expectedMitigated(0);
			const actualDamage = firstHpChange.prev - firstHpChange.next;
			expect(actualDamage).toBeCloseTo(expectedMit, 0);
		});

		test("first %maxHP damage matches design §2", () => {
			const maxHpChange = hpChanges[1];
			const actualDamage = maxHpChange.prev - maxHpChange.next;
			expect(actualDamage).toBeCloseTo(expectedMaxHpDamage(), 0);
		});

		test("HP_CHANGE events chain correctly (prev of N+1 = next of N)", () => {
			for (let i = 1; i < hpChanges.length; i++) {
				expect(hpChanges[i].prev).toBe(hpChanges[i - 1].next);
			}
		});

		test("total HP lost = maxHp (target killed, HP clamped to 0)", () => {
			const finalHp = target.getSnapshot().context.state.hp;
			expect(finalHp).toBe(0);
			expect(MAX_HP - finalHp).toBe(MAX_HP);
		});

		test("no SP changes (SP=0, no shield generation)", () => {
			const spChanges = events.filter((e) => e.type === "SP_CHANGE");
			expect(spChanges).toHaveLength(0);
		});

		test("no shield changes (shield=0, SP=0)", () => {
			const shieldChanges = events.filter((e) => e.type === "SHIELD_CHANGE");
			expect(shieldChanges).toHaveLength(0);
		});

		test("DEATH event emitted (absorbing boundary)", () => {
			const death = events.find((e) => e.type === "DEATH");
			expect(death).toBeDefined();
		});

		test("machine enters final state after DEATH", () => {
			expect(target.getSnapshot().status).toBe("done");
		});
	});
});

// ── Verification with SP shield generation ──────────────────────────

describe("Verification: SP shield generation", () => {
	const clock = new SimulationClock();
	const SP_AMOUNT = 10000;
	const SP_SHIELD_RATIO = 1.0;
	const HIT_DAMAGE = 50000; // raw damage before DR

	const target = createActor(playerMachine, {
		input: {
			label: "B",
			initialState: {
				hp: MAX_HP,
				maxHp: MAX_HP,
				sp: SP_AMOUNT,
				maxSp: SP_AMOUNT,
				spRegen: 0,
				shield: 0,
				atk: ATK,
				baseAtk: ATK,
				def: DEF,
				baseDef: DEF,
				states: [],
				alive: true,
			},
			formulas: { dr_constant: DR_CONSTANT, sp_shield_ratio: SP_SHIELD_RATIO },
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

	target.send({ type: "HIT", hitIndex: 0, damage: HIT_DAMAGE, spDamage: 0 });

	// DR = 0.473684, mitigated = 50000 × 0.526316 = 26315.8
	const mitigated = HIT_DAMAGE * (1 - DR);

	// Shield gen: min(SP, mitigated) × ratio = min(10000, 26315.8) × 1 = 10000
	// SP consumed = 10000 / 1 = 10000
	// Shield absorbs min(26315.8, 10000) = 10000
	// HP damage = 26315.8 - 10000 = 16315.8

	test("SP consumed for shield generation", () => {
		const spGen = events.find(
			(e) => e.type === "SP_CHANGE" && e.cause === "shield_gen",
		) as SpChangeEvent | undefined;
		expect(spGen).toBeDefined();
		expect(spGen?.prev).toBe(SP_AMOUNT);
		expect(spGen?.next).toBeCloseTo(0, 0); // all SP consumed
	});

	test("shield generated from SP", () => {
		const shieldGen = events.find(
			(e) => e.type === "SHIELD_CHANGE" && e.cause === "shield_gen",
		) as ShieldChangeEvent | undefined;
		expect(shieldGen).toBeDefined();
		expect(shieldGen?.prev).toBe(0);
		expect(shieldGen?.next).toBeCloseTo(SP_AMOUNT * SP_SHIELD_RATIO, 0);
	});

	test("shield absorbs damage", () => {
		const shieldAbsorb = events.find(
			(e) => e.type === "SHIELD_CHANGE" && e.cause === "absorb",
		) as ShieldChangeEvent | undefined;
		expect(shieldAbsorb).toBeDefined();
		// Shield had 10000, absorbed 10000
		expect(shieldAbsorb?.next).toBe(0);
	});

	test("HP takes remaining damage after shield", () => {
		const hpChange = events.find((e) => e.type === "HP_CHANGE") as
			| HpChangeEvent
			| undefined;
		expect(hpChange).toBeDefined();
		const hpLost = (hpChange?.prev ?? 0) - (hpChange?.next ?? 0);
		expect(hpLost).toBeCloseTo(mitigated - SP_AMOUNT * SP_SHIELD_RATIO, 0);
	});
});

// ── Conservation check ──────────────────────────────────────────────

describe("Conservation: HP changes sum correctly", () => {
	const clock = new SimulationClock();
	const target = createActor(playerMachine, {
		input: {
			label: "B",
			initialState: {
				hp: MAX_HP,
				maxHp: MAX_HP,
				sp: 0,
				maxSp: 0,
				spRegen: 0,
				shield: 0,
				atk: ATK,
				baseAtk: ATK,
				def: 0, // zero def → DR = 0
				baseDef: 0,
				states: [],
				alive: true,
			},
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

	// Send 3 hits with known damage, no DR, no shield
	target.send({ type: "HIT", hitIndex: 0, damage: 1000, spDamage: 0 });
	target.send({ type: "HIT", hitIndex: 1, damage: 2000, spDamage: 0 });
	target.send({ type: "HIT", hitIndex: 2, damage: 3000, spDamage: 0 });

	// With DEF=0, DR = 0/(0+1e6) = 0. No shield, no SP. Damage goes straight to HP.
	test("total HP lost equals sum of raw damages", () => {
		const finalHp = target.getSnapshot().context.state.hp;
		expect(MAX_HP - finalHp).toBeCloseTo(1000 + 2000 + 3000, 0);
	});

	test("each HP_CHANGE delta matches the hit damage", () => {
		const hpChanges = events.filter(
			(e) => e.type === "HP_CHANGE",
		) as HpChangeEvent[];
		expect(hpChanges).toHaveLength(3);
		expect(hpChanges[0].prev - hpChanges[0].next).toBeCloseTo(1000, 0);
		expect(hpChanges[1].prev - hpChanges[1].next).toBeCloseTo(2000, 0);
		expect(hpChanges[2].prev - hpChanges[2].next).toBeCloseTo(3000, 0);
	});

	test("HP_CHANGE events chain correctly (prev of N+1 = next of N)", () => {
		const hpChanges = events.filter(
			(e) => e.type === "HP_CHANGE",
		) as HpChangeEvent[];
		for (let i = 1; i < hpChanges.length; i++) {
			expect(hpChanges[i].prev).toBe(hpChanges[i - 1].next);
		}
	});
});
