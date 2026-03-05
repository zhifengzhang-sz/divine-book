/**
 * Affix binding registry — outputs/requires for all 61 affixes.
 *
 * Each affix's `outputs` lists the effect types it produces (from effects.yaml).
 * `provides` (target categories) is automatically derived from outputs via
 * the EFFECT_PROVIDES mapping — never hand-curated.
 *
 * `requires` specifies what target categories must exist for the affix to
 * function. This remains at the category level (hand-curated) because
 * requirements are about what external conditions must hold, not about
 * what the affix itself produces.
 *
 * Source: effects.yaml (outputs), domain.category.md (requires).
 */

import { School, TargetCategory } from "./enums.js";

const T = TargetCategory;

// ---------------------------------------------------------------------------
// Effect type → target category mapping
// ---------------------------------------------------------------------------

/**
 * Maps effect types to the target categories they provide.
 * Only "provider" effect types are listed — effect types that create something
 * consumable by other affixes. Pure amplifiers (attack_bonus, damage_increase,
 * etc.) are absent because they don't provide new target categories.
 */
const EFFECT_PROVIDES: Partial<Record<string, TargetCategory[]>> = {
	// T2 Debuff — creates a harmful state on the enemy
	debuff: [T.Debuff],
	conditional_debuff: [T.Debuff],
	counter_debuff: [T.Debuff],
	cross_slot_debuff: [T.Debuff],
	random_debuff: [T.Debuff],

	// T3 Buff — creates a beneficial state on self
	self_buff: [T.Buff],
	random_buff: [T.Buff],
	counter_buff: [T.Buff],
	next_skill_buff: [T.Buff],

	// T4 DoT — creates periodic damage
	dot: [T.Dot],
	extended_dot: [T.Dot],
	shield_destroy_dot: [T.Dot],

	// T5 Shield — creates a shield
	damage_to_shield: [T.Shield],

	// T6 Healing — creates healing
	lifesteal: [T.Healing],
	conditional_heal_buff: [T.Healing],

	// T8 Probability — creates probability-dependent effects
	probability_multiplier: [T.Probability],

	// T9 LostHp — creates or accelerates HP loss (persistent resource)
	self_hp_cost: [T.LostHp],
	self_damage_taken_increase: [T.LostHp],
	min_lost_hp_threshold: [T.LostHp],
};

/** Derive target categories from effect type outputs */
export function deriveProvides(outputs: string[]): TargetCategory[] {
	const cats = new Set<TargetCategory>();
	for (const output of outputs) {
		const provided = EFFECT_PROVIDES[output];
		if (provided) {
			for (const cat of provided) cats.add(cat);
		}
	}
	return [...cats];
}

// ---------------------------------------------------------------------------
// AffixBinding interface
// ---------------------------------------------------------------------------

export interface AffixBinding {
	affix: string;
	category: "universal" | "school" | "exclusive";
	school?: School;
	/** For exclusive affixes: which book this is locked to */
	book?: string;
	/** Effect types this affix produces (from effects.yaml) */
	outputs: string[];
	/** Target categories this affix provides (derived from outputs) */
	provides: TargetCategory[];
	/** Target categories needed for this affix to function */
	requires: TargetCategory[] | "free";
}

// ---------------------------------------------------------------------------
// Binding factory — derives provides from outputs
// ---------------------------------------------------------------------------

interface BindingInput {
	affix: string;
	category: "universal" | "school" | "exclusive";
	school?: School;
	book?: string;
	outputs: string[];
	requires: TargetCategory[] | "free";
}

function b(input: BindingInput): AffixBinding {
	return { ...input, provides: deriveProvides(input.outputs) };
}

// ---------------------------------------------------------------------------
// Universal affixes (16)
// ---------------------------------------------------------------------------

