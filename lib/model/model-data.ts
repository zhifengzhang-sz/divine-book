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

/**
 * Build a book model for a platform with chosen operator affixes.
 *
 * @param platformBook - Main book name (determines skill + primary affix)
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
	const affixes: AffixModel[] = [];

	// Platform skill
	const skill = getSkillModel(platformBook);
	if (skill) affixes.push(skill);

	// Platform primary affix
	const primary = getPrimaryAffixModel(platformBook);
	if (primary) affixes.push(primary);

	// Operator affixes
	const op1 = getAffixModel(op1Affix);
	if (op1) affixes.push(op1);

	const op2 = getAffixModel(op2Affix);
	if (op2) affixes.push(op2);

	return combineAffixes(platformBook, slot, affixes);
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
	const affixes: AffixModel[] = [];

	const skill = getSkillModel(platformBook);
	if (skill) affixes.push(skill);

	const primary = getPrimaryAffixModel(platformBook);
	if (primary) affixes.push(primary);

	const op1 = getAffixModel(op1Affix);
	if (op1) affixes.push(op1);

	const op2 = getAffixModel(op2Affix);
	if (op2) affixes.push(op2);

	return combineFactors(platformBook, affixes);
}

/**
 * Compute the distance between combo vector and platform baseline.
 * All factors normalized to percentage-point units before comparison.
 * D_res and M_synchro are stored as raw multipliers (×100 to get %).
 * Returns Euclidean norm of the delta vector.
 */
export function comboDistance(
	platformBook: string,
	op1Affix: string,
	op2Affix: string,
): number {
	const base = buildFactorVector(platformBook, "", "");
	const combo = buildFactorVector(platformBook, op1Affix, op2Affix);

	// Delta in consistent percentage-point units
	const deltas: number[] = [
		combo.D_base - base.D_base,
		combo.D_flat - base.D_flat,
		combo.S_coeff - base.S_coeff,
		combo.M_dmg - base.M_dmg,
		combo.M_skill - base.M_skill,
		combo.M_final - base.M_final,
		(combo.D_res - base.D_res) * 100, // ×100 to match % units
		(combo.sigma_R - base.sigma_R) * 100,
		(combo.M_synchro - base.M_synchro) * 100,
		combo.D_ortho - base.D_ortho,
		combo.H_A - base.H_A,
		combo.DR_A - base.DR_A,
		combo.S_A - base.S_A,
		combo.H_red - base.H_red,
	];

	return Math.sqrt(deltas.reduce((s, d) => s + d * d, 0));
}
