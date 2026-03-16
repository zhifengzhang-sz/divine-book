import { describe, expect, test } from "bun:test";
import { buildHitEvents } from "./damage-chain.js";
import type { HandlerResult } from "./handlers/types.js";

describe("buildHitEvents", () => {
	test("basic damage chain with no zones", () => {
		const results: HandlerResult[] = [{ basePercent: 20265, hitsOverride: 6 }];
		const hits = buildHitEvents(results, 1000);
		expect(hits).toHaveLength(6);
		// perHitPercent = 20265 / 6 = 3377.5, / 100 * 1000 = 33775
		// All zones are 0 (additive) or 1 (multiplicative), so damage = 33775
		for (const hit of hits) {
			expect(hit.damage).toBeCloseTo(33775, 0);
			expect(hit.spDamage).toBe(0);
		}
	});

	test("damage chain with M_dmg zone", () => {
		const results: HandlerResult[] = [
			{ basePercent: 10000, hitsOverride: 1 },
			{ zones: { M_dmg: 0.5 } },
		];
		const hits = buildHitEvents(results, 1000);
		expect(hits).toHaveLength(1);
		// 10000 / 100 * 1000 * (1 + 0.5) = 100000 * 1.5 = 150000
		expect(hits[0].damage).toBeCloseTo(150000, 0);
	});

	test("multiple zones multiply", () => {
		const results: HandlerResult[] = [
			{ basePercent: 10000, hitsOverride: 1 },
			{ zones: { M_dmg: 0.5, M_skill: 1.0, M_final: 0.2 } },
		];
		const hits = buildHitEvents(results, 1000);
		// 100000 * 1.5 * 2.0 * 1.2 = 360000
		expect(hits[0].damage).toBeCloseTo(360000, 0);
	});

	test("M_synchro multiplies (probability_multiplier)", () => {
		const results: HandlerResult[] = [
			{ basePercent: 10000, hitsOverride: 1 },
			{ zones: { M_synchro: 4 } },
		];
		const hits = buildHitEvents(results, 1000);
		// 100000 * 4 = 400000
		expect(hits[0].damage).toBeCloseTo(400000, 0);
	});

	test("flat extra damage", () => {
		const results: HandlerResult[] = [
			{ basePercent: 10000, hitsOverride: 2 },
			{ flatExtra: 5000 },
		];
		const hits = buildHitEvents(results, 1000);
		// perHit = 10000/2/100*1000 = 50000
		// perHitFlat = 5000/2 = 2500
		// (50000 + 2500) * 1 * 1 * 1 * 1 = 52500
		expect(hits[0].damage).toBeCloseTo(52500, 0);
	});

	test("per-hit escalation (skill_bonus)", () => {
		const results: HandlerResult[] = [
			{ basePercent: 10000, hitsOverride: 3 },
			{
				perHitEscalation: (k) => ({ M_skill: k * 0.25 }),
			},
		];
		const hits = buildHitEvents(results, 1000);
		const perHit = 100000 / 3;
		// hit 0: perHit * (1+0) * (1+0) = perHit
		// hit 1: perHit * (1+0.25) = perHit * 1.25
		// hit 2: perHit * (1+0.50) = perHit * 1.50
		expect(hits[0].damage).toBeCloseTo(perHit, 0);
		expect(hits[1].damage).toBeCloseTo(perHit * 1.25, 0);
		expect(hits[2].damage).toBeCloseTo(perHit * 1.5, 0);
	});

	test("SP damage distributed across hits", () => {
		const results: HandlerResult[] = [
			{ basePercent: 10000, hitsOverride: 4 },
			{ spDamage: 2000 },
		];
		const hits = buildHitEvents(results, 1000);
		for (const hit of hits) {
			expect(hit.spDamage).toBeCloseTo(500, 0);
		}
	});

	test("per-hit effects attached to each hit", () => {
		const results: HandlerResult[] = [
			{ basePercent: 10000, hitsOverride: 2 },
			{
				perHitEffects: (_k) => [
					{ type: "HP_DAMAGE" as const, percent: 10, basis: "max" as const },
				],
			},
		];
		const hits = buildHitEvents(results, 1000);
		expect(hits[0].perHitEffects).toHaveLength(1);
		expect(hits[0].perHitEffects?.[0].type).toBe("HP_DAMAGE");
		expect(hits[1].perHitEffects).toHaveLength(1);
	});

	test("returns empty when no base_attack", () => {
		const results: HandlerResult[] = [{ zones: { M_dmg: 0.5 } }];
		const hits = buildHitEvents(results, 1000);
		expect(hits).toHaveLength(0);
	});

	test("throws on NaN damage", () => {
		const results: HandlerResult[] = [
			{ basePercent: Number.NaN, hitsOverride: 1 },
		];
		expect(() => buildHitEvents(results, 1000)).toThrow("Non-finite");
	});

	test("throws on Infinity damage", () => {
		const results: HandlerResult[] = [
			{ basePercent: 10000, hitsOverride: 1 },
			{ zones: { M_synchro: Number.POSITIVE_INFINITY } },
		];
		expect(() => buildHitEvents(results, 1000)).toThrow("Non-finite");
	});
});
