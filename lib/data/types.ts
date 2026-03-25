/**
 * YAML Data Contract — shared by parser and simulator.
 *
 * These types describe the shape of:
 *   - data/yaml/books.yaml (BookData)
 *   - data/yaml/affixes.yaml (AffixSection)
 *
 * Parser writes this shape. Simulator reads it. Neither depends on the other.
 */

import type { Effect, EffectWithMeta } from "../parser/schema/effects.js";

export type { Effect, EffectWithMeta };

/** @deprecated Use Effect from schema/effects.ts instead */
export type EffectRow = EffectWithMeta;

export interface AffixSection {
	name: string;
	effects: EffectWithMeta[];
}

export interface StateDef {
	target: "self" | "opponent" | "both";
	duration: number | "permanent";
	max_stacks?: number;
	trigger?: "on_cast" | "on_attacked" | "per_tick";
	chance?: number;
	dispellable?: boolean;
	children?: string[];
	per_hit_stack?: boolean;
	/** Unresolved variable reference for max_stacks — internal, resolved by pipeline */
	_max_stacks_var?: string;
	/** Unresolved variable reference for duration — internal, resolved by pipeline */
	_duration_var?: string;
}

/** Intermediate parsed book — used by parser pipeline before YAML emission */
export interface ParsedBook {
	school: string;
	skillText?: string;
	affixText?: string;
	exclusiveAffixText?: string;
	states?: Record<string, StateDef>;
	skill: EffectWithMeta[];
	primaryAffix?: { name: string; effects: EffectWithMeta[] };
	exclusiveAffix?: { name: string; effects: EffectWithMeta[] };
}

/** Per-book parsed data — one entry in books.yaml */
export interface BookData {
	school: string;
	/** Raw skill description from source prose */
	skill_text?: string;
	/** Raw primary affix description from source prose (主书.md) */
	affix_text?: string;
	/** Raw exclusive affix description from source prose (专属词缀.md) */
	exclusive_affix_text?: string;
	states?: Record<string, StateDef>;
	skill?: EffectWithMeta[];
	primary_affix?: AffixSection;
	exclusive_affix?: AffixSection;
}
