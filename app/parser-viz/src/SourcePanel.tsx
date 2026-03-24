/**
 * Source Panel — left sidebar for selecting source type,
 * picking a book/affix from dropdown, and editing raw text.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { SourceType } from "./types.ts";
import { T, panelStyle, selectStyle, labelStyle } from "./theme.ts";

// ── API types ────────────────────────────────────────────

interface BookEntry {
	name: string;
	school: string;
	skillText: string;
	affixText: string;
}

interface ExclusiveEntry {
	bookName: string;
	school: string;
	affixName: string;
	rawText: string;
}

interface SchoolEntry {
	name: string;
	school: string;
	rawText: string;
}

interface UniversalEntry {
	name: string;
	rawText: string;
}

interface SourceData {
	books: BookEntry[];
	exclusive: ExclusiveEntry[];
	school: SchoolEntry[];
	universal: UniversalEntry[];
}

interface SourcePanelProps {
	onParse: (sourceType: SourceType, text: string, bookName?: string) => void;
	ohmSource?: string;
	semanticsSource?: string;
}

// ── Source type options ──────────────────────────────────

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
	{ value: "skill", label: "主书" },
	{ value: "exclusive", label: "专属词缀" },
	{ value: "school", label: "修为词缀" },
	{ value: "universal", label: "通用词缀" },
];

// ── Draggable floating dialog ────────────────────────────

function DraggableDialog({ title, code, onClose }: { title: string; code: string; onClose: () => void }) {
	const boxRef = useRef<HTMLDivElement>(null);
	const posRef = useRef({ x: 200, y: 60 });
	const sizeRef = useRef({ w: 700, h: 500 });
	const dragging = useRef(false);
	const resizeDrag = useRef(false);
	const startMouse = useRef({ x: 0, y: 0 });
	const startPos = useRef({ x: 0, y: 0 });
	const startSize = useRef({ w: 0, h: 0 });

	// Force re-render helper
	const [, forceUpdate] = useState(0);

	const applyTransform = () => {
		if (!boxRef.current) return;
		boxRef.current.style.left = `${posRef.current.x}px`;
		boxRef.current.style.top = `${posRef.current.y}px`;
		boxRef.current.style.width = `${sizeRef.current.w}px`;
		boxRef.current.style.height = `${sizeRef.current.h}px`;
	};

	useEffect(() => {
		const onMove = (e: MouseEvent) => {
			if (dragging.current) {
				posRef.current = {
					x: startPos.current.x + (e.clientX - startMouse.current.x),
					y: startPos.current.y + (e.clientY - startMouse.current.y),
				};
				applyTransform();
			}
			if (resizeDrag.current) {
				sizeRef.current = {
					w: Math.max(300, startSize.current.w + (e.clientX - startMouse.current.x)),
					h: Math.max(200, startSize.current.h + (e.clientY - startMouse.current.y)),
				};
				applyTransform();
			}
		};
		const onUp = () => { dragging.current = false; resizeDrag.current = false; };
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
	}, []);

	const onDragStart = (e: React.MouseEvent) => {
		dragging.current = true;
		startMouse.current = { x: e.clientX, y: e.clientY };
		startPos.current = { ...posRef.current };
		e.preventDefault();
	};

	const onResizeStart = (e: React.MouseEvent) => {
		resizeDrag.current = true;
		startMouse.current = { x: e.clientX, y: e.clientY };
		startSize.current = { ...sizeRef.current };
		e.preventDefault();
		e.stopPropagation();
	};

	return (
		<div
			ref={boxRef}
			style={{
				...dialogBox,
				left: posRef.current.x,
				top: posRef.current.y,
				width: sizeRef.current.w,
				height: sizeRef.current.h,
			}}
		>
			<div style={dialogHeader} onMouseDown={onDragStart}>
				<span>{title}</span>
				<button type="button" onClick={onClose} style={dialogClose}>✕</button>
			</div>
			<pre style={dialogCode}>{code}</pre>
			<div style={resizeHandle} onMouseDown={onResizeStart} />
		</div>
	);
}

export function SourcePanel({ onParse, ohmSource, semanticsSource }: SourcePanelProps) {
	const [sourceType, setSourceType] = useState<SourceType>("skill");
	const [data, setData] = useState<SourceData | null>(null);
	const [selected, setSelected] = useState("");
	const [text, setText] = useState("");
	const [loading, setLoading] = useState(true);
	const [dialogContent, setDialogContent] = useState<{ title: string; code: string } | null>(null);

	// Load all source data on mount
	useEffect(() => {
		Promise.all([
			fetch("/api/sources/books").then((r) => r.json()),
			fetch("/api/sources/exclusive").then((r) => r.json()),
			fetch("/api/sources/school").then((r) => r.json()),
			fetch("/api/sources/universal").then((r) => r.json()),
		]).then(([books, exclusive, school, universal]) => {
			setData({
				books: books.entries,
				exclusive: exclusive.entries,
				school: school.entries,
				universal: universal.entries,
			});
			setLoading(false);
		});
	}, []);

	// Auto-select first entry when source type changes
	useEffect(() => {
		if (!data) return;
		const entries = getEntries(data, sourceType);
		if (entries.length > 0) {
			const first = entries[0];
			setSelected(first.key);
			setText(first.text);
		} else {
			setSelected("");
			setText("");
		}
	}, [sourceType, data]);

	// When selection changes, update text
	const handleSelect = (key: string) => {
		setSelected(key);
		if (!data) return;
		const entries = getEntries(data, sourceType);
		const entry = entries.find((e) => e.key === key);
		if (entry) setText(entry.text);
	};

	// Fire parse
	const handleParse = () => {
		const bookName = sourceType === "skill" ? selected : undefined;
		onParse(sourceType, text, bookName);
	};

	// Auto-parse on text/selection change
	useEffect(() => {
		if (!text) return;
		const bookName = sourceType === "skill" ? selected : undefined;
		onParse(sourceType, text, bookName);
	}, [text, selected, sourceType]);

	if (loading) {
		return (
			<div style={{ ...panelStyle, minWidth: 260 }}>
				<div style={{ color: T.textMuted, fontSize: 12 }}>Loading sources...</div>
			</div>
		);
	}

	const entries = data ? getEntries(data, sourceType) : [];

	return (
		<div style={{ ...panelStyle, minWidth: 260, display: "flex", flexDirection: "column", gap: 12 }}>
			<div style={titleStyle}>Source</div>

			{/* Source type radio buttons */}
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				{SOURCE_TYPES.map(({ value, label }) => (
					<label
						key={value}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							cursor: "pointer",
							fontSize: 13,
							color: sourceType === value ? T.goldLight : T.text,
							fontFamily: T.headingCn,
						}}
					>
						<input
							type="radio"
							name="sourceType"
							value={value}
							checked={sourceType === value}
							onChange={() => setSourceType(value)}
							style={{ accentColor: T.goldDark }}
						/>
						{label}
					</label>
				))}
			</div>

			{/* Divider */}
			<div style={divider} />

			{/* Dropdown */}
			<div>
				<label style={labelStyle}>
					{sourceType === "skill" ? "Book" : "Affix"}:
				</label>
				<select
					value={selected}
					onChange={(e) => handleSelect(e.target.value)}
					style={selectStyle}
				>
					{entries.map((e) => (
						<option key={e.key} value={e.key}>
							{e.label}
						</option>
					))}
				</select>
			</div>

			{/* Divider */}
			<div style={divider} />

			{/* Raw text area */}
			<div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
				<label style={labelStyle}>Raw text:</label>
				<textarea
					value={text}
					onChange={(e) => setText(e.target.value)}
					style={textareaStyle}
					spellCheck={false}
				/>
			</div>

			{/* View source buttons */}
			<div style={{ display: "flex", gap: 6 }}>
				<button
					type="button"
					onClick={() => ohmSource && setDialogContent({ title: `${selected}.ohm`, code: ohmSource })}
					style={sourceButtonStyle}
					disabled={!ohmSource}
				>
					.ohm
				</button>
				<button
					type="button"
					onClick={() => semanticsSource && setDialogContent({ title: `${selected}.ts`, code: semanticsSource })}
					style={sourceButtonStyle}
					disabled={!semanticsSource}
				>
					semantics
				</button>
			</div>

			{/* Parse button */}
			<button type="button" onClick={handleParse} style={parseButtonStyle}>
				Parse
			</button>

			{/* Floating draggable dialog — portaled to body */}
			{dialogContent && createPortal(
				<DraggableDialog
					title={dialogContent.title}
					code={dialogContent.code}
					onClose={() => setDialogContent(null)}
				/>,
				document.body,
			)}
		</div>
	);
}

