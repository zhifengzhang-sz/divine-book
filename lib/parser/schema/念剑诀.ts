/**
 * Schema for 念剑诀 — derived from raw data.
 *
 * Raw text (skill):
 *   在4秒内不可被选中。同时降下轰雷剑阵，对范围内目标造成八段共x%攻击力的灵法伤害，
 *   轰雷剑阵每造成2次伤害时，剑阵接下来的伤害提升y倍，单次伤害至多被该效果重复加成10次
 *
 * Raw text (primary affix 雷阵剑影):
 *   技能结束后雷阵不会马上消失，将额外持续存在x秒，每0.5秒造成一次伤害
 *
 * Raw text (exclusive affix 仙露护元):
 *   使本神通添加的增益状态持续时间延长x%
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成八段共x%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 在4秒内不可被选中 */
export interface Untargetable {
	type: "untargetable";
	/** 4秒 — 不可被选中持续时间 */
	value: V;
}

/** 每造成2次伤害时，伤害提升y倍，单次伤害至多被该效果重复加成10次 */
export interface PeriodicEscalation {
	type: "periodic_escalation";
	/** 2次 — 每N次伤害触发一次提升 */
	every_n_hits: V;
	/** y倍 — 每次提升的倍率 */
	multiplier: V;
	/** 10次 — 最多叠加次数 */
	max_stacks: V;
}

// ── primaryAffix (雷阵剑影) ──────────────────────────────

/** 额外持续存在x秒，每0.5秒造成一次伤害 */
export interface ExtendedDot {
	type: "extended_dot";
	/** x秒 — 额外持续时间 */
	extra_seconds: V;
	/** 0.5秒 — 伤害间隔 */
	interval: V;
}

// ── exclusiveAffix (仙露护元) ────────────────────────────

/** 使本神通添加的增益状态持续时间延长x% */
export interface BuffDuration {
	type: "buff_duration";
	/** x% — 持续时间延长百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | Untargetable | PeriodicEscalation;
export type PrimaryAffixEffect = ExtendedDot;
export type ExclusiveAffixEffect = BuffDuration;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
