/** Parser Pipeline Visualizer — one book, one grammar, three entry points. */

import { useEffect, useState } from "react";
import { T } from "./theme.ts";
import { BookSelector } from "./BookSelector.tsx";
import { GrammarPanel } from "./GrammarPanel.tsx";
import { EntryPointFlow } from "./EntryPointFlow.tsx";

interface BookData {
	name: string;
	school: string;
	ohmSource: string | null;
	semSource: string | null;
	skill: object | null;
	primary: object | null;
	exclusive: object | null;
}

export function App() {
	const [books, setBooks] = useState<{ name: string; school: string }[]>([]);
	const [selected, setSelected] = useState("");
	const [data, setData] = useState<BookData | null>(null);

	// Load book list
	useEffect(() => {
		fetch("/api/books").then(r => r.json()).then((list: { name: string; school: string }[]) => {
			setBooks(list);
			if (list.length > 0) setSelected(list[0].name);
		});
	}, []);

	// Load book data when selection changes
	useEffect(() => {
		if (!selected) return;
		fetch(`/api/book/${encodeURIComponent(selected)}`)
			.then(r => r.json())
			.then(setData);
	}, [selected]);

	return (
		<div style={container}>
			<style>{css}</style>
			<h1 style={title}>Parser Pipeline Visualizer</h1>

			<BookSelector books={books} selected={selected} onSelect={setSelected} />

			{data && (
				<div style={{ flex: 1, overflow: "auto" }}>
					<GrammarPanel name={data.name} ohmSource={data.ohmSource} semSource={data.semSource} />

					<EntryPointFlow name="skillDescription" result={data.skill as any} />
					<EntryPointFlow name="primaryAffix" result={data.primary as any} />
					<EntryPointFlow name="exclusiveAffix" result={data.exclusive as any} />
				</div>
			)}
		</div>
	);
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { overflow: hidden; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: #5c403388; border-radius: 3px; }
`;

const container: React.CSSProperties = {
	height: "100vh", width: "100vw",
	background: T.bg, color: T.text,
	display: "flex", flexDirection: "column",
	padding: 16, overflow: "hidden",
};

const title: React.CSSProperties = {
	fontFamily: T.heading, fontSize: 18, color: T.gold,
	textShadow: `0 0 10px ${T.goldDark}88`,
	marginBottom: 12,
};
