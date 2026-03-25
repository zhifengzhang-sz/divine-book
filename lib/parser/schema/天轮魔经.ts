export type {
	BaseAttack,
	BuffSteal,
	DebuffStackIncrease,
	PerDebuffStackDamage,
	PerStolenBuffDebuff,
	PercentMaxHpDamage,
	Effect,
} from "./effects.js";

import type { BaseAttack, BuffSteal, PercentMaxHpDamage, PerStolenBuffDebuff, DebuffStackIncrease, PerDebuffStackDamage } from "./effects.js";

export type SkillEffect = BaseAttack | BuffSteal | PercentMaxHpDamage;
export type PrimaryAffixEffect = PerStolenBuffDebuff;
export type ExclusiveAffixEffect = DebuffStackIncrease | PerDebuffStackDamage;
