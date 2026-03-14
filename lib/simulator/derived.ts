/**
 * Shared helpers to compute derived entity stats from active state effects.
 * Single source of truth — entity caches these; slot, chart, etc. read from entity.
 */

import type { FactorVector } from "./types";

/** Minimal interface for looking up actors by systemId */
export interface ActorSystem {
	get(id: string): { getSnapshot(): { value: string; context: any } } | undefined;
}

/** Cached derived stats stored on entity context */
export interface DerivedStats {
	effective_atk: number;
	effective_def: number;
	effective_dr: number;
	heal_reduction: number;
	buff_modifiers: Partial<FactorVector>;
}

/**
 * Compute all derived stats from an entity's active states.
 * Called by entity machine on every event, result stored on context.
 */
export function computeDerivedStats(
	activeStates: string[],
	baseAtk: number,
	baseDef: number,
	drConstant: number,
	system: ActorSystem,
): DerivedStats {
	let atkBonus = 0;
	let defBonus = 0;
	let drMod = 0;
	let healMod = 0;
	const buffMods: Partial<FactorVector> = {};

	for (const stateId of activeStates) {
		const ref = system.get(stateId);
		if (!ref) continue;
		const snap = ref.getSnapshot();
		if (snap.value !== "on") continue;
		const ctx = snap.context as any;

		atkBonus += ctx.atk_modifier ?? 0;
		defBonus += ctx.def_modifier ?? 0;
		drMod += ctx.dr_modifier ?? 0;
		healMod += ctx.healing_modifier ?? 0;

		const mods = ctx.modifiers as Partial<FactorVector> | undefined;
		if (mods) {
			for (const [key, val] of Object.entries(mods)) {
				const k = key as keyof FactorVector;
				buffMods[k] = (buffMods[k] ?? 0) + (val as number);
			}
		}
	}

	const effectiveDef = baseDef * (1 + defBonus);
	const baseDR = effectiveDef / (effectiveDef + drConstant);

	return {
		effective_atk: baseAtk * (1 + atkBonus),
		effective_def: effectiveDef,
		effective_dr: Math.max(0, Math.min(1, baseDR + drMod)),
		heal_reduction: healMod,
		buff_modifiers: buffMods,
	};
}
