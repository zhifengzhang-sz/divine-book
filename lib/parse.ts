/**
 * Parser: normalized.data.md -> structured effects
 *
 * Pure library — no side effects. Reads strict markdown tables,
 * validates each effect row against the Zod schema, and returns
 * structured data with validation warnings.
 */

import { EffectSchema } from "./schemas/effect.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EffectRow = { type: string; [k: string]: unknown };

export interface AffixSection {
	name: string;
	effects: EffectRow[];
}

export interface BookData {
	school: string;
	skill?: EffectRow[];
	primary_affix?: AffixSection;
	exclusive_affix?: AffixSection;
}

export interface ParseOutput {
	books: Record<string, BookData>;
	universal_affixes: Record<string, EffectRow[]>;
	school_affixes: Record<string, Record<string, EffectRow[]>>;
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

export function parseValue(raw: string): unknown {
	const s = raw.trim();
	if (s === "true") return true;
	if (s === "false") return false;
	const n = Number(s);
	if (!Number.isNaN(n) && s !== "") return n;
	return s;
}

export function parseFields(fields: string): Record<string, unknown> {
	if (!fields.trim()) return {};
	return Object.fromEntries(
		fields
			.split(/,\s*(?![^[]*])/)
			.filter((pair) => pair.includes("="))
			.map((pair): [string, unknown] => {
				const eq = pair.indexOf("=");
				return [pair.slice(0, eq).trim(), parseValue(pair.slice(eq + 1))];
			}),
	);
}

export function parseDataState(raw: string): undefined | string | string[] {
	const s = raw.trim();
	if (!s) return undefined;
	if (s.startsWith("[") && s.endsWith("]")) {
		return s
			.slice(1, -1)
			.split(",")
			.map((t) => t.trim());
	}
	return s;
}

// ---------------------------------------------------------------------------
// Markdown table parsing
// ---------------------------------------------------------------------------

export function parseTable(
	lines: string[],
	start: number,
): { rows: Record<string, string>[]; end: number } {
	const headers = lines[start]
		.split("|")
		.slice(1, -1)
		.map((h) => h.trim());
	const rest = lines.slice(start + 2);
	const count = rest.findIndex((l) => !l.startsWith("|"));
	const tableLines = count === -1 ? rest : rest.slice(0, count);
	const rows = tableLines.map((line) => {
		const cells = line
			.split("|")
			.slice(1, -1)
			.map((c) => c.trim());
		return Object.fromEntries(
			headers.map((h, j): [string, string] => [h, cells[j] ?? ""]),
		);
	});
	return { rows, end: start + 2 + tableLines.length };
}

// ---------------------------------------------------------------------------
// Effect row construction
// ---------------------------------------------------------------------------

export function toEffect(raw: Record<string, string>): EffectRow {
	const type = raw.effect_type;
	const fields = parseFields(raw.fields);
	const ds = parseDataState(raw.data_state);
	return { type, ...fields, ...(ds !== undefined ? { data_state: ds } : {}) };
}

export function toEffectFromAffix(raw: Record<string, string>): {
	affix: string;
	effect: EffectRow;
} {
	const affix = raw.affix.replace(/【|】/g, "").trim();
	const type = raw.effect_type;
	const fields = parseFields(raw.fields);
	const ds = parseDataState(raw.data_state);
	return {
		affix,
		effect: {
			type,
			...fields,
			...(ds !== undefined ? { data_state: ds } : {}),
		},
	};
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationWarning {
	context: string;
	type: string;
	issues: string[];
}

export function validateEffect(
	effect: EffectRow,
	context: string,
): ValidationWarning | null {
	const result = EffectSchema.safeParse(effect);
	if (!result.success) {
		return {
			context,
			type: effect.type,
			issues: result.error.issues.map(
				(i) => `${i.path.join(".")}: ${i.message}`,
			),
		};
	}
	return null;
}

// ---------------------------------------------------------------------------
// Affix grouping
// ---------------------------------------------------------------------------

function collectWarnings(
	effects: EffectRow[],
	context: string,
): ValidationWarning[] {
	return effects
		.map((e) => validateEffect(e, context))
		.filter((w): w is ValidationWarning => w !== null);
}

function groupByAffix(
	rows: Record<string, string>[],
	context: string,
): { grouped: Record<string, EffectRow[]>; warnings: ValidationWarning[] } {
	const parsed = rows.map(toEffectFromAffix);
	const warnings = parsed
		.map(({ affix, effect }) => validateEffect(effect, `${context}/${affix}`))
		.filter((w): w is ValidationWarning => w !== null);
	const grouped = Object.fromEntries(
		Array.from(
			parsed
				.reduce<Map<string, EffectRow[]>>(
					(m, { affix, effect }) =>
						m.set(affix, [...(m.get(affix) ?? []), effect]),
					new Map(),
				)
				.entries(),
		),
	);
	return { grouped, warnings };
}

// ---------------------------------------------------------------------------
// Main parse
// ---------------------------------------------------------------------------

export function parse(markdown: string): {
	data: ParseOutput;
	warnings: ValidationWarning[];
} {
	const lines = markdown.split("\n");
	const out: ParseOutput = {
		books: {},
		universal_affixes: {},
		school_affixes: {},
	};
	const warnings: ValidationWarning[] = [];

	let mode: "books" | "universal" | "school" | null = null;
	let book: string | null = null;
	let school: string | null = null;
	let section: "skill" | "primary_affix" | "exclusive_affix" | null = null;
	let affixName: string | null = null;
	let schoolGroup: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Section headers
		if (/^## I\. Skill Books/.test(line)) {
			mode = "books";
			continue;
		}
		if (/^## II\. Universal Affixes/.test(line)) {
			mode = "universal";
			book = null;
			continue;
		}
		if (/^## III\. School Affixes/.test(line)) {
			mode = "school";
			continue;
		}

		// --- Books ---
		if (mode === "books") {
			const bm = line.match(/^### `(.+?)` \[(\w+)\]/);
			if (bm) {
				book = bm[1];
				school = bm[2];
				section = null;
				out.books[book] = { school };
				continue;
			}
			if (/^#### Main Skill/.test(line)) {
				section = "skill";
				continue;
			}
			const pm = line.match(/^#### Primary Affix【(.+?)】/);
			if (pm) {
				section = "primary_affix";
				affixName = pm[1];
				continue;
			}
			const em = line.match(/^#### Exclusive Affix【(.+?)】/);
			if (em) {
				section = "exclusive_affix";
				affixName = em[1];
				continue;
			}
			if (book && section && /^\| effect_type/.test(line)) {
				const { rows, end } = parseTable(lines, i);
				const effects = rows.map(toEffect);
				warnings.push(...collectWarnings(effects, `${book}/${section}`));
				const bd = out.books[book];
				if (section === "skill") {
					bd.skill = effects;
				} else if (section === "primary_affix") {
					bd.primary_affix = { name: affixName ?? "", effects };
				} else {
					bd.exclusive_affix = { name: affixName ?? "", effects };
				}
				i = end - 1;
				continue;
			}
		}

		// --- Universal affixes ---
		if (mode === "universal" && /^\| affix/.test(line)) {
			const { rows, end } = parseTable(lines, i);
			const { grouped, warnings: w } = groupByAffix(rows, "universal");
			warnings.push(...w);
			Object.assign(out.universal_affixes, grouped);
			i = end - 1;
			continue;
		}

		// --- School affixes ---
		if (mode === "school") {
			const sm = line.match(/^### (Sword|Spell|Demon|Body)/);
			if (sm) {
				schoolGroup = sm[1];
				if (!out.school_affixes[schoolGroup])
					out.school_affixes[schoolGroup] = {};
				continue;
			}
			if (schoolGroup && /^\| affix/.test(line)) {
				const { rows, end } = parseTable(lines, i);
				const { grouped, warnings: w } = groupByAffix(
					rows,
					`school/${schoolGroup}`,
				);
				warnings.push(...w);
				Object.assign(out.school_affixes[schoolGroup], grouped);
				i = end - 1;
			}
		}
	}

	return { data: out, warnings };
}
