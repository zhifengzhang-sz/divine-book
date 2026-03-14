import { describe, expect, test } from "bun:test";
import { resolve, join } from "node:path";
import { createActor } from "xstate";
import { buildArenaDef, loadCombatConfig } from "./bridge";
import { arenaMachine, type ArenaDef } from "./actors/arena";

const ROOT = resolve(import.meta.dir, "../..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TraceEntry {
	actor: string;
	eventType: string;
	event: any;
}

function runSim(arenaDef: ArenaDef, trace = false) {
	const events: TraceEntry[] = [];
	const actorIdMap = new Map<string, string>();

	const arena = createActor(arenaMachine, {
		input: arenaDef,
		systemId: "arena",
		...(trace && {
			inspect: (evt: any) => {
				if (evt.type === "@xstate.actor") {
					const ref = evt.actorRef;
					if (ref) {
						const sid = ref._systemId ?? ref.systemId;
						if (sid) actorIdMap.set(ref.id, sid);
					}
				}
				if (evt.type === "@xstate.event") {
					const event = evt.event;
					if (!event || event.type === "xstate.init") return;
					const internalId = evt.actorRef?.id ?? "?";
					const actor = actorIdMap.get(internalId) ?? internalId;
					events.push({ actor, eventType: event.type, event });
				}
			},
		}),
	});

	arena.start();
	arena.send({ type: "START" });

	const snap = arena.getSnapshot();
	const eaRef = arena.system.get("entity-a");
	const ebRef = arena.system.get("entity-b");
	const eaCtx = eaRef?.getSnapshot()?.context as any;
	const ebCtx = ebRef?.getSnapshot()?.context as any;

	return { arena, snap, eaCtx, ebCtx, events };
}

function entityHP(ctx: any) {
	return { hp: ctx.hp, max_hp: ctx.max_hp, pct: ctx.hp / ctx.max_hp };
}

// ===========================================================================
// 1. Single-book trace: 千锋聚灵剑+吞海+通明 vs 甲元仙符+天倾灵枯+龙象护身
// ===========================================================================

