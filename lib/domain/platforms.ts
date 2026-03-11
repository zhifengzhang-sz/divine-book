/**
 * Platform provides registry — what each main skill + primary affix makes available.
 *
 * A "platform" is the combination of a main skill and its primary affix.
 * It determines the base set of target categories available for combo search.
 * See domain.graph.md §VI.
 */

import { School, TargetCategory } from "./enums.js";

export interface Platform {
	/** Main skill book name */
	book: string;
	/** Primary affix name */
	primaryAffix: string;
	school: School;
	/** Named entities created by this platform */
	namedEntities: string[];
	/** Target categories this platform makes available */
	provides: TargetCategory[];
	/** Effect types the primary affix produces (from effects.yaml) */
	primaryAffixOutputs: string[];
	/**
	 * Baseline factor values from the platform's skill + primary + exclusive affix.
	 * Used for function qualification thresholds (e.g., F_burst needs high D_base).
	 */
	baseline: {
		D_base: number;
		S_coeff: number;
		DR_A: number;
	};
}

export const PLATFORMS: Platform[] = [
	{
		book: "千锋聚灵剑",
		primaryAffix: "惊神剑光",
		school: School.Sword,
		namedEntities: [],
		provides: [TargetCategory.Damage],
		primaryAffixOutputs: ["per_hit_escalation"],
		baseline: { D_base: 20265, S_coeff: 0, DR_A: 0 },
	},
	{
		book: "春黎剑阵",
		primaryAffix: "幻象剑灵",
		school: School.Sword,
		namedEntities: [],
		provides: [TargetCategory.Damage, TargetCategory.Buff],
		primaryAffixOutputs: ["summon_buff"],
		baseline: { D_base: 22305, S_coeff: 0, DR_A: 0 },
	},
	{
		book: "皓月剑诀",
		primaryAffix: "碎魂剑意",
		school: School.Sword,
		namedEntities: ["寂灭剑心"],
		provides: [TargetCategory.Damage, TargetCategory.Buff, TargetCategory.Dot],
		primaryAffixOutputs: ["shield_destroy_dot"],
		baseline: { D_base: 22305, S_coeff: 0, DR_A: 0 },
	},
	{
		book: "念剑诀",
		primaryAffix: "雷阵剑影",
		school: School.Sword,
		namedEntities: [],
		provides: [TargetCategory.Damage, TargetCategory.Dot],
		primaryAffixOutputs: ["extended_dot"],
		baseline: { D_base: 22305, S_coeff: 0, DR_A: 0 },
	},
	{
		book: "甲元仙符",
		primaryAffix: "天光虹露",
		school: School.Spell,
		namedEntities: ["仙佑"],
		provides: [
			TargetCategory.Damage,
			TargetCategory.Buff,
			TargetCategory.Healing,
		],
		primaryAffixOutputs: ["self_buff_extra"],
		baseline: { D_base: 21090, S_coeff: 70, DR_A: 0 },
	},
	{
		book: "大罗幻诀",
		primaryAffix: "魔魂咒界",
		school: School.Demon,
		namedEntities: ["罗天魔咒"],
		provides: [
			TargetCategory.Damage,
			TargetCategory.Debuff,
			TargetCategory.Dot,
			TargetCategory.State,
			TargetCategory.Probability,
		],
		primaryAffixOutputs: ["counter_debuff_upgrade", "cross_slot_debuff"],
		baseline: { D_base: 20265, S_coeff: 0, DR_A: 0 },
	},
	{
		book: "无相魔劫咒",
		primaryAffix: "灭劫魔威",
		school: School.Demon,
		namedEntities: ["无相魔劫"],
		provides: [
			TargetCategory.Damage,
			TargetCategory.Debuff,
			TargetCategory.State,
		],
		primaryAffixOutputs: ["delayed_burst_increase"],
		baseline: { D_base: 1500, S_coeff: 0, DR_A: 0 },
	},
	{
		book: "十方真魄",
		primaryAffix: "星猿弃天",
		school: School.Body,
		namedEntities: ["怒灵降世"],
		provides: [
			TargetCategory.Damage,
			TargetCategory.Buff,
			TargetCategory.Healing,
			TargetCategory.LostHp,
		],
		primaryAffixOutputs: ["self_buff_extend", "periodic_cleanse"],
		baseline: { D_base: 1500, S_coeff: 20, DR_A: -30 },
	},
	{
		book: "玄煞灵影诀",
		primaryAffix: "星猿之怒",
		school: School.Body,
		namedEntities: ["怒意滔天"],
		provides: [
			TargetCategory.Damage,
			TargetCategory.Buff,
			TargetCategory.LostHp,
		],
		primaryAffixOutputs: ["per_self_lost_hp"],
		baseline: { D_base: 0, S_coeff: 0, DR_A: 0 },
	},
	{
		book: "疾风九变",
		primaryAffix: "星猿复灵",
		school: School.Body,
		namedEntities: ["极怒"],
		provides: [
			TargetCategory.Damage,
			TargetCategory.Buff,
			TargetCategory.Healing,
			TargetCategory.LostHp,
		],
		primaryAffixOutputs: ["lifesteal", "counter_buff"],
		baseline: { D_base: 1500, S_coeff: 0, DR_A: 0 },
	},
];

/** Look up a platform by book name */
export function getPlatform(bookName: string): Platform | undefined {
	return PLATFORMS.find((p) => p.book === bookName);
}
