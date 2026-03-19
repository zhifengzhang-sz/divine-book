/**
 * Damage handlers: base_attack, percent_max_hp_damage, flat_extra_damage,
 * self_lost_hp_damage
 */

import type { StateInstance } from "../types.js";
import { register } from "./registry.js";

// base_attack: { hits, total, data_state }
// Provides the base damage percent and hit count for the damage chain.
register("base_attack", (effect) => ({
	basePercent: effect.total as number,
	hitsOverride: effect.hits as number,
}));

// percent_max_hp_damage: { value, cap_vs_monster?, data_state }
// Per-hit %maxHP damage. "造成目标27%最大气血值的伤害" — damage based on
// TARGET's maxHP, goes through DR. Source doesn't know target's state,
// so we emit a PERCENT_MAX_HP_HIT carrying the percentage. The target
// resolves it using their own maxHp.
register("percent_max_hp_damage", (effect, _ctx) => {
	const percent = effect.value as number;
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
register("flat_extra_damage", (effect, ctx) => ({
	flatExtra: ((effect.value as number) / 100) * ctx.atk,
}));

// self_lost_hp_damage: { value, per_hit?, self_heal?, parent?, tick_interval?,
//                        includes_hp_spent?, every_n_hits?, name?, next_skill_hits? }
// Deals value% of caster's lost HP (maxHP - currentHP) as extra damage.
// Variants:
//   Simple:   flatExtra = value% × lostHP (split across all hits)
//   per_hit:  perHitEffects → HP_DAMAGE per hit
//   self_heal: heals self for value% × lostHP instead of dealing damage
//   parent + tick_interval: reactive listener, fires on parent state's per_tick
register("self_lost_hp_damage", (effect, ctx) => {
	const percent = effect.value as number;
	const lostHp = ctx.sourcePlayer.maxHp - ctx.sourcePlayer.hp;

	// Reactive form: register a listener on a parent state
	if (effect.parent) {
		const parent = effect.parent as string;
		const tickInterval = effect.tick_interval as number | undefined;
		const _includesHpSpent = (effect.includes_hp_spent as boolean) ?? false;

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
register("percent_current_hp_damage", (effect) => {
	const percent = effect.value as number;
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
// Since we don't know target state, estimate conservatively (50% HP lost).
register("per_enemy_lost_hp", (effect, _ctx) => {
	const perPercent = effect.per_percent as number;
	const valuePer = effect.value as number;
	const estimatedLostPercent = 50;
	const bonus = Math.floor(estimatedLostPercent / perPercent) * valuePer;
	return {
		zones: { M_dmg: bonus / 100 },
	};
});

// per_buff_stack_damage: { per_n_stacks, value, max }
// Bonus damage per N buff stacks on self.
register("per_buff_stack_damage", (effect, ctx) => {
	const perN = (effect.per_n_stacks as number) ?? 1;
	const valuePer = effect.value as number;
	const maxPercent = (effect.max as number) ?? valuePer * 10;
	// Estimate 5 buff stacks
	const bonus = Math.min(Math.floor(5 / perN) * valuePer, maxPercent);
	if (bonus <= 0) return {};
	return {
		flatExtra: (bonus / 100) * ctx.atk,
	};
});

// per_debuff_stack_true_damage: { per_stack, max }
// True damage per debuff stack on target, bypasses DR.
register("per_debuff_stack_true_damage", (effect, _ctx) => {
	const perStack = effect.per_stack as number;
	const maxPercent = (effect.max as number) ?? perStack * 10;
	// Estimate 2 debuff stacks
	const bonus = Math.min(2 * perStack, maxPercent);
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
});

// per_self_lost_hp: { per_percent }
// Damage bonus per N% of own lost HP.
register("per_self_lost_hp", (effect, ctx) => {
	const perPercent = effect.per_percent as number;
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
register("conditional_damage", (effect, ctx) => {
	const value = effect.value as number;
	const condition = effect.condition as string;

	let conditionMet = false;
	switch (condition) {
		case "self_hp_above_20":
			conditionMet = ctx.sourcePlayer.hp / ctx.sourcePlayer.maxHp > 0.2;
			break;
		case "self_final_damage_per_10":
			// Scales with final damage bonus — treat as always active
			conditionMet = true;
			break;
		case "target_has_debuff":
		case "target_controlled":
		case "target_has_no_healing":
			// Target state unknown at cast time — assume true (conservative)
			conditionMet = true;
			break;
		case "cleanse_excess":
			// Only fires if cleanse removes debuffs — assume false
			conditionMet = false;
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

// per_debuff_stack_damage: { per_n_stacks, value, max?, max_stacks?, parent? }
// Bonus damage scaling with debuff stacks on target.
// value% ATK extra per per_n_stacks debuffs, capped at max%.
// Since we don't know target state at cast time, this is a reactive effect
// when parent is specified, or an estimate when direct.
register("per_debuff_stack_damage", (effect, ctx) => {
	const perN = (effect.per_n_stacks as number) ?? 1;
	const valuePer = effect.value as number;
	const maxPercent =
		(effect.max as number) ??
		((effect.max_stacks as number)
			? (effect.max_stacks as number) * valuePer
			: valuePer * 10);

	// For direct effects (no parent): estimate based on typical debuff count
	// We use a conservative estimate of 2 debuff stacks
	const estimatedStacks = 2;
	const bonusPercent = Math.min(
		Math.floor(estimatedStacks / perN) * valuePer,
		maxPercent,
	);

	if (bonusPercent <= 0) return {};
	return {
		flatExtra: (bonusPercent / 100) * ctx.atk,
	};
});
