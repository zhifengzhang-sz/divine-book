/**
 * Time-series factor model — temporal evaluation of divine books.
 *
 * Extends the static factor vector into a time-varying vec(t) per second,
 * then aggregates to produce a time-averaged book vector and slot coverage.
 *
 * Reads model.yaml directly (same as model-data.ts) but consumes fields
 * that the static pipeline ignores: temporal[], modifier_value, summon.
 *
 * Spec: docs/model/impl.time-series.md
 */

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";

// ---------------------------------------------------------------------------
// Model data loader (same source as model-data.ts)
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "../..");
const modelPath = join(ROOT, "data/yaml/model.yaml");

let _model: any = null;

function getModel(): any {
	if (!_model) {
		_model = parseYaml(readFileSync(modelPath, "utf-8"));
	}
	return _model;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemporalEvent {
	t_start: number;
	duration: number;       // seconds (Infinity for permanent)
	factor: string;         // e.g., "S_coeff", "M_dmg"
	value: number;          // contribution while active
	source_type: string;    // effect type that produced this
}

export interface TemporalModifier {
	kind: "strength" | "duration";
	value: number;          // percentage points
	targets: string[];      // effect types this modifies
}

export interface SummonEnvelope {
	multiplier: number;     // e.g., 1.62
	duration: number;       // seconds
}

export interface TimeSeriesResult {
	platform: string;
	op1: string;
	op2: string;
	samples: Array<{ t: number; factors: Record<string, number> }>;
	averaged: Record<string, number>;
	T_active: number;
	slot_coverage: number;
	peak: Record<string, number>;
	static_baseline: Record<string, number>;
	summon: SummonEnvelope | null;
}

// ---------------------------------------------------------------------------
// Factor names — the complete set tracked by the model
// ---------------------------------------------------------------------------

const FACTOR_NAMES = [
	"D_base", "D_flat", "M_dmg", "M_skill", "M_final", "S_coeff",
	"D_res", "sigma_R", "M_synchro", "D_ortho",
	"H_A", "DR_A", "S_A", "H_red",
] as const;

// ---------------------------------------------------------------------------
// Modifier target mapping
// ---------------------------------------------------------------------------

const BUFF_STRENGTH_TARGETS = new Set([
	"self_buff", "counter_buff", "random_buff",
]);

const DEBUFF_STRENGTH_TARGETS = new Set([
	"debuff", "counter_debuff", "conditional_debuff", "cross_slot_debuff",
]);

const BUFF_DURATION_TARGETS = new Set([
	"self_buff", "counter_buff",
]);

// ---------------------------------------------------------------------------
// Collect effect entries for a book configuration
// ---------------------------------------------------------------------------

interface ModelEffect {
	type: string;
	factors?: Record<string, number>;
	temporal?: { duration: number; coverage_type: string };
	modifier_value?: number;
	summon?: { inherit_stats: number; duration: number; damage_increase: number };
}

/** Collect all model.yaml entries for a platform + two operator affixes */
function collectEffects(
	platformBook: string,
	op1Affix: string,
	op2Affix: string,
): ModelEffect[] {
	const model = getModel();
	const all: ModelEffect[] = [];

	// Platform skill + primary + exclusive
	const book = model.effects?.[platformBook];
	if (book) {
		if (book.skill) all.push(...book.skill);
		if (book.primary_affix) {
			for (const effects of Object.values(book.primary_affix))
				all.push(...(effects as ModelEffect[]));
		}
		if (book.exclusive_affix) {
			for (const effects of Object.values(book.exclusive_affix))
				all.push(...(effects as ModelEffect[]));
		}
	}

	// Operator affixes — search universal and school pools
	for (const affixName of [op1Affix, op2Affix]) {
		if (!affixName) continue;
		const found = findAffixEffects(model, affixName);
		if (found) all.push(...found);
	}

	return all;
}

function findAffixEffects(model: any, name: string): ModelEffect[] | null {
	if (model.universal_affixes?.[name]) return model.universal_affixes[name];
	for (const affixes of Object.values(model.school_affixes ?? {})) {
		if ((affixes as any)[name]) return (affixes as any)[name];
	}
	// Check book primary/exclusive
	for (const book of Object.values(model.effects ?? {})) {
		const b = book as any;
		if (b.primary_affix) {
			const n = Object.keys(b.primary_affix)[0];
			if (n === name) return b.primary_affix[n];
		}
		if (b.exclusive_affix) {
			const n = Object.keys(b.exclusive_affix)[0];
			if (n === name) return b.exclusive_affix[n];
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Event + modifier collection
// ---------------------------------------------------------------------------

export function collectTemporalEvents(effects: ModelEffect[]): TemporalEvent[] {
	const events: TemporalEvent[] = [];

	for (const e of effects) {
		if (!e.factors || !e.temporal) continue;
		// Only include effects with finite duration (truly temporal)
		if (e.temporal.coverage_type !== "duration_based") continue;
		if (e.temporal.duration <= 0) continue;

		for (const [factor, value] of Object.entries(e.factors)) {
			if (factor === "sigma_R" || factor === "D_res" || factor === "M_synchro") continue;
			events.push({
				t_start: 0,
				duration: e.temporal.duration,
				factor,
				value,
				source_type: e.type,
			});
		}
	}

	return events;
}

export function collectModifiers(effects: ModelEffect[]): TemporalModifier[] {
	const modifiers: TemporalModifier[] = [];

	for (const e of effects) {
		if (e.modifier_value == null) continue;

		switch (e.type) {
			case "buff_strength":
				modifiers.push({
					kind: "strength",
					value: e.modifier_value,
					targets: [...BUFF_STRENGTH_TARGETS],
				});
				break;
			case "debuff_strength":
				modifiers.push({
					kind: "strength",
					value: e.modifier_value,
					targets: [...DEBUFF_STRENGTH_TARGETS],
				});
				break;
			case "buff_duration":
				modifiers.push({
					kind: "duration",
					value: e.modifier_value,
					targets: [...BUFF_DURATION_TARGETS],
				});
				break;
			case "all_state_duration":
				// Targets ALL duration_based events
				modifiers.push({
					kind: "duration",
					value: e.modifier_value,
					targets: [], // empty = applies to all duration_based
				});
				break;
		}
	}

	return modifiers;
}

export function collectSummon(effects: ModelEffect[]): SummonEnvelope | null {
	let inherit_stats = 0;
	let duration = 0;
	let damage_increase = 0;

	for (const e of effects) {
		if (!e.summon) continue;
		if (e.summon.inherit_stats > 0) inherit_stats = e.summon.inherit_stats;
		if (e.summon.duration > 0) duration = e.summon.duration;
		if (e.summon.damage_increase > 0) damage_increase = e.summon.damage_increase;
	}

	if (inherit_stats === 0 || duration === 0) return null;

	const multiplier = (inherit_stats / 100) * (1 + damage_increase / 100);
	return { multiplier: round(multiplier), duration };
}

// ---------------------------------------------------------------------------
// Static baseline — factors from effects without temporal duration
// ---------------------------------------------------------------------------

export function collectStaticBaseline(effects: ModelEffect[]): Record<string, number> {
	const baseline: Record<string, number> = {};
	for (const f of FACTOR_NAMES) baseline[f] = f === "D_res" || f === "M_synchro" ? 1 : 0;

	for (const e of effects) {
		if (!e.factors) continue;

		// Skip effects that have temporal duration_based with duration > 0
		// (those are handled as temporal events)
		const isTemporal =
			e.temporal?.coverage_type === "duration_based" && e.temporal.duration > 0;

		if (isTemporal) continue;

		for (const [factor, value] of Object.entries(e.factors)) {
			if (factor === "D_res") {
				baseline.D_res *= value;
			} else if (factor === "M_synchro") {
				baseline.M_synchro = Math.max(baseline.M_synchro, value);
			} else if (factor === "sigma_R") {
				// Root-sum-of-squares handled separately if needed
				baseline.sigma_R = Math.sqrt((baseline.sigma_R ** 2) + (value ** 2));
			} else {
				baseline[factor] = (baseline[factor] ?? 0) + value;
			}
		}
	}

	return baseline;
}

// ---------------------------------------------------------------------------
// Modifier application
// ---------------------------------------------------------------------------

export function resolveModifiers(
	events: TemporalEvent[],
	modifiers: TemporalModifier[],
): TemporalEvent[] {
	return events.map(e => {
		let { value, duration } = e;

		for (const m of modifiers) {
			const matches = m.targets.length === 0 || m.targets.includes(e.source_type);
			if (!matches) continue;

			if (m.kind === "strength") {
				value = round(value * (1 + m.value / 100));
			} else if (m.kind === "duration") {
				duration = round(duration * (1 + m.value / 100));
			}
		}

		return { ...e, value, duration };
	});
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

export function sampleTimeSeries(
	staticBaseline: Record<string, number>,
	events: TemporalEvent[],
	summon: SummonEnvelope | null,
	T_active: number,
): Array<{ t: number; factors: Record<string, number> }> {
	const samples: Array<{ t: number; factors: Record<string, number> }> = [];

	for (let t = 0; t < T_active; t++) {
		const vec: Record<string, number> = { ...staticBaseline };

		for (const e of events) {
			if (t >= e.t_start && t < e.t_start + e.duration) {
				vec[e.factor] = (vec[e.factor] ?? 0) + e.value;
			}
		}

		// Summon: adds a clone that copies the base skill attack.
		// The clone inherits stats and gets damage_increase, but does NOT
		// trigger affix effects (DoTs, debuffs, buffs, etc.).
		// Only D_base is amplified: total = player + summon = D_base × (1 + multiplier).
		if (summon && t < summon.duration) {
			vec.D_base = round(vec.D_base * (1 + summon.multiplier));
		}

		samples.push({ t, factors: vec });
	}

	return samples;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function aggregateTimeSeries(
	samples: Array<{ t: number; factors: Record<string, number> }>,
	T_gap: number,
): { averaged: Record<string, number>; slot_coverage: number; peak: Record<string, number> } {
	const averaged: Record<string, number> = {};
	const peak: Record<string, number> = {};

	for (const f of FACTOR_NAMES) {
		averaged[f] = 0;
		peak[f] = -Infinity;
	}

	for (const s of samples) {
		for (const f of FACTOR_NAMES) {
			const v = s.factors[f] ?? 0;
			averaged[f] += v;
			if (v > peak[f]) peak[f] = v;
		}
	}

	const n = samples.length || 1;
	for (const f of FACTOR_NAMES) {
		averaged[f] = round(averaged[f] / n);
		if (peak[f] === -Infinity) peak[f] = 0;
	}

	const T_active = samples.length;
	const slot_coverage = Math.floor(T_active / T_gap);

	return { averaged, slot_coverage, peak };
}

// ---------------------------------------------------------------------------
// Top-level: evaluate a book
// ---------------------------------------------------------------------------

/** Default time gap between consecutive skill activations (seconds) */
const DEFAULT_T_GAP = 4;

export function evaluateBook(
	platformBook: string,
	op1Affix: string,
	op2Affix: string,
	T_gap: number = DEFAULT_T_GAP,
): TimeSeriesResult {
	const effects = collectEffects(platformBook, op1Affix, op2Affix);

	const staticBaseline = collectStaticBaseline(effects);
	const rawEvents = collectTemporalEvents(effects);
	const modifiers = collectModifiers(effects);
	const summon = collectSummon(effects);

	const events = resolveModifiers(rawEvents, modifiers);

	// T_active: max duration across all temporal effects + summon
	const maxEventEnd = events.reduce((m, e) => Math.max(m, e.t_start + e.duration), 0);
	const summonEnd = summon?.duration ?? 0;
	const T_active = Math.max(maxEventEnd, summonEnd, T_gap);

	const samples = sampleTimeSeries(staticBaseline, events, summon, T_active);
	const { averaged, slot_coverage, peak } = aggregateTimeSeries(samples, T_gap);

	return {
		platform: platformBook,
		op1: op1Affix,
		op2: op2Affix,
		samples,
		averaged,
		T_active,
		slot_coverage,
		peak,
		static_baseline: staticBaseline,
		summon,
	};
}

function round(v: number): number {
	return Math.round(v * 100) / 100;
}
