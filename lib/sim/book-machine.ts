/**
 * Book actor — wraps processBook (design §5.3) in an XState v5 machine.
 *
 * Spawned by the player machine. On CAST, runs processBook and routes:
 *   - Errors → BOOK_CAST_ERROR to owner (player emits HANDLER_ERROR)
 *   - Listeners → REGISTER_LISTENERS to owner
 *   - Self-targeted intents → sendTo(ownerRef)
 *   - Opponent-targeted intents → sendTo(opponentRef)
 *   - HIT events → sendTo(opponentRef) simultaneously
 */

import { type AnyActorRef, enqueueActions, sendTo, setup } from "xstate";
import type { BookData, EffectRow } from "../data/types.js";
import { processBook } from "./book.js";
import type { SimulationClock } from "./clock.js";
import { selectTiers } from "./config.js";
import type { SeededRNG } from "./rng.js";
import type {
	BookSlot,
	IntentEvent,
	PlayerState,
	ProgressionConfig,
} from "./types.js";

// ── Book Machine Types ──────────────────────────────────────────────

interface BookMachineContext {
	bookData: BookData;
	affixEffects: EffectRow[];
	bookSlot: BookSlot;
	progression: ProgressionConfig;
	rng: SeededRNG;
	clock: SimulationClock;
	label: string;
	ownerRef: AnyActorRef;
	hits: number;
}

export interface BookMachineInput {
	bookData: BookData;
	affixEffects: EffectRow[];
	bookSlot: BookSlot;
	progression: ProgressionConfig;
	rng: SeededRNG;
	clock: SimulationClock;
	label: string;
	ownerRef: AnyActorRef;
	hits: number;
}

type BookMachineEvent = {
	type: "CAST";
	playerState: PlayerState;
	opponentRef?: AnyActorRef;
};

// ── Helpers ─────────────────────────────────────────────────────────

function isSelfTargeted(ev: IntentEvent): boolean {
	switch (ev.type) {
		case "APPLY_STATE":
			return ev.state.target === "self";
		case "HEAL":
		case "SHIELD":
		case "HP_COST":
		case "HP_FLOOR":
		case "SELF_CLEANSE":
		case "LIFESTEAL":
			return true;
		default:
			return false;
	}
}

function extractHits(
	bookData: BookData,
	progression: ProgressionConfig,
): number {
	if (!bookData.skill) return 0;
	const tiered = selectTiers(bookData.skill, progression);
	const baseAttack = tiered.find((e) => e.type === "base_attack");
	return (baseAttack?.hits as number) ?? 0;
}

// ── Book Machine Definition ─────────────────────────────────────────

export const bookMachine = setup({
	types: {
		context: {} as BookMachineContext,
		input: {} as BookMachineInput,
		events: {} as BookMachineEvent,
	},
}).createMachine({
	id: "book",
	context: ({ input }) => ({ ...input }),
	initial: "idle",
	states: {
		idle: {
			on: {
				CAST: {
					actions: enqueueActions(({ context, event, enqueue }) => {
						const { playerState, opponentRef } = event;

						const result = processBook(
							context.bookData,
							context.affixEffects,
							{
								sourcePlayer: playerState,
								targetPlayer: playerState,
								book: context.bookSlot.platform,
								slot: context.bookSlot.slot,
								rng: context.rng,
								atk: playerState.atk,
								hits: context.hits,
							},
							context.progression,
						);

						// Errors → send to owner for emission
						if (result.errors.length > 0) {
							enqueue(
								sendTo(context.ownerRef, {
									type: "BOOK_CAST_ERROR",
									errors: result.errors,
									slot: context.bookSlot.slot,
								}),
							);
							return;
						}

						// Listeners → send to owner for registration
						if (result.listeners.length > 0) {
							enqueue(
								sendTo(context.ownerRef, {
									type: "REGISTER_LISTENERS",
									listeners: result.listeners,
								}),
							);
						}

						// Separate HITs from other events
						const hitEvents = result.directEvents.filter(
							(ev) => ev.type === "HIT",
						);
						const otherEvents = result.directEvents.filter(
							(ev) => ev.type !== "HIT",
						);

						// Non-HIT events: self-targeted → owner, opponent-targeted → opponent
						for (const ev of otherEvents) {
							if (isSelfTargeted(ev)) {
								enqueue(sendTo(context.ownerRef, ev));
							} else if (opponentRef) {
								enqueue(sendTo(opponentRef, ev));
							}
						}

						// HITs → send back to owner for timed delivery
						// (book actors don't inherit the simulation clock,
						//  so the player handles delayed sendTo for hit timing)
						if (hitEvents.length > 0) {
							enqueue(
								sendTo(context.ownerRef, {
									type: "BOOK_CAST_HITS",
									hits: hitEvents,
								}),
							);
						}
					}),
				},
			},
		},
	},
});

export { extractHits };
