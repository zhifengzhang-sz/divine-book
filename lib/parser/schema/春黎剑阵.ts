/**
 * Schema for 春黎剑阵 — derived from raw data.
 *
 * Raw text (skill):
 *   对范围内目标造成五段共计x%攻击力的灵法伤害，并创建一个持续存在16秒的分身，
 *   继承自身y%的属性。主角释放神通后分身会攻击敌方，分身受到的伤害为自身的z%
 *
 * Raw text (primary affix 幻象剑灵):
 *   分身受到伤害降低至自身的x%，造成的伤害增加y%
 *
 * Raw text (exclusive affix 玄心剑魄):
 *   本神通施放后，会对敌方添加持续w秒的【噬心】：每秒受到x%攻击力的伤害，
 *   若被驱散，立即受到y%攻击力的伤害，并眩晕z秒
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

/** 创建一个持续存在16秒的分身，继承自身y%的属性，分身受到的伤害为自身的z% */
export interface Summon {
	type: "summon";
	/** y% — 继承自身属性百分比 */
	inherit_stats: V;
	/** 16秒 — 分身持续时间 */
	duration: V;
	/** on_cast — 触发时机 */
	trigger: "on_cast";
	/** z% — 分身受到的伤害倍率 */
	damage_taken_multiplier: V;
}

// ── primaryAffix (幻象剑灵) ──────────────────────────────

/** 分身受到伤害降低至自身的x%，造成的伤害增加y% */
export interface SummonBuff {
	type: "summon_buff";
	/** x% — 分身受到伤害降低至 */
	damage_taken_reduction_to: V;
	/** y% — 造成的伤害增加 */
	damage_increase: V;
}

// ── exclusiveAffix (玄心剑魄) ────────────────────────────

/** 每秒受到x%攻击力的伤害 */
export interface Dot {
	type: "dot";
	/** 【噬心】 — 状态名 */
	state: string;
	/** x% — 每秒伤害占攻击力百分比 */
	damage_per_tick: V;
	/** w秒 — 持续时间 */
	duration: V;
	/** 每秒 — 伤害间隔 */
	tick_interval: V;
}

/** 若被驱散，立即受到y%攻击力的伤害，并眩晕z秒 */
export interface OnDispel {
	type: "on_dispel";
	/** y% — 驱散时立即伤害占攻击力百分比 */
	damage: V;
	/** z秒 — 眩晕持续时间 */
	stun_duration: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | Summon;
export type PrimaryAffixEffect = SummonBuff;
export type ExclusiveAffixEffect = Dot | OnDispel;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
