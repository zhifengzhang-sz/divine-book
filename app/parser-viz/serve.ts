#!/usr/bin/env bun
/**
 * Parser viz server.
 *
 * 4 endpoints matching 4 sections:
 *   GET /api/books            → book list
 *   GET /api/book/:name       → skill + primaryAffix
 *   GET /api/exclusive/:book  → exclusiveAffix
 *   GET /api/schools          → school list
 *   GET /api/school/:school   → school affixes
 *   GET /api/common           → universal affixes
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ohm from "ohm-js";
import { readMainSkillTables } from "../../lib/parser/md-table.js";

const port = Number(process.env.PORT ?? 3001);
const GD = resolve("lib/parser/grammars-v1"); // grammars dir
const SD = resolve("lib/parser/grammars/semantics"); // semantics dir

// ── Raw data ────────────────────────────────────────────

const bookEntries = readMainSkillTables(
	readFileSync(resolve("data/raw/主书.md"), "utf-8"),
);

const exclusiveMap: Record<string, string> = {};
for (const l of readFileSync(resolve("data/raw/专属词缀.md"), "utf-8").split(
	"\n",
)) {
	if (!l.startsWith("|") || l.includes("---") || l.includes("功法")) continue;
	const c = l
		.split("|")
		.slice(1, -1)
		.map((s) => s.trim());
	if (c.length >= 3)
		exclusiveMap[c[0].replace(/`/g, "")] = c[2].replace(/<br\s*\/?>/gi, "\n");
}

type AffixRaw = { name: string; text: string };
function parseAffixMd(md: string): Record<string, AffixRaw[]> {
	const result: Record<string, AffixRaw[]> = {};
	for (const sec of md.split(/^####\s+/m).slice(1)) {
		const school = sec.split("\n")[0].trim();
		result[school] = [];
		for (const l of sec.split("\n")) {
			if (!l.startsWith("|") || l.includes("---") || l.match(/^\|\s*词缀/))
				continue;
			const c = l
				.split("|")
				.slice(1, -1)
				.map((s) => s.trim());
			if (c.length >= 2)
				result[school].push({
					name: c[0].replace(/【|】/g, ""),
					text: c[1].replace(/<br\s*\/?>/gi, "\n"),
				});
		}
	}
	return result;
}

const schoolAffixData = parseAffixMd(
	readFileSync(resolve("data/raw/修为词缀.md"), "utf-8"),
);
const universalAffixData: AffixRaw[] = [];
for (const l of readFileSync(resolve("data/raw/通用词缀.md"), "utf-8").split(
	"\n",
)) {
	if (!l.startsWith("|") || l.includes("---") || l.match(/^\|\s*词缀/))
		continue;
	const c = l
		.split("|")
		.slice(1, -1)
		.map((s) => s.trim());
	if (c.length >= 2)
		universalAffixData.push({
			name: c[0].replace(/【|】/g, ""),
			text: c[1].replace(/<br\s*\/?>/gi, "\n"),
		});
}

const _schoolNameMap: Record<string, string> = {
	Sword: "剑修",
	Spell: "法修",
	Demon: "魔修",
	Body: "体修",
};

// ── Grammars + Semantics ────────────────────────────────

const allOhm = [
	readFileSync(resolve(GD, "Base.ohm"), "utf-8"),
	...readdirSync(resolve(GD, "books"))
		.filter((f) => f.endsWith(".ohm"))
		.map((f) => readFileSync(resolve(GD, "books", f), "utf-8")),
	...readdirSync(resolve(GD, "affixes"))
		.filter((f) => f.endsWith(".ohm"))
		.map((f) => readFileSync(resolve(GD, "affixes", f), "utf-8")),
].join("\n");
const grammars = ohm.grammars(allOhm);

const semMods: Record<string, any> = {};
await Promise.all(
	readdirSync(SD)
		.filter(
			(f) => f.endsWith(".ts") && f !== "shared.ts" && !f.includes("test"),
		)
		.map(async (f) => {
			try {
				semMods[f.replace(".ts", "")] = await import(resolve(SD, f));
			} catch {}
		}),
);

// ── Helpers ─────────────────────────────────────────────

function src(name: string, ext: string): string | null {
	for (const sub of ["books", "affixes", ""]) {
		const dir = ext === ".ohm" ? GD : SD;
		const p = sub
			? resolve(dir, sub, `${name}${ext}`)
			: resolve(dir, `${name}${ext}`);
		if (existsSync(p)) return readFileSync(p, "utf-8");
	}
	return null;
}

function clean(raw: string): string {
	return raw
		.replace(/`/g, "")
		.split("\n")
		.filter((l) => !l.match(/^悟\d|^融合|^此功能/))
		.join("")
		.replace(/^【[^】]+】[：:]/, "");
}

function tierLines(raw: string): string[] {
	return raw
		.replace(/`/g, "")
		.split("\n")
		.filter((l) => l.match(/^悟\d|^融合/));
}

function tree(g: ohm.Grammar, m: ohm.MatchResult): object {
	const s = g.createSemantics();
	// biome-ignore lint: tree builder returns mixed types
	s.addOperation<any>("t", {
		_nonterminal(...c: ohm.Node[]) {
			const k = c.map((x) => x.t()).filter(Boolean);
			return k.length
				? { r: this.ctorName, c: k }
				: { r: this.ctorName, t: this.sourceString };
		},
		_terminal() {
			return this.sourceString.length > 0
				? { r: "_", t: this.sourceString }
				: null;
		},
		_iter(...c: ohm.Node[]) {
			const k = c.map((x) => x.t()).filter(Boolean);
			return k.length ? k : null;
		},
	});
	return s(m).t();
}

function parse(grammarName: string, rawText: string, entryPoint: string) {
	const g = grammars[grammarName];
	if (!g) return { raw: rawText, error: `No grammar: ${grammarName}` };
	const c = clean(rawText);
	const m = g.match(c, entryPoint);
	if (m.failed()) return { raw: c, error: m.shortMessage ?? "Parse failed" };
	const t = tree(g, m);
	let effects: object[] = [];
	let effectError: string | undefined;
	const mod = semMods[grammarName];
	if (mod) {
		try {
			const s = g.createSemantics();
			mod.addSemantics(s);
			effects = s(m).toEffects();
		} catch (e) {
			effectError = (e as Error).message;
		}
	} else effectError = `No semantics: ${grammarName}`;
	return { raw: c, tree: t, effects, effectError };
}

// ── Server ──────────────────────────────────────────────

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		const p = url.pathname;

		// Book list
		if (p === "/api/books")
			return Response.json(
				bookEntries.map((e) => ({ name: e.name, school: e.school })),
			);

		// School list
		if (p === "/api/schools")
			return Response.json(Object.keys(schoolAffixData));

		// § 1 Main book: skill + primaryAffix
		if (p.startsWith("/api/book/")) {
			const name = decodeURIComponent(p.slice(10));
			const e = bookEntries.find((b) => b.name === name);
			if (!e) return Response.json({ error: "Not found" }, { status: 404 });
			const skillRaw = e.skillText.replace(/<br\s*\/?>/gi, "\n");
			const affixRaw = e.affixText.replace(/<br\s*\/?>/gi, "\n");
			return Response.json({
				grammar: name,
				ohmSource: src(name, ".ohm"),
				semSource: src(name, ".ts"),
				skill: parse(name, skillRaw, "skillDescription"),
				skillTiers: tierLines(skillRaw),
				primary: affixRaw.trim() ? parse(name, affixRaw, "primaryAffix") : null,
				primaryTiers: affixRaw.trim() ? tierLines(affixRaw) : [],
			});
		}

		// § 2 Exclusive affix
		if (p.startsWith("/api/exclusive/")) {
			const name = decodeURIComponent(p.slice(15));
			const raw = exclusiveMap[name] ?? "";
			if (!raw) return Response.json({ error: "Not found" }, { status: 404 });
			return Response.json({
				grammar: name,
				ohmSource: src(name, ".ohm"),
				semSource: src(name, ".ts"),
				exclusive: parse(name, raw, "exclusiveAffix"),
				exclusiveTiers: tierLines(raw),
			});
		}

		// § 3 School affixes
		if (p.startsWith("/api/school/")) {
			const school = decodeURIComponent(p.slice(12));
			const affixes = schoolAffixData[school] ?? [];
			const grammar = `修为词缀_${school}`;
			return Response.json({
				grammar,
				ohmSource: src(grammar, ".ohm"),
				semSource: src(grammar, ".ts"),
				affixes: affixes.map((a) => ({
					name: a.name,
					...parse(grammar, a.text, "affixDescription"),
					tiers: tierLines(a.text),
				})),
			});
		}

		// § 4 Common affixes
		if (p === "/api/common") {
			const grammar = "通用词缀";
			return Response.json({
				grammar,
				ohmSource: src(grammar, ".ohm"),
				semSource: src(grammar, ".ts"),
				affixes: universalAffixData.map((a) => ({
					name: a.name,
					...parse(grammar, a.text, "affixDescription"),
					tiers: tierLines(a.text),
				})),
			});
		}

		// Static
		if (p === "/" || p === "/index.html")
			return new Response(Bun.file("app/parser-viz/index.html"));
		if (p.endsWith(".tsx") || p.endsWith(".ts")) {
			try {
				const r = await Bun.build({
					entrypoints: [`app/parser-viz${p}`],
					format: "esm",
					target: "browser",
					minify: false,
				});
				if (r.success && r.outputs.length)
					return new Response(await r.outputs[0].text(), {
						headers: { "Content-Type": "application/javascript" },
					});
			} catch {}
			return new Response("Build error", { status: 500 });
		}
		const f = Bun.file(`app/parser-viz${p}`);
		if (await f.exists()) return new Response(f);
		return new Response("Not found", { status: 404 });
	},
});
console.log(`Parser viz: http://localhost:${port}`);
