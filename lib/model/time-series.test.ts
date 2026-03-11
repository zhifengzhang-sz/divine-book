import { describe, test, expect } from "bun:test";
import {
	evaluateBook,
	evaluateBookSet,
	collectTemporalEvents,
	collectModifiers,
	collectSummon,
	collectStaticBaseline,
	resolveModifiers,
	sampleTimeSeries,
	aggregateTimeSeries,
} from "./time-series.js";
import type { BookSlot } from "./time-series.js";

// ---------------------------------------------------------------------------
// evaluateBook
// ---------------------------------------------------------------------------

describe("evaluateBook", () => {
	test("returns valid result structure", () => {
		const r = evaluateBook("千锋聚灵剑", "", "");
		expect(r.platform).toBe("千锋聚灵剑");
		expect(r.T_active).toBeGreaterThan(0);
		expect(r.samples.length).toBe(r.T_active);
		expect(r.permanent).toBeDefined();
		expect(r.averaged).toBeDefined();
		expect(r.total).toBeDefined();
		expect(r.peak).toBeDefined();
	});

	test("春黎剑阵 has summon", () => {
		const r = evaluateBook("春黎剑阵", "", "");
		expect(r.summon).not.toBeNull();
		expect(r.summon!.multiplier).toBeCloseTo(1.62, 1);
		expect(r.summon!.duration).toBe(16);
	});

	test("千锋聚灵剑 has no summon", () => {
		const r = evaluateBook("千锋聚灵剑", "", "");
		expect(r.summon).toBeNull();
	});

	test("permanent baseline is consistent across samples", () => {
		const r = evaluateBook("千锋聚灵剑", "", "");
		// D_base should be the same in all samples (no temporal D_base variation)
		const dBase = r.samples[0].factors.D_base;
		for (const s of r.samples) {
			expect(s.factors.D_base).toBe(dBase);
		}
	});

	test("operators change the factor vector", () => {
		const without = evaluateBook("千锋聚灵剑", "", "");
		const with_ops = evaluateBook("千锋聚灵剑", "摧山", "斩岳");
		// D_flat should increase with 斩岳
		expect(with_ops.permanent.D_flat).toBeGreaterThan(without.permanent.D_flat);
	});
});

// ---------------------------------------------------------------------------
// Modifier resolution
// ---------------------------------------------------------------------------

describe("modifier resolution", () => {
	test("buff_strength scales temporal event values", () => {
		const events = [
			{ t_start: 0, duration: 10, factor: "S_coeff", value: 100, source_type: "self_buff" },
		];
		const modifiers = [
			{ kind: "strength" as const, value: 50, targets: ["self_buff"] },
		];
		const resolved = resolveModifiers(events, modifiers);
		expect(resolved[0].value).toBe(150); // 100 × (1 + 50/100)
	});

	test("buff_duration extends temporal event duration", () => {
		const events = [
			{ t_start: 0, duration: 10, factor: "S_coeff", value: 100, source_type: "self_buff" },
		];
		const modifiers = [
			{ kind: "duration" as const, value: 100, targets: ["self_buff"] },
		];
		const resolved = resolveModifiers(events, modifiers);
		expect(resolved[0].duration).toBe(20); // 10 × (1 + 100/100)
	});

	test("all_state_duration applies to all events", () => {
		const events = [
			{ t_start: 0, duration: 10, factor: "S_coeff", value: 50, source_type: "self_buff" },
			{ t_start: 0, duration: 8, factor: "H_red", value: 30, source_type: "debuff" },
		];
		const modifiers = [
			{ kind: "duration" as const, value: 50, targets: [] }, // empty = all
		];
		const resolved = resolveModifiers(events, modifiers);
		expect(resolved[0].duration).toBe(15); // 10 × 1.5
		expect(resolved[1].duration).toBe(12); // 8 × 1.5
	});
});

// ---------------------------------------------------------------------------
// evaluateBookSet
// ---------------------------------------------------------------------------

describe("evaluateBookSet", () => {
	const books: BookSlot[] = [
		{ slot: 1, platform: "甲元仙符", op1: "", op2: "" },
		{ slot: 2, platform: "春黎剑阵", op1: "", op2: "" },
		{ slot: 3, platform: "千锋聚灵剑", op1: "", op2: "" },
	];

	test("returns valid result structure", () => {
		const r = evaluateBookSet(books, 4);
		expect(r.books.length).toBe(3);
		expect(r.perBook.length).toBe(3);
		expect(r.T_active).toBeGreaterThan(0);
		expect(r.samples.length).toBe(r.T_active);
	});

	test("books are sorted by slot", () => {
		const reversed: BookSlot[] = [
			{ slot: 3, platform: "千锋聚灵剑", op1: "", op2: "" },
			{ slot: 1, platform: "甲元仙符", op1: "", op2: "" },
			{ slot: 2, platform: "春黎剑阵", op1: "", op2: "" },
		];
		const r = evaluateBookSet(reversed, 4);
		expect(r.books[0].slot).toBe(1);
		expect(r.books[1].slot).toBe(2);
		expect(r.books[2].slot).toBe(3);
	});

	test("permanent baseline sums across books", () => {
		const r = evaluateBookSet(books, 4);

		// Sum individual permanent D_base values
		const sumDBase = r.perBook.reduce((s, b) => s + b.permanent.D_base, 0);
		expect(r.permanent.D_base).toBeCloseTo(sumDBase, 0);
	});

	test("T_active extends beyond last slot", () => {
		const r = evaluateBookSet(books, 4);
		// Last slot fires at t=8 (slot 3), plus at least T_gap
		expect(r.T_active).toBeGreaterThanOrEqual(12);
	});

	test("summon from 春黎剑阵 is offset by slot fire time", () => {
		const r = evaluateBookSet(books, 4);
		// 春黎剑阵 is slot 2, fires at t=4
		// At t=0 (before slot 2 fires), D_base should not have summon boost
		// At t=4 (when slot 2 fires), D_base should be higher due to summon
		const d_at_0 = r.samples[0].factors.D_base;
		const d_at_4 = r.samples[4].factors.D_base;
		expect(d_at_4).toBeGreaterThan(d_at_0);
	});

	test("single book set equals individual book evaluation", () => {
		const singleBook: BookSlot[] = [
			{ slot: 1, platform: "千锋聚灵剑", op1: "摧山", op2: "斩岳" },
		];
		const set = evaluateBookSet(singleBook, 4);
		const individual = evaluateBook("千锋聚灵剑", "摧山", "斩岳", 4);

		expect(set.permanent.D_base).toBeCloseTo(individual.permanent.D_base, 0);
		expect(set.permanent.D_flat).toBeCloseTo(individual.permanent.D_flat, 0);
	});
});
