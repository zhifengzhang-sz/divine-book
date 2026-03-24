import { T } from "./theme.ts";
import { CollapsibleSection } from "./CollapsibleSection.tsx";
import { CodeView } from "./CodeView.tsx";

export function GrammarPanel({ name, ohmSource, semSource }: {
	name: string;
	ohmSource: string | null;
	semSource: string | null;
}) {
	return (
		<div style={{ background: T.panel, border: `1px solid ${T.borderLight}`, borderRadius: T.radius, marginBottom: 8, padding: "6px 8px" }}>
			<div style={{ color: T.gold, fontFamily: T.heading, fontSize: 12, marginBottom: 4 }}>
				{name}
			</div>
			<CollapsibleSection title={`${name}.ohm`} badge="grammar">
				<CodeView code={ohmSource ?? `// not found`} />
			</CollapsibleSection>
			<CollapsibleSection title={`${name}.ts`} badge="semantics">
				<CodeView code={semSource ?? `// not found`} />
			</CollapsibleSection>
		</div>
	);
}
