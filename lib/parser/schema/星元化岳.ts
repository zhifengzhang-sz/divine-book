/**
 * Schema for 星元化岳 — derived from raw data.
 *
 * Raw text (skill):
 *   对范围内目标造成五段共x%攻击力的灵法伤害，当目标每次受到伤害时，
 *   会额外受到一次攻击，伤害值为当次伤害的y%（该伤害不受伤害加成影响），持续8秒
 *
 * Raw text (primary affix 天龙轮转):
 *   真灵天龙造成伤害时，恢复自身本次伤害x%的气血值
 *
 * Raw text (exclusive affix 仙灵汲元):
 *   本神通造成伤害时，会使本次神通获得x%的吸血效果
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

/** 每次受到伤害时额外受到一次攻击，伤害值为当次伤害的y%（不受伤害加成影响），持续8秒 */
export interface EchoDamage {
	type: "echo_damage";
	/** y% — 当次伤害的百分比 */
	value: V;
	/** 该伤害不受伤害加成影响 */
	ignore_damage_bonus: true;
	/** 8秒 — 持续时间 */
	duration: V;
}

// ── primaryAffix (天龙轮转) ──────────────────────────────

/** 造成伤害时，恢复自身本次伤害x%的气血值 */
export interface Lifesteal {
	type: "lifesteal";
	/** x% — 吸血百分比 */
	value: V;
}

// ── exclusiveAffix (仙灵汲元) ────────────────────────────

/** 本神通造成伤害时，会使本次神通获得x%的吸血效果 */
export interface LifestealExclusive {
	type: "lifesteal";
	/** x% — 吸血百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | EchoDamage;
export type PrimaryAffixEffect = Lifesteal;
export type ExclusiveAffixEffect = LifestealExclusive;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
