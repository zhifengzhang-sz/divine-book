/**
 * Stage 2: Grammar Effects (ohm Parse + Post-processing)
 *
 * Each card shows:
 * 1. Effect type [+ merged modifiers]
 * 2. State scope (if inside a named state segment)
 */

import type { GroupEvent } from "./types.ts";
import {
	T,
	TYPE_COLORS,
	stageHeaderStyle,
	stageNum,
	stageSubtitle,
} from "./theme.ts";

export function GroupView({ groups }: { groups: GroupEvent[] }) {
	return (
		<div>
			<div style={stageHeaderStyle}>
				<span style={stageNum}>2</span>
				Grammar Effects
				<span style={stageSubtitle}>ohm Parse</span>
			</div>
			{groups.length === 0 ? (
				<div style={emptyStyle}>No effects parsed</div>
			) : (
				<div style={listStyle}>
					{groups.map((group, i) => (
						<GroupCard key={i} group={group} />
					))}
				</div>
			)}
		</div>
	);
}

function GroupCard({ group }: { group: GroupEvent }) {
	const color = TYPE_COLORS[group.primary] ?? T.textMuted;

	const modsStr =
		group.modifiers.length > 0
			? ` + [${group.modifiers.join(", ")}]`
			: "";

	return (
		<div style={{ ...cardStyle, borderLeftColor: `${color}88` }}>
			{/* Event line */}
			<div style={eventLine}>
				<span style={{ color, fontWeight: "bold" }}>{group.primary}</span>
				{modsStr && <span style={modsStyle}>{modsStr}</span>}
			</div>

			{/* State scope */}
			{group.stateName && (
				<div style={scopeLine}>
					<span style={scopeLabel}>scope:</span>
					<span style={stateTag}>{group.stateName}</span>
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

const modsStyle: React.CSSProperties = {
	color: T.orange,
	fontSize: 11,
};

const scopeLine: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 5,
	fontSize: 11,
};

const scopeLabel: React.CSSProperties = {
	color: "#555",
};

const stateTag: React.CSSProperties = {
	color: T.sp,
	fontFamily: T.headingCn,
	fontSize: 12,
};
