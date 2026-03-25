export type {
	PerSelfLostHp,
	SelfHpCost,
	SelfLostHpDamage,
	StateAdd,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { SelfLostHpDamage, BaseAttack, StateAdd, SelfHpCost, PerSelfLostHp } from "./effects.js";

export type SelfLostHpDamageAffix = SelfLostHpDamage;

export type SkillEffect = BaseAttack | StateAdd | SelfHpCost | SelfLostHpDamage;
export type PrimaryAffixEffect = SelfLostHpDamage;
export type ExclusiveAffixEffect = PerSelfLostHp;
