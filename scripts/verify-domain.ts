#!/usr/bin/env bun
/**
 * Verify domain analysis docs against the TypeScript source of truth.
 *
 * Checks:
 *   1. domain.category.md — affix provides/requires vs bindings.ts
 *   2. domain.graph.md — platforms vs platforms.ts, named entities vs named-entities.ts
 *   3. domain.path.md — platforms vs platforms.ts, provider claims vs bindings.ts
 *   4. chain.md — function core effects vs functions.ts
 *
 * Usage: bun scripts/verify-domain.ts
 */
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { AFFIX_BINDINGS, deriveProvides } from "../lib/domain/bindings.js";
import { PLATFORMS } from "../lib/domain/platforms.js";
import { NAMED_ENTITIES } from "../lib/domain/named-entities.js";
import { FUNCTIONS } from "../lib/domain/functions.js";
import { TargetCategory } from "../lib/domain/enums.js";

const ROOT = resolve(import.meta.dir, "..");
const CATEGORY_DOC = join(ROOT, "docs/data/domain.category.md");
const GRAPH_DOC = join(ROOT, "docs/data/domain.graph.md");
const PATH_DOC = join(ROOT, "docs/data/domain.path.md");
const CHAIN_DOC = join(ROOT, "docs/data/chain.md");

interface Issue {
	file: string;
	severity: "error" | "warning";
	message: string;
}

const issues: Issue[] = [];

function error(file: string, message: string) {
	issues.push({ file, severity: "error", message });
}
function warning(file: string, message: string) {
	issues.push({ file, severity: "warning", message });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract 【name】 tokens from a line */
function extractAffixNames(text: string): string[] {
	const re = /【([^】]+)】/g;
	const names: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) names.push(m[1]);
	return names;
}

/** Parse provides column value: "—" → [], "T2" → ["debuff"], "T2, T6" → ["debuff","healing"] */
function parseProvides(cell: string): string[] {
	const trimmed = cell.trim();
	if (trimmed === "—" || trimmed === "-" || trimmed === "") return [];
	return trimmed.split(/[,，]\s*/).map(tokenToCategory).filter(Boolean) as string[];
}

/** Parse requires column: "free" → "free", "T2" → ["debuff"], "T3∨T2∨T5" → ["buff","debuff","shield"] */
function parseRequires(cell: string): string[] | "free" {
	const trimmed = cell.trim();
	if (trimmed === "free") return "free";
	return trimmed.split(/[∨,，]\s*/).map(tokenToCategory).filter(Boolean) as string[];
}

/** Map T1-T10 label to TargetCategory value */
function tokenToCategory(t: string): string | null {
	const map: Record<string, string> = {
		T1: "damage", T2: "debuff", T3: "buff", T4: "dot", T5: "shield",
		T6: "healing", T7: "state", T8: "probability", T9: "lost_hp", T10: "control",
	};
	return map[t.trim()] ?? null;
}

function categoryToToken(c: string): string {
	const map: Record<string, string> = {
		damage: "T1", debuff: "T2", buff: "T3", dot: "T4", shield: "T5",
		healing: "T6", state: "T7", probability: "T8", lost_hp: "T9", control: "T10",
	};
	return map[c] ?? c;
}

function sortedStr(arr: string[]): string {
	return [...arr].sort().join(", ");
}

// ---------------------------------------------------------------------------
// 1. Verify domain.category.md
// ---------------------------------------------------------------------------

