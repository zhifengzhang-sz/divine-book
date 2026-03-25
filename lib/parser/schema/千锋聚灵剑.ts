/**
 * Schema for 千锋聚灵剑 — derived from raw data.
 *
 * Raw text (skill):
 *   造成六段共计x%攻击力的灵法伤害，并每段攻击造成目标y%最大气血值的伤害
 *   （对怪物伤害不超过自身z%攻击力）
 *
 * Raw text (primary affix 惊神剑光):
 *   本神通每段攻击造成伤害后，下一段提升x%神通加成
 *
 * Raw text (exclusive affix 天哀灵涸):
 *   本神通施放后，会对敌方添加持续8秒的【灵涸】：治疗量降低x%，且无法被驱散
 */

/**
 * Variable fields are `string` before tier resolution ("x"),
 * `number` after. Both phases use the same interfaces.
 */
type V = string | number;

// ── skillDescription ─────────────────────────────────────

/** 造成六段共计x%攻击力的灵法伤害 */
export interface BaseAttack {
	type: "base_attack";
	/** 六段 — number of hits */
	hits: number;
	/** x% — total damage as % of ATK across all hits */
	total: V;
}

/** 每段攻击造成目标y%最大气血值的伤害（对怪物不超过z%攻击力） */
export interface PercentMaxHpDamage {
	type: "percent_max_hp_damage";
	/** y% — damage as % of target's max HP per hit */
	value: V;
	/** z% — cap vs monsters as % of own ATK */
	cap_vs_monster: V;
}

// ── primaryAffix (惊神剑光) ──────────────────────────────

/** 每段攻击造成伤害后，下一段提升x%神通加成 */
export interface PerHitEscalation {
	type: "per_hit_escalation";
	/** x% — escalation per hit */
	value: V;
	/** which multiplier zone this escalates */
	stat: "skill_bonus";
	/** direct effect (not reactive) */
	parent: "this";
}

// ── exclusiveAffix (天哀灵涸) ────────────────────────────

/** 对敌方添加持续8秒的【灵涸】：治疗量降低x%，且无法被驱散 */
export interface HealReduction {
	type: "heal_reduction";
	/** x% — heal reduction amount */
	value: V;
	/** 【灵涸】 — state name applied to target */
	state: string;
	/** 8秒 — duration in seconds */
	duration: V;
	/** 无法被驱散 */
	undispellable: true;
}

// ── Aggregate ────────────────────────────────────────────

export type SkillEffect = BaseAttack | PercentMaxHpDamage;
export type PrimaryAffixEffect = PerHitEscalation;
export type ExclusiveAffixEffect = HealReduction;

/** All effects this book can produce */
export type Effect = SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect;
