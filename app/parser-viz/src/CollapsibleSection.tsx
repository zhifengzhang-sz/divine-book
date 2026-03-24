/** Generic collapsible panel — click header to expand/collapse. */

import { useState } from "react";
import { T } from "./theme.ts";

export function CollapsibleSection({ title, badge, defaultOpen = false, children }: {
	title: string;
	badge?: string;
	defaultOpen?: boolean;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div style={{ border: `1px solid ${T.border}`, borderRadius: 6, marginBottom: 6, background: T.panel }}>
			<div
				onClick={() => setOpen(!open)}
				style={{
					display: "flex", alignItems: "center", gap: 8,
					padding: "6px 12px", cursor: "pointer", userSelect: "none",
				}}
			>
				<span style={{ color: T.muted, fontSize: 10 }}>{open ? "▾" : "▸"}</span>
				<span style={{ color: T.gold, fontFamily: T.heading, fontSize: 12 }}>{title}</span>
				{badge && <span style={{ color: T.green, fontSize: 10, fontFamily: T.mono }}>{badge}</span>}
			</div>
			{open && (
				<div style={{ padding: "8px 12px", borderTop: `1px solid ${T.border}33`, maxHeight: 400, overflow: "auto" }}>
					{children}
				</div>
			)}
		</div>
	);
}
