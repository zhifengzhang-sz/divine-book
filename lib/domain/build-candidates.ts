/**
 * Build candidate enumeration — two-layer architecture:
 *
 * Layer 1 (per-slot): Analyze ranked combos for a (platform, function) pair.
 *   Detect the dominance pattern and produce a compact representation:
 *   - "locked": both affixes essential → one combo
 *   - "flexible": one affix fixed, other position is a list of alternatives
 *
 * Layer 2 (set-level): Given per-slot candidates, enumerate valid 6-slot
 *   book sets respecting cross-slot affix uniqueness.
 */

import { FUNCTIONS, enumerateCombos } from "./functions.js";
import { getPlatform } from "./platforms.js";
import type { Combo } from "./functions.js";

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

export interface ThemeSlot {
	platform: string;
	/** Function IDs for scoring (first = primary) */
	functions: string[];
}

export interface Theme {
	id: string;
	name: string;
	alpha: number;
	slots: ThemeSlot[];
}

export const THEMES: Theme[] = [
	{
		id: "all_attack",
		name: "All Attack",
		alpha: 1.0,
		slots: [
			{ platform: "春黎剑阵", functions: ["F_burst"] },
			{ platform: "皓月剑诀", functions: ["F_burst", "F_exploit"] },
			{ platform: "念剑诀", functions: ["F_burst", "F_dot"] },
			{ platform: "千锋聚灵剑", functions: ["F_burst"] },
			{ platform: "玄煞灵影诀", functions: ["F_hp_exploit"] },
			{ platform: "大罗幻诀", functions: ["F_burst"] },
		],
	},
	{
		id: "attack_buff",
		name: "Attack + Buff",
		alpha: 0.8,
		slots: [
			{ platform: "春黎剑阵", functions: ["F_burst"] },
			{ platform: "皓月剑诀", functions: ["F_burst", "F_exploit"] },
			{ platform: "甲元仙符", functions: ["F_buff", "F_sustain"] },
			{ platform: "千锋聚灵剑", functions: ["F_burst"] },
			{ platform: "玄煞灵影诀", functions: ["F_hp_exploit"] },
			{ platform: "念剑诀", functions: ["F_burst", "F_dot"] },
		],
	},
	{
		id: "attack_buff_suppress",
		name: "Attack + Buff + Suppression",
		alpha: 0.6,
		slots: [
			{ platform: "春黎剑阵", functions: ["F_burst"] },
			{ platform: "皓月剑诀", functions: ["F_burst", "F_exploit"] },
			{ platform: "甲元仙符", functions: ["F_buff", "F_sustain"] },
			{ platform: "千锋聚灵剑", functions: ["F_burst", "F_antiheal"] },
			{ platform: "玄煞灵影诀", functions: ["F_hp_exploit", "F_truedmg"] },
			{ platform: "念剑诀", functions: ["F_burst", "F_dot", "F_dr_remove"] },
		],
	},
	{
		id: "attack_survive",
		name: "Attack + Buff + Survive",
		alpha: 0.4,
		slots: [
			{ platform: "春黎剑阵", functions: ["F_burst"] },
			{ platform: "皓月剑诀", functions: ["F_burst", "F_exploit"] },
			{ platform: "甲元仙符", functions: ["F_buff", "F_sustain"] },
			{ platform: "十方真魄", functions: ["F_survive", "F_hp_exploit"] },
			{ platform: "玄煞灵影诀", functions: ["F_hp_exploit", "F_truedmg"] },
			{ platform: "念剑诀", functions: ["F_burst", "F_dot", "F_dr_remove"] },
		],
	},
	{
		id: "all_defense",
		name: "All Defense",
		alpha: 0.0,
		slots: [
			{ platform: "甲元仙符", functions: ["F_buff", "F_sustain"] },
			{ platform: "十方真魄", functions: ["F_survive", "F_buff"] },
			{ platform: "疾风九变", functions: ["F_counter", "F_sustain"] },
			{ platform: "春黎剑阵", functions: ["F_burst"] },
			{ platform: "玄煞灵影诀", functions: ["F_hp_exploit"] },
			{ platform: "皓月剑诀", functions: ["F_burst", "F_exploit"] },
		],
	},
];

// ---------------------------------------------------------------------------
// Layer 1: Per-slot analysis
// ---------------------------------------------------------------------------

/** A scored affix alternative for the flexible position */
export interface FlexAlternative {
	affix: string;
	/** Score of the combo (fixedAffix + this affix) */
	score: number;
}

/** A full combo (both affixes specified) for set-level enumeration */
export interface SlotCombo {
	op1: string;
	op2: string;
	score: number;
}

/**
 * Per-slot analysis result.
 *
 * - "locked": both affixes are essential, only 1 meaningful combo
 * - "flexible": one affix is fixed, the other position has ranked alternatives
 *
 * The `combos` field contains the full combo list for set-level enumeration:
 * for "flexible" slots this includes both with-fixed and without-fixed combos
 * so the set-level DFS can resolve cross-slot conflicts on the fixed affix.
 */
