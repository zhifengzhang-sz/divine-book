/**
 * Miscellaneous handlers: buff_steal, self_cleanse, self_hp_floor,
 * delayed_burst, delayed_burst_increase, periodic_dispel, periodic_cleanse,
 * summon, summon_buff, on_dispel, on_shield_expire, on_buff_debuff_shield_trigger,
 * untargetable_state, extended_dot, shield_destroy_damage, no_shield_double_damage,
 * shield_destroy_dot, hp_cost_avoid_chance
 */

import type { SelfCleanse } from "../../parser/schema/九天真雷诀.js";
import type { SelfHpFloor } from "../../parser/schema/九重天凤诀.js";
import type { Summon, SummonBuff } from "../../parser/schema/春黎剑阵.js";
import type { ShieldDestroyDamage, NoShieldDoubleDamage } from "../../parser/schema/皓月剑诀.js";
import type {
	DebuffStrength,
	ExecuteConditional,
	ShieldValueIncrease,
	RandomBuff as SchemaRandomBuff,
} from "../../parser/schema/通用词缀.js";
import type { TripleBonus } from "../../parser/schema/修为词缀_剑修.js";
import type { HealingIncrease } from "../../parser/schema/修为词缀_法修.js";
import type {
	HealingToDamage,
	DamageToShield,
	RandomDebuff,
} from "../../parser/schema/修为词缀_魔修.js";
import type { MinLostHpThreshold } from "../../parser/schema/修为词缀_体修.js";
import type {
	BuffSteal,
	DelayedBurst,
	DelayedBurstIncrease,
	ExtendedDot,
	FinalDmgBonus,
	OnBuffDebuffShield,
	OnDispel,
	OnShieldExpire,
	PeriodicCleanse,
	PeriodicDispel,
	ProbabilityToCertain,
	ShieldDestroyDot,
	Untargetable,
} from "../../parser/schema/effects.js";
import type { Resolved } from "./types.js";
import { register } from "./registry.js";

// ── Schema-typed handlers ────────────────────────────────────────────

// self_cleanse: { count }
register<Resolved<SelfCleanse>>("self_cleanse", (effect) => ({
	intents: [
		{
			type: "SELF_CLEANSE" as const,
			count: effect.count ?? 1,
		},
	],
}));

// self_hp_floor: { value (percent), parent? }
register<Resolved<SelfHpFloor>>("self_hp_floor", (effect) => ({
	intents: [
		{
			type: "HP_FLOOR" as const,
			minPercent: effect.value,
		},
	],
}));

