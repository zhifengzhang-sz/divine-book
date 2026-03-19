/**
 * Browser-side simulation runner.
 * Runs the full sim and returns the event stream.
 */

import { createActor } from "xstate";
import { SimulationClock } from "../../../lib/sim/clock.js";
import { selectTiers, validatePlayerConfig } from "../../../lib/sim/config.js";
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
	op1Progression?: {
		enlightenment: number;
		fusion: number;
	};
	op2Progression?: {
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

type BookDataEntry = {
	skill_text?: string;
	affix_text?: string;
	skill?: Record<string, unknown>[];
	primary_affix?: { name: string; effects: Record<string, unknown>[] };
	exclusive_affix?: { name: string; effects: Record<string, unknown>[] };
	[k: string]: unknown;
};

function buildVerification(
	playerConfig: PlayerBookConfig,
	booksYamlBooks: Record<string, BookDataEntry>,
	_rng: SeededRNG,
) {
	const bookData = booksYamlBooks[playerConfig.platform];
	if (!bookData) return null;

	const prog = playerConfig.progression;

	// Get active effects at this tier (same logic as processBook)
	const sources: Record<string, unknown>[][] = [];
	if (bookData.skill) sources.push(bookData.skill);
	if (bookData.primary_affix) sources.push(bookData.primary_affix.effects);
	if (bookData.exclusive_affix) sources.push(bookData.exclusive_affix.effects);

	const activeEffects: { type: string; params: Record<string, unknown> }[] = [];
	for (const source of sources) {
		const tiered = selectTiers(
			source as { type: string; [k: string]: unknown }[],
			prog,
		);
		for (const effect of tiered) {
			const { type, data_state, ...params } = effect;
			activeEffects.push({ type: type as string, params });
		}
	}

	// Resolve aux affix effects
	const auxNames = [playerConfig.op1, playerConfig.op2].filter(Boolean);
	const auxProgs = [playerConfig.op1Progression, playerConfig.op2Progression];
	for (let i = 0; i < auxNames.length; i++) {
		const name = auxNames[i];
		if (!name) continue;
		const auxProg = auxProgs[i] ?? prog;
		// Look up affix effects
		let raw: Record<string, unknown>[] | undefined;
		const affixes = affixesData as {
			universal: Record<string, { effects: Record<string, unknown>[] }>;
			school: Record<
				string,
				Record<string, { effects: Record<string, unknown>[] }>
			>;
		};
		if (affixes.universal[name]) raw = affixes.universal[name].effects;
		if (!raw) {
			for (const school of Object.values(affixes.school)) {
				if (school[name]) {
					raw = school[name].effects;
					break;
				}
			}
		}
		if (!raw) {
			for (const book of Object.values(booksYamlBooks)) {
				if (
					book.exclusive_affix &&
					(book.exclusive_affix as { name: string }).name === name
				) {
					raw = book.exclusive_affix.effects as Record<string, unknown>[];
					break;
				}
			}
		}
		if (raw) {
			const tiered = selectTiers(
				raw as { type: string; [k: string]: unknown }[],
				auxProg,
			);
			for (const effect of tiered) {
				const { type, data_state, ...params } = effect;
				activeEffects.push({ type: type as string, params });
			}
		}
	}

	return {
		bookName: formatBook(playerConfig),
		skillText: (bookData.skill_text as string) ?? "",
		affixText: (bookData.affix_text as string) ?? "",
		activeEffects,
		listeners: 0,
	};
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
		progression: progressionA,
		op1Progression: config.playerA.op1Progression,
		op2Progression: config.playerA.op2Progression,
	};
	const slotB = {
		slot: 1,
		platform: config.playerB.platform,
		op1: config.playerB.op1 || undefined,
		op2: config.playerB.op2 || undefined,
		progression: progressionB,
		op1Progression: config.playerB.op1Progression,
		op2Progression: config.playerB.op2Progression,
	};

	const statsA = config.playerA.stats;
	const statsB = config.playerB.stats;

	// Validate
	const playerConfigA = {
		entity: statsA,
		formulas,
		books: [slotA],
	};
	const playerConfigB = {
		entity: statsB,
		formulas,
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

	const allBooks = booksYaml.books as unknown as Record<string, BookDataEntry>;
	const verA = buildVerification(config.playerA, allBooks, rng);
	const verB = buildVerification(config.playerB, allBooks, rng);

	return {
		verification: verA && verB ? { a: verA, b: verB } : undefined,
		config: {
			playerA: {
				label: "A",
				book: formatBook(config.playerA),
				enlightenment: progressionA.enlightenment,
				fusion: progressionA.fusion,
				...statsA,
			},
			playerB: {
				label: "B",
				book: formatBook(config.playerB),
				enlightenment: progressionB.enlightenment,
				fusion: progressionB.fusion,
				...statsB,
			},
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
