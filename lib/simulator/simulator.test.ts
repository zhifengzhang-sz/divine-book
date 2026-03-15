import { describe, test, expect } from "bun:test";
import { simulateBook, resolveSlot, selectTier } from "./simulate.js";
import { Entity } from "./entity.js";
import { runCombat } from "./arena.js";
import type { OwnerStats, Intent, AtkDamageIntent } from "./types.js";
import type { EffectRow, BookData } from "../parser/emit.js";
import { DEFAULT_COMBAT_CONFIG } from "./types.js";

const BASE_OWNER: OwnerStats = {
	id: "test",
	atk: 50_000,
	effective_atk: 50_000,
	hp: 1_000_000,
	max_hp: 1_000_000,
	def: 10_000,
	sp: 5_000,
};

// ─── selectTier ─────────────────────────────────────────────────

describe("selectTier", () => {
	test("keeps ungated effects", () => {
		const effects: EffectRow[] = [
			{ type: "base_attack", hits: 6, total: 1500 },
		];
		expect(selectTier(effects)).toHaveLength(1);
	});

	test("picks highest tier for same type", () => {
		const effects: EffectRow[] = [
			{ type: "base_attack", hits: 6, total: 1500, data_state: "enlightenment=0" },
			{ type: "base_attack", hits: 6, total: 20265, data_state: "enlightenment=10" },
		];
		const result = selectTier(effects);
		expect(result).toHaveLength(1);
		expect(result[0].total).toBe(20265);
	});

	test("skips locked effects", () => {
		const effects: EffectRow[] = [
			{ type: "base_attack", data_state: "locked" },
			{ type: "base_attack", total: 1500, data_state: "enlightenment=1" },
		];
		const result = selectTier(effects);
		expect(result).toHaveLength(1);
		expect(result[0].total).toBe(1500);
	});

	test("separate groups for different types", () => {
		const effects: EffectRow[] = [
			{ type: "base_attack", total: 1500, data_state: "enlightenment=0" },
			{ type: "crit_damage_bonus", value: 100 },
			{ type: "base_attack", total: 20265, data_state: "enlightenment=10" },
		];
		const result = selectTier(effects);
		expect(result).toHaveLength(2); // ungated crit_damage_bonus + highest base_attack
	});
});

// ─── simulateBook — 通天剑诀 ───────────────────────────────────

describe("simulateBook — 通天剑诀", () => {
	const effects: EffectRow[] = [
		// skill
		{ type: "base_attack", hits: 6, total: 1500 },
		{ type: "crit_damage_bonus", value: 100 },
		{ type: "self_damage_taken_increase", value: 50, duration: 8 },
		// primary_affix
		{ type: "per_enemy_lost_hp", per_percent: 2 },
		// exclusive_affix
		{ type: "ignore_damage_reduction", },
		{ type: "damage_increase", value: 36 },
	];

	test("produces ATK_DAMAGE + SELF_DAMAGE_INCREASE", () => {
		const intents = simulateBook(effects, BASE_OWNER);

		const atk = intents.find((i) => i.type === "ATK_DAMAGE") as AtkDamageIntent;
		expect(atk).toBeDefined();
		expect(atk.hits).toBe(6);
		expect(atk.crit_bonus).toBe(100);
		expect(atk.dr_bypass).toBe(1); // ignore_damage_reduction

		// per_enemy_lost_hp operator
		expect(atk.operators).toHaveLength(1);
		expect(atk.operators[0].kind).toBe("per_enemy_lost_hp");

		const sdi = intents.find((i) => i.type === "SELF_DAMAGE_INCREASE");
		expect(sdi).toBeDefined();
	});

	test("damage_increase modifies ATK_DAMAGE amount", () => {
		const intents = simulateBook(effects, BASE_OWNER);
		const atk = intents.find((i) => i.type === "ATK_DAMAGE") as AtkDamageIntent;

		// base: (1500/100 * 50000) / 6 = 125000
		// damage_increase +36%: 125000 * 1.36 = 170000
		expect(atk.amount_per_hit).toBeCloseTo(170000, -2);
	});
});

