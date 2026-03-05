/**
 * Named entity definitions — first-class nodes in the graph.
 *
 * Each named entity has specific inputs, outputs, and operator ports that
 * determine which affixes can amplify it. See domain.graph.md §V.
 */

import { TargetCategory } from "./enums.js";

export interface NamedEntityPort {
	/** Input resource name (e.g., "received_damage", "lost_hp") */
	input: string;
	/** Which connector feeds this (from domain.graph.md §III) */
	source: string;
}

export interface NamedEntity {
	name: string;
	createdBy: string;
	primaryAffix: string;
	transform: string;
	inputs: NamedEntityPort[];
	outputs: string[];
	/** Which target categories amplify this entity's outputs */
	operatorPorts: TargetCategory[];
}

export const NAMED_ENTITIES: NamedEntity[] = [
	{
		name: "极怒",
		createdBy: "疾风九变",
		primaryAffix: "星猿复灵",
		transform: "counter_reflect",
		inputs: [
			{ input: "received_damage", source: "self_damage_intake" },
			{ input: "lost_hp", source: "self_hp_resource" },
		],
		outputs: [
			"reflected damage (50% of received + 15% of lost HP)",
			"lifesteal 82% of reflected damage (via 星猿复灵)",
		],
		operatorPorts: [TargetCategory.Damage, TargetCategory.LostHp],
	},
	{
		name: "仙佑",
		createdBy: "甲元仙符",
		primaryAffix: "天光虹露",
		transform: "self_buff",
		inputs: [],
		outputs: ["ATK+70%, DEF+70%, HP+70%, 12s"],
		operatorPorts: [TargetCategory.Buff],
	},
	{
		name: "寂灭剑心",
		createdBy: "皓月剑诀",
		primaryAffix: "碎魂剑意",
		transform: "self_buff_hp_damage",
		inputs: [],
		outputs: ["buff + 12% max HP per hit", "shield destroy DoT"],
		operatorPorts: [TargetCategory.Buff, TargetCategory.Dot],
	},
	{
		name: "罗天魔咒",
		createdBy: "大罗幻诀",
		primaryAffix: "魔魂咒界",
		transform: "counter_debuff",
		inputs: [{ input: "enemy_attacks", source: "opponent_attacks" }],
		outputs: [
			"debuff stacks (30% per attack → 60% with primary)",
			"噬心魔咒 DoT: 7% current HP/0.5s",
			"断魂之咒 DoT: 7% lost HP/0.5s",
			"命損 cross-slot debuff: -100% final DR, 8s (via primary)",
		],
		operatorPorts: [
			TargetCategory.Debuff,
			TargetCategory.Dot,
			TargetCategory.Probability,
		],
	},
	{
		name: "怒灵降世",
		createdBy: "十方真魄",
		primaryAffix: "星猿弃天",
		transform: "self_buff",
		inputs: [],
		outputs: ["ATK+20%, DR+20%, 7.5s (4s base + 3.5s from primary)"],
		operatorPorts: [TargetCategory.Buff],
	},
	{
		name: "无相魔劫",
		createdBy: "无相魔劫咒",
		primaryAffix: "灭劫魔威",
		transform: "delayed_burst",
		inputs: [],
		outputs: [
			"accumulated damage → burst on expiry",
			"enemy +10% skill damage taken during 12s",
			"burst = 10% of accumulated + 5000% ATK (+ 65% from primary)",
		],
		operatorPorts: [TargetCategory.Damage],
	},
];

/** Look up a named entity by name */
export function getNamedEntity(name: string): NamedEntity | undefined {
	return NAMED_ENTITIES.find((e) => e.name === name);
}
