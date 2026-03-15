/**
 * Layer: Exclusive Affix Parser
 *
 * Reads 专属词缀.md — a 3-column table (功法 | 词缀 | 效果描述).
 * Parses each affix's Chinese prose into typed EffectRow[] using
 * per-book parsers, consistent with primary affix parsing in split.ts.
 *
 * Named states in exclusive affixes are merged into the book's
 * state registry so lifecycle info (duration, stacking, target)
 * is captured alongside the mechanical effects.
 */

import type { EffectRow } from "./emit.js";
import { splitCell, type SplitCell } from "./md-table.js";
import { buildStateRegistry, type StateRegistry } from "./states.js";

export interface ExclusiveAffixEntry {
	bookName: string;
	school: string;
	affixName: string;
	cell: SplitCell;
}

const SCHOOL_MAP: Record<string, string> = {
	剑修: "Sword",
	法修: "Spell",
	魔修: "Demon",
	体修: "Body",
};

/** Normalize name variants between 专属词缀.md and 主书.md / BOOK_TABLE */
const NAME_NORMALIZE: Record<string, string> = {
	"天剎真魔": "天刹真魔",
	"焚圣真魔咒": "梵圣真魔咒",
	"惊蛰化龙": "惊蜇化龙",
};

/**
 * Read 专属词缀.md into per-book entries.
 */
