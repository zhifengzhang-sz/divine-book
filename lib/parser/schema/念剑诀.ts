export type {
	BuffDuration,
	ExtendedDot,
	PeriodicEscalation,
	Untargetable,
	BaseAttack,
	Effect,
} from "./effects.js";

import type { BaseAttack, Untargetable, PeriodicEscalation, ExtendedDot, BuffDuration } from "./effects.js";

export type SkillEffect = BaseAttack | Untargetable | PeriodicEscalation;
export type PrimaryAffixEffect = ExtendedDot;
export type ExclusiveAffixEffect = BuffDuration;
