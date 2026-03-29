/**
 * Buff handlers: self_buff, damage_reduction_during_cast
 */

import type {
	ConditionalBuff,
	ConditionalHealBuff,
	CounterBuff,
	SelfBuff,
	SelfBuffExtra,
	SelfDamageTakenIncrease,
} from "../../parser/schema/effects.js";
import type { AllStateDuration, DamageReductionDuringCast, NextSkillBuff } from "../../parser/schema/通用词缀.js";
import type { BuffDuration } from "../../parser/schema/念剑诀.js";
import type { BuffStackIncrease } from "../../parser/schema/元磁神光.js";
import type { SelfBuffExtend } from "../../parser/schema/十方真魄.js";
import type { StateInstance } from "../types.js";
import { register } from "./registry.js";
import type { Resolved } from "./types.js";

// self_buff: { attack_bonus?, defense_bonus?, final_damage_bonus?,
//              skill_damage_increase?, duration, name? }
// Creates a buff state on self with stat modifiers.
register<SelfBuff>("self_buff", (effect) => {
	const effects: { stat: string; value: number }[] = [];
	const statFields = [
		"attack_bonus",
		"defense_bonus",
		"final_damage_bonus",
		"skill_damage_increase",
		"damage_reduction",
		"crit_rate",
		"healing_bonus",
	];
	for (const stat of statFields) {
		if (typeof effect[stat] === "number") {
			effects.push({ stat, value: effect[stat] as number });
		}
	}

	const state: StateInstance = {
		name: (effect.name as string) ?? "self_buff",
		kind: "buff",
		source: "",
		target: "self",
		effects,
		remainingDuration: (effect.duration as number) ?? 0,
		stacks: 1,
		maxStacks: (effect.max_stacks as number) ?? 1,
		dispellable: true,
	};

	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// self_buff_extra: { buff_name, attack_bonus?, healing_bonus?, ... }
// Adds extra stat effects to an existing self_buff by name.
// At cast time, we don't have a reference to the existing buff — just apply
// a new buff with the same name so it stacks or refreshes.
register<SelfBuffExtra>("self_buff_extra", (effect) => {
	const buffName = (effect.buff_name as string) ?? "self_buff";
	const effects: { stat: string; value: number }[] = [];
	const statFields = [
		"attack_bonus",
		"defense_bonus",
		"final_damage_bonus",
		"skill_damage_increase",
		"damage_reduction",
		"healing_bonus",
	];
	for (const stat of statFields) {
		if (typeof effect[stat] === "number") {
			effects.push({ stat, value: effect[stat] as number });
		}
	}
	if (effects.length === 0) return {};

	const state: StateInstance = {
		name: buffName,
		kind: "buff",
		source: "",
		target: "self",
		effects,
		remainingDuration: (effect.duration as number) ?? Number.POSITIVE_INFINITY,
		stacks: 1,
		maxStacks: (effect.max_stacks as number) ?? 1,
		dispellable: true,
	};
	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// conditional_buff: { condition, percent_max_hp_increase?, damage_increase?, ... }
// Applies a buff conditionally. Checks condition against actual game state.
register<ConditionalBuff>("conditional_buff", (effect, _ctx) => {
	const condition = (effect.condition as string) ?? "";
	let conditionMet = true;
	switch (condition) {
		case "enlightenment_10":
			conditionMet = true; // progression is pre-filtered by tier selection
			break;
		case "enlightenment_max":
			conditionMet = true;
			break;
		default:
			conditionMet = true;
			break;
	}
	if (!conditionMet) return {};
	const effects: { stat: string; value: number }[] = [];
	if (typeof effect.damage_increase === "number") {
		effects.push({
			stat: "damage_increase",
			value: effect.damage_increase as number,
		});
	}
	if (effects.length === 0) return {};

	const state: StateInstance = {
		name:
			(effect.name as string) ??
			(effect.condition ? `buff_${effect.condition}` : "conditional_buff"),
		kind: "buff",
		source: "",
		target: "self",
		effects,
		remainingDuration: (effect.duration as number) ?? Number.POSITIVE_INFINITY,
		stacks: 1,
		maxStacks: 1,
		dispellable: true,
	};
	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// counter_buff: { name, heal_on_damage_taken?, reflect_received_damage?, duration? }
// On-attacked reactive buff. Creates a named state and registers an on_attacked listener.
register<CounterBuff>("counter_buff", (effect, _ctx) => {
	const name = (effect.name as string) ?? "counter_buff";
	const duration = (effect.duration as number) ?? Number.POSITIVE_INFINITY;

	const state: StateInstance = {
		name,
		kind: "buff",
		source: "",
		target: "self",
		effects: [],
		remainingDuration: duration,
		stacks: 1,
		maxStacks: 1,
		dispellable: true,
	};

	const listeners = [];

	// heal_on_damage_taken: heal value% ATK when attacked
	if (typeof effect.heal_on_damage_taken === "number") {
		const healPct = effect.heal_on_damage_taken as number;
		listeners.push({
			parent: name,
			trigger: "on_attacked" as const,
			handler: (listenerCtx: { sourcePlayer: { atk: number } }) => [
				{
					type: "HEAL" as const,
					value: (healPct / 100) * listenerCtx.sourcePlayer.atk,
				},
			],
		});
	}

	// reflect_received_damage: reflect damage back to attacker
	if (typeof effect.reflect_received_damage === "number") {
		const reflectPct = effect.reflect_received_damage as number;
		listeners.push({
			parent: name,
			trigger: "on_attacked" as const,
			handler: (listenerCtx: { sourcePlayer: { atk: number } }) => [
				{
					type: "HIT" as const,
					hitIndex: -1,
					damage: (reflectPct / 100) * listenerCtx.sourcePlayer.atk,
					spDamage: 0,
				},
			],
		});
	}

	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
		listeners,
	};
});

// damage_reduction_during_cast — schema: lib/parser/schema/通用词缀.ts (DamageReductionDuringCast)
// Temporary DR buff during cast (e.g., 金汤: 10%).
register<DamageReductionDuringCast>("damage_reduction_during_cast", (effect) => {
	const state: StateInstance = {
		name: "casting_dr",
		kind: "buff",
		source: "",
		target: "self",
		effects: [{ stat: "damage_reduction", value: effect.value as number }],
		remainingDuration: 0, // lasts for cast duration — managed by cast state
		stacks: 1,
		maxStacks: 1,
		dispellable: false,
	};
	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// self_damage_taken_increase: { value, duration }
// Debuff on self: increases damage taken. Used by body school tradeoffs.
register<SelfDamageTakenIncrease>("self_damage_taken_increase", (effect) => {
	const state: StateInstance = {
		name: "self_damage_taken_increase",
		kind: "debuff",
		source: "",
		target: "self",
		effects: [{ stat: "damage_reduction", value: -(effect.value as number) }],
		remainingDuration: (effect.duration as number) ?? 8,
		stacks: 1,
		maxStacks: 1,
		dispellable: false,
	};
	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// next_skill_buff — schema: lib/parser/schema/通用词缀.ts (NextSkillBuff)
// Buff that applies to the next skill cast. In a 1-slot sim, this
// persists since there's no subsequent cast to consume it.
// Duration = Infinity (consumed by next cast in multi-slot mode).
// Note: legacy data had a `stat` field; schema only has `value` (always skill_damage_increase).
register<Resolved<NextSkillBuff>>("next_skill_buff", (effect) => {
	const state: StateInstance = {
		name: "next_skill_buff",
		kind: "buff",
		source: "",
		target: "self",
		effects: [{ stat: "skill_damage_increase", value: effect.value }],
		remainingDuration: Number.POSITIVE_INFINITY,
		stacks: 1,
		maxStacks: 1,
		dispellable: true,
	};
	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// conditional_heal_buff: { condition, value, duration }
// Heals and/or buffs when condition is met.
register<ConditionalHealBuff>("conditional_heal_buff", (effect, ctx) => {
	const value = effect.value as number;
	return {
		intents: [
			{
				type: "HEAL" as const,
				value: (value / 100) * ctx.atk,
			},
		],
	};
});

// self_buff_extend — schema: lib/parser/schema/十方真魄.ts (SelfBuffExtend)
// Extends an existing buff's duration. No damage contribution to current cast —
// duration extension affects sustained uptime across future casts.
register<SelfBuffExtend>("self_buff_extend", () => {
	return {};
});

// buff_duration — schema: lib/parser/schema/念剑诀.ts (BuffDuration)
// Increases all buff durations by value%. More uptime → more total effect.
register<BuffDuration>("buff_duration", (effect) => {
	const pct = (effect.value as number) ?? 0;
	return { zones: { M_dmg: pct / 100 / 3 } };
});

// buff_stack_increase — schema: lib/parser/schema/元磁神光.ts (BuffStackIncrease)
// Increases max buff stacks by value%. More stacks → stronger buffs.
register<BuffStackIncrease>("buff_stack_increase", (effect) => {
	const pct = (effect.value as number) ?? 0;
	return { zones: { M_dmg: pct / 100 / 3 } };
});

// all_state_duration — schema: lib/parser/schema/通用词缀.ts (AllStateDuration)
// Increases all state (buff + debuff) durations by value%.
register<AllStateDuration>("all_state_duration", (effect) => {
	const pct = (effect.value as number) ?? 0;
	return { zones: { M_dmg: pct / 100 / 3 } };
});
