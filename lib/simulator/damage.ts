/**
 * Pure damage computation — stateless functions called by state machine actions.
 *
 * The state machine decides WHEN to call these.
 * These functions decide WHAT the numbers are.
 */

import type { FactorVector } from "./types";

export interface DefenseVector {
	DR: number;           // damage reduction (0.0–1.0)
	current_hp: number;
	max_hp: number;
}

export interface HitResult {
	damage: number;
	crit: boolean;
}

/**
 * Resolve a single hit's raw damage (before target DR).
 *
 * Formula:
 *   raw = D_base × (1+M_dmg) × (1+M_skill) × (1+M_final) × sigma_R × crit
 *       + D_flat
 *       + D_ortho
 *
 * Note: DR is applied by the entity actor, not here.
 * The slot sends raw damage; the entity applies its own defenses.
 */
export function resolveHit(
	atk: number,
	factors: FactorVector,
	defense: DefenseVector,
	crit_rate: number,
): HitResult {
	// Deterministic EV for crit
	const crit_ev = crit_rate * (1 + factors.M_crit) + (1 - crit_rate) * 1.0;
	const is_crit = crit_rate > 0.5; // for reporting only

	const raw_base = (factors.D_base / 100) * atk
		* (1 + factors.M_dmg)
		* (1 + factors.M_skill)
		* (1 + factors.M_final)
		* (factors.sigma_R || 1)
		* crit_ev;

	const raw_flat = (factors.D_flat / 100) * atk;
	const raw_ortho = (factors.D_ortho / 100) * defense.max_hp;

	const raw = raw_base + raw_flat + raw_ortho;

	return { damage: Math.max(0, raw), crit: is_crit };
}

/**
 * Resolve DoT tick damage — simpler formula, no crit by default.
 */
export function resolveDoTTick(
	atk: number,
	dot_pct: number,
	dot_damage_increase: number,
	defense: DefenseVector,
): number {
	const raw = (dot_pct / 100) * atk * (1 + dot_damage_increase);
	return Math.max(0, raw);
}
