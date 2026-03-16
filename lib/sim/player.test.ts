import { describe, expect, test } from "bun:test";
import { createActor } from "xstate";
import { SimulationClock } from "./clock.js";
import { loadAffixesYaml, loadBooksYaml } from "./config.js";
import { playerMachine } from "./player.js";
import { SeededRNG } from "./rng.js";
import type { PlayerState, StateChangeEvent, StateInstance } from "./types.js";

const booksYaml = loadBooksYaml();
const affixesYaml = loadAffixesYaml();

function makePlayerState(overrides?: Partial<PlayerState>): PlayerState {
	return {
		hp: 1e8,
		maxHp: 1e8,
		sp: 5000,
		maxSp: 5000,
		spRegen: 100,
		shield: 0,
		atk: 1000,
		baseAtk: 1000,
		def: 9e5,
		baseDef: 9e5,
		states: [],
		alive: true,
		...overrides,
	};
}

function createPlayer(
	label: string,
	overrides?: Partial<PlayerState>,
	bookSlots = [{ slot: 1, platform: "千锋聚灵剑" }],
) {
	const clock = new SimulationClock();
	const actor = createActor(playerMachine, {
		input: {
			label,
			initialState: makePlayerState(overrides),
			formulas: { dr_constant: 1e6, sp_shield_ratio: 1.0 },
			progression: { enlightenment: 10, fusion: 51 },
			bookSlots,
			booksYaml,
			affixesYaml,
			clock,
			rng: new SeededRNG(42),
			maxChainDepth: 10,
		},
		clock,
	});
	return { actor, clock };
}

function collectEvents(
	actor: ReturnType<typeof createPlayer>["actor"],
): StateChangeEvent[] {
	const events: StateChangeEvent[] = [];
	actor.on("*", (ev: StateChangeEvent) => events.push(ev));
	return events;
}

// ── HIT Resolution ──────────────────────────────────────────────────

describe("HIT resolution", () => {
	test("reduces HP after DR and shield", () => {
		const { actor } = createPlayer("B", { shield: 0, sp: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 10000,
			spDamage: 0,
		});

		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		expect(hpChange).toBeDefined();
		if (hpChange?.type === "HP_CHANGE") {
			expect(hpChange.prev).toBe(1e8);
			// With def=9e5, dr_constant=1e6: DR = 9e5/(9e5+1e6) = 0.4737
			// mitigated = 10000 * (1 - 0.4737) = 5263
			expect(hpChange.next).toBeCloseTo(1e8 - 5263, -1);
		}
	});

	test("SP generates shield on damage", () => {
		const { actor } = createPlayer("B", { sp: 5000, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 1000,
			spDamage: 0,
		});

		const spChange = events.find(
			(e) => e.type === "SP_CHANGE" && e.cause === "shield_gen",
		);
		expect(spChange).toBeDefined();

		const shieldChange = events.find(
			(e) => e.type === "SHIELD_CHANGE" && e.cause === "shield_gen",
		);
		expect(shieldChange).toBeDefined();
	});

	test("shield absorbs damage", () => {
		const { actor } = createPlayer("B", { shield: 50000, sp: 0 });
		actor.start();
		const events = collectEvents(actor);

		// With DR ~47%, 10000 raw → ~5263 mitigated. Shield=50000 absorbs all.
		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 10000,
			spDamage: 0,
		});

		const shieldAbsorb = events.find(
			(e) => e.type === "SHIELD_CHANGE" && e.cause === "absorb",
		);
		expect(shieldAbsorb).toBeDefined();

		// HP should not change (shield absorbed everything)
		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		expect(hpChange).toBeUndefined();
	});

	test("resonance damages SP", () => {
		const { actor } = createPlayer("B", { sp: 5000 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 0,
			spDamage: 1000,
		});

		const spChange = events.find(
			(e) => e.type === "SP_CHANGE" && e.cause === "resonance",
		);
		expect(spChange).toBeDefined();
		if (spChange?.type === "SP_CHANGE") {
			expect(spChange.prev).toBe(5000);
			expect(spChange.next).toBe(4000);
		}
	});

	test("SP depletion means no shield generation", () => {
		const { actor } = createPlayer("B", { sp: 0, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 10000,
			spDamage: 0,
		});

		// No shield gen events
		const shieldGen = events.find(
			(e) => e.type === "SP_CHANGE" && e.cause === "shield_gen",
		);
		expect(shieldGen).toBeUndefined();

		// HP takes full mitigated damage
		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		expect(hpChange).toBeDefined();
	});

	test("per-hit effects fire", () => {
		const { actor } = createPlayer("B");
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 0,
			spDamage: 0,
			perHitEffects: [{ type: "HP_DAMAGE", percent: 10, basis: "max" }],
		});

		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		expect(hpChange).toBeDefined();
		if (hpChange?.type === "HP_CHANGE") {
			// 10% of maxHp (1e8) = 1e7
			expect(hpChange.next).toBeCloseTo(1e8 - 1e7, -1);
		}
	});
});

// ── DEATH (absorbing boundary) ──────────────────────────────────────

