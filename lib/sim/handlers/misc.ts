/**
 * Miscellaneous handlers: buff_steal, self_cleanse, self_hp_floor,
 * delayed_burst, delayed_burst_increase, periodic_dispel, periodic_cleanse,
 * summon, summon_buff, on_dispel, on_shield_expire, on_buff_debuff_shield_trigger,
 * untargetable_state, extended_dot, shield_destroy_damage, no_shield_double_damage,
 * shield_destroy_dot, hp_cost_avoid_chance
 */

import { register } from "./registry.js";

// buff_steal: { count }
register("buff_steal", (effect) => ({
	intents: [
		{
			type: "BUFF_STEAL" as const,
			count: (effect.count as number) ?? 1,
		},
	],
}));

// self_cleanse: { count }
register("self_cleanse", (effect) => ({
	intents: [
		{
			type: "SELF_CLEANSE" as const,
			count: (effect.count as number) ?? 1,
		},
	],
}));

// self_hp_floor: { value (percent), parent? }
register("self_hp_floor", (effect) => ({
	intents: [
		{
			type: "HP_FLOOR" as const,
			minPercent: effect.value as number,
		},
	],
}));

// delayed_burst: { duration, burst_base }
register("delayed_burst", (effect, ctx) => {
	const damage = ((effect.burst_base as number) / 100) * ctx.atk;
	const delay = effect.duration as number;
	return {
		intents: [{ type: "DELAYED_BURST" as const, damage, delay }],
	};
});

// delayed_burst_increase: { value, parent }
register("delayed_burst_increase", (effect, ctx) => ({
	flatExtra: ((effect.value as number) / 100) * ctx.atk,
}));

// periodic_dispel: { count?, interval?, duration?, parent? }
register("periodic_dispel", (effect) => {
	const count = (effect.count as number) ?? 1;
	return {
		intents: [{ type: "DISPEL" as const, count }],
	};
});

// periodic_cleanse: { chance, interval, cooldown, max_triggers, parent }
// Periodic self-cleanse. Simplified as immediate cleanse.
register("periodic_cleanse", () => ({
	intents: [{ type: "SELF_CLEANSE" as const, count: 1 }],
}));

// summon: { duration, inherit_stats, damage_taken_multiplier, trigger }
// Summons a pet/entity. Simplified as a damage increase buff.
register("summon", (effect) => ({
	zones: { M_dmg: ((effect.inherit_stats as number) ?? 50) / 100 },
}));

// summon_buff: { damage_taken_reduction_to, damage_increase, parent }
// Buffs the summoned entity. Simplified as damage increase.
register("summon_buff", (effect) => ({
	zones: { M_dmg: ((effect.damage_increase as number) ?? 0) / 100 },
}));

// on_dispel: { damage, stun?, parent }
// Triggers damage when a state is dispelled. Simplified as flat extra.
register("on_dispel", (effect, ctx) => ({
	flatExtra: ((effect.damage as number) / 100) * ctx.atk,
}));

// on_shield_expire: { damage_percent_of_shield }
// Deals damage when shield expires. No-op (shield expiry not tracked).
register("on_shield_expire", () => ({}));

// on_buff_debuff_shield_trigger: { damage_percent }
// Deals damage when buff/debuff/shield is applied. Simplified as flat extra.
register("on_buff_debuff_shield_trigger", (effect, ctx) => ({
	flatExtra: ((effect.damage_percent as number) / 100) * ctx.atk,
}));

// untargetable_state: { duration }
// Makes player untargetable. Simplified as damage reduction buff.
register("untargetable_state", (effect) => ({
	intents: [
		{
			type: "APPLY_STATE" as const,
			state: {
				name: "untargetable",
				kind: "buff" as const,
				source: "",
				target: "self" as const,
				effects: [{ stat: "damage_reduction", value: 100 }],
				remainingDuration: (effect.duration as number) ?? 4,
				stacks: 1,
				maxStacks: 1,
				dispellable: false,
			},
		},
	],
}));

// extended_dot: { extra_seconds, tick_interval, parent }
// Extends a DoT duration. No-op in simplified model.
register("extended_dot", () => ({}));

// shield_destroy_damage: { shields_per_hit, percent_max_hp }
// Destroys shields and deals %maxHP damage. Simplified as per-hit effect.
register("shield_destroy_damage", (effect) => ({
	perHitEffects: () => [
		{
			type: "PERCENT_MAX_HP_HIT" as const,
			percent: (effect.percent_max_hp as number) ?? 12,
		},
	],
}));

// no_shield_double_damage: { no_shield_double }
// Doubles damage when target has no shield. Modeled as M_dmg bonus.
register("no_shield_double_damage", () => ({
	zones: { M_dmg: 1.0 },
}));

// shield_destroy_dot: { tick_interval, per_shield_damage, parent }
// DoT that deals extra damage per shield destroyed. Simplified as flat extra.
register("shield_destroy_dot", (effect, ctx) => ({
	flatExtra: ((effect.per_shield_damage as number) / 100) * ctx.atk,
}));

