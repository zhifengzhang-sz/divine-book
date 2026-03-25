export type {
	BaseAttack,
	Debuff,
	DelayedBurst,
	DelayedBurstIncrease,
	StateRef,
	Effect,
} from "./effects.js";

import type { Debuff, BaseAttack, DelayedBurst, DelayedBurstIncrease, StateRef } from "./effects.js";

export type DebuffComplex = Debuff;

export type SkillEffect = BaseAttack | StateRef | DelayedBurst;
export type PrimaryAffixEffect = DelayedBurstIncrease;
export type ExclusiveAffixEffect = Debuff;
