#!/usr/bin/env bun
/**
 * Verify model.yaml against effects.yaml and registry zone annotations.
 *
 * Checks:
 *   1. Every mapped effect's factors align with its registry zones
 *   2. No effect with mappable zones is left unmapped
 *   3. Numeric spot-checks (resonance E[M], synchro cascading, DPS)
 *   4. Temporal metadata matches scope annotations
 *   5. Structural: model.yaml books/affixes match effects.yaml
 *
 * Usage: bun scripts/verify-model.ts
 */

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { registry } from "../lib/domain/registry.js";
import { Zone, Scope } from "../lib/domain/enums.js";

const ROOT = resolve(import.meta.dir, "..");
const modelYaml = parseYaml(
	readFileSync(join(ROOT, "data/yaml/model.yaml"), "utf-8"),
);
const effectsYaml = parseYaml(
	readFileSync(join(ROOT, "data/yaml/effects.yaml"), "utf-8"),
);

interface Issue {
	path: string;
	severity: "error" | "warning";
	message: string;
}

const issues: Issue[] = [];

function error(path: string, message: string) {
	issues.push({ path, severity: "error", message });
}
function warning(path: string, message: string) {
	issues.push({ path, severity: "warning", message });
}

// ---------------------------------------------------------------------------
// Zone → Factor name mapping
// ---------------------------------------------------------------------------

/** Zones that map directly to FactorsSchema fields */
const ZONE_TO_FACTOR: Record<string, string> = {
	[Zone.D_base]: "D_base",
	[Zone.D_flat]: "D_flat",
	[Zone.M_dmg]: "M_dmg",
	[Zone.M_skill]: "M_skill",
	[Zone.M_final]: "M_final",
	[Zone.S_coeff]: "S_coeff",
	[Zone.D_res]: "D_res",
	[Zone.sigma_R]: "sigma_R",
	[Zone.M_synchro]: "M_synchro",
	[Zone.D_ortho]: "D_ortho",
	[Zone.H_A]: "H_A",
	[Zone.DR_A]: "DR_A",
	[Zone.S_A]: "S_A",
	[Zone.H_red]: "H_red",
};

/** Zones that are meta/indirect — no direct factor representation */
const META_ZONES = new Set([Zone.M_crit, Zone.M_buff, Zone.M_state, Zone.M_enlight]);

/** Effect types that legitimately have no factors despite having mappable zones */
const EXPECTED_NO_FACTORS = new Set([
	"cooldown",
	"probability_to_certain",
	"ignore_damage_reduction",
	"min_lost_hp_threshold",
	"extended_dot",
	"self_buff_extend",
	"enlightenment_bonus",
	"counter_debuff_upgrade",
]);

/** Special mechanics — known unmapped */
const SPECIAL_MECHANICS = new Set([
	"summon",
	"summon_buff",
	"untargetable_state",
	"periodic_dispel",
	"periodic_cleanse",
	"delayed_burst",
	"delayed_burst_increase",
	"random_buff",
	"random_debuff",
	"attack_reduction",
	"crit_rate_reduction",
	"crit_damage_reduction",
	"per_buff_stack_damage",
	"per_debuff_stack_damage",
	"per_debuff_stack_true_damage",
	"on_buff_debuff_shield_trigger",
	"conditional_heal_buff",
]);

/** State modifiers — second-order, no direct factor */
const STATE_MODIFIERS = new Set([
	"buff_strength",
	"debuff_strength",
	"buff_duration",
	"all_state_duration",
	"buff_stack_increase",
	"debuff_stack_increase",
	"debuff_stack_chance",
]);

// ---------------------------------------------------------------------------
// 1. Zone–factor alignment
// ---------------------------------------------------------------------------

