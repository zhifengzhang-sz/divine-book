/**
 * Stage 2: Context Listener — Structural Grouping
 *
 * Receives a flat token stream from the reader and groups related
 * tokens by structural context. Knows about text structure (what
 * modifies what) but NOT about game mechanics.
 *
 * Architecture (impl.reactive.md §5):
 *
 *   TokenEvent[] ──group()──▶ GroupEvent[]
 *
 * Five grouping rules:
 *   1. Named state scoping (【name】：opens scope)
 *   2. Modifier attachment (per_hit → nearest primary)
 *   3. Stat aggregation (multiple stats → single buff group)
 *   4. Qualifier propagation (各自 → children target)
 *   5. Affix prefix stripping (first 【name】 is affix name)
 */

import type { TokenEvent } from "./reader.js";

// ── Types ────────────────────────────────────────────────

/** A primary token with its attached modifiers and structural context. */
export interface GroupEvent {
	/** The primary token (damage, cost, buff, state definition, etc.) */
	primary: TokenEvent;
	/** Modifier tokens attached to this primary */
	modifiers: TokenEvent[];
	/** Named state this group is inside, if any */
	parentState?: string;
	/** Scope classification */
	scope: "skill" | "state_def" | "buff_stat" | "modifier";
}

// ── Token Classification ─────────────────────────────────

/** Modifier terms — attach to nearest preceding primary. */
const MODIFIER_TERMS = new Set([
	"per_hit",
	"duration",
	"max_stacks",
	"chance",
	"on_attacked",
	"undispellable",
	"permanent",
	"stack_add",
	"cap_vs_monster",
	"self_equal_heal",
	"cross_skill_accumulation",
	// Note: no_shield_double_damage is a primary effect, not a modifier
	"no_healing_bonus",
	"no_damage_bonus",
	"sequenced_skill",
	"includes_hp_spent",
	"summon_trigger_on_cast",
	"summon_damage_taken",
	"no_shield_fallback",
	"stun_on_dispel",
	"no_buff_double",
	"dot_half_bonus",
	"pre_cast_timing",
	"conditional_cleanse",
	"next_skill_scope",
]);

/** Structure terms — define or reference named states. */
const STRUCTURE_TERMS = new Set(["named_state", "state_ref"]);

/** Stat terms — aggregate into a single self_buff group. */
const STAT_TERMS = new Set([
	"attack_bonus_stat",
	"damage_increase_stat",
	"skill_dmg_increase",
	"damage_reduction_stat",
	"final_dmg_bonus",
	"crit_rate_stat",
	// Note: crit_dmg_bonus is NOT a stat — it's a standalone skill-level effect
	"healing_bonus_stat",
	"defense_bonus_stat",
	"hp_bonus_stat",
]);

function isModifier(term: string): boolean {
	return MODIFIER_TERMS.has(term);
}

function isStructure(term: string): boolean {
	return STRUCTURE_TERMS.has(term);
}

function isStat(term: string): boolean {
	return STAT_TERMS.has(term);
}

function _isPrimary(term: string): boolean {
	return !isModifier(term) && !isStructure(term) && !isStat(term);
}

// ── Grouping Algorithm ───────────────────────────────────

/**
 * Group tokens by structural context.
 *
 * @param tokens - Flat token stream from reader (sorted by position)
 * @param sourceType - "skill" or "affix" (affects prefix handling)
 */
export function group(
	tokens: TokenEvent[],
	_sourceType: "skill" | "affix",
): GroupEvent[] {
	if (tokens.length === 0) return [];

	const groups: GroupEvent[] = [];

	// Separate tokens by role
	const primaries: { token: TokenEvent; index: number }[] = [];
	const modifiers: { token: TokenEvent; index: number }[] = [];
	const stats: { token: TokenEvent; index: number }[] = [];
	const stateEvents: { token: TokenEvent; index: number }[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		if (isModifier(t.term)) {
			modifiers.push({ token: t, index: i });
		} else if (isStat(t.term)) {
			stats.push({ token: t, index: i });
		} else if (isStructure(t.term)) {
			stateEvents.push({ token: t, index: i });
		} else {
			primaries.push({ token: t, index: i });
		}
	}

	// ── Rule 1: Scope from token.scope ───────────────────
	// State scoping comes from the reader's segment splitting (§4.0).
	// Each token has an optional `scope` field set by the segment it
	// was scanned in. No need to compete named_state tokens.
	function findScope(token: TokenEvent): string | undefined {
		return token.scope;
	}

	// ── Rule 2: Modifier attachment ──────────────────────
	// Each modifier attaches to the nearest primary by position.
	// Strategy: for each primary, collect modifiers that are closer
	// to it than to any other primary.

	const usedModifiers = new Set<number>();

	for (const p of primaries) {
		const scope = findScope(p.token);
		const attached: TokenEvent[] = [];

		for (const m of modifiers) {
			if (usedModifiers.has(m.index)) continue;

			// Find the primary this modifier is closest to
			let closestPrimary = p;
			let closestDist = Math.abs(m.token.position - p.token.position);

			for (const other of primaries) {
				if (other === p) continue;
				const dist = Math.abs(m.token.position - other.token.position);
				if (dist < closestDist) {
					closestDist = dist;
					closestPrimary = other;
				}
			}

			if (closestPrimary === p) {
				attached.push(m.token);
				usedModifiers.add(m.index);
			}
		}

		groups.push({
			primary: p.token,
			modifiers: attached,
			parentState: scope,
			scope: scope ? "state_def" : "skill",
		});
	}

	// ── Rule 3: Stat aggregation ─────────────────────────
	// Stats within the same state scope form a single buff group.
	// The primary is a synthetic "self_buff" token.

	if (stats.length > 0) {
		// Group stats by their enclosing scope
		const statsByScope = new Map<string | undefined, TokenEvent[]>();
		for (const s of stats) {
			const scope = findScope(s.token);
			const key = scope ?? "__global__";
			if (!statsByScope.has(key)) statsByScope.set(key, []);
			statsByScope.get(key)?.push(s.token);
		}

		for (const [scopeKey, scopeStats] of statsByScope) {
			const parentState = scopeKey === "__global__" ? undefined : scopeKey;

			// Find the state_ref that contains these stats (for the buff name)
			const stateRef = stateEvents.find(
				(s) =>
					s.token.term === "state_ref" && findScope(s.token) === parentState,
			);
			const buffName = stateRef?.token.captures.name;

			// Create a synthetic primary for the buff
			const syntheticPrimary: TokenEvent = {
				term: "self_buff",
				raw: "",
				captures: buffName ? { name: buffName } : {},
				position: scopeStats[0].position,
			};

			// Collect modifiers in this scope (duration, etc.)
			const buffModifiers: TokenEvent[] = [...scopeStats];
			for (const m of modifiers) {
				if (usedModifiers.has(m.index)) continue;
				if (findScope(m.token) === parentState) {
					buffModifiers.push(m.token);
					usedModifiers.add(m.index);
				}
			}

			groups.push({
				primary: syntheticPrimary,
				modifiers: buffModifiers,
				parentState,
				scope: "buff_stat",
			});
		}
	}

	// ── Emit orphaned modifiers as diagnostics ───────────
	// Modifiers not attached to any primary are silently skipped.
	// The pipeline machine will emit DIAGNOSTIC events for these
	// if needed (detected by checking usedModifiers vs modifiers).

	// Sort groups by primary position to maintain source order
	groups.sort((a, b) => a.primary.position - b.primary.position);

	return groups;
}
