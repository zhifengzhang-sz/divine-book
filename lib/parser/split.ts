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
import { expandTiers, resolveFields } from "./tiers.js";
import { buildStateRegistry, type StateRegistry } from "./states.js";
import {
	extractBaseAttackWithVars,
	extractPercentHpDamage,
	extractSelfHpCost,
	extractSelfBuffStats,
	extractDot,
	extractSummon,
	extractCritDamageBonus,
	extractSelfDamageTakenIncrease,
	extractPercentCurrentHpDamage,
	extractShield,
	extractShieldDestroyDamage,
	extractSelfLostHpDamage,
	extractCounterBuff,
	extractUntargetable,
	extractPeriodicEscalation,
	extractPerHitEscalation,
	extractBuffSteal,
	extractPerDebuffStackDamage,
	extractPerEnemyLostHp,
	extractSelfCleanse,
	extractSelfHeal,
	extractDelayedBurst,
	extractConditionalDamageFromCleanse,
	extractSkillCooldownDebuff,
	extractEchoDamage,
	extractCounterDebuff,
	extractSelfHpCostDot,
	extractSelfLostHpDamageDot,
	extractDebuff,
	extractNamedState,
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
	const effects: EffectRow[] = [];
	const text = cell.description.join("，");
	const tiers = cell.tiers;

	// G4/G5: extract leading self_hp_cost
	if (grammar === "G4" || grammar === "G5") {
		const hpCost = extractSelfHpCost(text);
		if (hpCost) {
			effects.push(
				...expandTiers(
					hpCost.fields,
					"self_hp_cost",
					tiers,
				),
			);
		}
	}

	// Extract base_attack
	const ba = extractBaseAttackWithVars(text);
	if (ba) {
		const baFields: Record<string, string | number> = {
			hits: ba.hits,
			total: ba.totalVar,
		};
		effects.push(...expandTiers(baFields, "base_attack", tiers));
	}

	return effects;
}

// ─────────────────────────────────────────────────────────
// Book-specific parsers
// ─────────────────────────────────────────────────────────

type BookParser = (
	cell: SplitCell,
	states: StateRegistry,
) => EffectRow[];

const BOOK_PARSERS: Record<string, BookParser> = {
	千锋聚灵剑: parseQianFeng,
	春黎剑阵: parseChunLi,
	皓月剑诀: parseHaoYue,
	念剑诀: parseNianJian,
	通天剑诀: parseTongTian,
	"新-青元剑诀": parseQingYuan,
	无极御剑诀: parseWuJi,
	浩然星灵诀: parseHaoRan,
	元磁神光: parseYuanCi,
	周天星元: parseZhouTian,
	甲元仙符: parseJiaYuan,
	星元化岳: parseXingYuanHuaYue,
	玉书天戈符: parseYuShu,
	九天真雷诀: parseJiuTianLei,
	天魔降临咒: parseTianMoJiangLin,
	天轮魔经: parseTianLunMoJing,
	天刹真魔: parseTianShaZhenMo,
	解体化形: parseJieTiHuaXing,
	大罗幻诀: parseDaLuoHuanJue,
	梵圣真魔咒: parseFanSheng,
	无相魔劫咒: parseWuXiangMoJie,
	玄煞灵影诀: parseXuanSha,
	惊蜇化龙: parseJingZheHuaLong,
	十方真魄: parseShiFangZhenPo,
	疾风九变: parseJiFengJiuBian,
	煞影千幻: parseShaYingQianHuan,
	九重天凤诀: parseJiuChongTianFeng,
	天煞破虚诀: parseTianShaPoXu,
};

// ─── Sword ──────────────────────────────────────────────

function parseQianFeng(cell: SplitCell): EffectRow[] {
	const tiers = cell.tiers;
	const effects: EffectRow[] = [];

	for (const tier of tiers) {
		if (tier.locked) {
			effects.push({ type: "base_attack", data_state: "locked" } as EffectRow);
			continue;
		}
		const ds = buildDs(tier);
		effects.push({
			type: "base_attack",
			hits: 6,
			total: tier.vars.x,
			...(ds ? { data_state: ds } : {}),
		} as EffectRow);
		effects.push({
			type: "percent_max_hp_damage",
			value: tier.vars.y,
			cap_vs_monster: tier.vars.z,
			...(ds ? { data_state: ds } : {}),
		} as EffectRow);
	}

	return effects;
}

