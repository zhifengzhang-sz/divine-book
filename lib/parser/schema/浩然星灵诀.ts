/**
 * Schema for 浩然星灵诀 — derived from raw data.
 *
 * Raw text (skill):
 *   对范围内目标造成五段共x%攻击力的灵法伤害，当神通命中后获得【天鹤之佑】状态：
 *   提升y%最终伤害加成，持续20秒
 *
 * Raw text (primary affix 天鹤祈瑞):
 *   自身每拥有x%最终伤害加深，本技能附加y%攻击力的伤害，最多计算z%最终伤害加深
 *
 * Raw text (exclusive affix 龙象护身):
 *   使本神通添加的增益效果强度提升x%
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

/** 获得【天鹤之佑】状态 */
export interface StateRef {
	type: "state_ref";
	/** 【天鹤之佑】 — 状态名 */
	state: string;
}

/** 提升y%最终伤害加成，持续20秒 */
export interface SelfBuff {
	type: "self_buff";
	/** y% — 最终伤害加成 */
	final_damage_bonus: V;
	/** 20秒 — 持续时间 */
	duration: V;
}

// ── primaryAffix (天鹤祈瑞) ──────────────────────────────

/** 自身每拥有x%最终伤害加深，本技能附加y%攻击力的伤害，最多计算z%最终伤害加深 */
export interface ConditionalHpScaling {
	type: "conditional_hp_scaling";
	/** x% — 每拥有百分比最终伤害加深 */
	hp_threshold: V;
	/** y% — 附加攻击力伤害百分比 */
	value: V;
	/** z% — 最多计算最终伤害加深百分比 */
	max: V;
}

// ── exclusiveAffix (龙象护身) ────────────────────────────

/** 使本神通添加的增益效果强度提升x% */
export interface BuffStrength {
	type: "buff_strength";
	/** x% — 增益效果强度提升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | StateRef | SelfBuff;
export type PrimaryAffixEffect = ConditionalHpScaling;
export type ExclusiveAffixEffect = BuffStrength;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
