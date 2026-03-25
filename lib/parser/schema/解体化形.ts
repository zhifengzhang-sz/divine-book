/**
 * Schema for 解体化形 — derived from raw data.
 *
 * Raw text (skill):
 *   召唤魔神虚影攻击目标，造成五段共x%攻击力的灵法伤害，
 *   同时目标当前每具有一个减益状态效果，本次神通伤害提升y%，最多计算10个减益状态
 *
 * Raw text (primary affix 魔神降世):
 *   技能释放前根据目标身上减益状态的最高层数提升自身攻击力，
 *   每层提升自身x%的攻击力，最多计数30层
 *
 * Raw text (exclusive affix 心逐神随):
 *   本神通施放时，会使本次神通所有效果x%概率提升4倍，
 *   y%概率提升3倍，z%概率提升2倍
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

/** 目标每具有一个减益状态，本次伤害提升y%，最多计算10个 */
export interface PerDebuffStackDamage {
	type: "per_debuff_stack_damage";
	/** y% — 每个减益状态伤害提升 */
	value: V;
	/** 10个 — 最多计算减益状态数 */
	max: V;
}

// ── primaryAffix (魔神降世) ──────────────────────────────

/** 根据目标减益状态最高层数提升自身攻击力，每层x%，最多30层 */
export interface AttackBonus {
	type: "attack_bonus";
	/** x% — 每层提升攻击力百分比 */
	value: V;
	/** 30层 — 最多计数层数 */
	max_stacks: V;
	/** 按目标减益状态层数 */
	per_debuff_stack: true;
	/** pre_cast — 技能释放前触发 */
	timing: string;
}

// ── exclusiveAffix (心逐神随) ────────────────────────────

/** 神通所有效果x%概率提升4倍，y%概率提升3倍，z%概率提升2倍 */
export interface ProbabilityMultiplier {
	type: "probability_multiplier";
	/** x% — 4倍概率 */
	chance_4x: V;
	/** y% — 3倍概率 */
	chance_3x: V;
	/** z% — 2倍概率 */
	chance_2x: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | PerDebuffStackDamage;
export type PrimaryAffixEffect = AttackBonus;
export type ExclusiveAffixEffect = ProbabilityMultiplier;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
