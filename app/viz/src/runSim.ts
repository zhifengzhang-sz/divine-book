/**
 * Browser-side simulation runner.
 * Runs the full sim and returns the event stream.
 */

import { createActor } from "xstate";
import { SimulationClock } from "../../../lib/sim/clock.js";
import { selectTiers, validatePlayerConfig } from "../../../lib/sim/config.js";
import { hasHandler } from "../../../lib/sim/handlers/index.js";
import { playerMachine } from "../../../lib/sim/player.js";
import { SeededRNG } from "../../../lib/sim/rng.js";
import type { PlayerState, StateChangeEvent } from "../../../lib/sim/types.js";
import type { SimulationData } from "./types.ts";
import booksData from "./books-data.json";
import affixesData from "./affixes-data.json";
import manifest from "./manifest.json";
import combatConfig from "./combat-config.json";

export { manifest, combatConfig };

export interface SimConfig {
	playerA: {
		platform: string;
		op1: string;
		op2: string;
	};
	playerB: {
		platform: string;
		op1: string;
		op2: string;
	};
	stats: {
		hp: number;
		atk: number;
		sp: number;
		def: number;
		spRegen: number;
	};
	formulas: {
		dr_constant: number;
		sp_shield_ratio: number;
	};
	progression: {
		enlightenment: number;
		fusion: number;
	};
	tGap: number;
	seed: number;
}

function formatBook(b: { platform: string; op1: string; op2: string }): string {
	const parts = [b.platform];
	if (b.op1) parts.push(b.op1);
	if (b.op2) parts.push(b.op2);
	return parts.join(" + ");
}

export function runSimulation(config: SimConfig): SimulationData {
	const booksYaml = booksData as Parameters<typeof validatePlayerConfig>[1];
	const affixesYaml = affixesData as Parameters<typeof validatePlayerConfig>[2];
	const { stats, formulas, progression, seed } = config;

	const slotA = { slot: 1, platform: config.playerA.platform, op1: config.playerA.op1 || undefined, op2: config.playerA.op2 || undefined };
	const slotB = { slot: 1, platform: config.playerB.platform, op1: config.playerB.op1 || undefined, op2: config.playerB.op2 || undefined };

	// Validate
	const playerConfigA = { entity: stats, formulas, progression, books: [slotA] };
	const playerConfigB = { entity: stats, formulas, progression, books: [slotB] };
	validatePlayerConfig(playerConfigA, booksYaml, affixesYaml);
	validatePlayerConfig(playerConfigB, booksYaml, affixesYaml);

	const clock = new SimulationClock();
	const rng = new SeededRNG(seed);

	function makePlayer(label: string, bookSlot: typeof slotA) {
		return createActor(playerMachine, {
			input: {
				label,
				initialState: {
					hp: stats.hp, maxHp: stats.hp,
					sp: stats.sp, maxSp: stats.sp, spRegen: stats.spRegen,
					shield: 0,
					atk: stats.atk, baseAtk: stats.atk,
					def: stats.def, baseDef: stats.def,
					states: [], alive: true,
				} as PlayerState,
				formulas,
				progression,
				bookSlots: [bookSlot],
				booksYaml,
				affixesYaml,
				clock,
				rng,
				maxChainDepth: 10,
			},
			clock,
		});
	}

	const playerA = makePlayer("A", slotA);
	const playerB = makePlayer("B", slotB);

	const events: StateChangeEvent[] = [];
	playerA.on("*", (ev: StateChangeEvent) => events.push({ ...ev, player: "A" }));
	playerB.on("*", (ev: StateChangeEvent) => events.push({ ...ev, player: "B" }));

	playerA.start();
	playerB.start();

	// Cast slot 1
	playerA.send({ type: "CAST_SLOT", slot: 1 });
	playerB.send({ type: "CAST_SLOT", slot: 1 });

	// Interleave hits
	const aHits = playerA.getSnapshot().context.pendingHits;
	const bHits = playerB.getSnapshot().context.pendingHits;
	const maxHits = Math.max(aHits.length, bHits.length);

	for (let i = 0; i < maxHits; i++) {
		if (i < aHits.length && playerB.getSnapshot().context.state.alive) {
			playerB.send(aHits[i]);
		}
		if (i < bHits.length && playerA.getSnapshot().context.state.alive) {
			playerA.send(bHits[i]);
		}
	}

	// Non-HIT intents
	if (playerB.getSnapshot().context.state.alive) {
		for (const intent of playerA.getSnapshot().context.pendingIntents) {
			playerB.send(intent);
		}
	}
	if (playerA.getSnapshot().context.state.alive) {
		for (const intent of playerB.getSnapshot().context.pendingIntents) {
			playerA.send(intent);
		}
	}

	const aFinal = playerA.getSnapshot().context.state;
	const bFinal = playerB.getSnapshot().context.state;

	return {
		config: {
			playerA: { label: "A", book: formatBook(config.playerA), hp: stats.hp, atk: stats.atk, sp: stats.sp, def: stats.def },
			playerB: { label: "B", book: formatBook(config.playerB), hp: stats.hp, atk: stats.atk, sp: stats.sp, def: stats.def },
			seed,
		},
		events: events as SimulationData["events"],
		result: {
			winner: aFinal.alive && !bFinal.alive ? "A" : !aFinal.alive && bFinal.alive ? "B" : null,
			aFinalHp: aFinal.hp,
			bFinalHp: bFinal.hp,
		},
	};
}
