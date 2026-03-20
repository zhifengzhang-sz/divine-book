/**
 * Layer 2: Split Engine + Per-Book Effect Parser
 *
 * Uses grammar type from book-table to decompose each book's
 * skill text into typed effects. This is the core logic that
 * understands how to parse each book's specific patterns.
 */

import type { Grammar } from "./book-table.js";
import type { EffectRow } from "./emit.js";
import {
	AFFIX_EXTRACTORS,
	type ExtractedEffect,
	extractCounterBuff,
	extractDot,
	SKILL_EXTRACTORS,
} from "./extract.js";
import type { SplitCell } from "./md-table.js";
import { buildStateRegistry, type StateRegistry } from "./states.js";
import { buildDataState, resolveFields } from "./tiers.js";

export interface ParsedBook {
	school: string;
	skillText?: string;
	affixText?: string;
	exclusiveAffixText?: string;
	states?: StateRegistry;
	skill: EffectRow[];
	primaryAffix?: { name: string; effects: EffectRow[] };
	exclusiveAffix?: { name: string; effects: EffectRow[] };
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

	// Resolve any variable references in state definitions using tier data
	if (skillCell.tiers.length > 0) {
		const tierVars = skillCell.tiers[0]?.vars ?? {};
		for (const sDef of Object.values(states)) {
			const varRef = sDef._max_stacks_var;
			if (typeof varRef === "string" && tierVars[varRef] !== undefined) {
				sDef.max_stacks = tierVars[varRef];
			}
			delete sDef._max_stacks_var;
		}
	}

	// Parse skill effects
	const skill = parseSkillEffects(name, grammar, skillCell, states);

