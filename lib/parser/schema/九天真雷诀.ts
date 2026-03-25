/**
 * Schema for 九天真雷诀 — derived from raw data.
 *
 * Raw text (skill):
 *   造成五段共x%攻击力的灵法伤害，神通释放时驱散自身y个负面状态，
 *   若净化的数量多于自身负面状态，则在接下来的三个神通命中时，
 *   每段攻击附加z%自身最大气血值的伤害。
 *
 * Raw text (exclusive affix 九雷真解):
 *   本神通每次施加增益/减益状态或添加护盾时，引动真雷轰击敌方，
 *   造成一次本神通x%的灵法伤害
 *
 * Note: no primary affix for this book.
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

/** 驱散自身y个负面状态 */
export interface SelfCleanse {
	type: "self_cleanse";
	/** y个 — 驱散负面状态数量 */
	count: V;
}

/** 若净化数量多于负面状态，每段攻击附加z%自身最大气血值的伤害 */
export interface ConditionalDamage {
	type: "conditional_damage";
	/** z% — 自身最大气血值百分比 */
	value: V;
	/** self_max_hp — 伤害基于自身最大气血值 */
	damage_base: "self_max_hp";
	/** 每段 — 每段攻击附加 */
	per_hit: true;
	/** cleanse_excess — 条件：净化数量多于负面状态 */
	condition: "cleanse_excess";
}

// ── exclusiveAffix (九雷真解) ────────────────────────────

/** 每次施加增益/减益状态或添加护盾时，造成一次本神通x%的灵法伤害 */
export interface OnBuffDebuffShield {
	type: "on_buff_debuff_shield";
	/** 增益/减益/护盾 — 触发类型 */
	trigger_kind: "增益/减益/护盾";
	/** x% — 本神通伤害百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | SelfCleanse | ConditionalDamage;
export type ExclusiveAffixEffect = OnBuffDebuffShield;

/** All effects this book can produce */
export type Effect = SkillEffect | ExclusiveAffixEffect;
