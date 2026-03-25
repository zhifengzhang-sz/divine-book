/**
 * Handler Registry — entry point.
 *
 * Imports all handler modules (which register themselves via registry.ts),
 * then re-exports the resolve function.
 */

import type { EffectWithMeta } from "../../parser/schema/effects.js";
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
import "./misc.js";

export class MissingHandlerError extends Error {
	constructor(type: string) {
		super(
			`No handler for effect type: "${type}". Cannot simulate — all effects must be handled.`,
		);
		this.name = "MissingHandlerError";
	}
}

/**
 * Resolve an effect through its handler.
 * Returns { result, error }. Never throws.
 * If the handler is missing, result is empty and error describes the gap.
 */
export function resolve(
	effect: EffectWithMeta,
	ctx: HandlerContext,
): { result: HandlerResult; error?: string } {
	const handler = getHandler(effect.type);
	if (!handler) {
		return {
			result: {},
			error: `No handler for effect type: "${effect.type}". Effect skipped.`,
		};
	}
	try {
		return { result: handler(effect, ctx) };
	} catch (e) {
		return {
			result: {},
			error: `Handler "${effect.type}" threw: ${(e as Error).message}`,
		};
	}
}

export { hasHandler, registeredTypes };
