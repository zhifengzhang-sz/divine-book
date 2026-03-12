/**
 * Entity actor — alive or dead.
 *
 * Receives HIT events, applies own defenses (base DR + state effect modifiers),
 * reduces HP. Maintains a single active_states list — no buff/debuff split.
 *
 * State effects are separate actors — the entity looks them up via
 * system.get() when it needs their values.
 */

import { assign, enqueueActions, setup } from "xstate";
import type {
	AbsorbEvent,
	EntityDef,
	EntityDiedEvent,
	HealEvent,
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
			sp: number;              // 灵力
			def: number;             // 守御 (raw value)
			dr_constant: number;     // K in DR = def / (def + K)
			active_states: string[];   // systemIds of all active state effects on this entity
			damage_log: Array<{
				damage: number;
				effective: number;
				dr_applied: number;
				source: string;
			}>;
		},
		input: {} as EntityDef,
		events: {} as HitEvent | HealEvent | StateAppliedEvent,
	},
}).createMachine({
	id: "entity",
	initial: "alive",
	context: ({ input }) => ({
		id: input.id,
		hp: input.hp,
		max_hp: input.hp,
		atk: input.atk,
		sp: input.sp,
		def: input.def,
		dr_constant: input.dr_constant,
		active_states: [],
		damage_log: [],
	}),
	states: {
		alive: {
			on: {
				HIT: {
					target: "receiving_hit",
					actions: enqueueActions(({ context, event, enqueue, system }) => {
						// 1. Compute effective DR: def/(def+K) + sum of state effect dr_modifiers
						const base_dr = context.def / (context.def + context.dr_constant);
						let effective_dr = base_dr;
						for (const stateId of context.active_states) {
							const actor = system.get(stateId);
							if (!actor) continue;
							const snap = actor.getSnapshot();
							if (snap.value === "on") {
								effective_dr += (snap.context as any).dr_modifier ?? 0;
							}
						}
						effective_dr = Math.max(0, Math.min(1, effective_dr));

						// 1b. Apply DR bypass (D_res from attacker)
						const dr_bypass = event.dr_bypass ?? 0;
						if (dr_bypass > 0) {
							effective_dr = effective_dr * (1 - dr_bypass);
						}

						// 2. Check shields — absorb damage before DR
						let remaining_damage = event.damage;
						for (const stateId of context.active_states) {
							if (remaining_damage <= 0) break;
							const actor = system.get(stateId);
							if (!actor) continue;
							const snap = actor.getSnapshot();
							if (snap.value === "on" && (snap.context as any).shield_hp > 0) {
								const shield_hp = (snap.context as any).shield_hp as number;
								const absorbed = Math.min(shield_hp, remaining_damage);
								remaining_damage -= absorbed;
								enqueue.sendTo(actor, {
									type: "ABSORB",
									amount: absorbed,
								} satisfies AbsorbEvent);
							}
						}

						// 3. Apply DR to remaining damage
						const effective = remaining_damage * (1 - effective_dr);
						const new_hp = Math.max(0, context.hp - effective);

						enqueue.assign({
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
						});

						// 4. Reactive counter: check active states for counter_damage > 0
						if (event.source !== "dot") {
							for (const stateId of context.active_states) {
								const actor = system.get(stateId);
								if (!actor) continue;
								const snap = actor.getSnapshot();
								if (snap.value === "on" && (snap.context as any).counter_damage > 0) {
									const sourceActor = system.get(event.source);
									if (sourceActor) {
										enqueue.sendTo(sourceActor, {
											type: "HIT",
											damage: (snap.context as any).counter_damage,
											source: context.id,
											is_crit: false,
											hit_index: 0,
											dr_bypass: 0,
											healing: 0,
										} satisfies HitEvent);
									}
								}
							}
						}
					}),
				},
				HEAL: {
					actions: enqueueActions(({ context, event, enqueue, system }) => {
						const healEvent = event as HealEvent;
						// Sum healing reduction from active state effects (H_red debuffs on self)
						let heal_reduction = 0;
						for (const stateId of context.active_states) {
							const stActor = system.get(stateId);
							if (!stActor) continue;
							const snap = stActor.getSnapshot();
							if (snap.value === "on") {
								heal_reduction += (snap.context as any).healing_modifier ?? 0;
							}
						}
						const effective_heal = Math.max(0, healEvent.amount * (1 - heal_reduction));
						enqueue.assign({
							hp: Math.min(context.max_hp, context.hp + effective_heal),
						});
					}),
				},
				STATE_APPLIED: {
					actions: assign(({ context, event }) => ({
						active_states: [...context.active_states, event.state_id],
					})),
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
