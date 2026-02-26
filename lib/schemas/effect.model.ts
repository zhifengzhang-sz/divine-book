/**
 * Effect Model Schema — validates effect-level factor contributions.
 *
 * Each entry in model.yaml maps a single effect to its factor contributions
 * in the model parameter space. This is the output of the Map operation
 * defined in combat.md §2.
 *
 * Stored artifact: data/yaml/model.yaml
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Temporal metadata — how an effect propagates across skill slots
// ---------------------------------------------------------------------------

export const CoverageTypeEnum = z.enum([
	"duration_based",
	"next_skill",
	"permanent",
	"reactive",
]);

export const TemporalSchema = z.object({
	duration: z.number().describe("unit:seconds"),
	coverage_type: CoverageTypeEnum,
});

export type Temporal = z.infer<typeof TemporalSchema>;

// ---------------------------------------------------------------------------
// Factor contribution — which model factors an effect feeds
// ---------------------------------------------------------------------------

export const FactorsSchema = z
	.object({
		D_base: z.number().describe("Base damage contribution").optional(),
		D_flat: z.number().describe("Flat extra damage").optional(),
		M_dmg: z.number().describe("Damage zone multiplier").optional(),
		M_skill: z.number().describe("Skill zone multiplier").optional(),
		M_final: z.number().describe("Final zone multiplier").optional(),
		S_coeff: z.number().describe("ATK scaling coefficient").optional(),
		C_mult: z.number().describe("Crit multiplier (expected value)").optional(),
		sigma_C: z.number().describe("Crit variance").optional(),
		D_ortho: z.number().describe("Orthogonal damage").optional(),
		H_A: z.number().describe("Healing rate").optional(),
		DR_A: z.number().describe("Damage reduction").optional(),
		S_A: z.number().describe("Shield strength").optional(),
		H_red: z.number().describe("Healing reduction on opponent").optional(),
	})
	.refine((f) => Object.keys(f).length > 0, {
		message: "Factor contribution must have at least one non-empty factor",
	});

export type Factors = z.infer<typeof FactorsSchema>;

// ---------------------------------------------------------------------------
// Effect model entry — one per effect in model.yaml
// ---------------------------------------------------------------------------

export const EffectModelSchema = z.object({
	type: z.string().describe("Original effect type for traceability"),
	factors: FactorsSchema.optional(),
	temporal: TemporalSchema.optional(),
});

export type EffectModel = z.infer<typeof EffectModelSchema>;

// ---------------------------------------------------------------------------
// model.yaml top-level structure — mirrors effects.yaml organization
// ---------------------------------------------------------------------------

const AffixEffectsSchema = z.record(z.string(), z.array(EffectModelSchema));

const BookModelDataSchema = z.object({
	skill: z.array(EffectModelSchema).optional(),
	primary_affix: AffixEffectsSchema.optional(),
	exclusive_affix: AffixEffectsSchema.optional(),
});

export const ModelYamlSchema = z.object({
	effects: z.record(z.string(), BookModelDataSchema),
	universal_affixes: z.record(z.string(), z.array(EffectModelSchema)),
	school_affixes: z.record(
		z.string(),
		z.record(z.string(), z.array(EffectModelSchema)),
	),
});

export type ModelYaml = z.infer<typeof ModelYamlSchema>;
