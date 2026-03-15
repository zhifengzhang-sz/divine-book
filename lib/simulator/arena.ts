/**
 * Arena — combat orchestrator.
 *
 * Runs rounds: snapshot → resolve both slots → dispatch intents → tick states.
 * Pure function, no XState.
 */

import type { BookData } from "../parser/emit.js";
import type { CombatConfig, CombatResult, RoundLog, Intent } from "./types.js";
import { Entity } from "./entity.js";
import { resolveSlot } from "./simulate.js";

/**
 * Run a full combat between two books.
 */
export function runCombat(
	bookA: BookData,
	bookB: BookData,
	nameA: string,
	nameB: string,
	config: CombatConfig,
): CombatResult {
	const entityA = new Entity(nameA, config.hp, config.atk, config.def, config.sp);
	const entityB = new Entity(nameB, config.hp, config.atk, config.def, config.sp);

	const log: RoundLog[] = [];

	for (let round = 1; round <= config.max_rounds; round++) {
		const roundEvents: string[] = [];

		// Snapshot both entities
		const snapA = entityA.snapshot();
		const snapB = entityB.snapshot();

		// Resolve both books simultaneously
		const resultA = resolveSlot(bookA, snapA);
		const resultB = resolveSlot(bookB, snapB);

		const hpBeforeA = entityA.hp;
		const hpBeforeB = entityB.hp;

		// Phase 1: Apply self-intents (HP costs first, then others)
		const selfOrderA = orderSelfIntents(resultA.self_intents);
		const selfOrderB = orderSelfIntents(resultB.self_intents);

		for (const intent of selfOrderA) {
			roundEvents.push(...entityA.applySelf(intent));
		}
		for (const intent of selfOrderB) {
			roundEvents.push(...entityB.applySelf(intent));
		}

		// Phase 2: Apply opponent intents (both entities receive simultaneously)
		const counterIntentsFromB: Intent[] = [];
		const counterIntentsFromA: Intent[] = [];

		for (const intent of resultA.opponent_intents) {
			const [events, counters] = entityB.receiveIntent(intent, snapA);
			roundEvents.push(...events);
			counterIntentsFromB.push(...counters);
		}
		for (const intent of resultB.opponent_intents) {
			const [events, counters] = entityA.receiveIntent(intent, snapB);
			roundEvents.push(...events);
			counterIntentsFromA.push(...counters);
		}

		// Phase 3: Counter intents (reactive)
		for (const intent of counterIntentsFromB) {
			const [events] = entityA.receiveIntent(intent, snapB);
			roundEvents.push(...events);
		}
		for (const intent of counterIntentsFromA) {
			const [events] = entityB.receiveIntent(intent, snapA);
			roundEvents.push(...events);
		}

		// Phase 4: Lifesteal healing
		applyLifesteal(entityA, hpBeforeA - entityA.hp, roundEvents);
		applyLifesteal(entityB, hpBeforeB - entityB.hp, roundEvents);

		// Phase 5: Tick all state effects
		roundEvents.push(...entityA.tickStates(config.tick_interval));
		roundEvents.push(...entityB.tickStates(config.tick_interval));

		const aDamage = Math.max(0, hpBeforeB - entityB.hp);
		const bDamage = Math.max(0, hpBeforeA - entityA.hp);

		entityA.total_damage_dealt += aDamage;
		entityB.total_damage_dealt += bDamage;

		log.push({
			round,
			a_hp: Math.round(entityA.hp),
			b_hp: Math.round(entityB.hp),
			a_damage_dealt: Math.round(aDamage),
			b_damage_dealt: Math.round(bDamage),
			events: roundEvents,
		});

		// Check termination
		if (!entityA.alive || !entityB.alive) break;
	}

	let winner: string | "draw";
	if (!entityA.alive && !entityB.alive) {
		winner = "draw";
	} else if (!entityA.alive) {
		winner = nameB;
	} else if (!entityB.alive) {
		winner = nameA;
	} else {
		// Timeout — higher HP wins
		winner = entityA.hp >= entityB.hp ? nameA : nameB;
	}

	return {
		winner,
		rounds: log.length,
		a_final_hp: Math.round(entityA.hp),
		b_final_hp: Math.round(entityB.hp),
		log,
	};
}

/**
 * Order self intents: HP_COST first, then damage/state, then heals last.
 */
function orderSelfIntents(intents: Intent[]): Intent[] {
	const costs: Intent[] = [];
	const buffs: Intent[] = [];
	const heals: Intent[] = [];

	for (const i of intents) {
		if (i.type === "HP_COST") costs.push(i);
		else if (i.type === "HEAL") heals.push(i);
		else buffs.push(i);
	}

	return [...costs, ...buffs, ...heals];
}

function applyLifesteal(entity: Entity, damageDealt: number, events: string[]): void {
	if (damageDealt <= 0) return;
	for (const s of entity.states) {
		if (s.source_intent.type === "LIFESTEAL") {
			const heal = (s.source_intent.percent / 100) * damageDealt;
			const before = entity.hp;
			entity.hp = Math.min(entity.max_hp, entity.hp + heal);
			events.push(`${entity.id} lifesteal: +${Math.round(entity.hp - before)}`);
		}
	}
}
