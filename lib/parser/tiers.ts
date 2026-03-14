/**
 * Layer: Tier Resolution
 *
 * Parses tier lines from <br>-split cells and substitutes variables
 * into extracted effect fields to produce rows with data_state.
 */

import type { TierLine } from "./md-table.js";

export interface TierSpec {
	enlightenment?: number;
	fusion?: number;
	locked?: boolean;
	vars: Record<string, number>;
}

/**
 * Build data_state from tier spec.
 * Returns undefined if no progression qualifier, "locked" for locked tiers.
 */
export function buildDataState(
	tier: TierSpec,
): undefined | string | string[] {
	if (tier.locked) return "locked";

	const parts: string[] = [];
	if (tier.enlightenment !== undefined) {
		parts.push(`enlightenment=${tier.enlightenment}`);
	}
	if (tier.fusion !== undefined) {
		parts.push(`fusion=${tier.fusion}`);
	}

	if (parts.length === 0) return undefined;
	if (parts.length === 1) return parts[0];
	return parts;
}

/**
 * Substitute tier variables into a template string.
 * Template uses {x}, {y}, etc. placeholders.
 * Returns the string with numeric values substituted.
 */
export function substituteVars(
	template: string,
	vars: Record<string, number>,
): string {
	return template.replace(/\{(\w+)\}/g, (_, key) => {
		return vars[key] !== undefined ? String(vars[key]) : `{${key}}`;
	});
}

/**
 * Given a set of extracted field values (with variable references)
 * and tier variables, produce resolved numeric values.
 *
 * Field values can be:
 * - A number literal (already resolved)
 * - A variable name like "x" that maps to a tier var
 */
export function resolveFields(
	fields: Record<string, string | number>,
	vars: Record<string, number>,
): Record<string, number | string | boolean> {
	const out: Record<string, number | string | boolean> = {};
	for (const [key, val] of Object.entries(fields)) {
		if (typeof val === "number") {
			out[key] = val;
		} else if (typeof val === "string" && vars[val] !== undefined) {
			out[key] = vars[val];
		} else if (typeof val === "string") {
			const n = Number(val);
			if (!Number.isNaN(n) && val !== "") {
				out[key] = n;
			} else {
				out[key] = val;
			}
		}
	}
	return out;
}

/**
 * Expand an effect template across multiple tiers.
 * Returns one effect row per tier (or one if no tiers).
 */
export function expandTiers(
	baseFields: Record<string, string | number>,
	type: string,
	tiers: TierLine[],
	extraFields?: Record<string, unknown>,
): Record<string, unknown>[] {
	if (tiers.length === 0) {
		// No tier data — resolve with empty vars
		const resolved = resolveFields(baseFields, {});
		return [{ type, ...resolved, ...(extraFields || {}) }];
	}

	const results: Record<string, unknown>[] = [];
	for (const tier of tiers) {
		if (tier.locked) {
			results.push({
				type,
				data_state: "locked",
				...(extraFields || {}),
			});
			continue;
		}

		const resolved = resolveFields(baseFields, tier.vars);
		const ds = buildDataState(tier);
		results.push({
			type,
			...resolved,
			...(ds !== undefined ? { data_state: ds } : {}),
			...(extraFields || {}),
		});
	}

	return results;
}
