#!/usr/bin/env bun
/**
 * Parser viz server.
 * GET /api/books — list books
 * GET /api/book/:name — everything about one book (grammar, semantics, all parse results, shared affixes)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import * as ohm from "ohm-js";
import { readMainSkillTables } from "../../lib/parser/md-table.js";

const port = Number(process.env.PORT ?? 3001);
const grammarsDir = resolve("lib/parser/grammars-v1");
const semanticsDir = resolve("lib/parser/grammars/semantics");

// ── Data ────────────────────────────────────────────────

const mainMd = readFileSync(resolve("data/raw/主书.md"), "utf-8");
const exclusiveMd = readFileSync(resolve("data/raw/专属词缀.md"), "utf-8");
const universalMd = readFileSync(resolve("data/raw/通用词缀.md"), "utf-8");
const schoolMd = readFileSync(resolve("data/raw/修为词缀.md"), "utf-8");

const bookEntries = readMainSkillTables(mainMd);

// Exclusive affix per book
const exclusiveMap: Record<string, string> = {};
for (const line of exclusiveMd.split("\n")) {
	if (!line.startsWith("|") || line.includes("---") || line.includes("功法")) continue;
	const cells = line.split("|").slice(1, -1).map(c => c.trim());
	if (cells.length >= 3) exclusiveMap[cells[0].replace(/`/g, "")] = cells[2].replace(/<br\s*\/?>/gi, "\n");
}

// Universal affixes (name → raw text)
const universalAffixes: { name: string; text: string }[] = [];
for (const line of universalMd.split("\n")) {
	if (!line.startsWith("|") || line.includes("---") || line.match(/^\|\s*词缀\s*\||^\|\s*效果/)) continue;
	const cells = line.split("|").slice(1, -1).map(c => c.trim());
	if (cells.length >= 2) universalAffixes.push({ name: cells[0].replace(/【|】/g, ""), text: cells[1].replace(/<br\s*\/?>/gi, "\n") });
}

// School affixes per school
const schoolMap: Record<string, string> = { Sword: "剑修", Spell: "法修", Demon: "魔修", Body: "体修" };
const schoolAffixes: Record<string, { name: string; text: string }[]> = {};
for (const section of schoolMd.split(/^####\s+/m).slice(1)) {
	const school = section.split("\n")[0].trim();
	schoolAffixes[school] = [];
	for (const line of section.split("\n")) {
		if (!line.startsWith("|") || line.includes("---") || line.match(/^\|\s*词缀\s*\||^\|\s*效果/)) continue;
		const cells = line.split("|").slice(1, -1).map(c => c.trim());
		if (cells.length >= 2) schoolAffixes[school].push({ name: cells[0].replace(/【|】/g, ""), text: cells[1].replace(/<br\s*\/?>/gi, "\n") });
	}
}

// ── Grammars ────────────────────────────────────────────

const allOhm = [
	readFileSync(resolve(grammarsDir, "Base.ohm"), "utf-8"),
	...readdirSync(resolve(grammarsDir, "books")).filter(f => f.endsWith(".ohm")).map(f => readFileSync(resolve(grammarsDir, "books", f), "utf-8")),
	...readdirSync(resolve(grammarsDir, "affixes")).filter(f => f.endsWith(".ohm")).map(f => readFileSync(resolve(grammarsDir, "affixes", f), "utf-8")),
].join("\n");
const grammars = ohm.grammars(allOhm);

// ── Semantics ───────────────────────────────────────────

const semModules: Record<string, { addSemantics: (s: ohm.Semantics) => void }> = {};
await Promise.all(
	readdirSync(semanticsDir)
		.filter(f => f.endsWith(".ts") && f !== "shared.ts" && !f.includes("test"))
		.map(async f => { try { semModules[f.replace(".ts", "")] = await import(resolve(semanticsDir, f)); } catch {} })
);

// ── Helpers ─────────────────────────────────────────────

function readSource(name: string, ext: string): string | null {
	for (const sub of ["books", "affixes", ""]) {
		const dir = ext === ".ohm" ? grammarsDir : semanticsDir;
		const p = sub ? resolve(dir, sub, `${name}${ext}`) : resolve(dir, `${name}${ext}`);
		if (existsSync(p)) return readFileSync(p, "utf-8");
	}
	return null;
}

function clean(raw: string): string {
	return raw.replace(/`/g, "").split("\n").filter(l => !l.match(/^悟\d|^融合|^此功能/)).join("").replace(/^【[^】]+】[：:]/, "");
}

function buildTree(g: ohm.Grammar, m: ohm.MatchResult): object {
	const s = g.createSemantics();
	s.addOperation("t", {
		_nonterminal(...ch: ohm.Node[]) { const k = ch.map(c => c.t()).filter(Boolean); return k.length ? { r: this.ctorName, c: k } : { r: this.ctorName, t: this.sourceString }; },
		_terminal() { return this.sourceString.length > 0 ? { r: "_", t: this.sourceString } : null; },
		_iter(...ch: ohm.Node[]) { const k = ch.map(c => c.t()).filter(Boolean); return k.length ? k : null; },
	});
	return s(m).t();
}

function parse(grammarName: string, text: string, entryPoint: string) {
	const g = grammars[grammarName];
	if (!g) return { raw: text, error: `No grammar: ${grammarName}` };
	const c = clean(text);
	const m = g.match(c, entryPoint);
	if (m.failed()) return { raw: c, error: m.shortMessage ?? "Parse failed" };
	const tree = buildTree(g, m);
	let effects: object[] = [];
	let effectError: string | undefined;
	const mod = semModules[grammarName];
	if (mod) { try { const s = g.createSemantics(); mod.addSemantics(s); effects = s(m).toEffects(); } catch (e) { effectError = (e as Error).message; } }
	else effectError = `No semantics: ${grammarName}`;
	return { raw: c, tree, effects, effectError };
}

// ── Server ──────────────────────────────────────────────

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		if (path === "/api/books") {
			return Response.json(bookEntries.map(e => ({ name: e.name, school: e.school })));
		}

		if (path.startsWith("/api/book/")) {
			const name = decodeURIComponent(path.slice("/api/book/".length));
			const entry = bookEntries.find(e => e.name === name);
			if (!entry) return Response.json({ error: `Not found: ${name}` }, { status: 404 });

			const skillText = entry.skillText.replace(/<br\s*\/?>/gi, "\n");
			const affixText = entry.affixText.replace(/<br\s*\/?>/gi, "\n");
			const exclText = exclusiveMap[name] ?? "";

			// Book-specific parses
			const skill = parse(name, skillText, "skillDescription");
			const primary = affixText.trim() ? parse(name, affixText, "primaryAffix") : null;
			const exclusive = exclText.trim() ? parse(name, exclText, "exclusiveAffix") : null;

			// School affixes for this book's school
			const cnSchool = schoolMap[entry.school] ?? "";
			const schoolGrammar = `修为词缀_${cnSchool}`;
			const schoolItems = (schoolAffixes[cnSchool] ?? []).map(a => ({
				name: a.name,
				...parse(schoolGrammar, a.text, "affixDescription"),
			}));

			// Universal affixes
			const universalItems = universalAffixes.map(a => ({
				name: a.name,
				...parse("通用词缀", a.text, "affixDescription"),
			}));

			return Response.json({
				name, school: entry.school,
				ohmSource: readSource(name, ".ohm"),
				semSource: readSource(name, ".ts"),
				skill, primary, exclusive,
				schoolAffixes: { grammar: schoolGrammar, ohmSource: readSource(schoolGrammar, ".ohm"), items: schoolItems },
				universalAffixes: { grammar: "通用词缀", ohmSource: readSource("通用词缀", ".ohm"), items: universalItems },
			});
		}

		if (path === "/" || path === "/index.html") return new Response(Bun.file("app/parser-viz/index.html"));
		if (path.endsWith(".tsx") || path.endsWith(".ts")) {
			try {
				const r = await Bun.build({ entrypoints: [`app/parser-viz${path}`], format: "esm", target: "browser", minify: false });
				if (r.success && r.outputs.length) return new Response(await r.outputs[0].text(), { headers: { "Content-Type": "application/javascript" } });
			} catch {}
			return new Response("Build error", { status: 500 });
		}
		const file = Bun.file(`app/parser-viz${path}`);
		if (await file.exists()) return new Response(file);
		return new Response("Not found", { status: 404 });
	},
});

console.log(`Parser viz: http://localhost:${port}`);
