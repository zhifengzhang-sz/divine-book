/**
 * Pure slot resolution — no actors, no side effects.
 *
 * resolveSlot() does everything the old slotMachine entry action did,
 * but reads from immutable snapshots instead of the actor system.
 * Returns events to apply — does NOT send them.
 */

import { resolveHit } from "./damage";
import type {
	ConditionalFactor,
	FactorVector,
	HealEvent,
	HitEvent,
	SlotDef,
	StateDef,
} from "./types";
import type { StateEffectInput } from "./actors/state-effect";

// ---------------------------------------------------------------------------
// Snapshot types — immutable view of entity state at round start
// ---------------------------------------------------------------------------

export interface EntitySnapshot {
	id: string;
	hp: number;
	max_hp: number;
	effective_atk: number;
	effective_dr: number;
	buff_modifiers: Partial<FactorVector>;
	has_debuff: boolean;
	debuff_count: number;
	buff_count: number;
}

// ---------------------------------------------------------------------------
// Result types — events to apply after resolution
// ---------------------------------------------------------------------------

export interface SlotResult {
	hits: Array<{ target: string; event: HitEvent }>;
	heals: Array<{ target: string; event: HealEvent }>;
	self_hits: Array<{ target: string; event: HitEvent }>;
	states: Array<{ id: string; input: StateEffectInput; target_entity: string }>;
	stacks: Array<{ state_base_id: string; count: number }>;
}

// ---------------------------------------------------------------------------
// takeEntitySnapshot — read entity + state effect actors into a snapshot
// ---------------------------------------------------------------------------

export function takeEntitySnapshot(
	system: { get(id: string): { getSnapshot(): { value: string; context: any } } | undefined },
	entityId: string,
): EntitySnapshot {
	const entityActor = system.get(entityId);
	const ctx = entityActor?.getSnapshot()?.context as any;
	if (!ctx) {
		return {
			id: entityId,
			hp: 0,
			max_hp: 0,
			effective_atk: 0,
			effective_dr: 0,
			buff_modifiers: {},
			has_debuff: false,
			debuff_count: 0,
			buff_count: 0,
		};
	}

	const active_states: string[] = ctx.active_states ?? [];

	// Count debuffs and buffs by inspecting state effect actors
	let has_debuff = false;
	let debuff_count = 0;
	let buff_count = 0;

	for (const stateId of active_states) {
		const stateActor = system.get(stateId);
		if (!stateActor) continue;
		const snap = stateActor.getSnapshot();
		if (snap.value !== "on") continue;
		const sc = snap.context as any;
		const stacks = sc.stacks ?? 1;

		if (
			sc.healing_modifier > 0 ||
			sc.damage_per_tick > 0 ||
			sc.dr_modifier < 0 ||
			sc.id?.includes("debuff")
		) {
			has_debuff = true;
			debuff_count += stacks;
		} else {
			buff_count += stacks;
		}
	}

	return {
		id: entityId,
		hp: ctx.hp,
		max_hp: ctx.max_hp,
		effective_atk: ctx.effective_atk ?? ctx.atk ?? 0,
		effective_dr: ctx.effective_dr ?? 0,
		buff_modifiers: ctx.buff_modifiers ?? {},
		has_debuff,
		debuff_count,
		buff_count,
	};
}

// ---------------------------------------------------------------------------
// resolveSlot — pure computation, returns events to apply
// ---------------------------------------------------------------------------

