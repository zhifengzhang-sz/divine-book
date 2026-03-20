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

	// Collect all escalation and per-hit effect functions (they stack)
	const escalationFns: ((k: number) => { M_skill?: number; M_dmg?: number })[] =
		[];
	let perHitEffectsFn: ((k: number) => IntentEvent[]) | undefined;
	let forceSynchroMax = false;

	for (const r of results) {
		if (r.basePercent !== undefined) basePercent = r.basePercent;
		if (r.hitsOverride !== undefined) hits = r.hitsOverride;
		if (r.flatExtra !== undefined) flatExtra += r.flatExtra;
		if (r.spDamage !== undefined) spDamage += r.spDamage;
		if (r.forceSynchroMax) forceSynchroMax = true;
		if (r.zones) {
			zones.S_coeff += r.zones.S_coeff ?? 0;
			zones.M_dmg += r.zones.M_dmg ?? 0;
			zones.M_skill += r.zones.M_skill ?? 0;
			zones.M_final += r.zones.M_final ?? 0;
			if (r.zones.M_synchro !== undefined) {
				zones.M_synchro *= r.zones.M_synchro;
			}
		}
		if (r.perHitEscalation) escalationFns.push(r.perHitEscalation);
		if (r.perHitEffects) perHitEffectsFn = r.perHitEffects;
	}

	// probability_to_certain: override M_synchro to max tier (4x)
	if (forceSynchroMax && zones.M_synchro > 1) {
		zones.M_synchro = 4;
	}

	if (basePercent === 0 || hits === 0) return [];

	const perHitPercent = basePercent / hits;
	const perHitFlat = flatExtra / hits;
	const perHitSp = spDamage / hits;
	const events: HitEvent[] = [];

	for (let k = 0; k < hits; k++) {
		// Accumulate escalation from all sources (they stack additively per zone)
		let escMdmg = 0;
		let escMskill = 0;
		for (const fn of escalationFns) {
			const esc = fn(k);
			escMdmg += esc.M_dmg ?? 0;
			escMskill += esc.M_skill ?? 0;
		}
		// combat.mechanic.md §5.2: D_skill = D_base × (1+S_coeff) × zones; D_total = D_skill + D_flat
		let damage = (perHitPercent / 100) * atk * (1 + zones.S_coeff);
		damage *= 1 + zones.M_dmg + escMdmg;
		damage *= 1 + zones.M_skill + escMskill;
		damage *= 1 + zones.M_final;
		damage *= zones.M_synchro;
		damage += perHitFlat; // D_flat: additive, not scaled by zones

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
