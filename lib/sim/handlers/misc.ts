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
// Per-tick RNG roll to cleanse all control states, capped at max_triggers.
register("periodic_cleanse", (effect) => {
	const chance = (effect.chance as number) ?? 30;
	const interval = (effect.interval as number) ?? 1;
	const maxTriggers = (effect.max_triggers as number) ?? 1;
	const parent = (effect.parent as string) ?? "periodic_cleanse";

	let triggerCount = 0;

	return {
		intents: [
			{
				type: "APPLY_STATE" as const,
				state: {
					name: "periodic_cleanse",
					kind: "buff" as const,
					source: "",
					target: "self" as const,
					effects: [],
					remainingDuration: Number.POSITIVE_INFINITY,
					stacks: 1,
					maxStacks: 1,
					dispellable: false,
					trigger: "per_tick" as const,
					tickInterval: interval,
					parent,
				},
			},
		],
		listeners: [
			{
				parent: "periodic_cleanse",
				trigger: "per_tick" as const,
				handler: (ctx) => {
					if (triggerCount >= maxTriggers) return [];
					if (!ctx.rng.chance(chance / 100)) return [];
					triggerCount++;
					// Cleanse all control states
					return [{ type: "SELF_CLEANSE" as const, count: 999 }];
				},
			},
		],
	};
});

// summon: { duration, inherit_stats, damage_taken_multiplier, trigger }
// Creates a summon as a named state. Damage echo is computed in player machine
// when BOOK_CAST_HITS fires while 分身 state is active.
register("summon", (effect) => {
	const duration = (effect.duration as number) ?? 16;
	const inheritStats = (effect.inherit_stats as number) ?? 50;
	return {
		intents: [
			{
				type: "APPLY_STATE" as const,
				state: {
					name: "分身",
					kind: "buff" as const,
					source: "",
					target: "self" as const,
					effects: [{ stat: "summon_echo", value: inheritStats }],
					remainingDuration: duration,
					stacks: 1,
					maxStacks: 1,
					dispellable: true,
				},
			},
		],
	};
});

// summon_buff: { damage_taken_reduction_to, damage_increase, parent }
// Buffs the summon's damage output. Stored as state for player machine to read.
register("summon_buff", (effect) => {
	const damageIncrease = (effect.damage_increase as number) ?? 0;
	return {
		intents: [
			{
				type: "APPLY_STATE" as const,
				state: {
					name: "分身_buff",
					kind: "buff" as const,
					source: "",
					target: "self" as const,
					effects: [
						{
							stat: "summon_damage_increase",
							value: damageIncrease,
						},
					],
					remainingDuration: Number.POSITIVE_INFINITY,
					stacks: 1,
					maxStacks: 1,
					dispellable: false,
					parent: "分身",
				},
			},
		],
	};
});

// on_dispel: { damage, stun?, parent }
// Triggers burst damage when a state is dispelled.
// Registered as a listener on the parent state's on_expire event.
register("on_dispel", (effect, _ctx) => {
	const parent = (effect.parent as string) ?? "on_dispel";
	const damagePct = effect.damage as number;
	return {
		listeners: [
			{
				parent,
				trigger: "on_expire" as const,
				handler: (listenerCtx) => [
					{
						type: "HIT" as const,
						hitIndex: -1,
						damage: (damagePct / 100) * listenerCtx.sourcePlayer.atk,
						spDamage: 0,
					},
				],
			},
		],
	};
});

// on_shield_expire: { damage_percent_of_shield }
// Deals damage when shield expires or is consumed. Fires via shield lifecycle.
register("on_shield_expire", (effect) => {
	const pct = (effect.damage_percent_of_shield as number) ?? 100;
	return {
		listeners: [
			{
				parent: "__shield__",
				trigger: "on_expire" as const,
				handler: (listenerCtx) => {
					// shieldValue is injected by fireShieldExpireListeners
					const shieldValue =
						(listenerCtx as unknown as { shieldValue: number }).shieldValue ??
						0;
					if (shieldValue <= 0) return [];
					return [
						{
							type: "HIT" as const,
							hitIndex: -1,
							damage: (pct / 100) * shieldValue,
							spDamage: 0,
						},
					];
				},
			},
		],
	};
});

