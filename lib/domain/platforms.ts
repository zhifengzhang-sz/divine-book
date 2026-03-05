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
}

export const PLATFORMS: Platform[] = [
	{
		book: "千锋聚灵剑",
		primaryAffix: "惊神剑光",
		school: School.Sword,
		namedEntities: [],
		provides: [TargetCategory.Damage],
	},
	{
		book: "春黎剑阵",
		primaryAffix: "幻象剑灵",
		school: School.Sword,
		namedEntities: [],
		provides: [TargetCategory.Damage],
	},
	{
		book: "皓月剑诀",
		primaryAffix: "碎魂剑意",
		school: School.Sword,
		namedEntities: ["寂灭剑心"],
		provides: [TargetCategory.Damage, TargetCategory.Buff, TargetCategory.Dot],
	},
	{
		book: "念剑诀",
		primaryAffix: "雷阵剑影",
		school: School.Sword,
		namedEntities: [],
		provides: [TargetCategory.Damage, TargetCategory.Dot],
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
	},
];

/** Look up a platform by book name */
export function getPlatform(bookName: string): Platform | undefined {
	return PLATFORMS.find((p) => p.book === bookName);
}
