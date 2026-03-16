/**
 * Handler Registry — entry point.
 *
 * Imports all handler modules (which register themselves via registry.ts),
 * then re-exports the resolve function.
 */

import type { EffectRow } from "../../data/types.js";
import { getHandler, hasHandler, registeredTypes } from "./registry.js";
import type { HandlerContext, HandlerResult } from "./types.js";

// Import all handler modules — triggers registration via registry.ts
import "./damage.js";
import "./buff.js";
import "./debuff.js";
import "./dot.js";
import "./shield.js";
import "./healing.js";
import "./cost.js";
import "./escalation.js";
import "./resonance.js";
import "./multiplier.js";

const warned = new Set<string>();

export function resolve(
	effect: EffectRow,
	ctx: HandlerContext,
): HandlerResult | null {
	const handler = getHandler(effect.type);
	if (!handler) {
		if (!warned.has(effect.type)) {
			console.warn(
				`[sim] No handler for effect type: ${effect.type} (skipped)`,
			);
			warned.add(effect.type);
		}
		return null;
	}
	return handler(effect, ctx);
}

export { hasHandler, registeredTypes };
