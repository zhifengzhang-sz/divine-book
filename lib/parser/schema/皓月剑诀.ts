export type {
	DamageBuff,
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
	DamageBuff,
	DotExtraPerTick,
	NoShieldDoubleDamage,
	PercentMaxHpBoost,
	ShieldDestroyDamage,
	ShieldDestroyDot,
	StateRef,
} from "./effects.js";

export type SkillEffect = BaseAttack | StateRef | ShieldDestroyDamage | NoShieldDoubleDamage;
export type PrimaryAffixEffect = ShieldDestroyDot;
export type ExclusiveAffixEffect = DotExtraPerTick | PercentMaxHpBoost | DamageBuff;
