/**
 * Schema for 玉书天戈符 — derived from raw data.
 *
 * Raw text (skill):
 *   对范围内目标造成三段共x%攻击力的灵法伤害，同时每段伤害附加y%自身最大气血值的伤害
 *
 * Raw text (primary affix 天灵怒威):
 *   当前气血高于x%时获得伤害加成，每额外高出y%气血值获得y%伤害加成
 *
 * Raw text (exclusive affix 天人合一):
 *   使本神通的悟境等级加1（最高不超过3级），并使本神通造成的伤害提升x%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成三段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 每段伤害附加y%自身最大气血值的伤害 */
export interface PercentMaxHpDamage {
	type: "percent_max_hp_damage";
	/** y% — 自身最大气血值百分比 */
	value: V;
	/** 每段 — 每段攻击附加 */
	per_hit: true;
}

// ── primaryAffix (天灵怒威) ──────────────────────────────

/** 当前气血高于x%时获得伤害加成，每额外高出y%气血值获得y%伤害加成 */
export interface ConditionalHpScaling {
	type: "conditional_hp_scaling";
	/** x% — 气血值高于此百分比时触发 */
	hp_threshold: V;
	/** y% — 每额外高出百分比 / 每阶段伤害加成百分比 */
	per_step: V;
	/** y% — 伤害加成百分比 */
	value: V;
}

// ── exclusiveAffix (天人合一) ────────────────────────────

/** 使本神通的悟境等级加1（最高不超过3级） */
export interface EnlightenmentBonus {
	type: "enlightenment_bonus";
	/** 1级 — 悟境等级提升 */
	value: V;
}

/** 使本神通造成的伤害提升x% */
export interface DamageIncrease {
	type: "damage_increase";
	/** x% — 伤害提升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | PercentMaxHpDamage;
export type PrimaryAffixEffect = ConditionalHpScaling;
export type ExclusiveAffixEffect = EnlightenmentBonus | DamageIncrease;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