describe("DEATH", () => {
	test("emits DEATH when HP reaches 0", () => {
		const { actor } = createPlayer("B", { hp: 100, sp: 0, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 1e9, // massive damage
			spDamage: 0,
		});

		const death = events.find((e) => e.type === "DEATH");
		expect(death).toBeDefined();
	});

	test("machine enters final state after DEATH", () => {
		const { actor } = createPlayer("B", { hp: 100, sp: 0, shield: 0 });
		actor.start();

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 1e9,
			spDamage: 0,
		});

		expect(actor.getSnapshot().status).toBe("done");
	});

	test("ignores events after DEATH", () => {
		const { actor } = createPlayer("B", { hp: 100, sp: 0, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 1e9,
			spDamage: 0,
		});

		// Send another hit — should be ignored
		actor.send({
			type: "HIT",
			hitIndex: 1,
			damage: 1e9,
			spDamage: 0,
		});

		const hpChanges = events.filter((e) => e.type === "HP_CHANGE");
		expect(hpChanges).toHaveLength(1); // only from the first hit
	});
});

// ── State Management ────────────────────────────────────────────────

describe("State management", () => {
	test("APPLY_STATE adds state and emits STATE_APPLY", () => {
		const { actor } = createPlayer("A");
		actor.start();
		const events = collectEvents(actor);

		const state: StateInstance = {
			name: "仙佑",
			kind: "buff",
			source: "甲元仙符",
			target: "self",
			effects: [{ stat: "attack_bonus", value: 70 }],
			remainingDuration: 12,
			stacks: 1,
			maxStacks: 1,
			dispellable: true,
		};

		actor.send({ type: "APPLY_STATE", state });

		const stateApply = events.find((e) => e.type === "STATE_APPLY");
		expect(stateApply).toBeDefined();

		// ATK should be recalculated
		const statChange = events.find(
			(e) => e.type === "STAT_CHANGE" && e.stat === "atk",
		);
		expect(statChange).toBeDefined();
		if (statChange?.type === "STAT_CHANGE") {
			expect(statChange.next).toBeCloseTo(1000 * 1.7, 0);
		}
	});

	test("debuff reduces healing", () => {
		const { actor } = createPlayer("A");
		actor.start();

		// Apply healing reduction debuff
		actor.send({
			type: "APPLY_STATE",
			state: {
				name: "灵涸",
				kind: "debuff",
				source: "千锋聚灵剑",
				target: "self",
				effects: [{ stat: "healing_received", value: -80 }],
				remainingDuration: 8,
				stacks: 1,
				maxStacks: 1,
				dispellable: false,
			},
		});

		const events = collectEvents(actor);

		// Heal 10000
		actor.send({ type: "HEAL", value: 10000 });

		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		if (hpChange?.type === "HP_CHANGE") {
			// healing_received = -80, so healMult = 1 + (-80/100) = 0.2
			// effective heal = 10000 * 0.2 = 2000
			expect(hpChange.next - hpChange.prev).toBeCloseTo(2000, 0);
		}
	});
});

// ── CAST_SLOT ───────────────────────────────────────────────────────

describe("CAST_SLOT", () => {
	test("emits CAST_START and CAST_END", () => {
		const { actor } = createPlayer("A");
		actor.start();
		const events = collectEvents(actor);

		actor.send({ type: "CAST_SLOT", slot: 1 });

		expect(events.some((e) => e.type === "CAST_START")).toBe(true);
		expect(events.some((e) => e.type === "CAST_END")).toBe(true);
	});

	test("produces pendingHits in context", () => {
		const { actor } = createPlayer("A");
		actor.start();

		actor.send({ type: "CAST_SLOT", slot: 1 });

		const ctx = actor.getSnapshot().context;
		expect(ctx.pendingHits.length).toBeGreaterThan(0);
		expect(ctx.pendingHits[0].type).toBe("HIT");
		expect(ctx.pendingHits[0].damage).toBeGreaterThan(0);
	});

	test("千锋聚灵剑 produces 6 pending hits", () => {
		const { actor } = createPlayer("A");
		actor.start();

		actor.send({ type: "CAST_SLOT", slot: 1 });

		const ctx = actor.getSnapshot().context;
		expect(ctx.pendingHits).toHaveLength(6);
	});

	test("produces pendingIntents for debuffs", () => {
		const { actor } = createPlayer("A");
		actor.start();

		actor.send({ type: "CAST_SLOT", slot: 1 });

		const ctx = actor.getSnapshot().context;
		// 千锋聚灵剑 exclusive affix 天哀灵涸 applies debuff to opponent
		const debuffIntent = ctx.pendingIntents.find(
			(i) => i.type === "APPLY_STATE",
		);
		expect(debuffIntent).toBeDefined();
	});
});

// ── HP_COST ─────────────────────────────────────────────────────────

describe("HP_COST", () => {
	test("reduces HP by percent of current", () => {
		const { actor } = createPlayer("A", { hp: 1e8 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({ type: "HP_COST", percent: 10, basis: "current" });

		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		expect(hpChange).toBeDefined();
		if (hpChange?.type === "HP_CHANGE") {
			expect(hpChange.next).toBeCloseTo(0.9e8, 0);
		}
	});
});
