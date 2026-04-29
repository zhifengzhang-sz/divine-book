#!/usr/bin/env bun
/**
 * One-time migration: convert raw markdown data into structured JSON.
 *
 * Reads 4 raw markdown files, runs existing parsers, and outputs
 * data/raw/game.data.json with both raw text and parsed effects.
 *
 * Usage:
 *   bun scripts/migrate-to-json.ts
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ohm from "ohm-js";
import type { EffectWithMeta } from "../lib/parser/schema/effects.js";
import type { ParsedBook } from "../lib/data/types.js";
import { loadBooksYaml } from "../lib/sim/config.js";
import {
	readUniversalAffixTable,
	readSchoolAffixTable,
} from "../lib/parser/common-affixes.js";
import { type TierSpec, buildDataState, resolveFields } from "../lib/parser/tiers.js";

// ── Output schema ──────────────────────────────────────

interface RawBookData {
	school: string;
	skill: {
		text: string;
		effects: EffectWithMeta[];
	};
	primaryAffix?: {
		name: string;
		text: string;
		effects: EffectWithMeta[];
	};
	exclusiveAffix?: {
		name: string;
		text: string;
		effects: EffectWithMeta[];
	};
	xuan?: {
		text: string;
		effects: EffectWithMeta[];
	};
}

interface RawAffixData {
	text: string;
	effects: EffectWithMeta[];
}

interface RawDataFile {
	version: 1;
	books: Record<string, RawBookData>;
	affixes: {
		universal: Record<string, RawAffixData>;
		school: Record<string, Record<string, RawAffixData>>;
	};
}

// ── Affix parsing (replicated from parse-affixes.ts) ───

const GD = resolve(import.meta.dir, "../lib/parser/grammars-v1");
const SD = resolve(import.meta.dir, "../lib/parser/grammars/semantics");

function loadAffixGrammars(): ReturnType<typeof ohm.grammars> {
	const allOhm = [
		readFileSync(resolve(GD, "Base.ohm"), "utf-8"),
		...readdirSync(resolve(GD, "books"))
			.filter((f) => f.endsWith(".ohm"))
			.map((f) => readFileSync(resolve(GD, "books", f), "utf-8")),
		...readdirSync(resolve(GD, "affixes"))
			.filter((f) => f.endsWith(".ohm"))
			.map((f) => readFileSync(resolve(GD, "affixes", f), "utf-8")),
	].join("\n");
	return ohm.grammars(allOhm);
}

// biome-ignore lint/suspicious/noExplicitAny: ohm semantics modules
async function loadSemMods(): Promise<Record<string, any>> {
	// biome-ignore lint/suspicious/noExplicitAny: ohm semantics
	const mods: Record<string, any> = {};
	const files = readdirSync(SD).filter(
		(f) => f.endsWith(".ts") && f !== "shared.ts" && !f.includes("test"),
	);
	await Promise.all(
		files.map(async (f) => {
			try {
				mods[f.replace(".ts", "")] = await import(resolve(SD, f));
			} catch {}
		}),
	);
	return mods;
}

function parseAffix(
	grammars: ReturnType<typeof ohm.grammars>,
	// biome-ignore lint/suspicious/noExplicitAny: ohm semantics
	semMods: Record<string, any>,
	grammarName: string,
	text: string,
): object[] {
	const g = grammars[grammarName];
	if (!g) {
		console.warn(`No grammar: ${grammarName}`);
		return [];
	}
	const clean = text.replace(/`/g, "").trim();
	const m = g.match(clean, "affixDescription");
	if (m.failed()) {
		console.warn(
			`Parse failed (${grammarName}/${text.substring(0, 20)}): ${m.shortMessage}`,
		);
		return [];
	}
	const mod = semMods[grammarName];
	if (!mod) {
		console.warn(`No semantics: ${grammarName}`);
		return [];
	}
	const s = g.createSemantics();
	mod.addSemantics(s);
	return s(m).toEffects();
}

function resolveTiers(effects: object[], tiers: TierSpec[]): EffectWithMeta[] {
	if (tiers.length === 0) return effects as EffectWithMeta[];
	const resolved: EffectWithMeta[] = [];
	for (const tier of tiers) {
		if (tier.locked) {
			resolved.push(
				...(effects.map((e) => ({ ...e, data_state: "locked" })) as EffectWithMeta[]),
			);
			continue;
		}
		const ds = buildDataState(tier);
		for (const eff of effects) {
			const e = eff as Record<string, unknown>;
			const fields: Record<string, string | number> = {};
			for (const [k, v] of Object.entries(e)) {
				if (k !== "type" && (typeof v === "string" || typeof v === "number"))
					fields[k] = v;
			}
			const rf = resolveFields(fields, tier.vars);
			const row: Record<string, unknown> = { type: e.type, ...rf };
			if (ds) row.data_state = ds;
			for (const [k, v] of Object.entries(e)) {
				if (k !== "type" && typeof v !== "string" && typeof v !== "number")
					row[k] = v;
			}
			resolved.push(row as EffectWithMeta);
		}
	}
	return resolved;
}

// ── Main ───────────────────────────────────────────────

const ROOT = resolve(import.meta.dir, "..");

// 1. Read affix markdown files (books come from YAML, affixes still parsed from markdown)
const universalMd = readFileSync(resolve(ROOT, "data/raw/通用词缀.md"), "utf-8");
const schoolMd = readFileSync(resolve(ROOT, "data/raw/修为词缀.md"), "utf-8");

// 2. Load existing YAML as the authoritative source for books
// (The YAML has correct parsed effects; re-parsing from markdown loses data due to parser bugs)
console.log("Loading books from existing YAML...");
const existingYaml = loadBooksYaml(resolve(ROOT, "data/yaml/books.yaml"));

// 3. Transform YAML books into JSON format
const books: Record<string, RawBookData> = {};
for (const [name, yb] of Object.entries(existingYaml.books)) {
	const entry: RawBookData = {
		school: yb.school,
		skill: {
			text: yb.skill_text ?? "",
			effects: (yb.skill ?? []) as EffectWithMeta[],
		},
	};
	if (yb.primary_affix) {
		entry.primaryAffix = {
			name: yb.primary_affix.name,
			text: yb.affix_text ?? "",
			effects: yb.primary_affix.effects as EffectWithMeta[],
		};
	}
	if (yb.exclusive_affix) {
		entry.exclusiveAffix = {
			name: yb.exclusive_affix.name,
			text: yb.exclusive_affix_text ?? "",
			effects: yb.exclusive_affix.effects as EffectWithMeta[],
		};
	}
	books[name] = entry;
}

// 4. Parse affixes
console.log("Parsing affixes...");
const affixGrammars = loadAffixGrammars();
const affixSemMods = await loadSemMods();

const schoolNameMap: Record<string, string> = {
	Sword: "剑修",
	Spell: "法修",
	Demon: "魔修",
	Body: "体修",
};

// Universal affixes
const universalEntries = readUniversalAffixTable(universalMd);
const universal: Record<string, RawAffixData> = {};
for (const e of universalEntries) {
	const effects = parseAffix(affixGrammars, affixSemMods, "通用词缀", e.cell.description.join(""));
	const resolved = resolveTiers(
		effects,
		e.cell.tiers.map((t) => ({
			enlightenment: t.enlightenment,
			fusion: t.fusion,
			locked: t.locked,
			vars: t.vars,
		})),
	);
	universal[e.name] = {
		text: e.rawText.replace(/<br\s*\/?>/gi, "\n"),
		effects: resolved,
	};
}

// School affixes
const schoolEntries = readSchoolAffixTable(schoolMd);
const school: Record<string, Record<string, RawAffixData>> = {};
for (const e of schoolEntries) {
	const cn = schoolNameMap[e.school ?? ""] ?? e.school ?? "";
	const gn = `修为词缀_${cn}`;
	if (!school[cn]) school[cn] = {};
	const effects = parseAffix(affixGrammars, affixSemMods, gn, e.cell.description.join(""));
	const resolved = resolveTiers(
		effects,
		e.cell.tiers.map((t) => ({
			enlightenment: t.enlightenment,
			fusion: t.fusion,
			locked: t.locked,
			vars: t.vars,
		})),
	);
	school[cn][e.name] = {
		text: e.rawText.replace(/<br\s*\/?>/gi, "\n"),
		effects: resolved,
	};
}

// 5. Assemble output
const output: RawDataFile = {
	version: 1,
	books,
	affixes: { universal, school },
};

// 6. Write JSON
const outPath = resolve(ROOT, "data/raw/game.data.json");
const json = JSON.stringify(output, null, 2);
writeFileSync(outPath, json);

// 7. Report
const bookCount = Object.keys(books).length;
const universalCount = Object.keys(universal).length;
const schoolAffixCount = Object.values(school).reduce(
	(sum, s) => sum + Object.keys(s).length,
	0,
);
const schoolCount = Object.keys(school).length;
const fileSizeKB = (Buffer.byteLength(json, "utf-8") / 1024).toFixed(1);

console.log(`\nDone! Written to ${outPath}`);
console.log(`  Books: ${bookCount}`);
console.log(`  Universal affixes: ${universalCount}`);
console.log(`  School affixes: ${schoolAffixCount} across ${schoolCount} schools`);
console.log(`  File size: ${fileSizeKB} KB`);
