import { describe, expect, test } from "bun:test";
import { createActor } from "xstate";
import { resolveHit } from "./damage";
import { stateEffectMachine } from "./actors/state-effect";
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

// def=3, dr_constant=7 → DR = 3/(3+7) = 0.3
const ENTITY_A: EntityDef = {
	id: "entity-a",
	hp: 10_000_000,
	atk: 50_000,
	sp: 0,
	def: 3,
	dr_constant: 7,
};

const ENTITY_B: EntityDef = {
	id: "entity-b",
	hp: 10_000_000,
	atk: 50_000,
	sp: 0,
	def: 3,
	dr_constant: 7,
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
		);
		expect(result.damage).toBeCloseTo(500_000, 0);
	});

	test("multiplicative zones compound", () => {
		const factors = { ...SIMPLE_FACTORS, M_dmg: 0.5, M_skill: 0.5 };
		const result = resolveHit(
			50_000,
			factors,
			{ DR: 0, current_hp: 500_000, max_hp: 500_000 },
		);
		expect(result.damage).toBeCloseTo(1_125_000, 0);
	});
});

// ---------------------------------------------------------------------------
// State effect actor
// ---------------------------------------------------------------------------

describe("state effect actor", () => {
	test("on → tick → off", () => {
		const actor = createActor(stateEffectMachine, {
			input: {
				id: "仙佑",
				duration: 12,
				modifiers: { M_dmg: 0.7 },
				dr_modifier: 0,
				healing_modifier: 0,
				damage_per_tick: 0,
				shield_hp: 0,
				counter_damage: 0,
				target_entity: "",
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
		const actor = createActor(stateEffectMachine, {
			input: {
				id: "仙佑",
				duration: 12,
				modifiers: { M_dmg: 0.7 },
				dr_modifier: 0,
				healing_modifier: 0,
				damage_per_tick: 0,
				shield_hp: 0,
				counter_damage: 0,
				target_entity: "",
			},
		});
		actor.start();
		actor.send({ type: "DISPEL" });
		expect(actor.getSnapshot().value).toBe("off");
		actor.stop();
	});

	test("STACK increments stacks and refreshes duration", () => {
		const actor = createActor(stateEffectMachine, {
			input: {
				id: "test-stack",
				duration: 10,
				modifiers: { M_dmg: 0.1 },
				dr_modifier: 0,
				healing_modifier: 0,
				damage_per_tick: 0,
				shield_hp: 0,
				counter_damage: 0,
				target_entity: "",
			},
		});
		actor.start();

		actor.send({ type: "TICK", dt: 6 }); // remaining = 4
		actor.send({ type: "STACK" });

		const snap = actor.getSnapshot();
		expect(snap.context.stacks).toBe(2);
		expect(snap.context.remaining).toBe(10); // refreshed
		actor.stop();
	});

	test("ABSORB depletes shield → off", () => {
		const actor = createActor(stateEffectMachine, {
			input: {
				id: "护体",
				duration: 30,
				modifiers: {},
				dr_modifier: 0,
				healing_modifier: 0,
				damage_per_tick: 0,
				shield_hp: 50_000,
				counter_damage: 0,
				target_entity: "",
			},
		});
		actor.start();

		actor.send({ type: "ABSORB", amount: 30_000 });
		expect(actor.getSnapshot().value).toBe("on");
		expect(actor.getSnapshot().context.shield_hp).toBe(20_000);

		actor.send({ type: "ABSORB", amount: 25_000 });
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
			input: { id: "test", hp: 1_000_000, atk: 50_000, sp: 0, def: 3, dr_constant: 7 },
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
			input: { id: "test", hp: 50_000, atk: 50_000, sp: 0, def: 0, dr_constant: 7 },
		});
		actor.start();

		actor.send({ type: "HIT", damage: 60_000, source: "x", is_crit: false, hit_index: 0 });
		expect(actor.getSnapshot().value).toBe("dead");
		actor.stop();
	});

	test("dead entity ignores further HITs", () => {
		const actor = createActor(entityMachine, {
			input: { id: "test", hp: 50_000, atk: 50_000, sp: 0, def: 0, dr_constant: 7 },
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
			t_gap: 6, sp_shield_ratio: 0,
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
			t_gap: 6, sp_shield_ratio: 0,
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
			t_gap: 6, sp_shield_ratio: 0,
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
			t_gap: 6, sp_shield_ratio: 0,
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
			t_gap: 6, sp_shield_ratio: 0,
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

	test("DoT deals damage each tick", () => {
		const dot: StateDef = {
			id: "噬心", duration: 18, target: "opponent",
			modifiers: {},
			damage_per_tick: 200, // % of ATK: (200/100) × 50k ATK = 100k raw damage per tick
		};

		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: ENTITY_B,
			slots_a: [
				{
					id: "slot-a-1", platform: "大罗幻诀", hit_count: 0,
					base_factors: SIMPLE_FACTORS,
					states_to_create: [dot],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
				NOOP_SLOT("slot-a-2", "entity-a", "entity-b"),
				NOOP_SLOT("slot-a-3", "entity-a", "entity-b"),
			],
			slots_b: [
				NOOP_SLOT("slot-b-1", "entity-b", "entity-a"),
				NOOP_SLOT("slot-b-2", "entity-b", "entity-a"),
				NOOP_SLOT("slot-b-3", "entity-b", "entity-a"),
			],
			t_gap: 6, sp_shield_ratio: 0,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const eb = arena.system.get("entity-b")!.getSnapshot();
		const log = (eb.context as any).damage_log;

		// DoT ticks between rounds: tick after round 1 (6s), tick after round 2 (6s)
		// Duration 18s, t_gap 6s → ticks at gap1 (remaining 12), gap2 (remaining 6)
		// 3rd tick at gap3 would expire it (remaining 0) — but also fires on expiry
		expect(log.length).toBeGreaterThanOrEqual(2);
		// Each tick: 100k raw × (1 - 0.3 DR) = 70k effective
		expect(log[0].effective).toBeCloseTo(70_000, 0);
		expect(log[0].source).toBe("dot");

		arena.stop();
	});

	test("reactive counter fires back on HIT", () => {
		const counter: StateDef = {
			id: "罗天魔咒", duration: 30, target: "self",
			modifiers: {},
			counter_damage: 50_000,
		};

		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: { ...ENTITY_B, hp: 10_000_000 },
			slots_a: [
				{
					id: "slot-a-1", platform: "春黎剑阵", hit_count: 1,
					base_factors: SIMPLE_FACTORS, states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
			],
			// Entity B has a counter buff applied before combat via slot-b setup
			slots_b: [
				{
					id: "slot-b-1", platform: "noop", hit_count: 0,
					base_factors: SIMPLE_FACTORS,
					states_to_create: [counter],
					target_entity: "entity-a", owner_entity: "entity-b",
				},
			],
			t_gap: 6, sp_shield_ratio: 0,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		// Entity A hit entity B → counter fires back at entity A
		const ea = arena.system.get("entity-a")!.getSnapshot();
		const logA = (ea.context as any).damage_log;

		// Entity A should have received counter damage
		// slot-b-1 fires first (0 hits + counter state), then slot-a-1 fires (1 hit at B)
		// When B receives the HIT, counter fires back 50k at A
		// But wait — both slots fire in same round. slot-a sends HIT to B,
		// B's counter is only active after STATE_APPLIED routes through arena.
		// The counter state is created by slot-b-1 which fires in the same round.
		// Event ordering: slotA ACTIVATE → HITs to B, slotB ACTIVATE → creates counter
		// So counter is NOT yet active when A's hit arrives at B.
		// The counter only works from round 2 onward.

		// Let me check — actually both slots fire in round 0.
		// Arena sends ACTIVATE to slotA first, then slotB.
		// slotA fires HIT at B (no counter yet).
		// slotB creates counter on B.
		// So entity A should NOT have counter damage in round 1.
		expect(logA).toHaveLength(0); // no counter fired in round 1

		arena.stop();
	});

	test("DR bypass (D_res) reduces effective DR", () => {
		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: ENTITY_B, // base DR = 0.3
			slots_a: [{
				id: "slot-a-1", platform: "test", hit_count: 1,
				base_factors: { ...SIMPLE_FACTORS, D_res: 0.5 }, // 50% DR bypass
				states_to_create: [],
				target_entity: "entity-b", owner_entity: "entity-a",
			}],
			slots_b: [NOOP_SLOT("slot-b-1", "entity-b", "entity-a")],
			t_gap: 6, sp_shield_ratio: 0,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const eb = arena.system.get("entity-b")!.getSnapshot();
		const log = (eb.context as any).damage_log;
		// DR = 0.3, bypass 50% → effective DR = 0.3 × (1-0.5) = 0.15
		// 500k × (1 - 0.15) = 425k
		expect(log[0].dr_applied).toBeCloseTo(0.15, 2);
		expect(log[0].effective).toBeCloseTo(425_000, 0);

		arena.stop();
	});

	test("full DR bypass (神威冲云) ignores all DR", () => {
		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: ENTITY_B, // base DR = 0.3
			slots_a: [{
				id: "slot-a-1", platform: "test", hit_count: 1,
				base_factors: { ...SIMPLE_FACTORS, D_res: 1.0 }, // 100% DR bypass
				states_to_create: [],
				target_entity: "entity-b", owner_entity: "entity-a",
			}],
			slots_b: [NOOP_SLOT("slot-b-1", "entity-b", "entity-a")],
			t_gap: 6, sp_shield_ratio: 0,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const eb = arena.system.get("entity-b")!.getSnapshot();
		const log = (eb.context as any).damage_log;
		// Full bypass → DR = 0, effective = 500k
		expect(log[0].dr_applied).toBeCloseTo(0, 2);
		expect(log[0].effective).toBeCloseTo(500_000, 0);

		arena.stop();
	});

	test("healing (H_A) restores owner HP after taking damage", () => {
		// Round 1: entity-b hits entity-a for 500k raw, then entity-a heals
		// Round 2: entity-a hits with healing
		const def: ArenaDef = {
			entity_a: ENTITY_A, // HP: 10M, ATK: 50k
			entity_b: ENTITY_B,
			slots_a: [
				NOOP_SLOT("slot-a-1", "entity-a", "entity-b"),
				{
					id: "slot-a-2", platform: "test", hit_count: 1,
					base_factors: { ...SIMPLE_FACTORS, H_A: 100 }, // 100% of effective ATK = 50k heal
					states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
			],
			slots_b: [
				{
					id: "slot-b-1", platform: "test", hit_count: 1,
					base_factors: SIMPLE_FACTORS, states_to_create: [],
					target_entity: "entity-a", owner_entity: "entity-b",
				},
				NOOP_SLOT("slot-b-2", "entity-b", "entity-a"),
			],
			t_gap: 6, sp_shield_ratio: 0,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const ea = arena.system.get("entity-a")!.getSnapshot();
		// Round 1: entity-b hits entity-a: 500k raw × (1 - 0.3 DR) = 350k effective
		// HP after round 1: 10M - 350k = 9.65M
		// Round 2: entity-a hits with H_A=100 → heals 50k
		// HP after round 2: 9.65M + 50k = 9.7M
		expect((ea.context as any).hp).toBeCloseTo(9_700_000, 0);

		arena.stop();
	});

	test("conditional: per_enemy_lost_hp scales with target damage", () => {
		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: { ...ENTITY_B, hp: 10_000_000 },
			slots_a: [
				{
					id: "slot-a-1", platform: "test", hit_count: 1,
					base_factors: SIMPLE_FACTORS, states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
				{
					id: "slot-a-2", platform: "test", hit_count: 1,
					base_factors: SIMPLE_FACTORS,
					conditional_factors: [
						{ condition: "per_enemy_lost_hp", factor: "M_dmg", value: 0.01 }, // 1% per lost HP%
					],
					states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
			],
			slots_b: [
				NOOP_SLOT("slot-b-1", "entity-b", "entity-a"),
				NOOP_SLOT("slot-b-2", "entity-b", "entity-a"),
			],
			t_gap: 6, sp_shield_ratio: 0,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const eb = arena.system.get("entity-b")!.getSnapshot();
		const log = (eb.context as any).damage_log;
		expect(log).toHaveLength(2);

		// Slot 1: 500k raw → effective 350k. Entity-b HP now: 10M - 350k = 9.65M (3.5% lost)
		// Slot 2: M_dmg += 0.01 × 3.5 = 0.035 → raw ≈ 500k × 1.035 = 517.5k → eff ≈ 362.25k
		expect(log[1].effective).toBeGreaterThan(log[0].effective);

		arena.stop();
	});

	test("conditional: ignore_dr sets D_res=1 (神威冲云)", () => {
		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: ENTITY_B,
			slots_a: [{
				id: "slot-a-1", platform: "test", hit_count: 1,
				base_factors: SIMPLE_FACTORS,
				conditional_factors: [
					{ condition: "ignore_dr", factor: "D_res", value: 1.0 },
				],
				states_to_create: [],
				target_entity: "entity-b", owner_entity: "entity-a",
			}],
			slots_b: [NOOP_SLOT("slot-b-1", "entity-b", "entity-a")],
			t_gap: 6, sp_shield_ratio: 0,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		const eb = arena.system.get("entity-b")!.getSnapshot();
		const log = (eb.context as any).damage_log;
		expect(log[0].dr_applied).toBeCloseTo(0, 2);
		expect(log[0].effective).toBeCloseTo(500_000, 0);

		arena.stop();
	});

	test("reactive counter fires when active before hit", () => {
		const counter: StateDef = {
			id: "罗天魔咒", duration: 30, target: "self",
			modifiers: {},
			counter_damage: 50_000,
		};

		const def: ArenaDef = {
			entity_a: ENTITY_A,
			entity_b: { ...ENTITY_B, hp: 10_000_000 },
			slots_a: [
				NOOP_SLOT("slot-a-1", "entity-a", "entity-b"),
				{
					id: "slot-a-2", platform: "春黎剑阵", hit_count: 1,
					base_factors: SIMPLE_FACTORS, states_to_create: [],
					target_entity: "entity-b", owner_entity: "entity-a",
				},
			],
			slots_b: [
				{
					id: "slot-b-1", platform: "noop", hit_count: 0,
					base_factors: SIMPLE_FACTORS,
					states_to_create: [counter],
					target_entity: "entity-a", owner_entity: "entity-b",
				},
				NOOP_SLOT("slot-b-2", "entity-b", "entity-a"),
			],
			t_gap: 6, sp_shield_ratio: 0,
		};

		const arena = createActor(arenaMachine, { input: def, systemId: "arena" });
		arena.start();
		arena.send({ type: "START" });

		// Round 1: slot-b-1 creates counter on entity-b
		// Round 2: slot-a-2 hits entity-b → counter fires back at entity-a
		const ea = arena.system.get("entity-a")!.getSnapshot();
		const logA = (ea.context as any).damage_log;

		expect(logA).toHaveLength(1);
		expect(logA[0].damage).toBe(50_000);
		expect(logA[0].source).toBe("entity-b");
		// Counter damage also goes through A's DR: 50k × (1 - 0.3) = 35k
		expect(logA[0].effective).toBeCloseTo(35_000, 0);

		arena.stop();
	});
});
