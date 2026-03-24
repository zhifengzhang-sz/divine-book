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
const bookEntries = readMainSkillTables(mainMd);

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
			const childTrees = children
				.map((c: ohm.Node) => c.toTree())
				.filter((t: unknown) => t !== null);
			if (childTrees.length === 0) {
				return { rule: this.ctorName, text: this.sourceString };
			}
			return { rule: this.ctorName, children: childTrees };
		},
		_terminal() {
			const text = this.sourceString;
			if (text.length === 0) return null;
			return { rule: "_terminal", text };
		},
		_iter(...children: ohm.Node[]) {
			const childTrees = children
				.map((c: ohm.Node) => c.toTree())
				.filter((t: unknown) => t !== null);
			return childTrees.length > 0 ? childTrees : null;
		},
	});
	return sem(match).toTree();
}

// ── Read .ohm and .ts file content ──────────────────────

function readOhmFile(bookName: string): string {
	try {
		return readFileSync(resolve(grammarsDir, "books", `${bookName}.ohm`), "utf-8");
	} catch {
		return `// No grammar file found for ${bookName}`;
	}
}

function readSemanticsFile(bookName: string): string {
	try {
		return readFileSync(resolve(semanticsDir, `${bookName}.ts`), "utf-8");
	} catch {
		return `// No semantics file found for ${bookName}`;
	}
}

// ── API: parse a book ───────────────────────────────────

interface ParseRequest {
	bookName: string;
	entryPoint: "skillDescription" | "primaryAffix" | "exclusiveAffix";
	text: string;
}

interface ParseResponse {
	bookName: string;
	entryPoint: string;
	rawText: string;
	ohmSource: string;
	semanticsSource: string;
	parseSucceeded: boolean;
	parseError?: string;
	parseTree?: object;
	effects?: object[];
	effectError?: string;
}

function handleParse(body: ParseRequest): ParseResponse {
	const { bookName, entryPoint, text } = body;

	const ohmSource = readOhmFile(bookName);
	const semanticsSource = readSemanticsFile(bookName);

	const grammar = compiledGrammars[bookName];
	if (!grammar) {
		return {
			bookName, entryPoint, rawText: text, ohmSource, semanticsSource,
			parseSucceeded: false, parseError: `No grammar found for "${bookName}"`,
		};
	}

	const match = grammar.match(text, entryPoint);
	if (match.failed()) {
		return {
			bookName, entryPoint, rawText: text, ohmSource, semanticsSource,
			parseSucceeded: false, parseError: match.shortMessage ?? "Parse failed",
		};
	}

	// Parse tree
	const parseTree = describeTree(grammar, match);

	// Effects
	let effects: object[] | undefined;
	let effectError: string | undefined;
	const semMod = semanticModules[bookName];
	if (semMod) {
		try {
			const sem = grammar.createSemantics();
			semMod.addSemantics(sem);
			effects = sem(match).toEffects();
		} catch (e) {
			effectError = (e as Error).message;
		}
	} else {
		effectError = `No semantics module loaded for "${bookName}"`;
	}

	return {
		bookName, entryPoint, rawText: text, ohmSource, semanticsSource,
		parseSucceeded: true, parseTree, effects, effectError,
	};
}

// ── Server ──────────────────────────────────────────────

await loadSemantics();

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		// Parse API
		if (path === "/api/parse" && req.method === "POST") {
			try {
				const body = await req.json() as ParseRequest;
				const result = handleParse(body);
				return new Response(JSON.stringify(result), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (e) {
				return new Response(JSON.stringify({ error: (e as Error).message }), {
					status: 400, headers: { "Content-Type": "application/json" },
				});
			}
		}

		// Book list API
		if (path === "/api/books") {
			const books = bookEntries.map(e => ({
				name: e.name,
				school: e.school,
				skillText: e.skillText.replace(/<br\s*\/?>/gi, "\n"),
				affixText: e.affixText.replace(/<br\s*\/?>/gi, "\n"),
			}));
			return new Response(JSON.stringify({ books }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Grammar file content API
		if (path === "/api/ohm" && url.searchParams.get("book")) {
			const content = readOhmFile(url.searchParams.get("book")!);
			return new Response(JSON.stringify({ content }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// HTML
		if (path === "/" || path === "/index.html") {
			return new Response(Bun.file("app/parser-viz/index.html"));
		}

		// Bundle TSX/TS
		if (path.endsWith(".tsx") || path.endsWith(".ts")) {
			const filePath = `app/parser-viz${path}`;
			try {
				const result = await Bun.build({
					entrypoints: [filePath],
					format: "esm",
					target: "browser",
					minify: false,
				});
				if (result.success && result.outputs.length > 0) {
					const code = await result.outputs[0].text();
					return new Response(code, {
						headers: { "Content-Type": "application/javascript" },
					});
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
