import { useMemo, useState } from "react";
import sampleData from "./sample-data.json";
import {
	type Metric,
	type TimeSeries,
	buildTimeSeries,
	buildTimeSeriesUpTo,
} from "./buildTimeSeries.ts";
import { Chart } from "./Chart.tsx";
import type { SimulationData } from "./types.ts";
import { useReplay } from "./useReplay.ts";

const data = sampleData as SimulationData;
const METRICS: Metric[] = ["hp", "sp", "shield", "atk", "def"];
const PLAYERS = ["A", "B"] as const;

interface ChartConfig {
	id: number;
	selections: { player: "A" | "B"; metric: Metric }[];
}


function Bar({
	value,
	max,
	color,
	label,
}: { value: number; max: number; color: string; label: string }) {
	const pct = Math.max(0, Math.min(100, (value / max) * 100));
	return (
		<div style={{ marginBottom: 4 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: 12,
					color: "#abb2bf",
				}}
			>
				<span>{label}</span>
				<span>
					{value.toLocaleString(undefined, { maximumFractionDigits: 0 })} /{" "}
					{max.toLocaleString()}
				</span>
			</div>
			<div
				style={{
					height: 20,
					background: "#2c313a",
					borderRadius: 4,
					overflow: "hidden",
					border: "1px solid #4b5263",
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: "100%",
						background: color,
						transition: "width 0.1s ease",
					}}
				/>
			</div>
		</div>
	);
}

function PlayerPanel({
	label,
	book,
	snapshot,
}: {
	label: string;
	book: string;
	snapshot: { hp: number; maxHp: number; sp: number; maxSp: number; shield: number; alive: boolean };
}) {
	return (
		<div
			style={{
				flex: 1,
				padding: 16,
				background: "#282c34",
				borderRadius: 8,
				border: `2px solid ${snapshot.alive ? "#4b5263" : "#e06c75"}`,
				opacity: snapshot.alive ? 1 : 0.5,
			}}
		>
			<h2 style={{ margin: "0 0 4px", color: snapshot.alive ? "#e5c07b" : "#e06c75" }}>
				{label}: {book}
				{!snapshot.alive && " 💀"}
			</h2>
			<Bar value={snapshot.hp} max={snapshot.maxHp} color="#98c379" label="HP (气血)" />
			<Bar value={snapshot.sp} max={snapshot.maxSp} color="#61afef" label="SP (灵力)" />
			<Bar value={snapshot.shield} max={snapshot.maxHp * 0.1} color="#c678dd" label="Shield (护盾)" />
		</div>
	);
}

function formatEvent(ev: Record<string, unknown>): string {
	const t = `t=${((ev.t as number ?? 0) / 1000).toFixed(1).padStart(5)}`;
	const p = ev.player as string;
	switch (ev.type) {
		case "CAST_START":
			return `${t}  ⚔  ${p} casts ${ev.book} (slot ${ev.slot})`;
		case "HP_CHANGE": {
			const delta = (ev.next as number) - (ev.prev as number);
			return `${t}  ${p} HP ${delta > 0 ? "+" : ""}${delta.toLocaleString(undefined, { maximumFractionDigits: 0 })} [${ev.cause}]`;
		}
		case "SP_CHANGE":
			return `${t}  ${p} SP → ${(ev.next as number).toLocaleString(undefined, { maximumFractionDigits: 0 })} [${ev.cause}]`;
		case "SHIELD_CHANGE":
			return `${t}  ${p} Shield → ${(ev.next as number).toLocaleString(undefined, { maximumFractionDigits: 0 })} [${ev.cause}]`;
		case "STATE_APPLY":
			return `${t}  ${p} +${(ev.state as Record<string, string>).name}`;
		case "STAT_CHANGE":
			return `${t}  ${p} ${ev.stat}: ${(ev.prev as number).toLocaleString()} → ${(ev.next as number).toLocaleString()}`;
		case "DEATH":
			return `${t}  💀 ${p} DIES`;
		default:
			return `${t}  ${p} ${ev.type}`;
	}
}

let nextChartId = 1;

