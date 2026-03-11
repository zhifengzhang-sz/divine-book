import { describe, expect, test } from "bun:test";
import { createActor } from "xstate";
import { resolveHit } from "./damage";
import { buffMachine } from "./actors/buff";
import { entityMachine } from "./actors/entity";
import { arenaMachine, type ArenaDef } from "./actors/arena";
import type { FactorVector, SlotDef, EntityDef, StateDef } from "./types";
import { ZERO_FACTORS } from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SIMPLE_FACTORS: FactorVector = {
	...ZERO_FACTORS,
	D_base: 1000, // 10× atk for easy math
};

const ENTITY_A: EntityDef = {
	id: "entity-a",
	hp: 10_000_000,
	atk: 50_000,
	dr: 0.3,
	crit_rate: 0,
	crit_damage: 0,
};

const ENTITY_B: EntityDef = {
	id: "entity-b",
	hp: 10_000_000,
	atk: 50_000,
	dr: 0.3,
	crit_rate: 0,
	crit_damage: 0,
};

/** Slot that does nothing (0 hits, no states) */
const NOOP_SLOT = (id: string, owner: string, target: string): SlotDef => ({
	id,
	platform: "noop",
	hit_count: 0,
	base_factors: SIMPLE_FACTORS,
	states_to_create: [],
	target_entity: target,
	owner_entity: owner,
});

// ---------------------------------------------------------------------------
// Pure damage
// ---------------------------------------------------------------------------

describe("resolveHit (pure)", () => {
	test("basic hit — raw damage, no DR", () => {
		const result = resolveHit(
			50_000,
			SIMPLE_FACTORS,
			{ DR: 0, current_hp: 500_000, max_hp: 500_000 },
			0,
		);
		expect(result.damage).toBeCloseTo(500_000, 0);
	});

	test("multiplicative zones compound", () => {
		const factors = { ...SIMPLE_FACTORS, M_dmg: 0.5, M_skill: 0.5 };
		const result = resolveHit(
			50_000,
			factors,
			{ DR: 0, current_hp: 500_000, max_hp: 500_000 },
			0,
		);
		expect(result.damage).toBeCloseTo(1_125_000, 0);
	});
});

// ---------------------------------------------------------------------------
// Buff actor
// ---------------------------------------------------------------------------

describe("buff actor", () => {
	test("on → tick → off", () => {
		const actor = createActor(buffMachine, {
			input: {
				id: "仙佑",
				duration: 12,
				target: "self",
				modifiers: { M_dmg: 0.7 },
				dr_modifier: 0,
				healing_modifier: 0,
			},
		});
		actor.start();
		expect(actor.getSnapshot().value).toBe("on");

		actor.send({ type: "TICK", dt: 6 });
		expect(actor.getSnapshot().value).toBe("on");

		actor.send({ type: "TICK", dt: 6 });
		expect(actor.getSnapshot().value).toBe("off");
		actor.stop();
	});

	test("dispel → off immediately", () => {
		const actor = createActor(buffMachine, {
			input: {
				id: "仙佑",
				duration: 12,
				target: "self",
				modifiers: { M_dmg: 0.7 },
				dr_modifier: 0,
				healing_modifier: 0,
			},
		});
		actor.start();
		actor.send({ type: "DISPEL" });
		expect(actor.getSnapshot().value).toBe("off");
		actor.stop();
	});
});

// ---------------------------------------------------------------------------
// Entity actor
// ---------------------------------------------------------------------------