function parseChunLi(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{
			type: "summon",
			inherit_stats: tier.vars.y,
			duration: 16,
			damage_taken_multiplier: tier.vars.z,
		} as EffectRow,
	];
}

function parseHaoYue(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 10, total: tier.vars.x } as EffectRow,
		{
			type: "shield_destroy_damage",
			shields_per_hit: 1,
			percent_max_hp: tier.vars.y,
			cap_vs_monster: tier.vars.z,
			no_shield_double_cap: tier.vars.w,
			name: "寂灭剑心",
			duration: 4,
			max_stacks: 1,
		} as EffectRow,
	];
}

function parseNianJian(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "untargetable_state", duration: 4 } as EffectRow,
		{ type: "base_attack", hits: 8, total: tier.vars.x } as EffectRow,
		{
			type: "periodic_escalation",
			every_n_hits: 2,
			multiplier: tier.vars.y,
			max_stacks: 10,
		} as EffectRow,
	];
}

function parseTongTian(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 6, total: tier.vars.x } as EffectRow,
		{ type: "crit_damage_bonus", value: tier.vars.y } as EffectRow,
		{
			type: "self_damage_taken_increase",
			value: tier.vars.z,
			duration: 8,
		} as EffectRow,
	];
}

function parseQingYuan(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 6, total: tier.vars.x } as EffectRow,
		{
			type: "debuff",
			name: "神通封印",
			target: "next_skill_cooldown",
			value: -8,
			duration: 8,
		} as EffectRow,
	];
}

function parseWuJi(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{
			type: "percent_current_hp_damage",
			value: tier.vars.y,
			per_prior_hit: true,
		} as EffectRow,
	];
}

// ─── Spell ──────────────────────────────────────────────

function parseHaoRan(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{
			type: "self_buff",
			name: "天鹤之佑",
			final_damage_bonus: tier.vars.y,
			duration: 20,
		} as EffectRow,
	];
}

function parseYuanCi(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{
			type: "self_buff",
			name: "天狼之啸",
			damage_increase: tier.vars.y,
			max_stacks: tier.vars.z,
			duration: 12,
			trigger: "on_attacked",
		} as EffectRow,
	];
}

function parseZhouTian(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "self_heal", value: tier.vars.x, duration: 4 } as EffectRow,
		{ type: "base_attack", hits: 5, total: tier.vars.y } as EffectRow,
		{
			type: "self_heal",
			name: "回生灵鹤",
			value: tier.vars.w,
			duration: 20,
		} as EffectRow,
	];
}

function parseJiaYuan(cell: SplitCell): EffectRow[] {
	const tiers = cell.tiers;
	const effects: EffectRow[] = [];
	let buffEmitted = false;

	for (const tier of tiers) {
		if (tier.locked) {
			effects.push({ type: "base_attack", data_state: "locked" } as EffectRow);
			continue;
		}
		const ds = buildDs(tier);
		effects.push({
			type: "base_attack",
			total: tier.vars.x,
			...(ds ? { data_state: ds } : {}),
		} as EffectRow);
		// self_buff only emitted once (values don't change across tiers)
		if (!buffEmitted && tier.vars.y !== undefined) {
			buffEmitted = true;
			effects.push({
				type: "self_buff",
				name: "仙佑",
				attack_bonus: tier.vars.y,
				defense_bonus: tier.vars.y,
				hp_bonus: tier.vars.y,
				duration: 12,
				...(ds ? { data_state: ds } : {}),
			} as EffectRow);
		}
	}

	return effects;
}

function parseXingYuanHuaYue(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{
			type: "debuff",
			name: "天龙印",
			target: "echo_damage",
			value: tier.vars.y,
			duration: 8,
		} as EffectRow,
	];
}

