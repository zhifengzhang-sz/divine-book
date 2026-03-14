/**
 * Entity actor — alive or dead.
 *
 * Receives HIT events, applies own defenses (base DR + state effect modifiers),
 * reduces HP. Maintains a single active_states list — no buff/debuff split.
 *
 * Derived stats (effective_atk, effective_dr, etc.) are cached on context
 * and recomputed on every event via computeDerivedStats(). All consumers
 * (slot, chart, DoT) read these cached values — no re-derivation.
 */

import { assign, enqueueActions, setup, spawnChild } from "xstate";
import type {
	AbsorbEvent,
	EntityDef,
	FactorVector,
	HealEvent,
	HitEvent,
	StateDef,
	StateAppliedEvent,
	StateCreatedEvent,
} from "../types";
import { computeDerivedStats, type DerivedStats } from "../derived";
import { stateEffectMachine } from "./state-effect";

/** Register a reactive state template (trigger=on_attacked) on this entity */
export type RegisterReactiveEvent = {
	type: "REGISTER_REACTIVE";
	template: StateDef;
};

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
			active_states: string[];
			reactive_templates: StateDef[];
			reactive_counter: number;
			damage_log: Array<{
				damage: number;
				effective: number;
				dr_applied: number;
				source: string;
			}>;
			// Derived stats — cached, recomputed on every event
			effective_atk: number;
			effective_def: number;
			effective_dr: number;
			heal_reduction: number;
			buff_modifiers: Partial<FactorVector>;
		},
		input: {} as EntityDef,
		events: {} as HitEvent | HealEvent | StateAppliedEvent | RegisterReactiveEvent,
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
		active_states: [] as string[],
		reactive_templates: [] as StateDef[],
		reactive_counter: 0,
		damage_log: [] as Array<{ damage: number; effective: number; dr_applied: number; source: string }>,
		// Initial derived stats (no active states yet)
		effective_atk: input.atk,
		effective_def: input.def,
		effective_dr: input.def / (input.def + input.dr_constant),
		heal_reduction: 0,
		buff_modifiers: {} as Partial<FactorVector>,
	}),
	states: {
		alive: {
			on: {
				HIT: {
					target: "receiving_hit",
					actions: enqueueActions(({ context, event, enqueue, system }) => {
						// Recompute derived stats (states may have expired since last event)
						const derived = computeDerivedStats(
							context.active_states, context.atk, context.def, context.dr_constant, system,
						);

						// 1. Apply DR bypass (D_res from attacker)
						let effective_dr = derived.effective_dr;
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
							...derived,
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

						// 5. Reactive state templates (trigger=on_attacked): spawn/stack on HIT received
						if (event.source !== "dot" && context.reactive_templates.length > 0) {
							let nextCounter = context.reactive_counter;
							for (const tmpl of context.reactive_templates) {
								if (tmpl.chance != null && tmpl.chance < 100) {
									if (Math.random() * 100 >= tmpl.chance) continue;
								}

								const stateSystemId = `state-reactive-${tmpl.id}-${context.id}-${nextCounter++}`;
								const target_entity =
									tmpl.target === "self" ? context.id : event.source;

								enqueue(
									spawnChild(stateEffectMachine, {
										input: {
											id: tmpl.id,
											duration: tmpl.duration,
											modifiers: tmpl.modifiers,
											dr_modifier: tmpl.dr_modifier ?? 0,
											healing_modifier: tmpl.healing_modifier ?? 0,
											damage_per_tick: tmpl.damage_per_tick ?? 0,
											shield_hp: tmpl.shield_hp ?? 0,
											counter_damage: tmpl.counter_damage ?? 0,
											atk_modifier: tmpl.atk_modifier ?? 0,
											def_modifier: tmpl.def_modifier ?? 0,
											target_entity,
											owner_entity: context.id,
											max_stacks: tmpl.max_stacks,
											dispellable: tmpl.dispellable,
										},
										systemId: stateSystemId,
									}),
								);

								const arena = system.get("arena");
								if (arena) {
									enqueue.sendTo(arena, {
										type: "STATE_CREATED",
										state_id: stateSystemId,
										target_entity,
									} satisfies StateCreatedEvent);
								}
							}
							enqueue.assign({ reactive_counter: nextCounter });
						}
					}),
				},
				HEAL: {
					actions: enqueueActions(({ context, event, enqueue, system }) => {
						const healEvent = event as HealEvent;
						// Recompute derived stats to get current heal_reduction
						const derived = computeDerivedStats(
							context.active_states, context.atk, context.def, context.dr_constant, system,
						);
						const effective_heal = Math.max(0, healEvent.amount * (1 - derived.heal_reduction));
						enqueue.assign({
							hp: Math.min(context.max_hp, context.hp + effective_heal),
							...derived,
						});
					}),
				},
				STATE_APPLIED: {
					actions: enqueueActions(({ context, event, enqueue, system }) => {
						const newStates = [...context.active_states, event.state_id];
						const derived = computeDerivedStats(
							newStates, context.atk, context.def, context.dr_constant, system,
						);
						enqueue.assign({
							active_states: newStates,
							...derived,
						});
					}),
				},
				REGISTER_REACTIVE: {
					actions: assign(({ context, event }) => ({
						reactive_templates: [...context.reactive_templates, (event as RegisterReactiveEvent).template],
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
		},
	},
});
