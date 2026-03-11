/**
 * Buff/Debuff actor — on or off.
 *
 * Passive: never sends events. Other actors query its snapshot
 * to check if it's on and read its modifiers / dr_modifier / etc.
 *
 * Used for both self-buffs (仙佑 +70% M_dmg) and opponent-debuffs
 * (命損 -100% DR). The `target` field distinguishes them.
 */

import { assign, setup } from "xstate";
import type {
	DispelEvent,
	FactorVector,
	StateTarget,
	TickEvent,
} from "../types";

export interface BuffInput {
	id: string;
	duration: number;
	target: StateTarget;
	modifiers: Partial<FactorVector>;
	dr_modifier: number;
	healing_modifier: number;
}

export const buffMachine = setup({
	types: {
		context: {} as {
			id: string;
			remaining: number;
			target: StateTarget;
			modifiers: Partial<FactorVector>;
			dr_modifier: number;
			healing_modifier: number;
		},
		input: {} as BuffInput,
		events: {} as TickEvent | DispelEvent,
	},
}).createMachine({
	id: "buff",
	initial: "on",
	context: ({ input }) => ({
		id: input.id,
		remaining: input.duration,
		target: input.target,
		modifiers: input.modifiers,
		dr_modifier: input.dr_modifier,
		healing_modifier: input.healing_modifier,
	}),
	states: {
		on: {
			on: {
				TICK: [
					{
						guard: ({ context, event }) =>
							context.remaining - event.dt <= 0,
						target: "off",
						actions: assign({ remaining: 0 }),
					},
					{
						actions: assign({
							remaining: ({ context, event }) =>
								context.remaining - event.dt,
						}),
					},
				],
				DISPEL: { target: "off" },
			},
		},
		off: {
			type: "final",
		},
	},
});
