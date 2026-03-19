/**
 * Browser-side simulation runner.
 * Runs the full sim and returns the event stream.
 */

import { createActor } from "xstate";
import { SimulationClock } from "../../../lib/sim/clock.js";
import { validatePlayerConfig } from "../../../lib/sim/config.js";
import { playerMachine } from "../../../lib/sim/player.js";
import { SeededRNG } from "../../../lib/sim/rng.js";
import type { PlayerState, StateChangeEvent } from "../../../lib/sim/types.js";
import affixesData from "./affixes-data.json";
import booksData from "./books-data.json";
import combatConfig from "./combat-config.json";
import manifest from "./manifest.json";
import type { SimulationData } from "./types.ts";

export { manifest, combatConfig };

export interface PlayerBookConfig {
	platform: string;
	op1: string;
	op2: string;
	stats: {
		hp: number;
		atk: number;
		sp: number;
		def: number;
		spRegen: number;
	};
}

export interface SimConfig {
	playerA: PlayerBookConfig;
	playerB: PlayerBookConfig;
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
	const { formulas, progression, seed } = config;

	const slotA = {
		slot: 1,
		platform: config.playerA.platform,
		op1: config.playerA.op1 || undefined,
		op2: config.playerA.op2 || undefined,
	};
	const slotB = {
		slot: 1,
		platform: config.playerB.platform,
		op1: config.playerB.op1 || undefined,
		op2: config.playerB.op2 || undefined,
	};

	const statsA = config.playerA.stats;
	const statsB = config.playerB.stats;

	// Validate
	const playerConfigA = {
		entity: statsA,
		formulas,
		progression,
		books: [slotA],
	};
	const playerConfigB = {
		entity: statsB,
		formulas,
		progression,
		books: [slotB],
	};
	validatePlayerConfig(playerConfigA, booksYaml, affixesYaml);
	validatePlayerConfig(playerConfigB, booksYaml, affixesYaml);

	const clock = new SimulationClock();
	const rng = new SeededRNG(seed);

	function makePlayer(
		label: string,
		bookSlot: typeof slotA,
		stats: typeof statsA,
	) {
		return createActor(playerMachine, {
			input: {
				label,
				initialState: {
					hp: stats.hp,
					maxHp: stats.hp,
					sp: stats.sp,
					maxSp: stats.sp,
					spRegen: stats.spRegen,
					shield: 0,
					atk: stats.atk,
					baseAtk: stats.atk,
					def: stats.def,
					baseDef: stats.def,
					states: [],
					alive: true,
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

	const playerA = makePlayer("A", slotA, statsA);
	const playerB = makePlayer("B", slotB, statsB);

	const events: StateChangeEvent[] = [];
	playerA.on("*", (ev: StateChangeEvent) =>
		events.push({ ...ev, player: "A" }),
	);
	playerB.on("*", (ev: StateChangeEvent) =>
		events.push({ ...ev, player: "B" }),
	);

	playerA.start();
	playerB.start();

	// Wire opponent refs via events (snapshots are immutable — cannot mutate directly)
	playerA.send({ type: "SET_OPPONENT", ref: playerB });
	playerB.send({ type: "SET_OPPONENT", ref: playerA });

	// Both players cast slot 1 (schedules hits on the clock)
	playerA.send({ type: "CAST_SLOT", slot: 1 });
	playerB.send({ type: "CAST_SLOT", slot: 1 });

	// Advance clock through all scheduled events (hits spread over time)
	clock.drain();

	// Check death after all hits resolve
	playerA.send({ type: "CHECK_DEATH" });
	playerB.send({ type: "CHECK_DEATH" });

	const aFinal = playerA.getSnapshot().context.state;
	const bFinal = playerB.getSnapshot().context.state;

	return {
		config: {
			playerA: { label: "A", book: formatBook(config.playerA), ...statsA },
			playerB: { label: "B", book: formatBook(config.playerB), ...statsB },
			formulas,
			progression,
			seed,
		},
		events: events as SimulationData["events"],
		result: {
			winner:
				aFinal.alive && !bFinal.alive
					? "A"
					: !aFinal.alive && bFinal.alive
						? "B"
						: null,
			aFinal: { hp: aFinal.hp, sp: aFinal.sp, shield: aFinal.shield, atk: aFinal.atk, def: aFinal.def, alive: aFinal.alive },
			bFinal: { hp: bFinal.hp, sp: bFinal.sp, shield: bFinal.shield, atk: bFinal.atk, def: bFinal.def, alive: bFinal.alive },
		},
	};
}
