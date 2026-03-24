/**
 * Parser Pipeline Visualizer — Per-Book Grammar Edition
 *
 * Shows one grammar (.ohm) at the center with three entry points.
 * Each entry point has: raw text → parse tree → effects.
 * Click any node to expand and see its content.
 */

import { useCallback, useState } from "react";
import { SourcePanel } from "./SourcePanel.tsx";
import type { PipelineResult, SourceType, ParseTreeNode } from "./types.ts";
import { T, panelStyle } from "./theme.ts";

// ── API ─────────────────────────────────────────────────

async function fetchParse(
	bookName: string,
	text: string,
	entryPoint: string,
): Promise<PipelineResult> {
	const res = await fetch("/api/parse", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sourceType: "skill", text, bookName, entryPoint }),
	});
	return res.json();
}

// ── Collapsible node ────────────────────────────────────

function Node({ label, status, children }: {
	label: string;
	status: "ok" | "error" | "empty" | "pending";
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const icon = status === "ok" ? "✓" : status === "error" ? "✗" : status === "empty" ? "—" : "○";
	const color = status === "ok" ? T.green : status === "error" ? T.red : T.textMuted;

	return (
		<div style={{ marginBottom: 2 }}>
			<div
				onClick={() => setOpen(!open)}
				style={{
					display: "flex", alignItems: "center", gap: 6,
					padding: "5px 10px", cursor: "pointer", userSelect: "none",
					background: open ? "rgba(255,215,0,0.03)" : "transparent",
					borderRadius: 4, fontSize: 12, fontFamily: T.mono,
				}}
			>
				<span style={{ color, fontWeight: 600 }}>{icon}</span>
				<span style={{ color: T.text }}>{label}</span>
				<span style={{ marginLeft: "auto", color: T.textMuted, fontSize: 10 }}>{open ? "▾" : "▸"}</span>
			</div>
			{open && (
				<div style={{ padding: "6px 10px 10px 26px", maxHeight: 350, overflow: "auto" }}>
					{children}
				</div>
			)}
		</div>
	);
}

// ── Tree renderer ───────────────────────────────────────

function TreeView({ node, depth = 0 }: { node: ParseTreeNode | ParseTreeNode[]; depth?: number }) {
	if (Array.isArray(node)) return <>{node.map((n, i) => <TreeView key={i} node={n} depth={depth} />)}</>;
	if (node.text && !node.children) {
		if (node.rule === "_terminal" && node.text.length <= 1) return null;
		return (
			<div style={{ paddingLeft: depth * 14, fontFamily: T.mono, fontSize: 11, lineHeight: 1.6 }}>
				<span style={{ color: T.textMuted }}>{node.rule}: </span>
				<span style={{ color: T.green }}>"{node.text}"</span>
			</div>
		);
	}
	return (
		<div>
			<div style={{ paddingLeft: depth * 14, fontFamily: T.mono, fontSize: 11, lineHeight: 1.6 }}>
				<span style={{ color: T.sp, fontWeight: 600 }}>{node.rule}</span>
			</div>
			{node.children?.map((child, i) => <TreeView key={i} node={child as ParseTreeNode} depth={depth + 1} />)}
		</div>
	);
}

function Code({ code }: { code: string }) {
	return <pre style={{ margin: 0, fontFamily: T.mono, fontSize: 11, lineHeight: 1.5, color: T.text, whiteSpace: "pre-wrap" }}>{code}</pre>;
}

// ── Entry point flow ────────────────────────────────────

function EntryFlow({ name, result }: { name: string; result: PipelineResult | null }) {
	if (!result) return (
		<div style={{ padding: "4px 10px", fontSize: 11, color: T.textMuted, fontFamily: T.mono }}>
			{name}: no input
		</div>
	);

	const hasEffects = result.effects && result.effects.length > 0;

	return (
		<div style={{ ...panelStyle, padding: 0, marginBottom: 6 }}>
			<div style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
				<span style={{ color: T.goldLight, fontFamily: T.heading, fontSize: 12 }}>{name}</span>
				{result.errors.length > 0 && <span style={{ color: T.red, fontSize: 10, fontFamily: T.mono }}>{result.errors[0]}</span>}
			</div>
			<Node label="raw text" status="ok">
				<Code code={result.rawText ?? ""} />
			</Node>
			<Node label="parse tree" status={result.parseTree ? "ok" : "error"}>
				{result.parseTree ? <TreeView node={result.parseTree} /> : <span style={{ color: T.red, fontSize: 11 }}>failed</span>}
			</Node>
			<Node label="Effect[]" status={hasEffects ? "ok" : "error"}>
				<Code code={JSON.stringify(result.effects, null, 2)} />
			</Node>
		</div>
	);
}

// ── Main App ────────────────────────────────────────────

export function App() {
	const [bookName, setBookName] = useState("");
	const [skillResult, setSkillResult] = useState<PipelineResult | null>(null);
	const [affixResult, setAffixResult] = useState<PipelineResult | null>(null);
	const [ohmSource, setOhmSource] = useState("");

	const handleParse = useCallback(
		(sourceType: SourceType, text: string, bName?: string, affixText?: string) => {
			const name = bName ?? "";
			setBookName(name);

			if (sourceType === "skill") {
				// Book: grammar has 3 entry points
				fetch(`/api/ohm?book=${encodeURIComponent(name)}`).then(r => r.json()).then(d => setOhmSource(d.content ?? ""));
				fetchParse(name, text, "skillDescription").then(setSkillResult);
				if (affixText) {
					fetchParse(name, affixText, "primaryAffix").then(setAffixResult);
				} else {
					setAffixResult(null);
				}
			} else if (sourceType === "exclusive") {
				// Exclusive affix: use book grammar's exclusiveAffix entry point
				fetch(`/api/ohm?book=${encodeURIComponent(name)}`).then(r => r.json()).then(d => setOhmSource(d.content ?? ""));
				fetchParse(name, text, "exclusiveAffix").then(setSkillResult);
				setAffixResult(null);
			} else {
				// School/universal affixes: use affix-specific grammars
				// These use affixDescription entry point and their own grammar names
				setOhmSource("(shared affix grammar)");
				setSkillResult(null);
				setAffixResult(null);
			}
		},
		[],
	);

	return (
		<div style={appContainer}>
			<style>{globalCSS}</style>
			<h1 style={titleStyle}>Parser Pipeline Visualizer</h1>

			<div style={layoutStyle}>
				<SourcePanel onParse={handleParse} />

				{bookName ? (
					<div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
						{/* Grammar at the center */}
						<div style={{ ...panelStyle, padding: 0 }}>
							<Node label={`${bookName}.ohm — grammar (3 entry points)`} status="ok">
								<Code code={ohmSource} />
							</Node>
						</div>

						{/* Flows through the grammar */}
						{skillResult && <EntryFlow name="skillDescription" result={skillResult} />}
						{affixResult && <EntryFlow name="primaryAffix" result={affixResult} />}
					</div>
				) : (
					<div style={{ ...panelStyle, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
						<div style={{ color: T.textMuted, fontFamily: T.heading, fontSize: 14 }}>Select a book</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ── Styles ──────────────────────────────────────────────

const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { overflow: hidden; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #5c403388; border-radius: 3px; }
`;

const appContainer: React.CSSProperties = {
	height: "100vh", width: "100vw",
	background: `radial-gradient(ellipse at center, #1a1510 0%, #0d0d0d 70%)`,
	display: "flex", flexDirection: "column", padding: 16, gap: 10, overflow: "hidden",
};

const titleStyle: React.CSSProperties = {
	fontFamily: T.heading, fontSize: 18, color: T.goldLight,
	textShadow: `0 0 10px ${T.goldDark}88, 2px 2px 4px #000`, margin: 0, flexShrink: 0,
};

const layoutStyle: React.CSSProperties = {
	flex: 1, display: "flex", gap: 12, overflow: "hidden",
};
