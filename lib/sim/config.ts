/**
 * Configuration loading and validation — implements design §10.
 *
 * Loads player configs from JSON, validates book/affix references
 * against YAML data, selects effect tiers based on progression.
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { BookData, EffectRow } from "../data/types.js";
import type { ArenaConfig, PlayerConfig, ProgressionConfig } from "./types.js";

// ── YAML Loading ────────────────────────────────────────────────────

export interface BooksYaml {
	books: Record<string, BookData>;
}

export interface AffixesYaml {
	universal: Record<string, { effects: EffectRow[] }>;
	school: Record<string, Record<string, { effects: EffectRow[] }>>;
}

export function loadBooksYaml(path = "data/yaml/books.yaml"): BooksYaml {
	const raw = readFileSync(path, "utf-8");
	return parseYaml(raw) as BooksYaml;
}

export function loadAffixesYaml(path = "data/yaml/affixes.yaml"): AffixesYaml {
	const raw = readFileSync(path, "utf-8");
	return parseYaml(raw) as AffixesYaml;
}

// ── Config Loading ──────────────────────────────────────────────────

export function loadConfig(path: string): ArenaConfig {
	const raw = readFileSync(path, "utf-8");
	return JSON.parse(raw) as ArenaConfig;
}

// ── Validation ──────────────────────────────────────────────────────

export class ConfigValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigValidationError";
	}
}

export function validatePlayerConfig(
	config: PlayerConfig,
	books: BooksYaml,
	affixes: AffixesYaml,
): void {
	const { entity, progression } = config;

	// Validate entity stats are positive
	for (const [key, val] of Object.entries(entity)) {
		if (typeof val !== "number" || val < 0) {
			throw new ConfigValidationError(
				`entity.${key} must be a non-negative number, got ${val}`,
			);
		}
	}

	// Validate book slots
	const platforms = new Set<string>();
	for (const slot of config.books) {
		// Platform exists
		if (!books.books[slot.platform]) {
			throw new ConfigValidationError(
				`Book "${slot.platform}" not found in books.yaml`,
			);
		}

		// 核心冲突: no duplicate platforms
		if (platforms.has(slot.platform)) {
			throw new ConfigValidationError(
				`Duplicate platform "${slot.platform}" — 核心冲突 rule`,
			);
		}
		platforms.add(slot.platform);

		// Validate affixes exist
		if (slot.op1) validateAffixExists(slot.op1, slot.platform, books, affixes);
		if (slot.op2) validateAffixExists(slot.op2, slot.platform, books, affixes);

		// At least one usable tier
		const bookData = books.books[slot.platform];
		if (bookData.skill) {
			const usable = selectTiers(bookData.skill, progression);
			if (usable.length === 0) {
				throw new ConfigValidationError(
					`Book "${slot.platform}" has no usable skill tiers at enlightenment=${progression.enlightenment}, fusion=${progression.fusion}`,
				);
			}
		}
	}
}

function validateAffixExists(
	affixName: string,
	platform: string,
	books: BooksYaml,
	affixes: AffixesYaml,
): void {
	// Check exclusive affix of the source book
	for (const book of Object.values(books.books)) {
		if (book.exclusive_affix?.name === affixName) return;
		if (book.primary_affix?.name === affixName) return;
	}

	// Check universal affixes
	if (affixes.universal[affixName]) return;

	// Check school affixes
	for (const school of Object.values(affixes.school)) {
		if (school[affixName]) return;
	}

	throw new ConfigValidationError(
		`Affix "${affixName}" on slot "${platform}" not found in books.yaml or affixes.yaml`,
	);
}

// ── Tier Selection (design §10.4) ───────────────────────────────────

/**
 * Parse a data_state field into progression requirements.
 *
 * data_state can be:
 *   - a string: "enlightenment=10"
 *   - an array: ["enlightenment=10", "fusion=51"]
 *   - undefined (no requirements)
 */
function parseDataState(dataState: unknown): {
	locked: boolean;
	enlightenment?: number;
	fusion?: number;
} {
	if (!dataState) return { locked: false };
	// "locked" means the tier is unavailable regardless of progression
	if (dataState === "locked") return { locked: true };
	const entries = Array.isArray(dataState) ? dataState : [dataState];
	const result: { locked: boolean; enlightenment?: number; fusion?: number } = {
		locked: false,
	};
	for (const entry of entries) {
		if (typeof entry !== "string") continue;
		if (entry === "locked") return { locked: true };
		const [key, val] = entry.split("=");
		if (key === "enlightenment") result.enlightenment = Number(val);
		if (key === "fusion") result.fusion = Number(val);
	}
	return result;
}

/**
 * Check if a progression config meets the requirements of a data_state.
 */
function meetsRequirements(
	req: { locked: boolean; enlightenment?: number; fusion?: number },
	prog: ProgressionConfig,
): boolean {
	if (req.locked) return false;
	if (req.enlightenment !== undefined && prog.enlightenment < req.enlightenment)
		return false;
	if (req.fusion !== undefined && prog.fusion < req.fusion) return false;
	return true;
}

/**
 * From an array of effect rows (potentially multiple tiers),
 * select those whose data_state requirements are met.
 * Returns the highest tier per effect type.
 */
export function selectTiers(
	effects: EffectRow[],
	progression: ProgressionConfig,
): EffectRow[] {
	// Group by type — effects of the same type are different tiers
	const byType = new Map<string, EffectRow[]>();
	for (const effect of effects) {
		const group = byType.get(effect.type) ?? [];
		group.push(effect);
		byType.set(effect.type, group);
	}

	const selected: EffectRow[] = [];
	for (const [, tiers] of byType) {
		// Filter to usable tiers, then pick the highest (last matching)
		const usable = tiers.filter((t) =>
			meetsRequirements(parseDataState(t.data_state), progression),
		);
		if (usable.length > 0) {
			selected.push(usable[usable.length - 1]);
		}
	}
	return selected;
}
