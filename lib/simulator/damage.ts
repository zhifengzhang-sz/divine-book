/**
 * Pure damage computation — stateless functions called by state machine actions.
 *
 * The state machine decides WHEN to call these.
 * These functions decide WHAT the numbers are.
 *
 * Units convention:
 * - D_base, D_flat, D_ortho: raw percentage (divided by 100 here)
 * - S_coeff, M_dmg, M_skill, M_final, M_crit: fractional (0.7 = +70%)
 * - sigma_R: multiplicative coefficient (base = 1.0)
 * - D_res: fractional DR bypass (0.5 = ignore 50% of target DR)
 * - H_A: raw percentage of effective ATK healed per activation (divided by 100)
 */

import type { FactorVector } from "./types";

export interface DefenseVector {
	DR: number;           // damage reduction (0.0–1.0)
	current_hp: number;
	max_hp: number;
}

export interface HitResult {
	damage: number;
	dr_bypass: number;    // D_res — how much DR to ignore (0.0–1.0)
	healing: number;      // self-healing from H_A
}

/**
 * Resolve a single hit's raw damage (before target DR).
 *
 * Formula:
 *   effective_atk = ATK × (1 + S_coeff)
 *   raw = (D_base/100) × effective_atk × (1+M_dmg) × (1+M_skill) × (1+M_final) × sigma_R × (1+M_crit)
 *       + (D_flat/100) × effective_atk
 *       + (D_ortho/100) × target_max_hp
 *
 * DR bypass: D_res is passed through to entity (target applies effective_dr × (1 - D_res)).
 * Healing: H_A% of effective_atk healed to self.
 *
 * Note: DR is applied by the entity actor, not here.
 * The slot sends raw damage; the entity applies its own defenses.
 */
export function resolveHit(
	atk: number,
	factors: FactorVector,
	defense: DefenseVector,
): HitResult {
	const effective_atk = atk * (1 + factors.S_coeff);

	const raw_base = (factors.D_base / 100) * effective_atk
		* (1 + factors.M_dmg)
		* (1 + factors.M_skill)
		* (1 + factors.M_final)
		* (factors.sigma_R || 1)
		* (1 + factors.M_crit);

	const raw_flat = (factors.D_flat / 100) * effective_atk;
	const raw_ortho = (factors.D_ortho / 100) * defense.max_hp;

	const raw = raw_base + raw_flat + raw_ortho;

	// H_A: heal self for H_A% of effective ATK
	const healing = (factors.H_A / 100) * effective_atk;

	return {
		damage: Math.max(0, raw),
		dr_bypass: Math.max(0, Math.min(1, factors.D_res)),
		healing: Math.max(0, healing),
	};
}

/**
 * Resolve DoT tick damage — simpler formula.
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
