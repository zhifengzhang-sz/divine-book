/**
 * Schema for 煞影千幻 — derived from raw data.
 *
 * Raw text (skill):
 *   通灵星辰巨猿，消耗自身x%当前气血值，对目标造成三段共y%攻击力的灵法伤害，
 *   额外对目标造成自身z%已损失气血值的伤害，并为自身添加w%最大气血值的护盾，
 *   护盾持续8秒，同时每段攻击必定会对目标添加1层不可驱散的【落星】：
 *   降低u%最终伤害减免，持续4秒
 *
 * Raw text (primary affix 星猿援护):
 *   获得的护盾提升至自身x%最大气血值，且有y%的概率不消耗气血值
 *
 * Raw text (exclusive affix 乘胜逐北):
 *   本神通造成伤害时，若敌方处于控制状态，则使本次伤害提升x%
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

/** 造成三段共y%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 额外对目标造成自身z%已损失气血值的伤害 */
export interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	/** z% — 已损失气血值百分比 */
	value: V;
}

/** 为自身添加w%最大气血值的护盾，护盾持续8秒 */
export interface Shield {
	type: "shield";
	/** w% — 最大气血值百分比 */
	value: V;
}

/** 每段攻击添加1层不可驱散的【落星】 */
export interface StateAddPerHit {
	type: "state_add";
	/** 【落星】 — 状态名 */
	state: string;
	/** 1层 — 每段添加层数 */
	count: V;
	/** 每段 — 每段攻击 */
	per_hit: true;
	/** 不可驱散 */
	undispellable: true;
}

/** 降低u%最终伤害减免，持续4秒 */
export interface Debuff {
	type: "debuff";
	/** 落星 — 减益名称 */
	name: string;
	/** 最终伤害减免 — 影响属性 */
	target: string;
	/** u% — 降低百分比 */
	value: V;
	/** 4秒 — 持续时间 */
	duration: V;
}

// ── primaryAffix (星猿援护) ──────────────────────────────

/** 获得的护盾提升至自身x%最大气血值 */
export interface ShieldStrength {
	type: "shield_strength";
	/** x% — 护盾提升至最大气血值百分比 */
	value: V;
}

/** 有y%的概率不消耗气血值 */
export interface Chance {
	type: "chance";
	/** y% — 不消耗气血概率 */
	value: V;
	/** no_hp_cost — 效果类型 */
	effect: "no_hp_cost";
}

// ── exclusiveAffix (乘胜逐北) ────────────────────────────

/** 若敌方处于控制状态，则使本次伤害提升x% */
export interface ConditionalDamageControlled {
	type: "conditional_damage_controlled";
	/** x% — 伤害提升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect =
	| SelfHpCost
	| BaseAttack
	| SelfLostHpDamage
	| Shield
	| StateAddPerHit
	| Debuff;
export type PrimaryAffixEffect = ShieldStrength | Chance;
export type ExclusiveAffixEffect = ConditionalDamageControlled;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