describe("entity actor", () => {
	test("receives HIT, applies base DR", () => {
		const actor = createActor(entityMachine, {
			input: { id: "test", hp: 1_000_000, atk: 50_000, dr: 0.3, crit_rate: 0, crit_damage: 0 },
		});
		actor.start();

		actor.send({ type: "HIT", damage: 100_000, source: "x", is_crit: false, hit_index: 0 });

		const snap = actor.getSnapshot();
		// effective = 100_000 × (1 - 0.3) = 70_000
		expect(snap.context.hp).toBeCloseTo(930_000, 0);
		expect(snap.value).toBe("alive");
		actor.stop();
	});

	test("dies when HP reaches 0", () => {
		const actor = createActor(entityMachine, {
			input: { id: "test", hp: 50_000, atk: 50_000, dr: 0, crit_rate: 0, crit_damage: 0 },
		});
		actor.start();

		actor.send({ type: "HIT", damage: 60_000, source: "x", is_crit: false, hit_index: 0 });
		expect(actor.getSnapshot().value).toBe("dead");
		actor.stop();
	});

	test("dead entity ignores further HITs", () => {
		const actor = createActor(entityMachine, {
			input: { id: "test", hp: 50_000, atk: 50_000, dr: 0, crit_rate: 0, crit_damage: 0 },
		});
		actor.start();

		actor.send({ type: "HIT", damage: 60_000, source: "x", is_crit: false, hit_index: 0 });
		actor.send({ type: "HIT", damage: 60_000, source: "x", is_crit: false, hit_index: 1 });

		expect(actor.getSnapshot().context.damage_log).toHaveLength(1);
		actor.stop();
	});
});

// ---------------------------------------------------------------------------
// Arena — full integration
// ---------------------------------------------------------------------------

