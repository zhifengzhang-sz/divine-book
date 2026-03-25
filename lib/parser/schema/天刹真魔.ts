/**
 * Schema for 天刹真魔 — derived from raw data.
 *
 * Raw text (skill):
 *   对目标进行攻击，造成五段共x%攻击力的灵法伤害，
 *   并为自身添加【不灭魔体】：受到伤害时，自身恢复该次伤害损失气血值的y%的气血值
 *   （该效果不受治疗加成影响）
 *   【不灭魔体】战斗状态内永久生效
 *
 * Raw text (primary affix 魔妄吞天):
 *   在【不灭魔体】状态下受到攻击时，为目标附加【天人五衰】：
 *   每3秒轮流降低目标x%致命率、x%暴击伤害、x%暴击率、y%攻击力、y%最终伤害减免，
 *   持续15秒
 *
 * Raw text (exclusive affix 魔骨明心):
 *   1. 本神通命中时，若敌方具有减益状态，则提升自身x%的治疗量，持续8秒
 *   2. 在神通悟境的条件下：本神通每次造成伤害时，降低敌方y%最终伤害减免，持续1秒
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

/** 施加【不灭魔体】状态 */
export interface StateAdd {
	type: "state_add";
	/** 【不灭魔体】 — 状态名 */
	state: string;
}

/** 受到伤害时，恢复该次伤害损失气血值的y%（不受治疗加成影响） */
export interface CounterBuff {
	type: "counter_buff";
	/** on_attacked — 受到攻击时触发 */
	trigger: string;
	/** y% — 恢复气血值百分比 */
	heal_on_damage_taken: V;
	/** 不受治疗加成影响 */
	no_healing_bonus: true;
}

// ── primaryAffix (魔妄吞天) ──────────────────────────────

/** 在【不灭魔体】下受到攻击时，附加【天人五衰】：轮流降低致命率/暴击伤害/暴击率/攻击力/最终伤害减免 */
export interface SelfBuffExtra {
	type: "self_buff_extra";
	/** 【不灭魔体】 — 触发状态 */
	state: string;
	/** 【天人五衰】 — 附加状态名 */
	target_state: string;
	/** x% — 致命率降低百分比 */
	crit_rate: V;
	/** 15秒 — 持续时间 */
	duration: V;
}

// ── exclusiveAffix (魔骨明心) ────────────────────────────

/** 若敌方具有减益状态，提升自身x%的治疗量，持续8秒 */
export interface SelfBuffHealing {
	type: "self_buff";
	/** x% — 治疗量提升百分比 */
	healing_bonus: V;
	/** 8秒 — 持续时间 */
	duration: V;
	/** enemy_has_debuff — 条件 */
	condition: string;
}

/** 每次造成伤害时，降低敌方y%最终伤害减免，持续1秒 */
export interface DebuffOnHit {
	type: "debuff";
	/** final_damage_reduction — 降低属性 */
	target: string;
	/** y% — 降低百分比 */
	value: V;
	/** 1秒 — 持续时间 */
	duration: V;
	/** on_hit — 每次造成伤害时 */
	trigger: string;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | StateAdd | CounterBuff;
export type PrimaryAffixEffect = SelfBuffExtra;
export type ExclusiveAffixEffect = SelfBuffHealing | DebuffOnHit;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
