/**
 * SeededRNG — Mulberry32 PRNG.
 *
 * Fast, deterministic, 32-bit seed. Same seed = same sequence.
 * Used for all stochastic effects: probability_multiplier, chance triggers, etc.
 */

import type { SeededRNGInterface } from "./types.js";

export class SeededRNG implements SeededRNGInterface {
	private state: number;

	constructor(seed: number) {
		this.state = seed | 0;
	}

	/** Returns a uniform random number in [0, 1). */
	next(): number {
		this.state = (this.state + 0x6d2b79f5) | 0;
		let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Returns true with probability p ∈ [0, 1]. */
	chance(p: number): boolean {
		return this.next() < p;
	}

	/** Pick from weighted tiers. Weights should sum to ~1. */
	weightedPick<T>(tiers: { weight: number; value: T }[]): T {
		const roll = this.next();
		let cumulative = 0;
		for (const tier of tiers) {
			cumulative += tier.weight;
			if (roll < cumulative) return tier.value;
		}
		return tiers[tiers.length - 1].value;
	}
}