export function App() {
	const [speed, setSpeed] = useState(1);
	const replay = useReplay(data, speed);
	const [charts, setCharts] = useState<ChartConfig[]>([
		{ id: nextChartId++, selections: [{ player: "A", metric: "hp" }, { player: "B", metric: "hp" }] },
	]);

	// Pre-build all time series
	const allSeries = useMemo(() => {
		const result: Record<string, TimeSeries> = {};
		for (const p of PLAYERS) {
			for (const m of METRICS) {
				result[`${p}-${m}`] = buildTimeSeries(data, p, m);
			}
		}
		return result;
	}, []);

	return (
		<div
			style={{
				fontFamily: 'Menlo, "Fira Code", monospace',
				background: "#1e2127",
				color: "#abb2bf",
				minHeight: "100vh",
				padding: 24,
			}}
		>
			<h1 style={{ color: "#e5c07b", margin: "0 0 16px", fontSize: 20 }}>
				Divine Book Combat Simulator
			</h1>

			{/* Player panels */}
			<div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
				<PlayerPanel label="A" book={data.config.playerA.book} snapshot={replay.playerA} />
				<PlayerPanel label="B" book={data.config.playerB.book} snapshot={replay.playerB} />
			</div>

			{/* Controls */}
			<div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
				{!replay.playing ? (
					<button type="button" onClick={replay.play} disabled={replay.finished} style={btnStyle}>
						{replay.finished ? "Finished" : "▶ Play"}
					</button>
				) : (
					<button type="button" onClick={replay.pause} style={btnStyle}>
						⏸ Pause
					</button>
				)}
				<button type="button" onClick={replay.reset} style={btnStyle}>
					↺ Reset
				</button>
				<button type="button" onClick={replay.skipToEnd} style={btnStyle}>
					⏭ Skip
				</button>
				<span style={{ marginLeft: 12, fontSize: 13 }}>Speed:</span>
				{[0.5, 1, 2, 5, 10].map((s) => (
					<button
						type="button"
						key={s}
						onClick={() => setSpeed(s)}
						style={{
							...btnStyle,
							background: speed === s ? "#61afef" : "#3e4451",
							color: speed === s ? "#282c34" : "#abb2bf",
						}}
					>
						{s}x
					</button>
				))}
				<span style={{ marginLeft: 12, fontSize: 13, color: "#5c6370" }}>
					t={(replay.time / 1000).toFixed(1)}s
				</span>
			</div>

			{/* Charts */}
			{charts.map((chart) => {
				const series = chart.selections.map((sel) => {
					const full = allSeries[`${sel.player}-${sel.metric}`];
					return full ? buildTimeSeriesUpTo(full, replay.time) : null;
				}).filter(Boolean) as TimeSeries[];

				return (
					<div key={chart.id} style={{ marginBottom: 8 }}>
						<div style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
							{PLAYERS.map((p) =>
								METRICS.map((m) => {
									const key = `${p}-${m}`;
									const selected = chart.selections.some(
										(s) => s.player === p && s.metric === m,
									);
									return (
										<button
											type="button"
											key={key}
											onClick={() => {
												setCharts((prev) =>
													prev.map((c) => {
														if (c.id !== chart.id) return c;
														const has = c.selections.some(
															(s) => s.player === p && s.metric === m,
														);
														return {
															...c,
															selections: has
																? c.selections.filter(
																		(s) => !(s.player === p && s.metric === m),
																	)
																: [...c.selections, { player: p, metric: m }],
														};
													}),
												);
											}}
											style={{
												...chipStyle,
												background: selected ? (allSeries[key]?.color ?? "#61afef") : "#2c313a",
												color: selected ? "#282c34" : "#5c6370",
												borderColor: selected ? "transparent" : "#4b5263",
											}}
										>
											{p} {m}
										</button>
									);
								}),
							)}
							<button
								type="button"
								onClick={() => setCharts((prev) => prev.filter((c) => c.id !== chart.id))}
								style={{ ...chipStyle, color: "#e06c75", borderColor: "#4b5263" }}
							>
								×
							</button>
						</div>
						<Chart series={series} width={900} title={chart.selections.map((s) => `${s.player} ${s.metric}`).join(", ")} />
					</div>
				);
			})}
			<button
				type="button"
				onClick={() => setCharts((prev) => [...prev, { id: nextChartId++, selections: [] }])}
				style={{ ...btnStyle, marginBottom: 16 }}
			>
				+ Add Chart
			</button>

			{/* Event log */}
			<div
				style={{
					background: "#282c34",
					border: "1px solid #4b5263",
					borderRadius: 8,
					padding: 12,
					height: 400,
					overflowY: "auto",
					fontSize: 12,
					lineHeight: 1.6,
				}}
				ref={(el) => {
					if (el) el.scrollTop = el.scrollHeight;
				}}
			>
				{replay.visibleEvents.map((ev, i) => {
					const line = formatEvent(ev as Record<string, unknown>);
					const isHp = ev.type === "HP_CHANGE";
					const isDeath = ev.type === "DEATH";
					const isCast = ev.type === "CAST_START";
					return (
						<div
							key={`${ev.type}-${i}`}
							style={{
								color: isDeath
									? "#e06c75"
									: isCast
										? "#e5c07b"
										: isHp
											? "#98c379"
											: "#abb2bf",
								whiteSpace: "pre",
							}}
						>
							{line}
						</div>
					);
				})}
				{replay.finished && (
					<div style={{ color: "#e5c07b", marginTop: 8, fontWeight: "bold" }}>
						Result: {data.result.winner ? `Player ${data.result.winner} wins` : "Draw"}
					</div>
				)}
			</div>
		</div>
	);
}

const btnStyle: React.CSSProperties = {
	background: "#3e4451",
	color: "#abb2bf",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "6px 12px",
	cursor: "pointer",
	fontSize: 13,
	fontFamily: "inherit",
};

const chipStyle: React.CSSProperties = {
	background: "#2c313a",
	color: "#5c6370",
	border: "1px solid #4b5263",
	borderRadius: 12,
	padding: "2px 8px",
	cursor: "pointer",
	fontSize: 11,
	fontFamily: "inherit",
};
