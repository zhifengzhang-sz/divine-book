/**
 * Parser Pipeline Visualizer — Per-Book Grammar Edition
 *
 * Shows the full process: raw text → grammar → parse tree → effects
 * With the .ohm and semantic .ts file contents visible.
 */

import { useCallback, useEffect, useState } from "react";
import type { BookEntry, ParseResponse } from "./types.ts";

// ── API calls ───────────────────────────────────────────

async function fetchBooks(): Promise<BookEntry[]> {
	const res = await fetch("/api/books");
	const data = await res.json();
	return data.books;
}

async function fetchParse(
	bookName: string,
	entryPoint: string,
	text: string,
): Promise<ParseResponse> {
	const res = await fetch("/api/parse", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ bookName, entryPoint, text }),
	});
	return res.json();
}

// ── Styles ──────────────────────────────────────────────

const T = {
	bg: "#282c34",
	panel: "#2c313a",
	border: "#4b5263",
	text: "#abb2bf",
	textMuted: "#5c6370",
	accent: "#61afef",
	green: "#98c379",
	red: "#e06c75",
	yellow: "#e5c07b",
	purple: "#c678dd",
	orange: "#d19a66",
};

const mono = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";

// ── Components ──────────────────────────────────────────

function CodeBlock({ title, code, lang }: { title: string; code: string; lang?: string }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<div style={{ color: T.yellow, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{title}</div>
			<pre style={{
				background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6,
				padding: 12, margin: 0, overflow: "auto", maxHeight: 400,
				fontFamily: mono, fontSize: 12, lineHeight: 1.5, color: T.text,
			}}>
				{code}
			</pre>
		</div>
	);
}

function TreeView({ node, depth = 0 }: { node: any; depth?: number }) {
	if (!node) return null;
	if (Array.isArray(node)) {
		return <>{node.map((n, i) => <TreeView key={i} node={n} depth={depth} />)}</>;
	}
	const indent = depth * 16;
	if (node.text && !node.children) {
		// Leaf
		if (node.rule === "_terminal" && node.text.length <= 1) return null;
		return (
			<div style={{ paddingLeft: indent, fontFamily: mono, fontSize: 12, lineHeight: 1.6 }}>
				<span style={{ color: T.textMuted }}>{node.rule}: </span>
				<span style={{ color: T.green }}>"{node.text}"</span>
			</div>
		);
	}
	return (
		<div>
			<div style={{ paddingLeft: indent, fontFamily: mono, fontSize: 12, lineHeight: 1.6 }}>
				<span style={{ color: T.purple, fontWeight: 600 }}>{node.rule}</span>
			</div>
			{node.children?.map((child: any, i: number) => (
				<TreeView key={i} node={child} depth={depth + 1} />
			))}
		</div>
	);
}

function EffectsView({ effects, error }: { effects?: any[]; error?: string }) {
	if (error) return <div style={{ color: T.red, fontFamily: mono, fontSize: 12 }}>{error}</div>;
	if (!effects || effects.length === 0) return <div style={{ color: T.textMuted }}>No effects</div>;
	return (
		<pre style={{
			background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6,
			padding: 12, margin: 0, overflow: "auto", fontFamily: mono, fontSize: 12,
			lineHeight: 1.5, color: T.text,
		}}>
			{JSON.stringify(effects, null, 2)}
		</pre>
	);
}

// ── Step indicator ──────────────────────────────────────

function Step({ n, label, status }: { n: number; label: string; status: "ok" | "error" | "pending" }) {
	const color = status === "ok" ? T.green : status === "error" ? T.red : T.textMuted;
	const icon = status === "ok" ? "✓" : status === "error" ? "✗" : "○";
	return (
		<span style={{ color, fontSize: 13, fontWeight: 600, marginRight: 16 }}>
			{icon} Step {n}: {label}
		</span>
	);
}

// ── Main App ────────────────────────────────────────────

export function App() {
	const [books, setBooks] = useState<BookEntry[]>([]);
	const [selected, setSelected] = useState<string>("");
	const [entryPoint, setEntryPoint] = useState<string>("skillDescription");
	const [result, setResult] = useState<ParseResponse | null>(null);

	useEffect(() => { fetchBooks().then(b => { setBooks(b); if (b.length > 0) setSelected(b[0].name); }); }, []);

	const selectedBook = books.find(b => b.name === selected);

	const handleParse = useCallback(() => {
		if (!selectedBook) return;
		const lines = (entryPoint === "skillDescription" ? selectedBook.skillText : selectedBook.affixText).split("\n");
		// Strip tier lines and backticks
		const text = lines.filter(l => !l.match(/^悟\d|^融合|^此功能/)).join("").replace(/`/g, "");
		fetchParse(selected, entryPoint, text).then(setResult);
	}, [selected, entryPoint, selectedBook]);

	// Auto-parse on selection change
	useEffect(() => { if (selectedBook) handleParse(); }, [selected, entryPoint]);

	return (
		<div style={{ background: T.bg, color: T.text, minHeight: "100vh", padding: "20px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
			<style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>

			<h1 style={{ color: "#fff", fontSize: 20, margin: "0 0 16px 0" }}>
				Parser Pipeline Visualizer
				<span style={{ color: T.textMuted, fontWeight: 400, fontSize: 14, marginLeft: 12 }}>
					per-book grammar edition
				</span>
			</h1>

			{/* Book selector */}
			<div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
				<select
					value={selected}
					onChange={e => setSelected(e.target.value)}
					style={{ background: T.panel, color: T.text, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 10px", fontSize: 14 }}
				>
					{books.map(b => <option key={b.name} value={b.name}>{b.name} ({b.school})</option>)}
				</select>

				<select
					value={entryPoint}
					onChange={e => setEntryPoint(e.target.value)}
					style={{ background: T.panel, color: T.text, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 10px", fontSize: 14 }}
				>
					<option value="skillDescription">skillDescription</option>
					<option value="primaryAffix">primaryAffix</option>
					<option value="exclusiveAffix">exclusiveAffix</option>
				</select>

				<button
					onClick={handleParse}
					style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", fontSize: 14, cursor: "pointer" }}
				>
					Parse
				</button>
			</div>

			{result && (
				<div>
					{/* Step indicators */}
					<div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap" }}>
						<Step n={1} label="Raw Text" status="ok" />
						<Step n={2} label="Grammar (.ohm)" status="ok" />
						<Step n={3} label="Parse Tree" status={result.parseSucceeded ? "ok" : "error"} />
						<Step n={4} label="Effects" status={result.effects ? "ok" : result.effectError ? "error" : "pending"} />
					</div>

					{/* 2×2 grid: raw+grammar on left, tree+effects on right */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

						{/* Step 1: Raw text */}
						<div>
							<CodeBlock title={`① Raw Text — ${result.bookName} / ${result.entryPoint}`} code={result.rawText} />
						</div>

						{/* Step 3: Parse tree */}
						<div>
							<div style={{ color: T.yellow, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
								③ Parse Tree
								{!result.parseSucceeded && <span style={{ color: T.red, marginLeft: 8 }}>FAILED: {result.parseError}</span>}
							</div>
							{result.parseSucceeded && result.parseTree ? (
								<div style={{
									background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6,
									padding: 12, overflow: "auto", maxHeight: 400,
								}}>
									<TreeView node={result.parseTree} />
								</div>
							) : (
								<div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: 12, color: T.red, fontFamily: mono, fontSize: 12 }}>
									{result.parseError}
								</div>
							)}
						</div>

						{/* Step 2: Grammar file */}
						<div>
							<CodeBlock title={`② Grammar — ${result.bookName}.ohm`} code={result.ohmSource} />
						</div>

						{/* Step 4: Effects */}
						<div>
							<div style={{ color: T.yellow, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>④ Effects → Effect[]</div>
							<EffectsView effects={result.effects} error={result.effectError} />
						</div>

						{/* Semantics source (full width) */}
						<div style={{ gridColumn: "1 / -1" }}>
							<CodeBlock title={`Semantics — ${result.bookName}.ts`} code={result.semanticsSource} lang="typescript" />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
