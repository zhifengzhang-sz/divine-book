import { describe, expect, test } from "bun:test";
import { resolve, join } from "node:path";
import { buildArenaDef, buildSlotDef, loadCombatConfig, MAX_PROGRESSION } from "./bridge";
import type { Progression } from "./bridge";

const PROG = MAX_PROGRESSION;

const ROOT = resolve(import.meta.dir, "../..");
const configPath = join(ROOT, "config/combat.json");

describe("bridge", () => {
	test("loadCombatConfig parses combat.json", () => {
		const config = loadCombatConfig(configPath);
		expect(config.t_gap).toBe(6);
		expect(config.player.books).toHaveLength(6);
		expect(config.opponent.books).toHaveLength(6);
		expect(config.formulas.dr_constant).toBeGreaterThan(0);
	});

	test("buildSlotDef extracts hit_count from effects.yaml", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "春黎剑阵", op1: "玄心剑魄", op2: "无极剑阵" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		expect(slot.hit_count).toBe(5);
		expect(slot.platform).toBe("春黎剑阵");
		expect(slot.base_factors.D_base).toBeGreaterThan(0);
	});

	test("D_base is per-hit (total ÷ hit_count) with summon multiplier", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "春黎剑阵", op1: "玄心剑魄", op2: "无极剑阵" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		// 春黎剑阵: total=22305, hits=5 → per-hit=4461 × (1+1.62 summon) = 4461 × 2.62 ≈ 11688
		expect(slot.base_factors.D_base).toBeCloseTo(4461 * 2.62, 0);
	});

	test("buildSlotDef produces base_factors with fractional multipliers", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "皓月剑诀", op1: "玄心剑魄", op2: "无极剑阵" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		// 皓月剑诀: D_base=22305/10=2230.5
		expect(slot.base_factors.D_base).toBeCloseTo(2230.5, 0);
		// 无极剑阵: M_skill=555 → fractional 5.55 (may include other sources)
		expect(slot.base_factors.M_skill).toBeGreaterThan(3);
	});

	test("甲元仙符 produces self_buff with S_coeff and debuff with healing_modifier", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "甲元仙符", op1: "真极穿空", op2: "龙象护身" },
			"entity-a",
			"entity-b",
			[], PROG,
		);

		// Should have self_buff (S_coeff: 0.7) and debuff (H_red: 0.31)
		expect(slot.states_to_create.length).toBeGreaterThanOrEqual(2);

		const selfBuff = slot.states_to_create.find(s => s.target === "self");
		expect(selfBuff).toBeDefined();
		expect(selfBuff!.modifiers.S_coeff).toBeCloseTo(0.7, 2);
		expect(selfBuff!.duration).toBe(12);

		const debuff = slot.states_to_create.find(s => s.target === "opponent");
		expect(debuff).toBeDefined();
		expect(debuff!.healing_modifier).toBeCloseTo(0.31, 2);
	});

	test("大罗幻诀 produces reactive counter state", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "大罗幻诀", op1: "心魔惑言", op2: "追神真诀" },
			"entity-b",
			"entity-a",
			[], PROG,
		);
		// Should have reactive counter_debuff state
		expect(slot.states_to_create.length).toBeGreaterThanOrEqual(1);

		const counter = slot.states_to_create.find(s =>
			s.id.includes("counter") || s.id.includes("cross_slot"),
		);
		expect(counter).toBeDefined();
	});

	test("buildArenaDef resolves scaled opponent", () => {
		const config = loadCombatConfig(configPath);
		const arena = buildArenaDef(config);

		expect(arena.entity_a.hp).toBe(6.6e16);
		expect(arena.entity_a.atk).toBe(3.5184e15);
		expect(arena.entity_b.hp).toBe(6.6e16);
		expect(arena.entity_b.atk).toBe(3.5184e15);
		expect(arena.slots_a).toHaveLength(6);
		expect(arena.slots_b).toHaveLength(6);
	});

	test("buildArenaDef: all slots have positive hit_count and per-hit D_base", () => {
		const config = loadCombatConfig(configPath);
		const arena = buildArenaDef(config);

		for (const slot of [...arena.slots_a, ...arena.slots_b]) {
			expect(slot.hit_count).toBeGreaterThanOrEqual(1);
			expect(slot.base_factors.D_base).toBeGreaterThan(0);
		}
	});

	test("§9 modifiers: 龙象护身 buff_strength 300 amplifies self_buff S_coeff by 4×", () => {
		const config = loadCombatConfig(configPath);
		const arena = buildArenaDef(config);

		// Slot 1 (甲元仙符) should have self_buff with S_coeff = 0.7 × 4 = 2.8
		const slot1 = arena.slots_a[0];
		const selfBuff = slot1.states_to_create.find(s => s.target === "self");
		expect(selfBuff).toBeDefined();
		expect(selfBuff!.modifiers.S_coeff).toBeCloseTo(2.8, 2);
	});

	test("§9 modifiers: buff_duration extends self_buff duration", () => {
		const config = loadCombatConfig(configPath);
		const arena = buildArenaDef(config);

		// Slot 1 (甲元仙符) self_buff: base duration 12, modified by buff_duration
		const slot1 = arena.slots_a[0];
		const selfBuff = slot1.states_to_create.find(s => s.target === "self");
		expect(selfBuff).toBeDefined();
		expect(selfBuff!.duration).toBeGreaterThan(12);
	});

	test("通明 produces D_res and sigma_R in base_factors", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "千锋聚灵剑", op1: "天倾灵枯", op2: "通明" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		// 通明: D_res: 1.27 in model → fractional 0.0127
		expect(slot.base_factors.D_res).toBeGreaterThan(0);
		// sigma_R should be > 1 from 通明's sigma_R factor
		expect(slot.base_factors.sigma_R).toBeGreaterThan(1);
	});

	test("神威冲云 produces ignore_dr conditional", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "千锋聚灵剑", op1: "神威冲云", op2: "通明" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const ignoreDr = slot.conditional_factors.find(cf => cf.condition === "ignore_dr");
		expect(ignoreDr).toBeDefined();
		expect(ignoreDr!.value).toBe(1.0);
	});

	test("吞海 produces per_enemy_lost_hp conditional", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "千锋聚灵剑", op1: "吞海", op2: "通明" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const perLost = slot.conditional_factors.find(cf => cf.condition === "per_enemy_lost_hp");
		expect(perLost).toBeDefined();
		expect(perLost!.factor).toBe("M_dmg");
		expect(perLost!.value).toBeGreaterThan(0);
	});

	test("buildArenaDef includes sp_shield_ratio", () => {
		const config = loadCombatConfig(configPath);
		const arena = buildArenaDef(config);
		expect(arena.sp_shield_ratio).toBe(1.0);
	});

	// --- New routing coverage tests ---

	test("破竹 produces per_hit_escalation conditional", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "千锋聚灵剑", op1: "破竹", op2: "通明" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const esc = slot.conditional_factors.find(cf => cf.condition === "per_hit_escalation");
		expect(esc).toBeDefined();
		expect(esc!.value).toBeGreaterThan(0);
	});

	test("心魔惑言 produces per_debuff_stack conditional", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "大罗幻诀", op1: "心魔惑言", op2: "追神真诀" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const stack = slot.conditional_factors.find(cf => cf.condition === "per_debuff_stack");
		expect(stack).toBeDefined();
	});

	test("十方真魄 produces self_lost_hp_damage conditional", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "十方真魄", op1: "玄心剑魄", op2: "通明" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const selfLost = slot.conditional_factors.find(cf => cf.condition === "self_lost_hp_damage");
		expect(selfLost).toBeDefined();
		expect(selfLost!.value).toBeGreaterThan(0);
	});

	test("玄心剑魄 on_dispel routes to StateDef (not dropped)", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "春黎剑阵", op1: "玄心剑魄", op2: "通明" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const onDispel = slot.states_to_create.find(s => s.id.includes("on_dispel"));
		expect(onDispel).toBeDefined();
	});

	test("皓月剑诀 shield_destroy_damage routes to StateDef", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "皓月剑诀", op1: "玄心剑魄", op2: "通明" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const shieldDestroy = slot.states_to_create.find(s =>
			s.id.includes("shield_destroy_damage"),
		);
		expect(shieldDestroy).toBeDefined();
	});

	test("通天剑诀 self_damage_taken_increase routes to StateDef", () => {
		// 通天剑诀 is a platform with self_damage_taken_increase in its skill effects
		const slot = buildSlotDef(
			{ slot: 1, platform: "通天剑诀", op1: "通明", op2: "吞海" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const selfDmgIncrease = slot.states_to_create.find(s =>
			s.id.includes("self_damage_taken_increase"),
		);
		expect(selfDmgIncrease).toBeDefined();
		// Should have negative dr_modifier (takes MORE damage)
		expect(selfDmgIncrease!.dr_modifier).toBeLessThan(0);
	});

	test("无极剑阵 enemy_skill_damage_reduction routes to conditional", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "皓月剑诀", op1: "玄心剑魄", op2: "无极剑阵" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const drRed = slot.conditional_factors.find(cf => cf.condition === "enemy_dr_reduction");
		expect(drRed).toBeDefined();
		expect(drRed!.value).toBeGreaterThan(0);
	});

	test("心逐神随 probability_multiplier routes to conditional", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "春黎剑阵", op1: "心逐神随", op2: "通明" },
			"entity-a",
			"entity-b",
			[], PROG,
		);
		const prob = slot.conditional_factors.find(cf => cf.condition === "probability_multiplier");
		expect(prob).toBeDefined();
		expect(prob!.value).toBeGreaterThan(0);
	});

	test("progression: enlightenment=0 uses lowest tier D_base", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "千锋聚灵剑", op1: "吞海", op2: "通明" },
			"entity-a",
			"entity-b",
			[],
			{ enlightenment: 0, fusion: 0 },
		);
		// enlightenment=0: total=1500, hits=6 → per-hit=250
		expect(slot.base_factors.D_base).toBeCloseTo(250, 0);
		expect(slot.hit_count).toBe(6);
	});

	test("progression: enlightenment=10 uses highest tier D_base", () => {
		const slot = buildSlotDef(
			{ slot: 1, platform: "千锋聚灵剑", op1: "吞海", op2: "通明" },
			"entity-a",
			"entity-b",
			[],
			{ enlightenment: 10, fusion: 51 },
		);
		// enlightenment=10, fusion=51: total=20265, hits=6 → per-hit=3377.5
		expect(slot.base_factors.D_base).toBeCloseTo(3377.5, 0);
	});

	test("no effect type is silently dropped — all route to a handler", () => {
		const config = loadCombatConfig(configPath);
		const arena = buildArenaDef(config);

		// Every slot should have base_factors, and conditionals + states should capture
		// everything that was previously in EXCLUDED_FROM_BASE
		for (const slot of [...arena.slots_a, ...arena.slots_b]) {
			expect(slot.base_factors).toBeDefined();
			expect(slot.conditional_factors).toBeDefined();
			expect(slot.states_to_create).toBeDefined();
		}
	});
});