// on_buff_debuff_shield_trigger: { damage_percent }
// Deals damage when any buff/debuff/shield is applied.
// Registered as a per-hit effect since it fires on each state application.
register("on_buff_debuff_shield_trigger", (effect) => {
	const pct = (effect.damage_percent as number) ?? 0;
	return {
		perHitEffects: () => [
			{
				type: "HP_DAMAGE" as const,
				percent: pct,
				basis: "max" as const,
			},
		],
	};
});

// untargetable_state: { duration }
// Makes player untargetable — hits are discarded entirely in resolveHit.
register("untargetable_state", (effect) => ({
	intents: [
		{
			type: "APPLY_STATE" as const,
			state: {
				name: "untargetable",
				kind: "named" as const,
				source: "",
				target: "self" as const,
				effects: [], // No stat effects — enforced in resolveHit
				remainingDuration: (effect.duration as number) ?? 4,
				stacks: 1,
				maxStacks: 1,
				dispellable: false,
			},
		},
	],
}));

// extended_dot: { extra_seconds, tick_interval, parent }
// extended_dot: { extra_seconds, tick_interval, parent }
// Extends a DoT's active duration. More ticks → more total damage.
// Modeled as M_dmg zone proportional to extension.
register("extended_dot", (effect) => {
	const seconds = (effect.extra_seconds as number) ?? 0;
	// Extra seconds of DoT ≈ proportional damage increase
	// Typical DoT lasts 8-18s, so extra_seconds/10 is approximate bonus
	return { zones: { M_dmg: seconds / 10 } };
});

// shield_destroy_damage: { shields_per_hit, percent_max_hp }
// Per hit: destroy enemy shields + deal %maxHP bonus damage.
register("shield_destroy_damage", (effect) => ({
	perHitEffects: () => [
		{
			type: "SHIELD_DESTROY" as const,
			count: (effect.shields_per_hit as number) ?? 1,
			bonusPercentMaxHp: (effect.percent_max_hp as number) ?? 12,
		},
	],
}));

// no_shield_double_damage: { no_shield_double }
// Doubles damage when target has no shield. Resolved at target in resolveHit.
register("no_shield_double_damage", () => ({
	perHitEffects: () => [
		{
			type: "NO_SHIELD_DOUBLE" as const,
		},
	],
}));

// shield_destroy_dot: { tick_interval, per_shield_damage, no_shield_assumed, parent }
// DoT that deals damage per shield destroyed. Reads actual destroyedShieldsTotal.
register("shield_destroy_dot", (effect, _ctx) => {
	const parent = (effect.parent as string) ?? "shield_destroy_dot";
	const perShield = (effect.per_shield_damage as number) ?? 600;
	const noShieldAssumed = (effect.no_shield_assumed as number) ?? 2;
	return {
		listeners: [
			{
				parent,
				trigger: "per_tick" as const,
				handler: (listenerCtx) => {
					// Use actual destroyed shield count, fallback to no_shield_assumed
					const count = listenerCtx.sourcePlayer.destroyedShieldsTotal || 0;
					const effectiveCount = count > 0 ? count : noShieldAssumed;
					const damage =
						(perShield / 100) * listenerCtx.sourcePlayer.atk * effectiveCount;
					return [
						{
							type: "HIT" as const,
							hitIndex: -1,
							damage,
							spDamage: 0,
						},
					];
				},
			},
		],
	};
});

// hp_cost_avoid_chance: { value, parent }
// hp_cost_avoid_chance: { value, parent }
// Chance to avoid HP cost. Rolls RNG on each HP_COST event.
// Modeled as a damage reduction buff (reducing self-damage from HP costs).
register("hp_cost_avoid_chance", (effect) => {
	const chance = (effect.value as number) ?? 0;
	return {
		intents: [
			{
				type: "APPLY_STATE" as const,
				state: {
					name: "hp_cost_avoid",
					kind: "buff" as const,
					source: "",
					target: "self" as const,
					effects: [
						{
							stat: "damage_reduction",
							value: chance,
						},
					],
					remainingDuration: Number.POSITIVE_INFINITY,
					stacks: 1,
					maxStacks: 1,
					dispellable: false,
				},
			},
		],
	};
});

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