	// Parse primary affix
	let primaryAffix: { name: string; effects: EffectRow[] } | undefined;
	if (affixCell.description.length > 0) {
		primaryAffix = parsePrimaryAffix(name, affixCell, states);
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
	// Match both line-start and inline patterns
	for (const line of cell.description) {
		const childRe = /【(.+?)】[：:]/g;
		for (const childMatch of line.matchAll(childRe)) {
			const childName = childMatch[1];
			const childText = line.slice(childMatch.index + childMatch[0].length);

			// Skip if this is a state reference (e.g. "添加1层【X】与【Y】") not a definition
			// A definition has descriptive text after 【name】：
			if (childText.length === 0) continue;

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

			// Try extracting dot from child definition
			const dot = extractDot(childText);
			if (dot) {
				// Keep variable references (e.g., "y") unresolved —
				// the per-tier loop resolves them via resolveFields()
				extracted.push({
					effect: { ...dot, meta: extra },
					order: 30,
				});
				continue;
			}

			// Try extracting counter_buff from child definition
			const counterBuff = extractCounterBuff(childText);
			if (counterBuff) {
				// Check if a duplicate counter_buff already exists from SKILL_EXTRACTORS
				const duplicate = extracted.find(
					(e) => e.effect.type === "counter_buff",
				);
				if (duplicate) {
					// Enrich the existing one with child state metadata
					if (!duplicate.effect.meta) duplicate.effect.meta = {};
					for (const [k, v] of Object.entries(extra)) {
						duplicate.effect.meta[k] = v;
					}
				} else {
					extracted.push({
						effect: {
							...counterBuff,
							meta: { ...counterBuff.meta, ...extra },
						},
						order: 30,
					});
				}
			}
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

		const ds = buildDataState(tier);
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

	// Synthesize a base tier if all base_attack entries require fusion.
	// Every book has a base skill damage of 1500 (school default) that should
	// be available without a fusion gate. The raw source only lists snapshots
	// at specific progression levels — the base is implicit.
	ensureBaseTier(effects, extracted);

	return effects;
}

const BASE_SKILL_TOTAL = 1500;

/**
 * Ensure effects include a base_attack tier usable without a fusion gate.
 *
 * The raw source lists tier snapshots at specific progression levels, but
 * every book implicitly has base skill damage of 1500. If the parser only
 * captured high-tier snapshots, we synthesize an accessible base tier.
 *
 * Rules:
 * - If there's already a base_attack with no data_state, or with only
 *   enlightenment=0 — nothing to do.
 * - If all base_attack entries require fusion — insert a base tier before
 *   the first non-locked one. The base tier keeps the same hits count,
 *   sets total=1500, and uses the minimum enlightenment requirement
 *   (respecting locked tiers: if e=0 is locked, use e=1).
 * - If the lowest non-locked base_attack already has total=1500, just
 *   strip the fusion requirement from its data_state instead of adding
 *   a duplicate.
 */
function ensureBaseTier(
	effects: EffectRow[],
	extracted: { effect: ExtractedEffect; order: number }[],
): void {
	const baseAttacks = effects.filter((e) => e.type === "base_attack");
	if (baseAttacks.length === 0) return;

	// Check if any base_attack is already usable without fusion
	const hasAccessibleBase = baseAttacks.some((e) => {
		const ds = e.data_state;
		if (!ds) return true;
		if (ds === "locked") return false;
		const entries = Array.isArray(ds) ? ds : [ds];
		// Accessible if no fusion requirement
		return !entries.some(
			(s) => typeof s === "string" && s.startsWith("fusion="),
		);
	});
	if (hasAccessibleBase) return;

	// Find the first non-locked base_attack
	const firstReal = baseAttacks.find((e) => e.data_state !== "locked");
	if (!firstReal) return;

	// Determine minimum enlightenment (0 unless locked at 0)
	const hasLockedTier = baseAttacks.some((e) => e.data_state === "locked");
	const minEnlightenment = hasLockedTier ? 1 : 0;

	// Get hits from the extracted base_attack pattern
	const baseExtracted = extracted.find((e) => e.effect.type === "base_attack");
	const hits =
		(firstReal.hits as number) ??
		(baseExtracted?.effect.fields.hits as number) ??
		1;

	// If the first real tier already has total=1500, just strip fusion
	if ((firstReal.total as number) === BASE_SKILL_TOTAL) {
		firstReal.data_state =
			minEnlightenment > 0 ? `enlightenment=${minEnlightenment}` : undefined;
		return;
	}

	// Synthesize a new base tier and insert before the first real one
	const baseTier: EffectRow = {
		type: "base_attack",
		hits,
		total: BASE_SKILL_TOTAL,
	};
	if (minEnlightenment > 0) {
		baseTier.data_state = `enlightenment=${minEnlightenment}`;
	} else {
		baseTier.data_state = "enlightenment=0";
	}

	// Insert before the first non-locked base_attack
	const insertIdx = effects.indexOf(firstReal);
	effects.splice(insertIdx, 0, baseTier);
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
	let match: RegExpExecArray | null = re.exec(text);
	while (match !== null) {
		const name = match[1];
		// Find the end: next 【 or end of text
		const startAfter = match.index + match[0].length;
		const nextBracket = text.indexOf("【", startAfter);
		const end = nextBracket === -1 ? text.length : nextBracket;
		stateSegments.push({ name, start: match.index, end });
		match = re.exec(text);
	}

	if (stateSegments.length === 0) return;

	// For each extracted effect, check if its type-specific pattern text
	// falls within a named state segment
	for (const item of extracted) {
		const effect = item.effect;

		// For various effect types, check if the pattern is inside a named state def
		if (
			effect.type === "debuff" ||
			effect.type === "counter_debuff" ||
			effect.type === "self_hp_cost" ||
			effect.type === "self_lost_hp_damage" ||
			effect.type === "counter_buff"
		) {
			for (const seg of stateSegments) {
				const stateDef = states[seg.name];
				if (!stateDef) continue;
				const segText = text.slice(seg.start, seg.end);

				if (effect.type === "debuff") {
					// Match using absolute value (strip leading "-" from already-negated values)
					const val = String(effect.fields.value);
					const absVal = val.startsWith("-") ? val.slice(1) : val;
					if (segText.includes(`${absVal}%`)) {
						if (!effect.meta) effect.meta = {};
						effect.meta.name = seg.name;
						if (stateDef.per_hit_stack) effect.meta.per_hit_stack = true;
						if (stateDef.dispellable === false) effect.meta.dispellable = false;
						// Value is already negative from extractDebuff — don't negate again
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
				if (
					effect.type === "self_hp_cost" ||
					effect.type === "self_lost_hp_damage" ||
					effect.type === "counter_buff"
				) {
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
// Generic Affix Parsing
// ─────────────────────────────────────────────────────────

/**
 * Generic affix parser — runs AFFIX_EXTRACTORS against the text.
 * Used for both primary and exclusive affixes when no book-specific
 * compound parser exists. Always emits data_state per tier.
 */
export function genericAffixParse(
	cell: SplitCell,
	states: StateRegistry,
	options?: { defaultParent?: string },
): EffectRow[] {
	const rawText = cell.description.join("，");
	const tiers = cell.tiers;

	// Strip leading 【affixName】： prefix so extractors see clean text
	const text = rawText.replace(/^【.+?】[：:]/, "");

	// Detect referenced state names from 【name】 in the affix text (after the affix name)
	// These are states from the platform skill that this affix modifies
	const stateRefs: string[] = [];
	const stateRefRe = /【(.+?)】/g;
	// Skip the first match (affix name itself), collect the rest
	let first = true;
	let refMatch = stateRefRe.exec(rawText);
	while (refMatch) {
		if (first) {
			first = false;
		} else {
			stateRefs.push(refMatch[1]);
		}
		refMatch = stateRefRe.exec(rawText);
	}
	// The referenced parent state: use the first state ref that exists in the registry
	const referencedParent = stateRefs.find((s) => states[s]) ?? stateRefs[0];

	// Run all registered affix extractors
	const extracted: { effect: ExtractedEffect; order: number }[] = [];
	for (const def of AFFIX_EXTRACTORS) {
		const result = def.fn(text);
		if (result) {
			extracted.push({ effect: result, order: def.order });
		}
	}

	if (extracted.length === 0) return [];

	// Sort by order
	extracted.sort((a, b) => a.order - b.order);

	// Detect "（数据为没有悟境的情况）" annotation → data_state: "enlightenment=0"
	const noEnlightenment = /数据为没有悟境/.test(text);

	// Effect types that use buff_name — these get parent from state reference
	const BUFF_NAME_TYPES = new Set(["self_buff_extra", "self_buff_extend"]);

	// Helper: resolve one set of effects from a tier
	const resolveEffects = (
		vars: Record<string, number>,
		ds?: undefined | string | string[],
	): EffectRow[] => {
		const effects: EffectRow[] = [];
		for (const { effect } of extracted) {
			const resolved = resolveFields(effect.fields, vars);
			const extra: Record<string, unknown> = {};
			if (effect.meta) {
				for (const [k, v] of Object.entries(effect.meta)) {
					extra[k] = v;
				}
			}
			// Apply parent:
			// 1. If effect already has parent from extractor, keep it
			// 2. If effect is buff_name type AND text references a state → use that state
			// 3. Otherwise use defaultParent (typically "this")
			if (!extra.parent) {
				if (BUFF_NAME_TYPES.has(effect.type) && referencedParent) {
					extra.parent = referencedParent;
				} else if (options?.defaultParent) {
					extra.parent = options.defaultParent;
				}
			}
			if (noEnlightenment) extra.data_state = "enlightenment=0";
			else if (ds !== undefined) extra.data_state = ds;
			effects.push({ type: effect.type, ...resolved, ...extra } as EffectRow);
		}
		return effects;
	};

	// No tier data — resolve with empty vars
	if (tiers.length === 0) {
		return resolveEffects({});
	}

	// Expand per-tier with data_state
	const effects: EffectRow[] = [];
	for (const tier of tiers) {
		if (tier.locked) {
			effects.push({
				type: extracted[0].effect.type,
				data_state: "locked",
			} as EffectRow);
			continue;
		}

		const ds = buildDataState(tier);
		effects.push(...resolveEffects(tier.vars, ds));
	}

	return effects;
}

// ─────────────────────────────────────────────────────────
// Book-specific parsers
// ─────────────────────────────────────────────────────────

type BookParser = (cell: SplitCell, states: StateRegistry) => EffectRow[];

const BOOK_PARSERS: Record<string, BookParser> = {
	天魔降临咒: parseTianMoJiangLin,
	惊蜇化龙: parseJingZheHuaLong,
};

// ─── Remaining book-specific parsers ────────────────────

function parseTianMoJiangLin(
	cell: SplitCell,
	_states: StateRegistry,
): EffectRow[] {
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

/**
 * 惊蜇化龙: G4 grammar — hp_cost + base_attack + lost_hp_damage + self_buff
 *
 * Source text uses "x" for BOTH self_hp_cost% and base_attack total%,
 * but x=1500 is the attack total — not a reasonable HP cost.
 * The same "x" in "消耗自身x%当前气血值" is a source data variable collision.
 * We treat self_hp_cost as unresolved (the game likely uses a fixed or
 * separate internal value). Use the typical body-book pattern of keeping
 * x as HP cost only when it's a small number.
 *
 * Vars: x=1500, y=10, z=20
 * - base_attack: 八段共x% → 1500
 * - self_lost_hp_damage: y% → 10
 * - self_buff (skill_damage_increase): z% → 20, duration=4
 */
function parseJingZheHuaLong(
	cell: SplitCell,
	_states: StateRegistry,
): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	const { x, y, z } = tier.vars;
	return [
		{
			type: "self_hp_cost",
			value: x >= 100 ? "x" : x,
		} as EffectRow,
		{ type: "base_attack", hits: 8, total: x } as EffectRow,
		{ type: "self_lost_hp_damage", value: y } as EffectRow,
		{
			type: "self_buff",
			skill_damage_increase: z,
			duration: 4,
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
	const text = cell.description.join("，");

	// Extract affix name from 【name】
	const nameMatch = text.match(/【(.+?)】/);
	const affixName = nameMatch ? nameMatch[1] : "";

	// Book-specific affix parsers (for complex compound patterns)
	const specific = AFFIX_PARSERS[bookName];
	if (specific) {
		const effects = specific(cell);
		if (effects.length > 0) {
			return { name: affixName, effects };
		}
	}

	// Generic affix parse as fallback
	const effects = genericAffixParse(cell, states, { defaultParent: "this" });
	if (effects.length > 0) {
		return { name: affixName, effects };
	}

	return affixName ? { name: affixName, effects: [] } : undefined;
}

type AffixParser = (cell: SplitCell) => EffectRow[];

const AFFIX_PARSERS: Record<string, AffixParser> = {
	// 千锋聚灵剑: handled by generic pipeline (extractPerHitEscalation + defaultParent)
	// 春黎剑阵: handled by generic pipeline (extractSummonBuff)
	// 皓月剑诀: handled by generic pipeline (extractShieldDestroyDot)
	// 念剑诀: handled by generic pipeline (extractExtendedDot)
	// 通天剑诀: handled by generic pipeline (extractPerEnemyLostHp)
	// 新-青元剑诀: handled by generic pipeline (extractDebuff)
	// 元磁神光: handled by generic pipeline (extractSelfBuffExtra)

	// parent "天鹤之佑" comes from skill state registry, not from affix text
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

	// 周天星元: handled by generic pipeline (extractShieldOnHeal + state registry match)

	// 甲元仙符: handled by generic pipeline (extractSelfBuffExtra, multi-tier with locked)

	// parent "天龙印" comes from skill state registry (text says "真灵天龙" only)
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

	// condition string "self_hp_above_20" needs resolved variable value (x=20)
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

	// 天魔降临咒: handled by generic pipeline (extractDotPermanentMaxHp + extractPerDebuffStackDamageUpgrade)
	// 天轮魔经: handled by generic pipeline (extractPerStolenBuffDebuff)

	// 6-effect compound pattern: counter_debuff + 5 cycling stat reductions
	// Source: 每3秒轮流降低目标x%致命率、x%暴击伤害、x%暴击率、y%攻击力、y%最终伤害减免
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
				type: "lethal_rate_reduction",
				value: -tier.vars.x,
				parent: "天人五衰",
				cycle_interval: 3,
				rotating: true,
			} as EffectRow,
			{
				type: "crit_damage_reduction",
				value: -tier.vars.x,
				parent: "天人五衰",
				cycle_interval: 3,
				rotating: true,
			} as EffectRow,
			{
				type: "crit_rate_reduction",
				value: -tier.vars.x,
				parent: "天人五衰",
				cycle_interval: 3,
				rotating: true,
			} as EffectRow,
			{
				type: "attack_reduction",
				value: -tier.vars.y,
				parent: "天人五衰",
				cycle_interval: 3,
				rotating: true,
			} as EffectRow,
			{
				type: "debuff",
				name: "天人五衰",
				target: "final_damage_reduction",
				value: -tier.vars.y,
				duration: 15,
				parent: "天人五衰",
				cycle_interval: 3,
				rotating: true,
			} as EffectRow,
		];
	},

	// 解体化形: handled by generic pipeline (extractAttackBonusPerDebuff)
	// 大罗幻诀: handled by generic pipeline (extractCounterDebuffUpgrade + extractCrossSlotDebuff)
	// 梵圣真魔咒: handled by generic pipeline (extractDotPerNStacks)
	// 无相魔劫咒: handled by generic pipeline (extractDelayedBurstIncrease + noEnlightenment)
	// 玄煞灵影诀: handled by generic pipeline (extractSelfLostHpDamageEveryN)
	// 惊蜇化龙: handled by generic pipeline (extractPercentMaxHpDamageAffix)
	// 十方真魄: handled by generic pipeline (extractSelfBuffExtend + extractPeriodicCleanse)
	// 疾风九变: handled by generic pipeline (extractLifestealWithParent)
	// 煞影千幻: handled by generic pipeline (extractShieldStrength + extractHpCostAvoidChance)
	// 九重天凤诀: handled by generic pipeline (extractPeriodicDispelAffix + extractSelfHpFloor)
};
