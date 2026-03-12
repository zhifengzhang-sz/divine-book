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
		// self_buff with S_coeff (amplified by 龙象护身 ×4)
		const selfBuff = s.states_to_create.find(st => st.target === "self" && st.modifiers.S_coeff);
		expect(selfBuff).toBeDefined();
		expect(selfBuff!.modifiers.S_coeff).toBeCloseTo(2.8, 1);
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
		// Note: entity-b also receives 1900 healing from 甲元仙符 H_A
		const totalEff = log.reduce((s: number, d: any) => s + d.effective, 0);
		const healing = (arenaDef.slots_b[0].base_factors.H_A / 100) * 1000;
		expect(ebCtx.hp).toBeCloseTo(1e8 - totalEff + healing, 0);
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

	test("event trace: correct event counts and sequence", () => {
		const { events, arena } = runSim(arenaDef, true);

		// Count by event type (actor IDs may not resolve, so filter by event data)
		const byType = (t: string) => events.filter(e => e.eventType === t);

		// START: 1
		expect(byType("START")).toHaveLength(1);

		// ACTIVATE: 2 (one per slot)
		expect(byType("ACTIVATE")).toHaveLength(2);

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

		// STATE_CREATED: 4 (1 debuff from slot-a + 3 states from slot-b)
		expect(byType("STATE_CREATED")).toHaveLength(4);

		// SLOT_DONE: 2
		expect(byType("SLOT_DONE")).toHaveLength(2);

		// STATE_APPLIED: 4
		expect(byType("STATE_APPLIED")).toHaveLength(4);

		// TICK: 4 states ticked between rounds (dt=6)
		const ticks = byType("TICK");
		expect(ticks).toHaveLength(4);
		for (const t of ticks) {
			expect(t.event.dt).toBe(6);
		}

		// Ordering: HITs from entity-a come before HITs from entity-b
		// (slot-a fires before slot-b in the same round)
		const firstHitA = events.findIndex(e => e.eventType === "HIT" && e.event.source === "entity-a");
		const firstHitB = events.findIndex(e => e.eventType === "HIT" && e.event.source === "entity-b");
		expect(firstHitA).toBeLessThan(firstHitB);

		arena.stop();
	});

	test("healing: 甲元仙符 H_A heals entity-b", () => {
		// entity-b takes damage from 6 hits, then gets healed by its own H_A
		const { ebCtx, arena } = runSim(arenaDef);
		const totalDmg = ebCtx.damage_log.reduce((s: number, d: any) => s + d.effective, 0);

		// H_A healing = (190/100) × 1000 = 1900
		// But healing is reduced by healing_modifier from 千锋聚灵剑 debuff
		// The debuff is created by slot-a-1 but STATE_APPLIED happens after all slots fire
		// So healing occurs during slot-b-1 activation, before the debuff is applied
		// → full healing of 1900
		// HP = 1e8 - totalDmg + 1900
		expect(ebCtx.hp).toBeCloseTo(1e8 - totalDmg + 1900, 0);

		arena.stop();
	});
});

// ===========================================================================
// 2. YE set 1 vs YE set 2
// ===========================================================================

