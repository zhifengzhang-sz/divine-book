/**
 * Layer 2: Split Engine + Per-Book Effect Parser
 *
 * Uses grammar type from book-table to decompose each book's
 * skill text into typed effects. This is the core logic that
 * understands how to parse each book's specific patterns.
 */

import type { EffectRow } from "./emit.js";
import type { Grammar } from "./book-table.js";
import type { SplitCell, TierLine } from "./md-table.js";
import { resolveFields } from "./tiers.js";
import { buildStateRegistry, type StateRegistry } from "./states.js";
import {
	extractDot,
	SKILL_EXTRACTORS,
	type ExtractedEffect,
} from "./extract.js";

export interface ParsedBook {
	school: string;
	states?: StateRegistry;
	skill: EffectRow[];
	primaryAffix?: { name: string; effects: EffectRow[] };
}

/**
 * Parse a single book from its raw cell text.
 */
export function parseBook(
	name: string,
	school: string,
	grammar: Grammar,
	skillCell: SplitCell,
	affixCell: SplitCell,
): ParsedBook {
	// Build state registry from skill description
	const states = buildStateRegistry(skillCell.description);

	// Parse skill effects
	const skill = parseSkillEffects(
		name,
		grammar,
		skillCell,
		states,
	);

	// Parse primary affix
	let primaryAffix: { name: string; effects: EffectRow[] } | undefined;
	if (affixCell.description.length > 0) {
		primaryAffix = parsePrimaryAffix(
			name,
			affixCell,
			states,
		);
	}

	const result: ParsedBook = { school, skill };
	if (Object.keys(states).length > 0) result.states = states;
	if (primaryAffix) result.primaryAffix = primaryAffix;

	return result;
}

// ─────────────────────────────────────────────────────────
// Skill parsing
// ─────────────────────────────────────────────────────────

function parseSkillEffects(
	bookName: string,
	grammar: Grammar,
	cell: SplitCell,
	states: StateRegistry,
): EffectRow[] {
	// Dispatch to book-specific parser if we have one,
	// otherwise use grammar-based generic parser
	const specific = BOOK_PARSERS[bookName];
	if (specific) {
		return specific(cell, states);
	}
	return genericSkillParse(grammar, cell, states);
}

function genericSkillParse(
	grammar: Grammar,
	cell: SplitCell,
	states: StateRegistry,
): EffectRow[] {
	const text = cell.description.join("，");
	const tiers = cell.tiers;

	// Run all registered extractors against the full text
	const extracted: { effect: ExtractedEffect; order: number }[] = [];
	for (const def of SKILL_EXTRACTORS) {
		// Grammar filter
		if (def.grammars && !def.grammars.includes(grammar)) continue;

		const result = def.fn(text);
		if (result) {
			extracted.push({ effect: result, order: def.order });
		}
	}

	// Enrich effects with named state info from the text
	// If an effect's pattern is inside a 【name】：... definition, link it
	enrichWithNamedStates(extracted, text, states);

	// Sort by order
	extracted.sort((a, b) => a.order - b.order);

	// Parse child state definitions from description lines (【name】：...)
	for (const line of cell.description) {
		const childMatch = line.match(/^【(.+?)】[：:]/);
		if (!childMatch) continue;
		const childName = childMatch[1];
		const childText = line.slice(childMatch[0].length);

		// Extract dot from child definition
		const dot = extractDot(childText);
		if (dot) {
			// Find parent state name
			let parentName: string | undefined;
			for (const [sName, sDef] of Object.entries(states)) {
				if (sDef.children?.includes(childName)) {
					parentName = sName;
					break;
				}
			}

			const extra: Record<string, unknown> = { name: childName };
			if (parentName) extra.parent = parentName;

			const childState = states[childName];
			if (childState?.max_stacks) extra.max_stacks = childState.max_stacks;

			extracted.push({
				effect: { ...dot, meta: extra },
				order: 30,
			});
		}
	}

	// Detect "（数据为没有悟境的情况）" annotation → data_state: "enlightenment=0"
	const noEnlightenment = /数据为没有悟境/.test(text);

	// Expand per-tier to maintain interleaved ordering
	// (each tier gets all effects before moving to next tier)
	if (tiers.length === 0) {
		// No tier data — resolve with empty vars
		const effects: EffectRow[] = [];
		for (const { effect } of extracted) {
			const resolved = resolveFields(effect.fields, {});
			const extra: Record<string, unknown> = {};
			if (effect.meta) {
				for (const [k, v] of Object.entries(effect.meta)) {
					extra[k] = v;
				}
			}
			if (noEnlightenment) extra.data_state = "enlightenment=0";
			effects.push({ type: effect.type, ...resolved, ...extra } as EffectRow);
		}
		return effects;
	}

	const effects: EffectRow[] = [];
	for (const tier of tiers) {
		if (tier.locked) {
			// For locked tiers, emit a locked base_attack placeholder
			effects.push({ type: "base_attack", data_state: "locked" } as EffectRow);
			continue;
		}

		const ds = buildDs(tier);
		for (const { effect } of extracted) {
			const resolved = resolveFields(effect.fields, tier.vars);
			const extra: Record<string, unknown> = {};
			if (effect.meta) {
				for (const [k, v] of Object.entries(effect.meta)) {
					extra[k] = v;
				}
			}
			if (ds !== undefined) extra.data_state = ds;

			effects.push({ type: effect.type, ...resolved, ...extra } as EffectRow);
		}
	}

	return effects;
}

