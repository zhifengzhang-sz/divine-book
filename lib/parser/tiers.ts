/**
 * Layer: Tier Resolution
 *
 * Parses tier lines from <br>-split cells and substitutes variables
 * into extracted effect fields to produce rows with data_state.
 */

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
export function buildDataState(tier: TierSpec): undefined | string | string[] {
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
		} else if (
			typeof val === "string" &&
			val.startsWith("-") &&
			vars[val.slice(1)] !== undefined
		) {
			// Negated variable reference: "-x" → -vars.x
			out[key] = -vars[val.slice(1)];
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
