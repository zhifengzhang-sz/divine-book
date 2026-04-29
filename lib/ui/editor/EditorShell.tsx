/**
 * EditorShell — the shared UI layout for the divine-book editor.
 *
 * Used by both app/editor (standalone) and lib/ui/plugin (道具数据库).
 * Handles mode switching, book/affix selection, and rendering the
 * appropriate editor component. Does NOT handle data loading or saving.
 */

import { useEffect, useState } from "react";
import { T, globalCSS } from "./theme.ts";
import { BookEditor } from "./BookEditor.tsx";
import { AffixEditor } from "./AffixEditor.tsx";
import type { EditorData, RawAffixData, RawBookData } from "./types.ts";

export type { EditorData, RawAffixData };

type Mode = "book" | "universal" | "school";

interface EditorShellProps {
	data: EditorData;
	onUpdate: (data: EditorData) => void;
	dirty?: boolean;
	saveStatus?: "idle" | "saving" | "saved";
	onSave?: () => void;
}

// ── Component ──────────────────────────────────────────

export function EditorShell({ data, onUpdate, dirty, saveStatus = "idle", onSave }: EditorShellProps) {
	const [mode, setMode] = useState<Mode>("book");
	const [selectedBook, setSelectedBook] = useState<string | null>(
		Object.keys(data.books)[0] ?? null,
	);
	const [selectedSchool, setSelectedSchool] = useState<string | null>(
		Object.keys(data.affixes.school)[0] ?? null,
	);
	const [selectedAffix, setSelectedAffix] = useState<string | null>(null);

	useEffect(() => {
		if (mode === "universal") {
			setSelectedAffix(Object.keys(data.affixes.universal)[0] ?? null);
		} else if (mode === "school" && selectedSchool) {
			setSelectedAffix(Object.keys(data.affixes.school[selectedSchool] ?? {})[0] ?? null);
		}
	}, [mode, selectedSchool, data]);

	function updateBook(bookName: string, updated: RawBookData) {
		onUpdate({ ...data, books: { ...data.books, [bookName]: updated } });
	}

	function updateUniversalAffix(name: string, updated: RawAffixData) {
		onUpdate({
			...data,
			affixes: { ...data.affixes, universal: { ...data.affixes.universal, [name]: updated } },
		});
	}

	function updateSchoolAffix(school: string, name: string, updated: RawAffixData) {
		onUpdate({
			...data,
			affixes: {
				...data.affixes,
				school: { ...data.affixes.school, [school]: { ...data.affixes.school[school], [name]: updated } },
			},
		});
	}

	const bookNames = Object.keys(data.books);
	const schoolNames = Object.keys(data.affixes.school);
	const universalNames = Object.keys(data.affixes.universal);
	const schoolAffixNames = selectedSchool
		? Object.keys(data.affixes.school[selectedSchool] ?? {})
		: [];

	const schoolIcons: Record<string, string> = { Sword: "⚔", Spell: "✨", Demon: "🔥", Body: "💪" };

	return (
		<div style={appStyle}>
			<style>{globalCSS}</style>

			{/* Header */}
			<div style={headerStyle}>
				<div style={headerInner}>
					<div style={titleRow}>
						<div style={logoStyle}>灵</div>
						<div>
							<div style={{ fontFamily: T.heading, fontSize: 17, color: T.goldBright, letterSpacing: 1.5 }}>
								Divine Book Editor
							</div>
							<div style={{ fontFamily: T.body, fontSize: 10, color: T.muted, marginTop: 1, letterSpacing: 0.5 }}>
								灵書数据编辑器
							</div>
						</div>
					</div>

					<div style={controlsRow}>
						{/* Mode tabs */}
						<div style={tabGroupStyle}>
							{(["book", "universal", "school"] as Mode[]).map((m) => (
								<button
									key={m}
									onClick={() => setMode(m)}
									style={{
										...tabStyle,
										...(mode === m ? tabActiveStyle : {}),
									}}
								>
									{{ book: "功法书", universal: "通用词缀", school: "修为词缀" }[m]}
								</button>
							))}
						</div>

						<div style={dividerStyle} />

						{/* Selectors */}
						{mode === "book" && (
							<select
								value={selectedBook ?? ""}
								onChange={(e) => setSelectedBook(e.target.value)}
								className="rpg-select" style={{ maxWidth: 220 }}
							>
								{bookNames.map((n) => {
									const s = data.books[n].school;
									return <option key={n} value={n}>{schoolIcons[s] ?? ""} {n}</option>;
								})}
							</select>
						)}

						{mode === "universal" && (
							<select
								value={selectedAffix ?? ""}
								onChange={(e) => setSelectedAffix(e.target.value)}
								className="rpg-select" style={{ maxWidth: 220 }}
							>
								{universalNames.map((n) => <option key={n} value={n}>【{n}】</option>)}
							</select>
						)}

						{mode === "school" && (
							<>
								<select
									value={selectedSchool ?? ""}
									onChange={(e) => setSelectedSchool(e.target.value)}
									className="rpg-select" style={{ maxWidth: 220 }}
								>
									{schoolNames.map((n) => <option key={n} value={n}>{n}</option>)}
								</select>
								<select
									value={selectedAffix ?? ""}
									onChange={(e) => setSelectedAffix(e.target.value)}
									className="rpg-select" style={{ maxWidth: 220 }}
								>
									{schoolAffixNames.map((n) => <option key={n} value={n}>【{n}】</option>)}
								</select>
							</>
						)}

						<div style={{ flex: 1 }} />

						{/* Save */}
						{onSave && (
							<button
								className={`rpg-btn ${dirty ? "rpg-btn-primary" : ""} ${saveStatus === "saved" ? "rpg-btn-green" : ""}`}
								onClick={onSave}
								disabled={!dirty || saveStatus === "saving"}
							>
								{saveStatus === "saving"
									? "⏳ Saving..."
									: saveStatus === "saved"
										? "✔ Saved"
										: dirty ? "◉ Save Changes" : "Save"}
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Main content */}
			<div style={contentStyle}>
				{/* School badge */}
				{mode === "book" && selectedBook && data.books[selectedBook] && (
					<div style={{ animation: "fadeIn 0.3s ease", marginBottom: 16 }}>
						<div className={`rpg-badge rpg-badge-${data.books[selectedBook].school.toLowerCase()}`}
							style={{ padding: "6px 14px", borderRadius: 20 }}>
							<span style={{ fontSize: 16 }}>{schoolIcons[data.books[selectedBook].school] ?? ""}</span>
							<span className="rpg-heading" style={{ fontSize: 18, borderBottom: "none", paddingBottom: 0 }}>
								{selectedBook}
							</span>
							<span style={{ fontSize: 11, opacity: 0.6 }}>{data.books[selectedBook].school}</span>
						</div>
					</div>
				)}

				{mode === "book" && selectedBook && data.books[selectedBook] && (
					<BookEditor
						book={data.books[selectedBook]}
						bookName={selectedBook}
						onUpdate={(updated) => updateBook(selectedBook, updated)}
					/>
				)}

				{mode === "universal" && selectedAffix && data.affixes.universal[selectedAffix] && (
					<AffixEditor
						affix={data.affixes.universal[selectedAffix]}
						affixName={selectedAffix}
						grammarName={"\u901A\u7528\u8BCD\u7F00"}
						onUpdate={(updated) => updateUniversalAffix(selectedAffix, updated)}
					/>
				)}

				{mode === "school" && selectedSchool && selectedAffix &&
					data.affixes.school[selectedSchool]?.[selectedAffix] && (
						<AffixEditor
							affix={data.affixes.school[selectedSchool][selectedAffix]}
							affixName={selectedAffix}
							grammarName={`\u4FEE\u4E3A\u8BCD\u7F00_${selectedSchool}`}
							onUpdate={(updated) => updateSchoolAffix(selectedSchool, selectedAffix, updated)}
						/>
					)}
			</div>
		</div>
	);
}

// ── Styles (exact copy from app/editor/src/App.tsx) ────

const appStyle: React.CSSProperties = {
	height: "100vh",
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
	fontFamily: T.body,
};

const headerStyle: React.CSSProperties = {
	background: T.panelHi,
	borderBottom: `1px solid ${T.border}`,
	backdropFilter: "blur(12px)",
	flexShrink: 0,
	boxShadow: T.shadowMd,
	position: "relative",
	zIndex: 10,
};

const headerInner: React.CSSProperties = {
	padding: "12px 20px",
	display: "flex",
	flexDirection: "column",
	gap: 10,
};

const titleRow: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 10,
};

