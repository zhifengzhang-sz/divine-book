import { describe, test, expect } from "bun:test";
import {
	FUNCTIONS,
	getQualifyingPlatforms,
	getAuxAffixes,
	enumerateCombos,
} from "./functions.js";
import { getPlatform, PLATFORMS } from "./platforms.js";

// ---------------------------------------------------------------------------
// Function registry
// ---------------------------------------------------------------------------

describe("function registry", () => {
	test("has 13 functions", () => {
		expect(FUNCTIONS.length).toBe(13);
	});

	test("all functions have unique IDs", () => {
		const ids = FUNCTIONS.map((f) => f.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("all functions have non-empty coreEffects", () => {
		for (const fn of FUNCTIONS) {
			expect(fn.coreEffects.length).toBeGreaterThan(0);
		}
	});

	test("all functions have relevantFactors", () => {
		for (const fn of FUNCTIONS) {
			expect(fn.relevantFactors).toBeDefined();
			expect(fn.relevantFactors!.length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Platform qualification — baseline thresholds
// ---------------------------------------------------------------------------

describe("platform qualification — baseline", () => {
	test("F_burst excludes low-D_base platforms", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_burst")!;
		const platforms = getQualifyingPlatforms(fn);
		const names = platforms.map((p) => p.book);

		// All sword + spell + demon high-D_base platforms qualify
		expect(names).toContain("千锋聚灵剑");
		expect(names).toContain("春黎剑阵");
		expect(names).toContain("甲元仙符");
		expect(names).toContain("大罗幻诀");

		// Low-D_base body platforms excluded
		expect(names).not.toContain("无相魔劫咒");
		expect(names).not.toContain("十方真魄");
		expect(names).not.toContain("玄煞灵影诀");
		expect(names).not.toContain("疾风九变");
	});

	test("F_buff qualifies only platforms with S_coeff > 0", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_buff")!;
		const platforms = getQualifyingPlatforms(fn);
		const names = platforms.map((p) => p.book);

		expect(names).toContain("甲元仙符");
		expect(names).toContain("十方真魄");
		expect(platforms.length).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Platform qualification — primaryAffixOutputs overlap
// ---------------------------------------------------------------------------

describe("platform qualification — primary overlap", () => {
	test("F_counter qualifies only 疾风九变", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_counter")!;
		const platforms = getQualifyingPlatforms(fn);
		expect(platforms.length).toBe(1);
		expect(platforms[0].book).toBe("疾风九变");
	});

	test("F_delayed qualifies only 无相魔劫咒", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_delayed")!;
		const platforms = getQualifyingPlatforms(fn);
		expect(platforms.length).toBe(1);
		expect(platforms[0].book).toBe("无相魔劫咒");
	});

	test("F_exploit qualifies only 皓月剑诀", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_exploit")!;
		const platforms = getQualifyingPlatforms(fn);
		expect(platforms.length).toBe(1);
		expect(platforms[0].book).toBe("皓月剑诀");
	});
});

// ---------------------------------------------------------------------------
// Platform qualification — TargetCategory
// ---------------------------------------------------------------------------

describe("platform qualification — TargetCategory", () => {
	test("F_hp_exploit qualifies only LostHp platforms", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_hp_exploit")!;
		const platforms = getQualifyingPlatforms(fn);
		expect(platforms.length).toBe(3);
		for (const p of platforms) {
			expect(p.provides).toContain("lost_hp");
		}
	});

	test("F_survive qualifies all platforms (aux-only)", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_survive")!;
		const platforms = getQualifyingPlatforms(fn);
		expect(platforms.length).toBe(PLATFORMS.length);
	});
});

// ---------------------------------------------------------------------------
// Aux affix enumeration
// ---------------------------------------------------------------------------

describe("getAuxAffixes", () => {
	test("excludes exclusive affixes", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_burst")!;
		const aux = getAuxAffixes(fn);
		for (const a of aux) {
			// Exclusive affixes are book-locked, should never appear
			expect(["天哀灵涸", "玄心剑魄", "追神真诀"]).not.toContain(a.affix);
		}
	});

	test("F_antiheal has core aux affixes for debuff", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_antiheal")!;
		const aux = getAuxAffixes(fn);
		const coreAux = aux.filter((a) => a.role === "core");
		// Should find affixes that output debuff, conditional_debuff, or random_debuff
		expect(coreAux.length).toBeGreaterThan(0);
	});

	test("separates core vs amplifier roles", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_burst")!;
		const aux = getAuxAffixes(fn);
		const roles = new Set(aux.map((a) => a.role));
		expect(roles.has("core")).toBe(true);
		expect(roles.has("amplifier")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Combo enumeration
// ---------------------------------------------------------------------------

describe("enumerateCombos", () => {
	test("returns combos sorted by distance (descending)", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_burst")!;
		const platform = getPlatform("千锋聚灵剑")!;
		const combos = enumerateCombos(fn, platform);

		for (let i = 1; i < combos.length; i++) {
			expect(combos[i - 1].distance).toBeGreaterThanOrEqual(combos[i].distance);
		}
	});

	test("strict mode requires both ops to serve function", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_burst")!;
		const platform = getPlatform("千锋聚灵剑")!;
		const strict = enumerateCombos(fn, platform, true);
		const loose = enumerateCombos(fn, platform, false);

		expect(strict.length).toBeLessThanOrEqual(loose.length);
		for (const c of strict) {
			expect(c.bothServe).toBe(true);
		}
	});

	test("no combo has op1 === op2", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_burst")!;
		const platform = getPlatform("春黎剑阵")!;
		const combos = enumerateCombos(fn, platform);

		for (const c of combos) {
			expect(c.op1.affix).not.toBe(c.op2.affix);
		}
	});

	test("distance uses relevantFactors when set", () => {
		const fn = FUNCTIONS.find((f) => f.id === "F_antiheal")!;
		const platform = getPlatform("千锋聚灵剑")!;
		const combos = enumerateCombos(fn, platform);

		// F_antiheal relevantFactors is ["H_red"] — top combos should have H_red contribution
		if (combos.length > 0) {
			const top = combos[0];
			expect(top.factors.H_red).not.toBe(0);
		}
	});
});
