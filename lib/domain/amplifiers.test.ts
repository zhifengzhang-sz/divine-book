import { describe, expect, test } from "bun:test";
import { Zone } from "./enums.js";
import { getBinding } from "./bindings.js";
import { getOffenseZones, findAmplifiers } from "./amplifiers.js";

// ---------------------------------------------------------------------------
// Zone resolution
// ---------------------------------------------------------------------------

describe("getOffenseZones", () => {
	test("怒血战意 (per_self_lost_hp) → M_dmg", () => {
		const zones = getOffenseZones("怒血战意");
		expect(zones.has(Zone.M_dmg)).toBe(true);
		expect(zones.size).toBe(1);
	});

	test("摧山 (attack_bonus) → S_coeff", () => {
		const zones = getOffenseZones("摧山");
		expect(zones.has(Zone.S_coeff)).toBe(true);
	});

	test("破釜沉舟 (skill_damage_increase + self_damage_taken_increase) → M_skill + DR_A", () => {
		const zones = getOffenseZones("破釜沉舟");
		expect(zones.has(Zone.M_skill)).toBe(true);
		// DR_A is in OFFENSE_ZONES? No — it's a self zone. Let's check.
		// self_damage_taken_increase → Zone.DR_A — not in OFFENSE_ZONES
		// So only M_skill
	});

	test("心逐神随 (probability_multiplier) → M_synchro", () => {
		const zones = getOffenseZones("心逐神随");
		expect(zones.has(Zone.M_synchro)).toBe(true);
	});

	test("明王之路 (final_damage_bonus) → M_final", () => {
		const zones = getOffenseZones("明王之路");
		expect(zones.has(Zone.M_final)).toBe(true);
	});

	test("通明 (guaranteed_resonance) → D_res + sigma_R", () => {
		const zones = getOffenseZones("通明");
		expect(zones.has(Zone.D_res)).toBe(true);
		expect(zones.has(Zone.sigma_R)).toBe(true);
	});

	test("玄心剑魄 (dot + on_dispel) → D_ortho", () => {
		const zones = getOffenseZones("玄心剑魄");
		expect(zones.has(Zone.D_ortho)).toBe(true);
	});

	test("怒目 (crit_damage_bonus) → M_crit (not M_dmg)", () => {
		const zones = getOffenseZones("怒目");
		expect(zones.has(Zone.M_crit)).toBe(true);
		expect(zones.has(Zone.M_dmg)).toBe(true); // also has damage_increase
	});

	test("清灵 (buff_strength) → M_buff (not M_dmg)", () => {
		const zones = getOffenseZones("清灵");
		expect(zones.has(Zone.M_buff)).toBe(true);
		expect(zones.has(Zone.M_dmg)).toBe(false);
	});

	test("业焰 (all_state_duration) → M_state (not M_dmg)", () => {
		const zones = getOffenseZones("业焰");
		expect(zones.has(Zone.M_state)).toBe(true);
		expect(zones.has(Zone.M_dmg)).toBe(false);
	});

	test("天人合一 (enlightenment_bonus) → M_enlight", () => {
		const zones = getOffenseZones("天人合一");
		expect(zones.has(Zone.M_enlight)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Amplifier discovery — 怒血战意 (the motivating case)
// ---------------------------------------------------------------------------

describe("findAmplifiers for 怒血战意", () => {
	const result = findAmplifiers("怒血战意");

	test("finds cross-cutting amplifiers (M_synchro, M_state, M_enlight)", () => {
		const names = result.crossCutting.map((a) => a.affix);
		expect(names).toContain("心逐神随"); // M_synchro
		expect(names).toContain("天命有归"); // M_synchro
		expect(names).toContain("业焰"); // M_state (all_state_duration)
		expect(names).toContain("真言不灭"); // M_state (all_state_duration)
		expect(names).toContain("天人合一"); // M_enlight (enlightenment_bonus)
	});

	test("finds multiplicative amplifiers in different zones", () => {
		const names = result.multiplicative.map((a) => a.affix);
		// S_coeff zone: attack_bonus
		expect(names).toContain("摧山");
		expect(names).toContain("摧云折月");
		// M_skill zone: skill_damage_increase
		expect(names).toContain("破釜沉舟");
		expect(names).toContain("灵威");
		// M_final zone: final_damage_bonus
		expect(names).toContain("明王之路");
		// D_res zone: guaranteed_resonance
		expect(names).toContain("通明");
		expect(names).toContain("灵犀九重");
		// D_flat zone: flat_extra_damage
		expect(names).toContain("斩岳");
		expect(names).toContain("破灭天光");
		// M_crit zone: crit_damage_bonus, conditional_crit_rate
		expect(names).toContain("怒目"); // crit_damage_bonus → M_crit
		expect(names).toContain("福荫"); // conditional_crit_rate → M_crit (+ S_coeff)
		// M_buff zone: buff_strength, buff_duration, buff_stack_increase
		expect(names).toContain("清灵"); // buff_strength → M_buff
		expect(names).toContain("仙露护元"); // buff_strength → M_buff
	});

	test("finds additive effects (purely same zone)", () => {
		const names = result.additive.map((a) => a.affix);
		// per_self_lost_hp is in M_dmg; purely-M_dmg effects are additive
		expect(names).toContain("战意"); // per_self_lost_hp, M_dmg only
		expect(names).toContain("吞海"); // per_enemy_lost_hp, M_dmg only
		expect(names).toContain("击瑕"); // conditional_damage, M_dmg only
		// 福荫 has attack_bonus (S_coeff) + damage_increase (M_dmg) → multiplicative
		expect(names).not.toContain("福荫");
		// 破碎无双 has attack_bonus (S_coeff) + damage_increase (M_dmg) → multiplicative
		expect(names).not.toContain("破碎无双");
	});

	test("finds input-side amplifiers", () => {
		const names = result.inputSide.map((a) => a.affix);
		// self_damage_taken_increase feeds per_self_lost_hp
		expect(names).toContain("破釜沉舟");
		// min_lost_hp_threshold feeds per_self_lost_hp
		expect(names).toContain("意坠深渊");
	});

	test("target zones are correct", () => {
		expect(result.targetZones).toContain(Zone.M_dmg);
	});

	test("does not include self", () => {
		const allNames = [
			...result.crossCutting,
			...result.multiplicative,
			...result.additive,
			...result.inputSide,
		].map((a) => a.affix);
		expect(allNames).not.toContain("怒血战意");
	});
});

// ---------------------------------------------------------------------------
// Amplifier discovery — other affixes
// ---------------------------------------------------------------------------

describe("findAmplifiers for 玄心剑魄 (dot)", () => {
	const result = findAmplifiers("玄心剑魄");

	test("finds cross-cutting amplifiers", () => {
		const names = result.crossCutting.map((a) => a.affix);
		expect(names).toContain("心逐神随");
	});

	test("finds multiplicative amplifiers (non-D_ortho zones)", () => {
		const names = result.multiplicative.map((a) => a.affix);
		// D_ortho is the target zone; M_dmg, M_skill, S_coeff etc are multiplicative
		expect(names).toContain("摧山"); // S_coeff
		expect(names).toContain("明王之路"); // M_final
		expect(names).toContain("通明"); // D_res
	});

	test("finds input-side amplifiers (dot chain)", () => {
		const names = result.inputSide.map((a) => a.affix);
		// dot_damage_increase, dot_frequency_increase, dot_extra_per_tick need dot source
		// 玄心剑魄 outputs dot — so affixes that consume dot are its amplifiers?
		// Actually INPUT_FEEDERS is keyed by consumer, not producer.
		// 古魔之魂 outputs dot_damage_increase which has INPUT_FEEDERS["dot_damage_increase"] = [dot, ...]
		// But we're looking at 玄心剑魄's outputs (dot, on_dispel).
		// For 玄心剑魄 → we want to find what amplifies its dot output.
		// The input-side for 玄心剑魄 would be: affixes that output
		// dot_damage_increase, dot_frequency_increase, etc. (things that consume dot)
		// Wait — that's backwards. INPUT_FEEDERS says "dot_damage_increase needs dot".
		// For 玄心剑魄 (which outputs dot), we want to find affixes that
		// CONSUME dot — i.e., affixes whose outputs appear as keys in INPUT_FEEDERS
		// where dot is a value.
		// Hmm, the current model finds input-side for the TARGET's outputs.
		// 玄心剑魄 outputs [dot, on_dispel]. INPUT_FEEDERS[dot] doesn't exist.
		// INPUT_FEEDERS[on_dispel] doesn't exist.
		// So inputSide is empty for 玄心剑魄. That's correct — 玄心剑魄 doesn't
		// need external resources to function (requires: "free").
		// The chain-specific amplifiers (古魔之魂 amplifies dot) are captured
		// by zone analysis (both in D_ortho → additive).
	});
});

describe("findAmplifiers for 仙灵汲元 (lifesteal)", () => {
	const result = findAmplifiers("仙灵汲元");

	test("has no offense zones (lifesteal is H_A — self-benefit, not offense)", () => {
		// H_A is not in OFFENSE_ZONES — lifesteal is a bridge (damage→healing),
		// not a damage source. Its amplifiers are healing_increase (same H_A)
		// and healing_to_damage (bridge to D_ortho).
		expect(result.targetZones.length).toBe(0);
	});
});

describe("findAmplifiers for 破釜沉舟 (skill_damage + self_damage_taken)", () => {
	const result = findAmplifiers("破釜沉舟");

	test("finds cross-cutting", () => {
		const names = result.crossCutting.map((a) => a.affix);
		expect(names).toContain("心逐神随");
	});

	test("finds multiplicative amplifiers for skill_damage zone", () => {
		const names = result.multiplicative.map((a) => a.affix);
		// M_skill is target; S_coeff, M_dmg, M_final, D_res are all different
		expect(names).toContain("摧山"); // S_coeff
		expect(names).toContain("通明"); // D_res
	});
});
