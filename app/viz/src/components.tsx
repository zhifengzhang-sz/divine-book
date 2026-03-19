/**
 * Shared UI primitives for the viz app.
 */

// ── Formatting ──────────────────────────────────────────────────────

export function fmt(n: number): string {
	if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
	if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
	return n.toString();
}

// ── StatInput ───────────────────────────────────────────────────────

export function StatInput({
	label,
	value,
	onChange,
	width = 90,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	width?: number;
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
			<label style={labelStyle}>{label}:</label>
			<input
				type="text"
				value={value}
				onChange={(e) => {
					const n = Number(e.target.value);
					if (!Number.isNaN(n)) onChange(n);
				}}
				style={{ ...inputStyle, width }}
			/>
		</div>
	);
}

// ── Pill ────────────────────────────────────────────────────────────

export function Pill({
	label,
	value,
	onClick,
}: {
	label: string;
	value: string;
	onClick: () => void;
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
			<span style={labelStyle}>{label}:</span>
			<button type="button" onClick={onClick} style={pillStyle}>
				{value || "(none)"}
			</button>
		</div>
	);
}

// ── Bar ─────────────────────────────────────────────────────────────

export function Bar({
	value,
	max,
	color,
	label,
}: {
	value: number;
	max: number;
	color: string;
	label: string;
}) {
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

// ── Styles (exported for use by dialogs/panels) ─────────────────────

export const labelStyle: React.CSSProperties = {
	fontSize: 11,
	color: "#5c6370",
};

export const selectStyle: React.CSSProperties = {
	display: "block",
	width: "100%",
	background: "#1e2127",
	color: "#abb2bf",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "4px 6px",
	fontSize: 13,
	fontFamily: "inherit",
};

export const inputStyle: React.CSSProperties = {
	background: "#1e2127",
	color: "#abb2bf",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "4px 6px",
	fontSize: 12,
	fontFamily: "inherit",
};

export const pillStyle: React.CSSProperties = {
	background: "#1e2127",
	color: "#abb2bf",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "3px 8px",
	fontSize: 12,
	fontFamily: "inherit",
	cursor: "pointer",
	textAlign: "left",
};

export const panelStyle: React.CSSProperties = {
	flex: 1,
	padding: 12,
	background: "#282c34",
	borderRadius: 8,
	border: "1px solid #4b5263",
};

export const overlayStyle: React.CSSProperties = {
	position: "fixed",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	background: "rgba(0,0,0,0.6)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	zIndex: 100,
};

export const dialogStyle: React.CSSProperties = {
	background: "#21252b",
	border: "1px solid #4b5263",
	borderRadius: 8,
	padding: 20,
	minWidth: 400,
	maxWidth: 600,
};

export const dialogTitleStyle: React.CSSProperties = {
	color: "#e5c07b",
	fontWeight: "bold",
	fontSize: 14,
	marginBottom: 12,
};

export const btnStyle: React.CSSProperties = {
	background: "#3e4451",
	color: "#abb2bf",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "6px 12px",
	cursor: "pointer",
	fontSize: 13,
	fontFamily: "inherit",
};

export const runBtnStyle: React.CSSProperties = {
	background: "#61afef",
	color: "#282c34",
	border: "none",
	borderRadius: 4,
	padding: "6px 16px",
	cursor: "pointer",
	fontSize: 13,
	fontWeight: "bold",
	fontFamily: "inherit",
};

export const cancelBtnStyle: React.CSSProperties = {
	background: "none",
	color: "#5c6370",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "4px 12px",
	cursor: "pointer",
	fontSize: 12,
	fontFamily: "inherit",
};

export const confirmBtnStyle: React.CSSProperties = {
	background: "#61afef",
	color: "#282c34",
	border: "none",
	borderRadius: 4,
	padding: "4px 12px",
	cursor: "pointer",
	fontSize: 12,
	fontWeight: "bold",
	fontFamily: "inherit",
};

export const linkStyle: React.CSSProperties = {
	background: "none",
	border: "none",
	color: "#5c6370",
	cursor: "pointer",
	fontSize: 12,
	fontFamily: "inherit",
	padding: 0,
};

export const chipStyle: React.CSSProperties = {
	background: "#2c313a",
	color: "#5c6370",
	border: "1px solid #4b5263",
	borderRadius: 12,
	padding: "2px 8px",
	cursor: "pointer",
	fontSize: 11,
	fontFamily: "inherit",
};

export const KIND_COLORS = {
	buff: "#98c379",
	debuff: "#e06c75",
	named: "#61afef",
} as const;
