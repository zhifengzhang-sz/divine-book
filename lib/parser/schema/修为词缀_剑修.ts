/**
 * Schema for 修为词缀_剑修 (sword school affixes) — 4 affix types.
 *
 * Variable fields use `V = string | number`: string before tier resolution, number after.
 */

import type {
	AttackBonus,
	GuaranteedResonance,
	PerHitEscalationAffix,
} from "./通用词缀.js";

type V = string | number;

// ── 摧云折月 — same as 通用词缀 摧山 ───────────────────
// Re-exported: AttackBonus { type: "attack_bonus", value }

// ── 灵犀九重 — same as 通用词缀 通明 ───────────────────
// Re-exported: GuaranteedResonance { type: "guaranteed_resonance", base_multiplier, chance, upgraded_multiplier }

// ── 破碎无双 ────────────────────────────────────────────

/** 使本次神通提升x%攻击力的效果、y%的伤害、z%的暴击伤害 */
export interface TripleBonus {
	type: "triple_bonus";
	/** x% — 攻击力提升 */
	attack_bonus: V;
	/** y% — 伤害提升 */
	damage_increase: V;
	/** z% — 暴击伤害提升 */
	crit_damage_increase: V;
}

// ── 心火淬锋 — same as 通用词缀 破竹 ───────────────────
// Re-exported: PerHitEscalationAffix { type: "per_hit_escalation", hits, per_hit, max }

// ── Aggregate ────────────────────────────────────────────

export type Effect =
	| AttackBonus
	| GuaranteedResonance
	| TripleBonus
	| PerHitEscalationAffix;

export type { AttackBonus, GuaranteedResonance, PerHitEscalationAffix };
