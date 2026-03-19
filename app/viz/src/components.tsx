/**
 * Shared UI primitives — Obsidian Grimoire dark fantasy theme.
 */

// ── Theme ───────────────────────────────────────────────────────────

const T = {
	goldDark: "#b8860b",
	goldLight: "#ffd700",
	border: "#5c4033",
	bgDark: "rgba(0, 0, 0, 0.85)",
	bgPanel: "#1a1a1a",
	text: "#e0e0e0",
	textMuted: "#888",
	hp: "#e74c3c",
	hpDark: "#c0392b",
	sp: "#3498db",
	spDark: "#2980b9",
	shield: "#9b59b6",
	shieldDark: "#8e44ad",
	green: "#2ecc71",
	red: "#e74c3c",
	heading: "'Cinzel', serif",
	headingCn: "'ZCOOL XiaoWei', 'Cinzel', serif",
	body: "'Menlo', 'Fira Code', monospace",
	glow: (color: string, size = 10) => `0 0 ${size}px ${color}88`,
};

// ── Assets ──────────────────────────────────────────────────────────

const ASSETS = {
	panelBg: "/assets/ui_panel_bg.png.webp",
	fantasyBg: "/assets/fantasy_bg.png.webp",
	healthOrb: "/assets/health_orb.png.webp",
	manaOrb: "/assets/mana_orb.png.webp",
	sliderHandle: "/assets/slider_handle.png.webp",
	ornateBorder: "/assets/ornate_border.png.webp",
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

// ── Pill (RPG button style) ─────────────────────────────────────────

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
			<button
				type="button"
				onClick={onClick}
				className="rpg-pill"
				style={{ fontFamily: T.body }}
			>
				{value || "(none)"}
			</button>
		</div>
	);
}

// ── Bar (RPG-style with orb icon + gradient + shine) ────────────────

/** Map bar color to an orb icon */
function getOrbIcon(color: string): string | null {
	if (color === T.hp) return ASSETS.healthOrb;
	if (color === T.sp) return ASSETS.manaOrb;
	return null;
}

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
	const darkColor = `color-mix(in srgb, ${color} 70%, black)`;
	const orb = getOrbIcon(color);

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
			{/* Orb icon */}
			{orb ? (
				<div style={orbContainer}>
					<img
						src={orb}
						alt={label}
						style={{ maxWidth: "100%", maxHeight: "100%" }}
					/>
				</div>
			) : (
				<div style={orbPlaceholder}>
					<span style={{ fontSize: 10, color }}>{label.split(" ")[0]}</span>
				</div>
			)}

			{/* Bar */}
			<div style={{ flex: 1 }}>
				<div style={barHeader}>
					<span>{label}</span>
					<span style={{ fontVariantNumeric: "tabular-nums" }}>
						{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
						/ {max.toLocaleString()}
					</span>
				</div>
				<div style={barTrack}>
					<div
						style={{
							height: "100%",
							width: `${pct}%`,
							background: `linear-gradient(180deg, ${color}, ${darkColor})`,
							boxShadow: T.glow(color),
							transition: "width 0.3s ease-out",
							borderRadius: "8px 0 0 8px",
						}}
					/>
					{/* Shine overlay */}
					<div style={barShine} />
				</div>
			</div>
		</div>
	);
}

// ── Divider (gold gradient) ─────────────────────────────────────────

export function Divider() {
	return <div style={dividerStyle} />;
}

// ── Styles ──────────────────────────────────────────────────────────

const orbContainer: React.CSSProperties = {
	width: 36,
	height: 36,
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	filter: "drop-shadow(0 0 5px rgba(255,255,255,0.3))",
	flexShrink: 0,
};

const orbPlaceholder: React.CSSProperties = {
	width: 36,
	height: 36,
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	border: `2px solid ${T.shieldDark}`,
	borderRadius: "50%",
	background: "rgba(0,0,0,0.5)",
	boxShadow: T.glow(T.shieldDark, 6),
	flexShrink: 0,
};

export const labelStyle: React.CSSProperties = {
	fontSize: 11,
	color: T.textMuted,
	textShadow: "1px 1px 2px black",
};

export const selectStyle: React.CSSProperties = {
	display: "block",
	width: "100%",
	background: "#111",
	color: T.text,
	border: "1px solid #444",
	borderRadius: 4,
	padding: "6px 8px",
	fontSize: 13,
	fontFamily: T.body,
	boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)",
	outline: "none",
};

