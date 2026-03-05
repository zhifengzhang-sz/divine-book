import { describe, expect, test } from "bun:test";
import { School, TargetCategory } from "./enums.js";
import { AFFIX_BINDINGS, getBinding, getBindingsByCategory } from "./bindings.js";
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
// Platform registry
// ---------------------------------------------------------------------------

describe("platform registry", () => {
	test("has exactly 9 platforms", () => {
		expect(PLATFORMS.length).toBe(9);
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
