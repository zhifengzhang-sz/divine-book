/**
 * Schema for 无极御剑诀 — derived from raw data.
 *
 * Raw text (skill):
 *   造成五段共计x%攻击力的灵法伤害，神通命中时此前敌方每被神通多段攻击命中一次，
 *   额外附加y%目标当前气血值的伤害
 *
 * Raw text (exclusive affix 无极剑阵):
 *   本神通攻击目标时提升x%神通伤害，但目标对本神通提升y%神通伤害减免
 *
 * Note: no primary affix for this book.
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成五段共计x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 此前敌方每被神通多段攻击命中一次，额外附加y%目标当前气血值的伤害 */
export interface PercentCurrentHpDamage {
	type: "percent_current_hp_damage";
	/** y% — 目标当前气血值百分比 */
	value: V;
	/** cross_skill — 跨神通累计 */
	accumulation: "cross_skill";
	/** 此前每被命中一次 */
	per_prior_hit: true;
}

// ── exclusiveAffix (无极剑阵) ────────────────────────────

/** 攻击目标时提升x%神通伤害 */
export interface SkillDamageIncreaseAffix {
	type: "skill_damage_increase_affix";
	/** x% — 神通伤害提升百分比 */
	value: V;
}

/** 目标对本神通提升y%神通伤害减免 */
export interface EnemySkillDamageReduction {
	type: "debuff";
	/** enemy_skill_damage_reduction — 减益目标 */
	target: "enemy_skill_damage_reduction";
	/** y% — 神通伤害减免百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | PercentCurrentHpDamage;
export type ExclusiveAffixEffect =
	| SkillDamageIncreaseAffix
	| EnemySkillDamageReduction;

/** All effects this book can produce */
export type Effect = SkillEffect | ExclusiveAffixEffect;
