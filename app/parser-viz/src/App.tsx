import { useEffect, useState } from "react";
import { T, css } from "./theme.ts";
import { BookSelector } from "./BookSelector.tsx";
import { GrammarPanel } from "./GrammarPanel.tsx";
import { EntryPointFlow } from "./EntryPointFlow.tsx";
import { SharedAffixes } from "./SharedAffixes.tsx";

interface BookData {
	name: string;
	school: string;
	ohmSource: string | null;
	semSource: string | null;
	skill: any;
	primary: any;
	exclusive: any;
	schoolAffixes: any;
	universalAffixes: any;
}

export function App() {
	const [books, setBooks] = useState<{ name: string; school: string }[]>([]);
	const [selected, setSelected] = useState("");
	const [data, setData] = useState<BookData | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		fetch("/api/books").then(r => r.json()).then((list: any[]) => {
			setBooks(list);
			if (list.length > 0) setSelected(list[0].name);
		});
	}, []);

	useEffect(() => {
		if (!selected) return;
		setLoading(true);
		fetch(`/api/book/${encodeURIComponent(selected)}`)
			.then(r => r.json())
			.then(d => { setData(d); setLoading(false); });
	}, [selected]);

	return (
		<div style={{ height: "100vh", width: "100vw", background: T.bgGrad, display: "flex", flexDirection: "column", overflow: "hidden" }}>
			<style>{css}</style>

			{/* Header */}
			<div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
				<span style={{ fontFamily: T.heading, fontSize: 15, color: T.goldBright }}>灵書 Parser</span>
				<BookSelector books={books} selected={selected} onSelect={setSelected} />
				{loading && <span style={{ color: T.muted, fontSize: 10 }}>loading...</span>}
				{data && <span style={{ color: T.muted, fontSize: 10, fontFamily: T.mono }}>{data.school}</span>}
			</div>

			{data && (
				<div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

					{/* Left column: grammar + per-book entry points */}
					<div style={{ flex: 1, padding: "12px 12px 12px 20px", overflow: "auto" }}>
						<GrammarPanel name={data.name} ohmSource={data.ohmSource} semSource={data.semSource} />

						<div style={{ color: T.muted, fontSize: 10, fontFamily: T.heading, margin: "8px 0 4px", borderBottom: `1px solid ${T.border}33`, paddingBottom: 2 }}>
							Entry Points
						</div>
						<EntryPointFlow name="skillDescription" result={data.skill} />
						<EntryPointFlow name="primaryAffix" result={data.primary} />
						<EntryPointFlow name="exclusiveAffix" result={data.exclusive} />
					</div>

					{/* Right column: shared affixes */}
					<div style={{ width: 340, padding: "12px 20px 12px 12px", overflow: "auto", borderLeft: `1px solid ${T.border}` }}>
						<SharedAffixes school={data.schoolAffixes} universal={data.universalAffixes} />
					</div>

				</div>
			)}
		</div>
	);
}
