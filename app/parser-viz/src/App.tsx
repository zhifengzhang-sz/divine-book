import { useEffect, useState } from "react";
import { T, globalCSS } from "./theme.ts";
import { GrammarPanel } from "./GrammarPanel.tsx";
import { EntryPointFlow } from "./EntryPointFlow.tsx";

// ── Types ───────────────────────────────────────────────

type Part = "book" | "exclusive" | "school" | "common";

type Flow = { name: string; raw: string; tree?: object; effects?: object[]; error?: string; effectError?: string; tiers?: string[] };

interface FlowData {
	grammar: string;
	ohmSource: string | null;
	semSource: string | null;
	flows: Flow[];
	allAffixes?: Flow[]; // for school/common: all affixes available for sub-selector
	rawDisplay: string;
}

// ── Data fetching ───────────────────────────────────────

async function fetchBookList(): Promise<{ name: string; school: string }[]> {
	return fetch("/api/books").then(r => r.json());
}

async function fetchSchoolList(): Promise<string[]> {
	return fetch("/api/schools").then(r => r.json());
}

async function fetchFlowData(part: Part, key: string): Promise<FlowData> {
	if (part === "book") {
		const d = await fetch(`/api/book/${encodeURIComponent(key)}`).then(r => r.json());
		const flows = [];
		if (d.skill) flows.push({ name: "skillDescription", ...d.skill, tiers: d.skillTiers });
		if (d.primary) flows.push({ name: "primaryAffix", ...d.primary, tiers: d.primaryTiers });
		const rawParts = [d.skill?.raw ?? ""];
		if (d.primary) rawParts.push("───── 主词缀 ─────", d.primary.raw);
		return { grammar: d.grammar, ohmSource: d.ohmSource, semSource: d.semSource, flows, rawDisplay: rawParts.join("\n") };
	}
	if (part === "exclusive") {
		const d = await fetch(`/api/exclusive/${encodeURIComponent(key)}`).then(r => r.json());
		const flows = d.exclusive ? [{ name: "exclusiveAffix", ...d.exclusive, tiers: d.exclusiveTiers }] : [];
		return { grammar: d.grammar, ohmSource: d.ohmSource, semSource: d.semSource, flows, rawDisplay: d.exclusive?.raw ?? "" };
	}
	if (part === "school") {
		const d = await fetch(`/api/school/${encodeURIComponent(key)}`).then(r => r.json());
		const allAffixes: Flow[] = (d.affixes ?? []).map((a: any) => ({ name: a.name, ...a }));
		const first = allAffixes[0];
		return { grammar: d.grammar, ohmSource: d.ohmSource, semSource: d.semSource, flows: first ? [first] : [], allAffixes, rawDisplay: first?.raw ?? "" };
	}
	// common
	const d = await fetch("/api/common").then(r => r.json());
	const allAffixes: Flow[] = (d.affixes ?? []).map((a: any) => ({ name: a.name, ...a }));
	const first = allAffixes[0];
	return { grammar: d.grammar, ohmSource: d.ohmSource, semSource: d.semSource, flows: first ? [first] : [], allAffixes, rawDisplay: first?.raw ?? "" };
}

// ── App ─────────────────────────────────────────────────

