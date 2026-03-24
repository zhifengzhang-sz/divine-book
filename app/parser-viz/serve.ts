#!/usr/bin/env bun
/**
 * Parser viz server — serves one API endpoint per book.
 * Returns everything about a book in a single response:
 * grammar source, semantics source, and parse results for all entry points.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import * as ohm from "ohm-js";
import { readMainSkillTables } from "../../lib/parser/md-table.js";

const port = Number(process.env.PORT ?? 3001);
const grammarsDir = resolve("lib/parser/grammars-v1");
const semanticsDir = resolve("lib/parser/grammars/semantics");

// ── Load data ───────────────────────────────────────────

const mainMd = readFileSync(resolve("data/raw/主书.md"), "utf-8");
const exclusiveMd = readFileSync(resolve("data/raw/专属词缀.md"), "utf-8");
const bookEntries = readMainSkillTables(mainMd);

// Parse exclusive affixes from markdown
const exclusiveMap: Record<string, string> = {};
for (const line of exclusiveMd.split("\n")) {
	if (!line.startsWith("|") || line.includes("---") || line.includes("功法")) continue;
	const cells = line.split("|").slice(1, -1).map(c => c.trim());
	if (cells.length >= 3) {
		const bookName = cells[0].replace(/`/g, "");
		exclusiveMap[bookName] = cells[2].replace(/<br\s*\/?>/gi, "\n");
	}
}

// ── Load grammars ───────────────────────────────────────

const allOhm = [
	readFileSync(resolve(grammarsDir, "Base.ohm"), "utf-8"),
	...readdirSync(resolve(grammarsDir, "books")).filter(f => f.endsWith(".ohm")).map(f => readFileSync(resolve(grammarsDir, "books", f), "utf-8")),
	...readdirSync(resolve(grammarsDir, "affixes")).filter(f => f.endsWith(".ohm")).map(f => readFileSync(resolve(grammarsDir, "affixes", f), "utf-8")),
].join("\n");
const grammars = ohm.grammars(allOhm);

// ── Load semantics ──────────────────────────────────────

const semModules: Record<string, { addSemantics: (s: ohm.Semantics) => void }> = {};
const semFiles = readdirSync(semanticsDir).filter(f => f.endsWith(".ts") && f !== "shared.ts" && !f.includes("test"));
await Promise.all(semFiles.map(async f => {
	const name = f.replace(".ts", "");
	try { semModules[name] = await import(resolve(semanticsDir, f)); } catch {}
}));

// ── Helpers ─────────────────────────────────────────────

function readFile(dir: string, name: string, ext: string): string | null {
	for (const sub of ["books", "affixes", ""]) {
		const p = sub ? resolve(dir, sub, `${name}${ext}`) : resolve(dir, `${name}${ext}`);
		if (existsSync(p)) return readFileSync(p, "utf-8");
	}
	return null;
}

function cleanText(raw: string): string {
	return raw
		.replace(/`/g, "")
		.split("\n")
		.filter(l => !l.match(/^悟\d|^融合|^此功能/))
		.join("")
		.replace(/^【[^】]+】[：:]/, "");
}

function buildTree(grammar: ohm.Grammar, match: ohm.MatchResult): object {
	const s = grammar.createSemantics();
	s.addOperation("toTree", {
		_nonterminal(...ch: ohm.Node[]) {
			const kids = ch.map(c => c.toTree()).filter(Boolean);
			return kids.length === 0
				? { rule: this.ctorName, text: this.sourceString }
				: { rule: this.ctorName, children: kids };
		},
		_terminal() { return this.sourceString.length > 0 ? { rule: "_", text: this.sourceString } : null; },
		_iter(...ch: ohm.Node[]) { const kids = ch.map(c => c.toTree()).filter(Boolean); return kids.length > 0 ? kids : null; },
	});
	return s(match).toTree();
}

function parseEntry(grammarName: string, text: string, entryPoint: string) {
	const grammar = grammars[grammarName];
	if (!grammar) return { raw: text, error: `No grammar: ${grammarName}` };

	const clean = cleanText(text);
	const match = grammar.match(clean, entryPoint);
	if (match.failed()) return { raw: clean, error: match.shortMessage ?? "Parse failed" };

	const tree = buildTree(grammar, match);
	let effects: object[] = [];
	let effectError: string | undefined;
	const mod = semModules[grammarName];
	if (mod) {
		try {
			const s = grammar.createSemantics();
			mod.addSemantics(s);
			effects = s(match).toEffects();
		} catch (e) { effectError = (e as Error).message; }
	} else { effectError = `No semantics: ${grammarName}`; }

	return { raw: clean, tree, effects, effectError };
}

// ── API ─────────────────────────────────────────────────

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		// GET /api/books — list all books
		if (path === "/api/books") {
			return Response.json(bookEntries.map(e => ({
				name: e.name,
				school: e.school,
			})));
		}

		// GET /api/book/:name — everything about one book
		if (path.startsWith("/api/book/")) {
			const name = decodeURIComponent(path.slice("/api/book/".length));
			const entry = bookEntries.find(e => e.name === name);
			if (!entry) return Response.json({ error: `Book not found: ${name}` }, { status: 404 });

			const skillText = entry.skillText.replace(/<br\s*\/?>/gi, "\n");
			const affixText = entry.affixText.replace(/<br\s*\/?>/gi, "\n");
			const exclusiveText = exclusiveMap[name] ?? "";

			const ohmSource = readFile(grammarsDir, name, ".ohm");
			const semSource = readFile(semanticsDir, name, ".ts");

			const skill = parseEntry(name, skillText, "skillDescription");
			const primary = affixText.trim() ? parseEntry(name, affixText, "primaryAffix") : null;
			const exclusive = exclusiveText.trim() ? parseEntry(name, exclusiveText, "exclusiveAffix") : null;

			return Response.json({
				name, school: entry.school,
				ohmSource, semSource,
				skill, primary, exclusive,
			});
		}

		// HTML
		if (path === "/" || path === "/index.html") return new Response(Bun.file("app/parser-viz/index.html"));

		// Bundle TSX/TS
		if (path.endsWith(".tsx") || path.endsWith(".ts")) {
			const filePath = `app/parser-viz${path}`;
			try {
				const result = await Bun.build({ entrypoints: [filePath], format: "esm", target: "browser", minify: false });
				if (result.success && result.outputs.length > 0) return new Response(await result.outputs[0].text(), { headers: { "Content-Type": "application/javascript" } });
			} catch {}
			return new Response("Build error", { status: 500 });
		}

		// Static
		const file = Bun.file(`app/parser-viz${path}`);
		if (await file.exists()) return new Response(file);
		return new Response("Not found", { status: 404 });
	},
});

console.log(`Parser viz: http://localhost:${port}`);
