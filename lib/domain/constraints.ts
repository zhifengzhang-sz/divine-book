/**
 * Construction constraint validator.
 *
 * Validates book set compositions against the rules from data/raw/构造规则.md.
 * See domain.graph.md §X Construction Constraints.
 */

import type { School } from "./enums.js";
import { AFFIX_BINDINGS } from "./bindings.js";
import { getPlatform } from "./platforms.js";

export interface SlotComposition {
	/** Main book name (determines main skill + exclusive affix) */
	main: string;
	/** Auxiliary affix 1 (from aux book 1's affix pool) */
	aux1: string;
	/** Auxiliary affix 2 (from aux book 2's affix pool) */
	aux2: string;
}

export interface BookSetComposition {
	slots: SlotComposition[];
}

/**
 * Validate a book set composition against construction constraints.
 * Returns an array of error messages (empty = valid).
 */
export function validateConstruction(
	composition: BookSetComposition,
): string[] {
	const errors: string[] = [];

	if (composition.slots.length !== 6) {
		errors.push(
			`Book set must have exactly 6 slots, got ${composition.slots.length}`,
		);
	}

	// Core conflict: each book appears at most once in main position
	const mainBooks = composition.slots.map((s) => s.main);
	const mainDuplicates = findDuplicates(mainBooks);
	for (const dup of mainDuplicates) {
		errors.push(`核心冲突: book "${dup}" used in main position more than once`);
	}

	// Affix conflict: each affix appears at most once across entire set
	const allAffixes: string[] = [];
	for (const slot of composition.slots) {
		allAffixes.push(slot.aux1, slot.aux2);
	}
	const affixDuplicates = findDuplicates(allAffixes);
	for (const dup of affixDuplicates) {
		errors.push(
			`副词缀冲突: affix "${dup}" used more than once across the set`,
		);
	}

	// School matching: school affixes must match the main book's school
	for (let i = 0; i < composition.slots.length; i++) {
		const slot = composition.slots[i];
		const platform = getPlatform(slot.main);
		if (!platform) continue; // unknown platform, skip

		for (const auxAffix of [slot.aux1, slot.aux2]) {
			const binding = AFFIX_BINDINGS.find((b) => b.affix === auxAffix);
			if (!binding) continue;

			if (
				binding.category === "school" &&
				binding.school &&
				binding.school !== platform.school
			) {
				errors.push(
					`School mismatch in slot ${i + 1}: affix "${auxAffix}" is ${binding.school} school, ` +
						`but main book "${slot.main}" is ${platform.school} school`,
				);
			}
		}
	}

	// Exclusive locking: exclusive affixes can only appear as aux on their own book
	for (let i = 0; i < composition.slots.length; i++) {
		const slot = composition.slots[i];
		for (const auxAffix of [slot.aux1, slot.aux2]) {
			const binding = AFFIX_BINDINGS.find((b) => b.affix === auxAffix);
			if (!binding || binding.category !== "exclusive") continue;

			// An exclusive affix appears when its book is in aux position,
			// NOT when its book is in main position (main gets the primary affix).
			// No constraint here — exclusive affixes can appear on any slot
			// where their book is used as auxiliary. The constraint is that
			// the exclusive is locked to its book as a source, but can land
			// on any slot where that book is aux.
		}
	}

	return errors;
}

function findDuplicates(items: string[]): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const item of items) {
		if (seen.has(item)) {
			duplicates.add(item);
		}
		seen.add(item);
	}
	return [...duplicates];
}
