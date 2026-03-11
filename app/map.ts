#!/usr/bin/env bun
/**
 * CLI: effects.yaml → model.yaml
 *
 * Maps game effects to model factor contributions using the registry's
 * zone annotations and the rules from combat.md §2.
 *
 * Usage: bun app/map.ts [data/yaml]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml, stringify } from "yaml";
import { registry } from "../lib/domain/registry.js";
import type { EffectTypeDef } from "../lib/domain/types.js";
import { ModelYamlSchema } from "../lib/schemas/effect.model.js";

const yamlDir = resolve(process.argv[2] ?? "data/yaml");
const effectsPath = join(yamlDir, "effects.yaml");
const outPath = join(yamlDir, "model.yaml");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Factors {
	[k: string]: number;
}
interface SummonMeta {
	inherit_stats: number;
	duration: number;
	damage_increase: number;
}
interface EffectModel {
	type: string;
	factors?: Factors;
	temporal?: { duration: number | "permanent"; coverage_type: string };
	modifier_value?: number;
	summon?: SummonMeta;
}

// ---------------------------------------------------------------------------
// Data-state filtering — keep only endgame tier per effect type
// ---------------------------------------------------------------------------

function filterEndgame(effects: any[]): any[] {
	const nonLocked = effects.filter((e: any) => {
		const ds = e.data_state;
		if (ds === "locked") return false;
		if (Array.isArray(ds) && ds.includes("locked")) return false;
		return true;
	});

	const byType = new Map<string, any[]>();
	for (const e of nonLocked) {
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

		// Entries without data_state are the default/max tier.
		// If any exist, they supersede all data_state-gated entries of that type.
		if (withoutDS.length > 0) {
			result.push(...withoutDS);
			continue;
		}

		// Otherwise keep last data_state group (highest tier in YAML order)
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
// Temporal metadata
// ---------------------------------------------------------------------------

const PERMANENT_TYPES = new Set([
	"buff_strength",
	"debuff_strength",
	"buff_duration",
	"all_state_duration",
	"buff_stack_increase",
	"debuff_stack_increase",
	"debuff_stack_chance",
	// DoT modifiers: always active when affix is equipped
	"dot_damage_increase",
	"dot_frequency_increase",
	"dot_extra_per_tick",
	"shield_destroy_dot",
	// Buff extension: always active
	"self_buff_extend",
	"self_buff_extra",
	// Extended DoT: always active
	"extended_dot",
]);

const REACTIVE_TYPES = new Set([
	"counter_buff",
	"counter_debuff",
	"counter_debuff_upgrade",
	"cross_slot_debuff",
]);

function deriveTemporal(
	effect: any,
	def: EffectTypeDef,
): { duration: number | "permanent"; coverage_type: string } | undefined {
	if (def.scope !== "cross") return undefined;

	const type = effect.type;

	if (type === "next_skill_buff")
		return { duration: 0, coverage_type: "next_skill" };
	if (type === "enlightenment_bonus")
		return { duration: 0, coverage_type: "permanent" };
	if (PERMANENT_TYPES.has(type))
		return { duration: 0, coverage_type: "permanent" };
	if (REACTIVE_TYPES.has(type))
		return { duration: effect.duration ?? 0, coverage_type: "reactive" };

	// Handle "permanent" string duration
	if (effect.duration === "permanent")
		return { duration: "permanent", coverage_type: "permanent" };

	if (effect.duration != null && typeof effect.duration === "number")
		return { duration: effect.duration, coverage_type: "duration_based" };

	// Cross-scope effects without explicit duration — treat as permanent
	// (active whenever the affix is equipped, e.g. conditional_debuff on-hit)
	if (["conditional_debuff"].includes(type))
		return { duration: 0, coverage_type: "permanent" };

	return undefined;
}

// ---------------------------------------------------------------------------
// Per-type factor extraction
// ---------------------------------------------------------------------------

function mapEffect(effect: any): EffectModel {
	const def = registry.getType(effect.type);
	if (!def) return { type: effect.type };

	const f: Factors = {};
	const t = effect.type;

	switch (t) {
		// §0 Shared Mechanics
		case "fusion_flat_damage":
		case "mastery_extra_damage":
		case "enlightenment_damage":
			if (effect.value != null) f.D_flat = effect.value;
			break;
		case "cooldown":
			break;

		// §1 Base Damage
		case "base_attack":
			if (effect.total != null) f.D_base = effect.total;
			break;
		case "percent_max_hp_damage":
			if (effect.value != null) f.D_ortho = effect.value;
			break;
		case "shield_destroy_damage":
			if (effect.percent_max_hp != null) f.D_ortho = effect.percent_max_hp;
			break;

		// §2 Damage Multiplier Zones
		case "damage_increase":
			if (effect.value != null) f.M_dmg = effect.value;
			break;
		case "skill_damage_increase":
		case "technique_damage_increase":
			if (effect.value != null) f.M_skill = effect.value;
			break;
		case "enemy_skill_damage_reduction":
			// Defensive: reduces damage received, not dealt
			if (effect.value != null) f.DR_A = effect.value;
			break;
		case "final_damage_bonus":
			if (effect.value != null) f.M_final = effect.value;
			break;
		case "attack_bonus":
			if (effect.value != null) f.S_coeff = effect.value;
			break;
		case "crit_damage_bonus":
			break; // M_crit — not in factor space
		case "flat_extra_damage":
			if (effect.value != null) f.D_flat = effect.value;
			break;

		// §3 Resonance
		case "guaranteed_resonance": {
			const p = (effect.enhanced_chance ?? 0) / 100;
			const mBase = effect.base_mult ?? 1;
			const mEnh = effect.enhanced_mult ?? mBase;
			f.D_res = round(p * mEnh + (1 - p) * mBase);
			if (p > 0 && p < 1) {
				f.sigma_R = round(
					Math.sqrt(p * (1 - p) * (mEnh - mBase) ** 2),
				);
			}
			break;
		}

		// §3b Synchrony — individual tier, aggregated in mapEffectList
		case "probability_multiplier":
			break; // handled by aggregation

		// §3c Standard Crit
		case "conditional_crit":
		case "conditional_crit_rate":
			break; // M_crit — not in factor space

		// §4 Conditional Triggers
		case "conditional_damage":
			if (effect.value != null) f.M_dmg = effect.value;
			break;
		case "conditional_buff":
			if (effect.damage_increase != null) f.M_dmg = effect.damage_increase;
			if (effect.percent_max_hp_increase != null)
				f.D_ortho = effect.percent_max_hp_increase;
			if (effect.percent_lost_hp_increase != null)
				f.D_ortho =
					(f.D_ortho ?? 0) + effect.percent_lost_hp_increase;
			break;
		case "probability_to_certain":
		case "ignore_damage_reduction":
			break; // parameter nullification — no numeric factor

		// §5 Per-Hit Escalation
		case "per_hit_escalation":
			if (effect.stat === "skill_bonus") f.M_skill = effect.value ?? 0;
			else if (effect.stat === "damage") f.M_dmg = effect.value ?? 0;
			break;
		case "periodic_escalation":
			if (effect.multiplier != null)
				f.M_dmg = round((effect.multiplier - 1) * 100);
			break;

		// §6 HP-Based Calculations
		case "per_self_lost_hp":
		case "per_enemy_lost_hp":
			if (effect.per_percent != null) f.M_dmg = effect.per_percent;
			break;
		case "min_lost_hp_threshold":
			break; // gate
		case "self_hp_cost":
			if (effect.value != null) f.D_ortho = -effect.value;
			break;
		case "self_lost_hp_damage":
			if (effect.value != null) f.D_ortho = effect.value;
			break;
		case "self_damage_taken_increase":
			if (effect.value != null) f.DR_A = -effect.value;
			break;

		// §7 Healing and Survival
		case "lifesteal":
			if (effect.value != null) f.H_A = effect.value;
			break;
		case "healing_increase":
			if (effect.value != null) f.H_A = effect.value;
			break;
		case "healing_to_damage":
			if (effect.value != null) f.D_ortho = effect.value;
			break;
		case "self_damage_reduction_during_cast":
			if (effect.value != null) f.DR_A = effect.value;
			break;

		// §8 Shield System
		case "shield_strength":
		case "damage_to_shield":
			if (effect.value != null) f.S_A = effect.value;
			break;
		case "on_shield_expire":
			if (effect.damage_percent_of_shield != null)
				f.D_ortho = effect.damage_percent_of_shield;
			break;

		// §9 State Modifiers (meta — amplify other effects)
		case "buff_strength":
		case "debuff_strength":
		case "buff_duration":
		case "all_state_duration":
		case "buff_stack_increase":
		case "debuff_stack_increase":
		case "debuff_stack_chance": {
			// Second-order: applied by the time-series module, not stored as direct factors.
			// We emit modifier_value for consumption by time-series evaluation.
			const model: EffectModel = { type: t };
			if (effect.value != null) model.modifier_value = effect.value;
			const temporal = deriveTemporal(effect, def);
			if (temporal) model.temporal = temporal;
			return model;
		}

		// §10 DoT
		case "dot": {
			const dpt = effect.damage_per_tick ?? 0;
			const interval = effect.tick_interval ?? 1;
			if (dpt > 0) f.D_ortho = round(dpt / interval);
			break;
		}
		case "shield_destroy_dot": {
			const psd = effect.per_shield_damage ?? 0;
			const interval = effect.tick_interval ?? 1;
			if (psd > 0) f.D_ortho = round(psd / interval);
			break;
		}
		case "dot_extra_per_tick":
			if (effect.value != null) f.D_ortho = effect.value;
			break;
		case "dot_damage_increase":
			if (effect.value != null) f.D_ortho = effect.value;
			break;
		case "dot_frequency_increase":
			if (effect.value != null) f.D_ortho = effect.value;
			break;
		case "extended_dot":
			break; // temporal only
		case "on_dispel":
			if (effect.damage != null) f.D_ortho = effect.damage;
			break;

		// §11 Self Buffs
		case "self_buff":
			if (effect.attack_bonus != null) f.S_coeff = effect.attack_bonus;
			if (effect.damage_reduction != null)
				f.DR_A = effect.damage_reduction;
			if (effect.healing_bonus != null) f.H_A = effect.healing_bonus;
			break;
		case "self_buff_extend":
			break; // temporal extension
		case "self_buff_extra":
			if (effect.healing_bonus != null) f.H_A = effect.healing_bonus;
			if (effect.value != null) f.S_coeff = effect.value;
			break;
		case "counter_buff":
			if (effect.reflect_received_damage != null)
				f.D_ortho = effect.reflect_received_damage;
			if (effect.reflect_percent_lost_hp != null)
				f.D_ortho =
					(f.D_ortho ?? 0) + effect.reflect_percent_lost_hp;
			break;
		case "next_skill_buff":
			if (effect.stat === "skill_damage_increase")
				f.M_skill = effect.value ?? 0;
			else if (effect.stat === "damage_increase")
				f.M_dmg = effect.value ?? 0;
			else if (effect.stat === "attack_bonus")
				f.S_coeff = effect.value ?? 0;
			break;
		case "enlightenment_bonus":
			break; // phantom in endgame

		// §12 Debuffs
		case "debuff":
		case "conditional_debuff":
		case "cross_slot_debuff":
			if (effect.target === "healing_received")
				f.H_red = Math.abs(effect.value ?? 0);
			else if (
				effect.target === "damage_reduction" ||
				effect.target === "final_damage_reduction"
			)
				f.M_final = Math.abs(effect.value ?? 0);
			break;
		case "counter_debuff":
		case "counter_debuff_upgrade":
			break; // reactive meta

		// §13 Special Mechanics
		case "summon": {
			const model: EffectModel = { type: t };
			model.summon = {
				inherit_stats: effect.inherit_stats ?? 0,
				duration: effect.duration ?? 0,
				damage_increase: 0,
			};
			model.temporal = {
				duration: effect.duration ?? 0,
				coverage_type: "duration_based",
			};
			return model;
		}
		case "summon_buff": {
			const model: EffectModel = { type: t };
			model.summon = {
				inherit_stats: 0,
				duration: 0,
				damage_increase: effect.damage_increase ?? 0,
			};
			return model;
		}

		default:
			break;
	}

	const model: EffectModel = { type: t };
	if (Object.keys(f).length > 0) model.factors = f;

	const temporal = deriveTemporal(effect, def);
	if (temporal) model.temporal = temporal;

	return model;
}

function round(v: number): number {
	return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------------------
// List-level mapping — handles probability_multiplier aggregation
// ---------------------------------------------------------------------------

function mapEffectList(rawEffects: any[]): EffectModel[] {
	const effects = filterEndgame(rawEffects);
	const results: EffectModel[] = [];

	// Collect probability_multiplier tiers
	const synchroTiers: { prob: number; mult: number }[] = [];

	for (const e of effects) {
		if (e.type === "probability_multiplier") {
			synchroTiers.push({
				prob: (e.prob ?? 0) / 100,
				mult: e.mult ?? 1,
			});
			continue;
		}
		results.push(mapEffect(e));
	}

	// Aggregate synchro tiers via cascading probability
	if (synchroTiers.length > 0) {
		synchroTiers.sort((a, b) => b.mult - a.mult);

		let remaining = 1;
		let eM = 0;
		let eM2 = 0;

		for (const tier of synchroTiers) {
			const p = remaining * tier.prob;
			eM += p * tier.mult;
			eM2 += p * tier.mult ** 2;
			remaining *= 1 - tier.prob;
		}
		// Remaining probability → 1x (no trigger)
		eM += remaining;
		eM2 += remaining;

		results.push({
			type: "probability_multiplier",
			factors: { M_synchro: round(eM) },
		});
	}

	return results;
}

// ---------------------------------------------------------------------------
// Build model.yaml
// ---------------------------------------------------------------------------

const raw = parseYaml(readFileSync(effectsPath, "utf-8"));

const model: any = {
	effects: {} as Record<string, any>,
	universal_affixes: {} as Record<string, EffectModel[]>,
	school_affixes: {} as Record<string, Record<string, EffectModel[]>>,
};

// Books
for (const [bookName, book] of Object.entries(raw.books ?? {})) {
	const b = book as any;
	const bm: any = {};

	if (b.skill?.length) bm.skill = mapEffectList(b.skill);

	if (b.primary_affix?.effects?.length)
		bm.primary_affix = {
			[b.primary_affix.name]: mapEffectList(b.primary_affix.effects),
		};

	if (b.exclusive_affix?.effects?.length)
		bm.exclusive_affix = {
			[b.exclusive_affix.name]: mapEffectList(b.exclusive_affix.effects),
		};

	if (Object.keys(bm).length > 0) model.effects[bookName] = bm;
}

// Universal affixes
for (const [name, effects] of Object.entries(raw.universal_affixes ?? {}))
	model.universal_affixes[name] = mapEffectList(effects as any[]);

// School affixes
for (const [school, affixes] of Object.entries(raw.school_affixes ?? {})) {
	model.school_affixes[school] = {};
	for (const [name, effects] of Object.entries(
		affixes as Record<string, any[]>,
	))
		model.school_affixes[school][name] = mapEffectList(effects);
}

// ---------------------------------------------------------------------------
// Validate & write
// ---------------------------------------------------------------------------

const validation = ModelYamlSchema.safeParse(model);
if (!validation.success) {
	console.error("Validation errors:");
	for (const issue of validation.error.issues) {
		console.error(`  ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

const header = [
	"# Divine Book model — factor contributions per effect",
	"# Generated from effects.yaml via combat.md §2 mapping rules",
	"# Do not edit manually. Regenerate with: bun app/map.ts",
	"",
].join("\n");

writeFileSync(outPath, header + stringify(model, { lineWidth: 0 }));
console.log(`Wrote ${outPath}`);

// --- Summary ---

let total = 0;
let mapped = 0;

function count(models: EffectModel[]) {
	for (const m of models) {
		total++;
		if (m.factors) mapped++;
	}
}

for (const book of Object.values(model.effects)) {
	const b = book as any;
	if (b.skill) count(b.skill);
	if (b.primary_affix)
		for (const e of Object.values(b.primary_affix) as EffectModel[][])
			count(e);
	if (b.exclusive_affix)
		for (const e of Object.values(b.exclusive_affix) as EffectModel[][])
			count(e);
}
for (const e of Object.values(model.universal_affixes)) count(e as EffectModel[]);
for (const s of Object.values(model.school_affixes))
	for (const e of Object.values(s as Record<string, EffectModel[]>))
		count(e);

console.log(
	`Summary: ${total} effects total, ${mapped} mapped (${Math.round((mapped / total) * 100)}%), ${total - mapped} unmapped`,
);
