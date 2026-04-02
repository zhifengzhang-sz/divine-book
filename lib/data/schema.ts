/**
 * Zod schema for data/raw/game.data.json — the structured source of truth.
 *
 * Validates the top-level shape (version, books, affixes) without
 * re-validating individual effects — that's handled by parseEffect()
 * in parser/schema/effects.ts during YAML loading.
 */

import { readFileSync } from "node:fs";
import { z } from "zod";

// ── Effect schema (structural, not semantic) ───────────────────────

const DataStateSchema = z.union([
	z.string(),
	z.array(z.string()),
]);

const EffectSchema = z
	.object({
		type: z.string(),
		data_state: DataStateSchema.optional(),
	})
	.passthrough();

// ── Book schema ────────────────────────────────────────────────────

const SkillSectionSchema = z.object({
	text: z.string(),
	effects: z.array(EffectSchema),
});

const AffixSectionSchema = z.object({
	name: z.string(),
	text: z.string(),
	effects: z.array(EffectSchema),
});

const BookEntrySchema = z.object({
	school: z.string(),
	skill: SkillSectionSchema,
	primaryAffix: AffixSectionSchema.optional(),
	exclusiveAffix: AffixSectionSchema.optional(),
});

// ── Affix collections ──────────────────────────────────────────────

const AffixCollectionSchema = z.record(
	z.string(),
	z.object({ effects: z.array(EffectSchema) }),
);

const AffixesSchema = z.object({
	universal: AffixCollectionSchema,
	school: z.record(z.string(), AffixCollectionSchema),
});

// ── Top-level ──────────────────────────────────────────────────────

export const GameDataSchema = z.object({
	version: z.number(),
	books: z.record(z.string(), BookEntrySchema),
	affixes: AffixesSchema.optional(),
});

export type GameData = z.infer<typeof GameDataSchema>;

export function parseGameData(raw: unknown): GameData {
	return GameDataSchema.parse(raw);
}

export function loadGameData(path = "data/raw/game.data.json"): GameData {
	const raw = JSON.parse(readFileSync(path, "utf-8"));
	return parseGameData(raw);
}
