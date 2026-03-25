export type {
	BaseAttack,
	CounterBuff,
	Debuff,
	SelfBuff,
	SelfBuffExtra,
	StateAdd,
	Effect,
} from "./effects.js";

import type { Debuff, SelfBuff } from "./effects.js";

export type DebuffOnHit = Debuff;
export type SelfBuffHealing = SelfBuff;

import type { BaseAttack, CounterBuff, SelfBuffExtra, StateAdd } from "./effects.js";

export type SkillEffect = BaseAttack | StateAdd | CounterBuff;
export type PrimaryAffixEffect = SelfBuffExtra;
export type ExclusiveAffixEffect = SelfBuff | Debuff;
