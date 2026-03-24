/**
 * Semantics test — validates grammar → effect type mapping.
 */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ohm from "ohm-js";
import { addSemantics as add千锋聚灵剑 } from "./千锋聚灵剑.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function load(path: string): string {
	return readFileSync(resolve(__dirname, path), "utf-8");
}

// Load grammar
const grammars = ohm.grammars(
	[
		load("../../grammars-v1/Base.ohm"),
		load("../../grammars-v1/books/千锋聚灵剑.ohm"),
	].join("\n"),
);

describe("千锋聚灵剑 semantics", () => {
	const grammar = grammars["千锋聚灵剑"];
	const sem = grammar.createSemantics();
	add千锋聚灵剑(sem);

	it("skill → BaseAttack + PercentMaxHpDamage", () => {
		const raw =
			"剑破天地，对范围内目标造成六段共计x%攻击力的灵法伤害，并每段攻击造成目标y%最大气血值的伤害（对怪物伤害不超过自身z%攻击力）";
		const match = grammar.match(raw, "skillDescription");
		expect(match.succeeded()).toBe(true);

		const effects = sem(match).toEffects();
		expect(effects).toEqual([
			{ type: "base_attack", hits: 6, total: "x" },
			{
				type: "percent_max_hp_damage",
				value: "y",
				cap_vs_monster: "z",
			},
		]);
	});

	it("primaryAffix → PerHitEscalation", () => {
		const raw = "本神通每段攻击造成伤害后，下一段提升x%神通加成";
		const match = grammar.match(raw, "primaryAffix");
		expect(match.succeeded()).toBe(true);

		const effects = sem(match).toEffects();
		expect(effects).toEqual([{ type: "per_hit_escalation", value: "x" }]);
	});

	it("exclusiveAffix → HealReduction with state", () => {
		const raw =
			"本神通施放后，会对敌方添加持续8秒的【灵涸】：治疗量降低x%，且无法被驱散";
		const match = grammar.match(raw, "exclusiveAffix");
		expect(match.succeeded()).toBe(true);

		const effects = sem(match).toEffects();
		expect(effects).toEqual([
			{
				type: "heal_reduction",
				value: "x",
				state: "灵涸",
				duration: "8",
				undispellable: true,
			},
		]);
	});
});
