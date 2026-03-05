/**
 * Affix binding registry — provides/requires for all 61 affixes.
 *
 * Each affix has a binding that specifies what target categories it creates
 * (provides) and what it needs to function (requires). Used for pruning:
 * if requires=T_N and no provider of T_N exists → affix has zero value.
 *
 * Source: domain.category.md §Affix Walkthrough (provides/requires columns).
 */

import { School, TargetCategory } from "./enums.js";

const T = TargetCategory;

export interface AffixBinding {
	affix: string;
	category: "universal" | "school" | "exclusive";
	school?: School;
	/** For exclusive affixes: which book this is locked to */
	book?: string;
	provides: TargetCategory[];
	requires: TargetCategory[] | "free";
}

// ---------------------------------------------------------------------------
// Universal affixes (16)
// ---------------------------------------------------------------------------

const UNIVERSAL: AffixBinding[] = [
	{ affix: "咒书", category: "universal", provides: [], requires: [T.Debuff] },
	{ affix: "清灵", category: "universal", provides: [], requires: [T.Buff] },
	{ affix: "业焰", category: "universal", provides: [], requires: [T.State] },
	{
		affix: "击瑕",
		category: "universal",
		provides: [],
		requires: [T.Control],
	},
	{ affix: "破竹", category: "universal", provides: [], requires: "free" },
	{ affix: "金汤", category: "universal", provides: [], requires: "free" },
	{ affix: "怒目", category: "universal", provides: [], requires: "free" },
	{ affix: "鬼印", category: "universal", provides: [], requires: [T.Dot] },
	{ affix: "福荫", category: "universal", provides: [T.Buff], requires: "free" },
	{
		affix: "战意",
		category: "universal",
		provides: [],
		requires: [T.LostHp],
	},
	{ affix: "斩岳", category: "universal", provides: [], requires: "free" },
	{ affix: "吞海", category: "universal", provides: [], requires: "free" },
	{
		affix: "灵盾",
		category: "universal",
		provides: [],
		requires: [T.Shield],
	},
	{ affix: "灵威", category: "universal", provides: [], requires: "free" },
	{ affix: "摧山", category: "universal", provides: [], requires: "free" },
	{ affix: "通明", category: "universal", provides: [], requires: "free" },
];

// ---------------------------------------------------------------------------
// School affixes (17)
// ---------------------------------------------------------------------------

const SCHOOL_SWORD: AffixBinding[] = [
	{
		affix: "摧云折月",
		category: "school",
		school: School.Sword,
		provides: [],
		requires: "free",
	},
	{
		affix: "灵犀九重",
		category: "school",
		school: School.Sword,
		provides: [],
		requires: "free",
	},
	{
		affix: "破碎无双",
		category: "school",
		school: School.Sword,
		provides: [],
		requires: "free",
	},
	{
		affix: "心火淬锋",
		category: "school",
		school: School.Sword,
		provides: [],
		requires: "free",
	},
];

const SCHOOL_SPELL: AffixBinding[] = [
	{
		affix: "长生天则",
		category: "school",
		school: School.Spell,
		provides: [],
		requires: [T.Healing],
	},
	{
		affix: "明王之路",
		category: "school",
		school: School.Spell,
		provides: [],
		requires: "free",
	},
	{
		affix: "天命有归",
		category: "school",
		school: School.Spell,
		provides: [],
		requires: "free",
	},
	{
		affix: "景星天佑",
		category: "school",
		school: School.Spell,
		provides: [T.Buff],
		requires: "free",
	},
];

const SCHOOL_DEMON: AffixBinding[] = [
	{
		affix: "瑶光却邪",
		category: "school",
		school: School.Demon,
		provides: [],
		requires: [T.Healing],
	},
	{
		affix: "溃魂击瑕",
		category: "school",
		school: School.Demon,
		provides: [],
		requires: "free",
	},
	{
		affix: "玄女护心",
		category: "school",
		school: School.Demon,
		provides: [T.Shield],
		requires: "free",
	},
	{
		affix: "祸星无妄",
		category: "school",
		school: School.Demon,
		provides: [T.Debuff],
		requires: "free",
	},
];

const SCHOOL_BODY: AffixBinding[] = [
	{
		affix: "金刚护体",
		category: "school",
		school: School.Body,
		provides: [],
		requires: "free",
	},
	{
		affix: "破灭天光",
		category: "school",
		school: School.Body,
		provides: [],
		requires: "free",
	},
	{
		affix: "青云灵盾",
		category: "school",
		school: School.Body,
		provides: [],
		requires: [T.Shield],
	},
	{
		affix: "贪狼吞星",
		category: "school",
		school: School.Body,
		provides: [],
		requires: "free",
	},
	{
		affix: "意坠深渊",
		category: "school",
		school: School.Body,
		provides: [T.LostHp],
		requires: "free",
	},
];

// ---------------------------------------------------------------------------
// Exclusive affixes (28)
// ---------------------------------------------------------------------------

const EXCLUSIVE_SWORD: AffixBinding[] = [
	{
		affix: "天哀灵涸",
		category: "exclusive",
		school: School.Sword,
		book: "千锋聚灵剑",
		provides: [T.Debuff],
		requires: "free",
	},
	{
		affix: "玄心剑魄",
		category: "exclusive",
		school: School.Sword,
		book: "春黎剑阵",
		provides: [T.Dot],
		requires: "free",
	},
	{
		affix: "追神真诀",
		category: "exclusive",
		school: School.Sword,
		book: "皓月剑诀",
		provides: [],
		requires: [T.Dot],
	},
	{
		affix: "仙露护元",
		category: "exclusive",
		school: School.Sword,
		book: "念剑诀",
		provides: [],
		requires: [T.Buff],
	},
	{
		affix: "神威冲云",
		category: "exclusive",
		school: School.Sword,
		book: "通天剑诀",
		provides: [],
		requires: "free",
	},
	{
		affix: "天威煌煌",
		category: "exclusive",
		school: School.Sword,
		book: "新-青元剑诀",
		provides: [],
		requires: "free",
	},
	{
		affix: "无极剑阵",
		category: "exclusive",
		school: School.Sword,
		book: "无极御剑诀",
		provides: [],
		requires: "free",
	},
];

