/**
 * Schema for 通用词缀 (universal affixes) — 16 affix types.
 *
 * Each affix attaches to any skill book, modifying its behavior.
 * Variable fields use `V = string | number`: string before tier resolution, number after.
 */

type V = string | number;

// ── 咒书 ────────────────────────────────────────────────

/** 使本神通添加的减益效果强度提升x% */
export interface DebuffStrength {
	type: "debuff_strength";
	/** x% — 减益效果强度提升 */
	value: V;
}

// ── 清灵 ────────────────────────────────────────────────

/** 使本神通添加的增益效果强度提升x% */
export interface BuffStrength {
	type: "buff_strength";
	/** x% — 增益效果强度提升 */
	value: V;
}

// ── 业焰 ────────────────────────────────────────────────

/** 使本神通添加的所有状态效果持续时间延长x% */
export interface AllStateDuration {
	type: "all_state_duration";
	/** x% — 持续时间延长百分比 */
	value: V;
}

// ── 击瑕 ────────────────────────────────────────────────

/** 若敌方处于控制效果，则使本次伤害提升x% */
export interface ConditionalDamageControlled {
	type: "conditional_damage_controlled";
	/** x% — 伤害提升百分比 */
	value: V;
}

// ── 破竹 ────────────────────────────────────────────────

/** 每造成1段伤害，剩余段数伤害提升x%，最多提升y% */
export interface PerHitEscalationAffix {
	type: "per_hit_escalation";
	/** 1段 — hits per escalation step (always 1) */
	hits: V;
	/** x% — per-hit damage escalation */
	per_hit: V;
	/** y% — maximum escalation cap */
	max: V;
}

// ── 金汤 ────────────────────────────────────────────────

/** 施放期间提升自身x%的伤害减免 */
export interface DamageReductionDuringCast {
	type: "damage_reduction_during_cast";
	/** x% — 伤害减免百分比 */
	value: V;
}

// ── 怒目 ────────────────────────────────────────────────

/** 若敌方气血值低于30%，则伤害提升x%，且暴击率提升y% */
export interface ExecuteConditional {
	type: "execute_conditional";
	/** 30% — 气血值阈值 */
	hp_threshold: V;
	/** x% — 伤害提升 */
	damage_increase: V;
	/** y% — 暴击率提升 */
	crit_rate_increase: V;
}

// ── 鬼印 ────────────────────────────────────────────────

/** 持续伤害触发时，额外造成目标x%已损失气血值的伤害 */
export interface DotExtraPerTick {
	type: "dot_extra_per_tick";
	/** x% — 已损失气血百分比 */
	value: V;
}

// ── 福荫 ────────────────────────────────────────────────

/** 获得以下任意1个加成：攻击提升x%、致命伤害提升x%、造成的伤害提升x% */
export interface RandomBuff {
	type: "random_buff";
	/** x% — 三种加成的共同数值 */
	attack: V;
}

// ── 战意 ────────────────────────────────────────────────

/** 自身每多损失1%最大气血值，会使本次伤害提升x% */
export interface PerSelfLostHp {
	type: "per_self_lost_hp";
	/** x% — 每损失1%气血的伤害提升 */
	value: V;
}

// ── 斩岳 ────────────────────────────────────────────────

/** 使本次神通额外造成x%攻击力的伤害 */
export interface FlatExtraDamage {
	type: "flat_extra_damage";
	/** x% — 攻击力百分比 */
	value: V;
}

// ── 吞海 ────────────────────────────────────────────────

/** 敌方每多损失1%最大气血值，使本次伤害提升x% */
export interface PerEnemyLostHp {
	type: "per_enemy_lost_hp";
	/** 1% — 每N%计一次 */
	per_percent: V;
	/** x% — 每1%的伤害提升 */
	value: V;
}

// ── 灵盾 ────────────────────────────────────────────────

/** 使本神通添加的护盾值提升x% */
export interface ShieldValueIncrease {
	type: "shield_value_increase";
	/** x% — 护盾值提升百分比 */
	value: V;
}

// ── 灵威 ────────────────────────────────────────────────

/** 使下一个施放的神通释放时额外获得x%的神通伤害加深 */
export interface NextSkillBuff {
	type: "next_skill_buff";
	/** x% — 神通伤害加深百分比 */
	value: V;
}

// ── 摧山 ────────────────────────────────────────────────

/** 使本次神通提升x%攻击力的效果 */
export interface AttackBonus {
	type: "attack_bonus";
	/** x% — 攻击力提升百分比 */
	value: V;
}

// ── 通明 ────────────────────────────────────────────────

/** 必定会心造成x倍伤害，并有y%概率将之提升至z倍 */
export interface GuaranteedResonance {
	type: "guaranteed_resonance";
	/** x倍 — 基础会心倍率 */
	base_multiplier: V;
	/** y% — 提升概率 */
	chance: V;
	/** z倍 — 提升后会心倍率 */
	upgraded_multiplier: V;
}

// ── Aggregate ────────────────────────────────────────────

export type Effect =
	| DebuffStrength
	| BuffStrength
	| AllStateDuration
	| ConditionalDamageControlled
	| PerHitEscalationAffix
	| DamageReductionDuringCast
	| ExecuteConditional
	| DotExtraPerTick
	| RandomBuff
	| PerSelfLostHp
	| FlatExtraDamage
	| PerEnemyLostHp
	| ShieldValueIncrease
	| NextSkillBuff
	| AttackBonus
	| GuaranteedResonance;