/**
 * Enrich extracted effects with named state metadata.
 * When a debuff, self_buff, counter_buff, etc. is inside a 【name】：... pattern,
 * add name, per_hit_stack, dispellable from the state registry.
 */
function enrichWithNamedStates(
	extracted: { effect: ExtractedEffect; order: number }[],
	text: string,
	states: StateRegistry,
): void {
	// Find all named state references in the text: 【name】：...
	const stateSegments: { name: string; start: number; end: number }[] = [];
	const re = /【(.+?)】[：:]/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(text)) !== null) {
		const name = match[1];
		// Find the end: next 【 or end of text
		const startAfter = match.index + match[0].length;
		const nextBracket = text.indexOf("【", startAfter);
		const end = nextBracket === -1 ? text.length : nextBracket;
		stateSegments.push({ name, start: match.index, end });
	}

	if (stateSegments.length === 0) return;

	// For each extracted effect, check if its type-specific pattern text
	// falls within a named state segment
	for (const item of extracted) {
		const effect = item.effect;

		// For various effect types, check if the pattern is inside a named state def
		if (effect.type === "debuff" || effect.type === "counter_debuff" ||
			effect.type === "self_hp_cost" || effect.type === "self_lost_hp_damage" ||
			effect.type === "counter_buff") {
			for (const seg of stateSegments) {
				const stateDef = states[seg.name];
				if (!stateDef) continue;
				const segText = text.slice(seg.start, seg.end);

				if (effect.type === "debuff") {
					const val = String(effect.fields.value);
					if (segText.includes(`${val}%`)) {
						if (!effect.meta) effect.meta = {};
						effect.meta.name = seg.name;
						if (stateDef.per_hit_stack) effect.meta.per_hit_stack = true;
						if (stateDef.dispellable === false) effect.meta.dispellable = false;
						effect.fields.value = -Number(val) || `-${val}`;
						break;
					}
				}

				if (effect.type === "counter_debuff") {
					if (segText.includes("概率对攻击方添加")) {
						if (!effect.meta) effect.meta = {};
						effect.meta.name = seg.name;
						if (stateDef.duration) effect.meta.duration = stateDef.duration;
						break;
					}
				}

				// self_hp_cost / self_lost_hp_damage / counter_buff inside a named state
				if (effect.type === "self_hp_cost" || effect.type === "self_lost_hp_damage" ||
					effect.type === "counter_buff") {
					const val = String(effect.fields.value);
					if (segText.includes(`${val}%`)) {
						if (!effect.meta) effect.meta = {};
						// self_hp_cost gets name, self_lost_hp_damage gets parent
						if (effect.type === "self_hp_cost") {
							effect.meta.name = seg.name;
						} else {
							effect.meta.parent = seg.name;
						}
						if (stateDef.duration) effect.meta.duration = stateDef.duration;
						if (effect.type === "counter_buff") {
							effect.meta.name = seg.name;
							if (stateDef.duration) effect.meta.duration = stateDef.duration;
						}
						break;
					}
				}
			}
		}
	}
}

