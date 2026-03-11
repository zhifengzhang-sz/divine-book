/**
 * Entity actor — alive or dead.
 *
 * Receives HIT events, applies own defenses (base DR + debuff modifiers),
 * reduces HP. Maintains lists of active buff/debuff systemIds.
 *
 * Buffs/debuffs are separate actors — the entity looks them up via
 * system.get() when it needs their values.
 */

import { assign, enqueueActions, setup } from "xstate";
import type {
	EntityDef,
	EntityDiedEvent,
	HitEvent,
	StateAppliedEvent,
} from "../types";

export const entityMachine = setup({
	types: {
		context: {} as {
			id: string;
			hp: number;
			max_hp: number;
			atk: number;
			base_dr: number;
			crit_rate: number;
			crit_damage: number;
			buff_ids: string[];     // systemIds of active buff actors on this entity
			debuff_ids: string[];   // systemIds of active debuff actors on this entity
			damage_log: Array<{
				damage: number;
				effective: number;
				dr_applied: number;
				source: string;
			}>;
		},
		input: {} as EntityDef,
		events: {} as HitEvent | StateAppliedEvent,
	},
}).createMachine({
	id: "entity",
	initial: "alive",
	context: ({ input }) => ({
		id: input.id,
		hp: input.hp,
		max_hp: input.hp,
		atk: input.atk,
		base_dr: input.dr,
		crit_rate: input.crit_rate,
		crit_damage: input.crit_damage,
		buff_ids: [],
		debuff_ids: [],
		damage_log: [],
	}),
	states: {
		alive: {
			on: {
				HIT: {
					target: "receiving_hit",
					actions: assign(({ context, event, system }) => {
						// Compute effective DR: base + sum of debuff dr_modifiers
						let effective_dr = context.base_dr;
						for (const debuffId of context.debuff_ids) {
							const actor = system.get(debuffId);
							if (!actor) continue;
							const snap = actor.getSnapshot();
							if (snap.value === "on") {
								effective_dr += (snap.context as any).dr_modifier ?? 0;
							}
						}
						// Clamp DR to [0, 1]
						effective_dr = Math.max(0, Math.min(1, effective_dr));

						const effective = event.damage * (1 - effective_dr);
						const new_hp = Math.max(0, context.hp - effective);
						return {
							hp: new_hp,
							damage_log: [
								...context.damage_log,
								{
									damage: event.damage,
									effective,
									dr_applied: effective_dr,
									source: event.source,
								},
							],
						};
					}),
				},
				STATE_APPLIED: {
					actions: assign(({ context, event }) => {
						if (event.kind === "buff") {
							return { buff_ids: [...context.buff_ids, event.state_id] };
						}
						return { debuff_ids: [...context.debuff_ids, event.state_id] };
					}),
				},
			},
		},
		receiving_hit: {
			always: [
				{
					guard: ({ context }) => context.hp <= 0,
					target: "dead",
				},
				{
					target: "alive",
				},
			],
		},
		dead: {
			type: "final",
			entry: enqueueActions(({ context, enqueue, system }) => {
				const arena = system.get("arena");
				if (arena) {
					enqueue.sendTo(arena, {
						type: "ENTITY_DIED",
						entity_id: context.id,
					} satisfies EntityDiedEvent);
				}
			}),
		},
	},
});
