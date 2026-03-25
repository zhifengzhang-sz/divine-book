/**
 * Schema for 玄煞灵影诀 — derived from raw data.
 *
 * Raw text (skill):
 *   通灵星辰巨猿之影，星辰巨猿与自身同时位移向前，分别对目标进行攻击，
 *   造成四段共x%攻击力的灵法伤害，并为自身添加【怒意滔天】：
 *   自身每秒损失y%的当前气血值，并每秒对目标造成自身z%已损气血值和期间消耗气血的伤害。
 *   【怒意滔天】战斗状态内永久生效，最多叠加1层。
 *
 * Raw text (primary affix 星猿之怒):
 *   【怒意滔天】每造成4次伤害，额外附加x%自身已损气血值和期间消耗气血值的伤害
 *
 * Raw text (exclusive affix 怒血战意):
 *   本神通造成伤害时，自身每多损失1%最大气血值，会使本次伤害提升x%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成四段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 为自身添加【怒意滔天】 */
export interface StateAdd {
	type: "state_add";
	/** 【怒意滔天】 — 状态名 */
	state: string;
}

/** 自身每秒损失y%的当前气血值 */
export interface SelfHpCost {
	type: "self_hp_cost";
	/** y% — 每秒损失当前气血百分比 */
	value: V;
	/** 每秒 — 伤害间隔 */
	tick_interval: V;
}

/** 每秒对目标造成自身z%已损气血值和期间消耗气血的伤害 */
export interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	/** z% — 已损气血值百分比 */
	value: V;
	/** 每秒 — 伤害间隔 */
	tick_interval: V;
}

// ── primaryAffix (星猿之怒) ──────────────────────────────

/** 每造成4次伤害，额外附加x%自身已损气血值和期间消耗气血值的伤害 */
export interface SelfLostHpDamageAffix {
	type: "self_lost_hp_damage";
	/** x% — 已损气血值百分比 */
	value: V;
	/** 4次 — 每几次伤害触发 */
	every_n_hits: V;
}

// ── exclusiveAffix (怒血战意) ────────────────────────────

/** 自身每多损失1%最大气血值，会使本次伤害提升x% */
export interface PerSelfLostHp {
	type: "per_self_lost_hp";
	/** x% — 每1%损失气血提升伤害百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | StateAdd | SelfHpCost | SelfLostHpDamage;
export type PrimaryAffixEffect = SelfLostHpDamageAffix;
export type ExclusiveAffixEffect = PerSelfLostHp;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
