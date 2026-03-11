/**
 * Shared types and event schemas for the combat simulator actor system.
 */

import type { ActorRefFrom, AnyActorRef } from "xstate";
import type { buffMachine } from "./actors/buff";

// ---------------------------------------------------------------------------
// Factor vector — input to pure damage computation
// ---------------------------------------------------------------------------

export interface FactorVector {
	D_base: number;
	D_flat: number;
	D_ortho: number;
	M_dmg: number;
	M_skill: number;
	M_final: number;
	M_crit: number;
	sigma_R: number;
}

export const ZERO_FACTORS: FactorVector = {
	D_base: 0,
	D_flat: 0,
	D_ortho: 0,
	M_dmg: 0,
	M_skill: 0,
	M_final: 0,
	M_crit: 0,
	sigma_R: 1,
};

// ---------------------------------------------------------------------------
// State effect definitions — buffs and debuffs
// ---------------------------------------------------------------------------

/** What side of combat this state affects */
export type StateTarget = "self" | "opponent";

export interface StateDef {
	id: string;
	duration: number;
	target: StateTarget;         // buff on self, or debuff on opponent
	modifiers: Partial<FactorVector>;  // for buffs: factor bonuses
	dr_modifier?: number;        // for debuffs: additive DR change (e.g., -1.0 for 命損)
	healing_modifier?: number;   // for debuffs: healing reduction (e.g., -0.31)
}

// ---------------------------------------------------------------------------
// Definitions — declarative config, not runtime state
// ---------------------------------------------------------------------------

export interface SlotDef {
	id: string;
	platform: string;
	hit_count: number;
	base_factors: FactorVector;
	states_to_create: StateDef[];  // buffs on self + debuffs on opponent
	target_entity: string;         // systemId of the entity to hit
	owner_entity: string;          // systemId of the entity that owns this slot
}

export interface EntityDef {
	id: string;                  // systemId
	hp: number;
	atk: number;
	dr: number;                  // 0.0–1.0 base damage reduction
	crit_rate: number;
	crit_damage: number;
}

// ---------------------------------------------------------------------------
// Events — the contracts between actors
// ---------------------------------------------------------------------------

/** Arena → Slot */
export type ActivateEvent = { type: "ACTIVATE" };

/** Slot → Entity (target). Also DoT → Entity, Entity → Entity (counter). */
export type HitEvent = {
	type: "HIT";
	damage: number;              // raw damage (before target DR)
	source: string;              // systemId of attacker entity
	is_crit: boolean;
	hit_index: number;
};

/** Arena → Buff/DoT */
export type TickEvent = { type: "TICK"; dt: number };

/** Slot → Arena: state created, register it */
export type StateCreatedEvent = {
	type: "STATE_CREATED";
	state_id: string;            // systemId of the buff/debuff actor
	target_entity: string;       // who it affects
	kind: "buff" | "debuff";
};

/** Arena → Entity: a new buff/debuff is now active on you */
export type StateAppliedEvent = {
	type: "STATE_APPLIED";
	state_id: string;            // systemId of the buff/debuff actor
	kind: "buff" | "debuff";
};

/** Slot → Arena */
export type SlotDoneEvent = { type: "SLOT_DONE"; slot_id: string };

/** Entity → Arena */
export type EntityDiedEvent = { type: "ENTITY_DIED"; entity_id: string };

/** Anyone → Buff/DoT */
export type DispelEvent = { type: "DISPEL" };
