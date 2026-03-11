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

export interface ArenaDef {
	entity_a: EntityDef;
	entity_b: EntityDef;
	slots_a: SlotDef[];
	slots_b: SlotDef[];
	t_gap: number;
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
			/** All state actor systemIds — for ticking durations */
			state_registry: string[];
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
	},
}).createMachine({
	id: "arena",
	initial: "ready",

	// Spawn everything in the context factory — no intermediate "spawning" state
	context: ({ input, spawn }) => ({
		current_round: 0,
		max_rounds: Math.max(input.slots_a.length, input.slots_b.length),
		t_gap: input.t_gap,
		entity_a: spawn(entityMachine, {
			systemId: input.entity_a.id,
			input: input.entity_a,
		}),
		entity_b: spawn(entityMachine, {
			systemId: input.entity_b.id,
			input: input.entity_b,
		}),
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
		state_registry: [],
		winner: null,
	}),

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
				if (slotA) enqueue.sendTo(slotA, { type: "ACTIVATE" });
				if (slotB) enqueue.sendTo(slotB, { type: "ACTIVATE" });
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
						// Register for ticking
						enqueue.assign({
							state_registry: [
								...context.state_registry,
								event.state_id,
							],
						});

						// Notify the affected entity
						const entity = system.get(event.target_entity);
						if (entity) {
							enqueue.sendTo(entity, {
								type: "STATE_APPLIED",
								state_id: event.state_id,
								kind: event.kind,
							} satisfies StateAppliedEvent);
						}
					}),
				},
				SLOT_DONE: {
					target: "between_rounds",
					actions: assign({
						current_round: ({ context }) =>
							context.current_round + 1,
					}),
				},
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