// ─── simulateBook — 煞影千幻 ───────────────────────────────────

describe("simulateBook — 煞影千幻", () => {
	const effects: EffectRow[] = [
		{ type: "self_hp_cost", value: 20 },
		{ type: "base_attack", hits: 3, total: 1500 },
		{ type: "self_lost_hp_damage", value: 10 },
		{ type: "shield", value: 12, source: "self_max_hp", duration: 8 },
		{ type: "debuff", name: "落星", target: "final_damage_reduction", value: -8, duration: 4, per_hit_stack: true, dispellable: false },
		// primary affix
		{ type: "shield_strength", value: 21.5 },
	];

	test("HP_COST computed from current HP", () => {
		const intents = simulateBook(effects, BASE_OWNER);
		const cost = intents.find((i) => i.type === "HP_COST");
		expect(cost).toBeDefined();
		if (cost?.type === "HP_COST") {
			expect(cost.amount).toBe(200_000); // 20% of 1M
		}
	});

	test("shield_strength replaces shield amount", () => {
		const intents = simulateBook(effects, BASE_OWNER);
		const shield = intents.find((i) => i.type === "SHIELD");
		expect(shield).toBeDefined();
		if (shield?.type === "SHIELD") {
			expect(shield.amount).toBe(215_000); // 21.5% of 1M
		}
	});

	test("self_lost_hp_damage adds flat bonus (0 when full HP)", () => {
		const intents = simulateBook(effects, BASE_OWNER);
		const atk = intents.find((i) => i.type === "ATK_DAMAGE") as AtkDamageIntent;
		// At full HP, lost_hp = 0, so no extra damage
		// base: (1500/100 * 50000) / 3 = 250000
		expect(atk.amount_per_hit).toBeCloseTo(250_000, -2);
	});

	test("self_lost_hp_damage adds bonus when HP is lower", () => {
		const owner = { ...BASE_OWNER, hp: 800_000 };
		const intents = simulateBook(effects, owner);
		const atk = intents.find((i) => i.type === "ATK_DAMAGE") as AtkDamageIntent;
		// lost_hp = 200000, extra = 10% * 200000 = 20000, per hit = 20000/3 = 6667
		// base = 250000 + 6667 = 256667
		expect(atk.amount_per_hit).toBeCloseTo(256_667, -1);
	});

	test("APPLY_DEBUFF emitted for 落星", () => {
		const intents = simulateBook(effects, BASE_OWNER);
		const debuff = intents.find((i) => i.type === "APPLY_DEBUFF");
		expect(debuff).toBeDefined();
		if (debuff?.type === "APPLY_DEBUFF") {
			expect(debuff.id).toBe("落星");
			expect(debuff.dispellable).toBe(false);
		}
	});
});

// ─── simulateBook — 大罗幻诀 (parent assembly) ─────────────────

describe("simulateBook — 大罗幻诀", () => {
	const effects: EffectRow[] = [
		{ type: "base_attack", hits: 5, total: 20265 },
		{ type: "counter_debuff", name: "罗天魔咒", duration: 8, on_attacked_chance: 30 },
		{ type: "dot", name: "噬心魔咒", parent: "罗天魔咒", percent_current_hp: 7, tick_interval: 0.5, duration: 4, max_stacks: 5 },
		{ type: "dot", name: "断魂之咒", parent: "罗天魔咒", percent_lost_hp: 7, tick_interval: 0.5, duration: 4, max_stacks: 5 },
		// primary affix
		{ type: "counter_debuff_upgrade", on_attacked_chance: 60 },
	];

	test("DoTs nested under counter state", () => {
		const intents = simulateBook(effects, BASE_OWNER);
		const counter = intents.find((i) => i.type === "COUNTER_STATE");
		expect(counter).toBeDefined();
		if (counter?.type === "COUNTER_STATE") {
			expect(counter.on_hit.chance).toBe(60); // upgraded from 30
			expect(counter.on_hit.apply_to_attacker).toHaveLength(2);
			const dot1 = counter.on_hit.apply_to_attacker![0];
			expect(dot1.type).toBe("APPLY_DOT");
			if (dot1.type === "APPLY_DOT") {
				expect(dot1.id).toBe("噬心魔咒");
				expect(dot1.basis).toBe("current");
			}
		}
	});
});

