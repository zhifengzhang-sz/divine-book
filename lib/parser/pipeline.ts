/**
 * Pipeline orchestrator — reactive three-stage parser.
 *
 * Wraps the XState v5 pipeline machine (reactive.ts) and handles:
 * - Book-specific overrides (天魔降临咒, 惊蜇化龙)
 * - Pre-processing (splitCell, affix prefix stripping)
 * - Post-processing (tier resolution, base tier synthesis)
 * - Output adaptation (reactive types → viz-compatible types)
 *
 * Public API unchanged: runPipeline() returns PipelineResult.
 */

import type { EffectRow, StateDef } from "../data/types.js";
import type { GroupEvent as ReactiveGroupEvent } from "./context.js";
import { splitCell, type TierLine } from "./md-table.js";
import { runReactivePipeline } from "./reactive.js";
import type { TokenEvent as ReactiveTokenEvent } from "./reader.js";
import { buildStateRegistry } from "./states.js";
import { buildDataState, resolveFields } from "./tiers.js";

// ── Types (viz-compatible, preserved from old pipeline) ──

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

export interface PipelineResult {
	tokens: TokenEvent[];
	groups: GroupEvent[];
	effects: EffectRow[];
	tiers: TierLine[];
	states: Record<string, StateDef>;
	errors: string[];
}

export type SourceType = "skill" | "exclusive" | "school" | "universal";

// ── Book-specific overrides ──────────────────────────────

const BOOK_OVERRIDES: Record<
	string,
	(cell: ReturnType<typeof splitCell>) => EffectRow[]
> = {
	天魔降临咒: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		return [
			{ type: "base_attack", hits: 5, total: tier.vars.x } as EffectRow,
			{
				type: "self_buff",
				name: "结魂锁链",
				damage_reduction: tier.vars.y,
				duration: "permanent",
				max_stacks: 1,
			} as EffectRow,
			{
				type: "debuff",
				name: "结魂锁链",
				target: "damage_reduction",
				value: -tier.vars.z,
				duration: "permanent",
			} as EffectRow,
			{
				type: "per_debuff_stack_damage",
				per_n_stacks: 1,
				value: tier.vars.w,
				max: tier.vars.u,
				parent: "结魂锁链",
			} as EffectRow,
		];
	},
	惊蜇化龙: (cell) => {
		const tier = cell.tiers[0];
		if (!tier) return [];
		const { x, y, z } = tier.vars;
		return [
			{ type: "self_hp_cost", value: x >= 100 ? "x" : x } as EffectRow,
			{ type: "base_attack", hits: 8, total: x } as EffectRow,
			{ type: "self_lost_hp_damage", value: y } as EffectRow,
			{
				type: "self_buff",
				skill_damage_increase: z,
				duration: 4,
			} as EffectRow,
		];
	},
};

// ── Pipeline ─────────────────────────────────────────────

export function runPipeline(
	sourceType: SourceType,
	text: string,
	bookName?: string,
): PipelineResult {
	const errors: string[] = [];

	try {
		if (sourceType === "skill") {
			return runSkillPipeline(text, bookName, errors);
		}
		return runAffixPipeline(text, errors);
	} catch (err) {
		errors.push(err instanceof Error ? err.message : String(err));
		return {
			tokens: [],
			groups: [],
			effects: [],
			tiers: [],
			states: {},
			errors,
		};
	}
}

function runSkillPipeline(
	text: string,
	bookName: string | undefined,
	errors: string[],
): PipelineResult {
	const cell = splitCell(text.replace(/\n/g, "<br>"));
	const joinedDesc = cell.description.join("，");

	// Book-specific overrides bypass the reactive pipeline
	if (bookName && BOOK_OVERRIDES[bookName]) {
		const effects = BOOK_OVERRIDES[bookName](cell);
		const states = buildStateRegistry(cell.description);
		resolveStateVars(states, cell);
		return {
			tokens: [],
			groups: [],
			effects,
			tiers: cell.tiers,
			states,
			errors,
		};
	}

	// Run reactive pipeline
	const result = runReactivePipeline(joinedDesc, "skill", bookName);

	// States from reactive pipeline context listener
	const states = { ...result.states };
	resolveStateVars(states, cell);

	// Collect diagnostics as errors
	for (const d of result.diagnostics) {
		if (d.level === "warn") errors.push(d.message);
	}

	// Adapt reactive types to viz-compatible types
	const tokens = adaptTokens(result.tokens);
	const groups = adaptGroups(result.groups);

	// Post-process: tier resolution
	const effects = expandTiers(result.effects, cell, states);

	return { tokens, groups, effects, tiers: cell.tiers, states, errors };
}

function runAffixPipeline(text: string, errors: string[]): PipelineResult {
	const cell = splitCell(text.replace(/\n/g, "<br>"));
	const rawText = cell.description.join("，");
	const cleanText = rawText.replace(/^【.+?】[：:]/, "");

	// Run reactive pipeline
	const result = runReactivePipeline(cleanText, "affix");

	// States from reactive pipeline context listener
	const states = { ...result.states };
	resolveStateVars(states, cell);

	for (const d of result.diagnostics) {
		if (d.level === "warn") errors.push(d.message);
	}

	const tokens = adaptTokens(result.tokens);
	const groups = adaptGroups(result.groups);

	// Post-process: tier resolution
	const effects = expandTiers(result.effects, cell, states);

	return { tokens, groups, effects, tiers: cell.tiers, states, errors };
}

