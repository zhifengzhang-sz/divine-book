/**
 * Damage chain builder — implements design §6.
 *
 * Collects HandlerResults from all handlers, accumulates multiplicative
 * zones, and produces per-hit HIT events.
 */

import type { HandlerResult } from "./handlers/types.js";
import type { HitEvent, IntentEvent } from "./types.js";

export function buildHitEvents(
	results: HandlerResult[],
	atk: number,
): HitEvent[] {
	let basePercent = 0;
	let hits = 0;
	let flatExtra = 0;
	let spDamage = 0;
	const zones = { S_coeff: 0, M_dmg: 0, M_skill: 0, M_final: 0, M_synchro: 1 };

	// Collect escalation and per-hit effect functions (last one wins per category)
	let escalationFn:
		| ((k: number) => { M_skill?: number; M_dmg?: number })
		| undefined;
	let perHitEffectsFn: ((k: number) => IntentEvent[]) | undefined;

	for (const r of results) {
		if (r.basePercent !== undefined) basePercent = r.basePercent;
		if (r.hitsOverride !== undefined) hits = r.hitsOverride;
		if (r.flatExtra !== undefined) flatExtra += r.flatExtra;
		if (r.spDamage !== undefined) spDamage += r.spDamage;
		if (r.zones) {
			zones.S_coeff += r.zones.S_coeff ?? 0;
			zones.M_dmg += r.zones.M_dmg ?? 0;
			zones.M_skill += r.zones.M_skill ?? 0;
			zones.M_final += r.zones.M_final ?? 0;
			if (r.zones.M_synchro !== undefined) {
				zones.M_synchro *= r.zones.M_synchro;
			}
		}
		if (r.perHitEscalation) escalationFn = r.perHitEscalation;
		if (r.perHitEffects) perHitEffectsFn = r.perHitEffects;
	}

	if (basePercent === 0 || hits === 0) return [];

	const perHitPercent = basePercent / hits;
	const perHitFlat = flatExtra / hits;
	const perHitSp = spDamage / hits;
	const events: HitEvent[] = [];

	for (let k = 0; k < hits; k++) {
		const esc = escalationFn?.(k) ?? {};
		// combat.md §2.1: (D_base × S_coeff + D_flat) × zones
		let damage = (perHitPercent / 100) * atk * (1 + zones.S_coeff) + perHitFlat;
		damage *= 1 + zones.M_dmg + (esc.M_dmg ?? 0);
		damage *= 1 + zones.M_skill + (esc.M_skill ?? 0);
		damage *= 1 + zones.M_final;
		damage *= zones.M_synchro;

		if (!Number.isFinite(damage)) {
			throw new Error(`Non-finite damage at hit ${k}: ${damage}`);
		}

		events.push({
			type: "HIT",
			hitIndex: k,
			damage,
			spDamage: perHitSp,
			perHitEffects: perHitEffectsFn?.(k),
		});
	}

	return events;
}
