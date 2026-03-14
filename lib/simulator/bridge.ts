/**
 * Bridge: combat config → simulator input (ArenaDef).
 *
 * Reads both effects.yaml (for hit_count, raw state data) and
 * model.yaml (for factor vectors) to construct SlotDefs.
 *
 * Units convention:
 * - D_base, D_flat, D_ortho: kept as raw % (resolveHit divides by 100)
 * - S_coeff, M_dmg, M_skill, M_final, M_crit: converted to fractional (÷100)
 * - sigma_R: kept as-is (multiplicative, base=1)
 * - DR_A: converted to fractional → dr_modifier on StateDef
 * - H_red: converted to fractional → healing_modifier on StateDef
 * - D_base in base_factors: divided by hit_count (total → per-hit)
 */

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ArenaDef } from "./actors/arena";
import type {
	ConditionalFactor,
	EntityDef,
	FactorVector,
	SlotDef,
	StateDef,
	StateTarget,
} from "./types";
import { ZERO_FACTORS } from "./types";
import type { BookData } from "../parser/emit";
import type { StateDef as ParserStateDef } from "../parser/states";
import { parseMainSkills } from "../parser/index";

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "../..");
const effectsPath = join(ROOT, "data/yaml/effects.yaml");
const modelPath = join(ROOT, "data/yaml/model.yaml");

let _effects: any = null;
let _model: any = null;
let _parserBooks: Record<string, BookData> | null = null;

function getEffects(): any {
	if (!_effects) {
		_effects = parseYaml(readFileSync(effectsPath, "utf-8"));
	}
	return _effects;
}

function getModel(): any {
	if (!_model) {
		_model = parseYaml(readFileSync(modelPath, "utf-8"));
	}
	return _model;
}

const rawMdPath = join(ROOT, "data/raw/主书.md");

/** Load parsed book data (with state registries) from raw markdown. Cached. */
function getParserBooks(): Record<string, BookData> {
	if (!_parserBooks) {
		const md = readFileSync(rawMdPath, "utf-8");
		const result = parseMainSkills(md);
		_parserBooks = result.books;
	}
	return _parserBooks;
}

/**
 * Get the state registry for a book from the grammar-based parser.
 * Returns undefined if the book has no named states.
 */
export function getBookStates(bookName: string): Record<string, ParserStateDef> | undefined {
	const books = getParserBooks();
	return books[bookName]?.states;
}

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

export interface Progression {
	enlightenment: number;   // 悟境 tier (0–10)
	fusion: number;          // 融合重数 (0–63)
}

/** Default: endgame max — matches model.yaml's filterEndgame assumption */
export const MAX_PROGRESSION: Progression = { enlightenment: 10, fusion: 51 };

export interface CombatConfig {
	t_gap: number;
	formulas: {
		dr_constant: number;
		sp_shield_ratio: number;
	};
	/** Progression level assumed for all books. Must be explicit. */
	progression: Progression;
	player: SideConfig;
	opponent: SideConfig;
	/** Max combat time in seconds (default: 300). */
	max_time?: number;
}

export interface SideConfig {
	entity: EntityConfig;
	books: BookConfig[];
}

export interface EntityConfig {
	hp?: number;
	atk?: number;
	sp?: number;
	def?: number;
	scale?: number;
}

export interface BookConfig {
	slot: number;
	platform: string;
	op1: string;
	op2: string;
	/** Per-book progression override (default: config.progression or MAX_PROGRESSION) */
	progression?: Progression;
}

// ---------------------------------------------------------------------------
// Progression-aware tier resolution
// ---------------------------------------------------------------------------

/** Parse "enlightenment=10" or "fusion=51" into {key, value} */
function parseDataState(ds: any): { enlightenment?: number; fusion?: number } {
	const result: { enlightenment?: number; fusion?: number } = {};
	const items = Array.isArray(ds) ? ds : [ds];
	for (const item of items) {
		if (typeof item !== "string") continue;
		const m = item.match(/^(enlightenment|fusion)=(\d+)$/);
		if (m) {
			result[m[1] as "enlightenment" | "fusion"] = parseInt(m[2]);
		}
	}
	return result;
}

/** Check if an effect's data_state requirements are met by the given progression */
function meetsProgression(ds: any, prog: Progression): boolean {
	if (!ds) return true;  // no requirement → always available
	if (ds === "locked") return false;
	if (ds === "max_fusion") return true;  // assume met at any level for now
	if (Array.isArray(ds) && ds.includes("locked")) return false;

	const req = parseDataState(ds);
	if (req.enlightenment != null && prog.enlightenment < req.enlightenment) return false;
	if (req.fusion != null && prog.fusion < req.fusion) return false;
	return true;
}

/**
 * Filter effects by progression: for each type, keep the highest tier
 * that the given progression level qualifies for.
 */