// ── Tier resolution (post-processing) ────────────────────

function expandTiers(
	rawEffects: EffectRow[],
	cell: ReturnType<typeof splitCell>,
	_states: Record<string, StateDef>,
): EffectRow[] {
	const tiers = cell.tiers;
	const noEnlightenment = /数据为没有悟境/.test(cell.description.join("，"));

	if (tiers.length === 0) {
		// No tier data — resolve with empty vars
		const effects: EffectRow[] = [];
		for (const effect of rawEffects) {
			const resolved = resolveFields(extractFields(effect), {});
			const extra: Record<string, unknown> = {};
			if (noEnlightenment) extra.data_state = "enlightenment=0";
			effects.push({
				type: effect.type,
				...stripType(effect),
				...resolved,
				...extra,
			} as EffectRow);
		}
		return effects;
	}

	const effects: EffectRow[] = [];
	for (const tier of tiers) {
		if (tier.locked) {
			effects.push({
				type: rawEffects[0]?.type ?? "base_attack",
				data_state: "locked",
			} as EffectRow);
			continue;
		}

		const ds = buildDataState(tier);
		for (const effect of rawEffects) {
			const resolved = resolveFields(extractFields(effect), tier.vars);
			const extra: Record<string, unknown> = {};
			if (noEnlightenment) extra.data_state = "enlightenment=0";
			else if (ds !== undefined) extra.data_state = ds;
			effects.push({
				type: effect.type,
				...stripType(effect),
				...resolved,
				...extra,
			} as EffectRow);
		}
	}

	// Ensure base tier exists
	ensureBaseTier(effects, rawEffects);

	return effects;
}

/** Extract fields that may contain variable references for resolution. */
function extractFields(effect: EffectRow): Record<string, string | number> {
	const fields: Record<string, string | number> = {};
	for (const [k, v] of Object.entries(effect)) {
		if (k === "type") continue;
		if (typeof v === "string" || typeof v === "number") {
			fields[k] = v;
		}
	}
	return fields;
}

/** Strip the 'type' field from an effect for merging. */
function stripType(effect: EffectRow): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(effect)) {
		if (k === "type") continue;
		out[k] = v;
	}
	return out;
}

const BASE_SKILL_TOTAL = 1500;

function ensureBaseTier(effects: EffectRow[], _rawEffects: EffectRow[]): void {
	const baseAttacks = effects.filter((e) => e.type === "base_attack");
	if (baseAttacks.length === 0) return;

	const hasAccessibleBase = baseAttacks.some((e) => {
		const ds = e.data_state;
		if (!ds) return true;
		if (ds === "locked") return false;
		const entries = Array.isArray(ds) ? ds : [ds];
		return !entries.some(
			(s) => typeof s === "string" && s.startsWith("fusion="),
		);
	});
	if (hasAccessibleBase) return;

	const firstReal = baseAttacks.find((e) => e.data_state !== "locked");
	if (!firstReal) return;

	const hasLockedTier = baseAttacks.some((e) => e.data_state === "locked");
	const minEnlightenment = hasLockedTier ? 1 : 0;

	const hits = (firstReal.hits as number) ?? 1;

	if ((firstReal.total as number) === BASE_SKILL_TOTAL) {
		firstReal.data_state = `enlightenment=${minEnlightenment}`;
		return;
	}

	const baseTier: EffectRow = {
		type: "base_attack",
		hits,
		total: BASE_SKILL_TOTAL,
	};
	if (minEnlightenment > 0) {
		baseTier.data_state = `enlightenment=${minEnlightenment}`;
	} else {
		baseTier.data_state = "enlightenment=0";
	}

	const insertIdx = effects.indexOf(firstReal);
	effects.splice(insertIdx, 0, baseTier);
}

// ── State variable resolution ────────────────────────────

function resolveStateVars(
	states: Record<string, StateDef>,
	cell: ReturnType<typeof splitCell>,
): void {
	if (cell.tiers.length > 0) {
		const tierVars = cell.tiers[0]?.vars ?? {};
		for (const sDef of Object.values(states)) {
			const varRef = sDef._max_stacks_var;
			if (typeof varRef === "string" && tierVars[varRef] !== undefined) {
				sDef.max_stacks = tierVars[varRef];
			}
			delete sDef._max_stacks_var;
		}
	}
}

// ── Type adapters (reactive → viz) ───────────────────────

function adaptTokens(tokens: ReactiveTokenEvent[]): TokenEvent[] {
	return tokens.map((t, i) => ({
		name: t.term,
		type: t.term,
		fields: t.captures as Record<string, string | number>,
		order: i,
		matchedText: t.raw,
	}));
}

function adaptGroups(groups: ReactiveGroupEvent[]): GroupEvent[] {
	return groups.map((g, i) => ({
		primary: g.primary.term,
		stateName: g.parentState,
		modifiers: g.modifiers.map((m) => m.term),
		tokenIndices: [i],
	}));
}