function verifyCategory() {
	const file = "domain.category.md";
	const text = readFileSync(CATEGORY_DOC, "utf8");
	const lines = text.split(/\r?\n/);

	// Build a map of affix name → { provides, requires } from the walkthrough tables
	// Table format: | # | Affix | provides | requires | ... |
	// Exclusive:    | # | Book | Affix | provides | requires | ... |
	const docBindings = new Map<string, { provides: string[]; requires: string[] | "free"; line: number }>();

	for (let i = 0; i < lines.length; i++) {
		const L = lines[i];
		if (!L.startsWith("|")) continue;
		if (/^\|:?-/.test(L)) continue; // separator

		const cols = L.split("|").map((c) => c.trim()).filter(Boolean);
		if (cols.length < 5) continue;

		// Detect table layout by checking if column contains 【...】
		let affixName: string | null = null;
		let providesCol: string | null = null;
		let requiresCol: string | null = null;

		// Universal/School tables: | # | 【Affix】 | provides | requires | ...
		// Exclusive tables: | # | Book | 【Affix】 | provides | requires | ...
		const affixNames1 = extractAffixNames(cols[1]);
		const affixNames2 = cols.length > 2 ? extractAffixNames(cols[2]) : [];

		if (affixNames1.length > 0) {
			affixName = affixNames1[0];
			providesCol = cols[2];
			requiresCol = cols[3];
		} else if (affixNames2.length > 0) {
			affixName = affixNames2[0];
			providesCol = cols[3];
			requiresCol = cols[4];
		}

		if (!affixName || !providesCol || !requiresCol) continue;
		// Skip header rows
		if (providesCol === "provides" || requiresCol === "requires") continue;

		docBindings.set(affixName, {
			provides: parseProvides(providesCol),
			requires: parseRequires(requiresCol),
			line: i + 1,
		});
	}

	// Compare against code
	const codeMap = new Map(AFFIX_BINDINGS.map((b) => [b.affix, b]));

	// Check all code affixes are in doc
	for (const binding of AFFIX_BINDINGS) {
		if (!docBindings.has(binding.affix)) {
			error(file, `Affix 【${binding.affix}】 exists in bindings.ts but missing from doc`);
		}
	}

	// Check all doc affixes exist in code and values match
	for (const [name, doc] of docBindings) {
		const code = codeMap.get(name);
		if (!code) {
			error(file, `Line ${doc.line}: Affix 【${name}】 in doc but missing from bindings.ts`);
			continue;
		}

		// Check provides
		const codeProvides = deriveProvides(code.outputs).sort();
		const docProvides = [...doc.provides].sort();
		if (sortedStr(codeProvides) !== sortedStr(docProvides)) {
			error(file,
				`Line ${doc.line}: 【${name}】 provides mismatch — ` +
				`doc: [${docProvides.map(categoryToToken).join(", ") || "—"}], ` +
				`code: [${codeProvides.map(categoryToToken).join(", ") || "—"}]`
			);
		}

		// Check requires
		const codeReq = code.requires;
		const docReq = doc.requires;
		if (codeReq === "free" && docReq !== "free") {
			error(file,
				`Line ${doc.line}: 【${name}】 requires mismatch — doc: [${Array.isArray(docReq) ? docReq.map(categoryToToken).join(", ") : docReq}], code: free`
			);
		} else if (codeReq !== "free" && docReq === "free") {
			error(file,
				`Line ${doc.line}: 【${name}】 requires mismatch — doc: free, code: [${codeReq.map(categoryToToken).join(", ")}]`
			);
		} else if (Array.isArray(codeReq) && Array.isArray(docReq)) {
			if (sortedStr(codeReq) !== sortedStr(docReq)) {
				error(file,
					`Line ${doc.line}: 【${name}】 requires mismatch — ` +
					`doc: [${docReq.map(categoryToToken).join(", ")}], ` +
					`code: [${codeReq.map(categoryToToken).join(", ")}]`
				);
			}
		}
	}

	// Count check
	const expected = AFFIX_BINDINGS.length;
	const actual = docBindings.size;
	if (actual !== expected) {
		warning(file, `Affix count: doc has ${actual}, code has ${expected}`);
	}
}

// ---------------------------------------------------------------------------
// 2. Verify domain.graph.md
// ---------------------------------------------------------------------------

function verifyGraph() {
	const file = "domain.graph.md";
	const text = readFileSync(GRAPH_DOC, "utf8");

	// Check for stale about.md references
	if (/\babout\.md\b/.test(text)) {
		error(file, "Stale reference to 'about.md' (should be 'data/raw/*.md')");
	}

	// Check platforms — look for book names
	for (const p of PLATFORMS) {
		if (!text.includes(p.book)) {
			error(file, `Platform book '${p.book}' missing from doc`);
		}
		if (!text.includes(p.primaryAffix)) {
			warning(file, `Primary affix '${p.primaryAffix}' for ${p.book} not found in doc`);
		}
	}

	// Check named entities
	for (const ne of NAMED_ENTITIES) {
		if (!text.includes(ne.name)) {
			error(file, `Named entity '${ne.name}' missing from doc`);
		}
		if (!text.includes(ne.createdBy)) {
			warning(file, `Named entity '${ne.name}' creator '${ne.createdBy}' not found in doc`);
		}
	}
}

// ---------------------------------------------------------------------------
// 3. Verify domain.path.md
// ---------------------------------------------------------------------------

