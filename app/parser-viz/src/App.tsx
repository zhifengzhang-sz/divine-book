/**
 * Parser Pipeline Visualizer — Per-Book Grammar Edition
 *
 * Vertical workflow: each step is a collapsible panel.
 * Click the header to expand/collapse and see the content.
 */

import { useCallback, useState } from "react";
import { SourcePanel } from "./SourcePanel.tsx";
import type { PipelineResult, SourceType, ParseTreeNode } from "./types.ts";
import { T, panelStyle } from "./theme.ts";

async function fetchPipeline(
	sourceType: SourceType,
	text: string,
	bookName?: string,
): Promise<PipelineResult> {
	const res = await fetch("/api/parse", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sourceType, text, bookName }),
	});
	return res.json();
}

// ── Collapsible step ────────────────────────────────────

function Step({ n, title, status, children }: {
	n: number;
	title: string;
	status: "ok" | "error" | "pending";
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const icon = status === "ok" ? "✓" : status === "error" ? "✗" : "○";
	const color = status === "ok" ? T.green : status === "error" ? T.red : T.textMuted;

	return (
		<div style={{ ...panelStyle, marginBottom: 6, padding: 0, overflow: "hidden" }}>
			<div
				onClick={() => setOpen(!open)}
				style={{
					display: "flex", alignItems: "center", gap: 8,
					padding: "8px 14px", cursor: "pointer", userSelect: "none",
					borderBottom: open ? `1px solid ${T.border}` : "none",
				}}
			>
				<span style={{ color, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{icon}</span>
				<span style={{ color: T.goldLight, fontFamily: T.heading, fontSize: 13 }}>
					Step {n}: {title}
				</span>
				<span style={{ marginLeft: "auto", color: T.textMuted, fontSize: 11 }}>
					{open ? "▾" : "▸"}
				</span>
			</div>
			{open && (
				<div style={{ padding: "10px 14px", maxHeight: 400, overflow: "auto" }}>
					{children}
				</div>
			)}
		</div>
	);
}

// ── Parse tree renderer ─────────────────────────────────

function TreeNode({ node, depth = 0 }: { node: ParseTreeNode | ParseTreeNode[]; depth?: number }) {
	if (Array.isArray(node)) {
		return <>{node.map((n, i) => <TreeNode key={i} node={n} depth={depth} />)}</>;
	}
	const indent = depth * 14;
	if (node.text && !node.children) {
		if (node.rule === "_terminal" && node.text.length <= 1) return null;
		return (
			<div style={{ paddingLeft: indent, fontFamily: T.mono, fontSize: 11, lineHeight: 1.6 }}>
				<span style={{ color: T.textMuted }}>{node.rule}: </span>
				<span style={{ color: T.green }}>"{node.text}"</span>
			</div>
		);
	}
	return (
		<div>
			<div style={{ paddingLeft: indent, fontFamily: T.mono, fontSize: 11, lineHeight: 1.6 }}>
				<span style={{ color: T.sp, fontWeight: 600 }}>{node.rule}</span>
			</div>
			{node.children?.map((child, i) => (
				<TreeNode key={i} node={child as ParseTreeNode} depth={depth + 1} />
			))}
		</div>
	);
}

// ── Code block ──────────────────────────────────────────

function Code({ code }: { code: string }) {
	return (
		<pre style={{
			margin: 0, padding: 0, background: "transparent",
			fontFamily: T.mono, fontSize: 11, lineHeight: 1.5,
			color: T.text, whiteSpace: "pre-wrap", wordBreak: "break-all",
		}}>
			{code}
		</pre>
	);
}

// ── Main App ────────────────────────────────────────────

export function App() {
	const [result, setResult] = useState<PipelineResult | null>(null);

	const handleParse = useCallback(
		(sourceType: SourceType, text: string, bookName?: string) => {
			fetchPipeline(sourceType, text, bookName).then(setResult);
		},
		[],
	);

	return (
		<div style={appContainer}>
			<style>{globalCSS}</style>

			<h1 style={titleStyle}>Parser Pipeline Visualizer</h1>

			<div style={layoutStyle}>
				{/* Left: Source panel */}
				<SourcePanel onParse={handleParse} />

				{/* Right: Vertical workflow */}
				{result ? (
					<div style={workflowArea}>
						{/* Errors */}
						{result.errors.length > 0 && (
							<div style={errorBox}>
								{result.errors.map((e, i) => <div key={i}>{e}</div>)}
							</div>
						)}

						{/* Step 1: Raw text */}
						<Step n={1} title="Raw Text" status="ok">
							<Code code={result.rawText ?? "(no raw text)"} />
						</Step>

						{/* Step 2: Grammar (.ohm) */}
						<Step n={2} title="Grammar (.ohm)" status={result.ohmSource ? "ok" : "pending"}>
							<Code code={result.ohmSource ?? "// not available"} />
						</Step>

						{/* Step 3: Parse Tree */}
						<Step n={3} title="Parse Tree" status={result.parseTree ? "ok" : "error"}>
							{result.parseTree ? (
								<TreeNode node={result.parseTree} />
							) : (
								<div style={{ color: T.red, fontFamily: T.mono, fontSize: 11 }}>
									Parse failed — no tree produced
								</div>
							)}
						</Step>

						{/* Step 4: Semantics (.ts) */}
						<Step n={4} title="Semantics (.ts)" status={result.semanticsSource ? "ok" : "pending"}>
							<Code code={result.semanticsSource ?? "// not available"} />
						</Step>

						{/* Step 5: Effects */}
						<Step n={5} title="Effects → Effect[]" status={result.effects?.length > 0 ? "ok" : "error"}>
							<Code code={JSON.stringify(result.effects, null, 2)} />
						</Step>
					</div>
				) : (
					<div style={{ ...panelStyle, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
						<div style={{ color: T.textMuted, fontFamily: T.heading, fontSize: 14 }}>
							Select a book and click Parse
						</div>
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
::-webkit-scrollbar-thumb:hover { background: #b8860b44; }
`;

const appContainer: React.CSSProperties = {
	height: "100vh",
	width: "100vw",
	background: `radial-gradient(ellipse at center, #1a1510 0%, #0d0d0d 70%)`,
	display: "flex",
	flexDirection: "column",
	padding: 16,
	gap: 10,
	overflow: "hidden",
};

const titleStyle: React.CSSProperties = {
	fontFamily: T.heading,
	fontSize: 18,
	color: T.goldLight,
	textShadow: `0 0 10px ${T.goldDark}88, 2px 2px 4px #000`,
	margin: 0,
	flexShrink: 0,
};

const layoutStyle: React.CSSProperties = {
	flex: 1,
	display: "flex",
	gap: 12,
	overflow: "hidden",
};

const workflowArea: React.CSSProperties = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	overflow: "auto",
	minWidth: 0,
};

const errorBox: React.CSSProperties = {
	background: "rgba(231,76,60,0.1)",
	border: `1px solid ${T.red}44`,
	borderRadius: 4,
	padding: "4px 10px",
	fontSize: 11,
	color: T.red,
	fontFamily: T.body,
	marginBottom: 6,
};
