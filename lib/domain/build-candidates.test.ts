import { describe, test, expect } from "bun:test";
import {
	THEMES,
	analyzeSlot,
	analyzeThemeSlots,
	enumerateSets,
	enumerateCandidates,
	getTheme,
} from "./build-candidates.js";

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

describe("themes", () => {
	test("5 themes defined", () => {
		expect(THEMES.length).toBe(5);
	});

	test("each theme has 6 slots", () => {
		for (const t of THEMES) {
			expect(t.slots.length).toBe(6);
		}
	});

	test("alpha values span 0 to 1", () => {
		const alphas = THEMES.map((t) => t.alpha).sort((a, b) => a - b);
		expect(alphas[0]).toBe(0);
		expect(alphas[alphas.length - 1]).toBe(1);
	});

	test("getTheme finds by id", () => {
		expect(getTheme("all_attack")).toBeDefined();
		expect(getTheme("nonexistent")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Layer 1: Per-slot analysis
// ---------------------------------------------------------------------------

describe("analyzeSlot", () => {
	test("returns analysis for valid platform+function", () => {
		const sa = analyzeSlot("春黎剑阵", "F_burst");
		expect(sa).not.toBeNull();
		expect(sa!.platform).toBe("春黎剑阵");
		expect(sa!.fn).toBe("F_burst");
	});

	test("returns null for invalid platform", () => {
		expect(analyzeSlot("不存在", "F_burst")).toBeNull();
	});

	test("detects flexible pattern with dominant affix", () => {
		const sa = analyzeSlot("春黎剑阵", "F_burst");
		expect(sa!.kind).toBe("flexible");
		expect(sa!.fixedAffix).toBeDefined();
		expect(sa!.alternatives).toBeDefined();
		expect(sa!.alternatives!.length).toBeGreaterThan(0);
	});

	test("combos include both with-fixed and without-fixed entries", () => {
		const sa = analyzeSlot("春黎剑阵", "F_burst");
		const fixed = sa!.fixedAffix!;
		const withFixed = sa!.combos.filter(
			(c) => c.op1 === fixed || c.op2 === fixed,
		);
		const without = sa!.combos.filter(
			(c) => c.op1 !== fixed && c.op2 !== fixed,
		);
		expect(withFixed.length).toBeGreaterThan(0);
		expect(without.length).toBeGreaterThan(0);
	});

	test("combos are diverse (multiple tiers of fallbacks)", () => {
		const sa = analyzeSlot("春黎剑阵", "F_burst");
		// Collect all unique affixes across combos
		const affixes = new Set<string>();
		for (const c of sa!.combos) {
			affixes.add(c.op1);
			affixes.add(c.op2);
		}
		// With 6 slots × 2 affixes = 12 needed, we need plenty of unique affixes
		expect(affixes.size).toBeGreaterThanOrEqual(12);
	});
});

// ---------------------------------------------------------------------------
// Layer 2: Set enumeration
// ---------------------------------------------------------------------------

describe("enumerateSets", () => {
	test("each theme produces at least 1 valid set", () => {
		for (const theme of THEMES) {
			const analyses = analyzeThemeSlots(theme, 20, 10);
			const sets = enumerateSets(theme, analyses, 1);
			expect(sets.length).toBeGreaterThanOrEqual(1);
		}
	});

	test("all affixes are unique across slots in each set", () => {
		const theme = getTheme("all_attack")!;
		const sets = enumerateCandidates(theme, 20, 10, 5);
		for (const s of sets) {
			const affixes = s.slots.flatMap((sl) => [sl.op1, sl.op2]);
			const unique = new Set(affixes);
			expect(unique.size).toBe(affixes.length);
		}
	});

	test("totalScore equals sum of slot scores", () => {
		const theme = getTheme("all_attack")!;
		const sets = enumerateCandidates(theme, 20, 10, 3);
		for (const s of sets) {
			const sum = s.slots.reduce((acc, sl) => acc + sl.score, 0);
			expect(s.totalScore).toBeCloseTo(sum, 2);
		}
	});

	test("sets are sorted by totalScore descending", () => {
		const theme = getTheme("all_attack")!;
		const sets = enumerateCandidates(theme, 20, 10, 5);
		for (let i = 1; i < sets.length; i++) {
			expect(sets[i - 1].totalScore).toBeGreaterThanOrEqual(
				sets[i].totalScore,
			);
		}
	});

	test("slot platforms match theme definition", () => {
		const theme = getTheme("attack_buff")!;
		const sets = enumerateCandidates(theme, 20, 10, 1);
		const s = sets[0];
		for (let i = 0; i < theme.slots.length; i++) {
			expect(s.slots[i].platform).toBe(theme.slots[i].platform);
		}
	});

	test("respects maxSets limit", () => {
		const theme = getTheme("all_defense")!;
		const sets = enumerateCandidates(theme, 20, 10, 2);
		expect(sets.length).toBeLessThanOrEqual(2);
	});
});