// ─────────────────────────────────────────────────────────
// Book-specific parsers
// ─────────────────────────────────────────────────────────

type BookParser = (
	cell: SplitCell,
	states: StateRegistry,
) => EffectRow[];

const BOOK_PARSERS: Record<string, BookParser> = {
	天魔降临咒: parseTianMoJiangLin,
};

// ─── Remaining book-specific parsers ────────────────────

function parseTianMoJiangLin(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{
			type: "self_buff",
			name: "结魂锁链",
			damage_reduction: tier.vars.y,
			duration: "permanent",
			max_stacks: 1,
		} as EffectRow,
		{
			type: "debuff",
			name: "结魂锁链",
			target: "damage_reduction",
			value: -tier.vars.z,
			duration: "permanent",
		} as EffectRow,
		{
			type: "per_debuff_stack_damage",
			per_n_stacks: 1,
			value: tier.vars.w,
			max: tier.vars.u,
			parent: "结魂锁链",
		} as EffectRow,
	];
}


// ─────────────────────────────────────────────────────────
// Primary Affix parsing
// ─────────────────────────────────────────────────────────

function parsePrimaryAffix(
	bookName: string,
	cell: SplitCell,
	states: StateRegistry,
): { name: string; effects: EffectRow[] } | undefined {
	const text = cell.description.join(" ");
	const tiers = cell.tiers;

	// Extract affix name from 【name】
	const nameMatch = text.match(/【(.+?)】/);
	const affixName = nameMatch ? nameMatch[1] : "";

	// Book-specific affix parsers
	const specific = AFFIX_PARSERS[bookName];
	if (specific) {
		const effects = specific(cell);
		if (effects.length > 0) {
			return { name: affixName, effects };
		}
	}

	return affixName ? { name: affixName, effects: [] } : undefined;
}

type AffixParser = (cell: SplitCell) => EffectRow[];