export const inputStyle: React.CSSProperties = {
	background: "#111",
	color: T.goldLight,
	border: "1px solid #444",
	borderRadius: 4,
	padding: "4px 6px",
	fontSize: 12,
	fontFamily: T.body,
	fontVariantNumeric: "tabular-nums",
	boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)",
	outline: "none",
};

export const pillStyle: React.CSSProperties = {
	background: "linear-gradient(180deg, #444, #222)",
	color: T.goldLight,
	border: `2px solid ${T.border}`,
	borderRadius: 5,
	padding: "4px 10px",
	fontSize: 12,
	fontFamily: T.body,
	cursor: "pointer",
	textAlign: "left",
	boxShadow: "0 3px 0 #111",
	textShadow: "1px 1px 2px black",
	transition: "border-color 0.2s, box-shadow 0.2s",
};

export const panelStyle: React.CSSProperties = {
	flex: 1,
	padding: 16,
	backgroundImage: `url('${ASSETS.panelBg}')`,
	backgroundSize: "500px",
	backgroundColor: T.bgPanel,
	borderRadius: 12,
	boxShadow: `
		0 0 0 3px #2c3e50,
		0 0 0 5px ${T.goldDark},
		0 0 20px rgba(0,0,0,0.8),
		inset 0 0 40px rgba(0,0,0,0.7)
	`,
};

export const overlayStyle: React.CSSProperties = {
	position: "fixed",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	background: "rgba(0, 0, 0, 0.8)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	zIndex: 100,
	backdropFilter: "blur(3px)",
};

export const dialogStyle: React.CSSProperties = {
	backgroundImage: `url('${ASSETS.panelBg}')`,
	backgroundSize: "500px",
	backgroundColor: T.bgPanel,
	border: "2px solid rgba(255, 215, 0, 0.2)",
	borderRadius: 12,
	padding: 24,
	minWidth: 420,
	maxWidth: 640,
	boxShadow: `
		0 0 0 3px #2c3e50,
		0 0 0 5px ${T.goldDark},
		0 0 30px rgba(0,0,0,0.9),
		inset 0 0 50px rgba(0,0,0,0.8)
	`,
};

export const dialogTitleStyle: React.CSSProperties = {
	fontFamily: T.heading,
	color: T.goldLight,
	fontWeight: "bold",
	fontSize: 16,
	marginBottom: 14,
	textShadow: "2px 2px 4px #000",
	borderBottom: `2px solid ${T.goldDark}`,
	paddingBottom: 8,
	display: "inline-block",
};

const barHeader: React.CSSProperties = {
	display: "flex",
	justifyContent: "space-between",
	marginBottom: 3,
	fontSize: 11,
	color: "#ccc",
	textShadow: "1px 1px 2px black",
};

const barTrack: React.CSSProperties = {
	height: 20,
	background: "#111",
	border: "2px solid #444",
	borderRadius: 10,
	position: "relative",
	overflow: "hidden",
	boxShadow: "inset 0 2px 5px rgba(0,0,0,0.8)",
};

const barShine: React.CSSProperties = {
	position: "absolute",
	top: 0,
	left: 0,
	width: "100%",
	height: "50%",
	background: "linear-gradient(180deg, rgba(255,255,255,0.2), transparent)",
	pointerEvents: "none",
	borderRadius: "inherit",
};

// Button styles use CSS classes from rpg-buttons.css for :hover/:active states.
// These are kept as thin wrappers for backward compat with components that use style props.
export const btnStyle = "rpg-btn";
export const runBtnStyle = "rpg-btn rpg-btn-primary";
export const cancelBtnStyle = "rpg-btn rpg-btn-cancel";
export const confirmBtnStyle = "rpg-btn rpg-btn-primary";
export const linkStyle = "rpg-link";

export const chipStyle: React.CSSProperties = {
	background: "#222",
	color: T.textMuted,
	border: "1px solid #444",
	borderRadius: 12,
	padding: "2px 10px",
	cursor: "pointer",
	fontSize: 11,
	fontFamily: T.body,
	boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
	transition: "background 0.15s, color 0.15s, border-color 0.15s",
};

export const dividerStyle: React.CSSProperties = {
	height: 1,
	background: `linear-gradient(90deg, transparent, ${T.goldDark}, transparent)`,
	margin: "16px 0",
	opacity: 0.5,
	border: "none",
};

export const KIND_COLORS = {
	buff: T.green,
	debuff: T.red,
	named: T.sp,
} as const;

export { ASSETS, T as theme };
