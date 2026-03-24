import { T } from "./theme.ts";

export function EffectsView({ effects }: { effects: object[] }) {
	if (!effects.length) return <span style={{ color: T.muted, fontSize: 10.5 }}>—</span>;
	return (
		<div style={{ fontFamily: T.mono, fontSize: 10.5, lineHeight: 1.4 }}>
			{effects.map((eff, i) => {
				const e = eff as Record<string, unknown>;
				return (
					<div key={i} style={{ padding: "3px 6px", background: "#0c0c0c", borderRadius: T.radius, marginBottom: 3 }}>
						<span style={{ color: T.gold }}>{String(e.type)}</span>
						{Object.entries(e).filter(([k]) => k !== "type").map(([k, v]) => (
							<span key={k} style={{ marginLeft: 8 }}>
								<span style={{ color: T.muted }}>{k}:</span>{" "}
								<span style={{ color: T.text }}>{JSON.stringify(v)}</span>
							</span>
						))}
					</div>
				);
			})}
		</div>
	);
}