describe("single-book trace (千锋聚灵剑 vs 甲元仙符)", () => {
	const configPath = join(ROOT, "config/trace-1v1.json");
	const config = loadCombatConfig(configPath);
	const arenaDef = buildArenaDef(config);

	// --- Bridge output verification ---

	test("entities have correct stats", () => {
		expect(arenaDef.entity_a.hp).toBe(1e8);
		expect(arenaDef.entity_a.atk).toBe(1000);
		expect(arenaDef.entity_a.def).toBe(9e5);
		expect(arenaDef.entity_b.hp).toBe(1e8);
		expect(arenaDef.entity_b.atk).toBe(1000);
		expect(arenaDef.sp_shield_ratio).toBe(0);
	});

	test("slot-a: 千锋聚灵剑 factors", () => {
		const s = arenaDef.slots_a[0];
		expect(s.hit_count).toBe(6);
		expect(s.base_factors.D_base).toBeCloseTo(3377.5, 0);
		expect(s.base_factors.D_ortho).toBeCloseTo(4.5, 0);
		expect(s.base_factors.sigma_R).toBeCloseTo(1.01, 2);
		expect(s.base_factors.D_res).toBeCloseTo(0.013, 3);
		// conditionals
		const esc = s.conditional_factors.find(cf => cf.condition === "per_hit_escalation");
		expect(esc).toBeDefined();
		expect(esc!.value).toBeCloseTo(0.425, 2);
		const lhp = s.conditional_factors.find(cf => cf.condition === "per_enemy_lost_hp");
		expect(lhp).toBeDefined();
		// state: healing reduction debuff
		const debuffs = s.states_to_create.filter(st => st.healing_modifier && st.healing_modifier > 0);
		expect(debuffs.length).toBeGreaterThanOrEqual(1);
	});

	test("slot-b: 甲元仙符 factors", () => {
		const s = arenaDef.slots_b[0];
		expect(s.hit_count).toBe(1);
		expect(s.base_factors.D_base).toBeCloseTo(21090, 0);
		expect(s.base_factors.H_A).toBeCloseTo(190, 0);
		// self_buff with atk_modifier (amplified by 龙象护身 ×4): 0.7 × 4 = 2.8
		const selfBuff = s.states_to_create.find(st => st.target === "self" && st.atk_modifier);
		expect(selfBuff).toBeDefined();
		expect(selfBuff!.atk_modifier).toBeCloseTo(2.8, 1);
	});

	// --- Simulation verification ---

	test("combat ends in timeout (no winner)", () => {
		const { snap, arena } = runSim(arenaDef);
		expect(snap.value).toBe("done");
		expect(snap.context.winner).toBeNull();
		arena.stop();
	});

	test("entity-b: 6 hits with escalating damage from entity-a", () => {
		const { ebCtx, arena } = runSim(arenaDef);
		const log = ebCtx.damage_log;

		expect(log).toHaveLength(6);
		for (const entry of log) {
			expect(entry.source).toBe("entity-a");
		}

		// Damage escalates per hit (per_hit_escalation)
		for (let i = 1; i < log.length; i++) {
			expect(log[i].damage).toBeGreaterThan(log[i - 1].damage);
		}

		// Hit 0: (D_base/100)×ATK×σR + (D_ortho/100)×maxHP
		const f = arenaDef.slots_a[0].base_factors;
		const expectedHit0 = (f.D_base / 100) * 1000 * f.sigma_R + (f.D_ortho / 100) * 1e8;
		expect(log[0].damage).toBeCloseTo(expectedHit0, 0);

		// DR bypass = D_res from slot factors
		const baseDR = 9e5 / (9e5 + 1e6);
		const effectiveDR = baseDR * (1 - f.D_res);
		for (const entry of log) {
			expect(entry.dr_applied).toBeCloseTo(effectiveDR, 3);
		}

		// Effective damage = raw × (1 - effectiveDR)
		const expectedEff0 = expectedHit0 * (1 - effectiveDR);
		expect(log[0].effective).toBeCloseTo(expectedEff0, 0);

		// Total damage should bring entity-b below 100%
		const totalEff = log.reduce((s: number, d: any) => s + d.effective, 0);
		expect(ebCtx.hp).toBeLessThan(1e8);
		expect(ebCtx.hp).toBeGreaterThan(0);

		arena.stop();
	});

	test("entity-a: 1 hit from opponent", () => {
		const { eaCtx, arena } = runSim(arenaDef);
		const log = eaCtx.damage_log;

		expect(log).toHaveLength(1);
		expect(log[0].source).toBe("entity-b");

		// Opponent hit: (21090/100) × 1000 = 210900
		expect(log[0].damage).toBeCloseTo(210900, 0);

		// No DR bypass on opponent's hit
		const baseDR = 9e5 / (9e5 + 1e6);
		expect(log[0].dr_applied).toBeCloseTo(baseDR, 3);

		// Effective = 210900 × (1 - baseDR)
		const expectedEff = 210900 * (1 - baseDR);
		expect(log[0].effective).toBeCloseTo(expectedEff, 0);

		arena.stop();
	});

	test("event trace: correct event counts", () => {
		const { events, arena } = runSim(arenaDef, true);

		const byType = (t: string) => events.filter(e => e.eventType === t);

		// START: 1
		expect(byType("START")).toHaveLength(1);

		// No ACTIVATE or SLOT_DONE (slot actors removed)
		expect(byType("ACTIVATE")).toHaveLength(0);
		expect(byType("SLOT_DONE")).toHaveLength(0);

		// HITs from entity-a (6 hits to entity-b)
		const hitsFromA = byType("HIT").filter(e => e.event.source === "entity-a");
		expect(hitsFromA).toHaveLength(6);
		// Verify hit indices 0-5
		for (let i = 0; i < 6; i++) {
			expect(hitsFromA[i].event.hit_index).toBe(i);
		}

		// HITs from entity-b (1 hit to entity-a)
		const hitsFromB = byType("HIT").filter(e => e.event.source === "entity-b");
		expect(hitsFromB).toHaveLength(1);
		expect(hitsFromB[0].event.hit_index).toBe(0);
		// Healing attached to the HIT event (H_A=190 → 1900)
		expect(hitsFromB[0].event.healing).toBeCloseTo(1900, 0);

		// HEAL: 1 (entity-b heals itself via H_A)
		const heals = byType("HEAL");
		expect(heals).toHaveLength(1);
		expect(heals[0].event.amount).toBeCloseTo(1900, 0);

		// STATE_APPLIED: 4 (1 debuff from slot-a + 3 states from slot-b)
		expect(byType("STATE_APPLIED")).toHaveLength(4);

		// TICK: 4 states ticked between rounds (dt=6)
		const ticks = byType("TICK");
		expect(ticks).toHaveLength(4);
		for (const t of ticks) {
			expect(t.event.dt).toBe(6);
		}

		arena.stop();
	});

	test("healing: 甲元仙符 H_A heals entity-b (simultaneous resolution)", () => {
		// With simultaneous resolution, both slots resolve against the same snapshot.
		// entity-b's healing happens in the applying phase.
		// The healing debuff from slot-a is also created in the applying phase.
		// Apply order: self_hits, damage HITs, HEALs, then states.
		// So healing happens BEFORE the debuff is applied → full healing of 1900.
		const { ebCtx, arena } = runSim(arenaDef);
		const totalDmg = ebCtx.damage_log.reduce((s: number, d: any) => s + d.effective, 0);

		// HP = 1e8 - totalDmg + 1900
		expect(ebCtx.hp).toBeCloseTo(1e8 - totalDmg + 1900, 0);

		arena.stop();
	});
});

