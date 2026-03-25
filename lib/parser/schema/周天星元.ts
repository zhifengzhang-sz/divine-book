/**
 * Schema for 周天星元 — derived from raw data.
 *
 * Raw text (skill):
 *   4秒内为自身恢复共x%最大气血值，并释放天书之意对范围内目标造成五段共计y%攻击力的
 *   灵法伤害，并附加临摹期间所恢复气血值的等额伤害，当技能释放结束后留下一只持续存在
 *   20秒的回生【灵鹤】：每秒恢复自身和友方z%气血值，共计恢复w%的最大气血值
 *
 * Raw text (primary affix 天书灵盾):
 *   【灵鹤】每次恢复气血时会为目标添加一个x%自身最大气血值的护盾，持续16秒
 *
 * Raw text (exclusive affix 奇能诡道):
 *   1. 当本神通为敌方添加减益状态时，有x%概率额外多附加1层该减益状态
 *   2. 若本神通施加伤害加深类增益状态时，则会额外对目标施加负面状态【逆转阴阳】：
 *      敌方会减少y倍触发属性的伤害减免类效果，持续时间与触发的增益状态相同
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成五段共计y%攻击力的灵法伤害 */
export { BaseAttack } from "./千锋聚灵剑.js";
import type { BaseAttack } from "./千锋聚灵剑.js";

/** 为自身恢复共x%最大气血值 */
export interface SelfHeal {
	type: "self_heal";
	/** x% — 恢复最大气血值百分比 */
	value: V;
}

/** 附加临摹期间所恢复气血值的等额伤害 */
export interface HealEchoDamage {
	type: "heal_echo_damage";
	/** 等额 — 恢复气血值的伤害比例 */
	ratio: number;
}

/** 获得【灵鹤】状态 */
export interface StateRef {
	type: "state_ref";
	/** 【灵鹤】 — 状态名 */
	state: string;
}

/** 每秒恢复自身和友方z%气血值，共计恢复w%的最大气血值 */
export interface PeriodicHeal {
	type: "self_heal";
	/** z% — 每秒恢复气血值百分比 */
	per_tick: V;
	/** w% — 共计恢复最大气血值百分比 */
	total: V;
	/** 每秒 — 恢复间隔 */
	tick_interval: number;
}

// ── primaryAffix (天书灵盾) ──────────────────────────────

/** 每次恢复气血时会为目标添加一个x%自身最大气血值的护盾，持续16秒 */
export interface Shield {
	type: "shield";
	/** x% — 自身最大气血值百分比 */
	value: V;
	/** 16秒 — 持续时间 */
	duration: V;
	/** self_max_hp — 护盾值来源 */
	source: "self_max_hp";
	/** per_tick — 触发时机 */
	trigger: "per_tick";
}

// ── exclusiveAffix (奇能诡道) ────────────────────────────

/** 有x%概率额外多附加1层该减益状态 */
export interface DebuffStackChance {
	type: "debuff_stack_chance";
	/** x% — 额外附加减益状态概率 */
	value: V;
}

/** 额外对目标施加负面状态【逆转阴阳】：减少y倍伤害减免类效果 */
export interface CrossSlotDebuff {
	type: "cross_slot_debuff";
	/** 【逆转阴阳】 — 状态名 */
	state: string;
	/** y倍 — 减少伤害减免倍数 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect =
	| BaseAttack
	| SelfHeal
	| HealEchoDamage
	| StateRef
	| PeriodicHeal;
export type PrimaryAffixEffect = Shield;
export type ExclusiveAffixEffect = DebuffStackChance | CrossSlotDebuff;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
