/**
 * State handlers: state_add, state_ref
 *
 * These create or reference named states (buffs/debuffs) on self or opponent.
 * state_add is used by 13 books. state_ref by 7 books.
 */

import { register } from "./registry.js";

// state_add: { state, count?, per_hit?, undispellable?, duration?, permanent?, max_stacks? }
// Creates a named state on self. The actual stat effects come from an accompanying
// self_buff or counter_buff effect — state_add just establishes the state identity.
register("state_add", (effect) => {
	const permanent = effect.permanent as boolean | undefined;
	const duration = permanent
		? Number.POSITIVE_INFINITY
		: (effect.duration as number) ?? Number.POSITIVE_INFINITY;

	return {
		intents: [
			{
				type: "APPLY_STATE" as const,
				state: {
					name: effect.state as string,
					kind: "named" as const,
					source: "",
					target: "self" as const,
					effects: [],
					remainingDuration: duration,
					stacks: Number(effect.count ?? 1),
					maxStacks: Number(effect.max_stacks ?? 999),
					dispellable: !(effect.undispellable ?? false),
				},
			},
		],
	};
});

// state_ref: { state, duration?, max_stacks?, trigger? }
// References a named state — marker for the sim to track.
// Like state_add but the state usually has its effects defined by
// an adjacent self_buff/debuff effect in the same skill.
register("state_ref", (effect) => {
	const duration = Number(effect.duration ?? Number.POSITIVE_INFINITY);

	return {
		intents: [
			{
				type: "APPLY_STATE" as const,
				state: {
					name: effect.state as string,
					kind: "named" as const,
					source: "",
					target: "self" as const,
					effects: [],
					remainingDuration: duration,
					stacks: 1,
					maxStacks: Number(effect.max_stacks ?? 1),
					dispellable: true,
				},
			},
		],
	};
});
