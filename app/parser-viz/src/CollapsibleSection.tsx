import { useState } from "react";
import { T } from "./theme.ts";

export function CollapsibleSection({ title, badge, status, open: defaultOpen = false, children }: {
	title: string; badge?: string; status?: "ok" | "err"; open?: boolean; children: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div style={{ marginBottom: 3 }}>
			<div onClick={() => setOpen(!open)} style={{
				display: "flex", alignItems: "center", gap: 6, padding: "3px 8px",
				cursor: "pointer", userSelect: "none", borderRadius: T.r,
				background: open ? T.panelHi : "transparent", fontSize: 11,
			}}>
				<span style={{ color: T.muted, fontSize: 8 }}>{open ? "▾" : "▸"}</span>
				{status && <span style={{ color: status === "ok" ? T.green : T.red, fontSize: 9 }}>{status === "ok" ? "✓" : "✗"}</span>}
				<span style={{ color: T.text, fontFamily: T.mono }}>{title}</span>
				{badge && <span style={{ color: T.muted, fontSize: 9, marginLeft: "auto" }}>{badge}</span>}
			</div>
			{open && <div style={{ padding: "4px 8px 6px 20px", maxHeight: 350, overflow: "auto" }}>{children}</div>}
		</div>
	);
}
