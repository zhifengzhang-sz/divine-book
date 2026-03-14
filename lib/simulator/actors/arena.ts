/**
 * Arena actor — root of the actor system.
 *
 * Single-round architecture: each round resolves both sides against
 * the same pre-round snapshot (simultaneous resolution), applies all
 * events, ticks states via TICK_STATES, then checks termination
 * via ROUND_COMPLETE.
 *
 * Death detection: entity SM enters its `dead` final state when HP ≤ 0.
 * Arena checks `anyEntityDead` guard on ROUND_COMPLETE — no ENTITY_DIED
 * event needed. sendTo(self) for TICK_STATES and ROUND_COMPLETE ensures
 * all entity/state events process before the guard is evaluated.
 */

import {
	type ActorRefFrom,
	enqueueActions,
	setup,
	spawnChild,
} from "xstate";
import type {
	EntityDef,
	SlotDef,
	StateAppliedEvent,
	StateCreatedEvent,
	TickEvent,
} from "../types";
import { entityMachine } from "./entity";
import { stateEffectMachine } from "./state-effect";
import {
	resolveSlot,
	takeEntitySnapshot,
} from "../resolve";

export interface ArenaDef {
	entity_a: EntityDef;
	entity_b: EntityDef;
	slots_a: SlotDef[];
	slots_b: SlotDef[];
	t_gap: number;
	sp_shield_ratio: number;
	/** Max combat time in seconds (default: num_slots × t_gap). */
	max_time?: number;
}

/** Safely read HP from an entity actor ref (handles stopped/dead actors) */
function safeReadHp(entityRef: ActorRefFrom<typeof entityMachine>): number {
	try {
		const snap = entityRef.getSnapshot();
		return (snap?.context as any)?.hp ?? 0;
	} catch {
		return 0;
	}
}

