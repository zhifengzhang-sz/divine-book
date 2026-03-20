/**
 * YAML Data Contract — shared by parser and simulator.
 *
 * These types describe the shape of:
 *   - data/yaml/books.yaml (BookData)
 *   - data/yaml/affixes.yaml (AffixSection)
 *
 * Parser writes this shape. Simulator reads it. Neither depends on the other.
 */

/** A single effect row — type + arbitrary fields */
export type EffectRow = { type: string; [k: string]: unknown };

export interface AffixSection {
	name: string;
	effects: EffectRow[];
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
	/** Unresolved variable reference for max_stacks — internal, resolved by split.ts */
	_max_stacks_var?: string;
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
	skill?: EffectRow[];
	primary_affix?: AffixSection;
	exclusive_affix?: AffixSection;
}
