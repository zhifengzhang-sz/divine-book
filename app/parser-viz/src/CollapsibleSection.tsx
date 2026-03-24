import { useState } from "react";
import { T } from "./theme.ts";

export function CollapsibleSection({ title, badge, status, defaultOpen = false, children }: {
	title: string;
	badge?: string;
	status?: "ok" | "error" | "none";
	defaultOpen?: boolean;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const statusColor = status === "ok" ? T.green : status === "error" ? T.red : T.muted;

	return (
		<div style={{ marginBottom: 4 }}>
			<div
				onClick={() => setOpen(!open)}
				style={{
					display: "flex", alignItems: "center", gap: 6,
					padding: "4px 8px", cursor: "pointer", userSelect: "none",
					borderRadius: T.radius, fontSize: 11,
					background: open ? T.panelHover : "transparent",
				}}
			>
				<span style={{ color: T.muted, fontSize: 9, width: 8 }}>{open ? "▾" : "▸"}</span>
				{status && <span style={{ color: statusColor, fontSize: 10 }}>{status === "ok" ? "✓" : status === "error" ? "✗" : "·"}</span>}
				<span style={{ color: T.text, fontFamily: T.mono, fontSize: 11 }}>{title}</span>
				{badge && <span style={{ color: T.muted, fontSize: 9, marginLeft: "auto" }}>{badge}</span>}
			</div>
			{open && (
				<div style={{ padding: "4px 8px 8px 22px", maxHeight: 350, overflow: "auto" }}>
					{children}
				</div>
			)}
		</div>
	);
}
