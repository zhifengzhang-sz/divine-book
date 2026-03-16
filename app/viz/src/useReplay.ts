import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ActiveState,
	PlayerSnapshot,
	SimEvent,
	SimulationData,
} from "./types.ts";

function initSnapshot(config: {
	hp: number;
	sp: number;
}): PlayerSnapshot {
	return {
		hp: config.hp,
		maxHp: config.hp,
		sp: config.sp,
		maxSp: config.sp,
		shield: 0,
		alive: true,
		states: [],
	};
}

/**
 * Replays the event stream at configurable speed.
 * Returns the current state of both players and the visible event log.
 */
export function useReplay(data: SimulationData, speed: number) {
	const [time, setTime] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [eventIndex, setEventIndex] = useState(0);
	const [visibleEvents, setVisibleEvents] = useState<SimEvent[]>([]);
	const [playerA, setPlayerA] = useState<PlayerSnapshot>(() =>
		initSnapshot(data.config.playerA),
	);
	const [playerB, setPlayerB] = useState<PlayerSnapshot>(() =>
		initSnapshot(data.config.playerB),
	);

	const rafRef = useRef<number>(0);
	const lastFrameRef = useRef<number>(0);
	const simTimeRef = useRef(0);

	// Process events up to current simulation time
	const processTo = useCallback(
		(targetTime: number) => {
			let idx = eventIndex;
			const a = { ...playerA, states: [...playerA.states] };
			const b = { ...playerB, states: [...playerB.states] };
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
						const stateIdx = p.states.findIndex(
							(s) => s.name === name,
						);
						if (stateIdx !== -1) p.states.splice(stateIdx, 1);
						break;
					}
					case "DEATH":
						p.alive = false;
						p.hp = 0;
						break;
				}
				idx++;
			}

			if (idx > eventIndex) {
				setEventIndex(idx);
				setPlayerA({ ...a });
				setPlayerB({ ...b });
				setVisibleEvents((prev) => [...prev, ...newVisible]);
			}
		},
		[data.events, eventIndex, playerA, playerB],
	);

	// Animation loop
	useEffect(() => {
		if (!playing) return;

		lastFrameRef.current = performance.now();

		const tick = (now: number) => {
			const dt = (now - lastFrameRef.current) * speed;
			lastFrameRef.current = now;
			simTimeRef.current += dt;
			setTime(simTimeRef.current);
			processTo(simTimeRef.current);

			if (eventIndex >= data.events.length) {
				setPlaying(false);
				return;
			}
			rafRef.current = requestAnimationFrame(tick);
		};

		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [playing, speed, processTo, eventIndex, data.events.length]);

	const play = () => setPlaying(true);
	const pause = () => setPlaying(false);
	const reset = () => {
		setPlaying(false);
		setTime(0);
		setEventIndex(0);
		setVisibleEvents([]);
		simTimeRef.current = 0;
		setPlayerA(initSnapshot(data.config.playerA));
		setPlayerB(initSnapshot(data.config.playerB));
	};
	const skipToEnd = () => {
		processTo(Number.POSITIVE_INFINITY);
		setPlaying(false);
	};

	return {
		time,
		playing,
		playerA,
		playerB,
		visibleEvents,
		play,
		pause,
		reset,
		skipToEnd,
		finished: eventIndex >= data.events.length,
	};
}
