/**
 * Debuff handlers: debuff, heal_reduction, counter_debuff, conditional_debuff,
 * attack_reduction, lethal_rate_reduction, crit_damage_reduction,
 * crit_rate_reduction, enemy_skill_damage_reduction, cross_slot_debuff,
 * counter_debuff_upgrade, debuff_stack_chance, debuff_stack_increase
 */

import type { CounterDebuffUpgrade } from "../../parser/schema/大罗幻诀.js";
import type { DebuffStackChance } from "../../parser/schema/周天星元.js";
import type { DebuffStackIncrease } from "../../parser/schema/天轮魔经.js";
import type { HealReduction } from "../../parser/schema/千锋聚灵剑.js";
import type { StateInstance } from "../types.js";
import { register } from "./registry.js";

// debuff: { target (stat), value, duration, dispellable?, name?, max_stacks? }
// Creates a debuff state on the opponent.
register("debuff", (effect) => {
	const state: StateInstance = {
		name: (effect.name as string) ?? "debuff",
		kind: "debuff",
		source: "",
		target: "opponent",
		effects: [
			{
				stat: effect.target as string,
				value: effect.value as number,
			},
		],
		remainingDuration: (effect.duration as number) ?? 0,
		stacks: 1,
		maxStacks: (effect.max_stacks as number) ?? 1,
		dispellable: (effect.dispellable as boolean) ?? true,
	};

	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// heal_reduction — schema: lib/parser/schema/千锋聚灵剑.ts (HealReduction)
// 对敌方添加【灵涸】：治疗量降低x%，无法被驱散
register<HealReduction>("heal_reduction", (effect) => {
	const state: StateInstance = {
		name: effect.state as string,
		kind: "debuff",
		source: "",
		target: "opponent",
		effects: [
			{
				stat: "healing_received",
				value: -(effect.value as number),
			},
		],
		remainingDuration: (effect.duration as number) ?? 0,
		stacks: 1,
		maxStacks: 1,
		dispellable: !effect.undispellable,
	};

	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// counter_debuff: { name, duration, on_attacked_chance, parent? }
// Applies a debuff to the opponent when this player is attacked.
register("counter_debuff", (effect) => {
	const name = (effect.name as string) ?? "counter_debuff";
	const duration = (effect.duration as number) ?? 8;
	const chance = (effect.on_attacked_chance as number) ?? 100;

	const debuffState: StateInstance = {
		name,
		kind: "debuff",
		source: "",
		target: "opponent",
		effects: [{ stat: "healing_received", value: -50 }],
		remainingDuration: duration,
		stacks: 1,
		maxStacks: 1,
		dispellable: true,
	};

	const parentName = (effect.parent as string) ?? name;

	return {
		listeners: [
			{
				parent: parentName,
				trigger: "on_attacked" as const,
				handler: (listenerCtx) => {
					if (chance < 100 && !listenerCtx.rng.chance(chance / 100)) {
						return [];
					}
					return [
						{
							type: "APPLY_STATE" as const,
							state: { ...debuffState },
						},
					];
				},
			},
		],
	};
});

// conditional_debuff: { name, multiplier?, target?, value?, duration?, condition? }
// Applies a debuff conditionally. Checks condition against game state.
register("conditional_debuff", (effect, _ctx) => {
	const condition = (effect.condition as string) ?? "";
	if (condition === "enlightenment") {
		// Progression-gated — already filtered by tier selection
	}
	const name = (effect.name as string) ?? "conditional_debuff";
	const duration = (effect.duration as number) ?? Number.POSITIVE_INFINITY;
	const effects: { stat: string; value: number }[] = [];

	if (typeof effect.target === "string" && typeof effect.value === "number") {
		effects.push({
			stat: effect.target as string,
			value: effect.value as number,
		});
	}
	if (typeof effect.multiplier === "number") {
		effects.push({
			stat: "healing_received",
			value: -((1 - (effect.multiplier as number)) * 100),
		});
	}

	if (effects.length === 0) return {};

	const state: StateInstance = {
		name,
		kind: "debuff",
		source: "",
		target: "opponent",
		effects,
		remainingDuration: duration,
		stacks: 1,
		maxStacks: 1,
		dispellable: true,
	};

	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// debuff_stack_chance — schema: lib/parser/schema/周天星元.ts (DebuffStackChance)
register<DebuffStackChance>("debuff_stack_chance", () => ({}));

// debuff_stack_increase — schema: lib/parser/schema/天轮魔经.ts (DebuffStackIncrease)
register<DebuffStackIncrease>("debuff_stack_increase", () => ({}));

// attack_reduction: { value, parent }
// Reduces opponent's ATK via on_attacked listener.
register("attack_reduction", (effect) => {
	const parent = (effect.parent as string) ?? "attack_reduction";
	return {
		listeners: [
			{
				parent,
				trigger: "on_attacked" as const,
				handler: () => [
					{
						type: "APPLY_STATE" as const,
						state: {
							name: "attack_reduction",
							kind: "debuff" as const,
							source: "",
							target: "opponent" as const,
							effects: [
								{
									stat: "attack_bonus",
									value: effect.value as number,
								},
							],
							remainingDuration: 8,
							stacks: 1,
							maxStacks: 1,
							dispellable: true,
						},
					},
				],
			},
		],
	};
});

// lethal_rate_reduction: { value, parent }
// Modeled as on_attacked DR debuff.
register("lethal_rate_reduction", (effect) => {
	const parent = (effect.parent as string) ?? "lethal_rate_reduction";
	return {
		listeners: [
			{
				parent,
				trigger: "on_attacked" as const,
				handler: () => [
					{
						type: "APPLY_STATE" as const,
						state: {
							name: "lethal_rate_reduction",
							kind: "debuff" as const,
							source: "",
							target: "opponent" as const,
							effects: [
								{
									stat: "damage_reduction",
									value: Math.abs(effect.value as number),
								},
							],
							remainingDuration: 8,
							stacks: 1,
							maxStacks: 1,
							dispellable: true,
						},
					},
				],
			},
		],
	};
});

// crit_damage_reduction: { value, parent }
register("crit_damage_reduction", (effect) => {
	const parent = (effect.parent as string) ?? "crit_damage_reduction";
	return {
		listeners: [
			{
				parent,
				trigger: "on_attacked" as const,
				handler: () => [
					{
						type: "APPLY_STATE" as const,
						state: {
							name: "crit_damage_reduction",
							kind: "debuff" as const,
							source: "",
							target: "opponent" as const,
							effects: [
								{
									stat: "damage_reduction",
									value: Math.abs(effect.value as number),
								},
							],
							remainingDuration: 8,
							stacks: 1,
							maxStacks: 1,
							dispellable: true,
						},
					},
				],
			},
		],
	};
});

// crit_rate_reduction: { value, parent }
// Reduces opponent's crit rate. Crit not fully modeled — apply as
// a small damage reduction to approximate the DPS impact.
register("crit_rate_reduction", (effect) => {
	const parent = (effect.parent as string) ?? "crit_rate_reduction";
	return {
		listeners: [
			{
				parent,
				trigger: "on_attacked" as const,
				handler: () => [
					{
						type: "APPLY_STATE" as const,
						state: {
							name: "crit_rate_reduction",
							kind: "debuff" as const,
							source: "",
							target: "opponent" as const,
							effects: [
								{
									stat: "damage_reduction",
									value: Math.abs((effect.value as number) ?? 0) / 5,
								},
							],
							remainingDuration: 8,
							stacks: 1,
							maxStacks: 1,
							dispellable: true,
						},
					},
				],
			},
		],
	};
});

// enemy_skill_damage_reduction: { value }
register("enemy_skill_damage_reduction", (effect) => {
	const state: StateInstance = {
		name: "enemy_skill_damage_reduction",
		kind: "debuff",
		source: "",
		target: "opponent",
		effects: [
			{
				stat: "skill_damage_increase",
				value: -(effect.value as number),
			},
		],
		remainingDuration: Number.POSITIVE_INFINITY,
		stacks: 1,
		maxStacks: 1,
		dispellable: false,
	};
	return {
		intents: [{ type: "APPLY_STATE" as const, state }],
	};
});

// counter_debuff_upgrade — schema: lib/parser/schema/大罗幻诀.ts (CounterDebuffUpgrade)
// Upgrades the proc chance of an existing counter_debuff.
// Modeled as an additional on_attacked listener with higher chance.
// Field mapping: legacy parent → schema state, legacy on_attacked_chance → schema value
register<CounterDebuffUpgrade>("counter_debuff_upgrade", (effect) => {
	const parent = effect.state as string;
	const chance = (effect.value as number) ?? 60;
	return {
		listeners: [
			{
				parent,
				trigger: "on_attacked" as const,
				handler: (listenerCtx) => {
					if (!listenerCtx.rng.chance(chance / 100)) return [];
					return [
						{
							type: "APPLY_STATE" as const,
							state: {
								name: `${parent}_upgrade`,
								kind: "debuff" as const,
								source: "",
								target: "opponent" as const,
								effects: [{ stat: "damage_reduction", value: -10 }],
								remainingDuration: 8,
								stacks: 1,
								maxStacks: 1,
								dispellable: true,
							},
						},
					];
				},
			},
		],
	};
});

// cross_slot_debuff: { target, value, duration, name, trigger, parent }
// Debuff applied via on_attacked listener on a parent state.
register("cross_slot_debuff", (effect) => {
	const parent = (effect.parent as string) ?? "cross_slot_debuff";
	const name = (effect.name as string) ?? "cross_slot_debuff";
	const duration = (effect.duration as number) ?? 8;
	const stat = (effect.target as string) ?? "damage_reduction";
	const value = effect.value as number;
	return {
		listeners: [
			{
				parent,
				trigger: "on_attacked" as const,
				handler: () => [
					{
						type: "APPLY_STATE" as const,
						state: {
							name,
							kind: "debuff" as const,
							source: "",
							target: "opponent" as const,
							effects: [{ stat, value }],
							remainingDuration: duration,
							stacks: 1,
							maxStacks: 1,
							dispellable: true,
						},
					},
				],
			},
		],
	};
});
