import { T } from "./theme.ts";

export function BookSelector({ books, selected, onSelect }: {
	books: { name: string; school: string }[];
	selected: string;
	onSelect: (name: string) => void;
}) {
	return (
		<select
			value={selected}
			onChange={e => onSelect(e.target.value)}
			style={{
				background: T.panel, color: T.text, border: `1px solid ${T.border}`,
				borderRadius: T.radius, padding: "5px 8px", fontSize: 12,
				fontFamily: T.mono, outline: "none",
			}}
		>
			{books.map(b => <option key={b.name} value={b.name}>{b.name} ({b.school})</option>)}
		</select>
	);
}
