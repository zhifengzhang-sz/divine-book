/**
 * Shared UI primitives — sci-fi game aesthetic.
 */

// ── Theme ───────────────────────────────────────────────────────────

const T = {
	bg: "#0a0e17",
	panel: "#0f1724",
	panelBorder: "#1a2744",
	surface: "#111b2e",
	surfaceBorder: "#1e3054",
	accent: "#00d4ff",
	accentDim: "#0088aa",
	gold: "#ffd700",
	purple: "#a855f7",
	green: "#00ff88",
	red: "#ff4455",
	text: "#c8d6e5",
	textMuted: "#4a6078",
	glow: (color: string, spread = 8) =>
		`0 0 ${spread}px ${color}44, inset 0 0 ${spread}px ${color}11`,
};

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

// ── Bar (with gradient fill + glow) ────────────────────────────────

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
		<div style={{ marginBottom: 6 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: 11,
					color: T.text,
					marginBottom: 2,
				}}
			>
				<span style={{ textTransform: "uppercase", letterSpacing: 1 }}>
					{label}
				</span>
				<span style={{ fontVariantNumeric: "tabular-nums" }}>
					{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
					/ {max.toLocaleString()}
				</span>
			</div>
			<div
				style={{
					height: 22,
					background: T.surface,
					borderRadius: 3,
					overflow: "hidden",
					border: `1px solid ${T.surfaceBorder}`,
					boxShadow: pct > 0 ? `inset 0 0 12px ${color}22` : "none",
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: "100%",
						background: `linear-gradient(90deg, ${color}cc, ${color})`,
						boxShadow: `0 0 12px ${color}66`,
						transition: "width 0.15s ease",
						borderRadius: 2,
					}}
				/>
			</div>
		</div>
	);
}

// ── Styles ──────────────────────────────────────────────────────────

export const labelStyle: React.CSSProperties = {
	fontSize: 11,
	color: T.textMuted,
	textTransform: "uppercase",
	letterSpacing: 0.5,
};

export const selectStyle: React.CSSProperties = {
	display: "block",
	width: "100%",
	background: T.surface,
	color: T.text,
	border: `1px solid ${T.surfaceBorder}`,
	borderRadius: 4,
	padding: "6px 8px",
	fontSize: 13,
	fontFamily: "inherit",
	outline: "none",
};

export const inputStyle: React.CSSProperties = {
	background: T.surface,
	color: T.accent,
	border: `1px solid ${T.surfaceBorder}`,
	borderRadius: 4,
	padding: "4px 6px",
	fontSize: 12,
	fontFamily: "inherit",
	fontVariantNumeric: "tabular-nums",
	outline: "none",
};

export const pillStyle: React.CSSProperties = {
	background: T.surface,
	color: T.accent,
	border: `1px solid ${T.accentDim}55`,
	borderRadius: 4,
	padding: "4px 10px",
	fontSize: 12,
	fontFamily: "inherit",
	cursor: "pointer",
	textAlign: "left",
	boxShadow: T.glow(T.accent, 4),
	transition: "box-shadow 0.2s, border-color 0.2s",
};

export const panelStyle: React.CSSProperties = {
	flex: 1,
	padding: 14,
	background: T.panel,
	borderRadius: 8,
	border: `1px solid ${T.panelBorder}`,
	boxShadow: T.glow(T.accent, 6),
};

export const overlayStyle: React.CSSProperties = {
	position: "fixed",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	background: "rgba(4, 8, 16, 0.85)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	zIndex: 100,
	backdropFilter: "blur(4px)",
};

export const dialogStyle: React.CSSProperties = {
	background: T.panel,
	border: `1px solid ${T.accentDim}66`,
	borderRadius: 10,
	padding: 24,
	minWidth: 420,
	maxWidth: 640,
	boxShadow: `0 0 30px ${T.accent}22, 0 0 60px ${T.bg}`,
};

export const dialogTitleStyle: React.CSSProperties = {
	color: T.gold,
	fontWeight: "bold",
	fontSize: 15,
	marginBottom: 14,
	textTransform: "uppercase",
	letterSpacing: 1.5,
	borderBottom: `1px solid ${T.gold}33`,
	paddingBottom: 8,
};

export const btnStyle: React.CSSProperties = {
	background: T.surface,
	color: T.text,
	border: `1px solid ${T.surfaceBorder}`,
	borderRadius: 4,
	padding: "6px 14px",
	cursor: "pointer",
	fontSize: 13,
	fontFamily: "inherit",
	transition: "background 0.2s, border-color 0.2s",
};

export const runBtnStyle: React.CSSProperties = {
	background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`,
	color: T.bg,
	border: "none",
	borderRadius: 4,
	padding: "8px 20px",
	cursor: "pointer",
	fontSize: 13,
	fontWeight: "bold",
	fontFamily: "inherit",
	letterSpacing: 1,
	textTransform: "uppercase",
	boxShadow: `0 0 16px ${T.accent}44`,
	transition: "box-shadow 0.2s",
};

export const cancelBtnStyle: React.CSSProperties = {
	background: "none",
	color: T.textMuted,
	border: `1px solid ${T.surfaceBorder}`,
	borderRadius: 4,
	padding: "5px 14px",
	cursor: "pointer",
	fontSize: 12,
	fontFamily: "inherit",
};

export const confirmBtnStyle: React.CSSProperties = {
	background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`,
	color: T.bg,
	border: "none",
	borderRadius: 4,
	padding: "5px 14px",
	cursor: "pointer",
	fontSize: 12,
	fontWeight: "bold",
	fontFamily: "inherit",
	letterSpacing: 0.5,
	boxShadow: `0 0 8px ${T.accent}44`,
};

export const linkStyle: React.CSSProperties = {
	background: "none",
	border: "none",
	color: T.accentDim,
	cursor: "pointer",
	fontSize: 12,
	fontFamily: "inherit",
	padding: 0,
};

export const chipStyle: React.CSSProperties = {
	background: T.surface,
	color: T.textMuted,
	border: `1px solid ${T.surfaceBorder}`,
	borderRadius: 12,
	padding: "2px 10px",
	cursor: "pointer",
	fontSize: 11,
	fontFamily: "inherit",
	transition: "background 0.15s, color 0.15s",
};

export const KIND_COLORS = {
	buff: T.green,
	debuff: T.red,
	named: T.accent,
} as const;

// Export theme for use by App.tsx
export { T as theme };
