#!/usr/bin/env bun
/**
 * Parser viz server.
 * Pure app layer — all parsing logic comes from lib/parser.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	loadGrammars,
	getGrammar,
	getSemantics,
	readSource,
	buildParseTree,
	cleanText,
} from "../../lib/parser/index.js";
import { readMainSkillTables, splitCell } from "../../lib/parser/md-table.js";

const port = Number(process.env.PORT ?? 3001);

// ── Load data + grammars ────────────────────────────────

await loadGrammars();

const bookEntries = readMainSkillTables(readFileSync(resolve("data/raw/主书.md"), "utf-8"));

const exclusiveMap: Record<string, string> = {};
for (const l of readFileSync(resolve("data/raw/专属词缀.md"), "utf-8").split("\n")) {
	if (!l.startsWith("|") || l.includes("---") || l.includes("功法")) continue;
	const c = l.split("|").slice(1, -1).map(s => s.trim());
	if (c.length >= 3) exclusiveMap[c[0].replace(/`/g, "")] = c[2];
}

type AffixRaw = { name: string; text: string };
function parseAffixMd(md: string): Record<string, AffixRaw[]> {
	const result: Record<string, AffixRaw[]> = {};
	for (const sec of md.split(/^####\s+/m).slice(1)) {
		const school = sec.split("\n")[0].trim();
		result[school] = [];
		for (const l of sec.split("\n")) {
			if (!l.startsWith("|") || l.includes("---") || l.match(/^\|\s*词缀/)) continue;
			const c = l.split("|").slice(1, -1).map(s => s.trim());
			if (c.length >= 2) result[school].push({ name: c[0].replace(/【|】/g, ""), text: c[1].replace(/<br\s*\/?>/gi, "\n") });
		}
	}
	return result;
}

const schoolAffixData = parseAffixMd(readFileSync(resolve("data/raw/修为词缀.md"), "utf-8"));
const universalAffixData: AffixRaw[] = [];
for (const l of readFileSync(resolve("data/raw/通用词缀.md"), "utf-8").split("\n")) {
	if (!l.startsWith("|") || l.includes("---") || l.match(/^\|\s*词缀/)) continue;
	const c = l.split("|").slice(1, -1).map(s => s.trim());
	if (c.length >= 2) universalAffixData.push({ name: c[0].replace(/【|】/g, ""), text: c[1].replace(/<br\s*\/?>/gi, "\n") });
}

const schoolNameMap: Record<string, string> = { Sword: "剑修", Spell: "法修", Demon: "魔修", Body: "体修" };

// ── Parse helper (uses lib/parser) ──────────────────────

function vizParse(grammarName: string, rawText: string, entryPoint: string) {
	const g = getGrammar(grammarName);
	if (!g) return { raw: rawText, error: `No grammar: ${grammarName}` };

	const clean = cleanText(rawText);
	const m = g.match(clean, entryPoint);
	if (m.failed()) return { raw: clean, error: m.shortMessage ?? "Parse failed" };

	const tree = buildParseTree(g, m);

	let effects: object[] = [];
	let effectError: string | undefined;
	const mod = getSemantics(grammarName);
	if (mod) {
		try {
			const s = g.createSemantics();
			mod.addSemantics(s);
			effects = s(m).toEffects();
		} catch (e) { effectError = (e as Error).message; }
	} else effectError = `No semantics: ${grammarName}`;

	return { raw: clean, tree, effects, effectError };
}

function tierLines(raw: string): string[] {
	return raw.replace(/`/g, "").split("\n").filter(l => l.match(/^悟\d|^融合/));
}

// ── Server ──────────────────────────────────────────────

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		const p = url.pathname;

		if (p === "/api/books")
			return Response.json(bookEntries.map(e => ({ name: e.name, school: e.school })));

		if (p === "/api/schools")
			return Response.json(Object.keys(schoolAffixData));

		if (p.startsWith("/api/book/")) {
			const name = decodeURIComponent(p.slice(10));
			const e = bookEntries.find(b => b.name === name);
			if (!e) return Response.json({ error: "Not found" }, { status: 404 });
			// Pass raw text WITH <br> to splitCell — it splits on <br>
			const skillCell = splitCell(e.skillText);
			const affixCell = splitCell(e.affixText);
			const skillDesc = skillCell.description.join("");
			const affixDesc = affixCell.description.join("");
			return Response.json({
				grammar: name, ohmSource: readSource(name, ".ohm"), semSource: readSource(name, ".ts"),
				skill: vizParse(name, skillDesc, "skillDescription"),
				skillTiers: skillCell.tiers.map(t => t.raw),
				primary: affixDesc.trim() ? vizParse(name, affixDesc, "primaryAffix") : null,
				primaryTiers: affixCell.tiers.map(t => t.raw),
			});
		}

		if (p.startsWith("/api/exclusive/")) {
			const name = decodeURIComponent(p.slice(15));
			const raw = exclusiveMap[name] ?? "";
			if (!raw) return Response.json({ error: "Not found" }, { status: 404 });
			const cell = splitCell(raw);
			const desc = cell.description.reduce((a, l, i) => i === 0 ? l : a + (l.startsWith("【") ? "\n" : " ") + l, "");
			return Response.json({
				grammar: name, ohmSource: readSource(name, ".ohm"), semSource: readSource(name, ".ts"),
				exclusive: vizParse(name, desc, "exclusiveAffix"),
				exclusiveTiers: cell.tiers.map(t => t.raw),
			});
		}

		if (p.startsWith("/api/school/")) {
			const school = decodeURIComponent(p.slice(12));
			const affixes = schoolAffixData[school] ?? [];
			const grammar = `修为词缀_${school}`;
			return Response.json({
				grammar, ohmSource: readSource(grammar, ".ohm"), semSource: readSource(grammar, ".ts"),
				affixes: affixes.map(a => {
					const cell = splitCell(a.text);
					return { name: a.name, ...vizParse(grammar, cell.description.join(""), "affixDescription"), tiers: tierLines(a.text) };
				}),
			});
		}

		if (p === "/api/common") {
			const grammar = "通用词缀";
			return Response.json({
				grammar, ohmSource: readSource(grammar, ".ohm"), semSource: readSource(grammar, ".ts"),
				affixes: universalAffixData.map(a => {
					const cell = splitCell(a.text);
					return { name: a.name, ...vizParse(grammar, cell.description.join(""), "affixDescription"), tiers: tierLines(a.text) };
				}),
			});
		}

		if (p === "/" || p === "/index.html") return new Response(Bun.file("app/parser-viz/index.html"));
		if (p.endsWith(".tsx") || p.endsWith(".ts")) {
			try {
				const r = await Bun.build({ entrypoints: [`app/parser-viz${p}`], format: "esm", target: "browser", minify: false });
				if (r.success && r.outputs.length) return new Response(await r.outputs[0].text(), { headers: { "Content-Type": "application/javascript" } });
			} catch {}
			return new Response("Build error", { status: 500 });
		}
		const f = Bun.file(`app/parser-viz${p}`);
		if (await f.exists()) return new Response(f);
		return new Response("Not found", { status: 404 });
	},
});
console.log(`Parser viz: http://localhost:${port}`);
