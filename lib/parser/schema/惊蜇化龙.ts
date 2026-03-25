/**
 * Schema for 惊蜇化龙 — derived from raw data.
 *
 * Raw text (skill):
 *   合猿影构筑星辰杀阵，消耗自身x%当前气血值，对目标造成八段共x%攻击力的灵法伤害，
 *   额外对目标造成自身y%已损失气血值的伤害，并提升自身z%神通伤害加深，持续4秒
 *
 * Raw text (primary affix 星猿幻杀):
 *   本技能每段攻击必定给目标附加一层【镇杀】：
 *   每叠加两层便会消耗并造成目标x%最大气血值伤害
 *
 * Raw text (exclusive affix 索心真诀):
 *   1. 本神通造成伤害时，目标每有1层减益状态，会使本次额外造成目标x%最大气血值的真实伤害，
 *      最多造成y%最大气血值的真实伤害
 *   2. 在神通悟境的条件下：本神通附加自身已损气血的伤害提高z%，并使造成的伤害提升w%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 消耗自身x%当前气血值 */
export interface SelfHpCost {
	type: "self_hp_cost";
	/** x% — 消耗当前气血百分比 */
	value: V;
}

/** 造成八段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 额外对目标造成自身y%已损失气血值的伤害 */
export interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	/** y% — 已损失气血值百分比 */
	value: V;
}

/** 提升自身z%神通伤害加深，持续4秒 */
export interface SelfBuff {
	type: "self_buff";
	/** z% — 神通伤害加深百分比 */
	skill_damage_increase: V;
}

// ── primaryAffix (星猿幻杀) ──────────────────────────────

/** 每叠加两层便会消耗并造成目标x%最大气血值伤害 */
export interface PercentMaxHpAffix {
	type: "percent_max_hp_affix";
	/** x% — 目标最大气血值伤害百分比 */
	value: V;
	/** 【镇杀】 — 状态名 */
	state: string;
	/** 两层 — 触发所需层数 */
	trigger_stack: V;
}

// ── exclusiveAffix (索心真诀) ────────────────────────────

/** 目标每有1层减益状态，额外造成目标x%最大气血值的真实伤害，最多y% */
export interface PerDebuffStackTrueDamage {
	type: "per_debuff_stack_true_damage";
	/** x% — 每层减益状态造成的真实伤害百分比 */
	per_stack: V;
	/** y% — 最大气血值真实伤害上限百分比 */
	max: V;
}

/** 本神通附加自身已损气血的伤害提高z% */
export interface SelfLostHpDamageIncrease {
	type: "self_lost_hp_damage";
	/** z% — 已损气血伤害提高百分比 */
	value: V;
}

/** 造成的伤害提升w% */
export interface DamageIncrease {
	type: "damage_increase";
	/** w% — 伤害提升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | SelfHpCost | SelfLostHpDamage | SelfBuff;
export type PrimaryAffixEffect = PercentMaxHpAffix;
export type ExclusiveAffixEffect =
	| PerDebuffStackTrueDamage
	| SelfLostHpDamageIncrease
	| DamageIncrease;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
