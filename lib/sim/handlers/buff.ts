/**
 * Buff handlers: self_buff, damage_reduction_during_cast
 */

import type { StateInstance } from "../types.js";
import { register } from "./registry.js";

// self_buff: { attack_bonus?, defense_bonus?, final_damage_bonus?,
//              skill_damage_increase?, duration, name? }
// Creates a buff state on self with stat modifiers.
register("self_buff", (effect) => {
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
register("self_buff_extra", (effect) => {
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
// Applies a buff conditionally. Simplified: we assume the condition is met.
register("conditional_buff", (effect) => {
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
register("counter_buff", (effect, _ctx) => {
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

// damage_reduction_during_cast: { value }
// Temporary DR buff during cast (e.g., 金汤: 10%).
register("damage_reduction_during_cast", (effect) => {
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
register("self_damage_taken_increase", (effect) => {
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

// next_skill_buff: { value, stat }
// Buff for the next skill cast. Apply as a buff that persists.
register("next_skill_buff", (effect) => {
	const stat = (effect.stat as string) ?? "skill_damage_increase";
	const state: StateInstance = {
		name: "next_skill_buff",
		kind: "buff",
		source: "",
		target: "self",
		effects: [{ stat, value: effect.value as number }],
		remainingDuration: 30, // lasts until next cast (approximate)
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
register("conditional_heal_buff", (effect, ctx) => {
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

// self_buff_extend: { value, buff_name }
// Extends an existing buff's duration. No-op in simplified model.
register("self_buff_extend", () => ({}));

// buff_duration: { value }
// Increases buff durations. No-op in simplified model.
register("buff_duration", () => ({}));

// buff_stack_increase: { value }
// Increases max stacks of buffs. No-op in simplified model.
register("buff_stack_increase", () => ({}));

// all_state_duration: { value }
// Increases all state durations. No-op in simplified model.
register("all_state_duration", () => ({}));
