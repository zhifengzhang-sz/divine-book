import { describe, test, expect } from "bun:test";
import {
	buildFactorVector,
	buildBookModel,
	comboDistance,
	getExclusiveAffixModel,
} from "./model-data.js";

// ---------------------------------------------------------------------------
// Exclusive affix inclusion
// ---------------------------------------------------------------------------

describe("exclusive affix inclusion", () => {
	test("buildFactorVector includes exclusive affix", () => {
		// 千锋聚灵剑's exclusive affix 天哀灵涸 contributes H_red (debuff: healing -31%)
		const vec = buildFactorVector("千锋聚灵剑", "", "");
		expect(vec.H_red).not.toBe(0);
	});

	test("buildFactorVector includes platform skill", () => {
		const vec = buildFactorVector("千锋聚灵剑", "", "");
		expect(vec.D_base).toBeGreaterThan(0);
	});

	test("buildFactorVector includes operator affixes", () => {
		const without = buildFactorVector("千锋聚灵剑", "", "");
		const with_ops = buildFactorVector("千锋聚灵剑", "摧山", "斩岳");
		// 摧山 adds attack_bonus, 斩岳 adds flat_extra_damage
		expect(with_ops.D_flat).toBeGreaterThan(without.D_flat);
	});

	test("buildBookModel includes exclusive affix", () => {
		const book = buildBookModel("千锋聚灵剑", "", "", 1);
		expect(book.H_red).not.toBe(0);
	});
});

// ---------------------------------------------------------------------------
// comboDistance
// ---------------------------------------------------------------------------

describe("comboDistance", () => {
	test("distance is zero with no operators", () => {
		const d = comboDistance("千锋聚灵剑", "", "");
		expect(d).toBe(0);
	});

	test("distance is positive with operators", () => {
		const d = comboDistance("千锋聚灵剑", "摧山", "斩岳");
		expect(d).toBeGreaterThan(0);
	});

	test("relevantFactors filters dimensions", () => {
		// With all dimensions vs only H_red
		const full = comboDistance("千锋聚灵剑", "摧山", "斩岳");
		const limited = comboDistance("千锋聚灵剑", "摧山", "斩岳", ["H_red"]);

		// 摧山 and 斩岳 don't contribute H_red, so limited distance ≈ 0
		expect(limited).toBeLessThan(full);
	});

	test("relevantFactors focuses on specified dimensions", () => {
		// 斩岳 contributes D_flat, 摧山 contributes M_dmg (attack_bonus)
		// When filtering to D_flat only, 斩岳 should score higher
		const d_flat_a = comboDistance("千锋聚灵剑", "斩岳", "", ["D_flat"]);
		const d_flat_b = comboDistance("千锋聚灵剑", "摧山", "", ["D_flat"]);

		expect(d_flat_a).toBeGreaterThan(d_flat_b);
	});
});
