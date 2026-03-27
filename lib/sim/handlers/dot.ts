/**
 * DoT handler: dot
 *
 * Untyped: handler reads `name`, schema (春黎剑阵.Dot) has `state`.
 */

import type { Dot } from "../../parser/schema/effects.js";
import { register } from "./registry.js";

// dot — schema: lib/parser/schema/effects.ts (Dot)
// Creates a periodic damage debuff on the opponent.
// damage_per_tick is in %ATK units (e.g., 550 = 550% ATK).
register<Dot>("dot", (effect, ctx) => ({
	intents: [
		{
			type: "APPLY_DOT" as const,
			name: (effect.name as string) ?? "dot",
			damagePerTick: ((effect.damage_per_tick as number) / 100) * ctx.atk,
			tickInterval: effect.tick_interval as number,
			duration: effect.duration as number,
			source: "",
		},
	],
}));
