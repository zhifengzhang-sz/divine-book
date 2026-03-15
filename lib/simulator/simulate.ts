/**
 * Pure simulation functions — the combinator.
 *
 * simulateBook(): EffectRow[] → Intent[]
 * resolveSlot():  BookData + snapshots → SlotResult
 *
 * Two-pass combinator:
 *   Pass 1: producers emit intents
 *   Pass 2: modifiers transform producer intents
 *   Pass 3: parent assembly (nest children under parent states)
 */

import type { EffectRow, BookData } from "../parser/emit.js";
import type {
	Intent,
	AtkDamageIntent,
	OwnerStats,
	EntitySnapshot,
	SlotResult,
	Operator,
	SelfBuffIntent,
	CounterStateIntent,
	DelayedBurstIntent,
	ShieldIntent,
} from "./types.js";

// ─── Effect classification ──────────────────────────────────────

const PRODUCERS = new Set([
	"base_attack",
	"self_hp_cost",
	"self_buff",
	"shield",
	"self_heal",
	"debuff",
	"dot",
	"counter_debuff",
	"counter_buff",
	"delayed_burst",
	"buff_steal",
	"periodic_dispel",
	"shield_destroy_damage",
	"self_cleanse",
	"summon",
	"untargetable_state",
	"lifesteal",
	"self_damage_taken_increase",
	"self_hp_floor",
	"percent_max_hp_damage",
	"percent_current_hp_damage",
	"attack_reduction",
	"crit_rate_reduction",
	"crit_damage_reduction",
	"extended_dot",
	"cross_slot_debuff",
	"periodic_cleanse",
]);

const MODIFIERS = new Set([
	"per_hit_escalation",
	"self_lost_hp_damage",
	"conditional_damage",
	"per_enemy_lost_hp",
	"per_debuff_stack_damage",
	"periodic_escalation",
	"crit_damage_bonus",
	"shield_strength",
	"self_buff_extra",
	"self_buff_extend",
	"counter_debuff_upgrade",
	"delayed_burst_increase",
	"per_self_lost_hp",
	"ignore_damage_reduction",
	"damage_increase",
	"skill_damage_increase",
	"final_damage_bonus",
	"flat_extra_damage",
	"summon_buff",
	"dot_extra_per_tick",
	"dot_damage_increase",
	"attack_bonus",
]);

function isProducer(type: string): boolean {
	return PRODUCERS.has(type);
}

function isModifier(type: string): boolean {
	return MODIFIERS.has(type);
}

function hasParent(e: EffectRow): boolean {
	return typeof e.parent === "string" && e.parent !== "this";
}

// ─── Select tier (highest data_state without specific gating) ───

/**
 * Filter effects to the highest available tier.
 * Effects without data_state are always included.
 * Among effects with data_state, pick the highest tier per type.
 */
export function selectTier(effects: EffectRow[]): EffectRow[] {
	// Group by type
	const groups = new Map<string, EffectRow[]>();
	const ungated: EffectRow[] = [];

	for (const e of effects) {
		if (e.data_state === undefined) {
			ungated.push(e);
		} else if (e.data_state === "locked") {
			// Skip locked effects
			continue;
		} else {
			const key = e.type + (e.name ? `::${e.name}` : "");
			const group = groups.get(key) ?? [];
			group.push(e);
			groups.set(key, group);
		}
	}

	// For each group, pick the last entry (highest tier)
	const tiered: EffectRow[] = [];
	for (const group of groups.values()) {
		tiered.push(group[group.length - 1]);
	}

	return [...ungated, ...tiered];
}

// ─── Producers ──────────────────────────────────────────────────