function parseYuShu(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 3, total: tier.vars.x } as EffectRow,
		{
			type: "percent_max_hp_damage",
			value: tier.vars.y,
			source: "self",
		} as EffectRow,
	];
}

function parseJiuTianLei(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{ type: "self_cleanse", count: tier.vars.y } as EffectRow,
		{
			type: "conditional_damage",
			condition: "cleanse_excess",
			value: tier.vars.z,
		} as EffectRow,
	];
}

// ─── Demon ──────────────────────────────────────────────

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

function parseTianLunMoJing(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 7, total: tier.vars.x } as EffectRow,
		{ type: "buff_steal", count: tier.vars.y } as EffectRow,
		{
			type: "percent_max_hp_damage",
			value: tier.vars.z,
			per_stolen_buff: true,
		} as EffectRow,
	];
}

function parseTianShaZhenMo(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{
			type: "counter_buff",
			name: "不灭魔体",
			duration: "permanent",
			heal_on_damage_taken: tier.vars.y,
			no_healing_bonus: true,
		} as EffectRow,
	];
}

function parseJieTiHuaXing(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{
			type: "per_debuff_stack_damage",
			per_n_stacks: 1,
			value: tier.vars.y,
			max: 10 * tier.vars.y,
		} as EffectRow,
	];
}

function parseDaLuoHuanJue(cell: SplitCell): EffectRow[] {
	// Special: no tier vars, all hardcoded in text
	// "造成五段共20265%攻击力的灵法伤害"
	const effects: EffectRow[] = [
		{ type: "base_attack", hits: 5, total: 20265 } as EffectRow,
		{
			type: "counter_debuff",
			name: "罗天魔咒",
			duration: 8,
			on_attacked_chance: 30,
		} as EffectRow,
	];

	// Child dots from sub-state lines
	effects.push({
		type: "dot",
		name: "噬心魔咒",
		parent: "罗天魔咒",
		percent_current_hp: 7,
		tick_interval: 0.5,
		duration: 4,
		max_stacks: 5,
	} as EffectRow);
	effects.push({
		type: "dot",
		name: "断魂之咒",
		parent: "罗天魔咒",
		percent_lost_hp: 7,
		tick_interval: 0.5,
		duration: 4,
		max_stacks: 5,
	} as EffectRow);

	return effects;
}

function parseFanSheng(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 6, total: tier.vars.x } as EffectRow,
		{
			type: "dot",
			name: "贪妄业火",
			tick_interval: 1,
			percent_current_hp: tier.vars.y,
			duration: 8,
			per_hit_stack: true,
		} as EffectRow,
	];
}

function parseWuXiangMoJie(cell: SplitCell): EffectRow[] {
	// All values hardcoded in text (no tier vars with x=)
	// But the text says "（数据为没有悟境的情况）" — enlightenment=0
	return [
		{
			type: "base_attack",
			hits: 5,
			total: 1500,
			data_state: "enlightenment=0",
		} as EffectRow,
		{
			type: "delayed_burst",
			name: "无相魔劫",
			duration: 12,
			damage_increase_during: 10,
			burst_base: 5000,
			burst_accumulated_pct: 10,
			data_state: "enlightenment=0",
		} as EffectRow,
	];
}

// ─── Body ──────────────────────────────────────────────

function parseXuanSha(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	const ds = buildDs(tier);
	return [
		{
			type: "base_attack",
			hits: 4,
			total: tier.vars.x,
			...(ds ? { data_state: ds } : {}),
		} as EffectRow,
		{
			type: "self_hp_cost",
			value: tier.vars.y,
			tick_interval: 1,
			name: "怒意滔天",
			duration: "permanent",
			...(ds ? { data_state: ds } : {}),
		} as EffectRow,
		{
			type: "self_lost_hp_damage",
			value: tier.vars.z,
			tick_interval: 1,
			parent: "怒意滔天",
			duration: "permanent",
			...(ds ? { data_state: ds } : {}),
		} as EffectRow,
	];
}