// ─── simulateBook — 甲元仙符 (self_buff + self_buff_extra) ────

describe("simulateBook — 甲元仙符", () => {
	const effects: EffectRow[] = [
		{ type: "base_attack", total: 21090, data_state: "enlightenment=8" },
		{ type: "self_buff", name: "仙佑", attack_bonus: 70, defense_bonus: 70, hp_bonus: 70, duration: 12, data_state: "enlightenment=1" },
		{ type: "self_buff_extra", buff_name: "仙佑", healing_bonus: 190, data_state: "enlightenment=7" },
	];

	test("self_buff_extra adds healing to existing buff", () => {
		const intents = simulateBook(effects, BASE_OWNER);
		const buff = intents.find((i) => i.type === "SELF_BUFF");
		expect(buff).toBeDefined();
		if (buff?.type === "SELF_BUFF") {
			expect(buff.id).toBe("仙佑");
			expect(buff.atk_percent).toBe(70);
			expect((buff as any).healing_percent).toBe(190);
		}
	});
});

// ─── resolveSlot — self vs opponent classification ──────────────

describe("resolveSlot", () => {
	test("classifies intents correctly", () => {
		const book: BookData = {
			school: "Sword",
			skill: [
				{ type: "base_attack", hits: 6, total: 1500 },
				{ type: "crit_damage_bonus", value: 100 },
				{ type: "self_damage_taken_increase", value: 50, duration: 8 },
			],
		};
		const snap = new Entity("test", 1_000_000, 50_000, 10_000, 5_000).snapshot();
		const result = resolveSlot(book, snap);

		// self: SELF_DAMAGE_INCREASE
		expect(result.self_intents.some((i) => i.type === "SELF_DAMAGE_INCREASE")).toBe(true);
		// opponent: ATK_DAMAGE
		expect(result.opponent_intents.some((i) => i.type === "ATK_DAMAGE")).toBe(true);
	});
});

// ─── Entity — intent application ────────────────────────────────