function produceIntent(e: EffectRow, owner: OwnerStats): Intent[] {
	switch (e.type) {
		case "base_attack":
			return [produceAtkDamage(e, owner)];
		case "self_hp_cost":
			return [produceHpCost(e, owner)];
		case "self_buff":
			return [produceSelfBuff(e)];
		case "shield":
			return [produceShield(e, owner)];
		case "self_heal":
			return [produceHeal(e, owner)];
		case "debuff":
		case "attack_reduction":
		case "crit_rate_reduction":
		case "crit_damage_reduction":
			return [produceDebuff(e)];
		case "dot":
		case "extended_dot":
			return [produceDot(e)];
		case "counter_debuff":
			return [produceCounterDebuff(e)];
		case "counter_buff":
			return [produceCounterBuff(e)];
		case "delayed_burst":
			return [produceDelayedBurst(e, owner)];
		case "buff_steal":
			return [{ type: "BUFF_STEAL", count: (e.count as number) ?? 2, source: owner.id }];
		case "periodic_dispel":
			return [{ type: "DISPEL", count: (e.count as number) ?? 2 }];
		case "shield_destroy_damage":
			return [produceShieldDestroy(e, owner)];
		case "self_cleanse":
		case "periodic_cleanse":
			return [{ type: "CLEANSE", count: (e.count as number) ?? 2 }];
		case "summon":
			return [{
				type: "SUMMON",
				inherit_percent: (e.inherit_stats as number) ?? 54,
				duration: (e.duration as number) ?? 16,
			}];
		case "untargetable_state":
			return [{ type: "UNTARGETABLE", duration: (e.duration as number) ?? 4 }];
		case "lifesteal":
			return [{ type: "LIFESTEAL", percent: (e.value as number) ?? 0 }];
		case "self_damage_taken_increase":
			return [{
				type: "SELF_DAMAGE_INCREASE",
				percent: (e.value as number) ?? 0,
				duration: (e.duration as number) ?? 8,
			}];
		case "self_hp_floor":
			return [{ type: "HP_FLOOR", percent: (e.value as number) ?? 10 }];
		case "percent_max_hp_damage":
			return [{
				type: "HP_DAMAGE",
				percent: (e.value as number) ?? 0,
				basis: "max",
				source: owner.id,
			}];
		case "percent_current_hp_damage":
			return [{
				type: "HP_DAMAGE",
				percent: (e.value as number) ?? 0,
				basis: "current",
				source: owner.id,
				per_prior_hit: (e.per_prior_hit as boolean) ?? false,
			}];
		case "cross_slot_debuff":
			return [produceDebuff(e)];
		default:
			return [];
	}
}

function produceAtkDamage(e: EffectRow, owner: OwnerStats): AtkDamageIntent {
	const hits = (e.hits as number) ?? 1;
	const total = (e.total as number) ?? 0;
	const amount_per_hit = total > 0
		? ((total / 100) * owner.effective_atk) / hits
		: 0;

	return {
		type: "ATK_DAMAGE",
		amount_per_hit,
		hits,
		source: owner.id,
		dr_bypass: 0,
		crit_bonus: 0,
		operators: [],
	};
}

function produceHpCost(e: EffectRow, owner: OwnerStats): Intent {
	const value = (e.value as number) ?? 0;
	return {
		type: "HP_COST",
		amount: (value / 100) * owner.hp,
		per_hit: (e.per_hit as boolean) ?? false,
		tick_interval: e.tick_interval as number | undefined,
		duration: e.duration as number | "permanent" | undefined,
	};
}

function produceSelfBuff(e: EffectRow): SelfBuffIntent {
	return {
		type: "SELF_BUFF",
		id: (e.name as string) ?? "unnamed",
		duration: (e.duration as number | "permanent") ?? 12,
		atk_percent: e.attack_bonus as number | undefined,
		def_percent: e.defense_bonus as number | undefined,
		hp_percent: e.hp_bonus as number | undefined,
		skill_damage_increase: e.skill_damage_increase as number | undefined,
		crit_rate: e.crit_rate as number | undefined,
		damage_reduction: e.damage_reduction as number | undefined,
		per_hit_stack: e.per_hit_stack as boolean | undefined,
		max_stacks: e.max_stacks as number | undefined,
	};
}

