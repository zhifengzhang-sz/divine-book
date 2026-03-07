/**
 * Combinators 1–2: model.yaml → affix vectors → book vectors.
 *
 * Combinator 1: Aggregate effect-level factor contributions within an affix.
 * Combinator 2: Combine affix vectors for a book, evaluate the damage chain.
 *
 * Spec: docs/model/impl.combat.md §3–§4
 */

import type { AffixModel } from "../schemas/affix.model.js";
import type { BookModel } from "../schemas/book.model.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single effect entry from model.yaml */
export interface EffectEntry {
	type: string;
	factors?: Record<string, number>;
	temporal?: { duration: number; coverage_type: string };
}

// ---------------------------------------------------------------------------
// Combinator 1: Effects → Affix
// ---------------------------------------------------------------------------

/**
 * Aggregate effect-level factor contributions into an affix factor vector.
 *
 * Rules (impl.combat.md §3.2):
 * - Additive factors: D_base, D_flat, M_dmg, M_skill, M_final, S_coeff,
 *   D_ortho, H_A, DR_A, S_A, H_red → sum
 * - Resonance: D_res → product (multiple resonance sources multiply)
 * - Synchrony: M_synchro → already aggregated at map time
 * - Variance: sigma_R → root-sum-of-squares
 * - Temporal: collected for Combinator 3
 */
export function combineEffects(
	name: string,
	effects: EffectEntry[],
): AffixModel {
	const agg: AffixModel = {
		name,
		D_base: 0,
		D_flat: 0,
		M_dmg: 0,
		M_skill: 0,
		M_final: 0,
		S_coeff: 0,
		D_res: 1,
		sigma_R: 0,
		M_synchro: 1,
		D_ortho: 0,
		H_A: 0,
		DR_A: 0,
		S_A: 0,
		H_red: 0,
		temporal: [],
	};

	const sigmaSquared: number[] = [];

	for (const e of effects) {
		const f = e.factors;
		if (!f) continue;

		// Additive factors
		if (f.D_base) agg.D_base += f.D_base;
		if (f.D_flat) agg.D_flat += f.D_flat;
		if (f.M_dmg) agg.M_dmg += f.M_dmg;
		if (f.M_skill) agg.M_skill += f.M_skill;
		if (f.M_final) agg.M_final += f.M_final;
		if (f.S_coeff) agg.S_coeff += f.S_coeff;
		if (f.D_ortho) agg.D_ortho += f.D_ortho;
		if (f.H_A) agg.H_A += f.H_A;
		if (f.DR_A) agg.DR_A += f.DR_A;
		if (f.S_A) agg.S_A += f.S_A;
		if (f.H_red) agg.H_red += f.H_red;

		// Resonance 灵力 damage: multiply (multiple sources are independent)
		if (f.D_res) agg.D_res *= f.D_res;

		// Synchrony: already a single expected value from map.ts aggregation
		if (f.M_synchro) agg.M_synchro = f.M_synchro;

		// Variance: collect for root-sum-of-squares
		if (f.sigma_R) sigmaSquared.push(f.sigma_R ** 2);

		// Temporal: collect entries with factor + value for Combinator 3
		if (e.temporal) {
			for (const [fk, fv] of Object.entries(f)) {
				if (fk === "sigma_R" || fk === "D_res" || fk === "M_synchro")
					continue;
				agg.temporal.push({
					duration: e.temporal.duration,
					coverage_type: e.temporal.coverage_type as any,
					factor: fk,
					value: fv,
				});
			}
		}
	}

	// Root-sum-of-squares for sigma
	if (sigmaSquared.length > 0) {
		agg.sigma_R = Math.sqrt(
			sigmaSquared.reduce((a, b) => a + b, 0),
		);
	}

	return agg;
}

// ---------------------------------------------------------------------------
// Factor aggregation: Affixes → combined vector (no chain evaluation)
// ---------------------------------------------------------------------------

/**
 * Combine multiple affix vectors into a single factor vector.
 * Same aggregation rules as Combinator 2, but stops before
 * evaluating the damage chain — returns the raw AffixModel.
 */
