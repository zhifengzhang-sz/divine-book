/**
 * Client-side type definitions for the pipeline API response.
 */

export type SourceType = "skill" | "exclusive" | "school" | "universal";

export interface TokenEvent {
	name: string;
	type: string;
	fields: Record<string, string | number>;
	meta?: Record<string, unknown>;
	order: number;
	matchedText?: string;
}

export interface GroupEvent {
	primary: string;
	stateName?: string;
	modifiers: string[];
	tokenIndices: number[];
}

export interface TierLine {
	raw: string;
	enlightenment?: number;
	fusion?: number;
	locked?: boolean;
	vars: Record<string, number>;
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

export type EffectRow = { type: string; [k: string]: unknown };

export interface ParseTreeNode {
	rule: string;
	text?: string;
	children?: (ParseTreeNode | ParseTreeNode[])[];
}

export interface PipelineResult {
	tokens: TokenEvent[];
	groups: GroupEvent[];
	effects: EffectRow[];
	tiers: TierLine[];
	states: Record<string, StateDef>;
	errors: string[];
	// New grammar system fields
	ohmSource?: string;
	semanticsSource?: string;
	parseTree?: ParseTreeNode;
}
