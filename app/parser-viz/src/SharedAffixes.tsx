/** Shows shared affix grammars with full parse flows per affix. */

import { GrammarPanel } from "./GrammarPanel.tsx";
import { EntryPointFlow } from "./EntryPointFlow.tsx";

interface AffixGroup {
	grammar: string;
	ohmSource: string | null;
	semSource: string | null;
	items: { name: string; raw: string; tree?: object; effects?: object[]; error?: string; effectError?: string }[];
}

function AffixGroupPanel({ group }: { group: AffixGroup }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<GrammarPanel name={group.grammar} ohmSource={group.ohmSource} semSource={group.semSource} />
			{group.items.map(item => (
				<EntryPointFlow key={item.name} name={item.name} result={item} />
			))}
		</div>
	);
}

export function SharedAffixes({ school, universal }: { school: AffixGroup; universal: AffixGroup }) {
	return (
		<div>
			<AffixGroupPanel group={school} />
			<AffixGroupPanel group={universal} />
		</div>
	);
}
