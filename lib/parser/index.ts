/**
 * Main Parser — wires per-book grammars to YAML output.
 *
 * Pipeline per book:
 *   md-table → splitCell → grammar.match + semantics → Effect[]
 *   → tiers.ts resolve → emit.ts → YAML
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import * as ohm from "ohm-js";
import type { EffectRow, ParsedBook } from "../data/types.js";
import { emitBooks, formatYaml } from "./emit.js";
import {
	type RawBookEntry,
	type SplitCell,
	readMainSkillTables,
	splitCell,
} from "./md-table.js";
import {
	type TierSpec,
	buildDataState,
	resolveFields,
} from "./tiers.js";

// ── Grammar + Semantics loader ──────────────────────────

const GD = resolve(import.meta.dir, "grammars-v1");
const SD = resolve(import.meta.dir, "grammars/semantics");

let grammars: ReturnType<typeof ohm.grammars>;
// biome-ignore lint/suspicious/noExplicitAny: ohm semantics modules
const semMods: Record<string, any> = {};

export async function loadGrammars() {
	const allOhm = [
		readFileSync(resolve(GD, "Base.ohm"), "utf-8"),
		...readdirSync(resolve(GD, "books")).filter(f => f.endsWith(".ohm")).map(f => readFileSync(resolve(GD, "books", f), "utf-8")),
		...readdirSync(resolve(GD, "affixes")).filter(f => f.endsWith(".ohm")).map(f => readFileSync(resolve(GD, "affixes", f), "utf-8")),
	].join("\n");
	grammars = ohm.grammars(allOhm);

	const files = readdirSync(SD).filter(f => f.endsWith(".ts") && f !== "shared.ts" && !f.includes("test"));
	await Promise.all(files.map(async f => {
		try { semMods[f.replace(".ts", "")] = await import(resolve(SD, f)); } catch {}
	}));
}

// ── Parse one entry point ───────────────────────────────

export function getGrammar(name: string): ohm.Grammar | undefined {
	return grammars[name] ?? grammars[name.replace(/-/g, "")];
}

export function getSemantics(name: string) {
	return semMods[name] ?? semMods[name.replace(/-/g, "")];
}

export function readSource(name: string, ext: ".ohm" | ".ts"): string | null {
	const dir = ext === ".ohm" ? GD : SD;
	for (const sub of ["books", "affixes", ""]) {
		const p = sub ? resolve(dir, sub, `${name}${ext}`) : resolve(dir, `${name}${ext}`);
		if (existsSync(p)) return readFileSync(p, "utf-8");
	}
	return null;
}

export function buildParseTree(grammar: ohm.Grammar, match: ohm.MatchResult): object {
	const s = grammar.createSemantics();
	// biome-ignore lint/suspicious/noExplicitAny: tree builder returns mixed types
	s.addOperation<any>("toTree", {
		_nonterminal(...c: ohm.Node[]) {
			const k = c.map((x: ohm.Node) => x.toTree()).filter(Boolean);
			return k.length ? { r: this.ctorName, c: k } : { r: this.ctorName, t: this.sourceString };
		},
		_terminal() { return this.sourceString.length > 0 ? { r: "_", t: this.sourceString } : null; },
		_iter(...c: ohm.Node[]) { const k = c.map((x: ohm.Node) => x.toTree()).filter(Boolean); return k.length ? k : null; },
	});
	return s(match).toTree();
}

export function cleanText(raw: string): string {
	return raw
		.replace(/`/g, "")                        // strip backticks
		.replace(/^【[^】]+】[：:]/, "")           // strip affix name prefix
		.replace(/\\([*])/g, "$1")                 // unescape \* → *
		.replace(/\*注\*[：:][^）\n]*/g, "")       // strip *注*：... notes
		.replace(/（最高不超过\d+级）/g, "")         // strip （最高不超过3级）
		.replace(/（\d+层[^）]*达到[^）]*）/g, "")   // strip （25层达到最大提升伤害）
		.replace(/（持续伤害效果受[^）]*）/g, "")     // strip （持续伤害效果受一半伤害加成）
		.replace(/\s*（数据为[^）]*）/g, "")
		.trim();
}

export function parseEntry(grammarName: string, text: string, entryPoint: string): EffectRow[] {
	// Strip dashes from name (raw data has 新-青元剑诀, grammar has 新青元剑诀)
	const g = grammars[grammarName] ?? grammars[grammarName.replace(/-/g, "")];
	if (!g) { console.warn(`No grammar: ${grammarName}`); return []; }

	const clean = cleanText(text);
	const m = g.match(clean, entryPoint);
	if (m.failed()) { console.warn(`Parse failed (${grammarName}/${entryPoint}): ${m.shortMessage}`); return []; }

	const mod = semMods[grammarName] ?? semMods[grammarName.replace(/-/g, "")];
	if (!mod) { console.warn(`No semantics: ${grammarName}`); return []; }

	const s = g.createSemantics();
	mod.addSemantics(s);
	return s(m).toEffects();
}

