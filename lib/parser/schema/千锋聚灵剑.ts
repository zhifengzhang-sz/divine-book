export type {
	BaseAttack,
	PercentMaxHpDamage,
	PerHitEscalationBook,
	HealReduction,
	Effect,
} from "./effects.js";

import type {
	PerHitEscalationBook,
	BaseAttack,
	PercentMaxHpDamage,
	HealReduction,
} from "./effects.js";

export type PerHitEscalation = PerHitEscalationBook;

export type SkillEffect = BaseAttack | PercentMaxHpDamage;
export type PrimaryAffixEffect = PerHitEscalationBook;
export type ExclusiveAffixEffect = HealReduction;