export const arenaMachine = setup({
	types: {
		context: {} as {
			current_round: number;
			num_slots: number;
			max_time: number;
			elapsed: number;
			t_gap: number;
			entity_a: ActorRefFrom<typeof entityMachine>;
			entity_b: ActorRefFrom<typeof entityMachine>;
			books_a: SlotDef[];
			books_b: SlotDef[];
			/** Activation counter per slot (for unique state IDs) */
			activations: Map<string, number>;
			/** All state effect systemIds — for ticking durations */
			state_registry: string[];
			winner: string | null;
		},
		input: {} as ArenaDef,
		events: {} as
			| { type: "START" }
			| { type: "TICK_STATES" }
			| { type: "ROUND_COMPLETE" }
			| StateCreatedEvent,
	},
	guards: {
		timeLimitReached: ({ context }) =>
			context.elapsed >= context.max_time,
		anyEntityDead: ({ context }) => {
			try {
				return safeReadHp(context.entity_a) <= 0
					|| safeReadHp(context.entity_b) <= 0;
			} catch {
				return true;
			}
		},
	},
	actions: {
		setWinner: enqueueActions(({ context, enqueue }) => {
			const eaHp = safeReadHp(context.entity_a);
			const ebHp = safeReadHp(context.entity_b);
			if (eaHp <= 0 && ebHp <= 0) {
				enqueue.assign({ winner: null }); // draw
			} else if (eaHp <= 0) {
				enqueue.assign({ winner: "entity-b" });
			} else if (ebHp <= 0) {
				enqueue.assign({ winner: "entity-a" });
			}
			// both alive → winner stays null (timeout)
		}),
	},
}).createMachine({
	id: "arena",
	initial: "ready",

	context: ({ input, spawn }) => {
		const entityA = spawn(entityMachine, {
			systemId: input.entity_a.id,
			input: input.entity_a,
		});
		const entityB = spawn(entityMachine, {
			systemId: input.entity_b.id,
			input: input.entity_b,
		});

		// Spawn SP shields for each entity
		const stateRegistry: string[] = [];
		for (const [entityDef, entityRef] of [
			[input.entity_a, entityA],
			[input.entity_b, entityB],
		] as const) {
			const shieldHp = entityDef.sp * input.sp_shield_ratio;
			if (shieldHp > 0) {
				const shieldId = `shield-sp-${entityDef.id}`;
				spawn(stateEffectMachine, {
					systemId: shieldId,
					input: {
						id: shieldId,
						duration: 999,
						modifiers: {},
						dr_modifier: 0,
						healing_modifier: 0,
						damage_per_tick: 0,
						shield_hp: shieldHp,
						counter_damage: 0,
						atk_modifier: 0,
						def_modifier: 0,
						target_entity: entityDef.id,
					},
				});
				stateRegistry.push(shieldId);
				entityRef.send({
					type: "STATE_APPLIED",
					state_id: shieldId,
				} satisfies StateAppliedEvent);
			}
		}

		return {
			current_round: 0,
			num_slots: Math.max(input.slots_a.length, input.slots_b.length),
			max_time: input.max_time ?? Math.max(input.slots_a.length, input.slots_b.length) * input.t_gap,
			elapsed: 0,
			t_gap: input.t_gap,
			entity_a: entityA,
			entity_b: entityB,
			books_a: input.slots_a,
			books_b: input.slots_b,
			activations: new Map<string, number>(),
			state_registry: stateRegistry,
			winner: null,
		};
	},

	states: {
		ready: {
			on: {
				START: { target: "round" },
			},
		},

		round: {
			entry: enqueueActions(({ context, enqueue, system }) => {
				const idx = context.current_round % context.num_slots;
				const bookA = context.books_a[idx];
				const bookB = context.books_b[idx];

				// 1. Snapshot both entities (immutable)
				const snapA = takeEntitySnapshot(system, "entity-a");
				const snapB = takeEntitySnapshot(system, "entity-b");

				// 2. Get activation counters
				const actA = context.activations.get(bookA?.id ?? "") ?? 0;
				const actB = context.activations.get(bookB?.id ?? "") ?? 0;

				// 3. Resolve both sides against same pre-round snapshot
				const resultA = bookA
					? resolveSlot(bookA, snapA, snapB, actA)
					: { hits: [], heals: [], self_hits: [], states: [], stacks: [] };
				const resultB = bookB
					? resolveSlot(bookB, snapB, snapA, actB)
					: { hits: [], heals: [], self_hits: [], states: [], stacks: [] };

				// 4. Update activation counters
				const newActivations = new Map(context.activations);
				if (bookA) newActivations.set(bookA.id, actA + 1);
				if (bookB) newActivations.set(bookB.id, actB + 1);

				const allResults = [resultA, resultB];

				// 5a. Self HP costs
				for (const r of allResults) {
					for (const sh of r.self_hits) {
						const actor = system.get(sh.target);
						if (actor) enqueue.sendTo(actor, sh.event);
					}
				}

				// 5b. Damage HITs
				for (const r of allResults) {
					for (const h of r.hits) {
						const actor = system.get(h.target);
						if (actor) enqueue.sendTo(actor, h.event);
					}
				}

				// 5c. HEALs
				for (const r of allResults) {
					for (const h of r.heals) {
						const actor = system.get(h.target);
						if (actor) enqueue.sendTo(actor, h.event);
					}
				}

				// 5d. Spawn state effects and notify entities
				const newStateIds: string[] = [];
				for (const r of allResults) {
					for (const s of r.states) {
						enqueue(
							spawnChild(stateEffectMachine, {
								input: s.input,
								systemId: s.id,
							}),
						);
						newStateIds.push(s.id);

						const entity = system.get(s.target_entity);
						if (entity) {
							enqueue.sendTo(entity, {
								type: "STATE_APPLIED",
								state_id: s.id,
							} satisfies StateAppliedEvent);
						}
					}
				}

				// 5e. STACK events for per_hit_stack states
				for (const r of allResults) {
					for (const st of r.stacks) {
						const stateActor = system.get(st.state_base_id);
						if (stateActor) {
							for (let h = 0; h < st.count; h++) {
								enqueue.sendTo(stateActor, { type: "STACK" });
							}
						}
					}
				}

				// 6. Update context (round counter, activations, new states)
				enqueue.assign({
					activations: newActivations,
					state_registry: [
						...context.state_registry,
						...newStateIds,
					],
					current_round: context.current_round + 1,
				});

				// 7. Send TICK_STATES to self — goes through deferred queue
				//    so entity events (HIT, HEAL, STATE_APPLIED) process first
				const arenaRef = system.get("arena");
				if (arenaRef) enqueue.sendTo(arenaRef, { type: "TICK_STATES" });
			}),

			on: {
				STATE_CREATED: {
					actions: enqueueActions(({ context, event, enqueue, system }) => {
						enqueue.assign({
							state_registry: [...context.state_registry, event.state_id],
						});
						const entity = system.get(event.target_entity);
						if (entity) {
							enqueue.sendTo(entity, {
								type: "STATE_APPLIED",
								state_id: event.state_id,
							} satisfies StateAppliedEvent);
						}
					}),
				},
				TICK_STATES: {
					actions: enqueueActions(({ context, enqueue, system }) => {
						// Advance combat clock
						enqueue.assign({
							elapsed: context.elapsed + context.t_gap,
						});

						// Tick all active states (including newly spawned this round)
						for (const stateId of context.state_registry) {
							const actor = system.get(stateId);
							if (actor) {
								enqueue.sendTo(actor, {
									type: "TICK",
									dt: context.t_gap,
								} satisfies TickEvent);
							}
						}

						// Signal round complete — sendTo(self) to preserve queue order
						const arenaRef2 = system.get("arena");
						if (arenaRef2) enqueue.sendTo(arenaRef2, { type: "ROUND_COMPLETE" });
					}),
				},
				ROUND_COMPLETE: [
					{
						guard: "anyEntityDead",
						target: "done",
						actions: "setWinner",
					},
					{
						guard: "timeLimitReached",
						target: "done",
					},
					{
						target: "round",
						reenter: true,
					},
				],
			},
		},

		done: {},
	},
});
