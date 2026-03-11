/**
 * Domain type interfaces — EffectTypeDef, GroupDef, FieldDef.
 */

import type { z } from "zod";
import type { Attr, ExecTarget, Scope, TargetCategory, Trigger, Unit, Zone } from "./enums.js";

/** Metadata for a single field in an effect type */
export interface FieldDef {
	name: string;
	unit: Unit;
	optional?: boolean;
}

/** Executable specification — what this effect does to entity attributes */
export interface ExecSpec {
	/** When this effect activates */
	trigger: Trigger;
	/** Primary target of the effect */
	target: ExecTarget;
	/** State dependencies: attributes read from entities at execution time.
	 *  Format: "entity.attr" e.g. "self.hp", "opponent.state" */
	reads?: string[];
	/** Attributes written/mutated by this effect.
	 *  Format: "entity.attr" e.g. "opponent.hp", "self.atk" */
	writes: string[];
}

/** Complete definition of an effect type — wraps a Zod schema with metadata */
export interface EffectTypeDef {
	type: string;
	schema: z.ZodTypeAny;
	group: string;
	/** Classification layer — which factor zone this feeds in the static model */
	zones: Zone[];
	scope: Scope;
	patterns: string[];
	fields: FieldDef[];
	/** Execution layer — what this effect does to combat attributes */
	exec: ExecSpec;
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
