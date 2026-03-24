#!/usr/bin/env bun
/**
 * Dev server for the parser pipeline visualizer.
 * Serves the React app + API endpoints for per-book grammar parsing.
 *
 * Usage: bun app/parser-viz/serve.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import * as ohm from "ohm-js";
import { readMainSkillTables } from "../../lib/parser/md-table.js";

const port = Number(process.env.PORT ?? 3001);

// ── Load raw data ───────────────────────────────────────

const mainMd = readFileSync(resolve("data/raw/主书.md"), "utf-8");
const exclusiveMd = readFileSync(resolve("data/raw/专属词缀.md"), "utf-8");
const schoolMd = readFileSync(resolve("data/raw/修为词缀.md"), "utf-8");
const universalMd = readFileSync(resolve("data/raw/通用词缀.md"), "utf-8");
const bookEntries = readMainSkillTables(mainMd);

// Simple markdown table parser for affix files
function parseAffixTable(md: string, cols: number): string[][] {
	const rows: string[][] = [];
	for (const line of md.split("\n")) {
		if (!line.startsWith("|") || line.includes("---")) continue;
		const cells = line.split("|").slice(1, -1).map(c => c.trim());
		if (cells.length >= cols && !cells[0].match(/^词缀$|^功法$|^效果/)) rows.push(cells);
	}
	return rows;
}

// Parse exclusive affixes: | 功法 | 词缀 | 效果描述 |
const exclusiveEntries = parseAffixTable(exclusiveMd, 3).map(([book, name, text]) => ({
	bookName: book.replace(/`/g, ""),
	affixName: name.replace(/【|】/g, ""),
	rawText: text.replace(/<br\s*\/?>/gi, "\n"),
}));

// Parse school affixes: | 词缀 | 效果描述 |
const schoolSections = schoolMd.split(/^####\s+/m).slice(1);
const schoolEntries: { name: string; school: string; rawText: string }[] = [];
for (const section of schoolSections) {
	const school = section.split("\n")[0].trim();
	for (const [name, text] of parseAffixTable(section, 2)) {
		schoolEntries.push({ name: name.replace(/【|】/g, ""), school, rawText: text.replace(/<br\s*\/?>/gi, "\n") });
	}
}

// Parse universal affixes: | 词缀 | 效果描述 |
const universalEntries = parseAffixTable(universalMd, 2).map(([name, text]) => ({
	name: name.replace(/【|】/g, ""),
	rawText: text.replace(/<br\s*\/?>/gi, "\n"),
}));

// ── Load grammars ───────────────────────────────────────

const grammarsDir = resolve("lib/parser/grammars-v1");
const baseOhm = readFileSync(resolve(grammarsDir, "Base.ohm"), "utf-8");

function loadAllOhm(): string {
	const parts = [baseOhm];
	for (const f of readdirSync(resolve(grammarsDir, "books"))) {
		if (f.endsWith(".ohm")) parts.push(readFileSync(resolve(grammarsDir, "books", f), "utf-8"));
	}
	for (const f of readdirSync(resolve(grammarsDir, "affixes"))) {
		if (f.endsWith(".ohm")) parts.push(readFileSync(resolve(grammarsDir, "affixes", f), "utf-8"));
	}
	return parts.join("\n");
}

const compiledGrammars = ohm.grammars(loadAllOhm());

// ── Load semantic modules ───────────────────────────────

const semanticsDir = resolve("lib/parser/grammars/semantics");
const semanticModules: Record<string, { addSemantics: (s: ohm.Semantics) => void }> = {};

async function loadSemantics() {
	const files = readdirSync(semanticsDir).filter(f => f.endsWith(".ts") && f !== "shared.ts" && !f.includes("test"));
	for (const f of files) {
		const name = f.replace(".ts", "");
		try {
			semanticModules[name] = await import(resolve(semanticsDir, f));
		} catch (e) {
			console.warn(`Failed to load semantics for ${name}:`, (e as Error).message);
		}
	}
}

// ── Build parse tree description ────────────────────────

function describeTree(grammar: ohm.Grammar, match: ohm.MatchResult): object {
	const sem = grammar.createSemantics();
	sem.addOperation("toTree", {
		_nonterminal(...children: ohm.Node[]) {
			const childTrees = children.map((c: ohm.Node) => c.toTree()).filter((t: unknown) => t !== null);
			if (childTrees.length === 0) return { rule: this.ctorName, text: this.sourceString };
			return { rule: this.ctorName, children: childTrees };
		},
		_terminal() {
			const text = this.sourceString;
			if (text.length === 0) return null;
			return { rule: "_terminal", text };
		},
		_iter(...children: ohm.Node[]) {
			const childTrees = children.map((c: ohm.Node) => c.toTree()).filter((t: unknown) => t !== null);
			return childTrees.length > 0 ? childTrees : null;
		},
	});
	return sem(match).toTree();
}

// ── Read file content for display ───────────────────────

function readOhmFile(bookName: string): string {
	try { return readFileSync(resolve(grammarsDir, "books", `${bookName}.ohm`), "utf-8"); }
	catch { return `// No grammar file for ${bookName}`; }
}

function readSemanticsFile(bookName: string): string {
	try { return readFileSync(resolve(semanticsDir, `${bookName}.ts`), "utf-8"); }
	catch { return `// No semantics file for ${bookName}`; }
}

// ── Pre-build source data responses (for SourcePanel) ───

const booksResponse = JSON.stringify({
	entries: bookEntries.map((e) => ({
		name: e.name,
		school: e.school,
		skillText: e.skillText.replace(/<br\s*\/?>/gi, "\n"),
		affixText: e.affixText.replace(/<br\s*\/?>/gi, "\n"),
	})),
});

// ── API: parse using new grammar system ─────────────────

// Map school affix names → grammar names
const schoolAffixToGrammar: Record<string, string> = {};
for (const e of schoolEntries) {
	const grammarName = `修为词缀_${e.school}`;
	schoolAffixToGrammar[e.name] = grammarName;
}

function resolveGrammarName(sourceType: string, name: string): string {
	if (sourceType === "universal") return "通用词缀";
	if (sourceType === "school") return schoolAffixToGrammar[name] ?? name;
	return name; // skill and exclusive use book name directly
}

function handleParse(body: { sourceType: string; text: string; bookName?: string; entryPoint?: string }) {
	const rawName = body.bookName ?? "";
	const bookName = resolveGrammarName(body.sourceType, rawName);
	const entryPoint = body.entryPoint ?? (body.sourceType === "skill" ? "skillDescription" : "primaryAffix");

	const ohmSource = readOhmFile(bookName);
	const semanticsSource = readSemanticsFile(bookName);

	// Strip backticks, tier lines, and affix name prefix (【name】：)
	const cleanText = body.text
		.replace(/`/g, "")
		.split("\n")
		.filter(l => !l.match(/^悟\d|^融合|^此功能/))
		.join("")
		.replace(/^【[^】]+】[：:]/, "");

	const grammar = compiledGrammars[bookName];
	if (!grammar) {
		return { rawText: cleanText, ohmSource, semanticsSource, parseTree: null, effects: [], errors: [`No grammar for "${bookName}"`], tokens: [], groups: [], tiers: [], states: {} };
	}

	const match = grammar.match(cleanText, entryPoint);
	if (match.failed()) {
		return { rawText: cleanText, ohmSource, semanticsSource, parseTree: null, effects: [], errors: [match.shortMessage ?? "Parse failed"], tokens: [], groups: [], tiers: [], states: {} };
	}

	const parseTree = describeTree(grammar, match);

	let effects: object[] = [];
	let effectError: string | undefined;
	const semMod = semanticModules[bookName];
	if (semMod) {
		try {
			const sem = grammar.createSemantics();
			semMod.addSemantics(sem);
			effects = sem(match).toEffects();
		} catch (e) { effectError = (e as Error).message; }
	}

	return {
		rawText: cleanText,
		ohmSource,
		semanticsSource,
		parseTree,
		effects,
		errors: effectError ? [effectError] : [],
		// Compat fields for original components
		tokens: [],
		groups: [],
		tiers: [],
		states: {},
	};
}

// ── Server ──────────────────────────────────────────────

await loadSemantics();

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		// Parse API — new grammar pipeline
		if (path === "/api/parse" && req.method === "POST") {
			try {
				const body = await req.json();
				const result = handleParse(body);
				return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
			} catch (e) {
				return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { "Content-Type": "application/json" } });
			}
		}

		// Source data endpoints (for SourcePanel)
		if (path === "/api/sources/books") {
			return new Response(booksResponse, { headers: { "Content-Type": "application/json" } });
		}
		// Grammar file content
		if (path === "/api/ohm" && url.searchParams.get("book")) {
			const content = readOhmFile(url.searchParams.get("book")!);
			return new Response(JSON.stringify({ content }), { headers: { "Content-Type": "application/json" } });
		}

		if (path === "/api/sources/exclusive") {
			return new Response(JSON.stringify({ entries: exclusiveEntries }), { headers: { "Content-Type": "application/json" } });
		}
		if (path === "/api/sources/school") {
			return new Response(JSON.stringify({ entries: schoolEntries }), { headers: { "Content-Type": "application/json" } });
		}
		if (path === "/api/sources/universal") {
			return new Response(JSON.stringify({ entries: universalEntries }), { headers: { "Content-Type": "application/json" } });
		}

		// HTML
		if (path === "/" || path === "/index.html") {
			return new Response(Bun.file("app/parser-viz/index.html"));
		}

		// Bundle TSX/TS
		if (path.endsWith(".tsx") || path.endsWith(".ts")) {
			const filePath = `app/parser-viz${path}`;
			try {
				const result = await Bun.build({ entrypoints: [filePath], format: "esm", target: "browser", minify: false });
				if (result.success && result.outputs.length > 0) {
					return new Response(await result.outputs[0].text(), { headers: { "Content-Type": "application/javascript" } });
				}
				return new Response(`Build error: ${result.logs.join("\n")}`, { status: 500 });
			} catch (e) {
				return new Response(`Build error: ${(e as Error).message}`, { status: 500 });
			}
		}

		// Static files
		const filePath = `app/parser-viz${path}`;
		const file = Bun.file(filePath);
		if (await file.exists()) return new Response(file);

		return new Response("Not found", { status: 404 });
	},
});

console.log(`Parser-viz server running at http://localhost:${port}`);
