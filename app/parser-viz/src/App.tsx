/**
 * Parser Pipeline Visualizer — Main App
 *
 * Layout: left source panel + right three-column pipeline view.
 */

import { useCallback, useState } from "react";
import { EffectView } from "./EffectView.tsx";
import { GroupView } from "./GroupView.tsx";
import { SourcePanel } from "./SourcePanel.tsx";
import { TokenView } from "./TokenView.tsx";
import type { PipelineResult, SourceType, XStateEvent } from "./types.ts";
import { T, panelStyle } from "./theme.ts";

async function fetchPipeline(
	sourceType: SourceType,
	text: string,
	bookName?: string,
): Promise<PipelineResult> {
	const res = await fetch("/api/parse", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sourceType, text, bookName }),
	});
	return res.json();
}

export function App() {
	const [result, setResult] = useState<PipelineResult | null>(null);

	const handleParse = useCallback(
		(sourceType: SourceType, text: string, bookName?: string) => {
			fetchPipeline(sourceType, text, bookName).then(setResult);
		},
		[],
	);

	return (
		<div style={appContainer}>
			<style>{globalCSS}</style>

			<h1 style={titleStyle}>Parser Pipeline Visualizer</h1>

			{/* Main layout: source panel + 3 stage columns */}
			<div style={layoutStyle}>
				{/* Left: Source panel */}
				<SourcePanel onParse={handleParse} />

				{/* Right: Three-column pipeline */}
				{result ? (
					<div style={pipelineArea}>
						{/* Errors + meta */}
						{result.errors.length > 0 && (
							<div style={errorBox}>
								{result.errors.map((e, i) => (
									<div key={i}>{e}</div>
								))}
							</div>
						)}
						{/* Tier variables — shows how var refs resolve to values */}
						{result.tiers.length > 0 && (
							<div style={tiersBar}>
								{result.tiers.map((tier, i) => {
									const vars = Object.entries(tier.vars);
									if (vars.length === 0 && !tier.locked) return null;
									const label = tier.locked
										? "locked"
										: [
												tier.enlightenment !== undefined
													? `悟${tier.enlightenment}境`
													: null,
												tier.fusion !== undefined
													? `融合${tier.fusion}重`
													: null,
											]
												.filter(Boolean)
												.join(", ") || `tier ${i}`;
									return (
										<span key={i} style={tierChip}>
											<span style={tierLabel}>{label}</span>
											{vars.map(([k, v]) => (
												<span key={k} style={tierVar}>
													{k}=
													<span style={tierVal}>{v}</span>
												</span>
											))}
										</span>
									);
								})}
							</div>
						)}

						{/* States */}
						{Object.keys(result.states).length > 0 && (
							<div style={statesBar}>
								<span style={{ color: T.textMuted }}>States:</span>
								{Object.entries(result.states).map(([name, def]) => (
									<span key={name} style={stateChip}>
										<span style={{ color: T.sp }}>{name}</span>
										<span style={stateMeta}>
											{def.target}
											{def.duration ? `, ${def.duration}s` : ""}
											{def.max_stacks
												? `, max ${def.max_stacks}`
												: ""}
											{def.trigger ? `, ${def.trigger}` : ""}
										</span>
									</span>
								))}
							</div>
						)}

						{/* XState reactive events */}
						{result.xstate && result.xstate.length > 0 && (
							<XStateEventsPanel events={result.xstate} />
						)}

						{/* Three columns */}
						<div style={columnsRow}>
							<div style={columnStyle}>
								<div style={{ ...panelStyle, flex: 1, overflow: "auto" }}>
									<TokenView tokens={result.tokens} />
								</div>
							</div>
							<div style={columnStyle}>
								<div style={{ ...panelStyle, flex: 1, overflow: "auto" }}>
									<GroupView groups={result.groups} />
								</div>
							</div>
							<div style={columnStyle}>
								<div style={{ ...panelStyle, flex: 1, overflow: "auto" }}>
									<EffectView effects={result.effects} />
								</div>
							</div>
						</div>
					</div>
				) : (
					<div
						style={{
							flex: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: T.textMuted,
							fontSize: 13,
						}}
					>
						Select a source and it will parse automatically
					</div>
				)}
			</div>
		</div>
	);
}

