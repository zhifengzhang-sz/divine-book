/**
 * Schema for 元磁神光 — derived from raw data.
 *
 * Raw text (skill):
 *   对范围内目标造成五段共x%攻击力的伤害，自身每次受到神通攻击时获得一层
 *   【天狼之啸】：提升y%伤害加深，最多叠加z层，持续12秒
 *
 * Raw text (primary affix 天狼战意):
 *   每层【天狼之啸】额外提升自身x%攻击力
 *
 * Raw text (exclusive affix 真极穿空):
 *   使本神通添加的增益状态层数增加x%，自身每5层增益状态，提升y%伤害，
 *   最大提升z%伤害（25层达到最大提升伤害）
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成五段共x%攻击力的伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 获得【天狼之啸】状态 */
export interface StateRef {
	type: "state_ref";
	/** 【天狼之啸】 — 状态名 */
	state: string;
}

/** 提升y%伤害加深，最多叠加z层，持续12秒 */
export interface SelfBuff {
	type: "self_buff";
	/** y% — 伤害加深 */
	damage_increase: V;
	/** z层 — 最多叠加层数 */
	max_stacks: V;
	/** 12秒 — 持续时间 */
	duration: V;
}

// ── primaryAffix (天狼战意) ──────────────────────────────

/** 每层【天狼之啸】额外提升自身x%攻击力 */
export interface AttackBonus {
	type: "attack_bonus";
	/** x% — 每层提升攻击力百分比 */
	value: V;
	/** 【天狼之啸】 — 关联状态 */
	per_state_stack: string;
}

// ── exclusiveAffix (真极穿空) ────────────────────────────

/** 使本神通添加的增益状态层数增加x% */
export interface BuffStackIncrease {
	type: "buff_stack_increase";
	/** x% — 增益状态层数增加百分比 */
	value: V;
}

/** 自身每5层增益状态，提升y%伤害，最大提升z%伤害 */
export interface PerBuffStackDamage {
	type: "per_buff_stack_damage";
	/** 5层 — 每N层增益状态 */
	per_stack: V;
	/** y% — 每阶段伤害提升百分比 */
	value: V;
	/** z% — 最大伤害提升百分比 */
	max: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | StateRef | SelfBuff;
export type PrimaryAffixEffect = AttackBonus;
export type ExclusiveAffixEffect = BuffStackIncrease | PerBuffStackDamage;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
