#!/usr/bin/env bun
/**
 * gen-markdown.ts — export game.data.json to human-readable markdown files.
 *
 * Generates:
 *   data/raw/主书.export.md     (main skill books, per-school tables)
 *   data/raw/专属词缀.export.md  (exclusive affixes)
 *   data/raw/通用词缀.export.md  (universal affixes)
 *   data/raw/修为词缀.export.md  (school affixes)
 *
 * These are GENERATED files for human reading, not source of truth.
 * Source of truth: data/raw/game.data.json (edited via bun run editor)
 *
 * Usage:
 *   bun scripts/gen-markdown.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const jsonPath = resolve(ROOT, "data/raw/game.data.json");
const data = JSON.parse(readFileSync(jsonPath, "utf-8"));

const schoolOrder = ["Sword", "Spell", "Demon", "Body"];
const schoolCn: Record<string, string> = {
	Sword: "剑修",
	Spell: "法修",
	Demon: "魔修",
	Body: "体修",
};

// ── Helpers ─────────────────────────────────────────────

function textToBr(text: string): string {
	return text.replace(/\n/g, "<br>");
}

function effectsSummary(effects: object[]): string {
	return effects
		.map((e) => {
			const rec = e as Record<string, unknown>;
			const parts = [`type: ${rec.type}`];
			for (const [k, v] of Object.entries(rec)) {
				if (k === "type" || k === "data_state") continue;
				parts.push(`${k}=${JSON.stringify(v)}`);
			}
			const ds = rec.data_state;
			if (ds) {
				const dsStr = Array.isArray(ds) ? ds.join(", ") : String(ds);
				parts.push(`[${dsStr}]`);
			}
			return parts.join(" ");
		})
		.join("<br>");
}

// ── Main Books ──────────────────────────────────────────

function genMainBooks(): string {
	const lines: string[] = [
		"# 主书 — Divine Book Skills",
		"",
		"> Generated from game.data.json. Do not edit directly.",
		"> Edit via: `bun run editor` (port 3002)",
		"",
	];

	// Group books by school
	const bySchool: Record<string, [string, typeof data.books[string]][]> = {};
	for (const s of schoolOrder) bySchool[s] = [];
	for (const [name, book] of Object.entries(data.books) as [string, any][]) {
		const s = book.school;
		if (bySchool[s]) bySchool[s].push([name, book]);
	}

	for (const school of schoolOrder) {
		const books = bySchool[school];
		if (!books?.length) continue;

		const cn = schoolCn[school] ?? school;
		lines.push(`## ${cn}`, "");

		// Check if any book has xuan
		const hasXuan = books.some(([, b]) => b.xuan);

		if (hasXuan) {
			lines.push("| 功法书 | 功能 | 通玄 | 主词缀 |");
			lines.push("|-------|-----|------|-------|");
		} else {
			lines.push("| 功法书 | 功能 | 主词缀 |");
			lines.push("|-------|-----|-------|");
		}

		for (const [name, book] of books) {
			const skillText = textToBr(book.skill?.text ?? "");
			const affixText = book.primaryAffix
				? `【${book.primaryAffix.name}】：${textToBr(book.primaryAffix.text ?? "")}`
				: "";
			const xuanText = book.xuan ? textToBr(book.xuan.text ?? "") : "";

			if (hasXuan) {
				lines.push(`| \`${name}\` | ${skillText} | ${xuanText} | ${affixText} |`);
			} else {
				lines.push(`| \`${name}\` | ${skillText} | ${affixText} |`);
			}
		}

		lines.push("");
	}

	return lines.join("\n");
}

// ── Exclusive Affixes ───────────────────────────────────

function genExclusiveAffixes(): string {
	const lines: string[] = [
		"# 专属词缀 — Exclusive Affixes",
		"",
		"> Generated from game.data.json. Do not edit directly.",
		"",
		"| 功法 | 词缀名 | 效果 |",
		"| --- | --- | --- |",
	];

	for (const [name, book] of Object.entries(data.books) as [string, any][]) {
		if (!book.exclusiveAffix) continue;
		const affixName = book.exclusiveAffix.name;
		const text = textToBr(book.exclusiveAffix.text ?? "");
		lines.push(`| ${name} | 【${affixName}】 | ${text} |`);
	}

	return lines.join("\n");
}

// ── Universal Affixes ───────────────────────────────────

function genUniversalAffixes(): string {
	const lines: string[] = [
		"# 通用词缀 — Universal Affixes",
		"",
		"> Generated from game.data.json. Do not edit directly.",
		"",
		"| 词缀 | 效果描述 |",
		"| --- | --- |",
	];

	for (const [name, affix] of Object.entries(data.affixes.universal) as [string, any][]) {
		const text = textToBr(affix.text ?? "");
		lines.push(`| 【${name}】 | ${text} |`);
	}

	return lines.join("\n");
}

// ── School Affixes ──────────────────────────────────────

function genSchoolAffixes(): string {
	const lines: string[] = [
		"# 修为词缀 — School Affixes",
		"",
		"> Generated from game.data.json. Do not edit directly.",
		"",
	];

	for (const [school, affixes] of Object.entries(data.affixes.school) as [string, Record<string, any>][]) {
		lines.push(`#### ${school}`, "");
		lines.push("| 词缀 | 效果描述 |");
		lines.push("| --- | --- |");

		for (const [name, affix] of Object.entries(affixes)) {
			const text = textToBr(affix.text ?? "");
			lines.push(`| 【${name}】 | ${text} |`);
		}

		lines.push("");
	}

	return lines.join("\n");
}

// ── Write files ─────────────────────────────────────────

const outDir = resolve(ROOT, "data/raw");

const files = [
	{ name: "主书.export.md", content: genMainBooks() },
	{ name: "专属词缀.export.md", content: genExclusiveAffixes() },
	{ name: "通用词缀.export.md", content: genUniversalAffixes() },
	{ name: "修为词缀.export.md", content: genSchoolAffixes() },
];

for (const f of files) {
	const path = resolve(outDir, f.name);
	writeFileSync(path, `${f.content}\n`);
	console.log(`Written ${path}`);
}
