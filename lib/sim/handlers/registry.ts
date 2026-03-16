/**
 * Handler registry — separated from index.ts to avoid circular imports.
 * Handler modules import `register` from here.
 * index.ts imports handler modules and re-exports `resolve`.
 */

import type { Handler } from "./types.js";

const registry = new Map<string, Handler>();

export function register(type: string, handler: Handler): void {
	registry.set(type, handler);
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
