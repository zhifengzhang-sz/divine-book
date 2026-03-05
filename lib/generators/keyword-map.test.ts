import { describe, expect, test } from "bun:test";
import { registry } from "../domain/registry.js";
import { generateKeywordMap } from "./keyword-map.js";

describe("generateKeywordMap", () => {
	const output = generateKeywordMap(registry);

	test("contains generated header", () => {
		expect(output).toContain("Generated from TypeScript registry");
	});

	test("contains all 80 effect types", () => {
		for (const def of registry.allTypes) {
			expect(output).toContain(`\`${def.type}\``);
		}
	});

	test("contains all 16 section headers", () => {
		for (const group of registry.groups) {
			expect(output).toContain(`## ${group.section}. ${group.label}`);
		}
	});

	test("contains unit definitions table", () => {
		expect(output).toContain("**Unit definitions**");
		expect(output).toContain("`%atk`");
		expect(output).toContain("`%stat`");
		expect(output).toContain("`seconds`");
	});

	test("contains condition vocabulary", () => {
		expect(output).toContain("## Condition Vocabulary");
		expect(output).toContain("`target_controlled`");
		expect(output).toContain("`target_has_debuff`");
	});

	test("contains data state vocabulary", () => {
		expect(output).toContain("## Data State Vocabulary");
		expect(output).toContain("`enlightenment=0`");
		expect(output).toContain("`max_fusion`");
	});

	test("contains unresolved formulas", () => {
		expect(output).toContain("## Unresolved Formulas");
	});

	test("contains Chinese patterns for key types", () => {
		expect(output).toContain("第{n}重：本神通增加{x}%攻击力的伤害");
		expect(output).toContain("{n}段共(计){x}%攻击力的灵法伤害");
		expect(output).toContain("造成的伤害提升{x}%");
		expect(output).toContain(
			"必定会心造成{x}倍伤害，并有{p}%概率将之提升至{y}倍",
		);
	});

	test("contains field definitions", () => {
		expect(output).toContain("`fusion_level`→count");
		expect(output).toContain("`value`→%atk");
		expect(output).toContain("`hits`→count (optional)");
	});

	test("contains §13 subsection headers", () => {
		expect(output).toContain("### §13.1 Summons and Clones");
		expect(output).toContain("### §13.5 Random Effects");
		expect(output).toContain("### §13.7 Other Triggers");
	});

	test("contains section notes", () => {
		expect(output).toContain("会心 ≠ 暴击");
		expect(output).toContain("Multiplier zone hierarchy");
		expect(output).toContain("`self_buff` attribute keywords");
	});
});
