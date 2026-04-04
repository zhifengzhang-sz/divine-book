export type {
	AttackBuff,
	BaseAttack,
	PerDebuffStackDamage,
	ProbabilityMultiplier,
	Effect,
} from "./effects.js";

import type { BaseAttack, PerDebuffStackDamage, AttackBuff, ProbabilityMultiplier } from "./effects.js";

export type SkillEffect = BaseAttack | PerDebuffStackDamage;
export type PrimaryAffixEffect = AttackBuff;
export type ExclusiveAffixEffect = ProbabilityMultiplier;
