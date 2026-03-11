import { describe, expect, test } from "bun:test";
import { School, TargetCategory } from "./enums.js";
import {
	AFFIX_BINDINGS,
	deriveProvides,
	getBinding,
	getBindingsByCategory,
} from "./bindings.js";
import { PLATFORMS, getPlatform } from "./platforms.js";
import { NAMED_ENTITIES, getNamedEntity } from "./named-entities.js";
import { filterByBinding, discoverChains } from "./chains.js";
import { validateConstruction } from "./constraints.js";

// ---------------------------------------------------------------------------
// Binding registry coverage
// ---------------------------------------------------------------------------

describe("binding registry", () => {
	test("has exactly 61 affix bindings", () => {
		expect(AFFIX_BINDINGS.length).toBe(61);
	});

	test("has 16 universal bindings", () => {
		expect(getBindingsByCategory("universal").length).toBe(16);
	});

	test("has 17 school bindings (4+4+4+5)", () => {
		expect(getBindingsByCategory("school").length).toBe(17);
	});

	test("has 28 exclusive bindings (7+7+7+7)", () => {
		expect(getBindingsByCategory("exclusive").length).toBe(28);
	});

	test("every binding has a unique affix name", () => {
		const names = AFFIX_BINDINGS.map((b) => b.affix);
		expect(new Set(names).size).toBe(names.length);
	});

	test("every binding has at least one output", () => {
		for (const b of AFFIX_BINDINGS) {
			expect(b.outputs.length).toBeGreaterThan(0);
		}
	});

	test("exclusive bindings all have book and school", () => {
		for (const b of getBindingsByCategory("exclusive")) {
			expect(b.book).toBeDefined();
			expect(b.school).toBeDefined();
		}
	});

	test("school bindings all have school but no book", () => {
		for (const b of getBindingsByCategory("school")) {
			expect(b.school).toBeDefined();
			expect(b.book).toBeUndefined();
		}
	});

	test("universal bindings have neither school nor book", () => {
		for (const b of getBindingsByCategory("universal")) {
			expect(b.school).toBeUndefined();
			expect(b.book).toBeUndefined();
		}
	});
});

// ---------------------------------------------------------------------------
// Provides derivation from outputs
// ---------------------------------------------------------------------------

describe("deriveProvides", () => {
	test("debuff output → T.Debuff", () => {
		expect(deriveProvides(["debuff"])).toContain(TargetCategory.Debuff);
	});

	test("random_buff output → T.Buff", () => {
		expect(deriveProvides(["random_buff"])).toContain(TargetCategory.Buff);
	});

	test("dot output → T.Dot", () => {
		expect(deriveProvides(["dot"])).toContain(TargetCategory.Dot);
	});

	test("damage_to_shield output → T.Shield", () => {
		expect(deriveProvides(["damage_to_shield"])).toContain(
			TargetCategory.Shield,
		);
	});

	test("lifesteal output → T.Healing", () => {
		expect(deriveProvides(["lifesteal"])).toContain(TargetCategory.Healing);
	});

	test("self_damage_taken_increase output → T.LostHp", () => {
		expect(deriveProvides(["self_damage_taken_increase"])).toContain(
			TargetCategory.LostHp,
		);
	});

	test("min_lost_hp_threshold output → T.LostHp", () => {
		expect(deriveProvides(["min_lost_hp_threshold"])).toContain(
			TargetCategory.LostHp,
		);
	});

	test("probability_multiplier output → T.Probability", () => {
		expect(deriveProvides(["probability_multiplier"])).toContain(
			TargetCategory.Probability,
		);
	});

	test("pure amplifiers produce no categories", () => {
		expect(deriveProvides(["attack_bonus"])).toEqual([]);
		expect(deriveProvides(["damage_increase"])).toEqual([]);
		expect(deriveProvides(["flat_extra_damage"])).toEqual([]);
		expect(deriveProvides(["dot_extra_per_tick"])).toEqual([]);
		expect(deriveProvides(["buff_strength"])).toEqual([]);
		expect(deriveProvides(["debuff_strength"])).toEqual([]);
	});

	test("multiple outputs derive multiple categories", () => {
		// 魔骨明心: conditional_heal_buff + conditional_debuff
		const provides = deriveProvides([
			"conditional_heal_buff",
			"conditional_debuff",
		]);
		expect(provides).toContain(TargetCategory.Healing);
		expect(provides).toContain(TargetCategory.Debuff);
	});
});

// ---------------------------------------------------------------------------
// Key affix provides verification
// ---------------------------------------------------------------------------

