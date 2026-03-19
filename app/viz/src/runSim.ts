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
	progression: {
		enlightenment: number;
		fusion: number;
	};
}

export interface SimConfig {
	playerA: PlayerBookConfig;
	playerB: PlayerBookConfig;
	formulas: {
		dr_constant: number;
		sp_shield_ratio: number;
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
	const { formulas, seed } = config;
	const progressionA = config.playerA.progression;
	const progressionB = config.playerB.progression;

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
		progression: progressionA,
		books: [slotA],
	};
	const playerConfigB = {
		entity: statsB,
		formulas,
		progression: progressionB,
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
		progression: typeof progressionA,
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

	const playerA = makePlayer("A", slotA, statsA, progressionA);
	const playerB = makePlayer("B", slotB, statsB, progressionB);

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

	// Check for handler errors — if any effect type is unimplemented,
	// report the specific errors and stop (partial results are unreliable)
	const handlerErrors = events.filter((e) => e.type === "HANDLER_ERROR");
	if (handlerErrors.length > 0) {
		const msgs = handlerErrors.map((e) => {
			const err = e as unknown as {
				player: string;
				slot: number;
				message: string;
			};
			return `${err.player} slot ${err.slot}: ${err.message}`;
		});
		throw new Error(
			`Simulation aborted — unimplemented effect types:\n${msgs.join("\n")}`,
		);
	}

	// Advance clock second by second, checking death after each time step
	// so both players' hits at the same time resolve before either dies
	const maxTime = 36000; // 36s max fight
	for (let t = 0; t <= maxTime; t += 1000) {
		clock.advanceTo(t);
		playerA.send({ type: "CHECK_DEATH" });
		playerB.send({ type: "CHECK_DEATH" });
		const aSnap = playerA.getSnapshot();
		const bSnap = playerB.getSnapshot();
		if (aSnap.status === "done" || bSnap.status === "done") break;
	}

	const aFinal = playerA.getSnapshot().context.state;
	const bFinal = playerB.getSnapshot().context.state;

	return {
		config: {
			playerA: { label: "A", book: formatBook(config.playerA), ...statsA },
			playerB: { label: "B", book: formatBook(config.playerB), ...statsB },
			formulas,
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
			aFinal: {
				hp: aFinal.hp,
				sp: aFinal.sp,
				shield: aFinal.shield,
				atk: aFinal.atk,
				def: aFinal.def,
				alive: aFinal.alive,
			},
			bFinal: {
				hp: bFinal.hp,
				sp: bFinal.sp,
				shield: bFinal.shield,
				atk: bFinal.atk,
				def: bFinal.def,
				alive: bFinal.alive,
			},
		},
	};
}
