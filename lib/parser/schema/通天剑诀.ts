export type {
	ConditionalDamage,
	CritDmgBonus,
	DamageIncrease,
	IgnoreDamageReduction,
	SelfDamageTakenIncrease,
	BaseAttack,
	Effect,
} from "./effects.js";

import type {
	BaseAttack,
	ConditionalDamage,
	CritDmgBonus,
	DamageIncrease,
	IgnoreDamageReduction,
	SelfDamageTakenIncrease,
} from "./effects.js";

export type SkillEffect = BaseAttack | CritDmgBonus | SelfDamageTakenIncrease;
export type PrimaryAffixEffect = ConditionalDamage;
export type ExclusiveAffixEffect = IgnoreDamageReduction | DamageIncrease;
