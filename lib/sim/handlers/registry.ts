/**
 * Handler registry — separated from index.ts to avoid circular imports.
 * Handler modules import `register` from here.
 * index.ts imports handler modules and re-exports `resolve`.
 */

import type { EffectRow } from "../../data/types.js";
import type { Handler, HandlerContext, HandlerResult } from "./types.js";

const registry = new Map<string, Handler>();

/**
 * Register a handler with schema-typed effect.
 * Use the generic form for schema-typed handlers:
 *   register<HealReduction>("heal_reduction", (effect) => { ... })
 * Use the untyped form for legacy handlers (to be migrated):
 *   register("debuff", (effect) => { ... })
 */
export function register<E extends { type: string } = EffectRow>(
	type: E extends EffectRow ? string : E["type"],
	handler: (effect: E, ctx: HandlerContext) => HandlerResult,
): void {
	registry.set(type as string, handler as Handler);
}

export function getHandler(type: string): Handler | undefined {
	return registry.get(type);
}

export function hasHandler(type: string): boolean {
	return registry.has(type);
}

export function registeredTypes(): string[] {
	return [...registry.keys()];
}
