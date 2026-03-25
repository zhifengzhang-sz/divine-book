export type {
	Debuff,
	PercentCurrentHpDamage,
	SkillDamageIncreaseAffix,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { Debuff } from "./effects.js";

export type EnemySkillDamageReduction = Debuff;

import type { BaseAttack, PercentCurrentHpDamage, SkillDamageIncreaseAffix } from "./effects.js";

export type SkillEffect = BaseAttack | PercentCurrentHpDamage;
export type ExclusiveAffixEffect = SkillDamageIncreaseAffix | Debuff;
