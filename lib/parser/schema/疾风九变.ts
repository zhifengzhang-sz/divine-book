/**
 * Schema for 疾风九变 — derived from raw data.
 *
 * Raw text (skill):
 *   积蓄力量冲向敌方，消耗自身10%当前气血值，对目标造成十段共1500%攻击力的灵法伤害，
 *   并为自身添加【极怒】：每秒对目标反射自身所受到伤害值的50%与自身15%已损失气血值的伤害，
 *   持续4秒
 *
 * Raw text (primary affix 星猿复灵):
 *   恢复【极怒】造成伤害82%的气血值
 *
 * Raw text (exclusive affix 真言不灭):
 *   使本神通添加的所有状态持续时间延长x%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 消耗自身10%当前气血值 */
export interface SelfHpCost {
	type: "self_hp_cost";
	/** 10% — 消耗当前气血百分比 */
	value: V;
}

/** 造成十段共1500%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 为自身添加【极怒】 */
export interface StateAdd {
	type: "state_add";
	/** 【极怒】 — 状态名 */
	state: string;
}

/** 每秒对目标反射自身所受到伤害值的50%与自身15%已损失气血值的伤害 */
export interface CounterBuff {
	type: "counter_buff";
	/** 50% — 反射自身所受到伤害百分比 */
	reflect_received_damage: V;
	/** 15% — 已损失气血值伤害百分比 */
	reflect_percent_lost_hp: V;
}

// ── primaryAffix (星猿复灵) ──────────────────────────────

/** 恢复【极怒】造成伤害82%的气血值 */
export interface LifestealWithParent {
	type: "lifesteal_with_parent";
	/** 【极怒】 — 关联状态 */
	state: string;
	/** 82% — 恢复伤害百分比 */
	value: V;
}

// ── exclusiveAffix (真言不灭) ────────────────────────────

/** 使本神通添加的所有状态持续时间延长x% */
export interface AllStateDuration {
	type: "all_state_duration";
	/** x% — 持续时间延长百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = SelfHpCost | BaseAttack | StateAdd | CounterBuff;
export type PrimaryAffixEffect = LifestealWithParent;
export type ExclusiveAffixEffect = AllStateDuration;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