describe("arena", () => {
	test("single round: both sides fire", () => {
		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: ENTITY_B,
			slots_a: [{
				id: "slot-a-1", platform: "春黎剑阵", hit_count: 3,
				base_factors: SIMPLE_FACTORS, states_to_create: [],
				target_entity: "entity-b", owner_entity: "entity-a",
			}],
			slots_b: [{
				id: "slot-b-1", platform: "甲元仙符", hit_count: 1,
				base_factors: SIMPLE_FACTORS, states_to_create: [],
				target_entity: "entity-a", owner_entity: "entity-b",
			}],
			t_gap: 6,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		// Entity B: 3 hits × 500k raw × 0.7 DR = 1_050_000
		const eb = arena.system.get("entity-b")!.getSnapshot();
		expect((eb.context as any).hp).toBeCloseTo(10_000_000 - 1_050_000, 0);

		// Entity A: 1 hit × 500k raw × 0.7 DR = 350_000
		const ea = arena.system.get("entity-a")!.getSnapshot();
		expect((ea.context as any).hp).toBeCloseTo(10_000_000 - 350_000, 0);

		expect(arena.getSnapshot().value).toBe("done");
		arena.stop();
	});

	test("buff from slot 1 amplifies slot 2 (self buff)", () => {
		const buff: StateDef = {
			id: "仙佑", duration: 12, target: "self",
			modifiers: { M_dmg: 0.7 },
		};

		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: ENTITY_B,
			slots_a: [
				{
					id: "slot-a-1", platform: "甲元仙符", hit_count: 1,
					base_factors: SIMPLE_FACTORS,
					states_to_create: [buff],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
				{
					id: "slot-a-2", platform: "春黎剑阵", hit_count: 1,
					base_factors: SIMPLE_FACTORS, states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
			],
			slots_b: [
				NOOP_SLOT("slot-b-1", "entity-b", "entity-a"),
				NOOP_SLOT("slot-b-2", "entity-b", "entity-a"),
			],
			t_gap: 6,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const eb = arena.system.get("entity-b")!.getSnapshot();
		const log = (eb.context as any).damage_log;

		expect(log).toHaveLength(2);
		// Slot 1: no buff yet → raw 500k, effective 350k
		expect(log[0].effective).toBeCloseTo(350_000, 0);
		// Slot 2: buff active (+0.7 M_dmg) → raw 850k, effective 595k
		expect(log[1].effective).toBeCloseTo(595_000, 0);
		expect(log[1].effective / log[0].effective).toBeCloseTo(1.7, 1);

		arena.stop();
	});

	test("debuff on opponent reduces their DR", () => {
		// 命損: -100% DR on opponent (dr_modifier = -1.0)
		const debuff: StateDef = {
			id: "命損", duration: 12, target: "opponent",
			modifiers: {}, dr_modifier: -1.0,
		};

		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: ENTITY_B,  // base DR = 0.3
			slots_a: [
				{
					id: "slot-a-1", platform: "大罗幻诀", hit_count: 1,
					base_factors: SIMPLE_FACTORS,
					states_to_create: [debuff],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
				{
					id: "slot-a-2", platform: "春黎剑阵", hit_count: 1,
					base_factors: SIMPLE_FACTORS, states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
			],
			slots_b: [
				NOOP_SLOT("slot-b-1", "entity-b", "entity-a"),
				NOOP_SLOT("slot-b-2", "entity-b", "entity-a"),
			],
			t_gap: 6,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const eb = arena.system.get("entity-b")!.getSnapshot();
		const log = (eb.context as any).damage_log;

		expect(log).toHaveLength(2);
		// Slot 1: debuff not yet applied when HIT lands → DR = 0.3
		expect(log[0].dr_applied).toBeCloseTo(0.3, 2);
		expect(log[0].effective).toBeCloseTo(350_000, 0);
		// Slot 2: debuff active → DR = max(0, 0.3 - 1.0) = 0
		expect(log[1].dr_applied).toBeCloseTo(0, 2);
		expect(log[1].effective).toBeCloseTo(500_000, 0);

		arena.stop();
	});

	test("expired debuff stops affecting DR", () => {
		// Debuff lasts 1 gap (12s covers gap 1, expires during gap 2)
		const debuff: StateDef = {
			id: "命損", duration: 12, target: "opponent",
			modifiers: {}, dr_modifier: -1.0,
		};

		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: ENTITY_B,
			slots_a: [
				{
					id: "slot-a-1", platform: "大罗幻诀", hit_count: 1,
					base_factors: SIMPLE_FACTORS,
					states_to_create: [debuff],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
				{
					id: "slot-a-2", platform: "春黎剑阵", hit_count: 1,
					base_factors: SIMPLE_FACTORS, states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
				{
					id: "slot-a-3", platform: "春黎剑阵", hit_count: 1,
					base_factors: SIMPLE_FACTORS, states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
			],
			slots_b: [
				NOOP_SLOT("slot-b-1", "entity-b", "entity-a"),
				NOOP_SLOT("slot-b-2", "entity-b", "entity-a"),
				NOOP_SLOT("slot-b-3", "entity-b", "entity-a"),
			],
			t_gap: 6,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const eb = arena.system.get("entity-b")!.getSnapshot();
		const log = (eb.context as any).damage_log;

		expect(log).toHaveLength(3);
		// Slot 1: DR = 0.3 (debuff not yet active)
		expect(log[0].dr_applied).toBeCloseTo(0.3, 2);
		// Slot 2: DR = 0 (debuff active, 6s duration, gap was 6s → just at boundary)
		expect(log[1].dr_applied).toBeCloseTo(0, 2);
		// Slot 3: DR = 0.3 (debuff expired after second tick)
		expect(log[2].dr_applied).toBeCloseTo(0.3, 2);

		arena.stop();
	});

	test("entity death stops combat", () => {
		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: { ...ENTITY_B, hp: 100_000 },
			slots_a: [{
				id: "slot-a-1", platform: "春黎剑阵", hit_count: 10,
				base_factors: { ...ZERO_FACTORS, D_base: 10000 },
				states_to_create: [],
				target_entity: "entity-b", owner_entity: "entity-a",
			}],
			slots_b: [NOOP_SLOT("slot-b-1", "entity-b", "entity-a")],
			t_gap: 6,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		// Entity-b died → removed from system
		expect(arena.system.get("entity-b")).toBeUndefined();
		expect(arena.getSnapshot().context.winner).toBe("entity-a");
		expect(arena.getSnapshot().value).toBe("done");

		arena.stop();
	});
});
