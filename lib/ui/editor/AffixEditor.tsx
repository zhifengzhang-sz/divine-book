import { T } from "./theme.ts";
import { TextBlock } from "./TextBlock.tsx";
import type { RawAffixData } from "./types.ts";

interface AffixEditorProps {
	affix: RawAffixData;
	affixName: string;
	grammarName: string;
	onUpdate: (updated: RawAffixData) => void;
}

export function AffixEditor({ affix, affixName, grammarName, onUpdate }: AffixEditorProps) {
	function updateText(text: string) {
		onUpdate({ ...affix, text });
	}

	function updateEffects(effects: object[]) {
		onUpdate({ ...affix, effects });
	}

	return (
		<div>
			<div style={titleStyle}>{affixName}</div>
			<TextBlock
				label={affixName}
				text={affix.text}
				grammarName={grammarName}
				entryPoint="affixDescription"
				effects={affix.effects}
				onTextChange={updateText}
				onEffectsUpdate={updateEffects}
			/>
		</div>
	);
}

const titleStyle: React.CSSProperties = {
	fontFamily: T.heading,
	fontSize: 16,
	color: T.goldBright,
	marginBottom: 12,
};
