/**
 * Schema for 皓月剑诀 — derived from raw data.
 *
 * Raw text (skill):
 *   对范围内目标造成十段共计x%攻击力的灵法伤害，神通释放时自身获得增益状态
 *   【寂灭剑心】：每段伤害命中时湮灭敌方1个护盾，并额外造成y%敌方最大气血值的伤害
 *   （对怪物最多造成z%攻击力的伤害）；对无盾目标造成双倍伤害
 *   （对怪物最多造成w%攻击力的伤害）；【寂灭剑心】上限1层，持续4秒
 *
 * Raw text (primary affix 碎魂剑意):
 *   【寂灭剑心】每0.5秒对目标造成湮灭护盾的总个数*600%攻击力的伤害
 *   （若触发湮灭护盾效果时敌方无护盾加持，则计算湮灭2个护盾）
 *
 * Raw text (exclusive affix 追神真诀):
 *   1. 本神通所添加的持续伤害触发时，额外造成目标x%已损失气血值的伤害
 *   2. 本神通附加目标最大气血的伤害提高y%，并且造成的伤害提升z%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成十段共计x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 获得增益状态【寂灭剑心】 */
export interface StateRef {
	type: "state_ref";
	/** 【寂灭剑心】 — 状态名 */
	state: string;
}

/** 每段伤害命中时湮灭敌方1个护盾，并额外造成y%敌方最大气血值的伤害（对怪物最多造成z%攻击力的伤害） */
export interface ShieldDestroyDamage {
	type: "shield_destroy_damage";
	/** 1个 — 每次命中湮灭护盾数 */
	shields_per_hit: V;
	/** y% — 额外造成敌方最大气血值百分比伤害 */
	percent_max_hp: V;
	/** z% — 对怪物伤害上限占攻击力百分比 */
	cap_vs_monster: V;
}

/** 对无盾目标造成双倍伤害（对怪物最多造成w%攻击力的伤害） */
export interface NoShieldDoubleDamage {
	type: "no_shield_double_damage";
	/** w% — 对怪物伤害上限占攻击力百分比 */
	cap_vs_monster: V;
}

// ── primaryAffix (碎魂剑意) ──────────────────────────────

/** 每0.5秒对目标造成湮灭护盾的总个数*600%攻击力的伤害 */
export interface ShieldDestroyDot {
	type: "shield_destroy_dot";
	/** 【寂灭剑心】 — 关联状态 */
	state: string;
	/** 0.5秒 — 伤害间隔 */
	interval: V;
	/** 600% — 每个护盾的伤害占攻击力百分比 */
	value: V;
}

// ── exclusiveAffix (追神真诀) ────────────────────────────

/** 持续伤害触发时，额外造成目标x%已损失气血值的伤害 */
export interface DotExtraPerTick {
	type: "dot_extra_per_tick";
	/** x% — 已损失气血值百分比 */
	value: V;
}

/** 本神通附加目标最大气血的伤害提高y% */
export interface PercentMaxHpDamageIncrease {
	type: "percent_max_hp_damage";
	/** y% — 目标最大气血伤害提升百分比 */
	value: V;
}

/** 造成的伤害提升z% */
export interface DamageIncrease {
	type: "damage_increase";
	/** z% — 伤害提升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect =
	| BaseAttack
	| StateRef
	| ShieldDestroyDamage
	| NoShieldDoubleDamage;
export type PrimaryAffixEffect = ShieldDestroyDot;
export type ExclusiveAffixEffect =
	| DotExtraPerTick
	| PercentMaxHpDamageIncrease
	| DamageIncrease;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
