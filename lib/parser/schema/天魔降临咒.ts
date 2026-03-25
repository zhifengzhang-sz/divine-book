export type {
	BaseAttack,
	ConditionalDamageDebuff,
	Debuff,
	DotPermanentMaxHp,
	PerDebuffDamageUpgrade,
	PerDebuffStackDamage,
	SelfBuff,
	StateAdd,
	Effect,
} from "./effects.js";

import type {
	BaseAttack,
	ConditionalDamageDebuff,
	Debuff,
	DotPermanentMaxHp,
	PerDebuffDamageUpgrade,
	PerDebuffStackDamage,
	SelfBuff,
	StateAdd,
} from "./effects.js";

export type SkillEffect = BaseAttack | StateAdd | SelfBuff | Debuff | PerDebuffStackDamage;
export type PrimaryAffixEffect = DotPermanentMaxHp | PerDebuffDamageUpgrade;
export type ExclusiveAffixEffect = ConditionalDamageDebuff;
