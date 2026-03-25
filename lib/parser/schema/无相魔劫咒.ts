/**
 * Schema for 无相魔劫咒 — derived from raw data.
 *
 * Raw text (skill):
 *   魔威浩荡，引魔将之力造成五段共1500%攻击力的灵法伤害，
 *   神通施放时对敌方施加负面状态【无相魔劫】，持续12秒。
 *   【无相魔劫】期间敌方受到的神通伤害增加10%，
 *   并且【无相魔劫】时间结束时，对目标造成10%【无相魔劫】期间提升的伤害+5000%攻击力的伤害
 *
 * Raw text (primary affix 灭劫魔威):
 *   【无相魔劫】状态结束时的伤害提升65%
 *
 * Raw text (exclusive affix 无相魔威):
 *   本神通命中时，对目标施加负面状态【魔劫】，持续8秒
 *   【魔劫】：降低敌方x%的治疗量，并使神通造成的伤害提升y%，
 *   若目标不存在任何治疗状态，伤害提升效果进一步提升至z%
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

/** 施加【无相魔劫】状态 */
export interface StateRef {
	type: "state_ref";
	/** 【无相魔劫】 — 状态名 */
	state: string;
}

/** 【无相魔劫】期间伤害增加，结束时造成累计伤害+攻击力伤害 */
export interface DelayedBurst {
	type: "delayed_burst";
	/** 【无相魔劫】 — 状态名 */
	name: string;
	/** 10% — 期间伤害增加百分比 */
	increase: V;
	/** 10% — 结束时累计伤害百分比 */
	burst_damage: V;
	/** 5000% — 结束时攻击力伤害百分比 */
	burst_atk_damage: V;
}

// ── primaryAffix (灭劫魔威) ──────────────────────────────

/** 【无相魔劫】状态结束时的伤害提升65% */
export interface DelayedBurstIncrease {
	type: "delayed_burst_increase";
	/** 【无相魔劫】 — 关联状态 */
	state: string;
	/** 65% — 伤害提升百分比 */
	value: V;
}

// ── exclusiveAffix (无相魔威) ────────────────────────────

/** 施加【魔劫】：降低治疗量，伤害提升，无治疗时进一步提升 */
export interface DebuffComplex {
	type: "debuff";
	/** 【魔劫】 — 状态名 */
	name: string;
	/** 8秒 — 持续时间 */
	duration: V;
	/** x% — 降低治疗量百分比 */
	heal_reduction: V;
	/** y% — 神通伤害提升百分比 */
	damage_increase: V;
	/** z% — 无治疗时伤害提升百分比 */
	enhanced_damage_increase: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | StateRef | DelayedBurst;
export type PrimaryAffixEffect = DelayedBurstIncrease;
export type ExclusiveAffixEffect = DebuffComplex;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
