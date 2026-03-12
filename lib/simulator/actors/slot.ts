/**
 * Slot actor — off or on. On-entry: compute damage, fire HITs, create states.
 *
 * Reads active state effects from owner entity's active_states (pull via system.get).
 * Creates state effects on owner and/or target — notifies arena for routing.
 */

import { enqueueActions, setup, spawnChild } from "xstate";
import { resolveHit } from "../damage";
import type {
	ActivateEvent,
	FactorVector,
	HealEvent,
	HitEvent,
	SlotDef,
	SlotDoneEvent,
	StateCreatedEvent,
} from "../types";
import { stateEffectMachine } from "./state-effect";

export const slotMachine = setup({
	types: {
		context: {} as {
			slot: SlotDef;
		},
		input: {} as { slot: SlotDef },
		events: {} as ActivateEvent,
	},
}).createMachine({
	id: "slot",
	initial: "off",
	context: ({ input }) => ({
		slot: input.slot,
	}),
	states: {
		off: {
			on: {
				ACTIVATE: { target: "on" },
			},
		},
		on: {
			entry: enqueueActions(({ context, enqueue, system }) => {
				const slot = context.slot;

				// 1. Read owner entity (for atk, active_states)
				const ownerActor = system.get(slot.owner_entity);
				const ownerSnap = ownerActor?.getSnapshot();
				const ownerCtx = ownerSnap?.context as any;
				const atk = ownerCtx?.atk ?? 50_000;
				const active_states: string[] = ownerCtx?.active_states ?? [];

				// 2. Query active state effects on owner — pull their modifiers
				const buff_mods: Partial<FactorVector> = {};
				for (const stateId of active_states) {
					const stateActor = system.get(stateId);
					if (!stateActor) continue;
					const snap = stateActor.getSnapshot();
					if (snap.value === "on") {
						const mods = (snap.context as any)
							.modifiers as Partial<FactorVector>;
						for (const [key, val] of Object.entries(mods)) {
							const k = key as keyof FactorVector;
							buff_mods[k] = (buff_mods[k] ?? 0) + (val as number);
						}
					}
				}

				// 3. Build combined factors
				const factors: FactorVector = {
					D_base: slot.base_factors.D_base + (buff_mods.D_base ?? 0),
					D_flat: slot.base_factors.D_flat + (buff_mods.D_flat ?? 0),
					D_ortho:
						slot.base_factors.D_ortho + (buff_mods.D_ortho ?? 0),
					S_coeff:
						slot.base_factors.S_coeff + (buff_mods.S_coeff ?? 0),
					M_dmg: slot.base_factors.M_dmg + (buff_mods.M_dmg ?? 0),
					M_skill:
						slot.base_factors.M_skill + (buff_mods.M_skill ?? 0),
					M_final:
						slot.base_factors.M_final + (buff_mods.M_final ?? 0),
					M_crit: slot.base_factors.M_crit + (buff_mods.M_crit ?? 0),
					sigma_R:
						slot.base_factors.sigma_R + (buff_mods.sigma_R ?? 0),
					D_res: slot.base_factors.D_res + (buff_mods.D_res ?? 0),
					H_A: slot.base_factors.H_A + (buff_mods.H_A ?? 0),
				};

				// 4. Read target for D_ortho (%maxHP) and conditional evaluation
				const targetActor = system.get(slot.target_entity);
				const targetSnap = targetActor?.getSnapshot();
				const targetCtx = targetSnap?.context as any;
				const target_max_hp = targetCtx?.max_hp ?? 500_000;
				const target_hp = targetCtx?.hp ?? target_max_hp;
				const target_active_states: string[] = targetCtx?.active_states ?? [];
				const owner_hp = ownerCtx?.hp ?? ownerCtx?.max_hp ?? 500_000;
				const owner_max_hp = ownerCtx?.max_hp ?? 500_000;

				// 4b. Evaluate conditional factors
				const conditionals = slot.conditional_factors ?? [];
				let min_lost_hp_floor = 0;
				// First pass: find min_lost_hp_threshold
				for (const cf of conditionals) {
					if (cf.condition === "min_lost_hp_threshold") {
						min_lost_hp_floor = Math.max(min_lost_hp_floor, cf.threshold ?? 0);
					}
				}

				const enemy_lost_hp_pct = Math.max(
					min_lost_hp_floor,
					((target_max_hp - target_hp) / target_max_hp) * 100,
				);
				const self_lost_hp_pct = ((owner_max_hp - owner_hp) / owner_max_hp) * 100;

				// Check if target has any debuffs (non-shield, non-self-buff states)
				let target_has_debuff = false;
				for (const stateId of target_active_states) {
					const stateActor = system.get(stateId);
					if (!stateActor) continue;
					const snap = stateActor.getSnapshot();
					if (snap.value === "on") {
						const ctx = snap.context as any;
						// Debuffs have dr_modifier < 0, healing_modifier > 0, damage_per_tick > 0, or negative modifiers
						if (ctx.healing_modifier > 0 || ctx.damage_per_tick > 0 ||
							ctx.dr_modifier < 0 || ctx.id?.includes("debuff")) {
							target_has_debuff = true;
							break;
						}
					}
				}

				// Count debuff/buff stacks on target/self for stack-based conditionals
				let target_debuff_count = 0;
				let self_buff_count = 0;
				for (const stateId of target_active_states) {
					const stateActor = system.get(stateId);
					if (!stateActor) continue;
					const snap = stateActor.getSnapshot();
					if (snap.value === "on") {
						const ctx = snap.context as any;
						const stacks = ctx.stacks ?? 1;
						if (ctx.healing_modifier > 0 || ctx.damage_per_tick > 0 ||
							ctx.dr_modifier < 0 || ctx.id?.includes("debuff")) {
							target_debuff_count += stacks;
						}
					}
				}
				for (const stateId of active_states) {
					const stateActor = system.get(stateId);
					if (!stateActor) continue;
					const snap = stateActor.getSnapshot();
					if (snap.value === "on") {
						self_buff_count += (snap.context as any).stacks ?? 1;
					}
				}

				for (const cf of conditionals) {
					switch (cf.condition) {
						case "per_enemy_lost_hp":
							factors[cf.factor] += cf.value * enemy_lost_hp_pct;
							break;
						case "per_self_lost_hp":
							factors[cf.factor] += cf.value * self_lost_hp_pct;
							break;
						case "target_hp_below":
							if (((target_hp / target_max_hp) * 100) < (cf.threshold ?? 30)) {
								factors[cf.factor] += cf.value;
							}
							break;
						case "ignore_dr":
							factors.D_res = Math.min(1, factors.D_res + cf.value);
							break;
						case "target_has_debuff":
							if (target_has_debuff) {
								factors[cf.factor] += cf.value;
							}
							break;
						case "per_hit_escalation":
							// Applied per-hit below
							break;
						case "per_debuff_stack": {
							const n = cf.per_n_stacks ?? 1;
							const stacks = Math.floor(target_debuff_count / n);
							const capped = cf.max_stacks ? Math.min(stacks, cf.max_stacks) : stacks;
							factors[cf.factor] += cf.value * capped;
							break;
						}
						case "per_buff_stack": {
							const n = cf.per_n_stacks ?? 1;
							const stacks = Math.floor(self_buff_count / n);
							const capped = cf.max_stacks ? Math.min(stacks, cf.max_stacks) : stacks;
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
							break;  // self DR — no effect on damage output
						case "conditional_crit":
							factors[cf.factor] += cf.value;
							break;
						// min_lost_hp_threshold handled above
					}
				}

				// Extract per_hit_escalation for use in hit loop
				const escalation = conditionals.find(cf => cf.condition === "per_hit_escalation");

				// 4c. Self HP cost — deduct before dealing damage
				if (slot.self_hp_cost && slot.self_hp_cost > 0 && ownerActor) {
					const hpCost = (slot.self_hp_cost / 100) * owner_max_hp;
					enqueue.sendTo(ownerActor, {
						type: "HIT",
						damage: hpCost,
						source: slot.id,
						is_crit: false,
						hit_index: -1,
						dr_bypass: 1.0,  // self-damage ignores own DR
						healing: 0,
					} satisfies HitEvent);
				}

				// 5. Compute hits and send HIT events to target
				let total_damage_dealt = 0;
				for (let i = 0; i < slot.hit_count; i++) {
					// Apply per-hit escalation
					if (escalation) {
						const hitBonus = escalation.value * i;
						const maxBonus = escalation.max_stacks
							? escalation.value * escalation.max_stacks
							: Infinity;
						factors[escalation.factor] += Math.min(
							i === 0 ? 0 : escalation.value,
							maxBonus - escalation.value * (i - 1),
						);
					}

					const result = resolveHit(
						atk,
						factors,
						{ DR: 0, current_hp: 0, max_hp: target_max_hp },
					);

					total_damage_dealt += result.damage;

					if (targetActor) {
						enqueue.sendTo(targetActor, {
							type: "HIT",
							damage: result.damage,
							source: slot.owner_entity,
							is_crit: false,
							hit_index: i,
							dr_bypass: result.dr_bypass,
							healing: result.healing,
						} satisfies HitEvent);
					}

					// Self-healing from H_A
					if (result.healing > 0 && ownerActor) {
						enqueue.sendTo(ownerActor, {
							type: "HEAL",
							amount: result.healing,
							source: slot.id,
						} satisfies HealEvent);
					}
				}

				// 5b. Lifesteal — heal self based on total damage dealt
				if (slot.lifesteal && slot.lifesteal > 0 && total_damage_dealt > 0 && ownerActor) {
					const lifestealHeal = (slot.lifesteal / 100) * total_damage_dealt;
					enqueue.sendTo(ownerActor, {
						type: "HEAL",
						amount: lifestealHeal,
						source: slot.id,
					} satisfies HealEvent);
				}

				// 5c. Self heal on activation
				if (slot.self_heal && slot.self_heal > 0 && ownerActor) {
					enqueue.sendTo(ownerActor, {
						type: "HEAL",
						amount: slot.self_heal,
						source: slot.id,
					} satisfies HealEvent);
				}

				// 6. Create state effects (on self or opponent)
				const arena = system.get("arena");
				for (const stateDef of slot.states_to_create) {
					const stateSystemId = `state-${stateDef.id}-${slot.id}`;
					const target_entity =
						stateDef.target === "self"
							? slot.owner_entity
							: slot.target_entity;

					enqueue(
						spawnChild(stateEffectMachine, {
							input: {
								id: stateDef.id,
								duration: stateDef.duration,
								modifiers: stateDef.modifiers,
								dr_modifier: stateDef.dr_modifier ?? 0,
								healing_modifier: stateDef.healing_modifier ?? 0,
								damage_per_tick: stateDef.damage_per_tick ?? 0,
								shield_hp: stateDef.shield_hp ?? 0,
								counter_damage: stateDef.counter_damage ?? 0,
								target_entity,
								owner_entity: slot.owner_entity,
							},
							systemId: stateSystemId,
						}),
					);

					// Notify arena so it can route to the affected entity
					if (arena) {
						enqueue.sendTo(arena, {
							type: "STATE_CREATED",
							state_id: stateSystemId,
							target_entity,
						} satisfies StateCreatedEvent);
					}
				}

				// 7. Notify arena: slot done
				if (arena) {
					enqueue.sendTo(arena, {
						type: "SLOT_DONE",
						slot_id: slot.id,
					} satisfies SlotDoneEvent);
				}
			}),
			always: { target: "off" },
		},
	},
});