function filterByProgression(effects: any[], prog: Progression): any[] {
	// Group by type
	const byType = new Map<string, any[]>();
	for (const e of effects) {
		if (!meetsProgression(e.data_state, prog)) continue;
		if (!byType.has(e.type)) byType.set(e.type, []);
		byType.get(e.type)!.push(e);
	}

	const result: any[] = [];
	for (const entries of byType.values()) {
		const withDS = entries.filter((e: any) => e.data_state);
		const withoutDS = entries.filter((e: any) => !e.data_state);

		if (withDS.length === 0) {
			result.push(...withoutDS);
			continue;
		}
		// Entries without data_state are ungated → always available
		if (withoutDS.length > 0) {
			result.push(...withoutDS);
			continue;
		}
		// Keep last qualifying data_state group (highest tier in YAML order)
		const norm = (ds: any): string =>
			Array.isArray(ds) ? [...ds].sort().join("+") : String(ds);
		const dsGroups = new Map<string, any[]>();
		for (const e of withDS) {
			const k = norm(e.data_state);
			if (!dsGroups.has(k)) dsGroups.set(k, []);
			dsGroups.get(k)!.push(e);
		}
		const lastKey = [...dsGroups.keys()].pop()!;
		result.push(...dsGroups.get(lastKey)!);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Hit count extraction from effects.yaml
// ---------------------------------------------------------------------------

function extractHitCount(platformBook: string, prog: Progression): number {
	const effects = getEffects();
	const book = effects.books?.[platformBook];
	if (!book?.skill) return 1;

	const resolved = filterByProgression(book.skill, prog);
	let hits = 1;
	for (const entry of resolved) {
		if (entry.type === "base_attack" && entry.hits) {
			hits = entry.hits;
		}
	}
	return hits;
}

// ---------------------------------------------------------------------------
// Raw effects.yaml lookups (for data not in model.yaml)
// ---------------------------------------------------------------------------

/** Find raw skill/affix entries from effects.yaml for counter/dot data */
function findRawEffects(platformBook: string, prog: Progression): any[] {
	const effects = getEffects();
	const book = effects.books?.[platformBook];
	if (!book) return [];

	const all: any[] = [];
	if (book.skill) all.push(...filterByProgression(book.skill, prog));
	if (book.primary_affix?.effects) all.push(...filterByProgression(book.primary_affix.effects, prog));
	if (book.exclusive_affix?.effects) all.push(...filterByProgression(book.exclusive_affix.effects, prog));
	return all;
}

function findRawAffix(affixName: string, prog: Progression): any[] {
	const effects = getEffects();
	// Check book exclusive/primary affixes
	for (const book of Object.values(effects.books ?? {})) {
		const b = book as any;
		if (b.exclusive_affix?.name === affixName && b.exclusive_affix?.effects) {
			return filterByProgression(b.exclusive_affix.effects, prog);
		}
		if (b.primary_affix?.name === affixName && b.primary_affix?.effects) {
			return filterByProgression(b.primary_affix.effects, prog);
		}
	}
	// Check universal affixes
	if (effects.universal_affixes?.[affixName])
		return filterByProgression(effects.universal_affixes[affixName], prog);
	// Check school affixes
	for (const school of Object.values(effects.school_affixes ?? {})) {
		if ((school as any)[affixName])
			return filterByProgression((school as any)[affixName], prog);
	}
	return [];
}

// ---------------------------------------------------------------------------
// Model effect collection (same approach as time-series.ts)
// ---------------------------------------------------------------------------

interface ModelEffect {
	type: string;
	factors?: Record<string, number>;
	temporal?: { duration: number | string; coverage_type: string };
	modifier_value?: number;
	summon?: { inherit_stats: number; duration: number; damage_increase: number };
}

function findModelAffixEffects(model: any, name: string): ModelEffect[] | null {
	if (model.universal_affixes?.[name]) return model.universal_affixes[name];
	for (const affixes of Object.values(model.school_affixes ?? {})) {
		if ((affixes as any)[name]) return (affixes as any)[name];
	}
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

function collectModelEffects(
	platformBook: string,
	op1: string,
	op2: string,
): ModelEffect[] {
	const model = getModel();
	const all: ModelEffect[] = [];

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

	for (const affixName of [op1, op2]) {
		if (!affixName) continue;
		const found = findModelAffixEffects(model, affixName);
		if (found) all.push(...found);
	}

	return all;
}

// ---------------------------------------------------------------------------
// §9 Modifier resolution (buff_strength, debuff_strength, duration modifiers)
// ---------------------------------------------------------------------------

interface SideModifier {
	kind: "strength" | "duration";
	value: number;
	targets: Set<string>; // empty = applies to all duration_based
}

const BUFF_STRENGTH_TARGETS = new Set([
	"self_buff", "counter_buff", "random_buff",
]);

const DEBUFF_STRENGTH_TARGETS = new Set([
	"debuff", "counter_debuff", "conditional_debuff", "cross_slot_debuff",
]);

const BUFF_DURATION_TARGETS = new Set([
	"self_buff", "counter_buff",
]);

/** Collect §9 modifiers from ALL books in a side (they apply cross-slot). */
function collectSideModifiers(books: BookConfig[]): SideModifier[] {
	const modifiers: SideModifier[] = [];

	for (const book of books) {
		const effects = collectModelEffects(book.platform, book.op1, book.op2);
		for (const e of effects) {
			if (e.modifier_value == null) continue;

			switch (e.type) {
				case "buff_strength":
					modifiers.push({
						kind: "strength",
						value: e.modifier_value,
						targets: BUFF_STRENGTH_TARGETS,
					});
					break;
				case "debuff_strength":
					modifiers.push({
						kind: "strength",
						value: e.modifier_value,
						targets: DEBUFF_STRENGTH_TARGETS,
					});
					break;
				case "buff_duration":
					modifiers.push({
						kind: "duration",
						value: e.modifier_value,
						targets: BUFF_DURATION_TARGETS,
					});
					break;
				case "all_state_duration":
					modifiers.push({
						kind: "duration",
						value: e.modifier_value,
						targets: new Set<string>(), // empty = applies to all
					});
					break;
			}
		}
	}

	return modifiers;
}

/** Apply §9 strength modifiers to a state's factor values. */
function applyStrengthModifiers(
	modifiers: Partial<FactorVector>,
	sourceType: string,
	sideModifiers: SideModifier[],
): Partial<FactorVector> {
	let multiplier = 1;
	for (const m of sideModifiers) {
		if (m.kind !== "strength") continue;
		const matches = m.targets.size === 0 || m.targets.has(sourceType);
		if (matches) multiplier *= (1 + m.value / 100);
	}
	if (multiplier === 1) return modifiers;

	const result: Partial<FactorVector> = {};
	for (const [k, v] of Object.entries(modifiers)) {
		result[k as keyof FactorVector] = (v as number) * multiplier;
	}
	return result;
}

/** Apply §9 duration modifiers to a state's duration. */
function applyDurationModifiers(
	duration: number,
	sourceType: string,
	sideModifiers: SideModifier[],
): number {
	let multiplier = 1;
	for (const m of sideModifiers) {
		if (m.kind !== "duration") continue;
		const matches = m.targets.size === 0 || m.targets.has(sourceType);
		if (matches) multiplier *= (1 + m.value / 100);
	}
	return Math.round(duration * multiplier);
}

// ---------------------------------------------------------------------------
// Factor mapping
// ---------------------------------------------------------------------------

// Factors stored as raw % in FactorVector (resolveHit divides by 100)
const RAW_FACTORS = new Set(["D_base", "D_flat", "D_ortho"]);

// Factors stored as fractional in FactorVector (resolveHit uses 1+x)
const FRACTIONAL_FACTORS: Record<string, keyof FactorVector> = {
	S_coeff: "S_coeff",
	M_dmg: "M_dmg",
	M_skill: "M_skill",
	M_final: "M_final",
	M_crit: "M_crit",
};

// Factors that map to StateDef fields (not FactorVector)
const DR_FACTOR = "DR_A";
const HEAL_RED_FACTOR = "H_red";
const DR_BYPASS_FACTOR = "D_res";
const HEAL_FACTOR = "H_A";

// ---------------------------------------------------------------------------
// Summon collection (same logic as time-series.ts collectSummon)
// ---------------------------------------------------------------------------

function collectSummonMultiplier(effects: ModelEffect[]): number {
	let inherit_stats = 0;
	let duration = 0;
	let damage_increase = 0;

	for (const e of effects) {
		if (!e.summon) continue;
		if (e.summon.inherit_stats > 0) inherit_stats = e.summon.inherit_stats;
		if (e.summon.duration > 0) duration = e.summon.duration;
		if (e.summon.damage_increase > 0) damage_increase = e.summon.damage_increase;
	}

	if (inherit_stats === 0 || duration === 0) return 0;

	// e.g., 春黎剑阵: 54% × (1+200%) = 1.62
	return (inherit_stats / 100) * (1 + damage_increase / 100);
}

// ---------------------------------------------------------------------------
// Build base_factors (permanent, non-temporal)
// ---------------------------------------------------------------------------

// Explicit routing: every effect type is handled by exactly one subsystem.
// Types routed to buildConditionalFactors (evaluated at slot activation):
const ROUTED_TO_CONDITIONAL = new Set([
	"per_enemy_lost_hp", "per_self_lost_hp", "min_lost_hp_threshold",
	"ignore_damage_reduction", "conditional_damage",
	"per_hit_escalation", "per_debuff_stack_damage", "per_buff_stack_damage",
	"per_debuff_stack_true_damage",
	"conditional_crit", "conditional_crit_rate",
	"self_lost_hp_damage",         // D_ortho conditional on self lost HP
	"probability_multiplier",      // expected value: prob × mult
	"probability_to_certain",      // removes probability → guaranteed
	"enemy_skill_damage_reduction", // opponent DR reduction
	"self_damage_reduction_during_cast", // self DR during activation
]);

// Types routed to buildStateDefs (temporal/reactive states):
const ROUTED_TO_STATE = new Set([
	"self_buff", "debuff", "conditional_debuff", "dot",
	"counter_buff", "counter_debuff", "shield",
	"next_skill_buff", "cross_slot_debuff",
	"delayed_burst", "on_dispel",
	"shield_destroy_damage", "shield_destroy_dot",
	"on_buff_debuff_shield_trigger", "on_shield_expire",
	"self_damage_taken_increase",  // self-debuff: takes MORE damage
	"untargetable_state",
	"conditional_heal_buff", "self_hp_floor",
]);

// Types routed to slot-level actions (buildSlotActions):
const ROUTED_TO_SLOT_ACTION = new Set([
	"self_hp_cost",        // % max HP self-damage on activation
	"lifesteal",           // % of damage → heal
	"self_heal",           // flat heal
	"self_cleanse",        // remove N debuffs from self
	"buff_steal",          // steal N buffs from opponent
]);

// Types routed to §9 side modifiers (collectSideModifiers):
const ROUTED_TO_SIDE_MODIFIER = new Set([
	"buff_strength", "debuff_strength", "all_state_duration", "buff_duration",
]);

// Meta modifiers applied during build (modify other effects):
const ROUTED_TO_META = new Set([
	"buff_stack_increase", "debuff_stack_increase", "debuff_stack_chance",
	"dot_damage_increase", "dot_frequency_increase",
	"delayed_burst_increase", "self_buff_extend", "self_buff_strengthen",
	"counter_debuff_upgrade",
]);

// Summon (handled by collectSummonMultiplier):
const ROUTED_TO_SUMMON = new Set(["summon", "summon_buff"]);

// Stochastic / procedural (non-deterministic — use expected value):
const ROUTED_TO_STOCHASTIC = new Set([
	"random_buff", "random_debuff",
]);

// Non-damage mechanics (not a damage factor, but still tracked):
const ROUTED_TO_MECHANIC = new Set([
	"periodic_cleanse", "periodic_dispel",
]);

/**
 * Override D_base and D_ortho from effects.yaml when progression ≠ endgame max.
 * model.yaml only has endgame values; for lower tiers we resolve from raw data.
 */
function resolveProgressionOverrides(
	platformBook: string,
	prog: Progression,
): { D_base?: number; D_ortho?: number } {
	// If max progression, model.yaml values are correct — no override needed
	if (prog.enlightenment >= MAX_PROGRESSION.enlightenment &&
		prog.fusion >= MAX_PROGRESSION.fusion) {
		return {};
	}

	const effects = getEffects();
	const book = effects.books?.[platformBook];
	if (!book?.skill) return {};

	const resolved = filterByProgression(book.skill, prog);
	const overrides: { D_base?: number; D_ortho?: number } = {};

	for (const e of resolved) {
		if (e.type === "base_attack" && e.total != null) {
			overrides.D_base = e.total;
		}
		if (e.type === "percent_max_hp_damage" && e.value != null) {
			overrides.D_ortho = e.value;
		}
	}

	return overrides;
}

function buildBaseFactors(
	effects: ModelEffect[],
	hitCount: number,
	summonMultiplier: number,
	platformBook: string = "",
	prog: Progression,
): FactorVector {
	const factors: FactorVector = { ...ZERO_FACTORS };

	for (const e of effects) {
		if (!e.factors) continue;

		// Skip temporal effects (handled as StateDefs)
		const isTemporal =
			e.temporal?.coverage_type === "duration_based" &&
			typeof e.temporal.duration === "number" &&
			e.temporal.duration > 0;
		if (isTemporal) continue;

		// Skip reactive effects (handled as StateDefs)
		if (e.temporal?.coverage_type === "reactive") continue;

		// Skip next_skill effects (handled as StateDefs)
		if (e.temporal?.coverage_type === "next_skill") continue;

		// Skip types routed to other subsystems
		if (ROUTED_TO_CONDITIONAL.has(e.type)) continue;
		if (ROUTED_TO_STATE.has(e.type)) continue;
		if (ROUTED_TO_SLOT_ACTION.has(e.type)) continue;
		if (ROUTED_TO_SIDE_MODIFIER.has(e.type)) continue;
		if (ROUTED_TO_META.has(e.type)) continue;
		if (ROUTED_TO_SUMMON.has(e.type)) continue;
		if (ROUTED_TO_STOCHASTIC.has(e.type)) continue;
		if (ROUTED_TO_MECHANIC.has(e.type)) continue;

		for (const [name, value] of Object.entries(e.factors)) {
			if (RAW_FACTORS.has(name)) {
				factors[name as keyof FactorVector] += value;
			} else if (name in FRACTIONAL_FACTORS) {
				const key = FRACTIONAL_FACTORS[name];
				factors[key] += value / 100;
			} else if (name === "sigma_R") {
				factors.sigma_R = Math.sqrt(factors.sigma_R ** 2 + value ** 2);
			} else if (name === DR_BYPASS_FACTOR) {
				factors.D_res += value / 100;
			} else if (name === HEAL_FACTOR) {
				factors.H_A += value;
			}
			// DR_A, H_red as permanent → handled as StateDef fields
		}
	}

	// Apply progression overrides: replace model.yaml endgame values
	// with tier-appropriate values from effects.yaml
	const overrides = resolveProgressionOverrides(platformBook, prog);
	if (overrides.D_base != null) {
		// Replace the model.yaml D_base with the progression-resolved value
		// Keep any affix D_base contributions (non-base_attack sources)
		const modelSkillDBase = effects
			.filter(e => e.type === "base_attack" && e.factors?.D_base)
			.reduce((s, e) => s + (e.factors!.D_base ?? 0), 0);
		factors.D_base = factors.D_base - modelSkillDBase + overrides.D_base;
	}
	if (overrides.D_ortho != null) {
		const modelSkillDOrtho = effects
			.filter(e => e.type === "percent_max_hp_damage" && e.factors?.D_ortho)
			.reduce((s, e) => s + (e.factors!.D_ortho ?? 0), 0);
		factors.D_ortho = factors.D_ortho - modelSkillDOrtho + overrides.D_ortho;
	}

	// D_base and D_ortho are total across all hits → convert to per-hit
	if (hitCount > 1) {
		factors.D_base = factors.D_base / hitCount;
		factors.D_ortho = factors.D_ortho / hitCount;
	}

	// Summon clone: adds a copy of skill attack (D_base only)
	if (summonMultiplier > 0) {
		factors.D_base = factors.D_base * (1 + summonMultiplier);
	}

	return factors;
}

// ---------------------------------------------------------------------------
// Build StateDefs from temporal and reactive effects
// ---------------------------------------------------------------------------

function inferTarget(type: string): StateTarget {
	if (
		type.includes("debuff") ||
		type === "dot" ||
		type === "dot_extra_per_tick" ||
		type === "cross_slot_debuff"
	) {
		return "opponent";
	}
	return "self";
}

function buildStateDefs(
	effects: ModelEffect[],
	platformBook: string,
	op1: string,
	op2: string,
	sideModifiers: SideModifier[],
	prog: Progression,
): StateDef[] {
	const states: StateDef[] = [];
	let stateIndex = 0;

	// Load parser state registry for this book (if available)
	const stateRegistry = getBookStates(platformBook);

	// Collect meta modifiers that affect DoTs/bursts
	let dot_damage_mod = 0;
	let dot_frequency_mod = 0;
	let delayed_burst_mod = 0;
	for (const e of effects) {
		if (e.type === "dot_damage_increase" && e.factors) {
			dot_damage_mod += Object.values(e.factors)[0] ?? 0;
		}
		if (e.type === "dot_frequency_increase" && e.factors) {
			dot_frequency_mod += Object.values(e.factors)[0] ?? 0;
		}
		if (e.type === "delayed_burst_increase" && e.factors) {
			delayed_burst_mod += Object.values(e.factors)[0] ?? 0;
		}
	}

	for (const e of effects) {
		// Handle temporal effects (duration_based, reactive, next_skill)
		const hasTemporal = !!e.temporal;
		const coverageType = e.temporal?.coverage_type;
		const duration = typeof e.temporal?.duration === "number" ? e.temporal.duration : 999;

		// Non-temporal types explicitly routed to states
		const isNonTemporalState =
			!hasTemporal && ROUTED_TO_STATE.has(e.type) &&
			// These specific types create states even without temporal metadata
			(e.type === "self_damage_taken_increase" ||
			 e.type === "on_dispel" ||
			 e.type === "shield_destroy_damage" ||
			 e.type === "shield_destroy_dot" ||
			 e.type === "on_buff_debuff_shield_trigger" ||
			 e.type === "on_shield_expire" ||
			 e.type === "self_hp_floor" ||
			 e.type === "untargetable_state");

		if (!hasTemporal && !isNonTemporalState) continue;
		if (hasTemporal && coverageType !== "duration_based" && coverageType !== "reactive" && coverageType !== "next_skill") continue;
		if (hasTemporal && coverageType === "duration_based" && duration <= 0) continue;

		let target: StateTarget = inferTarget(e.type);
		const modifiers: Partial<FactorVector> = {};
		let dr_modifier: number | undefined;
		let healing_modifier: number | undefined;
		let damage_per_tick: number | undefined;
		let counter_damage: number | undefined;
		let burst_damage: number | undefined;
		let on_dispel_damage: number | undefined;
		let shield_hp: number | undefined;
		let atk_modifier: number | undefined;
		let def_modifier: number | undefined;

		// For self_buff: skip S_coeff from model factors (attack_bonus is an entity stat, not S_coeff)
		const skipModelSCoeff = e.type === "self_buff" || e.type === "self_buff_extra" || e.type === "counter_buff";

		// Map model factors
		if (e.factors) {
			for (const [name, value] of Object.entries(e.factors)) {
				if (RAW_FACTORS.has(name)) {
					if (name === "D_ortho" && (e.type === "dot" || e.type === "dot_extra_per_tick")) {
						// D_ortho for dots → handled via damage_per_tick from raw data
					} else {
						modifiers[name as keyof FactorVector] =
							(modifiers[name as keyof FactorVector] ?? 0) + value;
					}
				} else if (name in FRACTIONAL_FACTORS) {
					// Skip S_coeff for self_buff — attack_bonus is an entity stat modifier, not a factor
					if (skipModelSCoeff && FRACTIONAL_FACTORS[name] === "S_coeff") continue;
					const key = FRACTIONAL_FACTORS[name];
					modifiers[key] = (modifiers[key] ?? 0) + value / 100;
				} else if (name === DR_FACTOR) {
					dr_modifier = (dr_modifier ?? 0) + value / 100;
				} else if (name === HEAL_RED_FACTOR) {
					healing_modifier = (healing_modifier ?? 0) + value / 100;
				} else if (name === DR_BYPASS_FACTOR) {
					modifiers.D_res = (modifiers.D_res ?? 0) + value / 100;
				} else if (name === HEAL_FACTOR) {
					modifiers.H_A = (modifiers.H_A ?? 0) + value;
				}
			}
		}

		// --- Type-specific extraction from effects.yaml ---
		const rawEffects = [
			...findRawEffects(platformBook, prog),
			...findRawAffix(op1, prog),
			...findRawAffix(op2, prog),
		];

		// self_buff stat modifiers: read directly from effects.yaml (NOT from model factors)
		if (e.type === "self_buff" || e.type === "self_buff_extra") {
			for (const raw of rawEffects) {
				if (raw.type === e.type || raw.type === "self_buff" || raw.type === "self_buff_extra") {
					if (raw.attack_bonus) atk_modifier = (atk_modifier ?? 0) + raw.attack_bonus / 100;
					if (raw.defense_bonus) def_modifier = (def_modifier ?? 0) + raw.defense_bonus / 100;
					// damage_increase, skill_damage_increase, final_damage_bonus stay as factor modifiers
					// damage_reduction stays as dr_modifier (already handled via DR_A)
				}
			}
		}

		if (e.type === "counter_debuff" || e.type === "counter_buff") {
			for (const raw of rawEffects) {
				if (raw.type === e.type || raw.type === "counter_debuff" || raw.type === "counter_buff") {
					if (raw.reflect_received_damage) {
						counter_damage = raw.reflect_received_damage;
					}
				}
			}
		}

		if (e.type === "dot") {
			for (const raw of rawEffects) {
				if (raw.type === "dot" && raw.damage_per_tick) {
					damage_per_tick = raw.damage_per_tick;
					// Apply dot_damage_increase meta modifier
					if (dot_damage_mod > 0) {
						damage_per_tick *= (1 + dot_damage_mod / 100);
					}
				}
			}
		}

		if (e.type === "on_dispel") {
			// Reactive: damage burst when a DoT is dispelled
			for (const raw of rawEffects) {
				if (raw.type === "on_dispel" && raw.damage) {
					on_dispel_damage = raw.damage;
				}
			}
			// D_ortho from model factors goes to on_dispel_damage
			if (e.factors?.D_ortho) {
				on_dispel_damage = (on_dispel_damage ?? 0) + e.factors.D_ortho;
			}
		}

		if (e.type === "shield_destroy_damage") {
			// Reactive: damage when shield breaks
			for (const raw of rawEffects) {
				if (raw.type === "shield_destroy_damage" && raw.percent_max_hp) {
					// Store as D_ortho-like damage (% of max HP)
					modifiers.D_ortho = (modifiers.D_ortho ?? 0) + raw.percent_max_hp;
				}
			}
		}

		if (e.type === "shield_destroy_dot") {
			// DoT triggered on shield destruction
			for (const raw of rawEffects) {
				if (raw.type === "shield_destroy_dot" && raw.per_shield_damage) {
					damage_per_tick = raw.per_shield_damage;
				}
			}
		}

		if (e.type === "delayed_burst") {
			// Timed explosion: accumulates damage, bursts at expiry
			for (const raw of rawEffects) {
				if (raw.type === "delayed_burst") {
					burst_damage = raw.burst_base ?? 0;
					if (delayed_burst_mod > 0) {
						burst_damage *= (1 + delayed_burst_mod / 100);
					}
				}
			}
		}

		if (e.type === "on_buff_debuff_shield_trigger") {
			// Triggers damage on buff/debuff/shield events
			for (const raw of rawEffects) {
				if (raw.type === "on_buff_debuff_shield_trigger" && raw.damage_percent_of_skill) {
					damage_per_tick = raw.damage_percent_of_skill;
				}
			}
		}

		if (e.type === "on_shield_expire") {
			// Damage when shield expires naturally
			for (const raw of rawEffects) {
				if (raw.type === "on_shield_expire" && raw.damage_percent_of_shield) {
					burst_damage = raw.damage_percent_of_shield;
				}
			}
		}

		if (e.type === "shield") {
			for (const raw of rawEffects) {
				if (raw.type === "shield" && raw.value) {
					shield_hp = raw.value;
				}
			}
		}

		if (e.type === "self_damage_taken_increase") {
			// Self-debuff: INCREASES damage taken. Model has DR_A: -50 (negative).
			// dr_modifier on StateDef: negative = takes MORE damage.
			// DR_A / 100 = -0.5, which is already the correct sign.
			if (e.factors?.DR_A) {
				dr_modifier = e.factors.DR_A / 100;
			}
		}

		if (e.type === "self_hp_floor") {
			// Prevents HP from dropping below X% — modeled as extreme DR at threshold
			// For now, store as a modifier signal the entity can check
		}

		if (e.type === "untargetable_state") {
			// Brief invulnerability — modeled as 100% DR
			dr_modifier = 1.0;
		}

		// Skip if nothing actionable
		const hasModifiers = Object.keys(modifiers).length > 0;
		if (
			!hasModifiers &&
			dr_modifier == null &&
			healing_modifier == null &&
			damage_per_tick == null &&
			counter_damage == null &&
			burst_damage == null &&
			on_dispel_damage == null &&
			shield_hp == null &&
			atk_modifier == null &&
			def_modifier == null
		) {
			continue;
		}

		// --- State registry lookup: override target/duration from parser ---
		// Find the state name from raw effects (effects.yaml has `name` field)
		let stateName: string | undefined;
		let registryEntry: ParserStateDef | undefined;
		if (stateRegistry) {
			// Find matching raw effect with a name field for this type
			for (const raw of rawEffects) {
				if (raw.type === e.type && raw.name) {
					if (stateRegistry[raw.name]) {
						stateName = raw.name;
						registryEntry = stateRegistry[raw.name];
						break;
					}
				}
			}
		}

		// Override target from registry (more accurate than type-name inference)
		if (registryEntry) {
			if (registryEntry.target === "self" || registryEntry.target === "opponent") {
				target = registryEntry.target;
			}
			// "both" → keep inferred target (handled per-instance at runtime)
		}

		// Override duration from registry
		let baseDuration = duration;
		if (registryEntry?.duration != null) {
			baseDuration = registryEntry.duration === "permanent" ? 999 : registryEntry.duration;
		}

		// Apply §9 modifiers: strength → factor values, duration → duration
		const resolvedModifiers = applyStrengthModifiers(modifiers, e.type, sideModifiers);
		const resolvedDuration = hasTemporal
			? applyDurationModifiers(baseDuration, e.type, sideModifiers)
			: (registryEntry?.duration === "permanent" ? 999 : (baseDuration || 999));

		let strengthMult = 1;
		for (const m of sideModifiers) {
			if (m.kind !== "strength") continue;
			const matches = m.targets.size === 0 || m.targets.has(e.type);
			if (matches) strengthMult *= (1 + m.value / 100);
		}

		states.push({
			id: `${e.type}-${platformBook}-${stateIndex++}`,
			duration: resolvedDuration,
			target,
			modifiers: resolvedModifiers,
			dr_modifier: dr_modifier != null ? dr_modifier * strengthMult : undefined,
			healing_modifier: healing_modifier != null ? healing_modifier * strengthMult : undefined,
			damage_per_tick: damage_per_tick != null ? damage_per_tick * strengthMult : undefined,
			counter_damage: counter_damage != null ? counter_damage * strengthMult : undefined,
			burst_damage: burst_damage != null ? burst_damage * strengthMult : undefined,
			on_dispel_damage: on_dispel_damage != null ? on_dispel_damage * strengthMult : undefined,
			shield_hp,
			atk_modifier: atk_modifier != null ? atk_modifier * strengthMult : undefined,
			def_modifier: def_modifier != null ? def_modifier * strengthMult : undefined,
			// New fields from parser state registry
			max_stacks: registryEntry?.max_stacks,
			trigger: registryEntry?.trigger,
			chance: registryEntry?.chance,
			per_hit_stack: registryEntry?.per_hit_stack,
			dispellable: registryEntry?.dispellable,
		});
	}

	return states;
}

// ---------------------------------------------------------------------------
// Build conditional factors from model effects
// ---------------------------------------------------------------------------

function buildConditionalFactors(effects: ModelEffect[]): ConditionalFactor[] {
	const conds: ConditionalFactor[] = [];

	for (const e of effects) {
		if (!ROUTED_TO_CONDITIONAL.has(e.type)) continue;

		switch (e.type) {
			case "per_enemy_lost_hp": {
				const factor = e.factors ? Object.keys(e.factors)[0] as keyof FactorVector : "M_dmg";
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({ condition: "per_enemy_lost_hp", factor, value: value / 100 });
				break;
			}
			case "per_self_lost_hp": {
				const factor = e.factors ? Object.keys(e.factors)[0] as keyof FactorVector : "M_dmg";
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({ condition: "per_self_lost_hp", factor, value: value / 100 });
				break;
			}
			case "min_lost_hp_threshold": {
				conds.push({ condition: "min_lost_hp_threshold", factor: "M_dmg", value: 0, threshold: 11 });
				break;
			}
			case "ignore_damage_reduction": {
				conds.push({ condition: "ignore_dr", factor: "D_res", value: 1.0 });
				break;
			}
			case "conditional_damage": {
				// Handled per condition from effects.yaml in buildRawConditionalFactors
				break;
			}
			case "per_hit_escalation": {
				// e.g., 破竹: M_skill +40% per hit, max 10 hits
				const factor = e.factors ? Object.keys(e.factors)[0] as keyof FactorVector : "M_skill";
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({
					condition: "per_hit_escalation",
					factor,
					value: value / 100,
					max_stacks: 10,  // default, could be from raw data
				});
				break;
			}
			case "per_debuff_stack_damage":
			case "per_debuff_stack_true_damage": {
				// e.g., 解体化形: per 2 debuff stacks → D_ortho bonus
				const factor = e.factors ? Object.keys(e.factors)[0] as keyof FactorVector : "D_ortho";
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({
					condition: "per_debuff_stack",
					factor,
					value: RAW_FACTORS.has(factor) ? value : value / 100,
					per_n_stacks: 2,  // default from game data
				});
				break;
			}
			case "per_buff_stack_damage": {
				// e.g., 真极穿空: per buff stacks → damage bonus
				const factor = e.factors ? Object.keys(e.factors)[0] as keyof FactorVector : "M_dmg";
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({
					condition: "per_buff_stack",
					factor,
					value: RAW_FACTORS.has(factor) ? value : value / 100,
					per_n_stacks: 1,
				});
				break;
			}
			case "self_lost_hp_damage": {
				// e.g., 玄煞灵影诀: D_ortho damage from self HP cost
				const factor = e.factors ? Object.keys(e.factors)[0] as keyof FactorVector : "D_ortho";
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({
					condition: "self_lost_hp_damage",
					factor,
					value: RAW_FACTORS.has(factor) ? value : value / 100,
				});
				break;
			}
			case "probability_multiplier": {
				// e.g., 心逐神随: 12% chance for 4× M_synchro → expected value 0.12 × 4 = 0.48
				if (e.factors) {
					const factor = Object.keys(e.factors)[0] as keyof FactorVector;
					const mult = Object.values(e.factors)[0];
					// Extract probability from raw effects if available
					conds.push({
						condition: "probability_multiplier",
						factor,
						value: mult,   // the multiplier
						probability: 0.12,  // default; overridden by raw data
					});
				}
				break;
			}
			case "probability_to_certain": {
				// Makes probability_multiplier guaranteed (probability → 1.0)
				// Handled as modifier on existing probability_multiplier conditional
				break;
			}
			case "conditional_crit":
			case "conditional_crit_rate": {
				// e.g., 溃魂击瑕: conditional M_crit bonus
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({
					condition: "conditional_crit",
					factor: "M_crit",
					value: value / 100,
				});
				break;
			}
			case "enemy_skill_damage_reduction": {
				// e.g., 无极剑阵: reduce opponent's effective DR
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({
					condition: "enemy_dr_reduction",
					factor: "D_res",
					value: value / 100,
				});
				break;
			}
			case "self_damage_reduction_during_cast": {
				// e.g., 金汤: self DR +30% during activation
				const value = e.factors ? Object.values(e.factors)[0] : 0;
				conds.push({
					condition: "self_dr_during_cast",
					factor: "D_res",
					value: value / 100,
				});
				break;
			}
		}
	}

	return conds;
}

// ---------------------------------------------------------------------------
// Build slot-level actions from model effects
// ---------------------------------------------------------------------------

interface SlotActions {
	self_hp_cost?: number;
	lifesteal?: number;
	self_heal?: number;
	self_cleanse_count?: number;
	buff_steal_count?: number;
}

function buildSlotActions(
	effects: ModelEffect[],
	platformBook: string,
	op1: string,
	op2: string,
	prog: Progression,
): SlotActions {
	const actions: SlotActions = {};

	// Get raw effects for field extraction
	const rawEffects = [
		...findRawEffects(platformBook, prog),
		...findRawAffix(op1, prog),
		...findRawAffix(op2, prog),
	];

	for (const e of effects) {
		if (!ROUTED_TO_SLOT_ACTION.has(e.type)) continue;

		switch (e.type) {
			case "self_hp_cost": {
				// % of max HP deducted on activation
				const value = e.factors?.D_ortho ?? 0;
				if (value > 0) actions.self_hp_cost = (actions.self_hp_cost ?? 0) + value;
				break;
			}
			case "lifesteal": {
				// % of damage dealt → heal self
				const value = e.factors?.H_A ?? 0;
				if (value > 0) actions.lifesteal = (actions.lifesteal ?? 0) + value;
				break;
			}
			case "self_heal": {
				for (const raw of rawEffects) {
					if (raw.type === "self_heal" && raw.value) {
						actions.self_heal = (actions.self_heal ?? 0) + raw.value;
					}
				}
				break;
			}
			case "self_cleanse": {
				for (const raw of rawEffects) {
					if (raw.type === "self_cleanse" && raw.count) {
						actions.self_cleanse_count = Math.max(
							actions.self_cleanse_count ?? 0,
							raw.count,
						);
					}
				}
				break;
			}
			case "buff_steal": {
				for (const raw of rawEffects) {
					if (raw.type === "buff_steal" && raw.count) {
						actions.buff_steal_count = Math.max(
							actions.buff_steal_count ?? 0,
							raw.count,
						);
					}
				}
				break;
			}
		}
	}

	return actions;
}

/** Extract conditional_damage effects from effects.yaml raw data */
function buildRawConditionalFactors(
	platformBook: string,
	op1: string,
	op2: string,
	modelEffects: ModelEffect[],
	prog: Progression,
): ConditionalFactor[] {
	const conds: ConditionalFactor[] = [];

	// Get raw effects for condition fields
	const rawEffects = [
		...findRawEffects(platformBook, prog),
		...findRawAffix(op1, prog),
		...findRawAffix(op2, prog),
	];

	// Get model effects for factor values
	for (const me of modelEffects) {
		if (me.type !== "conditional_damage") continue;

		// Find matching raw effect for condition
		const rawMatch = rawEffects.find((r: any) =>
			r.type === "conditional_damage" && r.condition,
		);

		if (!rawMatch) continue;

		const factor = me.factors ? Object.keys(me.factors)[0] as keyof FactorVector : "M_dmg";
		const value = me.factors ? Object.values(me.factors)[0] : 0;

		switch (rawMatch.condition) {
			case "target_hp_below_30":
				conds.push({
					condition: "target_hp_below",
					factor,
					value: value / 100,
					threshold: 30,
				});
				break;
			case "target_has_debuff":
				conds.push({
					condition: "target_has_debuff",
					factor,
					value: value / 100,
				});
				break;
		}
	}

	return conds;
}

// ---------------------------------------------------------------------------
// Build SlotDef from a book config
// ---------------------------------------------------------------------------

export function buildSlotDef(
	book: BookConfig,
	ownerEntity: string,
	targetEntity: string,
	sideModifiers: SideModifier[],
	prog: Progression,
): SlotDef {
	const bookProg = book.progression ?? prog;
	const hitCount = extractHitCount(book.platform, bookProg);
	const effects = collectModelEffects(book.platform, book.op1, book.op2);
	const summonMult = collectSummonMultiplier(effects);
	const actions = buildSlotActions(effects, book.platform, book.op1, book.op2, bookProg);

	return {
		id: `slot-${ownerEntity.split("-")[1]}-${book.slot}`,
		platform: book.platform,
		hit_count: hitCount,
		base_factors: buildBaseFactors(effects, hitCount, summonMult, book.platform, bookProg),
		conditional_factors: [
			...buildConditionalFactors(effects),
			...buildRawConditionalFactors(book.platform, book.op1, book.op2, effects, bookProg),
		],
		states_to_create: buildStateDefs(effects, book.platform, book.op1, book.op2, sideModifiers, bookProg),
		target_entity: targetEntity,
		owner_entity: ownerEntity,
		// Slot-level actions
		...(actions.self_hp_cost != null && { self_hp_cost: actions.self_hp_cost }),
		...(actions.lifesteal != null && { lifesteal: actions.lifesteal }),
		...(actions.self_heal != null && { self_heal: actions.self_heal }),
		...(actions.self_cleanse_count != null && { self_cleanse_count: actions.self_cleanse_count }),
		...(actions.buff_steal_count != null && { buff_steal_count: actions.buff_steal_count }),
	};
}

// ---------------------------------------------------------------------------
// Resolve entity config
// ---------------------------------------------------------------------------

function resolveEntity(
	config: EntityConfig,
	id: string,
	drConstant: number,
	playerEntity?: EntityConfig,
): EntityDef {
	if (config.scale != null && playerEntity) {
		return {
			id,
			hp: config.hp ?? (playerEntity.hp! * config.scale),
			atk: config.atk ?? (playerEntity.atk! * config.scale),
			sp: config.sp ?? (playerEntity.sp! * config.scale),
			def: config.def ?? (playerEntity.def! * config.scale),
			dr_constant: drConstant,
		};
	}
	return {
		id,
		hp: config.hp!,
		atk: config.atk!,
		sp: config.sp!,
		def: config.def!,
		dr_constant: drConstant,
	};
}

// ---------------------------------------------------------------------------
// Build ArenaDef from combat config
// ---------------------------------------------------------------------------

export function buildArenaDef(config: CombatConfig): ArenaDef {
	const drConstant = config.formulas.dr_constant;
	const prog = config.progression;

	const entityA = resolveEntity(config.player.entity, "entity-a", drConstant);
	const entityB = resolveEntity(
		config.opponent.entity,
		"entity-b",
		drConstant,
		config.player.entity,
	);

	const modsA = collectSideModifiers(config.player.books);
	const modsB = collectSideModifiers(config.opponent.books);

	const slotsA = config.player.books.map((book) =>
		buildSlotDef(book, "entity-a", "entity-b", modsA, prog),
	);
	const slotsB = config.opponent.books.map((book) =>
		buildSlotDef(book, "entity-b", "entity-a", modsB, prog),
	);

	return {
		entity_a: entityA,
		entity_b: entityB,
		slots_a: slotsA,
		slots_b: slotsB,
		t_gap: config.t_gap,
		sp_shield_ratio: config.formulas.sp_shield_ratio,
		max_time: config.max_time,
	};
}

// ---------------------------------------------------------------------------
// Load and parse a combat config file
// ---------------------------------------------------------------------------

export function loadCombatConfig(configPath: string): CombatConfig {
	const raw = readFileSync(configPath, "utf-8");
	return JSON.parse(raw) as CombatConfig;
}
