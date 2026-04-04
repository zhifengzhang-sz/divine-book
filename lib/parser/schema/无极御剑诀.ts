export type {
	DamageBuff,
	PercentCurrentHpDamage,
	SelfBuff,
	SkillDamageBuff,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { DamageBuff, SelfBuff, SkillDamageBuff } from "./effects.js";

import type { BaseAttack, PercentCurrentHpDamage } from "./effects.js";

export type SkillEffect = BaseAttack | PercentCurrentHpDamage;
export type PrimaryAffixEffect = DamageBuff;
export type ExclusiveAffixEffect = SkillDamageBuff | SelfBuff;