const UNIVERSAL: AffixBinding[] = [
	b({ affix: "咒书", category: "universal", outputs: ["debuff_strength"], requires: [T.Debuff] }),
	b({ affix: "清灵", category: "universal", outputs: ["buff_strength"], requires: [T.Buff] }),
	b({ affix: "业焰", category: "universal", outputs: ["all_state_duration"], requires: [T.State] }),
	b({ affix: "击瑕", category: "universal", outputs: ["conditional_damage"], requires: [T.Control] }),
	b({ affix: "破竹", category: "universal", outputs: ["per_hit_escalation"], requires: "free" }),
	b({ affix: "金汤", category: "universal", outputs: ["self_damage_reduction_during_cast"], requires: "free" }),
	b({ affix: "怒目", category: "universal", outputs: ["conditional_damage", "conditional_crit_rate"], requires: "free" }),
	b({ affix: "鬼印", category: "universal", outputs: ["dot_extra_per_tick"], requires: [T.Dot] }),
	b({ affix: "福荫", category: "universal", outputs: ["random_buff", "attack_bonus", "crit_damage_bonus", "damage_increase"], requires: "free" }),
	b({ affix: "战意", category: "universal", outputs: ["per_self_lost_hp"], requires: [T.LostHp] }),
	b({ affix: "斩岳", category: "universal", outputs: ["flat_extra_damage"], requires: "free" }),
	b({ affix: "吞海", category: "universal", outputs: ["per_enemy_lost_hp"], requires: "free" }),
	b({ affix: "灵盾", category: "universal", outputs: ["shield_strength"], requires: [T.Shield] }),
	b({ affix: "灵威", category: "universal", outputs: ["next_skill_buff"], requires: "free" }),
	b({ affix: "摧山", category: "universal", outputs: ["attack_bonus"], requires: "free" }),
	b({ affix: "通明", category: "universal", outputs: ["guaranteed_resonance"], requires: "free" }),
];

// ---------------------------------------------------------------------------
// School affixes (17)
// ---------------------------------------------------------------------------

const SCHOOL_SWORD: AffixBinding[] = [
	b({ affix: "摧云折月", category: "school", school: School.Sword, outputs: ["attack_bonus"], requires: "free" }),
	b({ affix: "灵犀九重", category: "school", school: School.Sword, outputs: ["guaranteed_resonance"], requires: "free" }),
	b({ affix: "破碎无双", category: "school", school: School.Sword, outputs: ["attack_bonus", "damage_increase", "crit_damage_bonus"], requires: "free" }),
	b({ affix: "心火淬锋", category: "school", school: School.Sword, outputs: ["per_hit_escalation"], requires: "free" }),
];

const SCHOOL_SPELL: AffixBinding[] = [
	b({ affix: "长生天则", category: "school", school: School.Spell, outputs: ["healing_increase"], requires: [T.Healing] }),
	b({ affix: "明王之路", category: "school", school: School.Spell, outputs: ["final_damage_bonus"], requires: "free" }),
	b({ affix: "天命有归", category: "school", school: School.Spell, outputs: ["probability_to_certain", "damage_increase"], requires: "free" }),
	b({ affix: "景星天佑", category: "school", school: School.Spell, outputs: ["random_buff", "attack_bonus", "crit_damage_bonus", "damage_increase"], requires: "free" }),
];

const SCHOOL_DEMON: AffixBinding[] = [
	b({ affix: "瑶光却邪", category: "school", school: School.Demon, outputs: ["healing_to_damage"], requires: [T.Healing] }),
	b({ affix: "溃魂击瑕", category: "school", school: School.Demon, outputs: ["conditional_damage", "conditional_crit"], requires: "free" }),
	b({ affix: "玄女护心", category: "school", school: School.Demon, outputs: ["damage_to_shield"], requires: "free" }),
	b({ affix: "祸星无妄", category: "school", school: School.Demon, outputs: ["random_debuff", "attack_reduction", "crit_rate_reduction", "crit_damage_reduction"], requires: "free" }),
];

const SCHOOL_BODY: AffixBinding[] = [
	b({ affix: "金刚护体", category: "school", school: School.Body, outputs: ["self_damage_reduction_during_cast"], requires: "free" }),
	b({ affix: "破灭天光", category: "school", school: School.Body, outputs: ["flat_extra_damage"], requires: "free" }),
	b({ affix: "青云灵盾", category: "school", school: School.Body, outputs: ["shield_strength"], requires: [T.Shield] }),
	b({ affix: "贪狼吞星", category: "school", school: School.Body, outputs: ["per_enemy_lost_hp"], requires: "free" }),
	b({ affix: "意坠深渊", category: "school", school: School.Body, outputs: ["min_lost_hp_threshold", "damage_increase"], requires: "free" }),
];

// ---------------------------------------------------------------------------
// Exclusive affixes (28)
// ---------------------------------------------------------------------------

const EXCLUSIVE_SWORD: AffixBinding[] = [
	b({ affix: "天哀灵涸", category: "exclusive", school: School.Sword, book: "千锋聚灵剑", outputs: ["debuff"], requires: "free" }),
	b({ affix: "玄心剑魄", category: "exclusive", school: School.Sword, book: "春黎剑阵", outputs: ["dot", "on_dispel"], requires: "free" }),
	b({ affix: "追神真诀", category: "exclusive", school: School.Sword, book: "皓月剑诀", outputs: ["dot_extra_per_tick", "conditional_buff"], requires: [T.Dot] }),
	b({ affix: "仙露护元", category: "exclusive", school: School.Sword, book: "念剑诀", outputs: ["buff_duration"], requires: [T.Buff] }),
	b({ affix: "神威冲云", category: "exclusive", school: School.Sword, book: "通天剑诀", outputs: ["ignore_damage_reduction", "damage_increase"], requires: "free" }),
	b({ affix: "天威煌煌", category: "exclusive", school: School.Sword, book: "新-青元剑诀", outputs: ["next_skill_buff"], requires: "free" }),
	b({ affix: "无极剑阵", category: "exclusive", school: School.Sword, book: "无极御剑诀", outputs: ["skill_damage_increase", "enemy_skill_damage_reduction"], requires: "free" }),
];

