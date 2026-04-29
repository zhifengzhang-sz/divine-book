import { useEffect, useRef, useState } from "react";
import { T } from "./theme.ts";
import { EffectsPreview } from "./EffectsPreview.tsx";

interface TextBlockProps {
	label: string;
	text: string;
	grammarName: string;
	entryPoint: string;
	effects: object[];
	onTextChange: (text: string) => void;
	onEffectsUpdate: (effects: object[]) => void;
}

export function TextBlock({
	label,
	text,
	grammarName,
	entryPoint,
	effects,
	onTextChange,
	onEffectsUpdate,
}: TextBlockProps) {
	const [parseError, setParseError] = useState<string | null>(null);
	const [parsing, setParsing] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Auto-parse on text change with 500ms debounce
	useEffect(() => {
		if (!text.trim()) return;

		if (debounceRef.current) clearTimeout(debounceRef.current);

		debounceRef.current = setTimeout(async () => {
			setParsing(true);
			setParseError(null);
			try {
				const res = await fetch("/api/parse", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ grammarName, text, entryPoint }),
				});
				const data = await res.json();
				if (data.effects?.length) {
					onEffectsUpdate(data.effects);
				}
				if (data.error) setParseError(data.error);
			} catch (e) {
				setParseError((e as Error).message);
			} finally {
				setParsing(false);
			}
		}, 500);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [text, grammarName, entryPoint]);

	return (
		<div className="rpg-card" style={blockStyle}>
			<div style={blockHeaderStyle}>
				<div style={labelDot} />
				<span>{label}</span>
				<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
					{parsing && (
						<span style={{ fontSize: 10, color: T.cyan, fontFamily: T.mono, animation: "fadeIn 0.15s ease" }}>
							parsing...
						</span>
					)}
					<span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono, textShadow: "1px 1px 2px black" }}>
						{effects.length} effect{effects.length !== 1 ? "s" : ""}
					</span>
				</div>
			</div>

			{/* Two-pane layout: left = edit, right = effects */}
			<div style={twoPane}>
				{/* Left: textarea */}
				<div style={leftPane}>
					<textarea
						className="rpg-textarea"
						value={text}
						onChange={(e) => onTextChange(e.target.value)}
						style={{ width: "100%", minHeight: 160, flex: 1 }}
						spellCheck={false}
						placeholder="Paste skill or affix description here..."
					/>

					{parseError && (
						<div style={errorStyle}>
							<span style={{ marginRight: 4 }}>⚠</span>{parseError}
						</div>
					)}
				</div>

				{/* Right: live effects */}
				<div style={rightPane}>
					<EffectsPreview effects={effects} label="Effects" />
				</div>
			</div>
		</div>
	);
}

const blockStyle: React.CSSProperties = {
	padding: "14px 16px",
	background: T.card,
	border: `1px solid ${T.border}`,
	borderRadius: T.rLg,
	marginBottom: 14,
	backdropFilter: "blur(8px)",
	boxShadow: T.shadowSm,
	animation: "fadeIn 0.25s ease",
};

const blockHeaderStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	color: T.goldBright,
	fontFamily: T.heading,
	fontSize: 13,
	marginBottom: 10,
	letterSpacing: 0.5,
};

const labelDot: React.CSSProperties = {
	width: 6, height: 6,
	borderRadius: "50%",
	background: T.gold,
	boxShadow: `0 0 6px ${T.goldGlow}`,
	flexShrink: 0,
};

const twoPane: React.CSSProperties = {
	display: "flex",
	gap: 14,
	alignItems: "stretch",
	minHeight: 160,
};

const leftPane: React.CSSProperties = {
	flex: "1 1 50%",
	display: "flex",
	flexDirection: "column",
	gap: 8,
	minWidth: 0,
};

const rightPane: React.CSSProperties = {
	flex: "1 1 50%",
	overflowY: "auto",
	maxHeight: 400,
	minWidth: 0,
	padding: "4px 0",
};

const errorStyle: React.CSSProperties = {
	color: T.red,
	fontSize: 11,
	fontFamily: T.mono,
	padding: "6px 10px",
	background: T.redGlow,
	borderRadius: T.r,
	border: `1px solid ${T.red}33`,
};
