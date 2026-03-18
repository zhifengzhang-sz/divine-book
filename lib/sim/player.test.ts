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

		actor.send({ type: "HIT", hitIndex: 0, damage: 10000, spDamage: 0 });

		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		expect(hpChange).toBeDefined();
		if (hpChange?.type === "HP_CHANGE") {
			expect(hpChange.prev).toBe(1e8);
			expect(hpChange.next).toBeCloseTo(1e8 - 5263, -1);
		}
	});

	test("SP generates shield on damage", () => {
		const { actor } = createPlayer("B", { sp: 5000, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({ type: "HIT", hitIndex: 0, damage: 1000, spDamage: 0 });

		expect(
			events.some((e) => e.type === "SP_CHANGE" && e.cause === "shield_gen"),
		).toBe(true);
		expect(
			events.some(
				(e) => e.type === "SHIELD_CHANGE" && e.cause === "shield_gen",
			),
		).toBe(true);
	});

	test("shield absorbs damage", () => {
		const { actor } = createPlayer("B", { shield: 50000, sp: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({ type: "HIT", hitIndex: 0, damage: 10000, spDamage: 0 });

		expect(
			events.some((e) => e.type === "SHIELD_CHANGE" && e.cause === "absorb"),
		).toBe(true);
		expect(events.find((e) => e.type === "HP_CHANGE")).toBeUndefined();
	});

	test("resonance damages SP", () => {
		const { actor } = createPlayer("B", { sp: 5000 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({ type: "HIT", hitIndex: 0, damage: 0, spDamage: 1000 });

		const spChange = events.find(
			(e) => e.type === "SP_CHANGE" && e.cause === "resonance",
		);
		expect(spChange).toBeDefined();
		if (spChange?.type === "SP_CHANGE") {
			expect(spChange.next).toBe(4000);
		}
	});

	test("per-hit PERCENT_MAX_HP_HIT resolves against target maxHp", () => {
		const { actor } = createPlayer("B", { sp: 0, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "HIT",
			hitIndex: 0,
			damage: 0,
			spDamage: 0,
			perHitEffects: [{ type: "PERCENT_MAX_HP_HIT", percent: 10 }],
		});

		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		expect(hpChange).toBeDefined();
		if (hpChange?.type === "HP_CHANGE") {
			// 10% of 1e8 = 1e7, after DR (47.4%) = ~5,263,158
			const damage = hpChange.prev - hpChange.next;
			expect(damage).toBeCloseTo(1e7 * (1 - 9e5 / (9e5 + 1e6)), -1);
		}
	});
});

// ── DEATH (absorbing boundary) ──────────────────────────────────────

describe("DEATH", () => {
	test("emits DEATH on CHECK_DEATH after HP reaches 0", () => {
		const { actor } = createPlayer("B", { hp: 100, sp: 0, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({ type: "HIT", hitIndex: 0, damage: 1e9, spDamage: 0 });
		// Death is deferred — no DEATH yet
		expect(events.some((e) => e.type === "DEATH")).toBe(false);
		// CHECK_DEATH triggers the transition
		actor.send({ type: "CHECK_DEATH" });
		expect(events.some((e) => e.type === "DEATH")).toBe(true);
	});

	test("machine enters final state after CHECK_DEATH", () => {
		const { actor } = createPlayer("B", { hp: 100, sp: 0, shield: 0 });
		actor.start();

		actor.send({ type: "HIT", hitIndex: 0, damage: 1e9, spDamage: 0 });
		expect(actor.getSnapshot().status).toBe("active");
		actor.send({ type: "CHECK_DEATH" });
		expect(actor.getSnapshot().status).toBe("done");
	});

	test("processes events before CHECK_DEATH even at HP<=0", () => {
		const { actor } = createPlayer("B", { hp: 100, sp: 0, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		// Both hits resolve even though first one brings HP to 0
		actor.send({ type: "HIT", hitIndex: 0, damage: 1e9, spDamage: 0 });
		actor.send({ type: "HIT", hitIndex: 1, damage: 1e9, spDamage: 0 });

		const hpChanges = events.filter((e) => e.type === "HP_CHANGE");
		expect(hpChanges).toHaveLength(2);

		actor.send({ type: "CHECK_DEATH" });
		expect(events.some((e) => e.type === "DEATH")).toBe(true);
	});

	test("ignores events after CHECK_DEATH", () => {
		const { actor } = createPlayer("B", { hp: 100, sp: 0, shield: 0 });
		actor.start();
		const events = collectEvents(actor);

		actor.send({ type: "HIT", hitIndex: 0, damage: 1e9, spDamage: 0 });
		actor.send({ type: "CHECK_DEATH" });
		// After dead (final state), further events are ignored
		actor.send({ type: "HIT", hitIndex: 1, damage: 1e9, spDamage: 0 });

		const hpChanges = events.filter((e) => e.type === "HP_CHANGE");
		expect(hpChanges).toHaveLength(1);
	});
});

// ── State Management ────────────────────────────────────────────────

describe("State management", () => {
	test("APPLY_STATE adds state and recalculates ATK", () => {
		const { actor } = createPlayer("A");
		actor.start();
		const events = collectEvents(actor);

		actor.send({
			type: "APPLY_STATE",
			state: {
				name: "仙佑",
				kind: "buff",
				source: "甲元仙符",
				target: "self",
				effects: [{ stat: "attack_bonus", value: 70 }],
				remainingDuration: 12,
				stacks: 1,
				maxStacks: 1,
				dispellable: true,
			},
		});

		expect(events.some((e) => e.type === "STATE_APPLY")).toBe(true);
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
		actor.send({ type: "HEAL", value: 10000 });

		const hpChange = events.find((e) => e.type === "HP_CHANGE");
		if (hpChange?.type === "HP_CHANGE") {
			expect(hpChange.next - hpChange.prev).toBeCloseTo(2000, 0);
		}
	});
});

// ── CAST_SLOT (sends intents directly to opponent) ──────────────────

describe("CAST_SLOT", () => {
	test("emits CAST_START and CAST_END", () => {
		const { actor } = createPlayer("A");
		actor.start();
		const events = collectEvents(actor);

		// No opponent wired — HITs will fail sendTo silently
		actor.send({ type: "CAST_SLOT", slot: 1 });

		expect(events.some((e) => e.type === "CAST_START")).toBe(true);
		expect(events.some((e) => e.type === "CAST_END")).toBe(true);
	});

	test("sends HIT events to opponent via sendTo", () => {
		const clockA = new SimulationClock();
		const clockB = new SimulationClock();

		const caster = createActor(playerMachine, {
			input: {
				label: "A",
				initialState: makePlayerState(),
				formulas: { dr_constant: 1e6, sp_shield_ratio: 1.0 },
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
				initialState: makePlayerState({ sp: 0, shield: 0 }),
				formulas: { dr_constant: 1e6, sp_shield_ratio: 1.0 },
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

		// Wire opponent
		caster.getSnapshot().context.opponentRef = target;

		// Cast — HITs should flow directly to target
		caster.send({ type: "CAST_SLOT", slot: 1 });

		// Target should have received HIT events → HP changed
		const hpChanges = targetEvents.filter((e) => e.type === "HP_CHANGE");
		expect(hpChanges.length).toBeGreaterThan(0);

		// Target should also have received debuff (灵涸)
		const stateApply = targetEvents.filter((e) => e.type === "STATE_APPLY");
		expect(stateApply.length).toBeGreaterThan(0);
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
		if (hpChange?.type === "HP_CHANGE") {
			expect(hpChange.next).toBeCloseTo(0.9e8, 0);
		}
	});
});
