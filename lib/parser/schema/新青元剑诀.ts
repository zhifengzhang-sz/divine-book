export type {
	Debuff,
	NextSkillBuff,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { Debuff, BaseAttack, NextSkillBuff } from "./effects.js";

export type SkillCooldownDebuff = Debuff;
export type SkillDamageDebuff = Debuff;

export type SkillEffect = BaseAttack | Debuff;
export type PrimaryAffixEffect = Debuff;
export type ExclusiveAffixEffect = NextSkillBuff;
