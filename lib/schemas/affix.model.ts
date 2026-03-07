/**
 * Affix Model Schema — validates Combinator 1 output.
 *
 * An affix factor vector is the aggregation of all effect-level factor
 * contributions within a single affix. Produced by Combinator 1 as
 * defined in combat.md §3.
 *
 * Not stored — computed on demand.
 */

import { z } from "zod";
import { TemporalSchema } from "./effect.model.js";

// ---------------------------------------------------------------------------
// Affix factor vector — aggregated from effect contributions
// ---------------------------------------------------------------------------

export const AffixModelSchema = z.object({
	/** Affix name for traceability */
	name: z.string(),

	/** Aggregated factors (additive sums, except sigma which is root-sum-of-squares) */
	D_base: z.number().default(0),
	D_flat: z.number().default(0),
	M_dmg: z.number().default(0),
	M_skill: z.number().default(0),
	M_final: z.number().default(0),
	S_coeff: z.number().default(0),
	D_res: z
		.number()
		.default(1)
		.describe("Resonance 灵力 damage (1 = no resonance)"),
	sigma_R: z
		.number()
		.default(0)
		.describe("Resonance variance (root-sum-of-squares)"),
	M_synchro: z
		.number()
		.default(1)
		.describe("Expected synchrony multiplier (1 = no synchrony)"),
	D_ortho: z.number().default(0),
	H_A: z.number().default(0),
	DR_A: z.number().default(0),
	S_A: z.number().default(0),
	H_red: z.number().default(0),

	/** Temporal effects collected for Combinator 3 */
	temporal: z
		.array(
			TemporalSchema.extend({
				/** Which factor this temporal effect modifies */
				factor: z.string(),
				/** The value contributed while active */
				value: z.number(),
			}),
		)
		.default([]),
});

export type AffixModel = z.infer<typeof AffixModelSchema>;
