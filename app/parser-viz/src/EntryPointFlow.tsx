/** One entry point flow: raw text → parse tree → effects.
 *  Reused for skillDescription, primaryAffix, exclusiveAffix. */

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
	const effectsOk = result.effects && result.effects.length > 0;

	return (
		<div style={{ border: `1px solid ${ok ? T.border : T.red}44`, borderRadius: 6, marginBottom: 8, background: T.panel }}>
			{/* Header */}
			<div style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}33`, display: "flex", alignItems: "center", gap: 8 }}>
				<span style={{ color: ok ? T.green : T.red, fontSize: 12, fontWeight: 600 }}>{ok ? "✓" : "✗"}</span>
				<span style={{ color: T.gold, fontFamily: T.heading, fontSize: 13 }}>{name}</span>
				{result.error && <span style={{ color: T.red, fontSize: 10, fontFamily: T.mono }}>{result.error}</span>}
			</div>

			{/* Collapsible sections */}
			<div style={{ padding: "4px 8px" }}>
				<CollapsibleSection title="raw text">
					<CodeView code={result.raw} />
				</CollapsibleSection>

				{result.tree && (
					<CollapsibleSection title="parse tree" badge="CST">
						<ParseTreeView tree={result.tree} />
					</CollapsibleSection>
				)}

				{result.effects && (
					<CollapsibleSection title="effects" badge={`${result.effects.length} effect${result.effects.length !== 1 ? "s" : ""}`} defaultOpen>
						<EffectsView effects={result.effects} />
					</CollapsibleSection>
				)}

				{result.effectError && (
					<div style={{ padding: "4px 8px", color: T.red, fontSize: 11, fontFamily: T.mono }}>
						{result.effectError}
					</div>
				)}
			</div>
		</div>
	);
}
