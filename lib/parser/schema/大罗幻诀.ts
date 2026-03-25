/**
 * Schema for 大罗幻诀 — derived from raw data.
 *
 * Raw text (skill):
 *   对目标进行攻击，造成五段共x%攻击力的灵法伤害，
 *   并为自身添加【罗天魔咒】：受到伤害时，各有30%概率对攻击方添加1层
 *   【噬心之咒】与【断魂之咒】，各自最多叠加5层。【罗天魔咒】持续8秒
 *   【噬心之咒】：每0.5秒额外造成目标y%当前气血值的伤害，持续4秒
 *   【断魂之咒】：每0.5秒额外造成目标y%已损失气血值的伤害，持续4秒
 *
 * Raw text (primary affix 魔魂咒界):
 *   【罗天魔咒】状态下附加异常概率提升至60%，受到攻击时，
 *   额外给目标附加【命损】：最终伤害减免减低x%，持续8秒
 *
 * Raw text (exclusive affix 古魔之魂):
 *   使本神通添加的持续伤害上升x%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成五段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 施加【罗天魔咒】状态 */
export interface StateAdd {
	type: "state_add";
	/** 【罗天魔咒】 — 状态名 */
	state: string;
}

/** 受到伤害时，各有30%概率添加【噬心之咒】与【断魂之咒】 */
export interface CounterDebuff {
	type: "counter_debuff";
	/** on_attacked — 受到攻击时触发 */
	trigger: string;
	/** 30% — 触发概率 */
	chance: V;
	/** 1层 — 每次添加层数 */
	count: V;
	/** 【噬心之咒】 — 主状态名 */
	name: string;
	/** 【噬心之咒】、【断魂之咒】 — 所有状态 */
	states: string[];
}

/** 每0.5秒额外造成目标y%当前气血值的伤害，持续4秒 */
export interface DotCurrentHp {
	type: "dot";
	/** 【噬心之咒】 — 状态名 */
	name: string;
	/** 0.5秒 — 伤害间隔 */
	tick_interval: V;
	/** y% — 当前气血值伤害百分比 */
	percent_current_hp: V;
	/** 4秒 — 持续时间 */
	duration: V;
}

/** 每0.5秒额外造成目标y%已损失气血值的伤害，持续4秒 */
export interface DotLostHp {
	type: "dot";
	/** 【断魂之咒】 — 状态名 */
	name: string;
	/** 0.5秒 — 伤害间隔 */
	tick_interval: V;
	/** y% — 已损失气血值伤害百分比 */
	percent_lost_hp: V;
	/** 4秒 — 持续时间 */
	duration: V;
}

// ── primaryAffix (魔魂咒界) ──────────────────────────────

/** 【罗天魔咒】状态下附加异常概率提升至60% */
export interface CounterDebuffUpgrade {
	type: "counter_debuff_upgrade";
	/** 【罗天魔咒】 — 关联状态 */
	state: string;
	/** 60% — 提升后的概率 */
	value: V;
}

/** 受到攻击时，附加【命损】：最终伤害减免减低x%，持续8秒 */
export interface CrossSlotDebuff {
	type: "cross_slot_debuff";
	/** 【命损】 — 状态名 */
	name: string;
	/** final_damage_reduction — 降低属性 */
	target: string;
	/** x% — 降低百分比 */
	value: V;
	/** 8秒 — 持续时间 */
	duration: V;
	/** on_attacked — 受到攻击时触发 */
	trigger: string;
}

// ── exclusiveAffix (古魔之魂) ────────────────────────────

/** 使本神通添加的持续伤害上升x% */
export interface DotDamageIncrease {
	type: "dot_damage_increase";
	/** x% — 持续伤害上升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect =
	| BaseAttack
	| StateAdd
	| CounterDebuff
	| DotCurrentHp
	| DotLostHp;
export type PrimaryAffixEffect = CounterDebuffUpgrade | CrossSlotDebuff;
export type ExclusiveAffixEffect = DotDamageIncrease;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
