/**
 * Parser Pipeline Visualizer — Per-Book Grammar Edition
 *
 * Keeps the original Obsidian Grimoire layout (left source panel + right pipeline)
 * but shows the new grammar pipeline: raw text → .ohm → parse tree → effects.
 */

import { useCallback, useState } from "react";
import { EffectView } from "./EffectView.tsx";
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

// ── Parse Tree component ────────────────────────────────

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

			{/* Main layout: source panel + pipeline area */}
			<div style={layoutStyle}>
				{/* Left: Source panel */}
				<SourcePanel
					onParse={handleParse}
					ohmSource={result?.ohmSource}
					semanticsSource={result?.semanticsSource}
				/>

				{/* Right: Grammar pipeline */}
				{result ? (
					<div style={pipelineArea}>
						{/* Errors */}
						{result.errors.length > 0 && (
							<div style={errorBox}>
								{result.errors.map((e, i) => (
									<div key={i}>{e}</div>
								))}
							</div>
						)}

						{/* Two columns: parse tree + effects */}
						<div style={columnsRow}>
							{/* Left: Parse tree */}
							<div style={columnStyle}>
								<div style={{ ...panelStyle, flex: 1, overflow: "auto" }}>
									<div style={sectionTitle}>
										Parse Tree
										{result.parseTree ? (
											<span style={{ color: T.green, fontSize: 10, marginLeft: 8 }}>✓ matched</span>
										) : (
											<span style={{ color: T.red, fontSize: 10, marginLeft: 8 }}>✗ failed</span>
										)}
									</div>
									{result.parseTree ? (
										<TreeNode node={result.parseTree} />
									) : (
										<div style={{ color: T.textMuted, fontSize: 11, fontFamily: T.mono }}>
											No parse tree (grammar match failed)
										</div>
									)}
								</div>
							</div>

							{/* Right: Effects */}
							<div style={{ ...columnStyle, flex: 1.2 }}>
								<div style={{ ...panelStyle, flex: 1, overflow: "auto" }}>
									<div style={sectionTitle}>Effects → Effect[]</div>
									{result.effects.length > 0 ? (
										<EffectView effects={result.effects} />
									) : (
										<div style={{ color: T.textMuted, fontSize: 11, fontFamily: T.mono }}>
											No effects extracted
										</div>
									)}
								</div>
							</div>
						</div>
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

// ── Styles (original Obsidian Grimoire theme) ────────────

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
	backgroundImage: `radial-gradient(ellipse at center, #1a1510 0%, #0d0d0d 70%), url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M30 0v60M0 30h60' stroke='%23b8860b' stroke-opacity='0.03'/%3E%3C/svg%3E")`,
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

const pipelineArea: React.CSSProperties = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	gap: 6,
	overflow: "hidden",
	minWidth: 0,
};

const columnsRow: React.CSSProperties = {
	flex: 1,
	display: "flex",
	gap: 8,
	overflow: "hidden",
};

const columnStyle: React.CSSProperties = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
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
	flexShrink: 0,
};

const sectionTitle: React.CSSProperties = {
	fontFamily: T.heading,
	fontSize: 12,
	color: T.goldLight,
	textShadow: "1px 1px 2px #000",
	borderBottom: `1px solid ${T.goldDark}44`,
	paddingBottom: 4,
	marginBottom: 8,
};
