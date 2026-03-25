/**
 * Schema for 十方真魄 — derived from raw data.
 *
 * Raw text (skill):
 *   借星灵之力快速接近目标，消耗自身x%当前气血值，对目标造成十段共y%攻击力的灵法伤害，
 *   在神通的最后会对踢向目标，额外对其造成自身z%已损失气血值的伤害，
 *   并等额恢复自身气血，同时为自身添加【怒灵降世】：
 *   持续期间提升自身w%的攻击力与伤害减免，持续4秒
 *
 * Raw text (primary affix 星猿弃天):
 *   延长x秒【怒灵降世】持续时间，并且每秒有y%概率驱散自身所有控制状态，
 *   25秒内最多触发1次驱散状态
 *
 * Raw text (exclusive affix 破釜沉舟):
 *   本神通施放时，会使本次神通伤害提升x%，施放期间自身受到的伤害也提升y%
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

/** 造成十段共y%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 额外对其造成自身z%已损失气血值的伤害，并等额恢复自身气血 */
export interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	/** z% — 已损失气血值百分比 */
	value: V;
	/** 等额恢复自身气血 */
	self_heal: true;
}

/** 为自身添加【怒灵降世】 */
export interface StateAdd {
	type: "state_add";
	/** 【怒灵降世】 — 状态名 */
	state: string;
}

/** 持续期间提升自身w%的攻击力与伤害减免，持续4秒 */
export interface SelfBuff {
	type: "self_buff";
	/** w% — 攻击力提升百分比 */
	attack_bonus: V;
	/** w% — 伤害减免百分比 */
	damage_reduction: V;
	/** 4秒 — 持续时间 */
	duration: V;
}

// ── primaryAffix (星猿弃天) ──────────────────────────────

/** 延长x秒【怒灵降世】持续时间 */
export interface SelfBuffExtend {
	type: "self_buff_extend";
	/** x秒 — 延长秒数 */
	value: V;
	/** 【怒灵降世】 — 关联状态 */
	state: string;
}

/** 每秒有y%概率驱散自身所有控制状态，25秒内最多触发1次 */
export interface PeriodicCleanse {
	type: "periodic_cleanse";
	/** y% — 每秒驱散概率 */
	chance: V;
	/** 控制状态 — 驱散目标类型 */
	target: "控制状态";
	/** 25秒 — 冷却时间 */
	cooldown: V;
	/** 1次 — 最多触发次数 */
	max_times: V;
}

// ── exclusiveAffix (破釜沉舟) ────────────────────────────

/** 本次神通伤害提升x% */
export interface DamageIncrease {
	type: "damage_increase";
	/** x% — 伤害提升百分比 */
	value: V;
}

/** 施放期间自身受到的伤害也提升y% */
export interface SelfDamageTakenIncrease {
	type: "self_damage_taken_increase";
	/** y% — 自身受到伤害提升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect =
	| SelfHpCost
	| BaseAttack
	| SelfLostHpDamage
	| StateAdd
	| SelfBuff;
export type PrimaryAffixEffect = SelfBuffExtend | PeriodicCleanse;
export type ExclusiveAffixEffect = DamageIncrease | SelfDamageTakenIncrease;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
