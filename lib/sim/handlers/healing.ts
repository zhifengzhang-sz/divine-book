/**
 * Healing handlers: lifesteal, self_heal, heal_echo_damage
 */

import type { StateInstance } from "../types.js";
import { register } from "./registry.js";

// lifesteal: { value (percent), parent? }
// Heals for `value`% of damage dealt.
register("lifesteal", (effect) => ({
	intents: [
		{
			type: "LIFESTEAL" as const,
			percent: effect.value as number,
			damageDealt: 0, // filled in at resolution time
		},
	],
}));

// self_heal: { value } or { per_tick, total, tick_interval, name }
// Two forms:
//   Instant: heals value% ATK immediately → HEAL event
//   Per-tick: creates a named state that heals per tick
register("self_heal", (effect, ctx) => {
	// Per-tick form: creates a named state with periodic healing
	if (effect.per_tick !== undefined) {
		const name = effect.name as string;
		const perTick = effect.per_tick as number;
		const tickInterval = effect.tick_interval as number;
		const total = effect.total as number;
		const duration = (total / perTick) * tickInterval;
		const healPerTick = (perTick / 100) * ctx.atk;

		const state: StateInstance = {
			name,
			kind: "named",
			source: "",
			target: "self",
			effects: [],
			remainingDuration: duration,
			stacks: 1,
			maxStacks: 1,
			dispellable: true,
			trigger: "per_tick",
		};

		// Register a listener: on each tick of this named state, heal
		return {
			intents: [{ type: "APPLY_STATE" as const, state }],
			listeners: [
				{
					parent: name,
					trigger: "per_tick" as const,
					handler: (_listenerCtx) => [
						{ type: "HEAL" as const, value: healPerTick },
					],
				},
			],
		};
	}

	// Instant form: heals value% ATK
	const healValue = ((effect.value as number) / 100) * ctx.atk;
	return {
		intents: [{ type: "HEAL" as const, value: healValue }],
	};
});

// heal_echo_damage: { ratio }
// When healing occurs, echo ratio × heal amount as damage to opponent.
// This is a reactive listener that subscribes to HEAL events.
// We use the "on_apply" trigger with a special parent "__heal__" convention
// — the player machine recognizes this and fires it on every HEAL resolution.
register("heal_echo_damage", (effect, _ctx) => {
	const ratio = effect.ratio as number;

	return {
		listeners: [
			{
				parent: "__heal__",
				trigger: "per_tick" as const, // fires on each heal event
				handler: (listenerCtx) => {
					// The heal amount is passed via the listener context
					// For now, we compute based on the source player's last heal
					// This will be wired properly when the player machine
					// handles heal echo by passing the heal amount through
					const healAmount = (listenerCtx.sourcePlayer.maxHp * ratio) / 100;
					return [
						{
							type: "HIT" as const,
							hitIndex: 0,
							damage: healAmount,
							spDamage: 0,
						},
					];
				},
			},
		],
	};
});
