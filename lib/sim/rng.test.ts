import { describe, expect, test } from "bun:test";
import { SeededRNG } from "./rng.js";

describe("SeededRNG", () => {
	test("same seed produces same sequence", () => {
		const a = new SeededRNG(42);
		const b = new SeededRNG(42);
		for (let i = 0; i < 100; i++) {
			expect(a.next()).toBe(b.next());
		}
	});

	test("different seeds produce different sequences", () => {
		const a = new SeededRNG(1);
		const b = new SeededRNG(2);
		// At least one of the first 10 values should differ
		let allSame = true;
		for (let i = 0; i < 10; i++) {
			if (a.next() !== b.next()) allSame = false;
		}
		expect(allSame).toBe(false);
	});

	test("next() returns values in [0, 1)", () => {
		const rng = new SeededRNG(123);
		for (let i = 0; i < 1000; i++) {
			const v = rng.next();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	test("chance(0) always returns false", () => {
		const rng = new SeededRNG(42);
		for (let i = 0; i < 100; i++) {
			expect(rng.chance(0)).toBe(false);
		}
	});

	test("chance(1) always returns true", () => {
		const rng = new SeededRNG(42);
		for (let i = 0; i < 100; i++) {
			expect(rng.chance(1)).toBe(true);
		}
	});

	test("chance(0.5) produces roughly 50% true", () => {
		const rng = new SeededRNG(42);
		let trueCount = 0;
		const n = 10000;
		for (let i = 0; i < n; i++) {
			if (rng.chance(0.5)) trueCount++;
		}
		const ratio = trueCount / n;
		expect(ratio).toBeGreaterThan(0.45);
		expect(ratio).toBeLessThan(0.55);
	});

	test("weightedPick respects weights", () => {
		const rng = new SeededRNG(42);
		const tiers = [
			{ weight: 0.1, value: "rare" },
			{ weight: 0.3, value: "uncommon" },
			{ weight: 0.6, value: "common" },
		];
		const counts: Record<string, number> = { rare: 0, uncommon: 0, common: 0 };
		const n = 10000;
		for (let i = 0; i < n; i++) {
			counts[rng.weightedPick(tiers)]++;
		}
		// Allow 5% tolerance
		expect(counts.rare / n).toBeGreaterThan(0.05);
		expect(counts.rare / n).toBeLessThan(0.15);
		expect(counts.uncommon / n).toBeGreaterThan(0.25);
		expect(counts.uncommon / n).toBeLessThan(0.35);
		expect(counts.common / n).toBeGreaterThan(0.55);
		expect(counts.common / n).toBeLessThan(0.65);
	});

	test("seed 0 works", () => {
		const rng = new SeededRNG(0);
		const v = rng.next();
		expect(v).toBeGreaterThanOrEqual(0);
		expect(v).toBeLessThan(1);
	});

	test("large seed works", () => {
		const rng = new SeededRNG(2147483647); // MAX_INT32
		const v = rng.next();
		expect(v).toBeGreaterThanOrEqual(0);
		expect(v).toBeLessThan(1);
	});
});
