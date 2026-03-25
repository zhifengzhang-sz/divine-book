/**
 * Schema for 天轮魔经 — derived from raw data.
 *
 * Raw text (skill):
 *   召唤幽鬼对范围随机目标造成七段共x%攻击力的灵法伤害，
 *   并役使幽鬼偷取目标y个增益状态，
 *   每偷取1个增益状态，对目标造成z%最大气血值的伤害
 *
 * Raw text (primary affix 魔意震慑):
 *   每偷取目标一个增益状态对目标附加一层【惧意】状态：
 *   攻击力降低x%，持续12秒
 *
 * Raw text (exclusive affix 心魔惑言):
 *   使本神通添加的减益状态层数增加x%，
 *   敌方每有5层减益状态会使本神通所有伤害提升y%，最大提升z%
 *   （持续伤害效果受一半伤害加成）
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成七段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 偷取目标y个增益状态 */
export interface BuffSteal {
	type: "buff_steal";
	/** y个 — 偷取增益状态数量 */
	value: V;
}

/** 每偷取1个增益状态，造成z%最大气血值的伤害 */
export interface PercentMaxHpDamage {
	type: "percent_max_hp_damage";
	/** z% — 最大气血值伤害百分比 */
	value: V;
	/** per_steal — 每偷取触发 */
	trigger: string;
}

// ── primaryAffix (魔意震慑) ──────────────────────────────

/** 每偷取一个增益状态附加【惧意】：攻击力降低x%，持续12秒 */
export interface PerStolenBuffDebuff {
	type: "per_stolen_buff_debuff";
	/** 【惧意】 — 状态名 */
	state: string;
	/** x% — 攻击力降低百分比 */
	value: V;
	/** 12秒 — 持续时间 */
	duration: V;
}

// ── exclusiveAffix (心魔惑言) ────────────────────────────

/** 使本神通添加的减益状态层数增加x% */
export interface DebuffStackIncrease {
	type: "debuff_stack_increase";
	/** x% — 减益状态层数增加百分比 */
	value: V;
}

/** 敌方每有5层减益状态会使伤害提升y%，最大提升z% */
export interface PerDebuffStackDamage {
	type: "per_debuff_stack_damage";
	/** y% — 每5层伤害提升百分比 */
	value: V;
	/** z% — 最大伤害提升百分比 */
	max: V;
	/** 5层 — 每N层减益状态 */
	per_stack: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | BuffSteal | PercentMaxHpDamage;
export type PrimaryAffixEffect = PerStolenBuffDebuff;
export type ExclusiveAffixEffect = DebuffStackIncrease | PerDebuffStackDamage;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