export function combineFactors(
	name: string,
	affixes: AffixModel[],
): AffixModel {
	const combined: AffixModel = {
		name,
		D_base: 0,
		D_flat: 0,
		M_dmg: 0,
		M_skill: 0,
		M_final: 0,
		S_coeff: 0,
		D_res: 1,
		sigma_R: 0,
		M_synchro: 1,
		D_ortho: 0,
		H_A: 0,
		DR_A: 0,
		S_A: 0,
		H_red: 0,
		temporal: [],
	};

	const sigmaSquared: number[] = [];

	for (const a of affixes) {
		combined.D_base += a.D_base;
		combined.D_flat += a.D_flat;
		combined.M_dmg += a.M_dmg;
		combined.M_skill += a.M_skill;
		combined.M_final += a.M_final;
		combined.S_coeff += a.S_coeff;
		combined.D_ortho += a.D_ortho;
		combined.H_A += a.H_A;
		combined.DR_A += a.DR_A;
		combined.S_A += a.S_A;
		combined.H_red += a.H_red;

		combined.D_res *= a.D_res;

		if (a.M_synchro > combined.M_synchro) {
			combined.M_synchro = a.M_synchro;
		}

		if (a.sigma_R > 0) sigmaSquared.push(a.sigma_R ** 2);

		combined.temporal.push(...a.temporal);
	}

	if (sigmaSquared.length > 0) {
		combined.sigma_R = Math.sqrt(
			sigmaSquared.reduce((a, b) => a + b, 0),
		);
	}

	return combined;
}

// ---------------------------------------------------------------------------
// Combinator 2: Affixes → Book
// ---------------------------------------------------------------------------

/**
 * Combine affix vectors and evaluate the multiplicative damage chain.
 *
 * 气血 chain: D_skill = (D_base × S_coeff + D_flat) × (1+M_dmg/100) × (1+M_skill/100) × (1+M_final/100) × M_synchro
 * 灵力 line:  D_res carried separately (parallel attack on 灵力, not part of 气血 chain)
 *
 * Note: M_dmg, M_skill, M_final are stored as percentage points (e.g., 40 = 40%).
 * S_coeff is stored as percentage points of ATK bonus (e.g., 55 = +55% ATK).
 * D_base is stored as %ATK (e.g., 20265 = 202.65× ATK).
 */
export function combineAffixes(
	name: string,
	slot: number,
	affixes: AffixModel[],
): BookModel {
	// Aggregate across affixes (same rules as Combinator 1)
	const combined: AffixModel = {
		name,
		D_base: 0,
		D_flat: 0,
		M_dmg: 0,
		M_skill: 0,
		M_final: 0,
		S_coeff: 0,
		D_res: 1,
		sigma_R: 0,
		M_synchro: 1,
		D_ortho: 0,
		H_A: 0,
		DR_A: 0,
		S_A: 0,
		H_red: 0,
		temporal: [],
	};

	const sigmaSquared: number[] = [];

	for (const a of affixes) {
		combined.D_base += a.D_base;
		combined.D_flat += a.D_flat;
		combined.M_dmg += a.M_dmg;
		combined.M_skill += a.M_skill;
		combined.M_final += a.M_final;
		combined.S_coeff += a.S_coeff;
		combined.D_ortho += a.D_ortho;
		combined.H_A += a.H_A;
		combined.DR_A += a.DR_A;
		combined.S_A += a.S_A;
		combined.H_red += a.H_red;

		// Resonance 灵力 damage: multiply across affixes
		combined.D_res *= a.D_res;

		// Synchrony: take max (only one source typically)
		if (a.M_synchro > combined.M_synchro) {
			combined.M_synchro = a.M_synchro;
		}

		if (a.sigma_R > 0) sigmaSquared.push(a.sigma_R ** 2);

		combined.temporal.push(...a.temporal);
	}

	if (sigmaSquared.length > 0) {
		combined.sigma_R = Math.sqrt(
			sigmaSquared.reduce((a, b) => a + b, 0),
		);
	}

	// Evaluate 气血 multiplicative damage chain (D_res NOT included — separate line)
	const D_skill =
		(combined.D_base * (1 + combined.S_coeff / 100) + combined.D_flat) *
		(1 + combined.M_dmg / 100) *
		(1 + combined.M_skill / 100) *
		(1 + combined.M_final / 100) *
		combined.M_synchro;

	return {
		name,
		slot,
		D_skill: Math.round(D_skill * 100) / 100,
		D_res: combined.D_res,
		D_ortho: combined.D_ortho,
		H_A: combined.H_A,
		DR_A: combined.DR_A,
		S_A: combined.S_A,
		H_red: combined.H_red,
		sigma: combined.sigma_R,
		temporal: combined.temporal,
	};
}
