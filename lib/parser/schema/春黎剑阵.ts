export type {
	Dot,
	OnDispel,
	Summon,
	SummonBuff,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { BaseAttack, Summon, SummonBuff, Dot, OnDispel } from "./effects.js";

export type SkillEffect = BaseAttack | Summon;
export type PrimaryAffixEffect = SummonBuff;
export type ExclusiveAffixEffect = Dot | OnDispel;