// ── Helpers ──────────────────────────────────────────────

interface DropdownEntry {
	key: string;
	label: string;
	text: string;
}

function getEntries(data: SourceData, sourceType: SourceType): DropdownEntry[] {
	switch (sourceType) {
		case "skill":
			return data.books.map((b) => ({
				key: b.name,
				label: `${b.name} (${b.school})`,
				text: b.skillText,
			}));
		case "exclusive":
			return data.exclusive.map((e) => ({
				key: e.bookName,
				label: `${e.bookName} — ${e.affixName}`,
				text: e.rawText,
			}));
		case "school":
			return data.school.map((e) => ({
				key: e.name,
				label: `${e.name} (${e.school})`,
				text: e.rawText,
			}));
		case "universal":
			return data.universal.map((e) => ({
				key: e.name,
				label: e.name,
				text: e.rawText,
			}));
	}
}

// ── Styles ───────────────────────────────────────────────

const titleStyle: React.CSSProperties = {
	fontFamily: T.heading,
	fontSize: 14,
	color: T.goldLight,
	textShadow: "2px 2px 4px #000",
	borderBottom: `2px solid ${T.goldDark}`,
	paddingBottom: 6,
};

const divider: React.CSSProperties = {
	height: 1,
	background: `linear-gradient(90deg, transparent, ${T.goldDark}44, transparent)`,
};

