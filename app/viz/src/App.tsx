import { useMemo, useState } from "react";
import {
	type Metric,
	type TimeSeries,
	buildTimeSeries,
	buildTimeSeriesUpTo,
} from "./buildTimeSeries.ts";
import { Chart } from "./Chart.tsx";
import {
	ASSETS,
	Bar,
	Divider,
	KIND_COLORS,
	btnStyle,
	chipStyle,
	fmt,
	theme as T,
} from "./components.tsx";
import { ConfigPanel } from "./ConfigPanel.tsx";
import { type SimConfig, runSimulation } from "./runSim.ts";
import type {
	BookVerification,
	PlayerSnapshot,
	SimEvent,
	SimulationData,
} from "./types.ts";
import { useReplay } from "./useReplay.ts";

const METRICS: Metric[] = ["hp", "sp", "shield", "atk", "def"];
const PLAYERS = ["A", "B"] as const;

interface ChartConfig {
	id: number;
	selections: { player: "A" | "B"; metric: Metric }[];
}

// ── Sub-components ──────────────────────────────────────────────────

function PlayerPanel({ label, book, snapshot }: { label: string; book: string; snapshot: PlayerSnapshot }) {
	return (
		<div className="rpg-panel-ornate" style={{
			flex: 1, padding: 20,
			backgroundImage: `url('${ASSETS.panelBg}')`,
			backgroundSize: "500px",
			backgroundColor: T.bgPanel,
			borderRadius: 12,
			boxShadow: `0 0 0 3px #2c3e50, 0 0 0 5px ${snapshot.alive ? T.goldDark : T.red}, 0 0 20px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.7)`,
			opacity: snapshot.alive ? 1 : 0.6,
		}}>
			<div className="rpg-corner-tr" />
			<div className="rpg-corner-bl" />
			<h2 style={{
				margin: "0 0 8px", fontSize: 15,
				fontFamily: T.heading,
				color: snapshot.alive ? T.goldLight : T.red,
				textShadow: "2px 2px 4px #000",
				borderBottom: `2px solid ${snapshot.alive ? T.goldDark : T.red}`,
				paddingBottom: 6, display: "inline-block",
			}}>
				{label}: {book}{!snapshot.alive && " 💀"}
			</h2>
			<Bar value={snapshot.hp} max={snapshot.maxHp} color={T.hp} label="HP 气血" />
			<Bar value={snapshot.sp} max={snapshot.maxSp} color={T.sp} label="SP 灵力" />
			<Bar value={snapshot.shield} max={snapshot.maxHp * 0.1} color={T.shield} label="Shield 护盾" />
			<div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: T.text, textShadow: "1px 1px 2px black" }}>
				<span>
					ATK: <span style={{ color: snapshot.atk !== snapshot.baseAtk ? T.goldLight : T.text }}>
						{snapshot.atk.toLocaleString(undefined, { maximumFractionDigits: 0 })}
					</span>
					{snapshot.atk !== snapshot.baseAtk && <span style={{ color: T.textMuted }}> ({snapshot.baseAtk.toLocaleString()})</span>}
				</span>
				<span>
					DEF: <span style={{ color: snapshot.def !== snapshot.baseDef ? T.goldLight : T.text }}>
						{snapshot.def.toLocaleString(undefined, { maximumFractionDigits: 0 })}
					</span>
					{snapshot.def !== snapshot.baseDef && <span style={{ color: T.textMuted }}> ({snapshot.baseDef.toLocaleString()})</span>}
				</span>
			</div>
			{snapshot.states.length > 0 && (
				<div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
					{snapshot.states.map((s, i) => (
						<span
							key={`${s.name}-${i}`}
							className={`rpg-badge rpg-badge-${s.kind}`}
							data-rpg-tooltip={`${s.kind}: ${s.name} (from ${s.source})`}
						>
							{s.kind === "buff" ? "+" : s.kind === "debuff" ? "−" : "◆"} {s.name}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

function formatEvent(ev: Record<string, unknown>): string | null {
	const t = `t=${((ev.t as number ?? 0) / 1000).toFixed(1).padStart(5)}`;
	const p = ev.player as string;
	switch (ev.type) {
		case "CAST_START": return `${t}  ⚔  ${p} casts ${ev.book} (slot ${ev.slot})`;
		case "HP_CHANGE": {
			const delta = (ev.next as number) - (ev.prev as number);
			return `${t}  ${p} HP ${delta > 0 ? "+" : ""}${delta.toLocaleString(undefined, { maximumFractionDigits: 0 })} [${ev.cause}]`;
		}
		case "SP_CHANGE": return `${t}  ${p} SP → ${(ev.next as number).toLocaleString(undefined, { maximumFractionDigits: 0 })} [${ev.cause}]`;
		case "SHIELD_CHANGE": return `${t}  ${p} Shield → ${(ev.next as number).toLocaleString(undefined, { maximumFractionDigits: 0 })} [${ev.cause}]`;
		case "STATE_APPLY": return `${t}  ${p} +${(ev.state as Record<string, string>).name} (${(ev.state as Record<string, string>).kind})`;
		case "STAT_CHANGE": return `${t}  ${p} ${ev.stat}: ${(ev.prev as number).toLocaleString()} → ${(ev.next as number).toLocaleString()}`;
		case "DEATH": return `${t}  💀 ${p} DIES`;
		case "HANDLER_ERROR": return `${t}  ⚠ ${p} [slot ${ev.slot}] ${ev.message}`;
		default: return null;
	}
}

// ── Verification Panel ──────────────────────────────────────────────

function VerificationPanel({
	verification,
	events,
}: {
	verification: { a: BookVerification; b: BookVerification };
	events: SimEvent[];
}) {
	const [expanded, setExpanded] = useState(false);

	const eventsOnA = events.filter((e) => e.player === "A");
	const eventsOnB = events.filter((e) => e.player === "B");

	return (
		<div style={{ marginBottom: 16 }}>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className={btnStyle} style={{ marginBottom: 8 }}
			>
				{expanded ? "▾ Hide" : "▸ Show"} Verification
			</button>
			{expanded && (
				<div style={{ display: "flex", gap: 16 }}>
					<CausalTrace
						source={verification.a}
						sourceLabel="A"
						targetLabel="B"
						targetEvents={eventsOnB}
						selfEvents={eventsOnA}
					/>
					<CausalTrace
						source={verification.b}
						sourceLabel="B"
						targetLabel="A"
						targetEvents={eventsOnA}
						selfEvents={eventsOnB}
					/>
				</div>
			)}
		</div>
	);
}

/** Classify an effect type as self-targeted or opponent-targeted */
function effectTarget(type: string, params: Record<string, unknown>): "self" | "opponent" {
	switch (type) {
		case "debuff":
		case "conditional_debuff":
		case "enemy_skill_damage_reduction":
		case "random_debuff":
			return "opponent";
		case "base_attack":
		case "percent_max_hp_damage":
		case "percent_current_hp_damage":
		case "flat_extra_damage":
		case "per_debuff_stack_damage":
		case "per_debuff_stack_true_damage":
		case "per_buff_stack_damage":
		case "per_enemy_lost_hp":
		case "conditional_damage":
		case "self_lost_hp_damage":
		case "delayed_burst":
		case "buff_steal":
		case "periodic_dispel":
		case "shield_destroy_damage":
		case "no_shield_double_damage":
			return "opponent";
		default:
			// Check if it's a state with target=opponent
			if (params.target === "opponent") return "opponent";
			return "self";
	}
}

/** Map effect types to expected sim event types on the target */
function expectedEvents(type: string): string {
	switch (type) {
		case "base_attack": return "→ HIT → HP_CHANGE(hit_*)";
		case "percent_max_hp_damage": return "→ HP_CHANGE(hit_-1)";
		case "percent_current_hp_damage": return "→ HP_CHANGE(hp_damage)";
		case "debuff":
		case "conditional_debuff":
		case "random_debuff":
		case "enemy_skill_damage_reduction":
			return "→ STATE_APPLY (debuff)";
		case "self_buff":
		case "conditional_buff":
		case "counter_buff":
		case "self_buff_extra":
		case "next_skill_buff":
			return "→ STATE_APPLY (buff)";
		case "self_heal":
		case "conditional_heal_buff":
			return "→ HP_CHANGE(heal)";
		case "shield":
		case "shield_strength":
		case "damage_to_shield":
			return "→ SHIELD_CHANGE";
		case "self_hp_cost": return "→ HP_CHANGE(hp_cost)";
		case "dot": return "→ STATE_APPLY + HP_CHANGE(dot)";
		case "guaranteed_resonance": return "→ SP_CHANGE(resonance)";
		case "per_hit_escalation":
		case "periodic_escalation":
			return "→ escalating HIT damage";
		case "damage_increase":
		case "skill_damage_increase":
		case "attack_bonus":
		case "crit_damage_bonus":
		case "buff_strength":
		case "final_damage_bonus":
			return "→ increased HIT damage";
		case "damage_reduction_during_cast":
		case "self_damage_taken_increase":
			return "→ STATE_APPLY (DR modifier)";
		default: return "";
	}
}

function CausalTrace({
	source,
	sourceLabel,
	targetLabel,
	targetEvents,
	selfEvents,
}: {
	source: BookVerification;
	sourceLabel: string;
	targetLabel: string;
	targetEvents: SimEvent[];
	selfEvents: SimEvent[];
}) {
	// Split effects into opponent-targeted and self-targeted
	const opponentEffects = source.activeEffects.filter(
		(e) => effectTarget(e.type, e.params) === "opponent",
	);
	const selfEffects = source.activeEffects.filter(
		(e) => effectTarget(e.type, e.params) === "self",
	);

	// Summarize target events
	let targetDamage = 0;
	for (const ev of targetEvents) {
		if (ev.type === "HP_CHANGE") {
			const delta = (ev.next as number) - (ev.prev as number);
			if (delta < 0) targetDamage += Math.abs(delta);
		}
	}
	const targetStates = targetEvents
		.filter((e) => e.type === "STATE_APPLY")
		.map((e) => (e.state as { name: string; kind: string }));

	let selfHeal = 0;
	for (const ev of selfEvents) {
		if (ev.type === "HP_CHANGE" && ev.cause === "heal") {
			selfHeal += (ev.next as number) - (ev.prev as number);
		}
	}

	return (
		<div style={tracePanel}>
			<div style={{ color: "#e5c07b", fontWeight: "bold", marginBottom: 8, fontSize: 13 }}>
				{sourceLabel}: {source.bookName}
			</div>

			{/* Raw text */}
			<div style={{ marginBottom: 8 }}>
				<div style={sectionHeader}>原文</div>
				{source.skillText && <div style={rawTextStyle}>{source.skillText}</div>}
				{source.affixText && <div style={{ ...rawTextStyle, marginTop: 4 }}>{source.affixText}</div>}
			</div>

			{/* Effects → opponent */}
			<div style={{ marginBottom: 8 }}>
				<div style={sectionHeader}>
					{sourceLabel} → {targetLabel} (opponent effects)
				</div>
				{opponentEffects.map((e, i) => {
					const params = Object.entries(e.params)
						.filter(([, v]) => v !== undefined)
						.map(([k, v]) => `${k}=${v}`)
						.join(", ");
					const expect = expectedEvents(e.type);
					return (
						<div key={`opp-${e.type}-${i}`} style={{ paddingLeft: 8, marginBottom: 2 }}>
							<span style={{ color: "#61afef" }}>{e.type}</span>
							{params ? <span style={{ color: "#abb2bf" }}>: {params}</span> : ""}
							{expect && <span style={{ color: "#5c6370" }}> {expect}</span>}
						</div>
					);
				})}
				<div style={{ paddingLeft: 8, marginTop: 4, color: "#e06c75" }}>
					Total damage to {targetLabel}: {fmt(targetDamage)}
				</div>
				{targetStates.length > 0 && (
					<div style={{ paddingLeft: 8, color: "#abb2bf" }}>
						States on {targetLabel}: {targetStates.map((s) => `${s.kind === "debuff" ? "−" : "+"}${s.name}`).join(", ")}
					</div>
				)}
			</div>

			{/* Self effects */}
			<div>
				<div style={sectionHeader}>
					{sourceLabel} → {sourceLabel} (self effects)
				</div>
				{selfEffects.map((e, i) => {
					const params = Object.entries(e.params)
						.filter(([, v]) => v !== undefined)
						.map(([k, v]) => `${k}=${v}`)
						.join(", ");
					const expect = expectedEvents(e.type);
					return (
						<div key={`self-${e.type}-${i}`} style={{ paddingLeft: 8, marginBottom: 2 }}>
							<span style={{ color: "#61afef" }}>{e.type}</span>
							{params ? <span style={{ color: "#abb2bf" }}>: {params}</span> : ""}
							{expect && <span style={{ color: "#5c6370" }}> {expect}</span>}
						</div>
					);
				})}
				{selfHeal > 0 && (
					<div style={{ paddingLeft: 8, marginTop: 4, color: "#98c379" }}>
						Self healed: {fmt(selfHeal)}
					</div>
				)}
			</div>
		</div>
	);
}

const tracePanel: React.CSSProperties = {
	flex: 1,
	backgroundImage: `url('${ASSETS.panelBg}')`,
	backgroundSize: "500px",
	backgroundColor: T.bgPanel,
	borderRadius: 12,
	padding: 14,
	fontSize: 11,
	maxHeight: 600,
	overflowY: "auto",
	boxShadow: `0 0 0 2px #2c3e50, 0 0 0 4px ${T.goldDark}88, 0 0 15px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.6)`,
};
const sectionHeader: React.CSSProperties = {
	fontFamily: T.heading,
	color: T.goldLight,
	fontWeight: "bold",
	marginBottom: 4,
	fontSize: 12,
	textShadow: "1px 1px 3px #000",
	borderBottom: `1px solid ${T.goldDark}66`,
	paddingBottom: 3,
	display: "inline-block",
};
const rawTextStyle: React.CSSProperties = {
	color: T.textMuted,
	whiteSpace: "pre-wrap",
	paddingLeft: 8,
	borderLeft: `2px solid ${T.goldDark}44`,
	fontSize: 11,
	textShadow: "1px 1px 2px black",
};

// ── Simulation Results View ─────────────────────────────────────────

let nextChartId = 1;

function SimView({ data }: { data: SimulationData }) {
	const [speed, setSpeed] = useState(1);
	const replay = useReplay(data, speed);
	const [charts, setCharts] = useState<ChartConfig[]>([
		{ id: nextChartId++, selections: [{ player: "A", metric: "hp" }, { player: "B", metric: "hp" }] },
	]);

	const allSeries = useMemo(() => {
		const result: Record<string, TimeSeries> = {};
		for (const p of PLAYERS) {
			for (const m of METRICS) {
				result[`${p}-${m}`] = buildTimeSeries(data, p, m);
			}
		}
		return result;
	}, [data]);

	return (
		<>
			{/* Player panels */}
			<div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
				<PlayerPanel label="A" book={data.config.playerA.book} snapshot={replay.playerA} />
				<PlayerPanel label="B" book={data.config.playerB.book} snapshot={replay.playerB} />
			</div>

			{/* Verification */}
			{data.verification && (
				<VerificationPanel
					verification={data.verification}
					events={data.events}
				/>
			)}

			{/* Controls */}
			<div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
				{!replay.playing ? (
					<button type="button" onClick={replay.play} disabled={replay.finished} className={btnStyle}>
						{replay.finished ? "Finished" : "▶ Play"}
					</button>
				) : (
					<button type="button" onClick={replay.pause} className={btnStyle}>⏸ Pause</button>
				)}
				<button type="button" onClick={replay.reset} className={btnStyle}>↺ Reset</button>
				<button type="button" onClick={replay.skipToEnd} className={btnStyle}>⏭ Skip</button>
				<span style={{ marginLeft: 12, fontSize: 13 }}>Speed:</span>
				{[0.5, 1, 2, 5, 10].map((s) => (
					<button type="button" key={s} onClick={() => setSpeed(s)} className={btnStyle} style={{ background: speed === s ? "#b8860b" : undefined, color: speed === s ? "#000" : undefined }}>
						{s}x
					</button>
				))}
				<span style={{ marginLeft: 12, fontSize: 13, color: "#5c6370" }}>t={(replay.time / 1000).toFixed(1)}s</span>
			</div>

			{/* Charts */}
			{charts.map((chart) => {
				const series = chart.selections.map((sel) => {
					const full = allSeries[`${sel.player}-${sel.metric}`];
					return full ? buildTimeSeriesUpTo(full, replay.time) : null;
				}).filter(Boolean) as TimeSeries[];
				return (
					<div key={chart.id} style={{ marginBottom: 8 }}>
						<div style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center", flexWrap: "wrap" }}>
							{PLAYERS.map((p) => METRICS.map((m) => {
								const key = `${p}-${m}`;
								const selected = chart.selections.some((s) => s.player === p && s.metric === m);
								return (
									<button type="button" key={key} onClick={() => {
										setCharts((prev) => prev.map((c) => {
											if (c.id !== chart.id) return c;
											const has = c.selections.some((s) => s.player === p && s.metric === m);
											return { ...c, selections: has ? c.selections.filter((s) => !(s.player === p && s.metric === m)) : [...c.selections, { player: p, metric: m }] };
										}));
									}} style={{ ...chipStyle, background: selected ? (allSeries[key]?.color ?? "#61afef") : "#2c313a", color: selected ? "#282c34" : "#5c6370", borderColor: selected ? "transparent" : "#4b5263" }}>
										{p} {m}
									</button>
								);
							}))}
							<button type="button" onClick={() => setCharts((prev) => prev.filter((c) => c.id !== chart.id))} style={{ ...chipStyle, color: "#e06c75", borderColor: "#4b5263" }}>×</button>
						</div>
						<Chart series={series} width={900} title={chart.selections.map((s) => `${s.player} ${s.metric}`).join(", ")} />
					</div>
				);
			})}
			<button type="button" onClick={() => setCharts((prev) => [...prev, { id: nextChartId++, selections: [] }])} className={btnStyle} style={{ marginBottom: 16 }}>+ Add Chart</button>

			{/* Event log */}
			<div style={{ backgroundImage: `url('${ASSETS.panelBg}')`, backgroundSize: "500px", backgroundColor: T.bgPanel, borderRadius: 12, padding: 14, height: 400, overflowY: "auto", fontSize: 12, lineHeight: 1.6, boxShadow: `0 0 0 2px #2c3e50, 0 0 0 4px ${T.goldDark}88, 0 0 15px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.6)` }} ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
				{/* Config summary */}
				<div style={{ color: T.textMuted, marginBottom: 8, whiteSpace: "pre", borderBottom: `1px solid ${T.goldDark}44`, paddingBottom: 8, textShadow: "1px 1px 2px black" }}>
					{`A: ${data.config.playerA.book}  HP=${fmt(data.config.playerA.hp)} ATK=${fmt(data.config.playerA.atk)} SP=${fmt(data.config.playerA.sp)} DEF=${fmt(data.config.playerA.def)}\nB: ${data.config.playerB.book}  HP=${fmt(data.config.playerB.hp)} ATK=${fmt(data.config.playerB.atk)} SP=${fmt(data.config.playerB.sp)} DEF=${fmt(data.config.playerB.def)}\nDR_K=${fmt(data.config.formulas.dr_constant)} SP→Shield=${data.config.formulas.sp_shield_ratio} seed=${data.config.seed}`}
				</div>
				{replay.visibleEvents.map((ev, i) => {
					const line = formatEvent(ev as Record<string, unknown>);
					if (!line) return null;
					const isDeath = ev.type === "DEATH";
					const isCast = ev.type === "CAST_START";
					const isHp = ev.type === "HP_CHANGE";
					const isError = ev.type === "HANDLER_ERROR";
					return (
						<div key={`${ev.type}-${i}`} style={{ color: isError ? T.goldDark : isDeath ? T.red : isCast ? T.goldLight : isHp ? T.green : T.text, whiteSpace: "pre", textShadow: "1px 1px 2px black" }}>
							{line}
						</div>
					);
				})}
				{replay.finished && (
					<div style={{ fontFamily: T.heading, color: T.goldLight, marginTop: 8, fontWeight: "bold", whiteSpace: "pre", borderTop: `1px solid ${T.goldDark}44`, paddingTop: 8, textShadow: "2px 2px 4px #000" }}>
						{`Result: ${data.result.winner ? `Player ${data.result.winner} wins` : "Draw"}\n`}
						{`A: HP=${fmt(data.result.aFinal.hp)} SP=${fmt(data.result.aFinal.sp)} Shield=${fmt(data.result.aFinal.shield)} ATK=${fmt(data.result.aFinal.atk)} DEF=${fmt(data.result.aFinal.def)} ${data.result.aFinal.alive ? "alive" : "dead"}\n`}
						{`B: HP=${fmt(data.result.bFinal.hp)} SP=${fmt(data.result.bFinal.sp)} Shield=${fmt(data.result.bFinal.shield)} ATK=${fmt(data.result.bFinal.atk)} DEF=${fmt(data.result.bFinal.def)} ${data.result.bFinal.alive ? "alive" : "dead"}`}
					</div>
				)}
			</div>
		</>
	);
}

// ── App ─────────────────────────────────────────────────────────────

export function App() {
	const [simData, setSimData] = useState<SimulationData | null>(null);
	const [simError, setSimError] = useState("");
	const [runCount, setRunCount] = useState(0);

	const handleRun = (config: SimConfig) => {
		setSimError("");
		try {
			const data = runSimulation(config);
			setRunCount((c) => c + 1);
			setSimData(data);
		} catch (e) {
			setSimError((e as Error).message);
			setSimData(null);
		}
	};

	return (
		<div style={{ fontFamily: T.body, backgroundImage: `url('${ASSETS.fantasyBg}')`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed", color: T.text, minHeight: "100vh", padding: 24 }}>
			<h1 className="rpg-heading" style={{ margin: "0 0 16px", fontSize: 22 }}>Divine Book Combat Simulator</h1>
			<Divider />
			<ConfigPanel onRun={handleRun} />
			{simError && <div style={{ color: T.red, fontSize: 12, padding: 12, background: "rgba(0,0,0,0.7)", border: `2px solid ${T.red}88`, borderRadius: 8, marginBottom: 16, whiteSpace: "pre-wrap", boxShadow: T.glow(T.red, 12), textShadow: "1px 1px 2px black" }}>{simError}</div>}
			{simData && <SimView key={runCount} data={simData} />}
		</div>
	);
}

