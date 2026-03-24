/**
 * Stage 3: Effects (Parser)
 *
 * Each card shows:
 * 1. Event line: type { key: val, ... }
 * 2. Data state tag (tier gating)
 */

import type { EffectRow } from "./types.ts";
import {
	T,
	TYPE_COLORS,
	stageHeaderStyle,
	stageNum,
	stageSubtitle,
} from "./theme.ts";

export function EffectView({ effects }: { effects: EffectRow[] }) {
	return (
		<div>
			<div style={stageHeaderStyle}>
				<span style={stageNum}>3</span>
				Effects
				<span style={stageSubtitle}>Parser Output</span>
			</div>
			{effects.length === 0 ? (
				<div style={emptyStyle}>No effects parsed</div>
			) : (
				<div style={listStyle}>
					{effects.map((effect, i) => (
						<EffectCard key={i} effect={effect} />
					))}
				</div>
			)}
		</div>
	);
}

function EffectCard({ effect }: { effect: EffectRow }) {
	const color = TYPE_COLORS[effect.type] ?? T.textMuted;
	const fields = Object.entries(effect).filter(
		([k]) => k !== "type" && k !== "data_state",
	);

	const params = fields
		.map(([k, v]) => `${k}: ${formatValue(v)}`)
		.join(", ");

	const ds = effect.data_state;
	const dsStr = ds
		? Array.isArray(ds)
			? (ds as string[]).join(", ")
			: String(ds)
		: null;

	return (
		<div style={{ ...cardStyle, borderLeftColor: `${color}88` }}>
			{/* Event: type { params } */}
			<div style={eventLine}>
				<span style={{ color, fontWeight: "bold" }}>{effect.type}</span>
				{params && (
					<span style={paramsStyle}>
						{"{ "}
						{params}
						{" }"}
					</span>
				)}
			</div>

			{/* Data state */}
			{dsStr && <div style={dsStyle}>{dsStr}</div>}
		</div>
	);
}

function formatValue(v: unknown): string {
	if (typeof v === "string") return v;
	if (typeof v === "number") return String(v);
	if (typeof v === "boolean") return v ? "true" : "false";
	return JSON.stringify(v);
}

// ── Styles ───────────────────────────────────────────────

const listStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: 5,
};

const emptyStyle: React.CSSProperties = {
	color: T.textMuted,
	fontSize: 12,
	fontStyle: "italic",
	padding: "8px 0",
};

const cardStyle: React.CSSProperties = {
	background: "rgba(255,255,255,0.02)",
	border: "1px solid #2a2a2a",
	borderLeft: "3px solid",
	borderRadius: 5,
	padding: "5px 10px",
	fontFamily: T.body,
	display: "flex",
	flexDirection: "column",
	gap: 3,
};

const eventLine: React.CSSProperties = {
	fontSize: 12,
	display: "flex",
	alignItems: "baseline",
	gap: 4,
	flexWrap: "wrap",
};

const paramsStyle: React.CSSProperties = {
	color: T.goldLight,
	fontSize: 11,
	fontVariantNumeric: "tabular-nums",
};

const dsStyle: React.CSSProperties = {
	fontSize: 10,
	color: T.goldDark,
};
