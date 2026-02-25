import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	parse,
	parseDataState,
	parseFields,
	parseTable,
	parseValue,
	toEffect,
	toEffectFromAffix,
	validateEffect,
} from "./parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const NORMALIZED = resolve(ROOT, "docs/data/normalized.data.md");

// ---------------------------------------------------------------------------
// parseValue
// ---------------------------------------------------------------------------

describe("parseValue", () => {
	test("integers", () => {
		expect(parseValue("42")).toBe(42);
		expect(parseValue(" 0 ")).toBe(0);
		expect(parseValue("-31")).toBe(-31);
	});

	test("decimals", () => {
		expect(parseValue("42.5")).toBe(42.5);
		expect(parseValue("0.5")).toBe(0.5);
		expect(parseValue("-40.8")).toBe(-40.8);
	});

	test("booleans", () => {
		expect(parseValue("true")).toBe(true);
		expect(parseValue("false")).toBe(false);
	});

	test("strings", () => {
		expect(parseValue("healing_received")).toBe("healing_received");
		expect(parseValue("skill_bonus")).toBe("skill_bonus");
		expect(parseValue("same_as_trigger")).toBe("same_as_trigger");
		expect(parseValue("灵涸")).toBe("灵涸");
	});

	test("empty string stays string", () => {
		expect(parseValue("")).toBe("");
	});
});

// ---------------------------------------------------------------------------
// parseFields
// ---------------------------------------------------------------------------

describe("parseFields", () => {
	test("empty string", () => {
		expect(parseFields("")).toEqual({});
		expect(parseFields("  ")).toEqual({});
	});

	test("single field", () => {
		expect(parseFields("value=20")).toEqual({ value: 20 });
	});

	test("multiple fields", () => {
		expect(parseFields("hits=6, total=20265")).toEqual({
			hits: 6,
			total: 20265,
		});
	});

	test("mixed types", () => {
		expect(
			parseFields(
				"name=灵涸, target=healing_received, value=-31, duration=8, dispellable=false",
			),
		).toEqual({
			name: "灵涸",
			target: "healing_received",
			value: -31,
			duration: 8,
			dispellable: false,
		});
	});

	test("string value with special characters", () => {
		expect(parseFields("stat=skill_damage_increase, value=50")).toEqual({
			stat: "skill_damage_increase",
			value: 50,
		});
	});

	test("same_as_trigger stays string", () => {
		expect(parseFields("duration=same_as_trigger")).toEqual({
			duration: "same_as_trigger",
		});
	});
});

// ---------------------------------------------------------------------------
// parseDataState
// ---------------------------------------------------------------------------

describe("parseDataState", () => {
	test("empty string returns undefined", () => {
		expect(parseDataState("")).toBeUndefined();
		expect(parseDataState("  ")).toBeUndefined();
	});

	test("single token", () => {
		expect(parseDataState("enlightenment=0")).toBe("enlightenment=0");
		expect(parseDataState("max_fusion")).toBe("max_fusion");
		expect(parseDataState("locked")).toBe("locked");
		expect(parseDataState("fusion=54")).toBe("fusion=54");
	});

	test("array notation", () => {
		expect(parseDataState("[enlightenment=1, fusion=20]")).toEqual([
			"enlightenment=1",
			"fusion=20",
		]);
		expect(parseDataState("[enlightenment=10, fusion=51]")).toEqual([
			"enlightenment=10",
			"fusion=51",
		]);
	});
});

// ---------------------------------------------------------------------------
// parseTable
// ---------------------------------------------------------------------------

describe("parseTable", () => {
	test("3-column table", () => {
		const lines = [
			"| effect_type | fields | data_state |",
			"|:---|:---|:---|",
			"| base_attack | hits=6, total=1500 | enlightenment=0 |",
			"| percent_max_hp_damage | value=11, cap_vs_monster=2200 | enlightenment=0 |",
			"",
		];
		const { rows, end } = parseTable(lines, 0);
		expect(rows).toHaveLength(2);
		expect(rows[0].effect_type).toBe("base_attack");
		expect(rows[0].fields).toBe("hits=6, total=1500");
		expect(rows[0].data_state).toBe("enlightenment=0");
		expect(end).toBe(4);
	});

	test("4-column affix table", () => {
		const lines = [
			"| affix | effect_type | fields | data_state |",
			"|:---|:---|:---|:---|",
			"| 【咒书】 | debuff_strength | value=20 | |",
			"| 【清灵】 | buff_strength | value=20 | |",
			"",
		];
		const { rows, end } = parseTable(lines, 0);
		expect(rows).toHaveLength(2);
		expect(rows[0].affix).toBe("【咒书】");
		expect(rows[1].effect_type).toBe("buff_strength");
		expect(end).toBe(4);
	});

	test("empty cells are preserved", () => {
		const lines = [
			"| effect_type | fields | data_state |",
			"|:---|:---|:---|",
			"| base_attack | | locked |",
			"",
		];
		const { rows } = parseTable(lines, 0);
		expect(rows[0].effect_type).toBe("base_attack");
		expect(rows[0].fields).toBe("");
		expect(rows[0].data_state).toBe("locked");
	});
});

// ---------------------------------------------------------------------------
// toEffect / toEffectFromAffix
// ---------------------------------------------------------------------------

