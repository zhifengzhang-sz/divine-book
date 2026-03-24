import { T } from "./theme.ts";
import { CollapsibleSection } from "./CollapsibleSection.tsx";
import { CodeView } from "./CodeView.tsx";
import { ParseTreeView } from "./ParseTreeView.tsx";
import { EffectsView } from "./EffectsView.tsx";

interface Result { raw: string; error?: string; tree?: object; effects?: object[]; effectError?: string; tiers?: string[] }

export function EntryPointFlow({ name, result }: { name: string; result: Result | null }) {
	if (!result) return null;
	const ok = !result.error && result.tree;
	return <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: T.r, marginBottom: 4, padding: "4px 6px" }}>
		<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
			<span style={{ color: ok ? T.green : T.red, fontSize: 9 }}>{ok ? "✓" : "✗"}</span>
			<span style={{ color: T.gold, fontFamily: T.heading, fontSize: 11 }}>{name}</span>
			{result.error && <span style={{ color: T.red, fontSize: 9, fontFamily: T.mono, marginLeft: "auto" }}>{result.error}</span>}
			{result.tiers && result.tiers.length > 0 && <span style={{ color: T.muted, fontSize: 9, fontFamily: T.mono, marginLeft: "auto" }}>{result.tiers.join(" · ")}</span>}
		</div>
		<CollapsibleSection title="raw text" status="ok"><CodeView code={result.raw} /></CollapsibleSection>
		{result.tree && <CollapsibleSection title="parse tree" status="ok"><ParseTreeView tree={result.tree} /></CollapsibleSection>}
		<CollapsibleSection title="effects" badge={`${result.effects?.length ?? 0}`} status={result.effects?.length ? "ok" : "err"} open>
			{result.effects ? <EffectsView effects={result.effects} /> : <span style={{ color: T.red, fontSize: 10 }}>{result.effectError}</span>}
		</CollapsibleSection>
	</div>;
}
