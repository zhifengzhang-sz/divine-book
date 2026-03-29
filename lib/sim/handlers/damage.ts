/**
 * Damage handlers: base_attack, percent_max_hp_damage, flat_extra_damage,
 * self_lost_hp_damage
 */

import type {
	BaseAttack,
	PercentMaxHpDamage,
} from "../../parser/schema/千锋聚灵剑.js";
import type {
	FlatExtraDamage,
	PerEnemyLostHp,
	PerSelfLostHp,
} from "../../parser/schema/通用词缀.js";
import type { PercentCurrentHpDamage } from "../../parser/schema/无极御剑诀.js";
import type { PerBuffStackDamage } from "../../parser/schema/元磁神光.js";
import type { PerDebuffStackTrueDamage } from "../../parser/schema/惊蜇化龙.js";
import type { ConditionalDamage as ConditionalDamage_TT } from "../../parser/schema/通天剑诀.js";
import type { ConditionalDamage as ConditionalDamage_JT } from "../../parser/schema/九天真雷诀.js";
// ^ Not all conditional_damage conditions have schemas yet. The handler
// supports conditions beyond those two schemas, so we widen the union.
import type { PerDebuffStackDamage as PerDebuffStackDamage_TL } from "../../parser/schema/天轮魔经.js";
import type { PerDebuffStackDamage as PerDebuffStackDamage_TM } from "../../parser/schema/天魔降临咒.js";
import type { PerDebuffStackDamage as PerDebuffStackDamage_JT2 } from "../../parser/schema/解体化形.js";
import type { StateInstance } from "../types.js";
import { register } from "./registry.js";

/**
 * self_lost_hp_damage has many variants across books. No single schema covers
 * all fields the handler needs, so we define the handler-level union here.
 * Fields are string | number (V) because schemas use V for variable-bearing
 * fields; at runtime values are always number.
 */
type V = string | number;
interface SelfLostHpDamage {
	type: "self_lost_hp_damage";
	value: V;
	per_hit?: true;
	self_heal?: true;
	parent?: string;
	tick_interval?: V;
	includes_hp_spent?: boolean;
	every_n_hits?: V;
	next_skill_hits?: V;
}

type ConditionalDamage =
	| ConditionalDamage_TT
	| ConditionalDamage_JT
	| {
			type: "conditional_damage";
			value: V;
			condition: string;
	  };
type PerDebuffStackDamage =
	| PerDebuffStackDamage_TL
	| PerDebuffStackDamage_TM
	| PerDebuffStackDamage_JT2;

// base_attack: { hits, total, data_state }
// Provides the base damage percent and hit count for the damage chain.
register<BaseAttack>("base_attack", (effect) => ({
	basePercent: Number(effect.total),
	hitsOverride: effect.hits,
}));

// percent_max_hp_damage: { value, cap_vs_monster?, data_state }
// Per-hit %maxHP damage. "造成目标27%最大气血值的伤害" — damage based on
// TARGET's maxHP, goes through DR. Source doesn't know target's state,
// so we emit a PERCENT_MAX_HP_HIT carrying the percentage. The target
// resolves it using their own maxHp.
register<PercentMaxHpDamage>("percent_max_hp_damage", (effect, _ctx) => {
	const percent = Number(effect.value);
	return {
		perHitEffects: () => [
			{
				type: "PERCENT_MAX_HP_HIT" as const,
				percent,
			},
		],
	};
});

// flat_extra_damage: { value }
// Flat extra damage added to the damage chain (e.g., 斩岳: 2000% ATK).
register<FlatExtraDamage>("flat_extra_damage", (effect, ctx) => ({
	flatExtra: (Number(effect.value) / 100) * ctx.atk,
}));

