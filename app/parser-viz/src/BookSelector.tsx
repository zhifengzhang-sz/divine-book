/** Dropdown to select a book. */

import { T } from "./theme.ts";

export function BookSelector({ books, selected, onSelect }: {
	books: { name: string; school: string }[];
	selected: string;
	onSelect: (name: string) => void;
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
			<label style={{ color: T.gold, fontFamily: T.heading, fontSize: 13 }}>Book:</label>
			<select
				value={selected}
				onChange={e => onSelect(e.target.value)}
				style={{
					background: T.panel, color: T.text, border: `1px solid ${T.border}`,
					borderRadius: 4, padding: "6px 10px", fontSize: 13, fontFamily: T.mono,
					minWidth: 250,
				}}
			>
				{books.map(b => (
					<option key={b.name} value={b.name}>{b.name} ({b.school})</option>
				))}
			</select>
		</div>
	);
}