// ── Resolve tiers ───────────────────────────────────────

function resolveTiers(effects: EffectRow[], tiers: TierSpec[]): EffectRow[] {
	if (tiers.length === 0) return effects;

	const resolved: EffectRow[] = [];
	for (const tier of tiers) {
		if (tier.locked) {
			resolved.push(...effects.map(e => ({ ...e, data_state: "locked" })));
			continue;
		}
		const dataState = buildDataState(tier);
		for (const effect of effects) {
			const fields: Record<string, string | number> = {};
			for (const [k, v] of Object.entries(effect)) {
				if (k === "type") continue;
				if (typeof v === "string" || typeof v === "number") fields[k] = v;
			}
			const resolvedFields = resolveFields(fields, tier.vars);
			const row: EffectRow = { type: effect.type, ...resolvedFields };
			if (dataState) row.data_state = dataState;
			// Preserve non-string/number fields (booleans, arrays, objects)
			for (const [k, v] of Object.entries(effect)) {
				if (k === "type") continue;
				if (typeof v !== "string" && typeof v !== "number") row[k] = v;
			}
			resolved.push(row);
		}
	}
	return resolved;
}

// ── Parse one book ──────────────────────────────────────

function parseBook(entry: RawBookEntry, exclusiveText: string): ParsedBook {
	const skillCell = splitCell(entry.skillText);
	const affixCell = splitCell(entry.affixText);

	// Parse skill
	const skillDesc = skillCell.description.join("");
	const skillEffects = parseEntry(entry.name, skillDesc, "skillDescription");
	const resolvedSkill = resolveTiers(skillEffects, skillCell.tiers.map(t => ({
		enlightenment: t.enlightenment, fusion: t.fusion, locked: t.locked, vars: t.vars,
	})));

	// Parse primary affix
	const affixDesc = affixCell.description.join("");
	let primaryAffix: ParsedBook["primaryAffix"];
	if (affixDesc.trim()) {
		const affixEffects = parseEntry(entry.name, affixDesc, "primaryAffix");
		const resolvedAffix = resolveTiers(affixEffects, affixCell.tiers.map(t => ({
			enlightenment: t.enlightenment, fusion: t.fusion, locked: t.locked, vars: t.vars,
		})));
		// Extract affix name from 【name】： prefix
		const nameMatch = affixCell.description[0]?.match(/^【([^】]+)】/);
		primaryAffix = { name: nameMatch?.[1] ?? "unknown", effects: resolvedAffix };
	}

	// Parse exclusive affix
	let exclusiveAffix: ParsedBook["exclusiveAffix"];
	if (exclusiveText.trim()) {
		const exclCell = splitCell(exclusiveText);
		// Join descriptions: \n for lines starting with 【 (multi-line states), space otherwise
		const exclDesc = exclCell.description.reduce((acc, line, i) => {
			if (i === 0) return line;
			return acc + (line.startsWith("【") ? "\n" : " ") + line;
		}, "");
		const exclEffects = parseEntry(entry.name, exclDesc, "exclusiveAffix");
		const resolvedExcl = resolveTiers(exclEffects, exclCell.tiers.map(t => ({
			enlightenment: t.enlightenment, fusion: t.fusion, locked: t.locked, vars: t.vars,
		})));
		exclusiveAffix = { name: "exclusive", effects: resolvedExcl };
	}

	return {
		school: entry.school,
		skillText: entry.skillText.replace(/<br\s*\/?>/gi, "\n"),
		affixText: entry.affixText.replace(/<br\s*\/?>/gi, "\n"),
		exclusiveAffixText: exclusiveText.replace(/<br\s*\/?>/gi, "\n"),
		skill: resolvedSkill,
		primaryAffix,
		exclusiveAffix,
	};
}

// ── Public API ──────────────────────────────────────────

export async function parseMainSkills(mainMd: string, exclusiveMd: string): Promise<Map<string, ParsedBook>> {
	await loadGrammars();

	const bookEntries = readMainSkillTables(mainMd);

	// Build exclusive affix map
	const exclusiveMap: Record<string, string> = {};
	for (const line of exclusiveMd.split("\n")) {
		if (!line.startsWith("|") || line.includes("---") || line.includes("功法")) continue;
		const cells = line.split("|").slice(1, -1).map(c => c.trim());
		if (cells.length >= 3) exclusiveMap[cells[0].replace(/`/g, "")] = cells[2];
	}

	const books = new Map<string, ParsedBook>();
	for (const entry of bookEntries) {
		const exclText = exclusiveMap[entry.name] ?? "";
		books.set(entry.name, parseBook(entry, exclText));
	}

	return books;
}

export async function parseMainSkillsToYaml(mainMd: string, exclusiveMd: string): Promise<string> {
	const books = await parseMainSkills(mainMd, exclusiveMd);
	const emitted = emitBooks(books);
	return formatYaml(emitted);
}
