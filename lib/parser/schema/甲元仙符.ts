/**
 * Schema for 甲元仙符 — derived from raw data.
 *
 * Raw text (skill):
 *   降下神威天光，对范围内目标造成x%攻击力的灵法伤害，释放神通时自身获得
 *   【仙佑】状态，提升自身y%攻击力加成、守御加成、最大气血值，持续12秒
 *
 * Raw text (primary affix 天光虹露):
 *   【仙佑】状态额外使自身获得x%治疗加成
 *
 * Raw text (exclusive affix 天倾灵枯):
 *   本神通施放后，会对敌方添加持续20秒的【灵枯】：治疗量降低x%，
 *   若敌方气血值低于30%，所降低的治疗量增至y%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成x%攻击力的灵法伤害 (单段) */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 获得【仙佑】状态 */
export interface StateRef {
	type: "state_ref";
	/** 【仙佑】 — 状态名 */
	state: string;
}

/** 提升自身y%攻击力加成、守御加成、最大气血值，持续12秒 */
export interface TripleStatBuff {
	type: "self_buff";
	/** y% — 攻击力加成 */
	attack_bonus: V;
	/** y% — 守御加成 */
	defense_bonus: V;
	/** y% — 最大气血值加成 */
	hp_bonus: V;
}

// ── primaryAffix (天光虹露) ──────────────────────────────

/** 【仙佑】状态额外使自身获得x%治疗加成 */
export interface SelfBuffExtra {
	type: "self_buff";
	/** 【仙佑】 — 关联增益状态名 */
	name: string;
	/** x% — 治疗加成 */
	healing_bonus: V;
}

// ── exclusiveAffix (天倾灵枯) ────────────────────────────

/** 对敌方添加持续20秒的【灵枯】：治疗量降低x%，若气血值低于30%，降低治疗量增至y% */
export interface HealReduction {
	type: "heal_reduction";
	/** x% — 治疗量降低百分比 */
	value: V;
	/** 【灵枯】 — 状态名 */
	state: string;
	/** 20秒 — 持续时间 */
	duration: V;
	/** 30% — 气血值低于此百分比时增强效果 */
	hp_threshold: V;
	/** y% — 低血量时降低治疗量百分比 */
	enhanced_value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | StateRef | TripleStatBuff;
export type PrimaryAffixEffect = SelfBuffExtra;
export type ExclusiveAffixEffect = HealReduction;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
