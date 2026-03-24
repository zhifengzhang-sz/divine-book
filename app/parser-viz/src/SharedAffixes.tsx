/** Shows shared affixes (school + universal) as collapsible groups. */

import { T } from "./theme.ts";
import { CollapsibleSection } from "./CollapsibleSection.tsx";
import { EffectsView } from "./EffectsView.tsx";

interface AffixItem {
	name: string;
	raw: string;
	effects?: object[];
	error?: string;
}

interface AffixGroup {
	grammar: string;
	ohmSource: string | null;
	items: AffixItem[];
}

export function SharedAffixes({ school, universal }: { school: AffixGroup; universal: AffixGroup }) {
	return (
		<div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "6px 8px" }}>
			<div style={{ color: T.muted, fontFamily: T.heading, fontSize: 11, marginBottom: 4 }}>Shared Affixes</div>

			<CollapsibleSection title={school.grammar} badge={`${school.items.length} affixes`}>
				{school.items.map(a => (
					<div key={a.name} style={{ marginBottom: 4 }}>
						<CollapsibleSection title={a.name} status={a.effects?.length ? "ok" : "error"} badge={`${a.effects?.length ?? 0}`}>
							<EffectsView effects={a.effects ?? []} />
						</CollapsibleSection>
					</div>
				))}
			</CollapsibleSection>

			<CollapsibleSection title="通用词缀" badge={`${universal.items.length} affixes`}>
				{universal.items.map(a => (
					<div key={a.name} style={{ marginBottom: 4 }}>
						<CollapsibleSection title={a.name} status={a.effects?.length ? "ok" : "error"} badge={`${a.effects?.length ?? 0}`}>
							<EffectsView effects={a.effects ?? []} />
						</CollapsibleSection>
					</div>
				))}
			</CollapsibleSection>
		</div>
	);
}
