import type { SimEvent, SimulationData } from "./types.ts";

export interface TimePoint {
	t: number; // seconds
	value: number;
}

export interface TimeSeries {
	label: string;
	color: string;
	player: string;
	metric: string;
	points: TimePoint[];
}

export type Metric = "hp" | "sp" | "shield" | "atk" | "def";

const METRIC_COLORS: Record<string, Record<Metric, string>> = {
	A: {
		hp: "#98c379",
		sp: "#61afef",
		shield: "#c678dd",
		atk: "#e5c07b",
		def: "#d19a66",
	},
	B: {
		hp: "#e06c75",
		sp: "#56b6c2",
		shield: "#be5046",
		atk: "#e5c07b",
		def: "#d19a66",
	},
};

/**
 * Build a time series for a given player + metric from the event stream.
 * Returns step-function data points: value changes only at event times.
 */
export function buildTimeSeries(
	data: SimulationData,
	player: "A" | "B",
	metric: Metric,
): TimeSeries {
	const config = player === "A" ? data.config.playerA : data.config.playerB;
	let initialValue: number;
	let eventType: string;
	const field: "prev" | "next" = "next";

	switch (metric) {
		case "hp":
			initialValue = config.hp;
			eventType = "HP_CHANGE";
			break;
		case "sp":
			initialValue = config.sp;
			eventType = "SP_CHANGE";
			break;
		case "shield":
			initialValue = 0;
			eventType = "SHIELD_CHANGE";
			break;
		case "atk":
			initialValue = config.atk;
			eventType = "STAT_CHANGE";
			break;
		case "def":
			initialValue = config.def;
			eventType = "STAT_CHANGE";
			break;
		default:
			initialValue = 0;
			eventType = "";
	}

	const points: TimePoint[] = [{ t: 0, value: initialValue }];

	for (const ev of data.events) {
		if (ev.player !== player) continue;
		if (ev.type !== eventType) continue;
		if (
			eventType === "STAT_CHANGE" &&
			(ev as Record<string, unknown>).stat !== metric
		)
			continue;

		const t = ((ev.t as number) ?? 0) / 1000;
		const value = (ev as Record<string, unknown>).next as number;
		// Add pre-change point at same time (step function)
		if (points.length > 0 && points[points.length - 1].t < t) {
			points.push({ t, value: points[points.length - 1].value });
		}
		points.push({ t, value });
	}

	return {
		label: `${player} ${metric.toUpperCase()}`,
		color: METRIC_COLORS[player]?.[metric] ?? "#abb2bf",
		player,
		metric,
		points,
	};
}

/**
 * Build all time series for selected metrics, up to a given simulation time.
 */
export function buildTimeSeriesUpTo(
	series: TimeSeries,
	maxTime: number,
): TimeSeries {
	const filtered = series.points.filter((p) => p.t <= maxTime / 1000);
	// Add current value at maxTime if needed
	if (filtered.length > 0) {
		const last = filtered[filtered.length - 1];
		if (last.t < maxTime / 1000) {
			filtered.push({ t: maxTime / 1000, value: last.value });
		}
	}
	return { ...series, points: filtered };
}