function verifyPath() {
	const file = "domain.path.md";
	const text = readFileSync(PATH_DOC, "utf8");

	// Check for stale about.md references
	if (/\babout\.md\b/.test(text)) {
		error(file, "Stale reference to 'about.md' (should be 'data/raw/*.md')");
	}

	// Check all platforms present
	for (const p of PLATFORMS) {
		if (!text.includes(p.book)) {
			error(file, `Platform book '${p.book}' missing from doc`);
		}
	}

	// Check T2 provider claims against code
	// Build actual T2 providers from bindings
	const t2Providers = new Set<string>();
	for (const b of AFFIX_BINDINGS) {
		const provides = deriveProvides(b.outputs);
		if (provides.includes(TargetCategory.Debuff)) {
			t2Providers.add(b.affix);
		}
	}
	// Also check platforms
	for (const p of PLATFORMS) {
		if (p.provides.includes(TargetCategory.Debuff)) {
			t2Providers.add(p.book);
		}
	}

	// Look for provider claims — match "【name】 provides T_N" patterns
	const lines = text.split(/\r?\n/);
	const providerClaimRe = /【([^】]+)】[^;|]*provides\s+T(\d+)/g;
	for (let i = 0; i < lines.length; i++) {
		const L = lines[i];
		let pm: RegExpExecArray | null;
		providerClaimRe.lastIndex = 0;
		while ((pm = providerClaimRe.exec(L))) {
			const name = pm[1];
			const catToken = `T${pm[2]}`;
			const catValue = tokenToCategory(catToken);
			if (!catValue) continue;
			const binding = AFFIX_BINDINGS.find((b) => b.affix === name);
			if (binding) {
				const actualProvides = deriveProvides(binding.outputs);
				if (!actualProvides.includes(catValue as TargetCategory)) {
					warning(file,
						`Line ${i + 1}: 【${name}】 claimed as ${catToken} provider but code derives [${actualProvides.map(categoryToToken).join(", ") || "—"}]`
					);
				}
			}
		}
	}
}

// ---------------------------------------------------------------------------
// 4. Verify chain.md — function core effects
// ---------------------------------------------------------------------------

function verifyChain() {
	const file = "chain.md";
	const text = readFileSync(CHAIN_DOC, "utf8");
	const lines = text.split(/\r?\n/);

	// Check for stale about.md references
	if (/\babout\.md\b/.test(text)) {
		error(file, "Stale reference to 'about.md'");
	}

	// Parse the §D function table: | Fn | Purpose | Required Effect Types | Qualifying Foundations |
	// The function ID must be in column 0 (first cell), to avoid matching §C objectives table
	for (const fn of FUNCTIONS) {
		const row = lines.find((L) => {
			if (!L.startsWith("|")) return false;
			const firstCol = L.split("|").map((c) => c.trim()).filter(Boolean)[0];
			return firstCol === fn.id;
		});
		if (!row) {
			error(file, `Function ${fn.id} missing from §D table`);
			continue;
		}

		const cols = row.split("|").map((c) => c.trim()).filter(Boolean);
		if (cols.length < 3) continue;

		// Column 2 is "Required Effect Types" — extract backtick tokens
		const docEffects = (cols[2].match(/`([^`]+)`/g) || [])
			.map((t) => t.replace(/`/g, "").replace(/\(.*\)/, "").trim())
			.sort();

		const codeCore = [...fn.coreEffects].sort();

		// Check that doc core effects match code core effects
		const missing = codeCore.filter((e) => !docEffects.includes(e));
		const extra = docEffects.filter((e) => !codeCore.includes(e) && !fn.amplifierEffects.includes(e));

		if (missing.length > 0) {
			error(file,
				`${fn.id}: doc missing core effects: ${missing.join(", ")} (code has: ${codeCore.join(", ")})`
			);
		}
		if (extra.length > 0) {
			warning(file,
				`${fn.id}: doc lists effects not in code core or amplifier: ${extra.join(", ")}`
			);
		}
	}

	// Check all platforms present
	for (const p of PLATFORMS) {
		if (!text.includes(p.book)) {
			warning(file, `Platform book '${p.book}' not found in doc`);
		}
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

verifyCategory();
verifyGraph();
verifyPath();
verifyChain();

// Print results
const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");

console.log("=== Domain Verification Report ===\n");

if (errors.length > 0) {
	console.log(`ERRORS (${errors.length}):`);
	for (const e of errors) {
		console.log(`  ✗ [${e.file}] ${e.message}`);
	}
	console.log();
}

if (warnings.length > 0) {
	console.log(`WARNINGS (${warnings.length}):`);
	for (const w of warnings) {
		console.log(`  ⚠ [${w.file}] ${w.message}`);
	}
	console.log();
}

if (issues.length === 0) {
	console.log("All checks passed. ✓\n");
}

console.log(`Summary: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length > 0 ? 1 : 0);