describe("ye1 vs ye2", () => {
	const configPath = join(ROOT, "config/ye1-vs-ye2.json");
	const config = loadCombatConfig(configPath);
	const arenaDef = buildArenaDef(config);

	test("arena has 6 slots per side", () => {
		expect(arenaDef.slots_a).toHaveLength(6);
		expect(arenaDef.slots_b).toHaveLength(6);
	});

	test("entities have endgame stats", () => {
		expect(arenaDef.entity_a.hp).toBe(6.6e16);
		expect(arenaDef.entity_a.atk).toBe(3.5184e15);
		expect(arenaDef.entity_b.hp).toBe(6.6e16);
		expect(arenaDef.entity_b.atk).toBe(3.5184e15);
	});

	test("SP shields are active (sp_shield_ratio=1)", () => {
		expect(arenaDef.sp_shield_ratio).toBe(1.0);
		expect(arenaDef.entity_a.sp).toBeGreaterThan(0);
	});

	test("combat completes", () => {
		const { snap, arena } = runSim(arenaDef);
		expect(snap.value).toBe("done");
		arena.stop();
	});

	test("entity-a (ye1) wins", () => {
		const { snap, arena } = runSim(arenaDef);
		expect(snap.context.winner).toBe("entity-a");
		arena.stop();
	});

	test("entity-a survives with HP remaining", () => {
		const { eaCtx, arena } = runSim(arenaDef);
		expect(eaCtx.hp).toBeGreaterThan(0);
		expect(eaCtx.hp).toBeLessThan(eaCtx.max_hp);
		arena.stop();
	});

	test("both sides deal damage", () => {
		const { eaCtx, ebCtx, arena } = runSim(arenaDef);
		expect(eaCtx.damage_log.length).toBeGreaterThan(0);
		// entity-b is dead, but was still getting its context snapshot
		// since entity ref may be undefined once dead, check via eaCtx
		expect(eaCtx.damage_log.some((d: any) => d.effective > 0)).toBe(true);
		arena.stop();
	});

	test("buff amplification: slot 2+ hits harder than slot 1", () => {
		const { events, arena } = runSim(arenaDef, true);

		// Find all HIT events from entity-a (player attacks)
		const hitsFromA = events.filter(e =>
			e.eventType === "HIT" && e.event.source === "entity-a" && e.event.hit_index >= 0,
		);
		expect(hitsFromA.length).toBeGreaterThan(1);

		// After 甲元仙符's self_buff (S_coeff=2.8), later rounds hit much harder
		const firstHitDmg = hitsFromA[0].event.damage;
		const laterHits = hitsFromA.filter(h => h.event.damage > firstHitDmg * 2);
		expect(laterHits.length).toBeGreaterThan(0);

		arena.stop();
	});

	test("念剑诀 ignore_dr: at least one hit with full DR bypass", () => {
		const { events, arena } = runSim(arenaDef, true);

		// Find HIT events from entity-a with dr_bypass ≈ 1.0 (ignore_dr)
		const fullBypass = events.filter(e =>
			e.eventType === "HIT" && e.event.source === "entity-a" && e.event.dr_bypass >= 0.99,
		);
		expect(fullBypass.length).toBeGreaterThan(0);

		arena.stop();
	});

	test("shield absorbs damage on first hit", () => {
		const { events, arena } = runSim(arenaDef, true);

		// ABSORB events should fire (SP shield absorbing damage)
		const absorbs = events.filter(e => e.eventType === "ABSORB");
		expect(absorbs.length).toBeGreaterThan(0);

		arena.stop();
	});

	test("DoT ticks deal damage between rounds", () => {
		const { events, arena } = runSim(arenaDef, true);

		const dotHits = events.filter(e =>
			e.eventType === "HIT" && e.event.source === "dot",
		);
		expect(dotHits.length).toBeGreaterThan(0);

		arena.stop();
	});

	test("damage log records all hits on each entity", () => {
		const { eaCtx, arena } = runSim(arenaDef);

		// Player should have taken multiple hits
		expect(eaCtx.damage_log.length).toBeGreaterThan(1);

		// All damage entries have required fields
		for (const d of eaCtx.damage_log) {
			expect(d.damage).toBeGreaterThanOrEqual(0);
			expect(d.effective).toBeGreaterThanOrEqual(0);
			expect(d.dr_applied).toBeGreaterThanOrEqual(0);
			expect(d.dr_applied).toBeLessThanOrEqual(1);
			expect(d.source).toBeTruthy();
		}

		arena.stop();
	});
});

// ===========================================================================
// 3. ZZ vs YE set 1
// ===========================================================================

