/**
 * Schema for 梵圣真魔咒 — derived from raw data.
 *
 * Raw text (skill):
 *   役使六道鬼王攻击目标，对其造成六段共计x%攻击力的灵法伤害，
 *   每段攻击会为目标添加1层【贪妄业火】：
 *   每秒对目标造成y%当前气血值的伤害，持续8秒
 *
 * Raw text (primary affix 魔心焚尽):
 *   目标每获得两个【贪妄业火】，会额外附加一层持续8秒的【瞋痴业火】：
 *   每秒造成目标x%已损气血值伤害
 *
 * Raw text (exclusive affix 天魔真解):
 *   使本神通添加的持续伤害效果触发间隙缩短x%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成六段共计x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 每段攻击添加1层【贪妄业火】状态 */
export interface StateAdd {
	type: "state_add";
	/** 【贪妄业火】 — 状态名 */
	state: string;
	/** 1层 — 每段添加层数 */
	count: V;
	/** 每段攻击添加 */
	per_hit: true;
}

/** 每秒对目标造成y%当前气血值的伤害，持续8秒 */
export interface DotCurrentHp {
	type: "dot";
	/** 每秒 — 1秒间隔 */
	tick_interval: V;
	/** y% — 当前气血值伤害百分比 */
	percent_current_hp: V;
}

// ── primaryAffix (魔心焚尽) ──────────────────────────────

/** 每获得两个【贪妄业火】附加【瞋痴业火】：每秒造成x%已损气血值伤害 */
export interface DotLostHp {
	type: "dot";
	/** 【瞋痴业火】 — 状态名 */
	name: string;
	/** 每秒 — 1秒间隔 */
	tick_interval: V;
	/** x% — 已损气血值伤害百分比 */
	percent_lost_hp: V;
	/** 8秒 — 持续时间 */
	duration: V;
	/** 两个 — 每N个【贪妄业火】触发 */
	trigger_stack: V;
	/** 【贪妄业火】 — 来源状态 */
	source_state: string;
}

// ── exclusiveAffix (天魔真解) ────────────────────────────

/** 使本神通添加的持续伤害效果触发间隙缩短x% */
export interface DotFrequencyIncrease {
	type: "dot_frequency_increase";
	/** x% — 触发间隙缩短百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | StateAdd | DotCurrentHp;
export type PrimaryAffixEffect = DotLostHp;
export type ExclusiveAffixEffect = DotFrequencyIncrease;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
