/**
 * Schema for 天魔降临咒 — derived from raw data.
 *
 * Raw text (skill):
 *   对目标造成五段共x%攻击力的灵法伤害，并对其施加【结魂锁链】：
 *   使受到的伤害减少y%，敌方受到的伤害增加z%，
 *   锁定目标具有的每层（个）减益效果会使敌方受到的伤害额外提升w%，最多提升至u%
 *   【结魂锁链】战斗状态内永久生效，最多叠加1层
 *
 * Raw text (primary affix 魔念生息):
 *   敌方处于【结魂锁链】下，每秒受到x%最大气血值的伤害，
 *   并且【结魂锁链】提升敌方受到的伤害上限提升至y%
 *
 * Raw text (exclusive affix 引灵摘魂):
 *   使本神通攻击带有减益状态的敌方时，会使本次伤害提升x%
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

/** 施加【结魂锁链】状态 */
export interface StateAdd {
	type: "state_add";
	/** 【结魂锁链】 — 状态名 */
	state: string;
}

/** 使受到的伤害减少y% (自身增益部分) */
export interface SelfBuff {
	type: "self_buff";
	/** 【结魂锁链】 — 状态名 */
	name: string;
	/** y% — 受到的伤害减少 */
	damage_reduction: V;
}

/** 敌方受到的伤害增加z% */
export interface Debuff {
	type: "debuff";
	/** 【结魂锁链】 — 状态名 */
	name: string;
	/** damage_taken — 目标受到的伤害 */
	target: string;
	/** z% — 伤害增加百分比 */
	value: V;
}

/** 每层（个）减益效果使敌方受到的伤害额外提升w%，最多提升至u% */
export interface PerDebuffStackDamage {
	type: "per_debuff_stack_damage";
	/** 每1个减益状态 */
	per_n_stacks: number;
	/** w% — 每层提升百分比 */
	value: V;
	/** u% — 最多提升至 */
	max: V;
	/** 【结魂锁链】 — 所属状态 */
	parent: string;
}

// ── primaryAffix (魔念生息) ──────────────────────────────

/** 处于【结魂锁链】下，每秒受到x%最大气血值的伤害 */
export interface DotPermanentMaxHp {
	type: "dot_permanent_max_hp";
	/** 【结魂锁链】 — 触发状态 */
	state: string;
	/** x% — 每秒最大气血值伤害 */
	value: V;
}

/** 【结魂锁链】提升敌方受到的伤害上限提升至y% */
export interface PerDebuffDamageUpgrade {
	type: "per_debuff_damage_upgrade";
	/** 【结魂锁链】 — 关联状态 */
	state: string;
	/** y% — 伤害上限提升至 */
	value: V;
}

// ── exclusiveAffix (引灵摘魂) ────────────────────────────

/** 攻击带有减益状态的敌方时，伤害提升x% */
export interface ConditionalDamageDebuff {
	type: "conditional_damage_debuff";
	/** x% — 伤害提升百分比 */
	value: V;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect =
	| BaseAttack
	| StateAdd
	| SelfBuff
	| Debuff
	| PerDebuffStackDamage;
export type PrimaryAffixEffect = DotPermanentMaxHp | PerDebuffDamageUpgrade;
export type ExclusiveAffixEffect = ConditionalDamageDebuff;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
