/** §12 Debuffs — 5 types */

import { ExecTarget, Scope, Trigger, Unit, Zone } from "../enums.js";
import type { EffectTypeDef } from "../types.js";
import {
	ConditionalDebuffSchema,
	CounterDebuffSchema,
	CounterDebuffUpgradeSchema,
	CrossSlotDebuffSchema,
	DebuffSchema,
} from "../../schemas/effect.js";

export const DEBUFF_DEFS: EffectTypeDef[] = [
	{
		type: "debuff",
		schema: DebuffSchema,
		group: "debuffs",
		zones: [Zone.H_red],
		scope: Scope.Cross,
		patterns: [
			"对敌方添加持续{d}秒的[name]：[stat]降低{x}%",
		],
		fields: [
			{ name: "target", unit: Unit.Str },
			{ name: "value", unit: Unit.PctStat },
			{ name: "duration", unit: Unit.Seconds },
			{ name: "dispellable", unit: Unit.Bool, optional: true },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			writes: ["opponent.healing", "opponent.def", "opponent.atk", "opponent.state"],
		},
	},
	{
		type: "conditional_debuff",
		schema: ConditionalDebuffSchema,
		group: "debuffs",
		zones: [Zone.H_red],
		scope: Scope.Cross,
		patterns: [
			"若敌方[condition]...[stat](降低/减少/增至){x}%",
			"在神通悟境的条件下：...对目标施加[name]：[stat]减少{x}(倍/%)...",
		],
		fields: [
			{ name: "condition", unit: Unit.Str },
			{ name: "target", unit: Unit.Str },
			{ name: "value", unit: Unit.PctStat },
			{ name: "duration", unit: Unit.Seconds, optional: true },
			{ name: "per_hit", unit: Unit.Bool, optional: true },
		],
		exec: {
			trigger: Trigger.OnCast,
			target: ExecTarget.Opponent,
			reads: ["opponent.state", "opponent.hp"],
			writes: ["opponent.def", "opponent.state"],
		},
	},
	{
		type: "cross_slot_debuff",
		schema: CrossSlotDebuffSchema,
		group: "debuffs",
		zones: [Zone.H_red],
		scope: Scope.Cross,
		patterns: [
			"([state]状态下)受到攻击时，(额外)给目标附加[name]：[stat]减低{x}%，持续{d}秒",
		],
		fields: [
			{ name: "target", unit: Unit.Str },
			{ name: "value", unit: Unit.PctStat },
			{ name: "duration", unit: Unit.Seconds },
			{ name: "trigger", unit: Unit.Str },
		],
		exec: {
			trigger: Trigger.OnAttacked,
			target: ExecTarget.Opponent,
			writes: ["opponent.def", "opponent.state"],
		},
	},
	{
		type: "counter_debuff",
		schema: CounterDebuffSchema,
		group: "debuffs",
		zones: [Zone.H_red, Zone.D_ortho],
		scope: Scope.Cross,
		patterns: [
			"受到伤害时，各有{x}%概率对攻击方添加{n}层[name]...最多叠加{n}层...持续{d}秒",
		],
		fields: [
			{ name: "duration", unit: Unit.Seconds },
			{ name: "on_attacked_chance", unit: Unit.Probability },
			{ name: "max_stacks", unit: Unit.Count, optional: true },
		],
		exec: {
			trigger: Trigger.OnAttacked,
			target: ExecTarget.Opponent,
			writes: ["opponent.state"],
		},
	},
	{
		type: "counter_debuff_upgrade",
		schema: CounterDebuffUpgradeSchema,
		group: "debuffs",
		zones: [Zone.H_red],
		scope: Scope.Cross,
		patterns: ["[原效果](状态下附加异常)概率提升至{x}%"],
		fields: [{ name: "on_attacked_chance", unit: Unit.Probability }],
		exec: {
			trigger: Trigger.Permanent,
			target: ExecTarget.Self,
			writes: ["self.state"],
		},
	},
];