export function resolveSlot(
	slot: SlotDef,
	owner: EntitySnapshot,
	target: EntitySnapshot,
	activation: number,
): SlotResult {
	const result: SlotResult = {
		hits: [],
		heals: [],
		self_hits: [],
		states: [],
		stacks: [],
	};

	// 1. Build combined factors (base + buff modifiers from snapshot)
	const buff_mods = owner.buff_modifiers;
	const factors: FactorVector = {
		D_base: slot.base_factors.D_base + (buff_mods.D_base ?? 0),
		D_flat: slot.base_factors.D_flat + (buff_mods.D_flat ?? 0),
		D_ortho: slot.base_factors.D_ortho + (buff_mods.D_ortho ?? 0),
		S_coeff: slot.base_factors.S_coeff + (buff_mods.S_coeff ?? 0),
		M_dmg: slot.base_factors.M_dmg + (buff_mods.M_dmg ?? 0),
		M_skill: slot.base_factors.M_skill + (buff_mods.M_skill ?? 0),
		M_final: slot.base_factors.M_final + (buff_mods.M_final ?? 0),
		M_crit: slot.base_factors.M_crit + (buff_mods.M_crit ?? 0),
		sigma_R: slot.base_factors.sigma_R + (buff_mods.sigma_R ?? 0),
		D_res: slot.base_factors.D_res + (buff_mods.D_res ?? 0),
		H_A: slot.base_factors.H_A + (buff_mods.H_A ?? 0),
	};

	// 2. Evaluate conditional factors
	const conditionals = slot.conditional_factors ?? [];
	let min_lost_hp_floor = 0;
	for (const cf of conditionals) {
		if (cf.condition === "min_lost_hp_threshold") {
			min_lost_hp_floor = Math.max(min_lost_hp_floor, cf.threshold ?? 0);
		}
	}

	const enemy_lost_hp_pct = Math.max(
		min_lost_hp_floor,
		target.max_hp > 0
			? ((target.max_hp - target.hp) / target.max_hp) * 100
			: 0,
	);
	const self_lost_hp_pct = owner.max_hp > 0
		? ((owner.max_hp - owner.hp) / owner.max_hp) * 100
		: 0;

	for (const cf of conditionals) {
		switch (cf.condition) {
			case "per_enemy_lost_hp":
				factors[cf.factor] += cf.value * enemy_lost_hp_pct;
				break;
			case "per_self_lost_hp":
				factors[cf.factor] += cf.value * self_lost_hp_pct;
				break;
			case "target_hp_below":
				if (
					target.max_hp > 0 &&
					(target.hp / target.max_hp) * 100 < (cf.threshold ?? 30)
				) {
					factors[cf.factor] += cf.value;
				}
				break;
			case "ignore_dr":
				factors.D_res = Math.min(1, factors.D_res + cf.value);
				break;
			case "target_has_debuff":
				if (target.has_debuff) {
					factors[cf.factor] += cf.value;
				}
				break;
			case "per_hit_escalation":
				// Applied per-hit below
				break;
			case "per_debuff_stack": {
				const n = cf.per_n_stacks ?? 1;
				const stacks = Math.floor(target.debuff_count / n);
				const capped = cf.max_stacks
					? Math.min(stacks, cf.max_stacks)
					: stacks;
				factors[cf.factor] += cf.value * capped;
				break;
			}
			case "per_buff_stack": {
				const n = cf.per_n_stacks ?? 1;
				const stacks = Math.floor(owner.buff_count / n);
				const capped = cf.max_stacks
					? Math.min(stacks, cf.max_stacks)
					: stacks;
				factors[cf.factor] += cf.value * capped;
				break;
			}
			case "self_lost_hp_damage":
				factors[cf.factor] += cf.value * (self_lost_hp_pct / 100);
				break;
			case "probability_multiplier": {
				const prob = cf.probability ?? 0.12;
				factors[cf.factor] += cf.value * prob;
				break;
			}
			case "enemy_dr_reduction":
				factors.D_res = Math.min(1, factors.D_res + cf.value);
				break;
			case "self_dr_during_cast":
				break; // self DR — no effect on damage output
			case "conditional_crit":
				factors[cf.factor] += cf.value;
				break;
			// min_lost_hp_threshold handled above
		}
	}

	// Extract per_hit_escalation for use in hit loop
	const escalation = conditionals.find(
		(cf) => cf.condition === "per_hit_escalation",
	);

	// 3. Self HP cost
	if (slot.self_hp_cost && slot.self_hp_cost > 0) {
		const hpCost = (slot.self_hp_cost / 100) * owner.max_hp;
		result.self_hits.push({
			target: slot.owner_entity,
			event: {
				type: "HIT",
				damage: hpCost,
				source: slot.id,
				is_crit: false,
				hit_index: -1,
				dr_bypass: 1.0, // self-damage ignores own DR
				healing: 0,
			},
		});
	}

	// 4. Hit loop
	let total_damage_dealt = 0;
	for (let i = 0; i < slot.hit_count; i++) {
		// Apply per-hit escalation
		if (escalation) {
			if (i > 0) {
				const maxBonus = escalation.max_stacks
					? escalation.value * escalation.max_stacks
					: Infinity;
				factors[escalation.factor] += Math.min(
					escalation.value,
					maxBonus - escalation.value * (i - 1),
				);
			}
		}

		const hitResult = resolveHit(owner.effective_atk, factors, {
			DR: 0,
			current_hp: 0,
			max_hp: target.max_hp,
		});

		total_damage_dealt += hitResult.damage;

		result.hits.push({
			target: slot.target_entity,
			event: {
				type: "HIT",
				damage: hitResult.damage,
				source: slot.owner_entity,
				is_crit: false,
				hit_index: i,
				dr_bypass: hitResult.dr_bypass,
				healing: hitResult.healing,
			},
		});

		// Self-healing from H_A
		if (hitResult.healing > 0) {
			result.heals.push({
				target: slot.owner_entity,
				event: {
					type: "HEAL",
					amount: hitResult.healing,
					source: slot.id,
				},
			});
		}
	}

	// 4b. Lifesteal
	if (slot.lifesteal && slot.lifesteal > 0 && total_damage_dealt > 0) {
		const lifestealHeal = (slot.lifesteal / 100) * total_damage_dealt;
		result.heals.push({
			target: slot.owner_entity,
			event: {
				type: "HEAL",
				amount: lifestealHeal,
				source: slot.id,
			},
		});
	}

	// 4c. Self heal on activation
	if (slot.self_heal && slot.self_heal > 0) {
		result.heals.push({
			target: slot.owner_entity,
			event: {
				type: "HEAL",
				amount: slot.self_heal,
				source: slot.id,
			},
		});
	}

	// 5. State creation
	for (const stateDef of slot.states_to_create) {
		// Skip reactive states (trigger=on_attacked)
		if (stateDef.trigger === "on_attacked") continue;

		// Chance roll
		if (stateDef.chance != null && stateDef.chance < 100) {
			if (Math.random() * 100 >= stateDef.chance) continue;
		}

		const stateSystemId = `state-${stateDef.id}-${slot.id}-a${activation}`;
		const target_entity =
			stateDef.target === "self"
				? slot.owner_entity
				: slot.target_entity;

		result.states.push({
			id: stateSystemId,
			input: {
				id: stateDef.id,
				duration: stateDef.duration,
				modifiers: stateDef.modifiers,
				dr_modifier: stateDef.dr_modifier ?? 0,
				healing_modifier: stateDef.healing_modifier ?? 0,
				damage_per_tick: stateDef.damage_per_tick ?? 0,
				shield_hp: stateDef.shield_hp ?? 0,
				counter_damage: stateDef.counter_damage ?? 0,
				atk_modifier: stateDef.atk_modifier ?? 0,
				def_modifier: stateDef.def_modifier ?? 0,
				target_entity,
				owner_entity: slot.owner_entity,
				max_stacks: stateDef.max_stacks,
				dispellable: stateDef.dispellable,
			},
			target_entity,
		});

		// Per-hit stacking
		if (stateDef.per_hit_stack && slot.hit_count > 1) {
			result.stacks.push({
				state_base_id: stateSystemId,
				count: slot.hit_count - 1,
			});
		}
	}

	return result;
}
