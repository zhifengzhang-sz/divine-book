/**
 * Stage 1: Segments (Boundary Splitting)
 *
 * Each card shows:
 * 1. Segment type: main_segment or state_segment (with target)
 * 2. Source text: the Chinese prose in this segment
 */

import type { TokenEvent } from "./types.ts";
import {
	T,
	TYPE_COLORS,
	stageHeaderStyle,
	stageNum,
	stageSubtitle,
} from "./theme.ts";

export function TokenView({ tokens }: { tokens: TokenEvent[] }) {
	return (
		<div>
			<div style={stageHeaderStyle}>
				<span style={stageNum}>1</span>
				Segments
				<span style={stageSubtitle}>Boundary Split</span>
			</div>
			{tokens.length === 0 ? (
				<div style={emptyStyle}>No segments</div>
			) : (
				<div style={listStyle}>
					{tokens.map((tok, i) => (
						<TokenCard key={i} token={tok} />
					))}
				</div>
			)}
		</div>
	);
}

function TokenCard({ token }: { token: TokenEvent }) {
	const color = TYPE_COLORS[token.type] ?? T.textMuted;
	const meta = token.meta ? Object.entries(token.meta) : [];

	// Build the event line: type { key: val, key: val }
	const params = Object.entries(token.fields)
		.map(([k, v]) => `${k}: ${String(v)}`)
		.join(", ");

	return (
		<div style={{ ...cardStyle, borderLeftColor: `${color}88` }}>
			{/* Event: type { params } */}
			<div style={eventLine}>
				<span style={{ color, fontWeight: "bold" }}>{token.type}</span>
				{params && (
					<span style={paramsStyle}>
						{"{ "}
						{params}
						{" }"}
					</span>
				)}
			</div>

			{/* Message: matched Chinese source text */}
			{token.matchedText && (
				<div style={messageStyle}>{token.matchedText}</div>
			)}

			{/* Meta tags (if any) */}
			{meta.length > 0 && (
				<div style={metaLine}>
					{meta.map(([k, v]) => (
						<span key={k} style={metaTag}>
							{k}={JSON.stringify(v)}
						</span>
					))}
				</div>
			)}
		</div>
	);
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

const messageStyle: React.CSSProperties = {
	fontSize: 12,
	color: T.textMuted,
	fontFamily: T.headingCn,
	lineHeight: 1.5,
};

const metaLine: React.CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	gap: 4,
};

const metaTag: React.CSSProperties = {
	fontSize: 10,
	color: T.cyan,
	background: "rgba(26,188,156,0.08)",
	border: "1px solid rgba(26,188,156,0.2)",
	borderRadius: 3,
	padding: "0 5px",
	lineHeight: "16px",
};