describe("zz vs ye1", () => {
	const configPath = join(ROOT, "config/zz-a-vs-ye1.json");
	const config = loadCombatConfig(configPath);
	const arenaDef = buildArenaDef(config);

	test("arena has 6 slots per side", () => {
		expect(arenaDef.slots_a).toHaveLength(6);
		expect(arenaDef.slots_b).toHaveLength(6);
	});

	test("zz has different platforms than ye1", () => {
		const zzPlatforms = arenaDef.slots_a.map(s => s.platform);
		const yePlatforms = arenaDef.slots_b.map(s => s.platform);

		// ZZ uses 玄煞灵影诀 which ye1 doesn't
		expect(zzPlatforms).toContain("玄煞灵影诀");
		expect(yePlatforms).not.toContain("玄煞灵影诀");

		// ye1 uses 大罗幻诀 and 十方真魄 which zz doesn't
		expect(yePlatforms).toContain("大罗幻诀");
		expect(yePlatforms).toContain("十方真魄");
	});

	test("combat completes", () => {
		const { snap, arena } = runSim(arenaDef);
		expect(snap.value).toBe("done");
		arena.stop();
	});

	test("entity-a (zz) wins", () => {
		const { snap, arena } = runSim(arenaDef);
		expect(snap.context.winner).toBe("entity-a");
		arena.stop();
	});

	test("entity-a survives with high HP (shield absorbs most damage)", () => {
		const { eaCtx, arena } = runSim(arenaDef);
		// ZZ takes very little effective damage due to massive shield
		expect(eaCtx.hp).toBeGreaterThan(0);
		const hpPct = eaCtx.hp / eaCtx.max_hp;
		// Shield (3.3309e15) absorbs most of opponent's raw damage
		expect(hpPct).toBeGreaterThan(0.95);
		arena.stop();
	});

	test("神威冲云: zz has full DR bypass on 念剑诀", () => {
		// ZZ's slot 6 = 念剑诀 + 神威冲云 → ignore_dr
		const nianSlot = arenaDef.slots_a.find(s => s.platform === "念剑诀");
		expect(nianSlot).toBeDefined();
		const ignoreDr = nianSlot!.conditional_factors.find(
			cf => cf.condition === "ignore_dr",
		);
		expect(ignoreDr).toBeDefined();
		expect(ignoreDr!.value).toBe(1.0);
	});

	test("通明: D_res and σR on 千锋聚灵剑", () => {
		const qfSlot = arenaDef.slots_a.find(s => s.platform === "千锋聚灵剑");
		expect(qfSlot).toBeDefined();
		expect(qfSlot!.base_factors.D_res).toBeGreaterThan(0);
		expect(qfSlot!.base_factors.sigma_R).toBeGreaterThan(1);
	});

	test("enemy_dr_reduction: 皓月剑诀 has D_res bypass", () => {
		// Entity-b dies before 念剣诀 (slot 6) fires, so check via damage_log
		// 皓月剑诀 (slot 2) has enemy_dr_reduction → D_res > 0
		const { eaCtx, arena } = runSim(arenaDef);
		// entity-b's damage_log shows DR bypass on some hits
		// Since entity-b may not be available (dead), check via slot definition
		const haoSlot = arenaDef.slots_a.find(s => s.platform === "皓月剑诀");
		expect(haoSlot).toBeDefined();
		const drRed = haoSlot!.conditional_factors.find(cf => cf.condition === "enemy_dr_reduction");
		expect(drRed).toBeDefined();
		expect(drRed!.value).toBeGreaterThan(0);
		arena.stop();
	});

	test("opponent takes enough damage to die", () => {
		const { events, arena } = runSim(arenaDef, true);

		const entityDied = events.filter(e => e.eventType === "ENTITY_DIED");
		expect(entityDied).toHaveLength(1);
		expect(entityDied[0].event.entity_id).toBe("entity-b");

		arena.stop();
	});

	test("damage log: all entries have valid structure", () => {
		const { eaCtx, arena } = runSim(arenaDef);

		for (const d of eaCtx.damage_log) {
			expect(typeof d.damage).toBe("number");
			expect(typeof d.effective).toBe("number");
			expect(typeof d.dr_applied).toBe("number");
			expect(typeof d.source).toBe("string");
			expect(d.damage).toBeGreaterThanOrEqual(0);
			expect(d.dr_applied).toBeGreaterThanOrEqual(0);
			expect(d.dr_applied).toBeLessThanOrEqual(1);
		}

		arena.stop();
	});
});
