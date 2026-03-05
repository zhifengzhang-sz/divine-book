/**
 * Registry — single source of truth for all effect types and groups.
 *
 * Derives EffectSchema (Zod discriminated union) and GroupsOutput
 * from the registered effect type definitions.
 */

import { z } from "zod";
import type { EffectTypeDef, GroupDef } from "./types.js";
import { ALL_EFFECT_DEFS } from "./effects/index.js";
import { GROUPS } from "./groups.js";

export interface GroupsOutput {
	groups: Array<{
		id: string;
		section: string;
		label: string;
		types: string[];
	}>;
}

export class Registry {
	private defs: Map<string, EffectTypeDef>;
	private _groups: GroupDef[];
	private _effectSchema: z.ZodDiscriminatedUnion<string, z.ZodObject<any>[]> | null = null;

	constructor(defs: EffectTypeDef[], groups: GroupDef[]) {
		this.defs = new Map(defs.map((d) => [d.type, d]));
		this._groups = groups;
	}

	get size(): number {
		return this.defs.size;
	}

	get groups(): GroupDef[] {
		return this._groups;
	}

	getType(type: string): EffectTypeDef | undefined {
		return this.defs.get(type);
	}

	get allTypes(): EffectTypeDef[] {
		return [...this.defs.values()];
	}

	/** Derives z.discriminatedUnion from all registered schemas */
	get effectSchema(): z.ZodDiscriminatedUnion<string, z.ZodObject<any>[]> {
		if (!this._effectSchema) {
			const schemas = [...this.defs.values()].map((d) => d.schema as z.ZodObject<any>);
			this._effectSchema = z.discriminatedUnion(
				"type",
				schemas as [z.ZodObject<any>, ...z.ZodObject<any>[]],
			);
		}
		return this._effectSchema;
	}

	/** Derives GroupsOutput matching groups.yaml format */
	get groupsOutput(): GroupsOutput {
		return {
			groups: this._groups.map((g) => ({
				id: g.id,
				section: g.section,
				label: g.label,
				types: [...this.defs.values()]
					.filter((d) => d.group === g.id)
					.map((d) => d.type),
			})),
		};
	}

	/** Structural validation — returns error messages */
	validate(): string[] {
		const errors: string[] = [];
		const groupIds = new Set(this._groups.map((g) => g.id));

		for (const d of this.defs.values()) {
			if (!groupIds.has(d.group)) {
				errors.push(
					`Effect type "${d.type}" references unknown group "${d.group}"`,
				);
			}
		}

		for (const g of this._groups) {
			const types = [...this.defs.values()].filter(
				(d) => d.group === g.id,
			);
			if (types.length === 0) {
				errors.push(`Group "${g.id}" has no effect types`);
			}
		}

		// Check for duplicate type names
		const seen = new Set<string>();
		for (const d of this.defs.values()) {
			if (seen.has(d.type)) {
				errors.push(`Duplicate effect type "${d.type}"`);
			}
			seen.add(d.type);
		}

		return errors;
	}
}

/** Singleton registry constructed from all effect type definitions */
export const registry = new Registry(ALL_EFFECT_DEFS, GROUPS);
