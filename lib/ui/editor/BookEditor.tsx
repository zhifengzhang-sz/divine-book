import { TextBlock } from "./TextBlock.tsx";
import type { RawBookData } from "./types.ts";

export type { RawBookData };

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