describe("Entity", () => {
	test("HP cost reduces HP but doesn't kill", () => {
		const e = new Entity("A", 100, 10, 5, 5);
		e.applySelf({ type: "HP_COST", amount: 150 });
		expect(e.hp).toBe(1); // Can't go below 1
	});

	test("shield absorbs damage", () => {
		const e = new Entity("A", 1000, 10, 5, 5);
		e.applySelf({ type: "SHIELD", amount: 200, duration: 8 });
		const snap = new Entity("B", 1000, 10, 5, 5).snapshot();
		e.receiveIntent({
			type: "ATK_DAMAGE",
			amount_per_hit: 150,
			hits: 1,
			source: "B",
			dr_bypass: 1,
			crit_bonus: 0,
			operators: [],
		}, snap);
		expect(e.hp).toBe(1000); // 150 fully absorbed by 200 shield
	});

	test("ATK_DAMAGE with per_enemy_lost_hp operator", () => {
		const e = new Entity("A", 1000, 10, 5, 5);
		e.hp = 700; // 30% lost
		const snap = new Entity("B", 1000, 10, 5, 5).snapshot();
		e.receiveIntent({
			type: "ATK_DAMAGE",
			amount_per_hit: 100,
			hits: 1,
			source: "B",
			dr_bypass: 1,
			crit_bonus: 0,
			operators: [{ kind: "per_enemy_lost_hp", per_percent: 2 }],
		}, snap);
		// 30% lost × 2 per_percent = 60% bonus → 100 × 1.6 = 160
		expect(e.hp).toBeCloseTo(700 - 160, 0);
	});

	test("debuff is applied and can be cleansed", () => {
		const e = new Entity("A", 1000, 10, 5, 5);
		const snap = new Entity("B", 1000, 10, 5, 5).snapshot();
		e.receiveIntent({
			type: "APPLY_DEBUFF",
			id: "test",
			stat: "atk",
			value: -10,
			duration: 8,
		}, snap);
		expect(e.debuff_count).toBe(1);

		e.applySelf({ type: "CLEANSE", count: 1 });
		expect(e.debuff_count).toBe(0);
	});

	test("DoT ticks damage", () => {
		const e = new Entity("A", 10000, 10, 5, 5);
		const snap = new Entity("B", 10000, 10, 5, 5).snapshot();
		e.receiveIntent({
			type: "APPLY_DOT",
			id: "burn",
			percent: 10,
			basis: "max",
			tick_interval: 1,
			duration: 4,
		}, snap);
		e.tickStates(1);
		// 10% of 10000 max_hp = 1000 per tick
		expect(e.hp).toBeCloseTo(9000, 0);
	});

	test("counter reflects damage", () => {
		const e = new Entity("A", 10000, 10, 5, 5);
		e.applySelf({
			type: "COUNTER_STATE",
			id: "counter",
			duration: 8,
			on_hit: {
				reflect_received_damage: 50,
			},
		});
		const snap = new Entity("B", 10000, 10, 5, 5).snapshot();
		const [, counters] = e.receiveIntent({
			type: "ATK_DAMAGE",
			amount_per_hit: 1000,
			hits: 1,
			source: "B",
			dr_bypass: 1,
			crit_bonus: 0,
			operators: [],
		}, snap);

		expect(counters).toHaveLength(1);
		if (counters[0].type === "ATK_DAMAGE") {
			expect(counters[0].amount_per_hit).toBe(500); // 50% of 1000
		}
	});

	test("self_buff modifies effective_atk", () => {
		const e = new Entity("A", 1000, 100, 10, 5);
		expect(e.effective_atk).toBe(100);
		e.applySelf({
			type: "SELF_BUFF",
			id: "test",
			duration: 8,
			atk_percent: 50,
		});
		expect(e.effective_atk).toBe(150);
	});

	test("HP floor prevents death", () => {
		const e = new Entity("A", 1000, 10, 5, 5);
		e.applySelf({ type: "HP_FLOOR", percent: 10 });
		const snap = new Entity("B", 1000, 10, 5, 5).snapshot();
		e.receiveIntent({
			type: "ATK_DAMAGE",
			amount_per_hit: 2000,
			hits: 1,
			source: "B",
			dr_bypass: 1,
			crit_bonus: 0,
			operators: [],
		}, snap);
		expect(e.hp).toBe(100); // 10% of 1000
	});

	test("state expires after tick", () => {
		const e = new Entity("A", 1000, 10, 5, 5);
		e.applySelf({
			type: "SELF_BUFF",
			id: "short",
			duration: 2,
			atk_percent: 50,
		});
		expect(e.effective_atk).toBe(15);
		e.tickStates(1);
		expect(e.effective_atk).toBe(15); // 1s remaining
		e.tickStates(1);
		expect(e.effective_atk).toBe(10); // 0s remaining → expired
	});
});

// ─── Full combat integration ────────────────────────────────────