// ── XState Events Panel ──────────────────────────────────

function XStateEventsPanel({ events }: { events: XStateEvent[] }) {
	const [expanded, setExpanded] = useState(false);
	const tokens = events.filter((e) => e.type === "TOKEN");
	const groups = events.filter((e) => e.type === "GROUP");
	const effects = events.filter((e) => e.type === "EFFECT");
	const diagnostics = events.filter((e) => e.type === "DIAGNOSTIC");

	return (
		<div style={xstateContainer}>
			<div
				style={xstateHeader}
				onClick={() => setExpanded(!expanded)}
				onKeyDown={() => {}}
			>
				<span style={{ color: T.accent }}>
					{expanded ? "▼" : "▶"} XState Pipeline Events
				</span>
				<span style={{ color: T.textMuted, fontSize: 11 }}>
					{tokens.length} tokens → {groups.length} groups →{" "}
					{effects.length} effects
					{diagnostics.length > 0 &&
						` (${diagnostics.length} diagnostics)`}
				</span>
			</div>
			{expanded && (
				<div style={xstateBody}>
					{tokens.map((e, i) => {
						if (e.type !== "TOKEN") return null;
						const t = e.token;
						return (
							<div key={`t${i}`} style={xstateEventRow}>
								<span style={xstageTag}>TOKEN</span>
								<span style={{ color: T.keyword }}>
									{t.term}
								</span>
								{t.scope && (
									<span style={xstateScope}>
										[{t.scope}]
									</span>
								)}
								<span style={{ color: T.textMuted }}>
									{JSON.stringify(t.captures)}
								</span>
								<span style={xstateRaw}>
									{t.raw.slice(0, 30)}
								</span>
							</div>
						);
					})}
					<div style={xstateDivider} />
					{groups.map((e, i) => {
						if (e.type !== "GROUP") return null;
						const g = e.group;
						return (
							<div key={`g${i}`} style={xstateEventRow}>
								<span style={xstageGroupTag}>GROUP</span>
								<span style={{ color: T.keyword }}>
									{g.primary.term}
								</span>
								{g.parentState && (
									<span style={xstateScope}>
										[{g.parentState}]
									</span>
								)}
								{g.modifiers.length > 0 && (
									<span style={{ color: T.textMuted }}>
										+{" "}
										{g.modifiers
											.map((m) => m.term)
											.join(", ")}
									</span>
								)}
							</div>
						);
					})}
					<div style={xstateDivider} />
					{effects.map((e, i) => {
						if (e.type !== "EFFECT") return null;
						return (
							<div key={`e${i}`} style={xstateEventRow}>
								<span style={xstageEffectTag}>EFFECT</span>
								<span style={{ color: T.string }}>
									{JSON.stringify(e.effect)}
								</span>
							</div>
						);
					})}
					{diagnostics.map((e, i) => {
						if (e.type !== "DIAGNOSTIC") return null;
						return (
							<div key={`d${i}`} style={xstateEventRow}>
								<span style={xstageDiagTag}>DIAG</span>
								<span style={{ color: T.warn }}>
									{e.diagnostic.message}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

// ── Styles ───────────────────────────────────────────────

const globalCSS = `
	*, *::before, *::after { box-sizing: border-box; }
	html, body, #root {
		margin: 0;
		padding: 0;
		height: 100%;
		background: #0d0d0d;
		color: ${T.text};
		font-family: ${T.body};
		font-size: 13px;
	}
	::-webkit-scrollbar { width: 6px; height: 6px; }
	::-webkit-scrollbar-track { background: #111; }
	::-webkit-scrollbar-thumb {
		background: #444;
		border-radius: 3px;
	}
	::-webkit-scrollbar-thumb:hover { background: #555; }
`;

const appContainer: React.CSSProperties = {
	height: "100vh",
	display: "flex",
	flexDirection: "column",
	padding: 16,
	gap: 10,
	overflow: "hidden",
};

const titleStyle: React.CSSProperties = {
	fontFamily: T.heading,
	fontSize: 18,
	color: T.goldLight,
	textShadow: `0 0 10px ${T.goldDark}88, 2px 2px 4px #000`,
	margin: 0,
	flexShrink: 0,
};

const layoutStyle: React.CSSProperties = {
	flex: 1,
	display: "flex",
	gap: 12,
	overflow: "hidden",
};

const pipelineArea: React.CSSProperties = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	gap: 6,
	overflow: "hidden",
	minWidth: 0,
};

const columnsRow: React.CSSProperties = {
	flex: 1,
	display: "flex",
	gap: 8,
	overflow: "hidden",
};

const columnStyle: React.CSSProperties = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
	minWidth: 0,
};

const errorBox: React.CSSProperties = {
	background: "rgba(231,76,60,0.1)",
	border: `1px solid ${T.red}44`,
	borderRadius: 4,
	padding: "4px 10px",
	fontSize: 11,
	color: T.red,
	fontFamily: T.body,
	flexShrink: 0,
};

const tiersBar: React.CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
	fontSize: 11,
	fontFamily: T.body,
	flexShrink: 0,
};

const tierChip: React.CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	background: "rgba(255,215,0,0.05)",
	border: `1px solid ${T.goldDark}33`,
	borderRadius: 4,
	padding: "3px 8px",
};

const tierLabel: React.CSSProperties = {
	color: T.textMuted,
	fontFamily: T.headingCn,
	fontSize: 12,
};

const tierVar: React.CSSProperties = {
	color: T.textMuted,
};

const tierVal: React.CSSProperties = {
	color: T.goldLight,
	fontVariantNumeric: "tabular-nums",
	fontWeight: "bold",
};

const statesBar: React.CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 6,
	fontSize: 11,
	fontFamily: T.body,
	flexShrink: 0,
};

const stateChip: React.CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	background: "rgba(52,152,219,0.05)",
	border: `1px solid ${T.sp}22`,
	borderRadius: 4,
	padding: "2px 8px",
	fontFamily: T.headingCn,
	fontSize: 12,
};

const stateMeta: React.CSSProperties = {
	color: T.textMuted,
	fontSize: 10,
	fontFamily: T.body,
};

// ── XState panel styles ──────────────────────────────────

const xstateContainer: React.CSSProperties = {
	background: "rgba(46,204,113,0.03)",
	border: `1px solid ${T.accent}22`,
	borderRadius: 4,
	flexShrink: 0,
};

const xstateHeader: React.CSSProperties = {
	padding: "6px 10px",
	cursor: "pointer",
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	fontSize: 12,
	fontFamily: T.body,
};

const xstateBody: React.CSSProperties = {
	padding: "4px 10px 8px",
	maxHeight: 300,
	overflowY: "auto",
	fontSize: 11,
	fontFamily: T.mono,
};

const xstateEventRow: React.CSSProperties = {
	display: "flex",
	gap: 8,
	alignItems: "baseline",
	padding: "1px 0",
};

const xstateRaw: React.CSSProperties = {
	color: T.textMuted,
	fontSize: 10,
	maxWidth: 200,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

const xstateScope: React.CSSProperties = {
	color: T.sp,
	fontSize: 10,
};

const xstateDivider: React.CSSProperties = {
	borderTop: `1px solid ${T.textMuted}22`,
	margin: "4px 0",
};

const xstageTag: React.CSSProperties = {
	background: `${T.accent}22`,
	color: T.accent,
	padding: "0 4px",
	borderRadius: 2,
	fontSize: 9,
	fontWeight: 600,
};

const xstageGroupTag: React.CSSProperties = {
	...xstageTag,
	background: `${T.sp}22`,
	color: T.sp,
};

const xstageEffectTag: React.CSSProperties = {
	...xstageTag,
	background: `${T.goldLight}22`,
	color: T.goldLight,
};

const xstageDiagTag: React.CSSProperties = {
	...xstageTag,
	background: "rgba(231,76,60,0.15)",
	color: "#e74c3c",
};
