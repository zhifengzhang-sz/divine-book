import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import * as ohm from "ohm-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const baseOhm = readFileSync(resolve(__dirname, "Base.ohm"), "utf-8");
const fabaoOhm = readFileSync(resolve(__dirname, "法宝.ohm"), "utf-8");
const grammars = ohm.grammars(baseOhm + "\n" + fabaoOhm);
const grammar = grammars["法宝"];

// Strip frontmatter (--- ... ---) and ## 基础属性 header
function stripFrontmatter(md: string): string {
	// Remove YAML frontmatter
	let body = md.replace(/^---[\s\S]*?---\n*/, "");
	// Remove ## 基础属性 header line
	body = body.replace(/^## 基础属性\n+/, "");
	return body;
}

describe("法宝 grammar", () => {
	it("parses 芭蕉扇", () => {
		const raw = readFileSync(resolve(__dirname, "../../../data/raw/法宝/芭蕉扇.md"), "utf-8");
		const body = stripFrontmatter(raw);
		const match = grammar.match(body, "document");
		if (match.failed()) console.error("芭蕉扇:", match.shortMessage);
		expect(match.succeeded()).toBe(true);
	});

	it("parses 混铁叉", () => {
		const raw = readFileSync(resolve(__dirname, "../../../data/raw/法宝/混铁叉.md"), "utf-8");
		const body = stripFrontmatter(raw);
		const match = grammar.match(body, "document");
		if (match.failed()) console.error("混铁叉:", match.shortMessage);
		expect(match.succeeded()).toBe(true);
	});
});
