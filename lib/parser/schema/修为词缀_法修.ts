/**
 * Schema for 修为词缀_法修 (spell school affixes) — 4 affix types.
 *
 * Variable fields use `V = string | number`: string before tier resolution, number after.
 */

import type { RandomBuff } from "./通用词缀.js";

type V = string | number;

// ── 长生天则 ────────────────────────────────────────────

/** 使本神通的所有治疗效果提升x% */
export interface HealingIncrease {
	type: "healing_increase";
	/** x% — 治疗效果提升百分比 */
	value: V;
}

// ── 明王之路 ────────────────────────────────────────────

/** 使本次神通的最终伤害加深提升x% */
export interface FinalDmgBonus {
	type: "final_dmg_bonus";
	/** x% — 最终伤害加深百分比 */
	value: V;
}

// ── 天命有归 ────────────────────────────────────────────

/** 使本神通的概率触发效果提升为必定触发 */
export interface ProbabilityToCertain {
	type: "probability_to_certain";
}

/** 使本神通造成的伤害提升x% */
export interface DamageIncrease {
	type: "damage_increase";
	/** x% — 伤害提升百分比 */
	value: V;
}

// ── 景星天佑 — same as 通用词缀 福荫 ───────────────────
// Re-exported: RandomBuff { type: "random_buff", attack }

// ── Aggregate ────────────────────────────────────────────

export type Effect =
	| HealingIncrease
	| FinalDmgBonus
	| ProbabilityToCertain
	| DamageIncrease
	| RandomBuff;

export type { RandomBuff };