const EXCLUSIVE_SPELL: AffixBinding[] = [
	{
		affix: "天倾灵枯",
		category: "exclusive",
		school: School.Spell,
		book: "甲元仙符",
		provides: [T.Debuff],
		requires: "free",
	},
	{
		affix: "龙象护身",
		category: "exclusive",
		school: School.Spell,
		book: "浩然星灵诀",
		provides: [],
		requires: [T.Buff],
	},
	{
		affix: "真极穿空",
		category: "exclusive",
		school: School.Spell,
		book: "元磁神光",
		provides: [],
		requires: [T.Buff],
	},
	{
		affix: "奇能诡道",
		category: "exclusive",
		school: School.Spell,
		book: "周天星元",
		provides: [T.Debuff],
		requires: [T.Debuff],
	},
	{
		affix: "仙灵汲元",
		category: "exclusive",
		school: School.Spell,
		book: "星元化岳",
		provides: [T.Healing],
		requires: "free",
	},
	{
		affix: "天人合一",
		category: "exclusive",
		school: School.Spell,
		book: "玉书天戈符",
		provides: [],
		requires: "free",
	},
	{
		affix: "九雷真解",
		category: "exclusive",
		school: School.Spell,
		book: "九天真雷诀",
		provides: [],
		requires: [T.Buff, T.Debuff, T.Shield],
	},
];

const EXCLUSIVE_DEMON: AffixBinding[] = [
	{
		affix: "古魔之魂",
		category: "exclusive",
		school: School.Demon,
		book: "大罗幻诀",
		provides: [],
		requires: [T.Dot],
	},
	{
		affix: "无相魔威",
		category: "exclusive",
		school: School.Demon,
		book: "无相魔劫咒",
		provides: [T.Debuff],
		requires: "free",
	},
	{
		affix: "引灵摘魂",
		category: "exclusive",
		school: School.Demon,
		book: "天魔降临咒",
		provides: [],
		requires: [T.Debuff],
	},
	{
		affix: "心魔惑言",
		category: "exclusive",
		school: School.Demon,
		book: "天轮魔经",
		provides: [],
		requires: [T.Debuff],
	},
	{
		affix: "魔骨明心",
		category: "exclusive",
		school: School.Demon,
		book: "天剎真魔",
		provides: [T.Healing],
		requires: [T.Debuff],
	},
	{
		affix: "心逐神随",
		category: "exclusive",
		school: School.Demon,
		book: "解体化形",
		provides: [],
		requires: "free",
	},
	{
		affix: "天魔真解",
		category: "exclusive",
		school: School.Demon,
		book: "焚圣真魔咒",
		provides: [],
		requires: [T.Dot],
	},
];

const EXCLUSIVE_BODY: AffixBinding[] = [
	{
		affix: "破釜沉舟",
		category: "exclusive",
		school: School.Body,
		book: "十方真魄",
		provides: [T.LostHp],
		requires: "free",
	},
	{
		affix: "真言不灭",
		category: "exclusive",
		school: School.Body,
		book: "疾风九变",
		provides: [],
		requires: [T.State],
	},
	{
		affix: "怒血战意",
		category: "exclusive",
		school: School.Body,
		book: "玄煞灵影诀",
		provides: [],
		requires: [T.LostHp],
	},
	{
		affix: "紫心真诀",
		category: "exclusive",
		school: School.Body,
		book: "惊蛰化龙",
		provides: [],
		requires: [T.Debuff],
	},
	{
		affix: "乘胜逐北",
		category: "exclusive",
		school: School.Body,
		book: "煞影千幻",
		provides: [],
		requires: [T.Control],
	},
	{
		affix: "玉石俱焚",
		category: "exclusive",
		school: School.Body,
		book: "九重天凤诀",
		provides: [],
		requires: [T.Shield],
	},
	{
		affix: "天煞破虚",
		category: "exclusive",
		school: School.Body,
		book: "天煞破虚诀",
		provides: [],
		requires: "free",
	},
];

// ---------------------------------------------------------------------------
// All bindings
// ---------------------------------------------------------------------------

export const AFFIX_BINDINGS: AffixBinding[] = [
	...UNIVERSAL,
	...SCHOOL_SWORD,
	...SCHOOL_SPELL,
	...SCHOOL_DEMON,
	...SCHOOL_BODY,
	...EXCLUSIVE_SWORD,
	...EXCLUSIVE_SPELL,
	...EXCLUSIVE_DEMON,
	...EXCLUSIVE_BODY,
];

/** Look up a binding by affix name */
export function getBinding(affixName: string): AffixBinding | undefined {
	return AFFIX_BINDINGS.find((b) => b.affix === affixName);
}

/** Get all bindings for a given category */
export function getBindingsByCategory(
	category: "universal" | "school" | "exclusive",
): AffixBinding[] {
	return AFFIX_BINDINGS.filter((b) => b.category === category);
}

/** Get all bindings for a given school */
export function getBindingsBySchool(school: School): AffixBinding[] {
	return AFFIX_BINDINGS.filter((b) => b.school === school);
}
