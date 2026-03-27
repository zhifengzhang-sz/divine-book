export type {
	Debuff,
	DamageIncrease,
	PercentCurrentHpDamage,
	SkillDamageIncreaseAffix,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { Debuff, DamageIncrease } from "./effects.js";

export type EnemySkillDamageReduction = Debuff;

import type { BaseAttack, PercentCurrentHpDamage, SkillDamageIncreaseAffix } from "./effects.js";

export type SkillEffect = BaseAttack | PercentCurrentHpDamage;
export type PrimaryAffixEffect = DamageIncrease;
export type ExclusiveAffixEffect = SkillDamageIncreaseAffix | Debuff;