function parseJingZheHuaLong(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	// G4: self_hp_cost + base_attack + effects
	// "消耗自身x%当前气血值，对目标造成八段共x%攻击力的灵法伤害，
	//  额外对目标造成自身y%已损失气血值的伤害，并提升自身z%神通伤害加深，持续4秒"
	// Note: x is used for BOTH hp_cost and base_attack total (same var name)
	return [
		{ type: "base_attack", hits: 8, total: tier.vars.x } as EffectRow,
		{
			type: "self_lost_hp_damage",
			value: tier.vars.y,
		} as EffectRow,
		{
			type: "self_buff",
			name: "星辰杀阵",
			skill_damage_increase: tier.vars.z,
			duration: 4,
		} as EffectRow,
	];
}

function parseShiFangZhenPo(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "self_hp_cost", value: tier.vars.x } as EffectRow,
		{ type: "base_attack", hits: 10, total: tier.vars.y } as EffectRow,
		{
			type: "self_lost_hp_damage",
			value: tier.vars.z,
			on_last_hit: true,
			heal_equal: true,
		} as EffectRow,
		{
			type: "self_buff",
			name: "怒灵降世",
			attack_bonus: tier.vars.w,
			damage_reduction: tier.vars.w,
			duration: 4,
		} as EffectRow,
	];
}

function parseJiFengJiuBian(cell: SplitCell): EffectRow[] {
	// All hardcoded: "消耗自身10%当前气血值，对目标造成十段共1500%攻击力的灵法伤害"
	return [
		{ type: "self_hp_cost", value: 10 } as EffectRow,
		{ type: "base_attack", hits: 10, total: 1500 } as EffectRow,
		{
			type: "counter_buff",
			name: "极怒",
			duration: 4,
			reflect_received_damage: 50,
			reflect_percent_lost_hp: 15,
		} as EffectRow,
	];
}

function parseShaYingQianHuan(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "self_hp_cost", value: tier.vars.x } as EffectRow,
		{ type: "base_attack", hits: 3, total: tier.vars.y } as EffectRow,
		{
			type: "self_lost_hp_damage",
			value: tier.vars.z,
		} as EffectRow,
		{
			type: "shield",
			value: tier.vars.w,
			source: "self_max_hp",
			duration: 8,
		} as EffectRow,
		{
			type: "debuff",
			name: "落星",
			target: "final_damage_reduction",
			value: -tier.vars.u,
			duration: 4,
			per_hit_stack: true,
			dispellable: false,
		} as EffectRow,
	];
}

function parseJiuChongTianFeng(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 8, total: tier.vars.x } as EffectRow,
		{
			type: "self_lost_hp_damage",
			value: tier.vars.y,
			per_hit: true,
		} as EffectRow,
		{
			type: "self_hp_cost",
			value: tier.vars.z,
			per_hit: true,
		} as EffectRow,
		{
			type: "self_buff",
			name: "蛮神",
			attack_bonus: tier.vars.w,
			crit_rate: tier.vars.w,
			duration: 4,
			per_hit_stack: true,
		} as EffectRow,
	];
}

function parseTianShaPoXu(cell: SplitCell): EffectRow[] {
	const tier = cell.tiers[0];
	if (!tier) return [];
	return [
		{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
		{ type: "self_hp_cost", value: tier.vars.y } as EffectRow,
		{
			type: "self_lost_hp_damage",
			value: tier.vars.z,
			per_hit: true,
			name: "破虚",
			next_skill_hits: 8,
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
			} as EffectRow,
		];
	},

	大罗幻诀: () => [
		{
			type: "counter_debuff_upgrade",
			on_attacked_chance: 60,
		} as EffectRow,
		{
			type: "cross_slot_debuff",
			name: "命损",
			target: "final_damage_reduction",
			value: -100,
			duration: 8,
			trigger: "on_attacked",
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
			} as EffectRow,
		];
	},

	疾风九变: () => [
		{
			type: "lifesteal",
			value: 82,
		} as EffectRow,
	],

	煞影千幻: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{
				type: "shield_strength",
				value: tier.vars.x,
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
			} as EffectRow,
			{
				type: "self_hp_floor",
				value: tier.vars.x,
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
