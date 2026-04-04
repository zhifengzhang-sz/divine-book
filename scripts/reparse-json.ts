#!/usr/bin/env bun
/**
 * Batch re-parse: re-runs every entry in game.data.json through the
 * current parser (grammar + semantic actions), replacing stored effects
 * with fresh output. Preserves raw text and tier resolution.
 *
 * Use after renaming types/fields in effects.ts + semantic files.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadGrammars, parseEntry } from "../lib/parser/index.js";
import { type TierSpec, buildDataState, resolveFields } from "../lib/parser/tiers.js";
import type { EffectWithMeta, Effect } from "../lib/parser/schema/effects.js";

const root = resolve(import.meta.dirname!, "..");
const jsonPath = resolve(root, "data/raw/game.data.json");

// ── Tier parsing (from md-table.ts, adapted for \n-separated text) ──

interface TierLine {
	raw: string;
	enlightenment: number;
	fusion?: number;
	locked?: boolean;
	vars: Record<string, number>;
}

function parseTierLine(line: string): TierLine | null {
	const lockedMatch = line.match(/悟(\d+)境[，,](?:融合(\d+)重[，,：:])?此(?:功能|词缀)未解锁/);
	if (lockedMatch) {
		return {
			raw: line,
			enlightenment: Number(lockedMatch[1]),
			fusion: lockedMatch[2] ? Number(lockedMatch[2]) : undefined,
			locked: true,
			vars: {},
		};
	}
	const varPattern = /([a-zA-Z]\w*)\s*=\s*(-?\d+(?:\.\d+)?)/g;
	const vars: Record<string, number> = {};
	let m: RegExpExecArray | null;
	while ((m = varPattern.exec(line)) !== null) {
		vars[m[1]] = Number(m[2]);
	}
	if (Object.keys(vars).length === 0) return null;
	const enlightenmentMatch = line.match(/悟(\d+)境/);
	const fusionMatch = line.match(/融合(\d+)重/);
	return {
		raw: line,
		enlightenment: enlightenmentMatch ? Number(enlightenmentMatch[1]) : 0,
		fusion: fusionMatch ? Number(fusionMatch[1]) : undefined,
		vars,
	};
}

function splitText(text: string): { description: string; tiers: TierLine[] } {
	const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
	const descLines: string[] = [];
	const tiers: TierLine[] = [];
	for (const line of lines) {
		const tier = parseTierLine(line);
		if (tier) tiers.push(tier);
		else descLines.push(line);
	}
	return { description: descLines.join("\n"), tiers };
}

function resolveTiers(effects: Effect[], tiers: TierLine[]): EffectWithMeta[] {
	if (tiers.length === 0) return effects as EffectWithMeta[];
	const resolved: EffectWithMeta[] = [];
	for (const tier of tiers) {
		if (tier.locked) {
			resolved.push(...effects.map(e => ({ ...e, data_state: "locked" }) as EffectWithMeta));
			continue;
		}
		const dataState = buildDataState(tier as TierSpec);
		for (const effect of effects) {
			const fields: Record<string, string | number> = {};
			for (const [k, v] of Object.entries(effect)) {
				if (k === "type") continue;
				if (typeof v === "string" || typeof v === "number") fields[k] = v;
			}
			const resolvedFields = resolveFields(fields, tier.vars);
			const row: EffectWithMeta = { ...effect, ...resolvedFields };
			if (dataState) row.data_state = dataState;
			for (const [k, v] of Object.entries(effect)) {
				if (k === "type") continue;
				if (typeof v !== "string" && typeof v !== "number") row[k] = v;
			}
			resolved.push(row);
		}
	}
	return resolved;
}

// ── Main ──

await loadGrammars();

const gameData = JSON.parse(readFileSync(jsonPath, "utf-8"));
let bookCount = 0;
let affixCount = 0;
let errorCount = 0;

// Re-parse books
for (const [name, book] of Object.entries(gameData.books) as [string, any][]) {
	// Skill
	if (book.skill?.text) {
		const { description, tiers } = splitText(book.skill.text);
		const effects = parseEntry(name, description, "skillDescription");
		if (effects.length > 0) {
			book.skill.effects = resolveTiers(effects, tiers);
		} else {
			console.warn(`  SKIP skill ${name}: parse returned 0 effects`);
			errorCount++;
		}
	}

	// Primary affix
	if (book.primaryAffix?.text) {
		const { description, tiers } = splitText(book.primaryAffix.text);
		const effects = parseEntry(name, description, "primaryAffix");
		if (effects.length > 0) {
			book.primaryAffix.effects = resolveTiers(effects, tiers);
		} else {
			console.warn(`  SKIP primaryAffix ${name}: parse returned 0 effects`);
			errorCount++;
		}
	}

	// Exclusive affix
	if (book.exclusiveAffix?.text) {
		const { description, tiers } = splitText(book.exclusiveAffix.text);
		// Exclusive affixes use the book name as grammar but "exclusiveAffix" entry point
		const effects = parseEntry(name, description, "exclusiveAffix");
		if (effects.length > 0) {
			book.exclusiveAffix.effects = resolveTiers(effects, tiers);
		} else {
			// Some exclusive affixes use compound parsers in exclusive.ts, not grammar-based
			// Keep existing effects if parse fails
			console.warn(`  SKIP exclusiveAffix ${name}: parse returned 0 effects (may use compound parser)`);
			errorCount++;
		}
	}

	bookCount++;
}

// Re-parse affixes
if (gameData.affixes) {
	// Universal affixes
	if (gameData.affixes.universal) {
		for (const [name, affix] of Object.entries(gameData.affixes.universal) as [string, any][]) {
			if (!affix.text) continue;
			const { description, tiers } = splitText(affix.text);
			const effects = parseEntry("通用词缀", description, "affixDescription");
			if (effects.length > 0) {
				affix.effects = resolveTiers(effects, tiers);
				affixCount++;
			} else {
				console.warn(`  SKIP universal affix ${name}: parse returned 0 effects`);
				errorCount++;
			}
		}
	}

	// School affixes
	if (gameData.affixes.school) {
		for (const [school, affixes] of Object.entries(gameData.affixes.school) as [string, any][]) {
			const grammarName = `修为词缀_${school}`;
			for (const [name, affix] of Object.entries(affixes) as [string, any][]) {
				if (!affix.text) continue;
				const { description, tiers } = splitText(affix.text);
				const effects = parseEntry(grammarName, description, "affixDescription");
				if (effects.length > 0) {
					affix.effects = resolveTiers(effects, tiers);
					affixCount++;
				} else {
					console.warn(`  SKIP school affix ${school}/${name}: parse returned 0 effects`);
					errorCount++;
				}
			}
		}
	}
}

writeFileSync(jsonPath, `${JSON.stringify(gameData, null, 2)}\n`);
console.log(`Re-parsed: ${bookCount} books, ${affixCount} affixes. Errors: ${errorCount}`);
if (errorCount > 0) {
	console.log("Entries with errors kept their existing effects.");
}
