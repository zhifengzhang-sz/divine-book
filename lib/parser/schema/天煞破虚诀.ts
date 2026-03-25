/**
 * Schema for 天煞破虚诀 — derived from raw data.
 *
 * Raw text (skill):
 *   森罗龙象，引力士之灵造成五段共x%攻击力的灵法伤害。
 *   消耗y%当前气血值，本技能释放结束后使自身进入【破虚】状态：
 *   接下来神通的8段攻击，每段攻击附加自身z%已损气血值的伤害
 *
 * Raw text (primary affix): none
 *
 * Raw text (exclusive affix 天煞破虚):
 *   本神通命中后每秒驱散敌方1个增益状态，持续10秒，
 *   且本技能每驱散一个状态对敌方造成本神通x%的灵法伤害，
 *   若无驱散状态，则造成双倍伤害
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

/** 消耗y%当前气血值 */
export interface SelfHpCost {
	type: "self_hp_cost";
	/** y% — 消耗当前气血百分比 */
	value: V;
}

/** 使自身进入【破虚】状态 */
export interface StateRef {
	type: "state_ref";
	/** 【破虚】 — 状态名 */
	state: string;
}

/** 接下来神通的8段攻击，每段攻击附加自身z%已损气血值的伤害 */
export interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	/** z% — 已损气血值百分比 */
	value: V;
	/** 每段 — 每段攻击附加 */
	per_hit: true;
	/** 8段 — 接下来神通攻击段数 */
	next_skill_hits: V;
}

// ── exclusiveAffix (天煞破虚) ────────────────────────────

/** 每秒驱散敌方1个增益状态，持续10秒，每驱散造成本神通x%伤害，无可驱散则双倍 */
export interface PeriodicDispel {
	type: "periodic_dispel";
	/** 1秒 — 驱散间隔 */
	interval: V;
	/** 10秒 — 持续时间 */
	duration: V;
	/** x% — 每次驱散造成本神通伤害百分比 */
	damage_percent_of_skill: V;
	/** 若无驱散状态，则造成双倍伤害 */
	no_buff_double: true;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | SelfHpCost | StateRef | SelfLostHpDamage;
export type ExclusiveAffixEffect = PeriodicDispel;

/** All effects this book can produce */
export type Effect = SkillEffect | ExclusiveAffixEffect;