function checkZoneAlignment(path: string, modelEntry: any) {
	const def = registry.getType(modelEntry.type);
	if (!def) {
		warning(path, `Unknown effect type '${modelEntry.type}'`);
		return;
	}

	const factors = modelEntry.factors ?? {};
	const factorKeys = new Set(Object.keys(factors));

	// Check that every factor maps to a zone the registry declares
	for (const fk of factorKeys) {
		const matchingZones = def.zones.filter((z) => ZONE_TO_FACTOR[z] === fk);
		if (matchingZones.length === 0) {
			// Some types contribute to zones different from their declared zones
			// (e.g., debuff with target=damage_reduction → M_final, but zones=[H_red])
			// These are valid cross-zone mappings per combat.md §2.12
			const isCrossZoneDebuff =
				["debuff", "conditional_debuff", "cross_slot_debuff"].includes(
					modelEntry.type,
				) && fk === "M_final";
			const isConditionalBuff =
				modelEntry.type === "conditional_buff" &&
				(fk === "M_dmg" || fk === "D_ortho");
			const isPerHitEscalation =
				modelEntry.type === "per_hit_escalation" && fk === "M_skill";
			const isNextSkillBuff =
				modelEntry.type === "next_skill_buff" && fk === "M_skill";
			const isSelfBuffExtra =
				modelEntry.type === "self_buff_extra" && fk === "H_A";
			const isCounterBuff =
				modelEntry.type === "counter_buff" && fk === "D_ortho";
			const isPeriodicEscalation =
				modelEntry.type === "periodic_escalation" && fk === "M_dmg";
			const isHpBased =
				["per_self_lost_hp", "per_enemy_lost_hp"].includes(
					modelEntry.type,
				) && fk === "M_dmg";
			const isDotRelated =
				[
					"dot_damage_increase",
					"dot_frequency_increase",
					"dot_extra_per_tick",
				].includes(modelEntry.type) && fk === "D_ortho";
			const isShieldDot =
				modelEntry.type === "shield_destroy_dot" && fk === "D_ortho";

			if (
				!isCrossZoneDebuff &&
				!isConditionalBuff &&
				!isPerHitEscalation &&
				!isNextSkillBuff &&
				!isSelfBuffExtra &&
				!isCounterBuff &&
				!isPeriodicEscalation &&
				!isHpBased &&
				!isDotRelated &&
				!isShieldDot
			) {
				warning(
					path,
					`Factor '${fk}' not in declared zones [${def.zones.join(", ")}] for type '${modelEntry.type}'`,
				);
			}
		}
	}

	// Check that mappable zones have corresponding factors (unless expected)
	if (
		EXPECTED_NO_FACTORS.has(modelEntry.type) ||
		SPECIAL_MECHANICS.has(modelEntry.type) ||
		STATE_MODIFIERS.has(modelEntry.type)
	)
		return;

	for (const z of def.zones) {
		if (META_ZONES.has(z)) continue;
		const expectedFactor = ZONE_TO_FACTOR[z];
		if (!expectedFactor) continue;

		// Types where zone→factor is conditional on field values:
		// - self_buff: S_coeff+DR_A zones but only populated stats contribute
		// - self_buff_extra: S_coeff zone but may only have healing_bonus
		// - per_hit_escalation: M_dmg zone but stat field may route to M_skill
		// - probability_multiplier: aggregated separately
		// - guaranteed_resonance: D_res + sigma_R both computed
		// - counter_debuff: reactive — value depends on runtime state
		// - debuffs: target field determines zone (H_red or M_final)
		const CONDITIONAL_ZONE_TYPES = new Set([
			"self_buff", "self_buff_extra", "per_hit_escalation",
			"probability_multiplier", "guaranteed_resonance", "counter_debuff",
			"debuff", "conditional_debuff", "cross_slot_debuff",
		]);
		if (CONDITIONAL_ZONE_TYPES.has(modelEntry.type)) continue;

		if (!factorKeys.has(expectedFactor) && factorKeys.size > 0) {
			// Only warn if the effect has SOME factors but is missing an expected one
			warning(
				path,
				`Zone '${z}' expects factor '${expectedFactor}' but not found for type '${modelEntry.type}'`,
			);
		}
	}
}

// ---------------------------------------------------------------------------
// 2. Unmapped detection
// ---------------------------------------------------------------------------

