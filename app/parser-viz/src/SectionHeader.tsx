import { T } from "./theme.ts";

const sel: React.CSSProperties = {
	background: T.panel, color: T.text, border: `1px solid ${T.border}`,
	borderRadius: T.r, padding: "3px 6px", fontSize: 11, fontFamily: T.mono, outline: "none",
};

export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
	return <div style={{
		display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
		background: T.panelHi, borderRadius: T.r, marginBottom: 8,
		borderBottom: `1px solid ${T.borderHi}`,
	}}>
		<span style={{ color: T.goldBright, fontFamily: T.heading, fontSize: 13, minWidth: 100 }}>{title}</span>
		{children}
	</div>;
}

export function Select({ value, onChange, options }: {
	value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
	return <select value={value} onChange={e => onChange(e.target.value)} style={sel}>
		{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
	</select>;
}

export function TierBadges({ tiers }: { tiers: string[] }) {
	if (!tiers.length) return null;
	return <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
		{tiers.map((t, i) => <span key={i} style={{ color: T.muted, fontSize: 9, fontFamily: T.mono, background: T.panel, padding: "1px 4px", borderRadius: 2 }}>{t}</span>)}
	</div>;
}