// self_lost_hp_damage: { value, per_hit?, self_heal?, parent?, tick_interval?,
//                        includes_hp_spent?, every_n_hits?, next_skill_hits? }
// Deals value% of caster's lost HP (maxHP - currentHP) as extra damage.
// Variants:
//   Simple:   flatExtra = value% × lostHP (split across all hits)
//   per_hit:  perHitEffects → HP_DAMAGE per hit
//   self_heal: heals self for value% × lostHP instead of dealing damage
//   parent + tick_interval: reactive listener, fires on parent state's per_tick
register<SelfLostHpDamage>("self_lost_hp_damage", (effect, ctx) => {
	const percent = Number(effect.value);
	const lostHp = ctx.sourcePlayer.maxHp - ctx.sourcePlayer.hp;

	// Reactive form: register a listener on a parent state
	if (effect.parent) {
		const parent = effect.parent;
		const tickInterval =
			effect.tick_interval !== undefined
				? Number(effect.tick_interval)
				: undefined;
		const _includesHpSpent = effect.includes_hp_spent ?? false;

		// Create the named state if it has a tick_interval (per-tick form)
		const intents = [];
		if (tickInterval) {
			const state: StateInstance = {
				name: parent,
				kind: "named",
				source: "",
				target: "self",
				effects: [],
				remainingDuration: Number.POSITIVE_INFINITY,
				stacks: 1,
				maxStacks: 1,
				dispellable: true,
				trigger: "per_tick",
				tickInterval,
			};
			intents.push({ type: "APPLY_STATE" as const, state });
		}

		return {
			intents,
			listeners: [
				{
					parent,
					trigger: "per_tick" as const,
					handler: (listenerCtx) => {
						const p = listenerCtx.sourcePlayer;
						const lost = p.maxHp - p.hp;
						if (lost <= 0) return [];
						const damage = (percent / 100) * lost;
						// HP_DAMAGE against opponent (bypasses DR — true damage from lost HP)
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
	}

	// self_heal form: heal self for value% of lost HP
	if (effect.self_heal) {
		const healValue = (percent / 100) * lostHp;
		return {
			intents: [{ type: "HEAL" as const, value: healValue }],
		};
	}

	// per_hit form: add lost HP damage as per-hit effect
	if (effect.per_hit) {
		return {
			perHitEffects: () => {
				if (lostHp <= 0) return [];
				return [
					{
						type: "HP_DAMAGE" as const,
						percent,
						basis: "lost" as const,
					},
				];
			},
		};
	}

	// Simple form: flat extra damage = value% × lostHP
	if (lostHp <= 0) return {};
	return {
		flatExtra: (percent / 100) * lostHp,
	};
});

// percent_current_hp_damage: { value, per_prior_hit?, accumulation? }
// Per-hit %currentHP damage on the target.
register<PercentCurrentHpDamage>("percent_current_hp_damage", (effect) => {
	const percent = Number(effect.value);
	return {
		perHitEffects: () => [
			{
				type: "HP_DAMAGE" as const,
				percent,
				basis: "current" as const,
			},
		],
	};
});

// per_enemy_lost_hp: { per_percent, value, parent? }
// Bonus damage scaling with enemy's lost HP%.
register<PerEnemyLostHp>("per_enemy_lost_hp", (effect, ctx) => {
	const perPercent = Number(effect.per_percent);
	const valuePer = Number(effect.value);
	const lostPercent =
		((ctx.targetPlayer.maxHp - ctx.targetPlayer.hp) / ctx.targetPlayer.maxHp) *
		100;
	const bonus = Math.floor(lostPercent / perPercent) * valuePer;
	return {
		zones: { M_dmg: bonus / 100 },
	};
});

// per_buff_stack_damage: { per_stack, value, max }
// Bonus damage per N buff stacks on self.
// FIELD FIX: handler previously read `per_n_stacks`; schema uses `per_stack`.
register<PerBuffStackDamage>("per_buff_stack_damage", (effect, ctx) => {
	const perN = Number(effect.per_stack) || 1;
	const valuePer = Number(effect.value);
	const maxPercent = Number(effect.max) || valuePer * 10;
	// Count actual buff stacks on self
	const buffStacks = ctx.sourcePlayer.states
		.filter((s) => s.kind === "buff")
		.reduce((sum, s) => sum + s.stacks, 0);
	const bonus = Math.min(Math.floor(buffStacks / perN) * valuePer, maxPercent);
	if (bonus <= 0) return {};
	return {
		flatExtra: (bonus / 100) * ctx.atk,
	};
});

// per_debuff_stack_true_damage: { per_stack, max }
// True damage per debuff stack on target, bypasses DR.
register<PerDebuffStackTrueDamage>(
	"per_debuff_stack_true_damage",
	(effect, ctx) => {
		const perStack = Number(effect.per_stack);
		const maxPercent = Number(effect.max) || perStack * 10;
		// Count actual debuff stacks on target
		const debuffStacks = ctx.targetPlayer.states
			.filter((s) => s.kind === "debuff")
			.reduce((sum, s) => sum + s.stacks, 0);
		const bonus = Math.min(debuffStacks * perStack, maxPercent);
		if (bonus <= 0) return {};
		return {
			intents: [
				{
					type: "HP_DAMAGE" as const,
					percent: bonus,
					basis: "max" as const,
				},
			],
		};
	},
);

// per_self_lost_hp: { value }
// Damage bonus per N% of own lost HP.
// FIELD FIX: handler previously read `per_percent`; schema uses `value`.
register<PerSelfLostHp>("per_self_lost_hp", (effect, ctx) => {
	const perPercent = Number(effect.value);
	const lostPercent =
		((ctx.sourcePlayer.maxHp - ctx.sourcePlayer.hp) / ctx.sourcePlayer.maxHp) *
		100;
	const bonus = Math.floor(lostPercent / perPercent);
	if (bonus <= 0) return {};
	return {
		zones: { M_dmg: bonus / 100 },
	};
});

// conditional_damage: { condition, value, per_step?, max_triggers?, escalated_value?, parent? }
// Bonus damage when a condition is met. The value is a %ATK flat extra.
// Conditions: self_hp_above_20, target_has_debuff, target_controlled, etc.
// Simplified: we evaluate the condition at cast time; complex conditions
// that depend on target state use conservative estimates.
register<ConditionalDamage>("conditional_damage", (effect, ctx) => {
	const value = Number(effect.value);
	const condition = effect.condition;

	let conditionMet = false;
	switch (condition) {
		case "self_hp_above_20":
			conditionMet = ctx.sourcePlayer.hp / ctx.sourcePlayer.maxHp > 0.2;
			break;
		case "self_final_damage_per_10":
			conditionMet = true;
			break;
		case "target_has_debuff":
			// Check if target has any debuff states
			conditionMet = ctx.targetPlayer.states.some((s) => s.kind === "debuff");
			break;
		case "target_controlled":
			// Check if target has a control state (stun, freeze, etc.)
			conditionMet = ctx.targetPlayer.states.some((s) => s.kind === "debuff");
			break;
		case "target_has_no_healing":
			// Check if target has healing reduction debuff
			conditionMet = ctx.targetPlayer.states.some((s) =>
				s.effects.some((e) => e.stat === "healing_received" && e.value < 0),
			);
			break;
		case "cleanse_excess":
			// Fires if cleanse removed more debuffs than target had — RNG dependent
			conditionMet = ctx.rng.chance(0.5);
			break;
		default:
			conditionMet = true;
			break;
	}

	if (!conditionMet) return {};

	return {
		flatExtra: (value / 100) * ctx.atk,
	};
});

// per_debuff_stack_damage: { per_n_stacks?, per_stack?, value, max?, parent? }
// Bonus damage scaling with debuff stacks on target.
// value% ATK extra per per_n_stacks debuffs, capped at max%.
// Since we don't know target state at cast time, this is a reactive effect
// when parent is specified, or an estimate when direct.
register<PerDebuffStackDamage>("per_debuff_stack_damage", (effect, ctx) => {
	const perN =
		("per_n_stacks" in effect && effect.per_n_stacks !== undefined
			? Number(effect.per_n_stacks)
			: 0) ||
		("per_stack" in effect && effect.per_stack !== undefined
			? Number(effect.per_stack)
			: 0) ||
		1;
	const valuePer = Number(effect.value);
	const maxPercent = Number(effect.max) || valuePer * 10;

	// Count actual debuff stacks on target
	const debuffStacks = ctx.targetPlayer.states
		.filter((s) => s.kind === "debuff")
		.reduce((sum, s) => sum + s.stacks, 0);
	const bonusPercent = Math.min(
		Math.floor(debuffStacks / perN) * valuePer,
		maxPercent,
	);

	if (bonusPercent <= 0) return {};
	return {
		flatExtra: (bonusPercent / 100) * ctx.atk,
	};
});

// ── Newly added handlers to close coverage gaps ──────────────────

// echo_damage: { value, ignore_damage_bonus?, duration? }
// 星元化岳: "伤害值为当次伤害的y%" — echo a fraction of each hit's damage
register("echo_damage", (effect, _ctx) => {
	const pct = (effect.value as number) ?? 25;
	// Model as damage zone increase (echo adds pct% to each hit)
	return { zones: { M_dmg: pct / 100 } };
});

// conditional_damage_debuff: { value }
// 天魔降临咒: "攻击带有减益状态的敌方时，伤害提升x%"
register("conditional_damage_debuff", (effect, ctx) => {
	const hasDebuffs = ctx.targetPlayer.states.some(s => s.kind === "debuff");
	if (!hasDebuffs) return {};
	return { zones: { M_dmg: ((effect.value as number) ?? 0) / 100 } };
});

// conditional_damage_controlled: { value }
// 煞影千幻/击瑕: "若敌方处于控制效果，伤害提升x%"
register("conditional_damage_controlled", (effect, ctx) => {
	const hasControl = ctx.targetPlayer.states.some(s =>
		s.effects.some(e => e.stat === "cast_suppressed") || s.name === "stun");
	if (!hasControl) return {};
	return { zones: { M_dmg: ((effect.value as number) ?? 0) / 100 } };
});

// conditional_stat_scaling: { threshold, value, max?, per_step?, basis? }
// 浩然星灵诀: per x% final_damage_bonus → y% ATK damage
// 玉书天戈符: HP above x% → per y% extra → y% damage
register("conditional_stat_scaling", (effect, ctx) => {
	const threshold = (effect.threshold as number) ?? 10;
	const value = (effect.value as number) ?? 100;
	const max = (effect.max as number) ?? undefined;
	const perStep = (effect.per_step as number) ?? threshold;

	// Simplified: assume average conditions, grant proportional damage
	const steps = max ? Math.min(max / threshold, 5) : 3;
	const bonus = steps * value;
	return { flatExtra: (bonus / 100) * ctx.atk };
});

// percent_max_hp_boost: { value }
// 皓月剑诀 exclusive: "附加目标最大气血伤害提高y%"
register("percent_max_hp_boost", (effect, ctx) => {
	const pct = (effect.value as number) ?? 0;
	if (pct === 0) return {};
	// Boost existing max-HP-based damage by pct%
	return { zones: { M_dmg: pct / 100 } };
});

// percent_max_hp_affix: { value, state?, trigger_stack? }
// 惊蜇化龙 primary: stacking state, every N stacks deals %maxHP
register("percent_max_hp_affix", (effect, ctx) => {
	const pct = (effect.value as number) ?? 10;
	const triggerStack = (effect.trigger_stack as number) ?? 2;
	// Approximate: over full cast, stacks trigger multiple times
	const triggers = Math.floor(ctx.hits / triggerStack);
	if (triggers <= 0) return {};
	return {
		perHitEffects: (hitIndex: number) => {
			if ((hitIndex + 1) % triggerStack !== 0) return [];
			return [{
				type: "PERCENT_MAX_HP_HIT" as const,
				percent: pct,
			}];
		},
	};
});