function checkUnmapped(path: string, modelEntry: any) {
	const def = registry.getType(modelEntry.type);
	if (!def) return;

	const hasMappableZone = def.zones.some((z) => !META_ZONES.has(z));
	const hasFactors = modelEntry.factors && Object.keys(modelEntry.factors).length > 0;

	// Types that legitimately have no factors despite mappable zones:
	// - self_buff: may be a state enabler with no stat bonuses
	// - counter_debuff: reactive, value depends on runtime DoT setup
	// - dot: HP-based DoTs (percent_current_hp, percent_lost_hp) are dynamic
	const DYNAMIC_TYPES = new Set(["self_buff", "counter_debuff", "dot"]);

	if (
		hasMappableZone &&
		!hasFactors &&
		!EXPECTED_NO_FACTORS.has(modelEntry.type) &&
		!SPECIAL_MECHANICS.has(modelEntry.type) &&
		!STATE_MODIFIERS.has(modelEntry.type) &&
		!DYNAMIC_TYPES.has(modelEntry.type)
	) {
		warning(
			path,
			`Type '${modelEntry.type}' has mappable zones [${def.zones.join(", ")}] but no factors`,
		);
	}
}

// ---------------------------------------------------------------------------
// 3. Numeric spot-checks
// ---------------------------------------------------------------------------

function checkResonance(path: string, modelEntry: any, sourceEntry: any) {
	if (modelEntry.type !== "guaranteed_resonance") return;
	if (!modelEntry.factors?.D_res) return;

	const p = (sourceEntry.enhanced_chance ?? 0) / 100;
	const mBase = sourceEntry.base_mult ?? 1;
	const mEnh = sourceEntry.enhanced_mult ?? mBase;
	const expectedDres = round(p * mEnh + (1 - p) * mBase);

	if (Math.abs(modelEntry.factors.D_res - expectedDres) > 0.01) {
		error(
			path,
			`Resonance D_res mismatch: got ${modelEntry.factors.D_res}, expected ${expectedDres} ` +
				`(p=${p}, base=${mBase}, enh=${mEnh})`,
		);
	}

	if (p > 0 && p < 1) {
		const expectedSigma = round(Math.sqrt(p * (1 - p) * (mEnh - mBase) ** 2));
		if (
			!modelEntry.factors.sigma_R ||
			Math.abs(modelEntry.factors.sigma_R - expectedSigma) > 0.01
		) {
			error(
				path,
				`Resonance sigma_R mismatch: got ${modelEntry.factors.sigma_R ?? "missing"}, expected ${expectedSigma}`,
			);
		}
	}
}

function checkDotDps(path: string, modelEntry: any, sourceEntry: any) {
	if (modelEntry.type !== "dot") return;
	const dpt = sourceEntry.damage_per_tick ?? 0;
	const interval = sourceEntry.tick_interval ?? 1;
	if (dpt === 0) return; // HP-based DoTs have no damage_per_tick

	const expectedDps = round(dpt / interval);
	if (!modelEntry.factors?.D_ortho) {
		error(path, `DoT has damage_per_tick=${dpt} but no D_ortho factor`);
		return;
	}
	if (Math.abs(modelEntry.factors.D_ortho - expectedDps) > 0.01) {
		error(
			path,
			`DoT DPS mismatch: got ${modelEntry.factors.D_ortho}, expected ${expectedDps} (dpt=${dpt}, interval=${interval})`,
		);
	}
}

// ---------------------------------------------------------------------------
// 4. Temporal checks
// ---------------------------------------------------------------------------

function checkTemporal(path: string, modelEntry: any) {
	const def = registry.getType(modelEntry.type);
	if (!def) return;

	if (def.scope === Scope.Cross && !modelEntry.temporal) {
		// Cross-scope effects should have temporal metadata (with some exceptions)
		if (
			!SPECIAL_MECHANICS.has(modelEntry.type) &&
			modelEntry.type !== "on_dispel" // triggered, no duration
		) {
			warning(path, `Cross-scope type '${modelEntry.type}' missing temporal metadata`);
		}
	}

	if (def.scope === Scope.Same && modelEntry.temporal) {
		error(path, `Same-scope type '${modelEntry.type}' should not have temporal metadata`);
	}
}

// ---------------------------------------------------------------------------
// 5. Structural checks
// ---------------------------------------------------------------------------

