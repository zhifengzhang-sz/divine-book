/**
 * Schema for 通天剑诀 — derived from raw data.
 *
 * Raw text (skill):
 *   对范围内目标造成六段共x%攻击力的灵法伤害，
 *   并使本神通暴击伤害提高y%，释放后自身8秒内受到伤害提高z%
 *
 * Raw text (primary affix 焚心剑芒):
 *   敌方当前气血值每损失x%，本神通伤害额外增加y%
 *
 * Raw text (exclusive affix 神威冲云):
 *   使本神通无视敌方所有伤害减免效果，并提升x%伤害
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成六段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 使本神通暴击伤害提高y% */
export interface CritDmgBonus {
	type: "crit_dmg_bonus";
	/** y% — 暴击伤害提高百分比 */
	value: V;
}

/** 释放后自身8秒内受到伤害提高z% */
export interface SelfDamageTakenIncrease {
	type: "self_damage_taken_increase";
	/** 8秒 — 持续时间 */
	duration: V;
	/** z% — 受到伤害提高百分比 */
	value: V;
}

// ── primaryAffix (焚心剑芒) ──────────────────────────────

/** 敌方当前气血值每损失x%，本神通伤害额外增加y% */
export interface ConditionalDamage {
	type: "conditional_damage";
	/** enemy_hp_loss — 条件类型 */
	condition: "enemy_hp_loss";
	/** x% — 每损失百分比 */
	per_step: V;
	/** y% — 每阶段伤害增加百分比 */
	value: V;
}

// ── exclusiveAffix (神威冲云) ────────────────────────────

/** 无视敌方所有伤害减免效果 */
export interface IgnoreDamageReduction {
	type: "ignore_damage_reduction";
}

/** 提升x%伤害 */
export interface DamageIncrease {
	type: "damage_increase";
	/** x% — 伤害提升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | CritDmgBonus | SelfDamageTakenIncrease;
export type PrimaryAffixEffect = ConditionalDamage;
export type ExclusiveAffixEffect = IgnoreDamageReduction | DamageIncrease;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
