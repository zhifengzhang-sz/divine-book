/** Shows the grammar (.ohm) and semantics (.ts) for the selected book. */

import { CollapsibleSection } from "./CollapsibleSection.tsx";
import { CodeView } from "./CodeView.tsx";

export function GrammarPanel({ name, ohmSource, semSource }: {
	name: string;
	ohmSource: string | null;
	semSource: string | null;
}) {
	return (
		<div style={{ marginBottom: 8 }}>
			<CollapsibleSection title={`${name}.ohm`} badge="grammar">
				<CodeView code={ohmSource ?? `// not found: ${name}.ohm`} />
			</CollapsibleSection>
			<CollapsibleSection title={`${name}.ts`} badge="semantics">
				<CodeView code={semSource ?? `// not found: ${name}.ts`} />
			</CollapsibleSection>
		</div>
	);
}
