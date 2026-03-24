import { T } from "./theme.ts";
import { CollapsibleSection } from "./CollapsibleSection.tsx";
import { CodeView } from "./CodeView.tsx";
import { ParseTreeView } from "./ParseTreeView.tsx";
import { EffectsView } from "./EffectsView.tsx";

interface ParseResult {
	raw: string;
	error?: string;
	tree?: object;
	effects?: object[];
	effectError?: string;
}

export function EntryPointFlow({ name, result }: { name: string; result: ParseResult | null }) {
	if (!result) return null;
	const ok = !result.error && result.tree;
	return (
		<div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: T.radius, marginBottom: 6, padding: "6px 8px" }}>
			<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
				<span style={{ color: ok ? T.green : T.red, fontSize: 10 }}>{ok ? "✓" : "✗"}</span>
				<span style={{ color: T.gold, fontFamily: T.heading, fontSize: 11.5 }}>{name}</span>
				{result.error && <span style={{ color: T.red, fontSize: 9.5, fontFamily: T.mono, marginLeft: "auto" }}>{result.error}</span>}
			</div>
			<CollapsibleSection title="raw text" status="ok">
				<CodeView code={result.raw} />
			</CollapsibleSection>
			{result.tree && (
				<CollapsibleSection title="parse tree" status="ok">
					<ParseTreeView tree={result.tree} />
				</CollapsibleSection>
			)}
			<CollapsibleSection title="effects" badge={`${result.effects?.length ?? 0}`} status={result.effects?.length ? "ok" : "error"} defaultOpen>
				{result.effects ? <EffectsView effects={result.effects} /> : <span style={{ color: T.red, fontSize: 10.5 }}>{result.effectError}</span>}
			</CollapsibleSection>
		</div>
	);
}
