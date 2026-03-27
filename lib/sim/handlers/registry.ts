/**
 * Handler registry — separated from index.ts to avoid circular imports.
 * Handler modules import `register` from here.
 * index.ts imports handler modules and re-exports `resolve`.
 */

import type { EffectWithMeta } from "../../parser/schema/effects.js";
import type { Handler, HandlerContext, HandlerResult } from "./types.js";

const registry = new Map<string, Handler>();
const invoked = new Set<string>();

/**
 * Register a handler with schema-typed effect.
 * Use the generic form for schema-typed handlers:
 *   register<HealReduction>("heal_reduction", (effect) => { ... })
 * Use the untyped form for legacy handlers (to be migrated):
 *   register("debuff", (effect) => { ... })
 */
export function register<E extends { type: string } = EffectWithMeta>(
	type: E extends EffectWithMeta ? string : E["type"],
	handler: (effect: E, ctx: HandlerContext) => HandlerResult,
): void {
	registry.set(type as string, handler as Handler);
}

export function getHandler(type: string): Handler | undefined {
	const handler = registry.get(type);
	if (handler) invoked.add(type);
	return handler;
}

export function hasHandler(type: string): boolean {
	return registry.has(type);
}

export function registeredTypes(): string[] {
	return [...registry.keys()];
}

/** Return which registered handlers were invoked since last reset. */
export function invokedTypes(): string[] {
	return [...invoked];
}

/** Reset invocation tracking (call between sim runs). */
export function resetCoverage(): void {
	invoked.clear();
}
