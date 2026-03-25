export type {
	BaseAttack,
	CounterDebuff,
	CounterDebuffUpgrade,
	CrossSlotDebuff,
	Dot,
	DotDamageIncrease,
	StateAdd,
	Effect,
} from "./effects.js";

import type { Dot, BaseAttack, CounterDebuff, CounterDebuffUpgrade, CrossSlotDebuff, DotDamageIncrease, StateAdd } from "./effects.js";

export type DotCurrentHp = Dot;
export type DotLostHp = Dot;

export type SkillEffect = BaseAttack | StateAdd | CounterDebuff | Dot;
export type PrimaryAffixEffect = CounterDebuffUpgrade | CrossSlotDebuff;
export type ExclusiveAffixEffect = DotDamageIncrease;
