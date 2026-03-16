import { describe, expect, test } from "bun:test";
import type { EffectRow } from "../data/types.js";
import {
	ConfigValidationError,
	loadAffixesYaml,
	loadBooksYaml,
	selectTiers,
	validatePlayerConfig,
} from "./config.js";
import type { PlayerConfig } from "./types.js";

// ── selectTiers ─────────────────────────────────────────────────────

describe("selectTiers", () => {
	test("selects highest matching tier", () => {
		const effects: EffectRow[] = [
			{ type: "base_attack", total: 1500, data_state: "enlightenment=0" },
			{
				type: "base_attack",
				total: 11265,
				data_state: ["enlightenment=1", "fusion=20"],
			},
			{
				type: "base_attack",
				total: 20265,
				data_state: ["enlightenment=10", "fusion=51"],
			},
		];
		const selected = selectTiers(effects, {
			enlightenment: 10,
			fusion: 51,
		});
		expect(selected).toHaveLength(1);
		expect(selected[0].total).toBe(20265);
	});

	test("selects middle tier when highest not met", () => {
		const effects: EffectRow[] = [
			{ type: "base_attack", total: 1500, data_state: "enlightenment=0" },
			{
				type: "base_attack",
				total: 11265,
				data_state: ["enlightenment=1", "fusion=20"],
			},
			{
				type: "base_attack",
				total: 20265,
				data_state: ["enlightenment=10", "fusion=51"],
			},
		];
		const selected = selectTiers(effects, { enlightenment: 3, fusion: 32 });
		expect(selected).toHaveLength(1);
		expect(selected[0].total).toBe(11265);
	});

	test("returns empty when no tier matches", () => {
		const effects: EffectRow[] = [
			{
				type: "base_attack",
				total: 11265,
				data_state: ["enlightenment=1", "fusion=20"],
			},
		];
		const selected = selectTiers(effects, { enlightenment: 0, fusion: 0 });
		expect(selected).toHaveLength(0);
	});

	test("effects without data_state always match", () => {
		const effects: EffectRow[] = [{ type: "damage_increase", value: 40 }];
		const selected = selectTiers(effects, { enlightenment: 0, fusion: 0 });
		expect(selected).toHaveLength(1);
		expect(selected[0].value).toBe(40);
	});

	test("selects independently per effect type", () => {
		const effects: EffectRow[] = [
			{ type: "base_attack", total: 1500, data_state: "enlightenment=0" },
			{
				type: "base_attack",
				total: 20265,
				data_state: ["enlightenment=10", "fusion=51"],
			},
			{
				type: "percent_max_hp_damage",
				value: 11,
				data_state: "enlightenment=0",
			},
			{
				type: "percent_max_hp_damage",
				value: 27,
				data_state: ["enlightenment=10", "fusion=51"],
			},
		];
		const selected = selectTiers(effects, {
			enlightenment: 10,
			fusion: 51,
		});
		expect(selected).toHaveLength(2);
		expect(selected.find((e) => e.type === "base_attack")?.total).toBe(20265);
		expect(
			selected.find((e) => e.type === "percent_max_hp_damage")?.value,
		).toBe(27);
	});
});

// ── validatePlayerConfig ────────────────────────────────────────────

describe("validatePlayerConfig", () => {
	const books = loadBooksYaml();
	const affixes = loadAffixesYaml();

	const validConfig: PlayerConfig = {
		entity: { hp: 1e8, atk: 1000, sp: 5000, def: 9e5, spRegen: 100 },
		formulas: { dr_constant: 1e6, sp_shield_ratio: 1.0 },
		progression: { enlightenment: 10, fusion: 51 },
		books: [{ slot: 1, platform: "千锋聚灵剑" }],
	};

	test("accepts valid config", () => {
		expect(() =>
			validatePlayerConfig(validConfig, books, affixes),
		).not.toThrow();
	});

	test("rejects unknown book", () => {
		const config = {
			...validConfig,
			books: [{ slot: 1, platform: "不存在的书" }],
		};
		expect(() => validatePlayerConfig(config, books, affixes)).toThrow(
			ConfigValidationError,
		);
	});

	test("rejects duplicate platforms", () => {
		const config = {
			...validConfig,
			books: [
				{ slot: 1, platform: "千锋聚灵剑" },
				{ slot: 2, platform: "千锋聚灵剑" },
			],
		};
		expect(() => validatePlayerConfig(config, books, affixes)).toThrow(
			"核心冲突",
		);
	});

	test("rejects locked tiers", () => {
		const config = {
			...validConfig,
			progression: { enlightenment: 0, fusion: 0 },
			books: [{ slot: 1, platform: "甲元仙符" }],
		};
		expect(() => validatePlayerConfig(config, books, affixes)).toThrow(
			"no usable skill tiers",
		);
	});

	test("rejects unknown affix", () => {
		const config = {
			...validConfig,
			books: [{ slot: 1, platform: "千锋聚灵剑", op1: "不存在的词缀" }],
		};
		expect(() => validatePlayerConfig(config, books, affixes)).toThrow(
			"not found",
		);
	});

	test("accepts known exclusive affix", () => {
		const config = {
			...validConfig,
			books: [{ slot: 1, platform: "千锋聚灵剑", op1: "天哀灵涸" }],
		};
		expect(() => validatePlayerConfig(config, books, affixes)).not.toThrow();
	});

	test("accepts known universal affix", () => {
		const config = {
			...validConfig,
			books: [{ slot: 1, platform: "千锋聚灵剑", op1: "通明" }],
		};
		expect(() => validatePlayerConfig(config, books, affixes)).not.toThrow();
	});
});
