import { useEffect, useState } from "react";
import { T, globalCSS } from "./theme.ts";
import { SectionHeader, Select } from "./SectionHeader.tsx";
import { GrammarPanel } from "./GrammarPanel.tsx";
import { EntryPointFlow } from "./EntryPointFlow.tsx";

// ── Data fetching hooks ─────────────────────────────────

function useBookList() {
	const [books, setBooks] = useState<{ name: string; school: string }[]>([]);
	useEffect(() => { fetch("/api/books").then(r => r.json()).then(setBooks); }, []);
	return books;
}

function useSchoolList() {
	const [schools, setSchools] = useState<string[]>([]);
	useEffect(() => { fetch("/api/schools").then(r => r.json()).then(setSchools); }, []);
	return schools;
}

function useFetch<T>(url: string | null) {
	const [data, setData] = useState<T | null>(null);
	useEffect(() => {
		if (!url) { setData(null); return; }
		fetch(url).then(r => r.json()).then(setData);
	}, [url]);
	return data;
}

// ── Section 1: Main Book ────────────────────────────────

function MainBookSection({ books }: { books: { name: string; school: string }[] }) {
	const [sel, setSel] = useState("");
	useEffect(() => { if (books.length && !sel) setSel(books[0].name); }, [books]);
	const data = useFetch<any>(sel ? `/api/book/${encodeURIComponent(sel)}` : null);

	return <section style={sectionStyle}>
		<SectionHeader title="① Main Book">
			<Select value={sel} onChange={setSel} options={books.map(b => ({ value: b.name, label: `${b.name} (${b.school})` }))} />
		</SectionHeader>
		{data && <>
			<GrammarPanel name={data.grammar} ohm={data.ohmSource} sem={data.semSource} />
			<EntryPointFlow name="skillDescription" result={data.skill ? { ...data.skill, tiers: data.skillTiers } : null} />
			<EntryPointFlow name="primaryAffix" result={data.primary ? { ...data.primary, tiers: data.primaryTiers } : null} />
		</>}
	</section>;
}

// ── Section 2: Exclusive Affix ──────────────────────────

function ExclusiveSection({ books }: { books: { name: string; school: string }[] }) {
	const [sel, setSel] = useState("");
	useEffect(() => { if (books.length && !sel) setSel(books[0].name); }, [books]);
	const data = useFetch<any>(sel ? `/api/exclusive/${encodeURIComponent(sel)}` : null);

	return <section style={sectionStyle}>
		<SectionHeader title="② Exclusive Affix">
			<Select value={sel} onChange={setSel} options={books.map(b => ({ value: b.name, label: `${b.name} (${b.school})` }))} />
		</SectionHeader>
		{data && <>
			<GrammarPanel name={data.grammar} ohm={data.ohmSource} sem={data.semSource} />
			<EntryPointFlow name="exclusiveAffix" result={data.exclusive ? { ...data.exclusive, tiers: data.exclusiveTiers } : null} />
		</>}
	</section>;
}

// ── Section 3: School Affix ─────────────────────────────

function SchoolSection({ schools }: { schools: string[] }) {
	const [sel, setSel] = useState("");
	useEffect(() => { if (schools.length && !sel) setSel(schools[0]); }, [schools]);
	const data = useFetch<any>(sel ? `/api/school/${encodeURIComponent(sel)}` : null);

	return <section style={sectionStyle}>
		<SectionHeader title="③ School Affix">
			<Select value={sel} onChange={setSel} options={schools.map(s => ({ value: s, label: s }))} />
		</SectionHeader>
		{data && <>
			<GrammarPanel name={data.grammar} ohm={data.ohmSource} sem={data.semSource} />
			{data.affixes?.map((a: any) => <EntryPointFlow key={a.name} name={a.name} result={a} />)}
		</>}
	</section>;
}

// ── Section 4: Common Affix ─────────────────────────────

function CommonSection() {
	const data = useFetch<any>("/api/common");

	return <section style={sectionStyle}>
		<SectionHeader title="④ Common Affix" />
		{data && <>
			<GrammarPanel name={data.grammar} ohm={data.ohmSource} sem={data.semSource} />
			{data.affixes?.map((a: any) => <EntryPointFlow key={a.name} name={a.name} result={a} />)}
		</>}
	</section>;
}

// ── App ─────────────────────────────────────────────────

export function App() {
	const books = useBookList();
	const schools = useSchoolList();

	return <div style={{ minHeight: "100vh", color: T.text, padding: "12px 20px" }}>
		<style>{globalCSS}</style>
		<h1 style={{ fontFamily: T.heading, fontSize: 16, color: T.goldBright, marginBottom: 16 }}>灵書 Parser Visualizer</h1>
		<MainBookSection books={books} />
		<ExclusiveSection books={books} />
		<SchoolSection schools={schools} />
		<CommonSection />
	</div>;
}

const sectionStyle: React.CSSProperties = { marginBottom: 24 };
