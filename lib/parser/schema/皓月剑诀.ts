export type {
	DamageIncrease,
	DotExtraPerTick,
	NoShieldDoubleDamage,
	PercentMaxHpDamage,
	ShieldDestroyDamage,
	ShieldDestroyDot,
	StateRef,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { PercentMaxHpDamage } from "./effects.js";

export type PercentMaxHpDamageIncrease = PercentMaxHpDamage;

import type {
	BaseAttack,
	DamageIncrease,
	DotExtraPerTick,
	NoShieldDoubleDamage,
	ShieldDestroyDamage,
	ShieldDestroyDot,
	StateRef,
} from "./effects.js";

export type SkillEffect = BaseAttack | StateRef | ShieldDestroyDamage | NoShieldDoubleDamage;
export type PrimaryAffixEffect = ShieldDestroyDot;
export type ExclusiveAffixEffect = DotExtraPerTick | PercentMaxHpDamage | DamageIncrease;
