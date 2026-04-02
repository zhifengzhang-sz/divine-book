/**
 * Data loading — reads and validates YAML data files.
 *
 * Moved from lib/sim/config.ts to establish lib/data/ as the data layer.
 * The sim module imports from here; external consumers use @divine-book/lib/data.
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { BookData } from "./types.js";
import type { EffectWithMeta } from "../parser/schema/effects.js";
import { parseEffect } from "../parser/schema/effects.js";

// ── Types ──────────────────────────────────────────────────────────

export interface BooksYaml {
	books: Record<string, BookData>;
}

export interface AffixesYaml {
	universal: Record<string, { effects: EffectWithMeta[] }>;
	school: Record<string, Record<string, { effects: EffectWithMeta[] }>>;
}

// ── YAML Loading ───────────────────────────────────────────────────

export function loadBooksYaml(path = "data/yaml/books.yaml"): BooksYaml {
	const raw = readFileSync(path, "utf-8");
	const data = parseYaml(raw) as BooksYaml;

	// Validate every effect through Zod schema
	for (const [bookName, book] of Object.entries(data.books)) {
		if (book.skill) {
			book.skill = book.skill.map((e, i) => {
				try {
					return parseEffect(e) as EffectWithMeta;
				} catch (err) {
					throw new Error(
						`Zod validation failed for ${bookName}.skill[${i}]: ${(err as Error).message}`,
					);
				}
			});
		}
		if (book.primary_affix) {
			book.primary_affix.effects = book.primary_affix.effects.map((e, i) => {
				try {
					return parseEffect(e) as EffectWithMeta;
				} catch (err) {
					throw new Error(
						`Zod validation failed for ${bookName}.primary_affix[${i}]: ${(err as Error).message}`,
					);
				}
			});
		}
		if (book.exclusive_affix) {
			book.exclusive_affix.effects = book.exclusive_affix.effects.map(
				(e, i) => {
					try {
						return parseEffect(e) as EffectWithMeta;
					} catch (err) {
						throw new Error(
							`Zod validation failed for ${bookName}.exclusive_affix[${i}]: ${(err as Error).message}`,
						);
					}
				},
			);
		}
	}

	return data;
}

export function loadAffixesYaml(path = "data/yaml/affixes.yaml"): AffixesYaml {
	const raw = readFileSync(path, "utf-8");
	return parseYaml(raw) as AffixesYaml;
}
