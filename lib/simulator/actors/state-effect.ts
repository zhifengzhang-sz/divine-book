/**
 * State Effect actor — on or off.
 *
 * Unified machine for all duration-gated effects: self-buffs, debuffs,
 * DoTs, shields, reactive counters. The consumer reads whatever fields
 * are relevant — no classification needed.
 *
 * Passive by default (queryable). DoTs (damage_per_tick > 0) also send
 * HIT events on each TICK.
 */

import { assign, enqueueActions, setup } from "xstate";
import type {
	AbsorbEvent,
	DispelEvent,
	FactorVector,
	HitEvent,
	StackEvent,
	TickEvent,
} from "../types";

export interface StateEffectInput {
	id: string;
	duration: number;
	modifiers: Partial<FactorVector>;
	dr_modifier: number;
	healing_modifier: number;
	damage_per_tick: number;  // raw % of ATK (e.g., 550 = 5.5× ATK)
	shield_hp: number;
	counter_damage: number;
	atk_modifier: number;    // fractional: 0.7 = +70% ATK
	def_modifier: number;    // fractional: 0.7 = +70% DEF
	target_entity: string; // who to HIT (for DoT/counter)
	owner_entity?: string; // who owns this (for ATK lookup on DoT ticks)
	max_stacks?: number;   // stack cap (undefined = unlimited)
	dispellable?: boolean; // false → ignore DISPEL (default true)
}

export const stateEffectMachine = setup({
	types: {
		context: {} as {
			id: string;
			remaining: number;
			stacks: number;
			initial_duration: number;
			modifiers: Partial<FactorVector>;
			dr_modifier: number;
			healing_modifier: number;
			damage_per_tick: number;
			shield_hp: number;
			counter_damage: number;
			atk_modifier: number;
			def_modifier: number;
			target_entity: string;
			owner_entity: string;
			max_stacks: number;    // 0 = unlimited
			dispellable: boolean;
		},
		input: {} as StateEffectInput,
		events: {} as TickEvent | DispelEvent | StackEvent | AbsorbEvent,
	},
}).createMachine({
	id: "state-effect",
	initial: "on",
	context: ({ input }) => ({
		id: input.id,
		remaining: input.duration,
		stacks: 1,
		initial_duration: input.duration,
		modifiers: input.modifiers,
		dr_modifier: input.dr_modifier,
		healing_modifier: input.healing_modifier,
		damage_per_tick: input.damage_per_tick,
		shield_hp: input.shield_hp,
		counter_damage: input.counter_damage,
		atk_modifier: input.atk_modifier ?? 0,
		def_modifier: input.def_modifier ?? 0,
		target_entity: input.target_entity,
		owner_entity: input.owner_entity ?? "",
		max_stacks: input.max_stacks ?? 0,
		dispellable: input.dispellable ?? true,
	}),
	states: {
		on: {
			on: {
				TICK: [
					{
						guard: ({ context, event }) =>
							context.remaining - event.dt <= 0,
						target: "off",
						actions: enqueueActions(
							({ context, enqueue, system, event }) => {
								// Fire DoT damage before expiring (ATK-scaled)
								if (context.damage_per_tick > 0) {
									const target = system.get(
										context.target_entity,
									);
									if (target) {
										const ownerActor = context.owner_entity ? system.get(context.owner_entity) : null;
										const ownerCtx = ownerActor?.getSnapshot()?.context as any;
										const atk = ownerCtx?.effective_atk ?? ownerCtx?.atk ?? 0;
										const dotDmg = (context.damage_per_tick / 100) * atk * context.stacks;
										enqueue.sendTo(target, {
											type: "HIT",
											damage: dotDmg,
											source: "dot",
											is_crit: false,
											hit_index: 0,
											dr_bypass: 0,
											healing: 0,
										} satisfies HitEvent);
									}
								}
								enqueue.assign({ remaining: 0 });
							},
						),
					},
					{
						actions: enqueueActions(
							({ context, enqueue, system, event }) => {
								enqueue.assign({
									remaining: context.remaining - event.dt,
								});
								// DoT: send HIT on each tick (ATK-scaled)
								if (context.damage_per_tick > 0) {
									const target = system.get(
										context.target_entity,
									);
									if (target) {
										const ownerActor = context.owner_entity ? system.get(context.owner_entity) : null;
										const ownerCtx = ownerActor?.getSnapshot()?.context as any;
										const atk = ownerCtx?.effective_atk ?? ownerCtx?.atk ?? 0;
										const dotDmg = (context.damage_per_tick / 100) * atk * context.stacks;
										enqueue.sendTo(target, {
											type: "HIT",
											damage: dotDmg,
											source: "dot",
											is_crit: false,
											hit_index: 0,
											dr_bypass: 0,
											healing: 0,
										} satisfies HitEvent);
									}
								}
							},
						),
					},
				],
				DISPEL: [
					{
						guard: ({ context }) => context.dispellable,
						target: "off",
					},
					{
						// dispellable: false → ignore DISPEL
					},
				],
				STACK: {
					actions: assign(({ context }) => {
						const capped = context.max_stacks > 0 && context.stacks >= context.max_stacks;
						return {
							stacks: capped ? context.stacks : context.stacks + 1,
							remaining: context.initial_duration, // refresh duration
						};
					}),
				},
				ABSORB: [
					{
						guard: ({ context, event }) =>
							context.shield_hp - event.amount <= 0,
						target: "off",
						actions: assign({ shield_hp: 0 }),
					},
					{
						actions: assign({
							shield_hp: ({ context, event }) =>
								context.shield_hp - event.amount,
						}),
					},
				],
			},
		},
		off: {
			type: "final",
		},
	},
});
