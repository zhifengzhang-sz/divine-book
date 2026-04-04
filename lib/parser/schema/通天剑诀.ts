export type {
	ConditionalDamage,
	CritDamageBuff,
	DamageBuff,
	IgnoreDamageReduction,
	SelfDamageTakenIncrease,
	BaseAttack,
	Effect,
} from "./effects.js";

import type {
	BaseAttack,
	ConditionalDamage,
	CritDamageBuff,
	DamageBuff,
	IgnoreDamageReduction,
	SelfDamageTakenIncrease,
} from "./effects.js";

export type SkillEffect = BaseAttack | CritDamageBuff | SelfDamageTakenIncrease;
export type PrimaryAffixEffect = ConditionalDamage;
export type ExclusiveAffixEffect = IgnoreDamageReduction | DamageBuff;