function produceShield(e: EffectRow, owner: OwnerStats): ShieldIntent {
	const value = (e.value as number) ?? 0;
	const amount = (value / 100) * owner.max_hp;
	return {
		type: "SHIELD",
		amount,
		duration: (e.duration as number) ?? 8,
	};
}

function produceHeal(e: EffectRow, owner: OwnerStats): Intent {
	const value = (e.value as number) ?? 0;
	return {
		type: "HEAL",
		amount: (value / 100) * owner.max_hp,
	};
}

function produceDebuff(e: EffectRow): Intent {
	const stat = (e.target as string) ?? inferDebuffStat(e.type as string);
	return {
		type: "APPLY_DEBUFF",
		id: (e.name as string) ?? "unnamed",
		stat,
		value: (e.value as number) ?? 0,
		duration: (e.duration as number | "permanent") ?? 8,
		max_stacks: e.max_stacks as number | undefined,
		per_hit_stack: e.per_hit_stack as boolean | undefined,
		dispellable: e.dispellable as boolean | undefined,
	};
}

function inferDebuffStat(type: string): string {
	switch (type) {
		case "attack_reduction":
			return "atk";
		case "crit_rate_reduction":
			return "crit_rate";
		case "crit_damage_reduction":
			return "crit_damage";
		default:
			return "unknown";
	}
}

function produceDot(e: EffectRow): Intent {
	let percent = 0;
	let basis: "max" | "current" | "lost" = "max";

	if (typeof e.percent_current_hp === "number") {
		percent = e.percent_current_hp;
		basis = "current";
	} else if (typeof e.percent_lost_hp === "number") {
		percent = e.percent_lost_hp;
		basis = "lost";
	} else if (typeof e.percent_max_hp === "number") {
		percent = e.percent_max_hp;
		basis = "max";
	}

	return {
		type: "APPLY_DOT",
		id: (e.name as string) ?? "unnamed",
		percent,
		basis,
		tick_interval: (e.tick_interval as number) ?? 1,
		duration: (e.duration as number) ?? 8,
		max_stacks: e.max_stacks as number | undefined,
		per_hit_stack: e.per_hit_stack as boolean | undefined,
		damage_per_tick: e.damage_per_tick as number | undefined,
	};
}

function produceCounterDebuff(e: EffectRow): CounterStateIntent {
	return {
		type: "COUNTER_STATE",
		id: (e.name as string) ?? "unnamed",
		duration: (e.duration as number | "permanent") ?? 8,
		on_hit: {
			chance: (e.on_attacked_chance as number) ?? 100,
			apply_to_attacker: [],
		},
	};
}

function produceCounterBuff(e: EffectRow): CounterStateIntent {
	return {
		type: "COUNTER_STATE",
		id: (e.name as string) ?? "unnamed",
		duration: (e.duration as number | "permanent") ?? 8,
		on_hit: {
			reflect_received_damage: e.reflect_received_damage as number | undefined,
			reflect_percent_lost_hp: e.reflect_percent_lost_hp as number | undefined,
		},
	};
}

function produceDelayedBurst(e: EffectRow, owner: OwnerStats): DelayedBurstIntent {
	const burstBase = (e.burst_base as number) ?? 0;
	return {
		type: "DELAYED_BURST",
		id: (e.name as string) ?? "unnamed",
		duration: (e.duration as number) ?? 12,
		damage_increase_during: (e.damage_increase_during as number) ?? 0,
		burst_base_amount: (burstBase / 100) * owner.effective_atk,
		burst_accumulated_pct: (e.burst_accumulated_pct as number) ?? 0,
	};
}

function produceShieldDestroy(e: EffectRow, owner: OwnerStats): Intent {
	return {
		type: "SHIELD_DESTROY",
		count: (e.shields_per_hit as number) ?? 1,
		bonus_hp_damage: (e.percent_max_hp as number) ?? 0,
		no_shield_double: typeof e.no_shield_double_cap === "number",
		source: owner.id,
	};
}