describe("affix provides derived correctly", () => {
	test("破釜沉舟 provides T.LostHp (from self_damage_taken_increase)", () => {
		const b = getBinding("破釜沉舟")!;
		expect(b.outputs).toContain("self_damage_taken_increase");
		expect(b.provides).toContain(TargetCategory.LostHp);
	});

	test("福荫 provides T.Buff (from random_buff)", () => {
		const b = getBinding("福荫")!;
		expect(b.outputs).toContain("random_buff");
		expect(b.provides).toContain(TargetCategory.Buff);
	});

	test("祸星无妄 provides T.Debuff (from random_debuff)", () => {
		const b = getBinding("祸星无妄")!;
		expect(b.outputs).toContain("random_debuff");
		expect(b.provides).toContain(TargetCategory.Debuff);
	});

	test("玄女护心 provides T.Shield (from damage_to_shield)", () => {
		const b = getBinding("玄女护心")!;
		expect(b.provides).toContain(TargetCategory.Shield);
	});

	test("仙灵汲元 provides T.Healing (from lifesteal)", () => {
		const b = getBinding("仙灵汲元")!;
		expect(b.provides).toContain(TargetCategory.Healing);
	});

	test("魔骨明心 provides both T.Healing and T.Debuff", () => {
		const b = getBinding("魔骨明心")!;
		expect(b.provides).toContain(TargetCategory.Healing);
		expect(b.provides).toContain(TargetCategory.Debuff);
	});

	test("意坠深渊 provides T.LostHp (from min_lost_hp_threshold)", () => {
		const b = getBinding("意坠深渊")!;
		expect(b.provides).toContain(TargetCategory.LostHp);
	});

	test("心逐神随 provides T.Probability (from probability_multiplier)", () => {
		const b = getBinding("心逐神随")!;
		expect(b.provides).toContain(TargetCategory.Probability);
	});

	test("玄心剑魄 provides T.Dot (from dot)", () => {
		const b = getBinding("玄心剑魄")!;
		expect(b.provides).toContain(TargetCategory.Dot);
	});

	test("pure amplifiers have empty provides", () => {
		for (const name of ["咒书", "清灵", "鬼印", "古魔之魂", "天魔真解"]) {
			const b = getBinding(name)!;
			expect(b.provides).toEqual([]);
		}
	});
});

// ---------------------------------------------------------------------------
// Platform registry
// ---------------------------------------------------------------------------

describe("platform registry", () => {
	test("has exactly 10 platforms", () => {
		expect(PLATFORMS.length).toBe(10);
	});

	test("all platforms have unique book names", () => {
		const names = PLATFORMS.map((p) => p.book);
		expect(new Set(names).size).toBe(names.length);
	});

	test("all platforms provide at least T1 (damage)", () => {
		for (const p of PLATFORMS) {
			expect(p.provides).toContain(TargetCategory.Damage);
		}
	});

	test("十方真魄 provides T1, T3, T6, T9", () => {
		const p = getPlatform("十方真魄")!;
		expect(p.provides).toContain(TargetCategory.Damage);
		expect(p.provides).toContain(TargetCategory.Buff);
		expect(p.provides).toContain(TargetCategory.Healing);
		expect(p.provides).toContain(TargetCategory.LostHp);
	});

	test("疾风九变 provides T1, T3, T6, T9", () => {
		const p = getPlatform("疾风九变")!;
		expect(p.provides).toContain(TargetCategory.Damage);
		expect(p.provides).toContain(TargetCategory.Buff);
		expect(p.provides).toContain(TargetCategory.Healing);
		expect(p.provides).toContain(TargetCategory.LostHp);
	});

	test("大罗幻诀 provides T1, T2, T4, T7, T8", () => {
		const p = getPlatform("大罗幻诀")!;
		expect(p.provides).toContain(TargetCategory.Damage);
		expect(p.provides).toContain(TargetCategory.Debuff);
		expect(p.provides).toContain(TargetCategory.Dot);
		expect(p.provides).toContain(TargetCategory.State);
		expect(p.provides).toContain(TargetCategory.Probability);
	});
});

// ---------------------------------------------------------------------------
// Named entities
// ---------------------------------------------------------------------------