const AFFIX_PARSERS: Record<string, AffixParser> = {
	千锋聚灵剑: (cell) => {
		const effects: EffectRow[] = [];
		for (const tier of cell.tiers) {
			const ds = buildDs(tier);
			effects.push({
				type: "per_hit_escalation",
				value: tier.vars.x,
				stat: "skill_bonus",
				parent: "this",
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
		}
		return effects;
	},

	春黎剑阵: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "summon_buff",
				damage_taken_reduction_to: tier.vars.x,
				damage_increase: tier.vars.y,
				parent: "this",
			} as EffectRow,
		];
	},

	皓月剑诀: () => [
		{
			type: "shield_destroy_dot",
			tick_interval: 0.5,
			per_shield_damage: 600,
			no_shield_assumed: 2,
			parent: "寂灭剑心",
		} as EffectRow,
	],

	念剑诀: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "extended_dot",
				extra_seconds: tier.vars.x,
				tick_interval: 0.5,
				parent: "this",
			} as EffectRow,
		];
	},

	通天剑诀: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "per_enemy_lost_hp",
				per_percent: 2,
				parent: "this",
			} as EffectRow,
		];
	},

	"新-青元剑诀": (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "debuff",
				name: "追命剑阵",
				target: "skill_damage",
				value: -tier.vars.x,
				duration: 16,
				parent: "this",
			} as EffectRow,
		];
	},

	浩然星灵诀: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "conditional_damage",
				condition: "self_final_damage_per_10",
				value: tier.vars.y,
				parent: "天鹤之佑",
			} as EffectRow,
		];
	},

	元磁神光: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "self_buff_extra",
				buff_name: "天狼之啸",
				attack_bonus: tier.vars.x,
			} as EffectRow,
		];
	},

	周天星元: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "shield",
				value: tier.vars.x,
				source: "self_max_hp",
				duration: 16,
				parent: "回生灵鹤",
			} as EffectRow,
		];
	},

	甲元仙符: (cell) => {
		const effects: EffectRow[] = [];
		for (const tier of cell.tiers) {
			if (tier.locked) {
				effects.push({
					type: "self_buff_extra",
					data_state: "locked",
				} as EffectRow);
				continue;
			}
			const ds = buildDs(tier);
			effects.push({
				type: "self_buff_extra",
				buff_name: "仙佑",
				healing_bonus: tier.vars.x,
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
		}
		return effects;
	},

	星元化岳: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "lifesteal",
				value: tier.vars.x,
				parent: "天龙印",
			} as EffectRow,
		];
	},

	玉书天戈符: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "conditional_damage",
				condition: "self_hp_above_20",
				per_step: tier.vars.y,
				value: tier.vars.y,
				parent: "this",
			} as EffectRow,
		];
	},

	天魔降临咒: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "dot",
				parent: "结魂锁链",
				tick_interval: 1,
				percent_max_hp: tier.vars.x,
				duration: "permanent",
			} as EffectRow,
			{
				type: "per_debuff_stack_damage",
				per_n_stacks: 1,
				value: 0.5,
				max: tier.vars.y,
				parent: "结魂锁链",
			} as EffectRow,
		];
	},

	天轮魔经: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "debuff",
				name: "惧意",
				target: "attack",
				value: -tier.vars.x,
				duration: 12,
				per_stolen_buff: true,
				parent: "this",
			} as EffectRow,
		];
	},

	天刹真魔: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "counter_debuff",
				name: "天人五衰",
				duration: 15,
				on_attacked_chance: 100,
				parent: "不灭魔体",
			} as EffectRow,
			{
				type: "crit_rate_reduction",
				value: -tier.vars.x,
				parent: "天人五衰",
			} as EffectRow,
			{
				type: "crit_damage_reduction",
				value: -tier.vars.x,
				parent: "天人五衰",
			} as EffectRow,
			{
				type: "attack_reduction",
				value: -tier.vars.y,
				parent: "天人五衰",
			} as EffectRow,
			{
				type: "debuff",
				name: "天人五衰",
				target: "final_damage_reduction",
				value: -tier.vars.y,
				duration: 15,
				parent: "天人五衰",
			} as EffectRow,
		];
	},

	解体化形: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "attack_bonus",
				value: tier.vars.x,
				per_debuff_stack: true,
				max_stacks: 30,
				parent: "this",
			} as EffectRow,
		];
	},

	大罗幻诀: () => [
		{
			type: "counter_debuff_upgrade",
			on_attacked_chance: 60,
			parent: "罗天魔咒",
		} as EffectRow,
		{
			type: "cross_slot_debuff",
			name: "命损",
			target: "final_damage_reduction",
			value: -100,
			duration: 8,
			trigger: "on_attacked",
			parent: "罗天魔咒",
		} as EffectRow,
	],

	梵圣真魔咒: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "dot",
				name: "瞋痴业火",
				parent: "贪妄业火",
				per_n_stacks: 2,
				tick_interval: 1,
				percent_lost_hp: tier.vars.x,
				duration: 8,
			} as EffectRow,
		];
	},

	无相魔劫咒: () => [
		{
			type: "delayed_burst_increase",
			value: 65,
			parent: "无相魔劫",
			data_state: "enlightenment=0",
		} as EffectRow,
	],

	玄煞灵影诀: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		const ds = buildDs(tier);
		return [
			{
				type: "self_lost_hp_damage",
				value: tier.vars.x,
				parent: "怒意滔天",
				every_n_hits: 4,
				...(ds ? { data_state: ds } : {}),
			} as EffectRow,
		];
	},

	惊蜇化龙: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "percent_max_hp_damage",
				name: "镇杀",
				value: tier.vars.x,
				parent: "this",
			} as EffectRow,
		];
	},

	十方真魄: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "self_buff_extend",
				buff_name: "怒灵降世",
				value: tier.vars.x,
			} as EffectRow,
			{
				type: "periodic_cleanse",
				chance: tier.vars.y,
				interval: 1,
				cooldown: 25,
				max_triggers: 1,
				parent: "this",
			} as EffectRow,
		];
	},

	疾风九变: () => [
		{
			type: "lifesteal",
			value: 82,
			parent: "极怒",
		} as EffectRow,
	],

	煞影千幻: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "shield_strength",
				value: tier.vars.x,
				parent: "this",
			} as EffectRow,
		];
	},

	九重天凤诀: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "periodic_dispel",
				count: 2,
				parent: "this",
			} as EffectRow,
			{
				type: "self_hp_floor",
				value: tier.vars.x,
				parent: "this",
			} as EffectRow,
		];
	},
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function buildDs(
	tier: TierLine,
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