// ─── Modifiers ──────────────────────────────────────────────────

function applyModifier(e: EffectRow, intents: Intent[], owner: OwnerStats): void {
	switch (e.type) {
		case "crit_damage_bonus":
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.crit_bonus += (e.value as number) ?? 0;
				}
			}
			break;

		case "per_hit_escalation":
			// Transforms uniform hits into escalating hits
			// Stored as operator on ATK_DAMAGE — entity handles during resolution
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.operators.push({
						kind: "per_enemy_lost_hp",
						per_percent: 0, // placeholder — escalation handled differently
					});
					// Instead, store escalation value directly
					(i as AtkDamageIntent & { escalation?: number }).escalation =
						(e.value as number) ?? 0;
				}
			}
			break;

		case "self_lost_hp_damage": {
			if (hasParent(e)) break; // parent-scoped — handled in assembly
			const value = (e.value as number) ?? 0;
			const lostHp = owner.max_hp - owner.hp;
			const extra = (value / 100) * lostHp;
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.amount_per_hit += extra / i.hits;
				}
			}
			break;
		}

		case "per_enemy_lost_hp":
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.operators.push({
						kind: "per_enemy_lost_hp",
						per_percent: (e.per_percent as number) ?? 0,
					});
				}
			}
			break;

		case "per_self_lost_hp":
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.operators.push({
						kind: "per_self_lost_hp",
						per_percent: (e.per_percent as number) ?? 0,
					});
				}
			}
			break;

		case "per_debuff_stack_damage":
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.operators.push({
						kind: "per_debuff_stack",
						value: (e.value as number) ?? 0,
						max_stacks: (e.max as number) ?? 10,
					});
				}
			}
			break;

		case "conditional_damage":
			if (hasParent(e)) break; // parent-scoped
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.operators.push({
						kind: "conditional",
						condition: (e.condition as string) ?? "",
						bonus_percent: (e.value as number) ?? 0,
					});
				}
			}
			break;

		case "shield_strength":
			for (const i of intents) {
				if (i.type === "SHIELD") {
					(i as ShieldIntent).amount = ((e.value as number) / 100) * owner.max_hp;
				}
			}
			break;

		case "self_buff_extra":
			for (const i of intents) {
				if (i.type === "SELF_BUFF" && i.id === (e.buff_name as string)) {
					if (typeof e.healing_bonus === "number") i.healing_percent = e.healing_bonus;
				}
			}
			break;

		case "self_buff_extend":
			for (const i of intents) {
				if (i.type === "SELF_BUFF" && typeof i.duration === "number") {
					i.duration += (e.value as number) ?? 0;
				}
			}
			break;

		case "counter_debuff_upgrade":
			for (const i of intents) {
				if (i.type === "COUNTER_STATE" && i.on_hit) {
					i.on_hit.chance = (e.on_attacked_chance as number) ?? i.on_hit.chance;
				}
			}
			break;

		case "delayed_burst_increase":
			for (const i of intents) {
				if (i.type === "DELAYED_BURST") {
					i.burst_base_amount *= 1 + ((e.value as number) ?? 0) / 100;
				}
			}
			break;

		case "ignore_damage_reduction":
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.dr_bypass = 1;
				}
			}
			break;

		case "damage_increase":
		case "skill_damage_increase":
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.amount_per_hit *= 1 + ((e.value as number) ?? 0) / 100;
				}
			}
			break;

		case "final_damage_bonus":
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.amount_per_hit *= 1 + ((e.value as number) ?? 0) / 100;
				}
			}
			break;

		case "flat_extra_damage":
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					i.amount_per_hit += ((e.value as number) ?? 0) / 100 * owner.effective_atk / i.hits;
				}
			}
			break;

		case "attack_bonus":
			// This modifies effective_atk — recompute ATK_DAMAGE
			for (const i of intents) {
				if (i.type === "ATK_DAMAGE") {
					const bonus = (e.value as number) ?? 0;
					i.amount_per_hit *= 1 + bonus / 100;
				}
			}
			break;

		// These are no-ops for now (deferred or handled elsewhere)
		case "periodic_escalation":
		case "summon_buff":
		case "dot_extra_per_tick":
		case "dot_damage_increase":
			break;
	}
}