describe("named entities", () => {
	test("has exactly 6 named entities", () => {
		expect(NAMED_ENTITIES.length).toBe(6);
	});

	test("极怒 has 2 inputs", () => {
		const e = getNamedEntity("极怒")!;
		expect(e.inputs.length).toBe(2);
		expect(e.inputs[0].input).toBe("received_damage");
		expect(e.inputs[1].input).toBe("lost_hp");
	});

	test("仙佑 has no inputs (unconditional)", () => {
		const e = getNamedEntity("仙佑")!;
		expect(e.inputs.length).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Chain discovery — 极怒 test
// ---------------------------------------------------------------------------

describe("chain discovery", () => {
	test("疾风九变 platform admits 战意 and 怒血战意 (T9 satisfied)", () => {
		const platform = getPlatform("疾风九变")!;
		const result = filterByBinding(platform);
		const names = result.validAffixes.map((a) => a.affix);
		expect(names).toContain("战意");
		expect(names).toContain("怒血战意");
	});

	test("疾风九变 prunes 击瑕 and 乘胜逐北 (T10 not available)", () => {
		const platform = getPlatform("疾风九变")!;
		const result = filterByBinding(platform);
		const prunedNames = result.prunedAffixes.map((a) => a.affix);
		expect(prunedNames).toContain("击瑕");
		expect(prunedNames).toContain("乘胜逐北");
	});

	test("HP exploitation chain found: 破釜沉舟 feeds per_self_lost_hp", () => {
		const platform = getPlatform("疾风九变")!;
		const selected = [
			getBinding("破釜沉舟")!,
			getBinding("怒血战意")!,
			getBinding("意坠深渊")!,
		];
		const chains = discoverChains(platform, selected);
		const hpChain = chains.find((c) => c.source === "per_self_lost_hp");
		expect(hpChain).toBeDefined();
		expect(hpChain!.nodes.map((n) => n.affix)).toContain("破釜沉舟");
		expect(hpChain!.nodes.map((n) => n.affix)).toContain("意坠深渊");
	});

	test("HP exploitation bridge found: 怒血战意 via per_self_lost_hp", () => {
		const platform = getPlatform("疾风九变")!;
		const selected = [getBinding("怒血战意")!];
		const chains = discoverChains(platform, selected);
		const bridge = chains.find(
			(c) => c.bridges.includes("per_self_lost_hp"),
		);
		expect(bridge).toBeDefined();
		expect(bridge!.nodes.map((n) => n.affix)).toContain("怒血战意");
	});

	test("chain discovery uses binding.outputs (no separate map)", () => {
		// Verify that 破釜沉舟's outputs include self_damage_taken_increase
		// which is what the chain discovery should use
		const binding = getBinding("破釜沉舟")!;
		expect(binding.outputs).toContain("self_damage_taken_increase");
		expect(binding.outputs).toContain("skill_damage_increase");
	});
});

// ---------------------------------------------------------------------------
// Construction constraints
// ---------------------------------------------------------------------------

describe("construction constraints", () => {
	test("rejects duplicate main books", () => {
		const errors = validateConstruction({
			slots: [
				{ main: "十方真魄", aux1: "战意", aux2: "斩岳" },
				{ main: "十方真魄", aux1: "破竹", aux2: "金汤" },
				{ main: "疾风九变", aux1: "摧山", aux2: "吞海" },
				{ main: "甲元仙符", aux1: "灵威", aux2: "通明" },
				{ main: "大罗幻诀", aux1: "怒目", aux2: "福荫" },
				{ main: "千锋聚灵剑", aux1: "清灵", aux2: "业焰" },
			],
		});
		expect(errors.some((e) => e.includes("核心冲突"))).toBe(true);
	});

	test("rejects duplicate affixes across set", () => {
		const errors = validateConstruction({
			slots: [
				{ main: "十方真魄", aux1: "战意", aux2: "斩岳" },
				{ main: "疾风九变", aux1: "战意", aux2: "金汤" },
				{ main: "甲元仙符", aux1: "摧山", aux2: "吞海" },
				{ main: "大罗幻诀", aux1: "灵威", aux2: "通明" },
				{ main: "千锋聚灵剑", aux1: "怒目", aux2: "福荫" },
				{ main: "春黎剑阵", aux1: "清灵", aux2: "业焰" },
			],
		});
		expect(errors.some((e) => e.includes("副词缀冲突"))).toBe(true);
	});

	test("rejects school mismatch", () => {
		const errors = validateConstruction({
			slots: [
				{ main: "十方真魄", aux1: "灵犀九重", aux2: "斩岳" },
				{ main: "疾风九变", aux1: "战意", aux2: "金汤" },
				{ main: "甲元仙符", aux1: "摧山", aux2: "吞海" },
				{ main: "大罗幻诀", aux1: "灵威", aux2: "通明" },
				{ main: "千锋聚灵剑", aux1: "怒目", aux2: "福荫" },
				{ main: "春黎剑阵", aux1: "清灵", aux2: "业焰" },
			],
		});
		expect(errors.some((e) => e.includes("School mismatch"))).toBe(true);
	});

	test("accepts valid composition", () => {
		const errors = validateConstruction({
			slots: [
				{ main: "十方真魄", aux1: "金刚护体", aux2: "斩岳" },
				{ main: "疾风九变", aux1: "意坠深渊", aux2: "金汤" },
				{ main: "甲元仙符", aux1: "明王之路", aux2: "摧山" },
				{ main: "大罗幻诀", aux1: "瑶光却邪", aux2: "吞海" },
				{ main: "千锋聚灵剑", aux1: "怒目", aux2: "福荫" },
				{ main: "春黎剑阵", aux1: "灵威", aux2: "通明" },
			],
		});
		expect(errors.length).toBe(0);
	});
});
