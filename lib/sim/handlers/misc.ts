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
