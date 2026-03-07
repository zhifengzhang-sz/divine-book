/**
 * Group definitions — 16 groups matching §0–§13 in keyword.map.md.
 */

import { Zone } from "./enums.js";
import type { GroupDef } from "./types.js";

export const GROUPS: GroupDef[] = [
	{
		id: "shared_mechanics",
		section: "§0",
		label: "Shared Mechanics (All Schools)",
		primaryZones: [Zone.D_flat],
	},
	{
		id: "base_damage",
		section: "§1",
		label: "Base Damage",
		primaryZones: [Zone.D_base],
	},
	{
		id: "damage_multiplier_zones",
		section: "§2",
		label: "Damage Multiplier Zones",
		primaryZones: [Zone.M_dmg, Zone.M_skill, Zone.M_final, Zone.S_coeff],
	},
	{
		id: "resonance_system",
		section: "§3",
		label: "Resonance System (会心)",
		primaryZones: [Zone.D_res],
	},
	{
		id: "synchrony_system",
		section: "§3b",
		label: "Synchrony System (心逐)",
		primaryZones: [Zone.M_synchro],
	},
	{
		id: "standard_crit",
		section: "§3c",
		label: "Standard Crit (暴击)",
		primaryZones: [Zone.M_dmg],
	},
	{
		id: "conditional_triggers",
		section: "§4",
		label: "Conditional Triggers",
		primaryZones: [Zone.M_dmg],
	},
	{
		id: "per_hit_escalation",
		section: "§5",
		label: "Per-Hit Escalation",
		primaryZones: [Zone.M_dmg],
	},
	{
		id: "hp_based_calculations",
		section: "§6",
		label: "HP-Based Calculations",
		primaryZones: [Zone.M_dmg, Zone.D_ortho],
	},
	{
		id: "healing_and_survival",
		section: "§7",
		label: "Healing and Survival",
		primaryZones: [Zone.H_A, Zone.DR_A],
	},
	{
		id: "shield_system",
		section: "§8",
		label: "Shield System",
		primaryZones: [Zone.S_A],
	},
	{
		id: "state_modifiers",
		section: "§9",
		label: "State Modifiers",
		primaryZones: [Zone.M_dmg, Zone.H_red],
	},
	{
		id: "damage_over_time",
		section: "§10",
		label: "Damage over Time (DoT)",
		primaryZones: [Zone.D_ortho],
	},
	{
		id: "self_buffs",
		section: "§11",
		label: "Self Buffs",
		primaryZones: [Zone.S_coeff, Zone.M_skill],
	},
	{
		id: "debuffs",
		section: "§12",
		label: "Debuffs",
		primaryZones: [Zone.H_red],
	},
	{
		id: "special_mechanics",
		section: "§13",
		label: "Special Mechanics",
		primaryZones: [Zone.D_ortho],
	},
];
