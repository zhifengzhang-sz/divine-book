/**
 * Schema for 新青元剑诀 (新-青元剑诀) — derived from raw data.
 *
 * Raw text (skill):
 *   对范围内目标造成六段共x%攻击力的灵法伤害，
 *   并依敌方神通装配顺序，使其下一个未释放的神通进入8秒冷却时间
 *
 * Raw text (primary affix 追命剑阵):
 *   使敌方的神通伤害降低x%，持续16秒
 *
 * Raw text (exclusive affix 天威煌煌):
 *   本神通施放后，使下一个施放的神通额外获得x%的神通伤害加深
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成六段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 使其下一个未释放的神通进入8秒冷却时间 */
export interface SkillCooldownDebuff {
	type: "debuff";
	/** 神通封印 — 减益名称 */
	name: string;
	/** next_skill_cooldown — 目标类型 */
	target: "next_skill_cooldown";
	/** 8秒 — 冷却时间 */
	value: V;
	/** 8秒 — 持续时间 */
	duration: V;
	/** 按装配顺序 */
	sequenced: true;
}

// ── primaryAffix (追命剑阵) ──────────────────────────────

/** 使敌方的神通伤害降低x%，持续16秒 */
export interface SkillDamageDebuff {
	type: "debuff";
	/** skill_damage — 减益目标 */
	target: "skill_damage";
	/** x% — 神通伤害降低百分比 */
	value: V;
	/** 16秒 — 持续时间 */
	duration: V;
}

// ── exclusiveAffix (天威煌煌) ────────────────────────────

/** 使下一个施放的神通额外获得x%的神通伤害加深 */
export interface NextSkillBuff {
	type: "next_skill_buff";
	/** x% — 神通伤害加深百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | SkillCooldownDebuff;
export type PrimaryAffixEffect = SkillDamageDebuff;
export type ExclusiveAffixEffect = NextSkillBuff;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
