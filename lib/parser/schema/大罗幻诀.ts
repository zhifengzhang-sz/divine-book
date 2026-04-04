export type {
	BaseAttack,
	CounterDebuff,
	CounterDebuffUpgrade,
	CrossSlotDebuff,
	Dot,
	DotDamageBuff,
	StateAdd,
	Effect,
} from "./effects.js";

import type { Dot, BaseAttack, CounterDebuff, CounterDebuffUpgrade, CrossSlotDebuff, DotDamageBuff, StateAdd } from "./effects.js";

export type DotCurrentHp = Dot;
export type DotLostHp = Dot;

export type SkillEffect = BaseAttack | StateAdd | CounterDebuff | Dot;
export type PrimaryAffixEffect = CounterDebuffUpgrade | CrossSlotDebuff;
export type ExclusiveAffixEffect = DotDamageBuff;
