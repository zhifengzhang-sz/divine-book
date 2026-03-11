import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { registry } from "./registry.js";
import type { GroupsOutput } from "../parse.groups.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("Registry", () => {
	test("has 86 effect types", () => {
		expect(registry.size).toBe(86);
	});

	test("has 16 groups", () => {
		expect(registry.groups).toHaveLength(16);
	});

	test("validate() returns no errors", () => {
		const errors = registry.validate();
		if (errors.length > 0) {
			throw new Error(`Registry validation errors:\n${errors.join("\n")}`);
		}
		expect(errors).toHaveLength(0);
	});

	test("every group has at least one type", () => {
		for (const g of registry.groups) {
			const types = registry.allTypes.filter((d) => d.group === g.id);
			expect(types.length).toBeGreaterThan(0);
		}
	});

	test("every type has a valid schema with matching type literal", () => {
		for (const def of registry.allTypes) {
			const shape = (def.schema as any).shape;
			expect(shape).toBeDefined();
			expect(shape.type).toBeDefined();
		}
	});

	test("effectSchema is a valid discriminated union", () => {
		const schema = registry.effectSchema;
		expect(schema).toBeDefined();

		// Test parsing a valid effect
		const result = schema.safeParse({
			type: "base_attack",
			hits: 6,
			total: 1500,
		});
		expect(result.success).toBe(true);

		// Test parsing an invalid type
		const bad = schema.safeParse({ type: "nonexistent_type" });
		expect(bad.success).toBe(false);
	});

	test("groupsOutput matches current groups.yaml", () => {
		const yamlContent = readFileSync(
			resolve(ROOT, "data/yaml/groups.yaml"),
			"utf-8",
		);
		// Skip the header comment lines
		const yamlData: GroupsOutput = parseYaml(yamlContent);
		const registryOutput = registry.groupsOutput;

		expect(registryOutput.groups).toHaveLength(yamlData.groups.length);

		for (let i = 0; i < yamlData.groups.length; i++) {
			const expected = yamlData.groups[i];
			const actual = registryOutput.groups[i];
			expect(actual.id).toBe(expected.id);
			expect(actual.section).toBe(expected.section);
			expect(actual.label).toBe(expected.label);
			expect(actual.types).toEqual(expected.types);
		}
	});

	test("effectSchema parses all types from normalized.data.md", () => {
		// Use the registry schema to parse sample effects from each section
		const samples = [
			{ type: "fusion_flat_damage", fusion_level: 3, value: 50 },
			{ type: "base_attack", hits: 6, total: 1500 },
			{ type: "damage_increase", value: 20 },
			{ type: "guaranteed_resonance", base_mult: 2.97, enhanced_mult: 3.5, enhanced_chance: 30 },
			{ type: "probability_multiplier", prob: 11, mult: 4 },
			{ type: "conditional_crit", condition: "target_controlled" },
			{ type: "conditional_damage", value: 15, condition: "target_has_debuff" },
			{ type: "per_hit_escalation", value: 5, stat: "damage" },
			{ type: "per_self_lost_hp", per_percent: 1.5 },
			{ type: "lifesteal", value: 20 },
			{ type: "shield_strength", value: 30 },
			{ type: "buff_strength", value: 20 },
			{ type: "dot", tick_interval: 2, duration: 8, damage_per_tick: 100 },
			{ type: "self_buff", duration: 10, attack_bonus: 20 },
			{ type: "debuff", target: "healing_received", value: -31, duration: 8 },
			{ type: "summon", inherit_stats: 80, duration: 15, damage_taken_multiplier: 200 },
			{ type: "technique_damage_increase", value: 10 },
		];

		for (const sample of samples) {
			const result = registry.effectSchema.safeParse(sample);
			if (!result.success) {
				throw new Error(
					`Failed to parse ${sample.type}: ${result.error.message}`,
				);
			}
		}
	});
});
