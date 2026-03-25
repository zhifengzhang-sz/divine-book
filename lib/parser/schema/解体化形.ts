export type {
	AttackBonus,
	BaseAttack,
	PerDebuffStackDamage,
	ProbabilityMultiplier,
	Effect,
} from "./effects.js";

import type { BaseAttack, PerDebuffStackDamage, AttackBonus, ProbabilityMultiplier } from "./effects.js";

export type SkillEffect = BaseAttack | PerDebuffStackDamage;
export type PrimaryAffixEffect = AttackBonus;
export type ExclusiveAffixEffect = ProbabilityMultiplier;
