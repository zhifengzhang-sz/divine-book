export type {
	DamageIncrease,
	PercentCurrentHpDamage,
	SelfBuff,
	SkillDamageIncreaseAffix,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { DamageIncrease, SelfBuff, SkillDamageIncreaseAffix } from "./effects.js";

import type { BaseAttack, PercentCurrentHpDamage } from "./effects.js";

export type SkillEffect = BaseAttack | PercentCurrentHpDamage;
export type PrimaryAffixEffect = DamageIncrease;
export type ExclusiveAffixEffect = SkillDamageIncreaseAffix | SelfBuff;