const EXCLUSIVE_SPELL: AffixBinding[] = [
	b({ affix: "天倾灵枯", category: "exclusive", school: School.Spell, book: "甲元仙符", outputs: ["debuff", "conditional_debuff"], requires: "free" }),
	b({ affix: "龙象护身", category: "exclusive", school: School.Spell, book: "浩然星灵诀", outputs: ["buff_strength"], requires: [T.Buff] }),
	b({ affix: "真极穿空", category: "exclusive", school: School.Spell, book: "元磁神光", outputs: ["buff_stack_increase", "per_buff_stack_damage"], requires: [T.Buff] }),
	b({ affix: "奇能诡道", category: "exclusive", school: School.Spell, book: "周天星元", outputs: ["debuff_stack_chance", "conditional_debuff"], requires: [T.Debuff] }),
	b({ affix: "仙灵汲元", category: "exclusive", school: School.Spell, book: "星元化岳", outputs: ["lifesteal"], requires: "free" }),
	b({ affix: "天人合一", category: "exclusive", school: School.Spell, book: "玉书天戈符", outputs: ["enlightenment_bonus", "damage_increase"], requires: "free" }),
	b({ affix: "九雷真解", category: "exclusive", school: School.Spell, book: "九天真雷诀", outputs: ["on_buff_debuff_shield_trigger"], requires: [T.Buff, T.Debuff, T.Shield] }),
];

const EXCLUSIVE_DEMON: AffixBinding[] = [
	b({ affix: "古魔之魂", category: "exclusive", school: School.Demon, book: "大罗幻诀", outputs: ["dot_damage_increase"], requires: [T.Dot] }),
	b({ affix: "无相魔威", category: "exclusive", school: School.Demon, book: "无相魔劫咒", outputs: ["debuff", "conditional_damage"], requires: "free" }),
	b({ affix: "引灵摘魂", category: "exclusive", school: School.Demon, book: "天魔降临咒", outputs: ["conditional_damage"], requires: [T.Debuff] }),
	b({ affix: "心魔惑言", category: "exclusive", school: School.Demon, book: "天轮魔经", outputs: ["debuff_stack_increase", "per_debuff_stack_damage"], requires: [T.Debuff] }),
	b({ affix: "魔骨明心", category: "exclusive", school: School.Demon, book: "天剎真魔", outputs: ["conditional_heal_buff", "conditional_debuff"], requires: [T.Debuff] }),
	b({ affix: "心逐神随", category: "exclusive", school: School.Demon, book: "解体化形", outputs: ["probability_multiplier"], requires: "free" }),
	b({ affix: "天魔真解", category: "exclusive", school: School.Demon, book: "焚圣真魔咒", outputs: ["dot_frequency_increase"], requires: [T.Dot] }),
];

const EXCLUSIVE_BODY: AffixBinding[] = [
	b({ affix: "破釜沉舟", category: "exclusive", school: School.Body, book: "十方真魄", outputs: ["skill_damage_increase", "self_damage_taken_increase"], requires: "free" }),
	b({ affix: "真言不灭", category: "exclusive", school: School.Body, book: "疾风九变", outputs: ["all_state_duration"], requires: [T.State] }),
	b({ affix: "怒血战意", category: "exclusive", school: School.Body, book: "玄煞灵影诀", outputs: ["per_self_lost_hp"], requires: [T.LostHp] }),
	b({ affix: "紫心真诀", category: "exclusive", school: School.Body, book: "惊蛰化龙", outputs: ["per_debuff_stack_true_damage", "conditional_buff"], requires: [T.Debuff] }),
	b({ affix: "乘胜逐北", category: "exclusive", school: School.Body, book: "煞影千幻", outputs: ["conditional_damage"], requires: [T.Control] }),
	b({ affix: "玉石俱焚", category: "exclusive", school: School.Body, book: "九重天凤诀", outputs: ["on_shield_expire"], requires: [T.Shield] }),
	b({ affix: "天煞破虚", category: "exclusive", school: School.Body, book: "天煞破虚诀", outputs: ["periodic_dispel"], requires: "free" }),
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
