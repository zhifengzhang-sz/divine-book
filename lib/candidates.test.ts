import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { candidatesByCategory } from "./candidates.js";
import type { GroupsOutput } from "./parse.groups.js";
import type { ParseOutput } from "./parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const data: ParseOutput = parseYaml(
	readFileSync(resolve(ROOT, "data/yaml/effects.yaml"), "utf-8"),
);
const groups: GroupsOutput = parseYaml(
	readFileSync(resolve(ROOT, "data/yaml/groups.yaml"), "utf-8"),
);

describe("candidatesByCategory", () => {
	test("invalid category returns null", () => {
		expect(candidatesByCategory(data, groups, 99)).toBeNull();
	});

	test("C3 critical system has known affixes", () => {
		const result = candidatesByCategory(data, groups, 3);
		expect(result).not.toBeNull();
		expect(result?.label).toBe("Critical System");

		const allAffixes =
			result?.clusters.flatMap((c) => c.candidates.map((a) => a.affix)) ?? [];
		expect(allAffixes).toContain("心逐神随");
		expect(allAffixes).toContain("灵犀九重");
		expect(allAffixes).toContain("通明");
	});

	test("C3 心逐神随 is exclusive from 解体化形", () => {
		const result = candidatesByCategory(data, groups, 3);
		expect(result).not.toBeNull();
		const pmCluster = result?.clusters.find(
			(c) => c.type === "probability_multiplier",
		);
		expect(pmCluster).toBeDefined();
		expect(pmCluster?.candidates).toHaveLength(1);
		expect(pmCluster?.candidates[0].affix).toBe("心逐神随");
		expect(pmCluster?.candidates[0].scope).toBe("exclusive");
		expect(pmCluster?.candidates[0].book).toBe("解体化形");
	});

	test("C6 HP-based has per_self_lost_hp candidates", () => {
		const result = candidatesByCategory(data, groups, 6);
		expect(result).not.toBeNull();
		const cluster = result?.clusters.find((c) => c.type === "per_self_lost_hp");
		expect(cluster).toBeDefined();

		const affixNames = cluster?.candidates.map((c) => c.affix) ?? [];
		expect(affixNames).toContain("怒血战意");
		expect(affixNames).toContain("战意");
	});

	test("empty clusters are excluded", () => {
		const result = candidatesByCategory(data, groups, 3);
		expect(result).not.toBeNull();
		for (const cluster of result?.clusters ?? []) {
			expect(cluster.candidates.length).toBeGreaterThan(0);
		}
	});

	test("all 14 categories are reachable (0-13)", () => {
		for (let i = 0; i <= 13; i++) {
			const result = candidatesByCategory(data, groups, i);
			expect(result).not.toBeNull();
			expect(result?.category).toBe(i);
		}
	});

	test("multi-type affix appears in multiple clusters", () => {
		// 破碎无双 has attack_bonus + damage_increase + crit_damage_bonus, all in C2
		const result = candidatesByCategory(data, groups, 2);
		expect(result).not.toBeNull();
		const abCluster = result?.clusters.find((c) => c.type === "attack_bonus");
		const diCluster = result?.clusters.find(
			(c) => c.type === "damage_increase",
		);
		const cdCluster = result?.clusters.find(
			(c) => c.type === "crit_damage_bonus",
		);
		expect(abCluster?.candidates.map((c) => c.affix)).toContain("破碎无双");
		expect(diCluster?.candidates.map((c) => c.affix)).toContain("破碎无双");
		expect(cdCluster?.candidates.map((c) => c.affix)).toContain("破碎无双");
	});
});
