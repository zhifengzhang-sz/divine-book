/**
 * Model data loader — reads model.yaml and provides affix/book lookups.
 *
 * Bridges model.yaml (stored) to Combinators 1–2 (computed).
 */

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { combineEffects, combineAffixes, combineFactors } from "./combinators.js";
import type { EffectEntry } from "./combinators.js";
import type { AffixModel } from "../schemas/affix.model.js";
import type { BookModel } from "../schemas/book.model.js";

// ---------------------------------------------------------------------------
// Load model.yaml
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "../..");
const modelPath = join(ROOT, "data/yaml/model.yaml");

let _model: any = null;

function getModel(): any {
	if (!_model) {
		_model = parseYaml(readFileSync(modelPath, "utf-8"));
	}
	return _model;
}

// ---------------------------------------------------------------------------
// Affix lookups — Combinator 1
// ---------------------------------------------------------------------------

/** Get the affix factor vector for a book's skill effects */
export function getSkillModel(bookName: string): AffixModel | null {
	const model = getModel();
	const book = model.effects?.[bookName];
	if (!book?.skill) return null;
	return combineEffects(`${bookName}:skill`, book.skill as EffectEntry[]);
}

/** Get the affix factor vector for a book's primary affix */
export function getPrimaryAffixModel(bookName: string): AffixModel | null {
	const model = getModel();
	const book = model.effects?.[bookName];
	if (!book?.primary_affix) return null;
	const [name, effects] = Object.entries(book.primary_affix)[0] as [
		string,
		EffectEntry[],
	];
	return combineEffects(name, effects);
}

/** Get the affix factor vector for a book's exclusive affix */
export function getExclusiveAffixModel(bookName: string): AffixModel | null {
	const model = getModel();
	const book = model.effects?.[bookName];
	if (!book?.exclusive_affix) return null;
	const [name, effects] = Object.entries(book.exclusive_affix)[0] as [
		string,
		EffectEntry[],
	];
	return combineEffects(name, effects);
}

/** Get the affix factor vector for a universal affix */
export function getUniversalAffixModel(
	affixName: string,
): AffixModel | null {
	const model = getModel();
	const effects = model.universal_affixes?.[affixName];
	if (!effects) return null;
	return combineEffects(affixName, effects as EffectEntry[]);
}

/** Get the affix factor vector for a school affix */
export function getSchoolAffixModel(
	school: string,
	affixName: string,
): AffixModel | null {
	const model = getModel();
	const effects = model.school_affixes?.[school]?.[affixName];
	if (!effects) return null;
	return combineEffects(affixName, effects as EffectEntry[]);
}

/** Get any affix model by name (searches all pools) */
export function getAffixModel(affixName: string): AffixModel | null {
	const model = getModel();

	// Check universal
	if (model.universal_affixes?.[affixName]) {
		return getUniversalAffixModel(affixName);
	}

	// Check school
	for (const [school, affixes] of Object.entries(
		model.school_affixes ?? {},
	)) {
		if ((affixes as any)[affixName]) {
			return getSchoolAffixModel(school, affixName);
		}
	}

	// Check book primary/exclusive
	for (const [bookName, book] of Object.entries(model.effects ?? {})) {
		const b = book as any;
		if (b.primary_affix) {
			const name = Object.keys(b.primary_affix)[0];
			if (name === affixName) return getPrimaryAffixModel(bookName);
		}
		if (b.exclusive_affix) {
			const name = Object.keys(b.exclusive_affix)[0];
			if (name === affixName) return getExclusiveAffixModel(bookName);
		}
	}

	return null;
}

// ---------------------------------------------------------------------------
// Book model — Combinator 2
// ---------------------------------------------------------------------------

/** Collect all affix models for a platform + two operators */
function collectAffixModels(
	platformBook: string,
	op1Affix: string,
	op2Affix: string,
): AffixModel[] {
	const affixes: AffixModel[] = [];

	const skill = getSkillModel(platformBook);
	if (skill) affixes.push(skill);

	const primary = getPrimaryAffixModel(platformBook);
	if (primary) affixes.push(primary);

	const exclusive = getExclusiveAffixModel(platformBook);
	if (exclusive) affixes.push(exclusive);

	const op1 = getAffixModel(op1Affix);
	if (op1) affixes.push(op1);

	const op2 = getAffixModel(op2Affix);
	if (op2) affixes.push(op2);

	return affixes;
}

/**
 * Build a book model for a platform with chosen operator affixes.
 *
 * @param platformBook - Main book name (determines skill + primary + exclusive affix)
 * @param op1Affix - First auxiliary affix name
 * @param op2Affix - Second auxiliary affix name
 * @param slot - Slot position (1–6)
 */
export function buildBookModel(
	platformBook: string,
	op1Affix: string,
	op2Affix: string,
	slot: number,
): BookModel {
	return combineAffixes(platformBook, slot, collectAffixModels(platformBook, op1Affix, op2Affix));
}

/**
 * Build the combined factor vector for a platform + two operators.
 * Returns the AffixModel before damage chain evaluation.
 */
export function buildFactorVector(
	platformBook: string,
	op1Affix: string,
	op2Affix: string,
): AffixModel {
	return combineFactors(platformBook, collectAffixModels(platformBook, op1Affix, op2Affix));
}

/** All factor keys with their normalization multipliers */
const FACTOR_ENTRIES: { key: keyof AffixModel; scale: number }[] = [
	{ key: "D_base", scale: 1 },
	{ key: "D_flat", scale: 1 },
	{ key: "S_coeff", scale: 1 },
	{ key: "M_dmg", scale: 1 },
	{ key: "M_skill", scale: 1 },
	{ key: "M_final", scale: 1 },
	{ key: "D_res", scale: 100 },      // multiplier → %
	{ key: "sigma_R", scale: 100 },
	{ key: "M_synchro", scale: 100 },   // multiplier → %
	{ key: "D_ortho", scale: 1 },
	{ key: "H_A", scale: 1 },
	{ key: "DR_A", scale: 1 },
	{ key: "S_A", scale: 1 },
	{ key: "H_red", scale: 1 },
];

/**
 * Compute the distance between combo vector and platform baseline.
 * All factors normalized to percentage-point units before comparison.
 *
 * @param relevantFactors - If provided, only these factor dimensions
 *   are included in the distance calculation. Used for function-specific
 *   scoring (e.g., F_burst only cares about offense dimensions).
 */
export function comboDistance(
	platformBook: string,
	op1Affix: string,
	op2Affix: string,
	relevantFactors?: string[],
): number {
	const base = buildFactorVector(platformBook, "", "");
	const combo = buildFactorVector(platformBook, op1Affix, op2Affix);

	const entries = relevantFactors
		? FACTOR_ENTRIES.filter((e) => relevantFactors.includes(e.key as string))
		: FACTOR_ENTRIES;

	let sum = 0;
	for (const { key, scale } of entries) {
		const d = ((combo[key] as number) - (base[key] as number)) * scale;
		sum += d * d;
	}

	return Math.sqrt(sum);
}