const logoStyle: React.CSSProperties = {
	width: 36, height: 36,
	display: "flex", alignItems: "center", justifyContent: "center",
	fontSize: 18,
	background: `linear-gradient(135deg, ${T.gold}22, ${T.gold}08)`,
	border: `1px solid ${T.gold}44`,
	borderRadius: 8,
	color: T.goldBright,
	fontFamily: "'ZCOOL XiaoWei', serif",
};

const controlsRow: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	flexWrap: "wrap",
};

const tabGroupStyle: React.CSSProperties = {
	display: "flex",
	background: "rgba(0, 0, 0, 0.2)",
	borderRadius: T.r,
	padding: 2,
	gap: 1,
};

const tabStyle: React.CSSProperties = {
	background: "transparent",
	color: T.mutedLight,
	border: "none",
	borderRadius: T.r - 2,
	padding: "6px 14px",
	fontSize: 12,
	fontFamily: T.body,
	fontWeight: 500,
	cursor: "pointer",
	transition: "all 0.2s ease",
	letterSpacing: 0.3,
};

const tabActiveStyle: React.CSSProperties = {
	background: `linear-gradient(135deg, ${T.gold}22, ${T.gold}0a)`,
	color: T.goldBright,
	boxShadow: `0 0 12px ${T.goldGlow}`,
};

const dividerStyle: React.CSSProperties = {
	width: 1, height: 24,
	background: `linear-gradient(to bottom, transparent, ${T.border}, transparent)`,
	margin: "0 6px",
};

const contentStyle: React.CSSProperties = {
	flex: 1,
	padding: "24px 28px",
	overflow: "auto",
	maxWidth: 1200,
};
