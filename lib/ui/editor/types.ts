/** Data types for the divine-book editor plugin. */

export interface RawAffixData {
	text: string;
	effects: object[];
}

export interface RawBookData {
	school: string;
	skill: { text: string; effects: object[] };
	primaryAffix?: { name: string; text: string; effects: object[] };
	exclusiveAffix?: { name: string; text: string; effects: object[] };
	xuan?: { text: string; effects: object[] };
}

export interface EditorData {
	version: number;
	books: Record<string, RawBookData>;
	affixes: {
		universal: Record<string, RawAffixData>;
		school: Record<string, Record<string, RawAffixData>>;
	};
}
