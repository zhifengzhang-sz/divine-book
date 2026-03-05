/**
 * @deprecated Groups are now derived from the TypeScript registry
 * (lib/domain/registry.ts). This parser is kept for reference only.
 *
 * Parser: keyword.map.md -> effect group classification
 *
 * Pure library — no side effects. Extracts the §0–§13 section structure
 * from keyword.map.md and maps each effect type to its group.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EffectGroup {
	id: string;
	section: string;
	label: string;
	types: string[];
}

export interface GroupsOutput {
	groups: EffectGroup[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert section label to snake_case id: "Base Damage" → "base_damage" */
function toId(label: string): string {
	return label
		.replace(/\(.*?\)/g, "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_|_$/g, "");
}

/** Extract effect type names from backtick-quoted first column of a table */
function extractTypesFromTable(lines: string[], start: number): string[] {
	const types: string[] = [];
	// Skip header and separator lines
	for (let i = start + 2; i < lines.length; i++) {
		const line = lines[i];
		if (!line.startsWith("|")) break;
		const firstCell = line.split("|")[1]?.trim() ?? "";
		const match = firstCell.match(/`([a-z_]+)`/);
		if (match) types.push(match[1]);
	}
	return types;
}

// ---------------------------------------------------------------------------
// Main parse
// ---------------------------------------------------------------------------

export function parseGroups(markdown: string): GroupsOutput {
	const lines = markdown.split("\n");
	const groups: EffectGroup[] = [];
	const seen = new Set<string>();
	let current: EffectGroup | null = null;

	const addType = (t: string) => {
		if (current && !seen.has(t)) {
			current.types.push(t);
			seen.add(t);
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Match §N. or §Nb. Group Name (## level) — but stop at non-§ sections
		const sectionMatch = line.match(/^## (§\d+[a-z]?)\.\s+(.+?)(?:\s*\{.*\})?\s*$/);
		if (sectionMatch) {
			const [, section, label] = sectionMatch;
			current = { id: toId(label), section, label: label.trim(), types: [] };
			groups.push(current);
			continue;
		}

		// Match §N.M Sub-group (### level) — types go into parent group
		if (/^### §\d+\.\d+/.test(line)) continue;

		// Stop at non-§ sections (Condition Vocabulary, Data State, etc.)
		if (/^## [^§]/.test(line)) {
			current = null;
			continue;
		}

		// Extract types from tables within current group
		if (current && /^\| (Effect Type|效果类型)/.test(line)) {
			for (const t of extractTypesFromTable(lines, i)) addType(t);
		}

		// Extract child effect types from blockquote keyword lists.
		// Pattern: `> - \`Chinese{x}%\` → \`type\`` (§13.5 random effect options)
		// The `{x}` or `{x}%` in the Chinese pattern distinguishes these from
		// field-name arrows (§11 stat fields, §12 debuff targets) which have
		// no value placeholder.
		if (current) {
			const arrowMatch = line.match(
				/^>\s*-\s*`[^`]*\{[^}]+\}[^`]*`\s*→\s*`([a-z_]+)`/,
			);
			if (arrowMatch) addType(arrowMatch[1]);
		}
	}

	return { groups };
}
