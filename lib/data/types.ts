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
}

/** Per-book parsed data — one entry in books.yaml */
export interface BookData {
	school: string;
	states?: Record<string, StateDef>;
	skill?: EffectRow[];
	primary_affix?: AffixSection;
	exclusive_affix?: AffixSection;
}
