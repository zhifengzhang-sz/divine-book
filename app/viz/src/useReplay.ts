import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ActiveState,
	PlayerSnapshot,
	SimEvent,
	SimulationData,
} from "./types.ts";

function initSnapshot(config: {
	hp: number;
	atk: number;
	sp: number;
	def: number;
}): PlayerSnapshot {
	return {
		hp: config.hp,
		maxHp: config.hp,
		sp: config.sp,
		maxSp: config.sp,
		shield: 0,
		atk: config.atk,
		baseAtk: config.atk,
		def: config.def,
		baseDef: config.def,
		alive: true,
		states: [],
	};
}

/**
 * Replays the event stream at configurable speed.
 * Uses refs for mutable state to avoid stale-closure issues.
 */
export function useReplay(data: SimulationData, speed: number) {
	const [, forceUpdate] = useState(0);
	const stateRef = useRef({
		time: 0,
		playing: false,
		eventIndex: 0,
		visibleEvents: [] as SimEvent[],
		playerA: initSnapshot(data.config.playerA),
		playerB: initSnapshot(data.config.playerB),
	});

	const rafRef = useRef<number>(0);
	const lastFrameRef = useRef<number>(0);

	const rerender = useCallback(() => forceUpdate((c) => c + 1), []);

	// Process events up to target simulation time
	const processTo = useCallback(
		(targetTime: number) => {
			const s = stateRef.current;
			let idx = s.eventIndex;
			const a = { ...s.playerA, states: [...s.playerA.states] };
			const b = { ...s.playerB, states: [...s.playerB.states] };
			const newVisible: SimEvent[] = [];

			while (
				idx < data.events.length &&
				(data.events[idx].t ?? 0) <= targetTime
			) {
				const ev = data.events[idx];
				newVisible.push(ev);
				const p = ev.player === "A" ? a : b;
				switch (ev.type) {
					case "HP_CHANGE":
						p.hp = ev.next as number;
						break;
					case "SP_CHANGE":
						p.sp = ev.next as number;
						break;
					case "SHIELD_CHANGE":
						p.shield = ev.next as number;
						break;
					case "STAT_CHANGE": {
						const stat = ev.stat as string;
						const next = ev.next as number;
						if (stat === "atk") p.atk = next;
						if (stat === "def") p.def = next;
						break;
					}
					case "STATE_APPLY": {
						const state = ev.state as Record<string, unknown>;
						if (state) {
							p.states.push({
								name: state.name as string,
								kind: state.kind as ActiveState["kind"],
								source: (state.source as string) ?? "",
							});
						}
						break;
					}
					case "STATE_EXPIRE":
					case "STATE_REMOVE": {
						const name = ev.name as string;
						const si = p.states.findIndex((st) => st.name === name);
						if (si !== -1) p.states.splice(si, 1);
						break;
					}
					case "DEATH":
						p.alive = false;
						p.hp = 0;
						break;
				}
				idx++;
			}

			if (idx > s.eventIndex) {
				s.eventIndex = idx;
				s.playerA = a;
				s.playerB = b;
				s.visibleEvents = [...s.visibleEvents, ...newVisible];
				s.time = targetTime;
				rerender();
			}
		},
		[data.events, rerender],
	);

	// Animation loop
	useEffect(() => {
		const s = stateRef.current;
		if (!s.playing) return;

		lastFrameRef.current = performance.now();

		const tick = (now: number) => {
			const dt = (now - lastFrameRef.current) * speed;
			lastFrameRef.current = now;
			s.time += dt;
			processTo(s.time);

			if (s.eventIndex >= data.events.length) {
				s.playing = false;
				rerender();
				return;
			}
			rafRef.current = requestAnimationFrame(tick);
		};

		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [speed, processTo, data.events.length, rerender]);

	const s = stateRef.current;

	return {
		time: s.time,
		playing: s.playing,
		playerA: s.playerA,
		playerB: s.playerB,
		visibleEvents: s.visibleEvents,
		play: () => {
			s.playing = true;
			rerender();
		},
		pause: () => {
			s.playing = false;
			rerender();
		},
		reset: () => {
			s.playing = false;
			s.time = 0;
			s.eventIndex = 0;
			s.visibleEvents = [];
			s.playerA = initSnapshot(data.config.playerA);
			s.playerB = initSnapshot(data.config.playerB);
			rerender();
		},
		skipToEnd: () => {
			processTo(Number.POSITIVE_INFINITY);
			s.playing = false;
			rerender();
		},
		finished: s.eventIndex >= data.events.length,
	};
}
