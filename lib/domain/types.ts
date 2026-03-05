/**
 * Domain type interfaces — EffectTypeDef, GroupDef, FieldDef.
 */

import type { z } from "zod";
import type { Scope, TargetCategory, Unit, Zone } from "./enums.js";

/** Metadata for a single field in an effect type */
export interface FieldDef {
	name: string;
	unit: Unit;
	optional?: boolean;
}

/** Complete definition of an effect type — wraps a Zod schema with metadata */
export interface EffectTypeDef {
	type: string;
	schema: z.ZodTypeAny;
	group: string;
	zones: Zone[];
	scope: Scope;
	patterns: string[];
	fields: FieldDef[];
	notes?: string;
}

/** Operator binding: what an affix outputs, provides, and requires.
 *  See domain.category.md §Target Categories. */
export interface Binding {
	/** Effect types this affix produces (from effects.yaml) */
	outputs: string[];
	/** Target categories provided (derived from outputs) */
	provides: TargetCategory[];
	requires: TargetCategory[] | "free";
}

/** Definition of an effect group (§0–§13) */
export interface GroupDef {
	id: string;
	section: string;
	label: string;
	primaryZones: Zone[];
}
