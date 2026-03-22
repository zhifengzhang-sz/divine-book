/**
 * Client-side type definitions for the pipeline API response.
 * Mirrors the shapes from lib/parser/pipeline.ts and lib/data/types.ts,
 * but without importing the server-side modules.
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

/** Raw reactive token from XState pipeline */
export interface ReactiveToken {
	term: string;
	raw: string;
	captures: Record<string, string>;
	position: number;
	scope?: string;
}

/** Raw reactive group from XState pipeline */
export interface ReactiveGroup {
	primary: ReactiveToken;
	modifiers: ReactiveToken[];
	parentState?: string;
	scope: string;
}

/** XState emitted event */
export type XStateEvent =
	| { type: "TOKEN"; token: ReactiveToken }
	| { type: "GROUP"; group: ReactiveGroup }
	| { type: "EFFECT"; effect: EffectRow }
	| {
			type: "DIAGNOSTIC";
			diagnostic: { level: string; message: string; term?: string };
	  };

export interface PipelineResult {
	tokens: TokenEvent[];
	groups: GroupEvent[];
	effects: EffectRow[];
	tiers: TierLine[];
	states: Record<string, StateDef>;
	errors: string[];
	/** XState emitted events from the reactive pipeline */
	xstate?: XStateEvent[];
}
