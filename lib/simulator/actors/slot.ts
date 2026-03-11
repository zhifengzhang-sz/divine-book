/**
 * Slot actor — off or on. On-entry: compute damage, fire HITs, create states.
 *
 * Reads active buffs from owner entity's buff_ids (pull via system.get).
 * Creates buffs on owner and/or debuffs on target — notifies arena for routing.
 */

import { enqueueActions, setup, spawnChild } from "xstate";
import { resolveHit } from "../damage";
import type {
	ActivateEvent,
	FactorVector,
	HitEvent,
	SlotDef,
	SlotDoneEvent,
	StateCreatedEvent,
} from "../types";
import { buffMachine } from "./buff";

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

				// 1. Read owner entity (for atk, crit, buff_ids)
				const ownerActor = system.get(slot.owner_entity);
				const ownerSnap = ownerActor?.getSnapshot();
				const ownerCtx = ownerSnap?.context as any;
				const atk = ownerCtx?.atk ?? 50_000;
				const crit_rate = ownerCtx?.crit_rate ?? 0;
				const buff_ids: string[] = ownerCtx?.buff_ids ?? [];

				// 2. Query active buffs on owner — pull their modifiers
				const buff_mods: Partial<FactorVector> = {};
				for (const buffId of buff_ids) {
					const buffActor = system.get(buffId);
					if (!buffActor) continue;
					const snap = buffActor.getSnapshot();
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
					M_dmg: slot.base_factors.M_dmg + (buff_mods.M_dmg ?? 0),
					M_skill:
						slot.base_factors.M_skill + (buff_mods.M_skill ?? 0),
					M_final:
						slot.base_factors.M_final + (buff_mods.M_final ?? 0),
					M_crit: slot.base_factors.M_crit + (buff_mods.M_crit ?? 0),
					sigma_R:
						slot.base_factors.sigma_R + (buff_mods.sigma_R ?? 0),
				};

				// 4. Read target for D_ortho (%maxHP)
				const targetActor = system.get(slot.target_entity);
				const targetSnap = targetActor?.getSnapshot();
				const target_max_hp =
					(targetSnap?.context as any)?.max_hp ?? 500_000;

				// 5. Compute hits and send HIT events to target
				for (let i = 0; i < slot.hit_count; i++) {
					const result = resolveHit(
						atk,
						factors,
						{ DR: 0, current_hp: 0, max_hp: target_max_hp },
						crit_rate,
					);

					if (targetActor) {
						enqueue.sendTo(targetActor, {
							type: "HIT",
							damage: result.damage,
							source: slot.owner_entity,
							is_crit: result.crit,
							hit_index: i,
						} satisfies HitEvent);
					}
				}

				// 6. Create states (buffs on self, debuffs on opponent)
				const arena = system.get("arena");
				for (const stateDef of slot.states_to_create) {
					const stateSystemId = `state-${stateDef.id}-${slot.id}`;

					enqueue(
						spawnChild(buffMachine, {
							input: {
								id: stateDef.id,
								duration: stateDef.duration,
								target: stateDef.target,
								modifiers: stateDef.modifiers,
								dr_modifier: stateDef.dr_modifier ?? 0,
								healing_modifier: stateDef.healing_modifier ?? 0,
							},
							systemId: stateSystemId,
						}),
					);

					// Notify arena so it can route to the affected entity
					if (arena) {
						const target_entity =
							stateDef.target === "self"
								? slot.owner_entity
								: slot.target_entity;
						enqueue.sendTo(arena, {
							type: "STATE_CREATED",
							state_id: stateSystemId,
							target_entity,
							kind:
								stateDef.target === "self" ? "buff" : "debuff",
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
