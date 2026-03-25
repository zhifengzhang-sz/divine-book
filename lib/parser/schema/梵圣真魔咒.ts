export type {
	BaseAttack,
	Dot,
	DotFrequencyIncrease,
	StateAdd,
	Effect,
} from "./effects.js";

import type { Dot, BaseAttack, DotFrequencyIncrease, StateAdd } from "./effects.js";

export type DotCurrentHp = Dot;
export type DotLostHp = Dot;

export type SkillEffect = BaseAttack | StateAdd | Dot;
export type PrimaryAffixEffect = Dot;
export type ExclusiveAffixEffect = DotFrequencyIncrease;
