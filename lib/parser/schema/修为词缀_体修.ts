/**
 * Schema for 修为词缀_体修 (body school affixes) — 5 affix types.
 *
 * Variable fields use `V = string | number`: string before tier resolution, number after.
 */

import type {
	DamageReductionDuringCast,
	FlatExtraDamage,
	PerEnemyLostHp,
	ShieldValueIncrease,
} from "./通用词缀.js";

type V = string | number;

// ── 金刚护体 — same as 通用词缀 金汤 ───────────────────
// Re-exported: DamageReductionDuringCast { type: "damage_reduction_during_cast", value }

// ── 破灭天光 — same as 通用词缀 斩岳 ───────────────────
// Re-exported: FlatExtraDamage { type: "flat_extra_damage", value }

// ── 青云灵盾 — same as 通用词缀 灵盾 ───────────────────
// Re-exported: ShieldValueIncrease { type: "shield_value_increase", value }

// ── 贪狼吞星 — same as 通用词缀 吞海 ───────────────────
// Re-exported: PerEnemyLostHp { type: "per_enemy_lost_hp", per_percent, value }

// ── 意坠深渊 ────────────────────────────────────────────

/** 使本神通根据自身已损气血值计算伤害时至少按已损x%计算，并使本神通造成的伤害提升y% */
export interface MinLostHpThreshold {
	type: "min_lost_hp_threshold";
	/** x% — 最低已损气血百分比 */
	min_percent: V;
	/** y% — 伤害提升百分比 */
	damage_increase: V;
}

// ── Aggregate ────────────────────────────────────────────

export type Effect =
	| DamageReductionDuringCast
	| FlatExtraDamage
	| ShieldValueIncrease
	| PerEnemyLostHp
	| MinLostHpThreshold;

export type {
	DamageReductionDuringCast,
	FlatExtraDamage,
	PerEnemyLostHp,
	ShieldValueIncrease,
};
