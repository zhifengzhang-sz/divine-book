/**
 * Arena actor — root of the actor system.
 *
 * Responsibilities:
 * - Spawn entity and slot actors (via context factory)
 * - Drive the clock: ACTIVATE slots in sequence, TICK between slots
 * - Route STATE_CREATED events: notify affected entities
 * - End combat when an entity dies or all slots are fired
 *
 * The arena does NOT compute damage or manage HP.
 */

import {
	type ActorRefFrom,
	assign,
	enqueueActions,
	setup,
} from "xstate";
import type {
	EntityDef,
	EntityDiedEvent,
	SlotDef,
	SlotDoneEvent,
	StateAppliedEvent,
	StateCreatedEvent,
	TickEvent,
} from "../types";
import { entityMachine } from "./entity";
import { slotMachine } from "./slot";
import { stateEffectMachine } from "./state-effect";

export interface ArenaDef {
	entity_a: EntityDef;
	entity_b: EntityDef;
	slots_a: SlotDef[];
	slots_b: SlotDef[];
	t_gap: number;
	sp_shield_ratio: number;  // shield = sp × this ratio
}

export const arenaMachine = setup({
	types: {
		context: {} as {
			current_round: number;
			max_rounds: number;
			t_gap: number;
			entity_a: ActorRefFrom<typeof entityMachine>;
			entity_b: ActorRefFrom<typeof entityMachine>;
			slots_a: ActorRefFrom<typeof slotMachine>[];
			slots_b: ActorRefFrom<typeof slotMachine>[];
			/** All state effect systemIds — for ticking durations */
			state_registry: string[];
			/** How many SLOT_DONEs received this round */
			slots_done: number;
			/** How many slots expected this round */
			slots_expected: number;
			winner: string | null;
		},
		input: {} as ArenaDef,
		events: {} as
			| { type: "START" }
			| SlotDoneEvent
			| EntityDiedEvent
			| StateCreatedEvent,
	},
	guards: {
		allRoundsDone: ({ context }) =>
			context.current_round >= context.max_rounds,
		allSlotsDone: ({ context }) =>
			context.slots_done >= context.slots_expected,
	},
}).createMachine({
	id: "arena",
	initial: "ready",

	// Spawn everything in the context factory — no intermediate "spawning" state
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
						duration: 999,  // lasts entire combat
						modifiers: {},
						dr_modifier: 0,
						healing_modifier: 0,
						damage_per_tick: 0,
						shield_hp: shieldHp,
						counter_damage: 0,
						target_entity: entityDef.id,
					},
				});
				stateRegistry.push(shieldId);
				// Notify entity about the shield
				entityRef.send({
					type: "STATE_APPLIED",
					state_id: shieldId,
				} satisfies StateAppliedEvent);
			}
		}

		return {
			current_round: 0,
			max_rounds: Math.max(input.slots_a.length, input.slots_b.length),
			t_gap: input.t_gap,
			entity_a: entityA,
			entity_b: entityB,
			slots_a: input.slots_a.map((def) =>
				spawn(slotMachine, {
					systemId: def.id,
					input: { slot: def },
				}),
			),
			slots_b: input.slots_b.map((def) =>
				spawn(slotMachine, {
					systemId: def.id,
					input: { slot: def },
				}),
			),
			state_registry: stateRegistry,
			slots_done: 0,
			slots_expected: 0,
			winner: null,
		};
	},

	states: {
		ready: {
			on: {
				START: { target: "running" },
			},
		},
		running: {
			entry: enqueueActions(({ context, enqueue }) => {
				const round = context.current_round;
				const slotA = context.slots_a[round];
				const slotB = context.slots_b[round];
				let expected = 0;
				if (slotA) { enqueue.sendTo(slotA, { type: "ACTIVATE" }); expected++; }
				if (slotB) { enqueue.sendTo(slotB, { type: "ACTIVATE" }); expected++; }
				enqueue.assign({ slots_done: 0, slots_expected: expected });
			}),
			on: {
				ENTITY_DIED: {
					target: "done",
					actions: assign({
						winner: ({ event }) =>
							event.entity_id === "entity-a"
								? "entity-b"
								: "entity-a",
					}),
				},
				// Route new state to affected entity
				STATE_CREATED: {
					actions: enqueueActions(({ context, event, enqueue, system }) => {
						enqueue.assign({
							state_registry: [
								...context.state_registry,
								event.state_id,
							],
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
				SLOT_DONE: {
					actions: assign({
						slots_done: ({ context }) => context.slots_done + 1,
					}),
				},
			},
			always: {
				guard: "allSlotsDone",
				target: "between_rounds",
				actions: assign({
					current_round: ({ context }) => context.current_round + 1,
				}),
			},
		},
		between_rounds: {
			entry: enqueueActions(({ context, enqueue, system }) => {
				// Tick all active states
				for (const stateId of context.state_registry) {
					const actor = system.get(stateId);
					if (actor) {
						enqueue.sendTo(actor, {
							type: "TICK",
							dt: context.t_gap,
						} satisfies TickEvent);
					}
				}
			}),
			// Also handle STATE_CREATED here — DoT ticks may spawn new states
			on: {
				STATE_CREATED: {
					actions: enqueueActions(({ context, event, enqueue, system }) => {
						enqueue.assign({
							state_registry: [
								...context.state_registry,
								event.state_id,
							],
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
				ENTITY_DIED: {
					target: "done",
					actions: assign({
						winner: ({ event }) =>
							event.entity_id === "entity-a"
								? "entity-b"
								: "entity-a",
					}),
				},
			},
			always: [
				{
					guard: "allRoundsDone",
					target: "done",
				},
				{
					target: "running",
				},
			],
		},
		done: {},
	},
});