describe("toEffect", () => {
	test("basic row", () => {
		const raw = {
			effect_type: "base_attack",
			fields: "hits=6, total=1500",
			data_state: "enlightenment=0",
		};
		expect(toEffect(raw)).toEqual({
			type: "base_attack",
			hits: 6,
			total: 1500,
			data_state: "enlightenment=0",
		});
	});

	test("empty fields and data_state", () => {
		const raw = {
			effect_type: "ignore_damage_reduction",
			fields: "",
			data_state: "",
		};
		expect(toEffect(raw)).toEqual({ type: "ignore_damage_reduction" });
	});

	test("array data_state", () => {
		const raw = {
			effect_type: "base_attack",
			fields: "hits=6, total=11265",
			data_state: "[enlightenment=1, fusion=20]",
		};
		expect(toEffect(raw)).toEqual({
			type: "base_attack",
			hits: 6,
			total: 11265,
			data_state: ["enlightenment=1", "fusion=20"],
		});
	});
});

describe("toEffectFromAffix", () => {
	test("strips brackets from affix name", () => {
		const raw = {
			affix: "【咒书】",
			effect_type: "debuff_strength",
			fields: "value=20",
			data_state: "",
		};
		const { affix, effect } = toEffectFromAffix(raw);
		expect(affix).toBe("咒书");
		expect(effect).toEqual({ type: "debuff_strength", value: 20 });
	});
});

// ---------------------------------------------------------------------------
// validateEffect
// ---------------------------------------------------------------------------

describe("validateEffect", () => {
	test("valid effect returns null", () => {
		const effect = { type: "base_attack", hits: 6, total: 1500 };
		expect(validateEffect(effect, "test")).toBeNull();
	});

	test("invalid type returns warning", () => {
		const effect = { type: "nonexistent_type" };
		const w = validateEffect(effect, "test");
		expect(w).not.toBeNull();
		expect(w?.type).toBe("nonexistent_type");
		expect(w?.context).toBe("test");
	});
});

// ---------------------------------------------------------------------------
// Integration: parse the real normalized.data.md
// ---------------------------------------------------------------------------

describe("parse normalized.data.md", () => {
	const md = readFileSync(NORMALIZED, "utf-8");
	const { data, warnings } = parse(md);

	test("zero validation warnings", () => {
		if (warnings.length > 0) {
			const summary = warnings
				.map((w) => `[${w.context}] ${w.type}: ${w.issues.join("; ")}`)
				.join("\n");
			throw new Error(`Unexpected warnings:\n${summary}`);
		}
		expect(warnings).toHaveLength(0);
	});

	test("28 books", () => {
		expect(Object.keys(data.books)).toHaveLength(28);
	});

	test("16 universal affixes", () => {
		expect(Object.keys(data.universal_affixes)).toHaveLength(16);
	});

	test("4 school groups", () => {
		expect(Object.keys(data.school_affixes)).toEqual([
			"Sword",
			"Spell",
			"Demon",
			"Body",
		]);
	});

	test("17 school affixes total", () => {
		const count = Object.values(data.school_affixes).reduce(
			(sum, group) => sum + Object.keys(group).length,
			0,
		);
		expect(count).toBe(17);
	});

	test("9 books have skill data", () => {
		const withSkill = Object.values(data.books).filter((b) => b.skill);
		expect(withSkill).toHaveLength(9);
	});

	test("all 28 books have exclusive_affix", () => {
		const withExclusive = Object.values(data.books).filter(
			(b) => b.exclusive_affix,
		);
		expect(withExclusive).toHaveLength(28);
	});

	test("school assignment is correct", () => {
		expect(data.books["千锋聚灵剑"].school).toBe("Sword");
		expect(data.books["甲元仙符"].school).toBe("Spell");
		expect(data.books["大罗幻诀"].school).toBe("Demon");
		expect(data.books["十方真魄"].school).toBe("Body");
	});

	test("multi-tier data_state on 千锋聚灵剑 skill", () => {
		const skill = data.books["千锋聚灵剑"].skill;
		expect(skill).toBeDefined();
		expect(skill?.[0].data_state).toBe("enlightenment=0");
		expect(skill?.[2].data_state).toEqual(["enlightenment=1", "fusion=20"]);
		expect(skill?.[6].data_state).toEqual(["enlightenment=10", "fusion=51"]);
	});

	test("locked data_state on 甲元仙符", () => {
		const skill = data.books["甲元仙符"].skill;
		expect(skill).toBeDefined();
		expect(skill?.[0].data_state).toBe("locked");
	});

	test("parent= preserved on nested effects", () => {
		const skill = data.books["大罗幻诀"].skill;
		expect(skill).toBeDefined();
		const children = skill?.filter((e) => e.parent === "罗天魔咒") ?? [];
		expect(children).toHaveLength(2);
		expect(children[0].name).toBe("噬心魔咒");
		expect(children[1].name).toBe("断魂之咒");
	});

	test("negative debuff values (Rule 7)", () => {
		const demon = data.school_affixes.Demon;
		const hx = demon["祸星无妄"];
		const children = hx.filter((e) => e.parent === "祸星无妄");
		expect(children).toHaveLength(3);
		for (const c of children) {
			expect(c.value).toBeLessThan(0);
		}
	});

	test("same_as_trigger duration preserved", () => {
		const effects = data.books["周天星元"].exclusive_affix?.effects;
		expect(effects).toBeDefined();
		const cd = effects?.find((e) => e.type === "conditional_debuff");
		expect(cd?.duration).toBe("same_as_trigger");
	});

	test("stat=skill_damage_increase (not skill_damage_bonus)", () => {
		const lingwei = data.universal_affixes["灵威"];
		expect(lingwei[0].stat).toBe("skill_damage_increase");
		const tianwei = data.books["新-青元剑诀"].exclusive_affix?.effects[0];
		expect(tianwei?.stat).toBe("skill_damage_increase");
	});
});