describe("runCombat", () => {
	test("通天剑诀 vs 新-青元剑诀 — both take damage, one wins", () => {
		const bookA: BookData = {
			school: "Sword",
			skill: [
				{ type: "base_attack", hits: 6, total: 1500 },
				{ type: "crit_damage_bonus", value: 100 },
				{ type: "self_damage_taken_increase", value: 50, duration: 8 },
			],
			primary_affix: {
				name: "焚心剑芒",
				effects: [{ type: "per_enemy_lost_hp", per_percent: 2 }],
			},
			exclusive_affix: {
				name: "神威冲云",
				effects: [
					{ type: "ignore_damage_reduction" },
					{ type: "damage_increase", value: 36 },
				],
			},
		};

		const bookB: BookData = {
			school: "Sword",
			skill: [
				{ type: "base_attack", hits: 6, total: 1500 },
				{ type: "debuff", name: "神通封印", target: "next_skill_cooldown", value: -8, duration: 8 },
			],
			primary_affix: {
				name: "追命剑阵",
				effects: [
					{ type: "debuff", name: "追命剑阵", target: "skill_damage", value: -30, duration: 16 },
				],
			},
		};

		const result = runCombat(bookA, bookB, "通天剑诀", "新-青元剑诀", DEFAULT_COMBAT_CONFIG);

		// Both should take damage
		expect(result.a_final_hp).toBeLessThan(1_000_000);
		expect(result.b_final_hp).toBeLessThan(1_000_000);

		// Someone wins or it's a draw
		expect(["通天剑诀", "新-青元剑诀", "draw"]).toContain(result.winner);

		// Combat should end before max rounds for these simple books
		expect(result.rounds).toBeGreaterThan(0);
		expect(result.rounds).toBeLessThanOrEqual(DEFAULT_COMBAT_CONFIG.max_rounds);
	});

	test("煞影千幻 vs 疾风九变 — both have HP cost + complex mechanics", () => {
		const shaYing: BookData = {
			school: "Body",
			skill: [
				{ type: "self_hp_cost", value: 20 },
				{ type: "base_attack", hits: 3, total: 1500 },
				{ type: "self_lost_hp_damage", value: 10 },
				{ type: "shield", value: 12, source: "self_max_hp", duration: 8 },
				{ type: "debuff", name: "落星", target: "final_damage_reduction", value: -8, duration: 4, per_hit_stack: true, dispellable: false },
			],
			primary_affix: {
				name: "星猿援护",
				effects: [{ type: "shield_strength", value: 21.5 }],
			},
		};

		const jiFeng: BookData = {
			school: "Body",
			skill: [
				{ type: "self_hp_cost", value: 10 },
				{ type: "base_attack", hits: 10, total: 1500 },
				{ type: "counter_buff", name: "极怒", duration: 4, reflect_received_damage: 50, reflect_percent_lost_hp: 15 },
			],
			primary_affix: {
				name: "星猿复灵",
				effects: [{ type: "lifesteal", value: 82 }],
			},
		};

		const result = runCombat(shaYing, jiFeng, "煞影千幻", "疾风九变", DEFAULT_COMBAT_CONFIG);

		expect(result.rounds).toBeGreaterThan(0);
		expect(result.a_final_hp).toBeLessThan(1_000_000);
		expect(result.b_final_hp).toBeLessThan(1_000_000);
	});

	test("大罗幻诀 self-combat — counter debuffs trigger", () => {
		const book: BookData = {
			school: "Demon",
			skill: [
				{ type: "base_attack", hits: 5, total: 20265 },
				{ type: "counter_debuff", name: "罗天魔咒", duration: 8, on_attacked_chance: 30 },
				{ type: "dot", name: "噬心魔咒", parent: "罗天魔咒", percent_current_hp: 7, tick_interval: 0.5, duration: 4, max_stacks: 5 },
				{ type: "dot", name: "断魂之咒", parent: "罗天魔咒", percent_lost_hp: 7, tick_interval: 0.5, duration: 4, max_stacks: 5 },
			],
			primary_affix: {
				name: "魔魂咒界",
				effects: [{ type: "counter_debuff_upgrade", on_attacked_chance: 60 }],
			},
		};

		const result = runCombat(book, book, "大罗幻诀-A", "大罗幻诀-B", DEFAULT_COMBAT_CONFIG);
		expect(result.rounds).toBeGreaterThan(0);
		// Symmetric matchup with massive damage → both die round 1 = draw
		expect(result.winner).toBe("draw");
	});
});
