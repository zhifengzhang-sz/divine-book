/**
 * Schema for 修为词缀_魔修 (demon school affixes) — 4 affix types.
 *
 * Variable fields use `V = string | number`: string before tier resolution, number after.
 */

type V = string | number;

// ── 瑶光却邪 ────────────────────────────────────────────

/** 当本神通造成治疗效果时，会对敌方额外造成治疗量x%的伤害 */
export interface HealingToDamage {
	type: "healing_to_damage";
	/** x% — 治疗量转化为伤害的百分比 */
	value: V;
}

// ── 溃魂击瑕 ────────────────────────────────────────────

/** 若敌方气血值低于30%，则使本次伤害提升x%，且必定暴击 */
export interface ExecuteConditionalCrit {
	type: "execute_conditional";
	/** 30% — 气血值阈值 */
	hp_threshold: V;
	/** x% — 伤害提升 */
	damage_increase: V;
	/** 必定暴击 — 1 = guaranteed crit */
	guaranteed_crit: 1;
}

// ── 玄女护心 ────────────────────────────────────────────

/** 造成伤害后，自身获得本次伤害值x%的护盾，持续8秒 */
export interface DamageToShield {
	type: "damage_to_shield";
	/** x% — 伤害值转护盾百分比 */
	value: V;
	/** 8秒 — 护盾持续时间 */
	duration: V;
}

// ── 祸星无妄 ────────────────────────────────────────────

/** 对敌方添加以下任意1个减益效果：攻击降低x%、暴击率降低x%、暴击伤害降低y% */
export interface RandomDebuff {
	type: "random_debuff";
	/** x% — 攻击降低百分比 */
	attack: V;
	/** x% — 暴击率降低百分比 */
	crit_rate: V;
	/** y% — 暴击伤害降低百分比 */
	crit_damage: V;
}

// ── Aggregate ────────────────────────────────────────────

export type Effect =
	| HealingToDamage
	| ExecuteConditionalCrit
	| DamageToShield
	| RandomDebuff;
