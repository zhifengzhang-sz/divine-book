/**
 * Book Model Schema — validates Combinator 2 output.
 *
 * A book factor vector combines the primary, exclusive, and universal
 * affix vectors. The multiplicative damage chain is evaluated at this
 * level, collapsing offensive factors into D_skill. Produced by
 * Combinator 2 as defined in combat.md §4.
 *
 * Not stored — computed on demand.
 */

import { z } from "zod";
import { TemporalSchema } from "./effect.model.js";

// ---------------------------------------------------------------------------
// Book factor vector — after damage chain evaluation
// ---------------------------------------------------------------------------

export const BookModelSchema = z.object({
	/** Book name for traceability */
	name: z.string(),

	/** Slot position (1–6) in the book set */
	slot: z.number().int().min(1).max(6),

	/**
	 * Evaluated multiplicative damage chain:
	 * D_skill = (D_base × S_coeff + D_flat) × (1+M_dmg) × (1+M_skill) × (1+M_final) × C_mult
	 */
	D_skill: z.number(),

	/** Orthogonal damage (additive: %maxHP + lost-HP + DoT) */
	D_ortho: z.number().default(0),

	/** Healing rate */
	H_A: z.number().default(0),

	/** Damage reduction (fraction) */
	DR_A: z.number().default(0),

	/** Shield strength */
	S_A: z.number().default(0),

	/** Healing reduction applied to opponent */
	H_red: z.number().default(0),

	/** Volatility from crit system */
	sigma: z.number().default(0),

	/** Temporal effects propagating to later slots */
	temporal: z
		.array(
			TemporalSchema.extend({
				factor: z.string(),
				value: z.number(),
			}),
		)
		.default([]),
});

export type BookModel = z.infer<typeof BookModelSchema>;
