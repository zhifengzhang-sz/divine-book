import { T } from "./theme.ts";
import { TextBlock } from "./TextBlock.tsx";

// Matches the shape in game.data.json
export interface RawBookData {
	school: string;
	skill: { text: string; effects: object[] };
	primaryAffix?: { name: string; text: string; effects: object[] };
	exclusiveAffix?: { name: string; text: string; effects: object[] };
	xuan?: { text: string; effects: object[] };
}

interface BookEditorProps {
	book: RawBookData;
	bookName: string;
	onUpdate: (updated: RawBookData) => void;
}

export function BookEditor({ book, bookName, onUpdate }: BookEditorProps) {
	function updateSkillText(text: string) {
		onUpdate({ ...book, skill: { ...book.skill, text } });
	}

	function updateSkillEffects(effects: object[]) {
		onUpdate({ ...book, skill: { ...book.skill, effects } });
	}

	function updatePrimaryText(text: string) {
		if (!book.primaryAffix) return;
		onUpdate({ ...book, primaryAffix: { ...book.primaryAffix, text } });
	}

	function updatePrimaryEffects(effects: object[]) {
		if (!book.primaryAffix) return;
		onUpdate({ ...book, primaryAffix: { ...book.primaryAffix, effects } });
	}

	function updateExclusiveText(text: string) {
		if (!book.exclusiveAffix) return;
		onUpdate({ ...book, exclusiveAffix: { ...book.exclusiveAffix, text } });
	}

	function updateExclusiveEffects(effects: object[]) {
		if (!book.exclusiveAffix) return;
		onUpdate({ ...book, exclusiveAffix: { ...book.exclusiveAffix, effects } });
	}

	function updateXuanText(text: string) {
		if (!book.xuan) return;
		onUpdate({ ...book, xuan: { ...book.xuan, text } });
	}

	function updateXuanEffects(effects: object[]) {
		if (!book.xuan) return;
		onUpdate({ ...book, xuan: { ...book.xuan, effects } });
	}

	function addXuan() {
		onUpdate({ ...book, xuan: { text: "", effects: [] } });
	}

	function removeXuan() {
		const { xuan: _, ...rest } = book;
		onUpdate(rest as RawBookData);
	}

	return (
		<div style={{ animation: "fadeIn 0.3s ease" }}>


			{/* Skill */}
			<TextBlock
				label={`主技能 (Skill)`}
				text={book.skill.text}
				grammarName={bookName}
				entryPoint="skillDescription"
				effects={book.skill.effects}
				onTextChange={updateSkillText}
				onEffectsUpdate={updateSkillEffects}
			/>

			{/* Primary Affix */}
			{book.primaryAffix && (
				<TextBlock
					label={`主词缀: ${book.primaryAffix.name}`}
					text={book.primaryAffix.text}
					grammarName={bookName}
					entryPoint="primaryAffix"
					effects={book.primaryAffix.effects}
					onTextChange={updatePrimaryText}
					onEffectsUpdate={updatePrimaryEffects}
				/>
			)}

			{/* Exclusive Affix */}
			{book.exclusiveAffix && (
				<TextBlock
					label={`专属词缀: ${book.exclusiveAffix.name}`}
					text={book.exclusiveAffix.text}
					grammarName={bookName}
					entryPoint="exclusiveAffix"
					effects={book.exclusiveAffix.effects}
					onTextChange={updateExclusiveText}
					onEffectsUpdate={updateExclusiveEffects}
				/>
			)}

			{/* Xuan */}
			{book.xuan ? (
				<div>
					<TextBlock
						label={"通玄 (Xuan)"}
						text={book.xuan.text}
						grammarName={bookName}
						entryPoint="xuanDescription"
						effects={book.xuan.effects}
						onTextChange={updateXuanText}
						onEffectsUpdate={updateXuanEffects}
					/>
					<button className="rpg-btn rpg-btn-danger" onClick={removeXuan} style={{ fontSize: 11 }}>
						✕ Remove 通玄
					</button>
				</div>
			) : (
				<button className="rpg-btn" onClick={addXuan} style={{ width: "100%" }}>
					+ Add 通玄
				</button>
			)}
		</div>
	);
}

const addBtnStyle: React.CSSProperties = {
	background: `${T.gold}0a`,
	color: T.goldDim,
	border: `1px dashed ${T.gold}33`,
	borderRadius: T.rLg,
	padding: "12px 20px",
	fontSize: 12,
	fontFamily: T.body,
	fontWeight: 500,
	cursor: "pointer",
	marginBottom: 14,
	width: "100%",
	textAlign: "center",
	transition: "all 0.2s",
	letterSpacing: 0.5,
};

const removeBtnStyle: React.CSSProperties = {
	background: T.redGlow,
	color: T.red,
	border: `1px solid ${T.red}33`,
	borderRadius: T.r,
	padding: "5px 12px",
	fontSize: 11,
	fontFamily: T.body,
	fontWeight: 500,
	cursor: "pointer",
	marginBottom: 14,
	transition: "all 0.2s",
};