export function readExclusiveAffixTable(markdown: string): ExclusiveAffixEntry[] {
	const lines = markdown.split("\n");
	const entries: ExclusiveAffixEntry[] = [];
	let currentSchool = "";

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const schoolMatch = line.match(/^####\s+(剑修|法修|魔修|体修)/);
		if (schoolMatch) {
			currentSchool = SCHOOL_MAP[schoolMatch[1]];
			continue;
		}

		if (!currentSchool) continue;
		if (!/^\|\s*功法\s*\|/.test(line)) continue;

		// Skip separator row
		i += 2;

		while (i < lines.length && lines[i].startsWith("|")) {
			const cells = lines[i]
				.split("|")
				.slice(1, -1)
				.map((c) => c.trim());

			if (cells.length >= 3) {
				const bookName = cells[0].replace(/`/g, "").trim();
				const affixNameMatch = cells[1].match(/【(.+?)】/);
				const affixName = affixNameMatch ? affixNameMatch[1] : cells[1].trim();
				const effectText = cells[2] || "";

				if (bookName && effectText) {
					entries.push({
						bookName: NAME_NORMALIZE[bookName] ?? bookName,
						school: currentSchool,
						affixName,
						cell: splitCell(effectText),
					});
				}
			}
			i++;
		}
	}

	return entries;
}

/**
 * Parse an exclusive affix entry into effects + state registry additions.
 * Returns { name, effects } for attachment to ParsedBook.exclusiveAffix.
 *
 * Named states found in the affix description are merged into the
 * provided stateRegistry (mutated in place).
 */
export function parseExclusiveAffix(
	entry: ExclusiveAffixEntry,
	stateRegistry: StateRegistry,
): { name: string; effects: EffectRow[] } {
	const parser = EXCLUSIVE_PARSERS[entry.bookName];
	if (!parser) {
		return { name: entry.affixName, effects: [] };
	}

	// Build state registry from exclusive affix description and merge
	const affixStates = buildStateRegistry(entry.cell.description);
	for (const [name, def] of Object.entries(affixStates)) {
		if (!stateRegistry[name]) {
			stateRegistry[name] = def;
		}
	}

	const effects = parser(entry.cell);
	return { name: entry.affixName, effects };
}

// ─── Helpers ────────────────────────────────────────────────────

function buildDs(
	tier: { enlightenment?: number; fusion?: number },
): undefined | string | string[] {
	const parts: string[] = [];
	if (tier.enlightenment !== undefined) {
		parts.push(`enlightenment=${tier.enlightenment}`);
	}
	if (tier.fusion !== undefined) {
		parts.push(`fusion=${tier.fusion}`);
	}
	if (parts.length === 0) return undefined;
	if (parts.length === 1) return parts[0];
	return parts;
}

type ExclusiveParser = (cell: SplitCell) => EffectRow[];

// ─── Per-book exclusive affix parsers ───────────────────────────
//
// Each parser extracts typed effects from the exclusive affix prose.
// Consistent with AFFIX_PARSERS in split.ts:
// - Effects use `parent` to scope modifications
// - Named states get lifecycle from the state registry
// - Tier variables are resolved from cell.tiers

const EXCLUSIVE_PARSERS: Record<string, ExclusiveParser> = {
	// ── Sword ───────────────────────────────────────────────

	千锋聚灵剑: (cell) => {
		// 治疗量降低x%，且无法被驱散
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "debuff",
			name: "灵涸",
			target: "healing_received",
			value: -tier.vars.x,
			duration: 8,
			dispellable: false,
		} as EffectRow];
	},

	春黎剑阵: (cell) => {
		// 【噬心】: 每秒x%攻击力伤害, 驱散时y%攻击力伤害+z秒眩晕
		const tiers = cell.tiers;
		const effects: EffectRow[] = [];
		for (const tier of tiers) {
			const ds = buildDs(tier);
			effects.push({
				type: "dot",
				name: "噬心",
				duration: tier.vars.w,
				tick_interval: 1,
				damage_per_tick: tier.vars.x,
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
			effects.push({
				type: "on_dispel",
				damage: tier.vars.y,
				stun: tier.vars.z,
				parent: "噬心",
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
		}
		return effects;
	},

	皓月剑诀: (cell) => {
		// 1. 持续伤害额外造成x%已损失气血 2. 悟境条件下: 气血伤害提高y%, 伤害提升z%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{
				type: "dot_extra_per_tick",
				value: tier.vars.x,
			} as EffectRow,
			{
				type: "conditional_buff",
				condition: "enlightenment_10",
				percent_max_hp_increase: tier.vars.y,
				damage_increase: tier.vars.z,
			} as EffectRow,
		];
	},

	念剑诀: (cell) => {
		// 增益状态持续时间延长x%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "buff_duration",
			value: tier.vars.x,
		} as EffectRow];
	},

	通天剑诀: (cell) => {
		// 无视敌方所有伤害减免, 提升x%伤害
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{ type: "ignore_damage_reduction" } as EffectRow,
			{
				type: "damage_increase",
				value: tier.vars.x,
			} as EffectRow,
		];
	},

	"新-青元剑诀": (cell) => {
		// 下一个神通额外获得x%神通伤害加深 (multiple tiers)
		const effects: EffectRow[] = [];
		for (const tier of cell.tiers) {
			const ds = buildDs(tier);
			effects.push({
				type: "next_skill_buff",
				stat: "skill_damage_increase",
				value: tier.vars.x,
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
		}
		return effects;
	},

	无极御剑诀: (cell) => {
		// 提升x%神通伤害, 目标对本神通提升y%神通伤害减免
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{
				type: "skill_damage_increase",
				value: tier.vars.x,
			} as EffectRow,
			{
				type: "enemy_skill_damage_reduction",
				value: tier.vars.y,
			} as EffectRow,
		];
	},

	// ── Spell ───────────────────────────────────────────────

	浩然星灵诀: (cell) => {
		// 增益效果强度提升x%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "buff_strength",
			value: tier.vars.x,
		} as EffectRow];
	},

	元磁神光: (cell) => {
		// 增益层数增加x%, 每5层增益提升y%伤害, 最大z%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{
				type: "buff_stack_increase",
				value: tier.vars.x,
			} as EffectRow,
			{
				type: "per_buff_stack_damage",
				per_n_stacks: 5,
				value: tier.vars.y,
				max: tier.vars.z,
			} as EffectRow,
		];
	},

	周天星元: (cell) => {
		// 1. 减益概率额外多1层 2. 伤害加深类增益时附加【逆转阴阳】
		const tiers = cell.tiers;
		const effects: EffectRow[] = [];
		for (const tier of tiers) {
			const ds = buildDs(tier);
			effects.push({
				type: "debuff_stack_chance",
				value: tier.vars.x,
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
			effects.push({
				type: "conditional_debuff",
				name: "逆转阴阳",
				multiplier: tier.vars.y,
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
		}
		return effects;
	},

	甲元仙符: (cell) => {
		// 【灵枯】: 治疗量降低x%, 气血低于30%时降低y%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "debuff",
			name: "灵枯",
			target: "healing_received",
			value: -tier.vars.x,
			duration: 20,
			conditional_value: -tier.vars.y,
			condition: "target_hp_below_30",
		} as EffectRow];
	},

	星元化岳: (cell) => {
		// 造成伤害时获得x%吸血
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "lifesteal",
			value: tier.vars.x,
		} as EffectRow];
	},

	玉书天戈符: (cell) => {
		// 悟境+1 (phantom), 伤害提升x%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "enlightenment_bonus",
			value: 1,
			damage_increase: tier.vars.x,
		} as EffectRow];
	},

	九天真雷诀: (cell) => {
		// 每次施加增益/减益/护盾时, 引动真雷造成x%灵法伤害
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "on_buff_debuff_shield_trigger",
			damage_percent: tier.vars.x,
		} as EffectRow];
	},

	// ── Demon ───────────────────────────────────────────────

	天魔降临咒: (cell) => {
		// 攻击带有减益状态的敌方时伤害提升x%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "conditional_damage",
			condition: "target_has_debuff",
			value: tier.vars.x,
		} as EffectRow];
	},

	天轮魔经: (cell) => {
		// 减益层数增加x%, 每5层减益提升y%伤害, 最大z%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{
				type: "debuff_stack_increase",
				value: tier.vars.x,
			} as EffectRow,
			{
				type: "per_debuff_stack_damage",
				per_n_stacks: 5,
				value: tier.vars.y,
				max: tier.vars.z,
			} as EffectRow,
		];
	},

	天剎真魔: (cell) => {
		// 1. 敌方有减益时提升x%治疗量 2. 悟境条件下: 降低y%最终伤害减免
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{
				type: "conditional_heal_buff",
				condition: "target_has_debuff",
				value: tier.vars.x,
				duration: 8,
			} as EffectRow,
			{
				type: "conditional_debuff",
				condition: "enlightenment",
				name: "魔骨明心",
				target: "final_damage_reduction",
				value: -tier.vars.y,
				duration: 1,
			} as EffectRow,
		];
	},

	解体化形: (cell) => {
		// 所有效果x%概率4倍, y%概率3倍, z%概率2倍 (multiple tiers)
		const effects: EffectRow[] = [];
		for (const tier of cell.tiers) {
			const ds = buildDs(tier);
			effects.push({
				type: "probability_multiplier",
				chance_4x: tier.vars.x,
				chance_3x: tier.vars.y,
				chance_2x: tier.vars.z,
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
		}
		return effects;
	},

	大罗幻诀: (cell) => {
		// 持续伤害上升x%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "dot_damage_increase",
			value: tier.vars.x,
		} as EffectRow];
	},

	梵圣真魔咒: (cell) => {
		// 持续伤害触发间隙缩短x% (note: source has 焚圣 but book-table uses 梵圣)
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "dot_frequency_increase",
			value: tier.vars.x,
		} as EffectRow];
	},

	焚圣真魔咒: (cell) => {
		// Same book, alternate name
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "dot_frequency_increase",
			value: tier.vars.x,
		} as EffectRow];
	},

	无相魔劫咒: (cell) => {
		// 【魔劫】: 降低x%治疗量, 伤害提升y%, 无治疗状态提升至z%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{
				type: "debuff",
				name: "魔劫",
				target: "healing_received",
				value: -tier.vars.x,
				duration: 8,
			} as EffectRow,
			{
				type: "conditional_damage",
				value: tier.vars.y,
				condition: "target_has_no_healing",
				escalated_value: tier.vars.z,
				parent: "魔劫",
			} as EffectRow,
		];
	},

	// ── Body ────────────────────────────────────────────────

	玄煞灵影诀: (cell) => {
		// 每损失1%气血提升x%伤害
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "per_self_lost_hp",
			per_percent: tier.vars.x,
		} as EffectRow];
	},

	惊蛰化龙: (cell) => {
		// 1. 每层减益造成x%最大气血真实伤害, 最多y%
		// 2. 悟境条件下: 已损气血伤害提高z%, 伤害提升w%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{
				type: "per_debuff_stack_true_damage",
				per_stack: tier.vars.x,
				max: tier.vars.y,
			} as EffectRow,
			{
				type: "conditional_buff",
				condition: "enlightenment_max",
				percent_lost_hp_increase: tier.vars.z,
				damage_increase: tier.vars.w,
			} as EffectRow,
		];
	},

	十方真魄: (cell) => {
		// 伤害提升x%, 受到伤害提升y%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [
			{
				type: "damage_increase",
				value: tier.vars.x,
			} as EffectRow,
			{
				type: "self_damage_taken_increase",
				value: tier.vars.y,
				duration: "during_cast",
			} as EffectRow,
		];
	},

	疾风九变: (cell) => {
		// 所有状态持续时间延长x%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "all_state_duration",
			value: tier.vars.x,
		} as EffectRow];
	},

	煞影千幻: (cell) => {
		// 敌方处于控制状态时伤害提升x%
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "conditional_damage",
			value: tier.vars.x,
			condition: "target_controlled",
		} as EffectRow];
	},

	九重天凤诀: (cell) => {
		// 护盾消失时对敌方造成护盾值x%的伤害
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "on_shield_expire",
			damage_percent_of_shield: tier.vars.x,
		} as EffectRow];
	},

	天煞破虚诀: (cell) => {
		// 命中后每秒驱散1个增益, 持续10秒, 每驱散造成x%灵法伤害, 无状态双倍
		const tier = cell.tiers[cell.tiers.length - 1];
		if (!tier) return [];
		return [{
			type: "periodic_dispel",
			interval: 1,
			duration: 10,
			damage_percent_of_skill: tier.vars.x,
			no_buff_double: true,
		} as EffectRow];
	},
};