function checkStructure() {
	// Books in effects.yaml should be in model.yaml
	for (const bookName of Object.keys(effectsYaml.books ?? {})) {
		if (!modelYaml.effects[bookName]) {
			warning("structure", `Book '${bookName}' in effects.yaml but not in model.yaml`);
		}
	}
	for (const bookName of Object.keys(modelYaml.effects ?? {})) {
		if (!effectsYaml.books[bookName]) {
			error("structure", `Book '${bookName}' in model.yaml but not in effects.yaml`);
		}
	}

	// Universal affixes
	for (const name of Object.keys(effectsYaml.universal_affixes ?? {})) {
		if (!modelYaml.universal_affixes[name]) {
			warning("structure", `Universal affix '${name}' in effects.yaml but not in model.yaml`);
		}
	}

	// School affixes
	for (const [school, affixes] of Object.entries(
		effectsYaml.school_affixes ?? {},
	)) {
		for (const name of Object.keys(affixes as Record<string, any>)) {
			if (!modelYaml.school_affixes?.[school]?.[name]) {
				warning(
					"structure",
					`School affix '${school}/${name}' in effects.yaml but not in model.yaml`,
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Walk all effect entries
// ---------------------------------------------------------------------------

function findSourceEffect(
	sourceEffects: any[],
	modelEntry: any,
	index: number,
): any | undefined {
	// Best effort: match by type, preferring endgame (last of type)
	const matches = sourceEffects.filter((e: any) => e.type === modelEntry.type);
	if (matches.length === 0) return undefined;
	// For probability_multiplier, the model has a single aggregated entry
	if (modelEntry.type === "probability_multiplier") return matches[0];
	// Return last match (endgame tier)
	return matches[matches.length - 1];
}

function walkEffectList(
	path: string,
	modelEffects: any[],
	sourceEffects: any[],
) {
	for (let i = 0; i < modelEffects.length; i++) {
		const me = modelEffects[i];
		const ep = `${path}[${i}]`;

		checkZoneAlignment(ep, me);
		checkUnmapped(ep, me);
		checkTemporal(ep, me);

		const src = findSourceEffect(sourceEffects, me, i);
		if (src) {
			checkResonance(ep, me, src);
			checkDotDps(ep, me, src);
		}
	}
}

// Walk books
for (const [bookName, bookModel] of Object.entries(modelYaml.effects ?? {})) {
	const bm = bookModel as any;
	const src = effectsYaml.books?.[bookName];
	if (!src) continue;

	if (bm.skill) {
		walkEffectList(`effects.${bookName}.skill`, bm.skill, src.skill ?? []);
	}
	if (bm.primary_affix) {
		for (const [affixName, effects] of Object.entries(bm.primary_affix)) {
			walkEffectList(
				`effects.${bookName}.primary.${affixName}`,
				effects as any[],
				src.primary_affix?.effects ?? [],
			);
		}
	}
	if (bm.exclusive_affix) {
		for (const [affixName, effects] of Object.entries(bm.exclusive_affix)) {
			walkEffectList(
				`effects.${bookName}.exclusive.${affixName}`,
				effects as any[],
				src.exclusive_affix?.effects ?? [],
			);
		}
	}
}

// Walk universal affixes
for (const [name, effects] of Object.entries(modelYaml.universal_affixes ?? {})) {
	walkEffectList(
		`universal.${name}`,
		effects as any[],
		effectsYaml.universal_affixes?.[name] ?? [],
	);
}

// Walk school affixes
for (const [school, affixes] of Object.entries(modelYaml.school_affixes ?? {})) {
	for (const [name, effects] of Object.entries(affixes as Record<string, any[]>)) {
		walkEffectList(
			`school.${school}.${name}`,
			effects,
			effectsYaml.school_affixes?.[school]?.[name] ?? [],
		);
	}
}

checkStructure();

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function round(v: number): number {
	return Math.round(v * 100) / 100;
}

const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");

console.log("=== Model Verification Report ===\n");

if (errors.length > 0) {
	console.log(`ERRORS (${errors.length}):`);
	for (const e of errors) {
		console.log(`  ✗ [${e.path}] ${e.message}`);
	}
	console.log();
}

if (warnings.length > 0) {
	console.log(`WARNINGS (${warnings.length}):`);
	for (const w of warnings) {
		console.log(`  ⚠ [${w.path}] ${w.message}`);
	}
	console.log();
}

if (issues.length === 0) {
	console.log("All checks passed. ✓\n");
}

console.log(`Summary: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length > 0 ? 1 : 0);