export interface SlotAnalysis {
	slot: number;
	platform: string;
	fn: string;
	kind: "locked" | "flexible";
	/** For "locked": the two affixes */
	lockedOp1?: string;
	lockedOp2?: string;
	lockedScore?: number;
	/** For "flexible": the affix that appears in most top combos */
	fixedAffix?: string;
	/** For "flexible": which position (1 or 2) the fixed affix occupies */
	fixedPosition?: 1 | 2;
	/** For "flexible": ranked alternatives for the other position */
	alternatives?: FlexAlternative[];
	/** Full combo list for set-level enumeration (with-fixed + without-fixed) */
	combos: SlotCombo[];
}

/**
 * Analyze a single slot: rank combos, detect dominance pattern.
 *
 * Looks at the top `topN` combos by score and counts affix frequency.
 * If one affix appears in >= `dominanceThreshold` fraction → "flexible" with
 * that affix fixed and the other position as a list of alternatives.
 * If both top affixes co-dominate → "locked".
 */
export function analyzeSlot(
	platform: string,
	fnId: string,
	topN: number = 20,
	dominanceThreshold: number = 0.6,
	maxAlternatives: number = 10,
): SlotAnalysis | null {
	const plat = getPlatform(platform);
	if (!plat) return null;
	const fn = FUNCTIONS.find((f) => f.id === fnId);
	if (!fn) return null;

	const allCombos = enumerateCombos(fn, plat);
	if (allCombos.length === 0) return null;

	const top = allCombos.slice(0, topN);

	// Count affix frequency across top combos
	const freq = new Map<string, number>();
	for (const c of top) {
		freq.set(c.op1.affix, (freq.get(c.op1.affix) ?? 0) + 1);
		freq.set(c.op2.affix, (freq.get(c.op2.affix) ?? 0) + 1);
	}

	// Find the most frequent affix
	let maxAffix = "";
	let maxCount = 0;
	for (const [affix, count] of freq) {
		if (count > maxCount) {
			maxAffix = affix;
			maxCount = count;
		}
	}

	const dominance = maxCount / top.length;
	const best = top[0];

	// Check if both affixes of the best combo are equally dominant
	const bestOp1Freq = (freq.get(best.op1.affix) ?? 0) / top.length;
	const bestOp2Freq = (freq.get(best.op2.affix) ?? 0) / top.length;
	const bothDominant =
		bestOp1Freq >= dominanceThreshold && bestOp2Freq >= dominanceThreshold;

	if (bothDominant) {
		return {
			slot: 0,
			platform,
			fn: fnId,
			kind: "locked",
			lockedOp1: best.op1.affix,
			lockedOp2: best.op2.affix,
			lockedScore: best.distance,
			combos: [{ op1: best.op1.affix, op2: best.op2.affix, score: best.distance }],
		};
	}

	if (dominance >= dominanceThreshold) {
		// Determine fixed position from best combo
		const fixedPosition: 1 | 2 = best.op1.affix === maxAffix ? 1 : 2;

		// Collect unique alternatives (combos WITH the fixed affix)
		const alternatives: FlexAlternative[] = [];
		const combos: SlotCombo[] = [];
		const seenFlex = new Set<string>();

		for (const c of allCombos) {
			if (alternatives.length >= maxAlternatives) break;

			const hasFixed =
				c.op1.affix === maxAffix || c.op2.affix === maxAffix;
			if (!hasFixed) continue;

			const flexAffix =
				c.op1.affix === maxAffix ? c.op2.affix : c.op1.affix;
			if (seenFlex.has(flexAffix)) continue;
			seenFlex.add(flexAffix);

			alternatives.push({ affix: flexAffix, score: c.distance });
			combos.push({
				op1: fixedPosition === 1 ? maxAffix : flexAffix,
				op2: fixedPosition === 2 ? maxAffix : flexAffix,
				score: c.distance,
			});
		}

		// Collect fallback combos in tiers of decreasing quality.
		// Each tier excludes the dominant affix from the previous tier,
		// ensuring diverse affix coverage for set-level DFS.
		// We need enough tiers so 6 slots can each get 2 unique affixes.
		const excluded = new Set<string>([maxAffix]);
		const perTier = Math.max(3, Math.ceil(maxAlternatives / 2));

		for (let tier = 0; tier < 6; tier++) {
			const tierCombos: Combo[] = [];

			for (const c of allCombos) {
				if (excluded.has(c.op1.affix) || excluded.has(c.op2.affix)) continue;
				tierCombos.push(c);
				if (tierCombos.length >= topN) break;
			}

			if (tierCombos.length === 0) break;

			// Find this tier's dominant affix
			const tierFreq = new Map<string, number>();
			for (const c of tierCombos) {
				tierFreq.set(c.op1.affix, (tierFreq.get(c.op1.affix) ?? 0) + 1);
				tierFreq.set(c.op2.affix, (tierFreq.get(c.op2.affix) ?? 0) + 1);
			}
			let tierDominant = "";
			let tierCount = 0;
			for (const [affix, count] of tierFreq) {
				if (count > tierCount) {
					tierDominant = affix;
					tierCount = count;
				}
			}

			// Add top combos from this tier
			let added = 0;
			const seen = new Set<string>();
			for (const c of tierCombos) {
				if (added >= perTier) break;
				const key = c.op1.affix < c.op2.affix
					? c.op1.affix + "|" + c.op2.affix
					: c.op2.affix + "|" + c.op1.affix;
				if (seen.has(key)) continue;
				seen.add(key);

				combos.push({
					op1: c.op1.affix,
					op2: c.op2.affix,
					score: c.distance,
				});
				added++;
			}

			// Exclude this tier's dominant affix for next tier
			if (tierDominant) excluded.add(tierDominant);
		}

		return {
			slot: 0,
			platform,
			fn: fnId,
			kind: "flexible",
			fixedAffix: maxAffix,
			fixedPosition,
			alternatives,
			combos,
		};
	}

	// No clear dominance — top combos as-is
	const combos: SlotCombo[] = allCombos.slice(0, maxAlternatives).map((c) => ({
		op1: c.op1.affix,
		op2: c.op2.affix,
		score: c.distance,
	}));

	return {
		slot: 0,
		platform,
		fn: fnId,
		kind: "locked",
		lockedOp1: best.op1.affix,
		lockedOp2: best.op2.affix,
		lockedScore: best.distance,
		combos,
	};
}