// ─── Parent assembly ────────────────────────────────────────────

function assembleParents(
	intents: Intent[],
	parentChildren: Map<string, Intent[]>,
): void {
	for (const intent of intents) {
		if (intent.type === "COUNTER_STATE" && parentChildren.has(intent.id)) {
			const children = parentChildren.get(intent.id)!;
			intent.on_hit.apply_to_attacker = [
				...(intent.on_hit.apply_to_attacker ?? []),
				...children,
			];
		}
	}
}

// ─── The Combinator ─────────────────────────────────────────────

/**
 * Two-pass combinator: produces intents from a book's effects.
 *
 * Pass 1: producers emit intents (skip parent-scoped effects)
 * Pass 2: modifiers transform producer intents
 * Pass 3: nest parent-scoped children under their parent's intent
 */
export function simulateBook(
	effects: EffectRow[],
	owner: OwnerStats,
): Intent[] {
	// Filter to highest tier
	const tiered = selectTier(effects);

	// Separate parent-scoped effects
	const directEffects: EffectRow[] = [];
	const parentChildren = new Map<string, EffectRow[]>();

	for (const e of tiered) {
		if (hasParent(e)) {
			const parent = e.parent as string;
			const children = parentChildren.get(parent) ?? [];
			children.push(e);
			parentChildren.set(parent, children);
		} else {
			directEffects.push(e);
		}
	}

	// Pass 1: producers
	const intents: Intent[] = [];
	for (const e of directEffects) {
		if (isProducer(e.type)) {
			intents.push(...produceIntent(e, owner));
		}
	}

	// Pass 2: modifiers
	for (const e of directEffects) {
		if (isModifier(e.type)) {
			applyModifier(e, intents, owner);
		}
	}

	// Pass 3: parent assembly — produce child intents and nest
	const parentIntents = new Map<string, Intent[]>();
	for (const [parentName, children] of parentChildren) {
		const childIntents: Intent[] = [];
		for (const child of children) {
			if (isProducer(child.type)) {
				childIntents.push(...produceIntent(child, owner));
			}
		}
		parentIntents.set(parentName, childIntents);
	}
	assembleParents(intents, parentIntents);

	return intents;
}

/**
 * Resolve a slot: produce intents from a book, classify as self/opponent.
 */
export function resolveSlot(
	book: BookData,
	owner: EntitySnapshot,
): SlotResult {
	// Collect all effects: skill + primary affix + exclusive affix
	const allEffects: EffectRow[] = [
		...(book.skill ?? []),
		...(book.primary_affix?.effects ?? []),
		...(book.exclusive_affix?.effects ?? []),
	];

	const intents = simulateBook(allEffects, owner);

	// Classify intents as self or opponent
	const self_intents: Intent[] = [];
	const opponent_intents: Intent[] = [];

	for (const intent of intents) {
		if (isSelfIntent(intent)) {
			self_intents.push(intent);
		} else {
			opponent_intents.push(intent);
		}
	}

	return { self_intents, opponent_intents };
}

function isSelfIntent(intent: Intent): boolean {
	switch (intent.type) {
		case "HP_COST":
		case "SELF_BUFF":
		case "SHIELD":
		case "HEAL":
		case "COUNTER_STATE":
		case "CLEANSE":
		case "SUMMON":
		case "UNTARGETABLE":
		case "LIFESTEAL":
		case "SELF_DAMAGE_INCREASE":
		case "CRIT_BONUS":
		case "HP_FLOOR":
		case "SELF_BUFF_EXTEND":
			return true;
		default:
			return false;
	}
}
