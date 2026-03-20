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

	const parser = EXCLUSIVE_PARSER_TABLE[entry.bookName];
	if (!parser) {
		throw new Error(
			`No parser assigned for exclusive affix "${entry.affixName}" ` +
				`(book: ${entry.bookName}). Add an entry to EXCLUSIVE_PARSER_TABLE.`,
		);
	}

	if (parser === "generic") {
		const effects = genericAffixParse(entry.cell, stateRegistry);
		return { name: entry.affixName, effects };
	}

	const effects = parser(entry.cell);
	return { name: entry.affixName, effects };
}

type ExclusiveParser = (cell: SplitCell) => EffectRow[];

// ─── Exclusive affix parser table ───────────────────────────────
//
// Every book with an exclusive affix must have an explicit entry.
// "generic" = use the generic affix parser (single-effect affixes).
// ── Custom parsers for compound effects ─────────────────────────
//
// Used when the generic parser can't handle multi-effect compounds.
// Each emits all tiers with data_state via buildDataState().

/** Helper: iterate tiers, emit effects with data_state per tier */
function multiTierEffects(
	cell: SplitCell,
	emitTier: (
		vars: Record<string, number>,
		ds: ReturnType<typeof buildDataState>,
	) => EffectRow[],
): EffectRow[] {
	const effects: EffectRow[] = [];
	for (const tier of cell.tiers) {
		effects.push(...emitTier(tier.vars, buildDataState(tier)));
	}
	return effects;
}

function ds(v: ReturnType<typeof buildDataState>): Record<string, unknown> {
	return v ? { data_state: v } : {};
}

const compound_春黎剑阵: ExclusiveParser = (cell) =>
	multiTierEffects(cell, (v, d) => [
		{
			type: "dot",
			name: "噬心",
			duration: v.w,
			tick_interval: 1,
			damage_per_tick: v.x,
			...ds(d),
		} as EffectRow,
		{
			type: "on_dispel",
			damage: v.y,
			stun: v.z,
			parent: "噬心",
			...ds(d),
		} as EffectRow,
	]);

const compound_皓月剑诀: ExclusiveParser = (cell) =>
	multiTierEffects(cell, (v, d) => [
		{ type: "dot_extra_per_tick", value: v.x, ...ds(d) } as EffectRow,
		{
			type: "conditional_buff",
			condition: "enlightenment_10",
			percent_max_hp_increase: v.y,
			damage_increase: v.z,
			...ds(d),
		} as EffectRow,
	]);

const compound_周天星元: ExclusiveParser = (cell) =>
	multiTierEffects(cell, (v, d) => [
		{ type: "debuff_stack_chance", value: v.x, ...ds(d) } as EffectRow,
		{
			type: "conditional_debuff",
			name: "逆转阴阳",
			multiplier: v.y,
			...ds(d),
		} as EffectRow,
	]);

const compound_天刹真魔: ExclusiveParser = (cell) =>
	multiTierEffects(cell, (v, d) => [
		{
			type: "conditional_heal_buff",
			condition: "target_has_debuff",
			value: v.x,
			duration: 8,
			...ds(d),
		} as EffectRow,
		{
			type: "conditional_debuff",
			condition: "enlightenment",
			name: "魔骨明心",
			target: "final_damage_reduction",
			value: -v.y,
			duration: 1,
			...ds(d),
		} as EffectRow,
	]);

const compound_无相魔劫咒: ExclusiveParser = (cell) =>
	multiTierEffects(cell, (v, d) => [
		{
			type: "debuff",
			name: "魔劫",
			target: "healing_received",
			value: -v.x,
			duration: 8,
			...ds(d),
		} as EffectRow,
		{
			type: "conditional_damage",
			value: v.y,
			condition: "target_has_no_healing",
			escalated_value: v.z,
			parent: "魔劫",
			...ds(d),
		} as EffectRow,
	]);

const compound_惊蜇化龙: ExclusiveParser = (cell) =>
	multiTierEffects(cell, (v, d) => [
		{
			type: "per_debuff_stack_true_damage",
			per_stack: v.x,
			max: v.y,
			...ds(d),
		} as EffectRow,
		{
			type: "conditional_buff",
			condition: "enlightenment_max",
			percent_lost_hp_increase: v.z,
			damage_increase: v.w,
			...ds(d),
		} as EffectRow,
	]);

// ── Parser assignment table ────────────────────────────────────
//
// Every book must have an explicit entry.
// "generic" = standard generic parser. Function = custom compound parser.

const EXCLUSIVE_PARSER_TABLE: Record<string, "generic" | ExclusiveParser> = {
	// 剑修
	千锋聚灵剑: "generic",
	春黎剑阵: compound_春黎剑阵,
	皓月剑诀: compound_皓月剑诀,
	念剑诀: "generic",
	通天剑诀: "generic",
	"新-青元剑诀": "generic",
	无极御剑诀: "generic",
	// 法修
	浩然星灵诀: "generic",
	元磁神光: "generic",
	周天星元: compound_周天星元,
	甲元仙符: "generic",
	星元化岳: "generic",
	玉书天戈符: "generic",
	九天真雷诀: "generic",
	// 魔修
	天魔降临咒: "generic",
	天轮魔经: "generic",
	天刹真魔: compound_天刹真魔,
	解体化形: "generic",
	大罗幻诀: "generic",
	梵圣真魔咒: "generic",
	无相魔劫咒: compound_无相魔劫咒,
	// 体修
	玄煞灵影诀: "generic",
	惊蜇化龙: compound_惊蜇化龙,
	十方真魄: "generic",
	疾风九变: "generic",
	煞影千幻: "generic",
	九重天凤诀: "generic",
	天煞破虚诀: "generic",
};
