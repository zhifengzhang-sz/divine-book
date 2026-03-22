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

import type { StateDef } from "../data/types.js";
import type { StateInfo, TokenEvent } from "./reader.js";

// ── Types ────────────────────────────────────────────────

export type StateRegistry = Record<string, StateDef>;

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

/** Result of group(): groups + state registry. */
export interface GroupResult {
	groups: GroupEvent[];
	states: StateRegistry;
}

/**
 * Group tokens by structural context and build state registry.
 *
 * @param tokens - Flat token stream from reader (sorted by position)
 * @param sourceType - "skill" or "affix" (affects prefix handling)
 * @param stateInfos - State info from boundary splitting (name + target)
 */
export function group(
	tokens: TokenEvent[],
	_sourceType: "skill" | "affix",
	_stateInfos?: StateInfo[],
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

/**
 * Group tokens and build state registry from tokens + stateInfos.
 * This is the full context listener output — replaces buildStateRegistry().
 */
export function groupWithStates(
	tokens: TokenEvent[],
	sourceType: "skill" | "affix",
	stateInfos: StateInfo[],
): GroupResult {
	const groups = group(tokens, sourceType, stateInfos);
	const states = buildStatesFromTokens(tokens, stateInfos);
	return { groups, states };
}

/**
 * Build a StateRegistry from tokens + stateInfos.
 * Replaces buildStateRegistry() from states.ts.
 *
 * State metadata comes from:
 *   - stateInfos: name, target (from boundary splitting preText)
 *   - tokens with scope: duration, max_stacks, on_attacked,
 *     undispellable, permanent, chance, per_hit + stack_add
 *   - state_ref tokens: for state creation and children detection
 */
function buildStatesFromTokens(
	tokens: TokenEvent[],
	stateInfos: StateInfo[],
): StateRegistry {
	const states: StateRegistry = {};

	// Create state entries from boundary info
	for (const info of stateInfos) {
		const target = info.target;

		// Collect modifier tokens within this scope
		const scopedTokens = tokens.filter((t) => t.scope === info.name);
		const allScopeTerms = scopedTokens.map((t) => t.term);

		// Duration
		let duration: number | "permanent" = 0;
		const durToken = scopedTokens.find((t) => t.term === "duration");
		if (durToken) duration = Number(durToken.captures.value);
		// Also check for permanent in this scope
		if (allScopeTerms.includes("permanent")) duration = "permanent";
		// Check for permanent in the pre-boundary text
		if (info.preText.includes("战斗状态内永久生效")) duration = "permanent";
		// Check for duration in pre-boundary text (e.g., "持续存在20秒的【灵鹤】")
		if (duration === 0) {
			const preTextDur = info.preText.match(/持续(?:存在)?(\d+(?:\.\d+)?)秒/);
			if (preTextDur) duration = Number(preTextDur[1]);
		}

		// Also check tokens without scope that mention duration near a state_ref
		// for this state (e.g., "持续8秒" after "添加【name】")
		if (duration === 0) {
			// Find state_ref for this name in unscoped tokens
			const stateRefIdx = tokens.findIndex(
				(t) =>
					t.term === "state_ref" && t.captures.name === info.name && !t.scope,
			);
			if (stateRefIdx >= 0) {
				// Look for duration token nearby (after the state_ref)
				for (
					let i = stateRefIdx + 1;
					i < tokens.length && i < stateRefIdx + 5;
					i++
				) {
					if (tokens[i].term === "duration" && !tokens[i].scope) {
						duration = Number(tokens[i].captures.value);
						break;
					}
					if (tokens[i].term === "permanent" && !tokens[i].scope) {
						duration = "permanent";
						break;
					}
				}
			}
		}

		// Max stacks
		let max_stacks: number | undefined;
		let _max_stacks_var: string | undefined;
		const stackToken = scopedTokens.find((t) => t.term === "max_stacks");
		if (stackToken) {
			// Skip if "各自" qualifier — applies to children, not self
			if (stackToken.captures.qualifier !== "各自") {
				const val = Number(stackToken.captures.value);
				if (!Number.isNaN(val)) {
					max_stacks = val;
				} else {
					_max_stacks_var = stackToken.captures.value;
				}
			}
		}
		// Also check pre-boundary text for max_stacks (e.g., "上限1层")
		// Skip if preceded by "各自" (applies to children, not this state)
		if (max_stacks === undefined && !_max_stacks_var) {
			const preStackMatch = info.preText.match(
				/(?<!各自)(?:最多叠加|上限)(\w+)层/,
			);
			if (preStackMatch) {
				const val = Number(preStackMatch[1]);
				if (!Number.isNaN(val)) max_stacks = val;
				else _max_stacks_var = preStackMatch[1];
			}
		}

		// Trigger
		let trigger: "on_cast" | "on_attacked" | "per_tick" | undefined;
		if (allScopeTerms.includes("on_attacked")) trigger = "on_attacked";
		// Also check preText for on_attacked context
		if (/受到(?:伤害|攻击|神通攻击)时/.test(info.preText))
			trigger = "on_attacked";
		// Check compound tokens that imply on_attacked trigger
		if (
			!trigger &&
			scopedTokens.some(
				(t) =>
					t.term === "counter_debuff" ||
					t.term === "counter_buff_heal" ||
					t.term === "counter_buff_reflect",
			)
		) {
			trigger = "on_attacked";
		}

		// Chance — only from scoped tokens, not preText
		// (preText may contain parent scope's chance for child boundaries)
		let chance: number | undefined;
		const chanceToken = scopedTokens.find((t) => t.term === "chance");
		if (chanceToken) chance = Number(chanceToken.captures.value);
		// Check counter_debuff captures for chance (within this scope)
		if (!chance) {
			const cdToken = scopedTokens.find(
				(t) => t.term === "counter_debuff" && t.captures.chance,
			);
			if (cdToken) chance = Number(cdToken.captures.chance);
		}

		// Dispellable
		let dispellable: boolean | undefined;
		if (allScopeTerms.includes("undispellable")) dispellable = false;
		// Also check preText
		if (/不可驱散|无法被驱散/.test(info.preText)) dispellable = false;

		// Per-hit stacking
		let per_hit_stack: boolean | undefined;
		if (
			allScopeTerms.includes("per_hit") &&
			allScopeTerms.includes("stack_add")
		) {
			per_hit_stack = true;
		}
		// Also check unscoped per_hit + stack_add near state_ref
		if (!per_hit_stack) {
			const hasPerHit = tokens.some((t) => t.term === "per_hit" && !t.scope);
			const hasStackAdd = tokens.some(
				(t) => t.term === "stack_add" && !t.scope,
			);
			if (hasPerHit && hasStackAdd) per_hit_stack = true;
		}

		const stateDef: StateDef = { target, duration };
		if (max_stacks !== undefined) stateDef.max_stacks = max_stacks;
		if (_max_stacks_var) stateDef._max_stacks_var = _max_stacks_var;
		if (trigger) stateDef.trigger = trigger;
		if (chance !== undefined) stateDef.chance = chance;
		if (dispellable !== undefined) stateDef.dispellable = dispellable;
		if (per_hit_stack) stateDef.per_hit_stack = per_hit_stack;

		states[info.name] = stateDef;
	}

	// Detect children: state_ref tokens + counter_debuff name captures
	for (const [name, _def] of Object.entries(states)) {
		const children: string[] = [];
		for (const t of tokens) {
			// state_ref referencing another state
			if (
				t.term === "state_ref" &&
				t.captures.name !== name &&
				states[t.captures.name]
			) {
				if (t.scope === name || !t.scope) {
					children.push(t.captures.name);
				}
			}
			// counter_debuff referencing a child state by name
			if (
				t.term === "counter_debuff" &&
				t.captures.name &&
				t.captures.name !== name &&
				states[t.captures.name] &&
				t.scope === name
			) {
				children.push(t.captures.name);
			}
		}
		// Also detect children from boundary splitting:
		// child states that appear after this state's boundary
		const parentInfo = stateInfos.find((s) => s.name === name);
		if (parentInfo) {
			const parentIdx = stateInfos.indexOf(parentInfo);
			for (let i = parentIdx + 1; i < stateInfos.length; i++) {
				const childInfo = stateInfos[i];
				// A child is a state whose boundary appears after the parent
				// and whose preText is within the parent's scope text
				if (states[childInfo.name] && childInfo.name !== name) {
					children.push(childInfo.name);
				}
			}
		}
		if (children.length > 0) {
			states[name].children = [...new Set(children)];
		}
	}

	// Inherit target and trigger from parent to children
	for (const [_name, def] of Object.entries(states)) {
		if (def.children) {
			for (const childName of def.children) {
				const child = states[childName];
				if (!child) continue;
				// Children of opponent-targeted states are also opponent-targeted
				if (def.target === "opponent" && child.target === "self") {
					child.target = "opponent";
				}
				// Children inherit trigger from parent if they don't have their own
				if (def.trigger && !child.trigger) {
					child.trigger = def.trigger;
				}
			}
		}
	}

	// Also create state entries for state_ref tokens that don't have
	// a 【name】：boundary (created via 添加/获得 without a definition)
	for (const t of tokens) {
		if (t.term === "state_ref" && !states[t.captures.name]) {
			// Determine target from preText of the state_ref context
			const preText = t.raw;
			const target = OPPONENT_RE_CTX.test(preText) ? "opponent" : "self";

			// Find duration near this state_ref
			let duration: number | "permanent" = 0;
			const refIdx = tokens.indexOf(t);
			for (let i = refIdx + 1; i < tokens.length && i < refIdx + 5; i++) {
				if (tokens[i].term === "duration") {
					duration = Number(tokens[i].captures.value);
					break;
				}
				if (tokens[i].term === "permanent") {
					duration = "permanent";
					break;
				}
			}

			states[t.captures.name] = { target, duration };
		}
	}

	return states;
}

const OPPONENT_RE_CTX = /对其施加|对敌方|对攻击方|为目标|对目标/;
