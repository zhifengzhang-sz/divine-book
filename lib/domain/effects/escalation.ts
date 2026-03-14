/** §5 Per-Hit Escalation — 2 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	PerHitEscalationSchema,
	PeriodicEscalationSchema,
} from "../../schemas/effect.js";

export const ESCALATION_DEFS: EffectTypeDef[] = [
	{
		type: "per_hit_escalation",
		schema: PerHitEscalationSchema,
		group: "per_hit_escalation",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: [
			"本神通施放/命中时，每造成1段伤害，剩余段数[stat]提升{x}%，最多提升{m}%",
			"本神通每段攻击造成伤害后，下一段提升{x}%[stat]",
		],
		fields: [
			{ name: "value", unit: Unit.PctStat },
			{ name: "stat", unit: Unit.Str },
			{ name: "max", unit: Unit.PctStat, optional: true },
		],
		exec: {
			trigger: Trigger.PerHit,
			target: ExecTarget.Self,
			writes: ["self.damage"],
		},
	},
	{
		type: "periodic_escalation",
		schema: PeriodicEscalationSchema,
		group: "per_hit_escalation",
		zones: [Zone.M_dmg],
		scope: Scope.Same,
		patterns: [
			"每造成{n}次伤害时，(接下来的/剩余)伤害提升{m}倍，(单次伤害)至多被该效果重复加成{s}次",
		],
		fields: [
			{ name: "every_n_hits", unit: Unit.Count },
			{ name: "multiplier", unit: Unit.Multiplier },
			{ name: "max_stacks", unit: Unit.Count },
		],
		exec: {
			trigger: Trigger.PerHit,
			target: ExecTarget.Self,
			writes: ["self.damage"],
		},
	},
];
