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
import { SCHOOL_MAP, type SplitCell, splitCell } from "./md-table.js";
import { genericAffixParse } from "./split.js";
import { buildStateRegistry, type StateRegistry } from "./states.js";
import { buildDataState } from "./tiers.js";

export interface ExclusiveAffixEntry {
	bookName: string;
	school: string;
	affixName: string;
	rawText: string;
	cell: SplitCell;
}

/** Normalize name variants between 专属词缀.md and 主书.md / BOOK_TABLE */
const NAME_NORMALIZE: Record<string, string> = {
	天剎真魔: "天刹真魔",
	焚圣真魔咒: "梵圣真魔咒",
	惊蛰化龙: "惊蜇化龙",
};

/**
 * Read 专属词缀.md into per-book entries.
 */
export function readExclusiveAffixTable(
	markdown: string,
): ExclusiveAffixEntry[] {
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
						rawText: effectText.replace(/<br\s*\/?>/gi, "\n"),
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
	// Build state registry from exclusive affix description and merge
	const affixStates = buildStateRegistry(entry.cell.description);
	for (const [name, def] of Object.entries(affixStates)) {
		if (!stateRegistry[name]) {
			stateRegistry[name] = def;
		}
	}

	// Book-specific parser takes priority
	const parser = EXCLUSIVE_PARSERS[entry.bookName];
	if (parser) {
		const effects = parser(entry.cell);
		return { name: entry.affixName, effects };
	}

	// Generic affix parse as fallback
	// For exclusive affixes with a single tier, use last-tier-only mode
	// (use variable values without data_state — matches legacy behavior)
	const effects = genericAffixParse(entry.cell, stateRegistry, {
		lastTierOnly: true,
	});
	return { name: entry.affixName, effects };
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
	// ── Compound parsers that can't be genericized ──────────

	// 千锋聚灵剑: handled by generic pipeline (extractHealReductionDebuff, negated value)

	春黎剑阵: (cell) => {
		// 【噬心】: dot + on_dispel compound (multi-tier)
		const tiers = cell.tiers;
		const effects: EffectRow[] = [];
		for (const tier of tiers) {
			const ds = buildDataState(tier);
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
		// dot_extra_per_tick + conditional_buff compound
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

	周天星元: (cell) => {
		// debuff_stack_chance + conditional_debuff (multi-tier)
		const tiers = cell.tiers;
		const effects: EffectRow[] = [];
		for (const tier of tiers) {
			const ds = buildDataState(tier);
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

	// 甲元仙符: handled by generic pipeline (extractHealReductionDebuff with conditional)

	天刹真魔: (cell) => {
		// conditional_heal_buff + conditional_debuff compound
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

	无相魔劫咒: (cell) => {
		// debuff + conditional_damage with parent linking
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

	惊蜇化龙: (cell) => {
		// per_debuff_stack_true_damage + conditional_buff compound
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

	// Generic pipeline handles the rest:
	// 念剑诀, 通天剑诀, 新-青元剑诀, 无極御剑诀,
	// 浩然星灵诀, 元磁神光, 星元化岳, 玉書天戈符, 九天真雷诀,
	// 天魔降临咒, 天轮魔经, 解体化形, 大罗幻诀, 梵圣/焚圣真魔咒,
	// 玄煞灵影诀, 十方真魄, 疾風九变, 煞影千幻, 九重天凤诀, 天煞破虚诀
};
