import { T } from "./theme.ts";

export function EffectsPreview({ effects, label, dim }: { effects: object[]; label?: string; dim?: boolean }) {
	return (
		<div style={{ opacity: dim ? 0.45 : 1, transition: "opacity 0.2s" }}>
			{label && (
				<div style={{
					color: dim ? T.muted : T.mutedLight,
					fontSize: 10,
					fontFamily: T.body,
					fontWeight: 500,
					marginBottom: 4,
					letterSpacing: 0.5,
					textTransform: "uppercase",
				}}>
					{label} ({effects.length})
				</div>
			)}
			{!effects.length ? (
				<div style={{
					color: T.muted,
					fontSize: 11,
					fontFamily: T.mono,
					padding: "8px 12px",
					background: "rgba(0, 0, 0, 0.15)",
					borderRadius: T.r,
					border: `1px dashed ${T.border}`,
					textAlign: "center",
				}}>
					No effects
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
					{effects.map((eff, i) => {
						const e = eff as Record<string, unknown>;
						return (
							<div
								key={i}
								className="rpg-effect-row"
								style={{
									fontFamily: T.mono,
									fontSize: 11,
									lineHeight: 1.5,
									display: "flex",
									flexWrap: "wrap",
									alignItems: "baseline",
									gap: "2px 0",
								}}
							>
								<span style={{ color: T.goldBright, fontWeight: 500, marginRight: 10 }}>
									{String(e.type)}
								</span>
								{Object.entries(e)
									.filter(([k]) => k !== "type")
									.map(([k, v]) => (
										<span key={k} style={{ marginRight: 10 }}>
											<span style={{ color: T.muted }}>{k}</span>
											<span style={{ color: T.mutedLight, margin: "0 2px" }}>=</span>
											<span style={{ color: typeof v === "number" ? T.cyan : T.text }}>
												{JSON.stringify(v)}
											</span>
										</span>
									))}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
