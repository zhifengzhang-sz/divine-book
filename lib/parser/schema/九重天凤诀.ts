/**
 * Schema for 九重天凤诀 — derived from raw data.
 *
 * Raw text (skill):
 *   化身星猿，对目标造成八段共x%攻击力的灵法伤害，
 *   同时每段攻击额外对目标造成自身y%已损失气血值的伤害，
 *   每段攻击会消耗自身z%当前气血值并为自身添加1层【蛮神】：
 *   持续期间提升自身w%的攻击力与暴击率，持续4秒
 *
 * Raw text (primary affix 星猿永生):
 *   本技能造成伤害前优先驱散目标两个增益效果，
 *   释放本技能时气血不会降至x%以下
 *
 * Raw text (exclusive affix 玉石俱焚):
 *   当本神通所添加的护盾消失时，会对敌方额外造成护盾值x%的伤害
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成八段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 每段攻击额外对目标造成自身y%已损失气血值的伤害 */
export interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	/** y% — 已损失气血值百分比 */
	value: V;
	/** 每段 — 每段攻击附加 */
	per_hit: true;
}

/** 每段攻击会消耗自身z%当前气血值并为自身添加1层【蛮神】 */
export interface SelfHpCostPerHit {
	type: "self_hp_cost";
	/** z% — 消耗当前气血百分比 */
	value: V;
	/** 每段 — 每段攻击消耗 */
	per_hit: true;
}

/** 为自身添加1层【蛮神】 */
export interface StateAddPerHit {
	type: "state_add";
	/** 【蛮神】 — 状态名 */
	state: string;
	/** 1层 — 每段添加层数 */
	count: V;
	/** 每段 — 每段攻击 */
	per_hit: true;
}

/** 持续期间提升自身w%的攻击力与暴击率，持续4秒 */
export interface SelfBuff {
	type: "self_buff";
	/** w% — 攻击力提升百分比 */
	attack_bonus: V;
	/** w% — 暴击率提升百分比 */
	crit_rate: V;
	/** 4秒 — 持续时间 */
	duration: V;
}

// ── primaryAffix (星猿永生) ──────────────────────────────

/** 造成伤害前优先驱散目标两个增益效果 */
export interface PeriodicDispel {
	type: "periodic_dispel";
	/** 两个 — 驱散增益数量 */
	count: V;
}

/** 释放本技能时气血不会降至x%以下 */
export interface SelfHpFloor {
	type: "self_hp_floor";
	/** x% — 气血下限百分比 */
	value: V;
}

// ── exclusiveAffix (玉石俱焚) ────────────────────────────

/** 当护盾消失时，对敌方额外造成护盾值x%的伤害 */
export interface OnShieldExpire {
	type: "on_shield_expire";
	/** x% — 护盾值伤害百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect =
	| BaseAttack
	| SelfLostHpDamage
	| SelfHpCostPerHit
	| StateAddPerHit
	| SelfBuff;
export type PrimaryAffixEffect = PeriodicDispel | SelfHpFloor;
export type ExclusiveAffixEffect = OnShieldExpire;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
