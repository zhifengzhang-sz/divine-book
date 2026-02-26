/**
 * Book-Set Model Schema — validates Combinator 3 output.
 *
 * A book-set model is the final regime parameter sequence produced by
 * temporal composition across 6 ordered skill slots. Produced by
 * Combinator 3 as defined in combat.md §5.
 *
 * Not stored — computed on demand. Feeds directly into:
 * - Route 1 (Embedding): regime vectors as model-space representation
 * - Route 2 (Simulation): regime sequence for theory.combat.scenario.md
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Single regime — constant parameters within a time interval
// ---------------------------------------------------------------------------

export const RegimeSchema = z.object({
	/** Regime start time (seconds from combat start) */
	t_start: z.number().min(0),

	/** Regime end time (seconds) */
	t_end: z.number().positive(),

	/** Drift of entity A's HP (positive = gaining, negative = losing) */
	mu_A: z.number(),

	/** Volatility of entity A's HP process */
	sigma_A: z.number().min(0),

	/** Drift of entity B's HP (positive = gaining, negative = losing) */
	mu_B: z.number(),

	/** Volatility of entity B's HP process */
	sigma_B: z.number().min(0),
});

export type Regime = z.infer<typeof RegimeSchema>;

// ---------------------------------------------------------------------------
// Book-set model — ordered sequence of regimes
// ---------------------------------------------------------------------------

export const BookSetModelSchema = z.object({
	/** Ordered regime sequence covering the full combat duration */
	regimes: z.array(RegimeSchema).min(1),

	/** Total combat duration (seconds) — sum of all regime intervals */
	duration: z.number().positive(),

	/** Number of regimes (≥ 6, more if mid-slot boundary events occur) */
	regime_count: z.number().int().positive(),
});

export type BookSetModel = z.infer<typeof BookSetModelSchema>;
