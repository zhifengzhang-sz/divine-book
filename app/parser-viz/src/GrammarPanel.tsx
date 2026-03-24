import { CollapsibleSection } from "./CollapsibleSection.tsx";
import { CodeView } from "./CodeView.tsx";
export function GrammarPanel({ name, ohm, sem }: { name: string; ohm: string | null; sem: string | null }) {
	return <div style={{ marginBottom: 6 }}>
		<CollapsibleSection title={`${name}.ohm`} badge="grammar"><CodeView code={ohm ?? "// not found"} /></CollapsibleSection>
		<CollapsibleSection title={`${name}.ts`} badge="semantics"><CodeView code={sem ?? "// not found"} /></CollapsibleSection>
	</div>;
}
