/** Renders Effect[] as formatted JSON with type highlighting. */

import { T } from "./theme.ts";

export function EffectsView({ effects }: { effects: object[] }) {
	if (effects.length === 0) return <span style={{ color: T.muted, fontSize: 11 }}>no effects</span>;

	return (
		<div style={{ fontFamily: T.mono, fontSize: 11, lineHeight: 1.5 }}>
			{effects.map((eff, i) => {
				const e = eff as Record<string, unknown>;
				return (
					<div key={i} style={{ marginBottom: 6, padding: "4px 8px", background: "#111", borderRadius: 4 }}>
						<span style={{ color: T.gold, fontWeight: 600 }}>{String(e.type)}</span>
						{Object.entries(e).filter(([k]) => k !== "type").map(([k, v]) => (
							<span key={k} style={{ marginLeft: 10, color: T.muted }}>
								{k}: <span style={{ color: T.text }}>{JSON.stringify(v)}</span>
							</span>
						))}
					</div>
				);
			})}
		</div>
	);
}