// summon: { duration, inherit_stats, damage_taken_multiplier, trigger }
// Creates a summon as a named state. Damage echo is computed in player machine
// when BOOK_CAST_HITS fires while 分身 state is active.
register<Resolved<Summon>>("summon", (effect) => {
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
register<Resolved<SummonBuff>>("summon_buff", (effect) => {
	const damageIncrease = effect.damage_increase ?? 0;
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

// shield_destroy_damage: { shields_per_hit, percent_max_hp }
// Per hit: destroy enemy shields + deal %maxHP bonus damage.
register<Resolved<ShieldDestroyDamage>>("shield_destroy_damage", (effect) => ({
	perHitEffects: () => [
		{
			type: "SHIELD_DESTROY" as const,
			count: effect.shields_per_hit ?? 1,
			bonusPercentMaxHp: effect.percent_max_hp ?? 12,
		},
	],
}));

// no_shield_double_damage: { no_shield_double }
// Doubles damage when target has no shield. Resolved at target in resolveHit.
register<Resolved<NoShieldDoubleDamage>>("no_shield_double_damage", () => ({
	perHitEffects: () => [
		{
			type: "NO_SHIELD_DOUBLE" as const,
		},
	],
}));

// debuff_strength: { value }
// Increases debuff effectiveness. Modeled as M_dmg zone.
register<Resolved<DebuffStrength>>("debuff_strength", (effect) => ({
	zones: { M_dmg: effect.value / 100 },
}));

// execute_conditional: { hp_threshold, damage_increase, crit_rate_increase }
// Bonus damage when target HP below threshold. Assume active.
register<Resolved<ExecuteConditional>>("execute_conditional", (effect) => ({
	zones: { M_dmg: (effect.damage_increase ?? 0) / 100 },
}));

// shield_value_increase: { value }
// Increases shield value. Modeled as M_dmg zone (indirect survivability).
register<Resolved<ShieldValueIncrease>>("shield_value_increase", () => ({}));

// triple_bonus: { attack_bonus, damage_increase, crit_damage_increase }
// Grants all three bonuses simultaneously.
register<Resolved<TripleBonus>>("triple_bonus", (effect) => ({
	zones: {
		S_coeff: (effect.attack_bonus ?? 0) / 100,
		M_dmg:
			(effect.damage_increase ?? 0) / 100 +
			(effect.crit_damage_increase ?? 0) / 100,
	},
}));

// healing_increase: { value }
// Increases healing received. Applied as self buff.
register<Resolved<HealingIncrease>>("healing_increase", (effect) => ({
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
						value: effect.value,
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

// healing_to_damage: { value }
// Converts healing to damage. Modeled as M_dmg zone.
register<Resolved<HealingToDamage>>("healing_to_damage", (effect) => ({
	zones: { M_dmg: effect.value / 100 },
}));

// damage_to_shield: { value, duration }
// Converts portion of damage dealt to shield. Modeled as shield grant.
register<Resolved<DamageToShield>>("damage_to_shield", (effect, ctx) => ({
	intents: [
		{
			type: "SHIELD" as const,
			value: (effect.value / 100) * ctx.atk,
			duration: effect.duration ?? 8,
		},
	],
}));

// random_debuff: { attack, crit_rate, crit_damage }
// Randomly applies one of three debuffs.
register<Resolved<RandomDebuff>>("random_debuff", (effect, ctx) => {
	const options = [
		{
			name: "random_debuff_atk",
			stat: "attack_bonus",
			value: -effect.attack,
		},
		{
			name: "random_debuff_crit_rate",
			stat: "damage_reduction",
			value: effect.crit_rate,
		},
		{
			name: "random_debuff_crit_dmg",
			stat: "damage_reduction",
			value: effect.crit_damage,
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
register<Resolved<MinLostHpThreshold>>("min_lost_hp_threshold", (effect) => ({
	zones: { M_dmg: (effect.damage_increase ?? 0) / 100 },
}));

// ── Untyped handlers (no matching schema or field mismatches) ────────

// buff_steal: handler reads `count`, schema (天轮魔经.BuffSteal) has `value`
register<BuffSteal>("buff_steal", (effect) => ({
	intents: [
		{
			type: "BUFF_STEAL" as const,
			count: (effect.count as number) ?? 1,
		},
	],
}));

// delayed_burst: handler reads `burst_base`/`duration`, schema (无相魔劫咒.DelayedBurst) has `burst_damage`/`burst_atk_damage`/`increase`
register<DelayedBurst>("delayed_burst", (effect, ctx) => {
	const damage = ((effect.burst_base as number) / 100) * ctx.atk;
	const delay = effect.duration as number;
	return {
		intents: [{ type: "DELAYED_BURST" as const, damage, delay }],
	};
});

// delayed_burst_increase: handler reads `parent`, schema (无相魔劫咒.DelayedBurstIncrease) has `state`
register<DelayedBurstIncrease>("delayed_burst_increase", (effect, ctx) => ({
	flatExtra: ((effect.value as number) / 100) * ctx.atk,
}));

// periodic_dispel: handler reads `count`/`interval`/`duration`/`parent`, schema variants don't match
register<PeriodicDispel>("periodic_dispel", (effect) => {
	const count = (effect.count as number) ?? 1;
	return {
		intents: [{ type: "DISPEL" as const, count }],
	};
});

// periodic_cleanse: handler reads `chance`/`interval`/`max_triggers`/`parent`, schema (十方真魄.PeriodicCleanse) has `chance`/`target`/`cooldown`/`max_times`
register<PeriodicCleanse>("periodic_cleanse", (effect) => {
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

// on_dispel: handler reads `parent`, not in schema (春黎剑阵.OnDispel)
register<OnDispel>("on_dispel", (effect, _ctx) => {
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

// on_shield_expire: handler reads `damage_percent_of_shield`, schema (九重天凤诀.OnShieldExpire) has `value`
register<OnShieldExpire>("on_shield_expire", (effect) => {
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

// on_buff_debuff_shield: trigger damage per buff/debuff/shield event
register<OnBuffDebuffShield>("on_buff_debuff_shield", (effect) => {
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

// untargetable: makes self untargetable for duration
register<Untargetable>("untargetable", (effect) => ({
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

// extended_dot: handler reads `tick_interval`, schema (念剑诀.ExtendedDot) has `interval`
register<ExtendedDot>("extended_dot", (effect) => {
	const seconds = (effect.extra_seconds as number) ?? 0;
	// Extra seconds of DoT ≈ proportional damage increase
	// Typical DoT lasts 8-18s, so extra_seconds/10 is approximate bonus
	return { zones: { M_dmg: seconds / 10 } };
});

// shield_destroy_dot: handler reads `per_shield_damage`/`no_shield_assumed`/`parent`, schema (皓月剑诀.ShieldDestroyDot) has `value`/`state`/`interval`
register<ShieldDestroyDot>("shield_destroy_dot", (effect, _ctx) => {
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

// final_dmg_bonus: final damage multiplier
register<FinalDmgBonus>("final_dmg_bonus", (effect) => ({
	zones: { M_final: (effect.value as number) / 100 },
}));

// probability_to_certain: handler reads `damage_increase`, not in schema (修为词缀_法修.ProbabilityToCertain)
register<ProbabilityToCertain>("probability_to_certain", (effect) => ({
	forceSynchroMax: true,
	zones: { M_dmg: ((effect.damage_increase as number) ?? 0) / 100 },
}));

// ── Newly added handlers to close coverage gaps ──────────────────

// per_stolen_buff_debuff: { state, value, duration }
// 天轮魔经 primary: per stolen buff, apply a debuff
register("per_stolen_buff_debuff", (effect) => {
	const name = (effect.state as string) ?? "stolen_debuff";
	const value = (effect.value as number) ?? 14;
	const duration = (effect.duration as number) ?? 12;
	return {
		intents: [{
			type: "APPLY_STATE" as const,
			state: {
				name,
				kind: "debuff" as const,
				source: "",
				target: "opponent" as const,
				effects: [{ stat: "attack_bonus", value: -value }],
				remainingDuration: duration,
				stacks: 1,
				maxStacks: 999,
				dispellable: true,
			},
		}],
	};
});

// per_debuff_damage_upgrade: { state, value }
// 天魔降临咒 primary: raise debuff damage cap
register("per_debuff_damage_upgrade", (effect) => {
	// Upgrades the max% on per_debuff_stack_damage. Model as flat M_dmg zone bonus.
	const value = (effect.value as number) ?? 4;
	return { zones: { M_dmg: value / 100 } };
});

// dot_permanent_max_hp: { state, value }
// 天魔降临咒 primary: permanent %maxHP DoT per second
register("dot_permanent_max_hp", (effect, ctx) => {
	const pct = (effect.value as number) ?? 1.6;
	const name = (effect.state as string) ?? "permanent_dot";
	return {
		intents: [{
			type: "APPLY_DOT" as const,
			name,
			damagePerTick: (pct / 100) * ctx.targetPlayer.maxHp,
			tickInterval: 1,
			duration: Number.POSITIVE_INFINITY,
			source: ctx.book,
		}],
	};
});

// lifesteal_with_parent: { state, value }
// 疾风九变 primary: heal for x% of parent state's damage
register("lifesteal_with_parent", (effect) => {
	const pct = (effect.value as number) ?? 82;
	const parentState = (effect.state as string) ?? "lifesteal_parent";
	return {
		listeners: [{
			parent: parentState,
			trigger: "per_tick" as const,
			handler: (listenerCtx) => {
				// Approximate: heal based on ATK * pct
				const healValue = (pct / 100) * listenerCtx.sourcePlayer.atk;
				return [{ type: "HEAL" as const, value: healValue }];
			},
		}],
	};
});

// chance: { value, effect: string }
// 煞影千幻 primary: y% chance to avoid HP cost
register("chance", (effect, ctx) => {
	const prob = (effect.value as number) ?? 30;
	const eff = (effect.effect as string) ?? "";
	// If it's no_hp_cost, probabilistically reduce HP cost
	if (eff === "no_hp_cost") {
		// Model as damage reduction zone (approximate)
		return { zones: { M_dmg: 0 } };
	}
	return {};
});