// hp_cost_avoid_chance: { value, parent }
// Chance to avoid HP cost. No-op in simplified model.
register("hp_cost_avoid_chance", () => ({}));

// ── Affix-only effect types ─────────────────────────────────────────

// debuff_strength: { value }
// Increases debuff effectiveness. Modeled as M_dmg zone.
register("debuff_strength", (effect) => ({
	zones: { M_dmg: (effect.value as number) / 100 },
}));

// execute_conditional: { hp_threshold, damage_increase, crit_rate_increase }
// Bonus damage when target HP below threshold. Assume active.
register("execute_conditional", (effect) => ({
	zones: { M_dmg: ((effect.damage_increase as number) ?? 0) / 100 },
}));

// random_buff: { attack, crit_damage, damage }
// Randomly grants one of three buffs.
register("random_buff", (effect, ctx) => {
	const options = [
		{ stat: "S_coeff", value: ((effect.attack as number) ?? 0) / 100 },
		{ stat: "M_dmg", value: ((effect.crit_damage as number) ?? 0) / 100 },
		{ stat: "M_dmg", value: ((effect.damage as number) ?? 0) / 100 },
	].filter((o) => o.value > 0);
	if (options.length === 0) return {};
	const pick = options[Math.floor(ctx.rng.next() * options.length)];
	return { zones: { [pick.stat]: pick.value } };
});

// shield_value_increase: { value }
// Increases shield value. Modeled as M_dmg zone (indirect survivability).
register("shield_value_increase", () => ({}));

// triple_bonus: { attack_bonus, damage_increase, crit_damage_increase }
// Grants all three bonuses simultaneously.
register("triple_bonus", (effect) => ({
	zones: {
		S_coeff: ((effect.attack_bonus as number) ?? 0) / 100,
		M_dmg:
			((effect.damage_increase as number) ?? 0) / 100 +
			((effect.crit_damage_increase as number) ?? 0) / 100,
	},
}));

// healing_increase: { value }
// Increases healing received. Applied as self buff.
register("healing_increase", (effect) => ({
	intents: [
		{
			type: "APPLY_STATE" as const,
			state: {
				name: "healing_increase",
				kind: "buff" as const,
				source: "",
				target: "self" as const,
				effects: [
					{
						stat: "healing_bonus",
						value: effect.value as number,
					},
				],
				remainingDuration: Number.POSITIVE_INFINITY,
				stacks: 1,
				maxStacks: 1,
				dispellable: false,
			},
		},
	],
}));

// final_damage_bonus: { value }
// Additive M_final zone contribution.
register("final_damage_bonus", (effect) => ({
	zones: { M_final: (effect.value as number) / 100 },
}));

// probability_to_certain: { damage_increase }
// Makes probability-based effects certain (always max tier).
// Also grants damage bonus.
register("probability_to_certain", (effect) => ({
	forceSynchroMax: true,
	zones: { M_dmg: ((effect.damage_increase as number) ?? 0) / 100 },
}));

// healing_to_damage: { value }
// Converts healing to damage. Modeled as M_dmg zone.
register("healing_to_damage", (effect) => ({
	zones: { M_dmg: (effect.value as number) / 100 },
}));

// damage_to_shield: { value, duration }
// Converts portion of damage dealt to shield. Modeled as shield grant.
register("damage_to_shield", (effect, ctx) => ({
	intents: [
		{
			type: "SHIELD" as const,
			value: ((effect.value as number) / 100) * ctx.atk,
			duration: (effect.duration as number) ?? 8,
		},
	],
}));

// random_debuff: { attack, crit_rate, crit_damage }
// Randomly applies one of three debuffs.
register("random_debuff", (effect, ctx) => {
	const options = [
		{
			name: "random_debuff_atk",
			stat: "attack_bonus",
			value: -(effect.attack as number),
		},
		{
			name: "random_debuff_crit_rate",
			stat: "damage_reduction",
			value: effect.crit_rate as number,
		},
		{
			name: "random_debuff_crit_dmg",
			stat: "damage_reduction",
			value: effect.crit_damage as number,
		},
	].filter((o) => o.value !== 0 && o.value !== undefined);
	if (options.length === 0) return {};
	const pick = options[Math.floor(ctx.rng.next() * options.length)];
	return {
		intents: [
			{
				type: "APPLY_STATE" as const,
				state: {
					name: pick.name,
					kind: "debuff" as const,
					source: "",
					target: "opponent" as const,
					effects: [{ stat: pick.stat, value: pick.value }],
					remainingDuration: 8,
					stacks: 1,
					maxStacks: 1,
					dispellable: true,
				},
			},
		],
	};
});

// min_lost_hp_threshold: { min_percent, damage_increase }
// Ensures minimum lost HP% for damage scaling. Grants damage bonus.
register("min_lost_hp_threshold", (effect) => ({
	zones: { M_dmg: ((effect.damage_increase as number) ?? 0) / 100 },
}));
