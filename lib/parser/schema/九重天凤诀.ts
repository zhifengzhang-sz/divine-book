export type {
	OnShieldExpire,
	PeriodicDispel,
	SelfBuff,
	SelfHpCost,
	SelfHpFloor,
	SelfLostHpDamage,
	StateAdd,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { SelfHpCost, StateAdd } from "./effects.js";

export type SelfHpCostPerHit = SelfHpCost;
export type StateAddPerHit = StateAdd;