export function App() {
	const [books, setBooks] = useState<{ name: string; school: string }[]>([]);
	const [schools, setSchools] = useState<string[]>([]);
	const [part, setPart] = useState<Part>("book");
	const [key, setKey] = useState("");
	const [affixKey, setAffixKey] = useState("");
	const [data, setData] = useState<FlowData | null>(null);

	// Load lists
	useEffect(() => { fetchBookList().then(setBooks); fetchSchoolList().then(setSchools); }, []);

	// Auto-select first key when part or lists change
	useEffect(() => {
		if (part === "book" || part === "exclusive") {
			if (books.length) setKey(books[0].name);
		} else if (part === "school") {
			if (schools.length) setKey(schools[0]);
		} else {
			setKey("common");
		}
	}, [part, books, schools]);

	// Fetch data when key changes
	useEffect(() => {
		if (!key) return;
		fetchFlowData(part, key).then(d => {
			setData(d);
			if (d.allAffixes?.length) setAffixKey(d.allAffixes[0].name);
			else setAffixKey("");
		});
	}, [part, key]);

	// When affix selector changes, update displayed flow
	const displayData = data && data.allAffixes && affixKey
		? { ...data, flows: data.allAffixes.filter(a => a.name === affixKey), rawDisplay: data.allAffixes.find(a => a.name === affixKey)?.raw ?? "" }
		: data;

	// Selector options based on part
	const options = part === "book" || part === "exclusive"
		? books.map(b => ({ value: b.name, label: `${b.name} (${b.school})` }))
		: part === "school"
		? schools.map(s => ({ value: s, label: s }))
		: [];

	return (
		<div style={appStyle}>
			<style>{globalCSS}</style>

			{/* Left sidebar */}
			<div style={sidebarStyle}>
				<div style={{ fontFamily: T.heading, fontSize: 14, color: T.goldBright, marginBottom: 12 }}>灵書 Parser</div>

				{/* Part selector */}
				<div style={{ marginBottom: 12 }}>
					{(["book", "exclusive", "school", "common"] as Part[]).map(p => (
						<label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "2px 0", fontSize: 11, color: part === p ? T.goldBright : T.text }}>
							<input type="radio" name="part" checked={part === p} onChange={() => setPart(p)} style={{ accentColor: T.gold }} />
							{{ book: "① Main Book", exclusive: "② Exclusive", school: "③ School", common: "④ Common" }[p]}
						</label>
					))}
				</div>

				<div style={dividerStyle} />

				{/* Sub-selector */}
				{options.length > 0 && (
					<div style={{ marginBottom: 12 }}>
						<div style={labelStyle}>{{ book: "Book", exclusive: "Book", school: "School", common: "" }[part]}:</div>
						<select value={key} onChange={e => setKey(e.target.value)} style={selectStyle}>
							{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</div>
				)}

				{/* Affix sub-selector (school + common) */}
				{data?.allAffixes && data.allAffixes.length > 0 && (
					<div style={{ marginBottom: 12 }}>
						<div style={labelStyle}>Affix:</div>
						<select value={affixKey} onChange={e => setAffixKey(e.target.value)} style={selectStyle}>
							{data.allAffixes.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
						</select>
					</div>
				)}

				<div style={dividerStyle} />

				{/* Raw text display */}
				<div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
					<div style={labelStyle}>Raw text:</div>
					<div style={rawTextStyle}>{displayData?.rawDisplay ?? ""}</div>
				</div>
			</div>

			{/* Main area */}
			<div style={mainStyle}>
				{displayData ? (
					<>
						<GrammarPanel name={displayData.grammar} ohm={displayData.ohmSource} sem={displayData.semSource} />
						{displayData.flows.map(f => <EntryPointFlow key={f.name} name={f.name} result={f} />)}
					</>
				) : (
					<div style={{ color: T.muted, fontFamily: T.heading, fontSize: 13, padding: 20 }}>Loading...</div>
				)}
			</div>
		</div>
	);
}

// ── Styles ──────────────────────────────────────────────

const appStyle: React.CSSProperties = {
	height: "100vh", display: "flex", overflow: "hidden",
};

const sidebarStyle: React.CSSProperties = {
	width: 260, flexShrink: 0, padding: "12px 14px",
	background: T.panelHi, borderRight: `1px solid ${T.border}`,
	display: "flex", flexDirection: "column", overflow: "hidden",
};

const mainStyle: React.CSSProperties = {
	flex: 1, padding: "12px 16px", overflow: "auto",
};

const dividerStyle: React.CSSProperties = {
	height: 1, background: T.border, marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
	color: T.muted, fontSize: 10, fontFamily: T.mono, marginBottom: 4,
};

const selectStyle: React.CSSProperties = {
	width: "100%", background: T.panel, color: T.text,
	border: `1px solid ${T.border}`, borderRadius: T.r,
	padding: "4px 6px", fontSize: 11, fontFamily: T.mono, outline: "none",
};

const rawTextStyle: React.CSSProperties = {
	flex: 1, overflow: "auto", padding: 8,
	background: "#0a0a08", borderRadius: T.r, border: `1px solid ${T.border}`,
	fontFamily: T.mono, fontSize: 10.5, lineHeight: 1.5,
	color: T.text, whiteSpace: "pre-wrap",
};
