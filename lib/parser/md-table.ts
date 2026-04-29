/**
 * Layer 1: Markdown Table Reader
 *
 * Parses raw markdown tables in 主书.md.
 * Most schools have `| 功法书 | 功能 | 主词缀 |` (3 columns).
 * 剑修 has `| 功法书 | 功能 | 通玄 | 主词缀 |` (4 columns).
 */

export interface RawBookEntry {
	name: string;
	school: string;
	skillText: string;
	affixText: string;
	xuanText: string;
}

export const SCHOOL_MAP: Record<string, string> = {
	剑修: "Sword",
	法修: "Spell",
	魔修: "Demon",
	体修: "Body",
};

/**
 * Parse 主书.md into per-book raw entries.
 */
export function readMainSkillTables(markdown: string): RawBookEntry[] {
	const lines = markdown.split("\n");
	const entries: RawBookEntry[] = [];
	let currentSchool = "";

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Detect school headers: #### 剑修 / 法修 / 魔修 / 体修
		const schoolMatch = line.match(/^####\s+(剑修|法修|魔修|体修)/);
		if (schoolMatch) {
			currentSchool = SCHOOL_MAP[schoolMatch[1]];
			continue;
		}

		// Detect table header row
		if (!currentSchool) continue;
		if (!/^\|\s*功法书\s*\|/.test(line)) continue;

		// Detect 4-column table (Sword: 功法书 | 功能 | 通玄 | 主词缀)
		// vs 3-column table (others: 功法書 | 功能 | 通玄) — labeled 主词缀 but is 通玄
		const hasSeparateAffix = line.split("|").length - 2 >= 4;

		// Skip separator row
		i += 2;

		// Read data rows
		while (i < lines.length && lines[i].startsWith("|")) {
			const cells = lines[i]
				.split("|")
				.slice(1, -1)
				.map((c) => c.trim());

			if (cells.length >= 2) {
				const name = cells[0].replace(/`/g, "").trim();
				const skillText = cells[1] || "";
				const xuanText = cells[2] || "";
				const affixText = hasSeparateAffix ? (cells[3] || "") : "";

				if (name) {
					entries.push({
						name,
						school: currentSchool,
						skillText,
						xuanText,
						affixText,
					});
				}
			}
			i++;
		}
	}

	return entries;
}

export interface SplitCell {
	description: string[];
	tiers: TierLine[];
}

export interface TierLine {
	raw: string;
	enlightenment?: number;
	fusion?: number;
	locked?: boolean;
	vars: Record<string, number>;
}

/**
 * Split a cell's text on <br> into description lines and tier lines.
 * Tier lines contain variable assignments like x=1500, y=11.
 */
export function splitCell(text: string): SplitCell {
	if (!text.trim()) return { description: [], tiers: [] };

	const parts = text.split(/<br\s*\/?>/).map((p) => p.trim());
	const description: string[] = [];
	const tiers: TierLine[] = [];

	for (const part of parts) {
		if (!part) continue;

		const tierMatch = parseTierLine(part);
		if (tierMatch) {
			tiers.push(tierMatch);
		} else {
			description.push(part);
		}
	}

	return { description, tiers };
}

/**
 * Try to parse a line as a tier specification.
 * Returns null if it's not a tier line.
 */
function parseTierLine(line: string): TierLine | null {
	// Check for locked tiers: "悟0境，此功能未解锁" / "悟0境，此词缀未解锁" / "悟0境，融合40重：此词缀未解锁"
	const lockedMatch = line.match(/悟(\d+)境[，,](?:融合(\d+)重[，,：:])?此(?:功能|词缀)未解锁/);
	if (lockedMatch) {
		return {
			raw: line,
			enlightenment: Number(lockedMatch[1]),
			fusion: lockedMatch[2] ? Number(lockedMatch[2]) : undefined,
			locked: true,
			vars: {},
		};
	}

	// Try to extract variables: look for x=1500 patterns
	const varPattern = /([a-zA-Z]\w*)\s*=\s*(-?\d+(?:\.\d+)?)/g;
	const vars: Record<string, number> = {};
	let match: RegExpExecArray | null = varPattern.exec(line);
	while (match !== null) {
		vars[match[1]] = Number(match[2]);
		match = varPattern.exec(line);
	}

	if (Object.keys(vars).length === 0) return null;

	// Extract progression qualifiers
	let enlightenment: number | undefined;
	let fusion: number | undefined;

	const enMatch = line.match(/悟(\d+)境/);
	if (enMatch) enlightenment = Number(enMatch[1]);

	const fuMatch = line.match(/融合(\d+)重/);
	if (fuMatch) fusion = Number(fuMatch[1]);

	// Handle "融合重数>=50" style
	const fuGteMatch = line.match(/融合重数>=(\d+)/);
	if (fuGteMatch) fusion = Number(fuGteMatch[1]);

	return { raw: line, enlightenment, fusion, vars };
}
