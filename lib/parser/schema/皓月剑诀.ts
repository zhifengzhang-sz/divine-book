export type {
	DamageIncrease,
	DotExtraPerTick,
	NoShieldDoubleDamage,
	PercentMaxHpBoost,
	PercentMaxHpDamage,
	ShieldDestroyDamage,
	ShieldDestroyDot,
	StateRef,
	BaseAttack,
	Effect,
} from "./effects.js";

import type {
	BaseAttack,
	DamageIncrease,
	DotExtraPerTick,
	NoShieldDoubleDamage,
	PercentMaxHpBoost,
	ShieldDestroyDamage,
	ShieldDestroyDot,
	StateRef,
} from "./effects.js";

export type SkillEffect = BaseAttack | StateRef | ShieldDestroyDamage | NoShieldDoubleDamage;
export type PrimaryAffixEffect = ShieldDestroyDot;
export type ExclusiveAffixEffect = DotExtraPerTick | PercentMaxHpBoost | DamageIncrease;