const textareaStyle: React.CSSProperties = {
	flex: 1,
	minHeight: 150,
	background: "#111",
	color: T.text,
	border: "1px solid #444",
	borderRadius: 4,
	padding: 8,
	fontSize: 12,
	fontFamily: T.body,
	resize: "vertical",
	boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)",
	outline: "none",
	lineHeight: 1.5,
};

const parseButtonStyle: React.CSSProperties = {
	background: `linear-gradient(180deg, #6a5a2a, #332a10)`,
	color: T.goldLight,
	border: `2px solid ${T.goldDark}`,
	borderRadius: 6,
	padding: "8px 16px",
	fontSize: 13,
	fontFamily: T.heading,
	fontWeight: "bold",
	letterSpacing: 1,
	cursor: "pointer",
	textShadow: "1px 1px 2px #000",
	boxShadow: `0 3px 0 #111, 0 0 10px rgba(184,134,11,0.3)`,
};

const sourceButtonStyle: React.CSSProperties = {
	flex: 1,
	background: "#222",
	color: T.textMuted,
	border: `1px solid ${T.border}`,
	borderRadius: 4,
	padding: "5px 8px",
	fontSize: 11,
	fontFamily: T.mono,
	cursor: "pointer",
};

const dialogBox: React.CSSProperties = {
	position: "fixed",
	background: "#1a1a1a",
	border: `2px solid ${T.goldDark}`,
	borderRadius: 8,
	display: "flex",
	flexDirection: "column",
	boxShadow: `0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(184,134,11,0.15)`,
	zIndex: 1000,
};

const dialogHeader: React.CSSProperties = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	padding: "8px 14px",
	borderBottom: `1px solid ${T.goldDark}44`,
	fontFamily: T.heading,
	fontSize: 13,
	color: T.goldLight,
	cursor: "grab",
	userSelect: "none",
};

const dialogClose: React.CSSProperties = {
	background: "none",
	border: "none",
	color: T.textMuted,
	fontSize: 16,
	cursor: "pointer",
	padding: "2px 6px",
};

const dialogCode: React.CSSProperties = {
	flex: 1,
	margin: 0,
	padding: 14,
	overflow: "auto",
	fontFamily: T.mono,
	fontSize: 12,
	lineHeight: 1.6,
	color: T.text,
	whiteSpace: "pre-wrap",
	wordBreak: "break-all",
};

const resizeHandle: React.CSSProperties = {
	position: "absolute",
	bottom: 0,
	right: 0,
	width: 16,
	height: 16,
	cursor: "nwse-resize",
	background: `linear-gradient(135deg, transparent 50%, ${T.goldDark}44 50%)`,
	borderRadius: "0 0 6px 0",
};