/** Analyze all slots in a theme */
export function analyzeThemeSlots(
	theme: Theme,
	topN: number = 20,
	maxAlternatives: number = 10,
): SlotAnalysis[] {
	return theme.slots.map((ts, i) => {
		const analysis = analyzeSlot(
			ts.platform, ts.functions[0], topN, 0.6, maxAlternatives,
		);
		if (!analysis) {
			return {
				slot: i + 1,
				platform: ts.platform,
				fn: ts.functions[0],
				kind: "locked" as const,
				combos: [],
			};
		}
		analysis.slot = i + 1;
		return analysis;
	});
}

// ---------------------------------------------------------------------------
// Layer 2: Set-level enumeration
// ---------------------------------------------------------------------------

export interface SlotChoice {
	slot: number;
	platform: string;
	op1: string;
	op2: string;
	score: number;
}

export interface BookSetCandidate {
	theme: string;
	slots: SlotChoice[];
	totalScore: number;
}

/**
 * Enumerate valid book set candidates from per-slot analyses.
 *
 * Cartesian product of each slot's expanded combos, filtered by
 * cross-slot affix uniqueness (no affix used in more than one slot).
 */
export function enumerateSets(
	theme: Theme,
	slotAnalyses: SlotAnalysis[],
	maxSets: number = 100,
): BookSetCandidate[] {
	const results: BookSetCandidate[] = [];
	const current: SlotChoice[] = [];
	const usedAffixes = new Set<string>();

	function dfs(depth: number, totalScore: number): void {
		if (results.length >= maxSets) return;

		if (depth === slotAnalyses.length) {
			results.push({
				theme: theme.id,
				slots: [...current],
				totalScore,
			});
			return;
		}

		const sa = slotAnalyses[depth];

		for (const combo of sa.combos) {
			if (results.length >= maxSets) return;
			if (usedAffixes.has(combo.op1) || usedAffixes.has(combo.op2)) continue;
			if (combo.op1 === combo.op2) continue;

			usedAffixes.add(combo.op1);
			usedAffixes.add(combo.op2);
			current.push({
				slot: sa.slot,
				platform: sa.platform,
				op1: combo.op1,
				op2: combo.op2,
				score: combo.score,
			});

			dfs(depth + 1, totalScore + combo.score);

			current.pop();
			usedAffixes.delete(combo.op1);
			usedAffixes.delete(combo.op2);
		}
	}

	dfs(0, 0);
	results.sort((a, b) => b.totalScore - a.totalScore);
	return results;
}

// ---------------------------------------------------------------------------
// Convenience: full pipeline
// ---------------------------------------------------------------------------

export function enumerateCandidates(
	theme: Theme,
	topN: number = 20,
	maxAlternatives: number = 10,
	maxSets: number = 100,
): BookSetCandidate[] {
	const analyses = analyzeThemeSlots(theme, topN, maxAlternatives);
	return enumerateSets(theme, analyses, maxSets);
}

/** Get a theme by ID */
export function getTheme(id: string): Theme | undefined {
	return THEMES.find((t) => t.id === id);
}
