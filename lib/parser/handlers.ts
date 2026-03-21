/**
 * Stage 3: Parser — Semantic Effect Mapping
 *
 * Receives GroupEvent[] from the context listener and maps each
 * group to typed EffectRow[]. Each handler processes one primary
 * term. No handler knows about any other handler.
 *
 * Architecture (impl.reactive.md §6):
 *
 *   GroupEvent[] ──parse()──▶ EffectRow[]
 *     │
 *     ├─ HANDLER_MAP dispatches by primary.term
 *     ├─ each handler reads group.modifiers for context
 *     └─ diagnostics emitted for unhandled terms
 */

import type { EffectRow } from "../data/types.js";
import type { GroupEvent } from "./context.js";
import type { TokenEvent } from "./reader.js";
import { parseCnNumber } from "./reader.js";

// ── Types ────────────────────────────────────────────────

export interface GroupHandler {
	handles: string | string[];
	parse: (
		group: GroupEvent,
		ctx: HandlerContext,
	) => EffectRow | EffectRow[] | null;
}

export interface HandlerContext {
	allGroups: GroupEvent[];
	bookName?: string;
}

export interface DiagnosticEvent {
	level: "warn" | "info";
	message: string;
	term?: string;
	position?: number;
}

// ── Handler Registry ─────────────────────────────────────

const HANDLER_MAP = new Map<string, GroupHandler>();

function registerHandler(handler: GroupHandler) {
	const terms = Array.isArray(handler.handles)
		? handler.handles
		: [handler.handles];
	for (const term of terms) {
		HANDLER_MAP.set(term, handler);
	}
}

// ── Modifier helpers ─────────────────────────────────────

function hasMod(group: GroupEvent, term: string): boolean {
	return group.modifiers.some((m) => m.term === term);
}

function getMod(group: GroupEvent, term: string): TokenEvent | undefined {
	return group.modifiers.find((m) => m.term === term);
}

function getModCapture(
	group: GroupEvent,
	term: string,
	capture: string,
): string | undefined {
	return getMod(group, term)?.captures[capture];
}

/** Build metadata object from group context (parentState, modifiers). */
function buildMeta(group: GroupEvent): Record<string, unknown> {
	const meta: Record<string, unknown> = {};
	if (group.parentState) meta.name = group.parentState;
	return meta;
}

// ── Handlers ─────────────────────────────────────────────

// ── Damage handlers ──────────────────────────────────────

registerHandler({
	handles: "base_attack",
	parse: (group) => {
		const hitsCn = group.primary.captures.hits_cn;
		const hits = hitsCn ? parseCnNumber(hitsCn) : 1;
		return {
			type: "base_attack",
			hits,
			total: group.primary.captures.total,
		} as EffectRow;
	},
});

registerHandler({
	handles: "percent_max_hp_damage",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			value: group.primary.captures.value,
		};
		const cap = getModCapture(group, "cap_vs_monster", "value");
		if (cap) fields.cap_vs_monster = cap;
		if (hasMod(group, "per_hit")) fields.per_hit = true;
		return { type: "percent_max_hp_damage", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "percent_current_hp_damage",
	parse: (group) => {
		const meta: Record<string, unknown> = { per_prior_hit: true };
		if (hasMod(group, "cross_skill_accumulation")) {
			meta.accumulation = "cross_skill";
		}
		return {
			type: "percent_current_hp_damage",
			value: group.primary.captures.value,
			...meta,
		} as EffectRow;
	},
});

registerHandler({
	handles: "self_lost_hp_damage",
	parse: (group) => {
		const meta: Record<string, unknown> = {};
		if (hasMod(group, "per_hit")) meta.per_hit = true;
		if (hasMod(group, "self_equal_heal")) meta.self_heal = true;
		if (group.parentState) meta.parent = group.parentState;
		return {
			type: "self_lost_hp_damage",
			value: group.primary.captures.value,
			...meta,
		} as EffectRow;
	},
});

registerHandler({
	handles: "shield_destroy_damage",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			shields_per_hit: group.primary.captures.shields,
			percent_max_hp: group.primary.captures.value,
		};
		const cap = getModCapture(group, "cap_vs_monster", "value");
		if (cap) fields.cap_vs_monster = cap;
		return { type: "shield_destroy_damage", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "no_shield_double_damage",
	parse: (group) => {
		const fields: Record<string, unknown> = { no_shield_double: 1 };
		const cap = getModCapture(group, "cap_vs_monster", "value");
		if (cap) fields.cap_vs_monster = cap;
		return { type: "no_shield_double_damage", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "flat_extra_damage",
	parse: (group) =>
		({
			type: "flat_extra_damage",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "echo_damage",
	parse: (group) => {
		const meta: Record<string, unknown> = {};
		if (hasMod(group, "no_damage_bonus")) meta.ignore_damage_bonus = true;
		return {
			type: "debuff",
			target: "echo_damage",
			value: group.primary.captures.value,
			duration: group.primary.captures.duration,
			...meta,
		} as EffectRow;
	},
});

// ── Cost handlers ────────────────────────────────────────

registerHandler({
	handles: "hp_cost",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			value: group.primary.captures.value,
		};
		if (hasMod(group, "per_hit")) fields.per_hit = true;
		return { type: "self_hp_cost", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "hp_cost_dot",
	parse: (group) =>
		({
			type: "self_hp_cost",
			value: group.primary.captures.value,
			tick_interval: 1,
		}) as EffectRow,
});

// ── DoT handlers ─────────────────────────────────────────

registerHandler({
	handles: "dot_current_hp",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			tick_interval: group.primary.captures.interval,
			percent_current_hp: group.primary.captures.value,
		};
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		const meta = buildMeta(group);
		if (group.parentState) meta.name = group.parentState;
		return { type: "dot", ...fields, ...meta } as EffectRow;
	},
});

registerHandler({
	handles: "dot_lost_hp",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			tick_interval: group.primary.captures.interval,
			percent_lost_hp: group.primary.captures.value,
		};
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		const meta = buildMeta(group);
		if (group.parentState) meta.name = group.parentState;
		return { type: "dot", ...fields, ...meta } as EffectRow;
	},
});

registerHandler({
	handles: "dot_max_hp",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			tick_interval: 1,
			percent_current_hp: group.primary.captures.value,
		};
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		return { type: "dot", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "dot_atk",
	parse: (group) =>
		({
			type: "dot",
			tick_interval: 1,
			damage_per_tick: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "self_lost_hp_damage_dot",
	parse: (group) => {
		const meta: Record<string, unknown> = {};
		if (hasMod(group, "includes_hp_spent")) meta.includes_hp_spent = true;
		return {
			type: "self_lost_hp_damage",
			value: group.primary.captures.value,
			tick_interval: 1,
			...meta,
		} as EffectRow;
	},
});

// ── Healing / Shield handlers ────────────────────────────

registerHandler({
	handles: "self_heal",
	parse: (group) =>
		({
			type: "self_heal",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "per_tick_heal",
	parse: (group) => {
		const meta: Record<string, unknown> = { tick_interval: 1 };
		// Find parent from state_ref in allGroups (same scope)
		return {
			type: "self_heal",
			per_tick: group.primary.captures.per_tick,
			total: group.primary.captures.total,
			...meta,
		} as EffectRow;
	},
});

registerHandler({
	handles: "heal_echo_damage",
	parse: () => ({ type: "heal_echo_damage", ratio: 1 }) as EffectRow,
});

registerHandler({
	handles: "shield",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			value: group.primary.captures.value,
		};
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		return {
			type: "shield",
			...fields,
			source: "self_max_hp",
		} as EffectRow;
	},
});

registerHandler({
	handles: "lifesteal",
	parse: (group) => {
		const val = group.primary.captures.value || group.primary.captures.value2;
		return { type: "lifesteal", value: val } as EffectRow;
	},
});

// ── Debuff handlers ──────────────────────────────────────

registerHandler({
	handles: "debuff_final_dr",
	parse: (group) => {
		const raw = group.primary.captures.value;
		const value = /^\d/.test(raw) ? -Number(raw) : `-${raw}`;
		const fields: Record<string, unknown> = {
			target: "final_damage_reduction",
			value,
		};
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		const meta = buildMeta(group);
		return { type: "debuff", ...fields, ...meta } as EffectRow;
	},
});

registerHandler({
	handles: "debuff_skill_dmg",
	parse: (group) => {
		const raw = group.primary.captures.value;
		const value = /^\d/.test(raw) ? -Number(raw) : `-${raw}`;
		const fields: Record<string, unknown> = {
			target: "skill_damage",
			value,
		};
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		return { type: "debuff", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "debuff_attack",
	parse: (group) => {
		const raw = group.primary.captures.value;
		const value = /^\d/.test(raw) ? -Number(raw) : `-${raw}`;
		const fields: Record<string, unknown> = { target: "attack", value };
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		return { type: "debuff", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "heal_reduction",
	parse: (group) => {
		const raw = group.primary.captures.value;
		const value = /^\d/.test(raw) ? -Number(raw) : `-${raw}`;
		const fields: Record<string, unknown> = {
			target: "healing_received",
			value,
		};
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		const meta: Record<string, unknown> = {};
		if (hasMod(group, "undispellable")) meta.dispellable = false;
		return { type: "debuff", ...fields, ...meta } as EffectRow;
	},
});

// ── Complex skill handlers ───────────────────────────────

registerHandler({
	handles: "summon",
	parse: (group) => {
		const meta: Record<string, unknown> = {};
		if (hasMod(group, "summon_trigger_on_cast")) meta.trigger = "on_cast";
		const dmgTaken = getModCapture(group, "summon_damage_taken", "value");
		const fields: Record<string, unknown> = {
			duration: group.primary.captures.duration,
			inherit_stats: group.primary.captures.inherit,
		};
		if (dmgTaken) fields.damage_taken_multiplier = dmgTaken;
		return { type: "summon", ...fields, ...meta } as EffectRow;
	},
});

registerHandler({
	handles: "self_damage_taken_increase",
	parse: (group) =>
		({
			type: "self_damage_taken_increase",
			value: group.primary.captures.value,
			duration: group.primary.captures.duration,
		}) as EffectRow,
});

registerHandler({
	handles: "periodic_escalation",
	parse: (group) =>
		({
			type: "periodic_escalation",
			every_n_hits: Number(group.primary.captures.every_n),
			multiplier: group.primary.captures.multiplier,
			max_stacks: Number(group.primary.captures.max),
		}) as EffectRow,
});

registerHandler({
	handles: "buff_steal",
	parse: (group) =>
		({
			type: "buff_steal",
			count: group.primary.captures.count,
		}) as EffectRow,
});

registerHandler({
	handles: "per_debuff_stack_damage",
	parse: (group) =>
		({
			type: "per_debuff_stack_damage",
			per_n_stacks: 1,
			value: group.primary.captures.value,
			max_stacks: Number(group.primary.captures.max),
		}) as EffectRow,
});

registerHandler({
	handles: "counter_debuff",
	parse: (group) =>
		({
			type: "counter_debuff",
			on_attacked_chance: Number(group.primary.captures.chance),
			name: group.primary.captures.name,
		}) as EffectRow,
});

registerHandler({
	handles: "counter_buff_heal",
	parse: (group) => {
		const meta: Record<string, unknown> = {};
		if (hasMod(group, "no_healing_bonus")) meta.no_healing_bonus = true;
		if (group.parentState) meta.name = group.parentState;
		return {
			type: "counter_buff",
			heal_on_damage_taken: group.primary.captures.value,
			...meta,
		} as EffectRow;
	},
});

registerHandler({
	handles: "counter_buff_reflect",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			reflect_received_damage: group.primary.captures.reflect_dmg,
			reflect_percent_lost_hp: group.primary.captures.reflect_hp,
		};
		const dur = getModCapture(group, "duration", "value");
		if (dur) fields.duration = dur;
		if (group.parentState) fields.name = group.parentState;
		return { type: "counter_buff", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "untargetable",
	parse: (group) =>
		({
			type: "untargetable_state",
			duration: Number(group.primary.captures.duration),
		}) as EffectRow,
});

registerHandler({
	handles: "self_cleanse",
	parse: (group) =>
		({
			type: "self_cleanse",
			count: group.primary.captures.count,
		}) as EffectRow,
});

registerHandler({
	handles: "delayed_burst",
	parse: (group) =>
		({
			type: "delayed_burst",
			duration: Number(group.primary.captures.dur),
			damage_increase_during: Number(group.primary.captures.increase),
			burst_accumulated_pct: Number(group.primary.captures.accum),
			burst_base: Number(group.primary.captures.base),
			name: group.primary.captures.name,
		}) as EffectRow,
});

registerHandler({
	handles: "conditional_damage_cleanse",
	parse: (group) =>
		({
			type: "conditional_damage",
			value: group.primary.captures.value,
			condition: "cleanse_excess",
		}) as EffectRow,
});

registerHandler({
	handles: "skill_cooldown",
	parse: (group) => {
		const meta: Record<string, unknown> = { name: "神通封印" };
		if (hasMod(group, "sequenced_skill")) meta.sequenced = true;
		return {
			type: "debuff",
			target: "next_skill_cooldown",
			value: Number(group.primary.captures.duration),
			duration: Number(group.primary.captures.duration),
			...meta,
		} as EffectRow;
	},
});

registerHandler({
	handles: "next_skill_carry",
	parse: (group) =>
		({
			type: "self_lost_hp_damage",
			value: group.primary.captures.value,
			per_hit: true,
			name: "破虚",
			next_skill_hits: Number(group.primary.captures.hits),
		}) as EffectRow,
});

registerHandler({
	handles: "per_enemy_lost_hp",
	parse: (group) =>
		({
			type: "per_enemy_lost_hp",
			per_percent: group.primary.captures.per_percent,
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "self_buff",
	parse: (group) => {
		const fields: Record<string, unknown> = {};
		const name = group.primary.captures.name;
		if (name) fields.name = name;

		// Collect stats from modifiers
		for (const mod of group.modifiers) {
			switch (mod.term) {
				case "attack_bonus_stat":
					fields.attack_bonus = mod.captures.value;
					break;
				case "damage_increase_stat":
					fields.damage_increase = mod.captures.value;
					break;
				case "skill_dmg_increase":
					fields.skill_damage_increase = mod.captures.value;
					break;
				case "damage_reduction_stat":
					fields.damage_reduction = mod.captures.value;
					break;
				case "final_dmg_bonus":
					fields.final_damage_bonus = mod.captures.value;
					break;
				case "crit_rate_stat":
					fields.crit_rate = mod.captures.value;
					break;
				case "healing_bonus_stat":
					fields.healing_bonus = mod.captures.value;
					break;
				case "defense_bonus_stat":
					fields.defense_bonus = mod.captures.value;
					break;
				case "hp_bonus_stat":
					fields.hp_bonus = mod.captures.value;
					break;
				case "duration":
					fields.duration = Number(mod.captures.value);
					break;
			}
		}

		if (Object.keys(fields).length <= (name ? 1 : 0)) return null;
		return { type: "self_buff", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "crit_dmg_bonus",
	parse: (group) =>
		({
			type: "crit_damage_bonus",
			value: group.primary.captures.value,
		}) as EffectRow,
});

// ── Affix handlers ───────────────────────────────────────

registerHandler({
	handles: "ignore_damage_reduction",
	parse: () => ({ type: "ignore_damage_reduction" }) as EffectRow,
});

registerHandler({
	handles: "per_self_lost_hp",
	parse: (group) =>
		({
			type: "per_self_lost_hp",
			per_percent: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "per_debuff_true_damage",
	parse: (group) =>
		({
			type: "per_debuff_stack_true_damage",
			per_stack: group.primary.captures.per_stack,
			max: group.primary.captures.max,
		}) as EffectRow,
});

registerHandler({
	handles: "dot_extra_per_tick",
	parse: (group) =>
		({
			type: "dot_extra_per_tick",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "dot_damage_increase",
	parse: (group) =>
		({
			type: "dot_damage_increase",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "dot_frequency_increase",
	parse: (group) =>
		({
			type: "dot_frequency_increase",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: ["conditional_damage_controlled", "conditional_damage_debuff"],
	parse: (group) => {
		const condition =
			group.primary.term === "conditional_damage_controlled"
				? "target_controlled"
				: "target_has_debuff";
		return {
			type: "conditional_damage",
			value: group.primary.captures.value,
			condition,
		} as EffectRow;
	},
});

registerHandler({
	handles: "damage_increase_affix",
	parse: (group) =>
		({
			type: "damage_increase",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "self_damage_during_cast",
	parse: (group) =>
		({
			type: "self_damage_taken_increase",
			value: group.primary.captures.value,
			duration: "during_cast",
		}) as EffectRow,
});

registerHandler({
	handles: "all_state_duration",
	parse: (group) =>
		({
			type: "all_state_duration",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "buff_duration",
	parse: (group) =>
		({
			type: "buff_duration",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "buff_strength",
	parse: (group) =>
		({
			type: "buff_strength",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "buff_stack_increase",
	parse: (group) =>
		({
			type: "buff_stack_increase",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "debuff_stack_increase",
	parse: (group) =>
		({
			type: "debuff_stack_increase",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "next_skill_buff",
	parse: (group) =>
		({
			type: "next_skill_buff",
			value: group.primary.captures.value,
			stat: "skill_damage_increase",
		}) as EffectRow,
});

registerHandler({
	handles: "skill_damage_increase_affix",
	parse: (group) =>
		({
			type: "skill_damage_increase",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "enemy_skill_dmg_reduction",
	parse: (group) =>
		({
			type: "enemy_skill_damage_reduction",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "on_shield_expire",
	parse: (group) =>
		({
			type: "on_shield_expire",
			damage_percent_of_shield: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "on_buff_debuff_shield",
	parse: (group) =>
		({
			type: "on_buff_debuff_shield_trigger",
			damage_percent: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "probability_multiplier",
	parse: (group) =>
		({
			type: "probability_multiplier",
			chance_4x: group.primary.captures.c4x,
			chance_3x: group.primary.captures.c3x,
			chance_2x: group.primary.captures.c2x,
		}) as EffectRow,
});

registerHandler({
	handles: "enlightenment_bonus",
	parse: (group) =>
		({
			type: "enlightenment_bonus",
			value: Number(group.primary.captures.value),
		}) as EffectRow,
});

registerHandler({
	handles: "debuff_stack_chance",
	parse: (group) =>
		({
			type: "debuff_stack_chance",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "on_dispel",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			damage: group.primary.captures.damage,
		};
		const stun = getModCapture(group, "stun_on_dispel", "duration");
		if (stun) fields.stun = stun;
		return { type: "on_dispel", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "periodic_dispel_with_damage",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			interval: 1,
			duration: Number(group.primary.captures.duration),
			damage_percent_of_skill: group.primary.captures.damage,
		};
		if (hasMod(group, "no_buff_double")) {
			return {
				type: "periodic_dispel",
				...fields,
				no_buff_double: true,
			} as EffectRow;
		}
		return { type: "periodic_dispel", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "per_buff_stack_damage",
	parse: (group) =>
		({
			type: "per_buff_stack_damage",
			per_n_stacks: Number(group.primary.captures.per_n),
			value: group.primary.captures.value,
			max: group.primary.captures.max,
		}) as EffectRow,
});

registerHandler({
	handles: "per_debuff_stack_damage_affix",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			per_n_stacks: Number(group.primary.captures.per_n),
			value: group.primary.captures.value,
			max: group.primary.captures.max,
		};
		if (hasMod(group, "dot_half_bonus")) fields.dot_bonus_ratio = 0.5;
		return { type: "per_debuff_stack_damage", ...fields } as EffectRow;
	},
});

registerHandler({
	handles: "per_hit_escalation",
	parse: (group) =>
		({
			type: "per_hit_escalation",
			value: group.primary.captures.value,
			stat: "skill_bonus",
		}) as EffectRow,
});

registerHandler({
	handles: "per_hit_escalation_remaining",
	parse: (group) =>
		({
			type: "per_hit_escalation",
			value: group.primary.captures.value,
			max: group.primary.captures.max,
			stat: "remaining_hits",
		}) as EffectRow,
});

registerHandler({
	handles: "lifesteal_with_parent",
	parse: (group) =>
		({
			type: "lifesteal",
			value: Number(group.primary.captures.value),
			parent: group.primary.captures.parent,
		}) as EffectRow,
});

registerHandler({
	handles: "shield_strength",
	parse: (group) =>
		({
			type: "shield_strength",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "self_buff_extra",
	parse: (group) => {
		const buffName = group.primary.captures.buff_name;
		// Collect stats from modifiers in the group
		const fields: Record<string, unknown> = {};
		for (const mod of group.modifiers) {
			if (isStat(mod.term)) {
				const statKey = statTermToField(mod.term);
				if (statKey) fields[statKey] = mod.captures.value;
			}
		}
		if (Object.keys(fields).length === 0) return null;
		return {
			type: "self_buff_extra",
			...fields,
			buff_name: buffName,
		} as EffectRow;
	},
});

registerHandler({
	handles: "summon_buff",
	parse: (group) =>
		({
			type: "summon_buff",
			damage_taken_reduction_to: group.primary.captures.dr,
			damage_increase: group.primary.captures.dmg,
		}) as EffectRow,
});

registerHandler({
	handles: "extended_dot",
	parse: (group) =>
		({
			type: "extended_dot",
			extra_seconds: group.primary.captures.extra_sec,
			tick_interval: group.primary.captures.interval,
		}) as EffectRow,
});

registerHandler({
	handles: "shield_destroy_dot",
	parse: (group) => {
		const fields: Record<string, unknown> = {
			tick_interval: Number(group.primary.captures.interval),
			per_shield_damage: Number(group.primary.captures.damage),
		};
		const noShield = getModCapture(group, "no_shield_fallback", "count");
		if (noShield) fields.no_shield_assumed = Number(noShield);
		return {
			type: "shield_destroy_dot",
			...fields,
			parent: group.primary.captures.parent,
		} as EffectRow;
	},
});

registerHandler({
	handles: "per_stolen_buff_debuff",
	parse: (group) =>
		({
			type: "debuff",
			target: "attack",
			value: `-${group.primary.captures.value}`,
			duration: group.primary.captures.duration,
			name: group.primary.captures.name,
			per_stolen_buff: true,
		}) as EffectRow,
});

registerHandler({
	handles: "attack_bonus_per_debuff",
	parse: (group) => {
		const meta: Record<string, unknown> = { per_debuff_stack: true };
		if (hasMod(group, "pre_cast_timing")) meta.timing = "pre_cast";
		return {
			type: "attack_bonus",
			value: group.primary.captures.value,
			max_stacks: Number(group.primary.captures.max),
			...meta,
		} as EffectRow;
	},
});

registerHandler({
	handles: "percent_max_hp_affix",
	parse: (group) =>
		({
			type: "percent_max_hp_damage",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "self_buff_extend",
	parse: (group) =>
		({
			type: "self_buff_extend",
			value: group.primary.captures.value,
			buff_name: group.primary.captures.buff_name,
		}) as EffectRow,
});

registerHandler({
	handles: "periodic_cleanse",
	parse: (group) =>
		({
			type: "periodic_cleanse",
			chance: group.primary.captures.chance,
			interval: 1,
			cooldown: Number(group.primary.captures.cooldown),
			max_triggers: Number(group.primary.captures.max),
		}) as EffectRow,
});

registerHandler({
	handles: "delayed_burst_increase",
	parse: (group) =>
		({
			type: "delayed_burst_increase",
			value: Number(group.primary.captures.value),
			parent: group.primary.captures.parent,
		}) as EffectRow,
});

registerHandler({
	handles: "self_lost_hp_every_n",
	parse: (group) =>
		({
			type: "self_lost_hp_damage",
			value: group.primary.captures.value,
			every_n_hits: Number(group.primary.captures.every_n),
		}) as EffectRow,
});

registerHandler({
	handles: "periodic_dispel_affix",
	parse: (group) => {
		const raw = group.primary.captures.count;
		const count =
			parseCnNumber(raw) !== 1 || raw === "一" || raw === "1"
				? parseCnNumber(raw)
				: Number.parseInt(raw, 10) || raw;
		return { type: "periodic_dispel", count } as EffectRow;
	},
});

registerHandler({
	handles: "self_hp_floor",
	parse: (group) =>
		({
			type: "self_hp_floor",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "dot_permanent_max_hp",
	parse: (group) =>
		({
			type: "dot",
			tick_interval: 1,
			percent_max_hp: group.primary.captures.value,
			duration: "permanent",
			parent: group.primary.captures.parent,
		}) as EffectRow,
});

registerHandler({
	handles: "per_debuff_damage_upgrade",
	parse: (group) =>
		({
			type: "per_debuff_stack_damage",
			per_n_stacks: 1,
			value: 0.5,
			max: group.primary.captures.value,
			parent: group.primary.captures.parent,
		}) as EffectRow,
});

registerHandler({
	handles: "counter_debuff_upgrade",
	parse: (group) =>
		({
			type: "counter_debuff_upgrade",
			on_attacked_chance: Number(group.primary.captures.value),
			parent: group.primary.captures.parent,
		}) as EffectRow,
});

registerHandler({
	handles: "cross_slot_debuff",
	parse: (group) =>
		({
			type: "cross_slot_debuff",
			target: "final_damage_reduction",
			value: `-${group.primary.captures.value}`,
			duration: group.primary.captures.duration,
			name: group.primary.captures.name,
			trigger: "on_attacked",
		}) as EffectRow,
});

registerHandler({
	handles: "dot_per_n_stacks",
	parse: (group) => {
		const nRaw = group.primary.captures.n;
		const nVal = parseCnNumber(nRaw);
		return {
			type: "dot",
			tick_interval: 1,
			percent_lost_hp: group.primary.captures.value,
			duration: group.primary.captures.duration,
			name: group.primary.captures.name,
			parent: group.primary.captures.parent,
			per_n_stacks: nVal,
		} as EffectRow;
	},
});

registerHandler({
	handles: "debuff_strength",
	parse: (group) =>
		({
			type: "debuff_strength",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "damage_reduction_during_cast",
	parse: (group) =>
		({
			type: "damage_reduction_during_cast",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "execute_conditional",
	parse: (group) =>
		({
			type: "execute_conditional",
			hp_threshold: Number(group.primary.captures.threshold),
			damage_increase: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "random_buff",
	parse: (group) =>
		({
			type: "random_buff",
			attack: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "random_debuff",
	parse: (group) =>
		({
			type: "random_debuff",
			attack: group.primary.captures.attack,
			crit_rate: group.primary.captures.crit_rate,
			crit_damage: group.primary.captures.crit_damage,
		}) as EffectRow,
});

registerHandler({
	handles: "guaranteed_resonance",
	parse: (group) =>
		({
			type: "guaranteed_resonance",
			base_multiplier: group.primary.captures.base_multiplier,
			chance: group.primary.captures.chance,
			upgraded_multiplier: group.primary.captures.upgraded_multiplier,
		}) as EffectRow,
});

registerHandler({
	handles: "triple_bonus",
	parse: (group) =>
		({
			type: "triple_bonus",
			attack_bonus: group.primary.captures.atk,
			damage_increase: group.primary.captures.dmg,
			crit_damage_increase: group.primary.captures.crit,
		}) as EffectRow,
});

registerHandler({
	handles: "attack_bonus_affix",
	parse: (group) =>
		({
			type: "attack_bonus",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "probability_to_certain",
	parse: () =>
		({
			type: "probability_to_certain",
		}) as EffectRow,
});

registerHandler({
	handles: "min_lost_hp_threshold",
	parse: (group) =>
		({
			type: "min_lost_hp_threshold",
			min_percent: group.primary.captures.min_percent,
			damage_increase: group.primary.captures.damage_increase,
		}) as EffectRow,
});

registerHandler({
	handles: "hp_cost_avoid_chance",
	parse: (group) =>
		({
			type: "hp_cost_avoid_chance",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "shield_on_heal",
	parse: (group) =>
		({
			type: "shield",
			value: group.primary.captures.value,
			duration: group.primary.captures.duration,
			source: "self_max_hp",
			trigger: "per_tick",
		}) as EffectRow,
});

registerHandler({
	handles: "healing_increase",
	parse: (group) =>
		({
			type: "healing_increase",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "healing_to_damage",
	parse: (group) =>
		({
			type: "healing_to_damage",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "damage_to_shield",
	parse: (group) =>
		({
			type: "damage_to_shield",
			value: group.primary.captures.value,
			duration: Number(group.primary.captures.duration),
		}) as EffectRow,
});

registerHandler({
	handles: "shield_value_increase",
	parse: (group) =>
		({
			type: "shield_value_increase",
			value: group.primary.captures.value,
		}) as EffectRow,
});

registerHandler({
	handles: "conditional_self_hp",
	parse: (group) =>
		({
			type: "conditional_damage",
			value: group.primary.captures.value,
		}) as EffectRow,
});

// ── Skip handlers (tokens consumed by other handlers) ────

const SKIP_TERMS = [
	"cap_vs_monster",
	"cross_skill_accumulation",
	"self_equal_heal",
	"state_ref",
	"named_state",
	"no_shield_fallback",
	"stun_on_dispel",
	"no_buff_double",
	"dot_half_bonus",
	"pre_cast_timing",
	"summon_trigger_on_cast",
	"summon_damage_taken",
	"no_healing_bonus",
	"no_damage_bonus",
	"sequenced_skill",
	"includes_hp_spent",
];

for (const term of SKIP_TERMS) {
	registerHandler({ handles: term, parse: () => null });
}

// ── Stat term helper ─────────────────────────────────────

function isStat(term: string): boolean {
	return [
		"attack_bonus_stat",
		"damage_increase_stat",
		"skill_dmg_increase",
		"damage_reduction_stat",
		"final_dmg_bonus",
		"crit_rate_stat",
		"healing_bonus_stat",
		"defense_bonus_stat",
		"hp_bonus_stat",
	].includes(term);
}

function statTermToField(term: string): string | null {
	const map: Record<string, string> = {
		attack_bonus_stat: "attack_bonus",
		damage_increase_stat: "damage_increase",
		skill_dmg_increase: "skill_damage_increase",
		damage_reduction_stat: "damage_reduction",
		final_dmg_bonus: "final_damage_bonus",
		crit_rate_stat: "crit_rate",
		healing_bonus_stat: "healing_bonus",
		defense_bonus_stat: "defense_bonus",
		hp_bonus_stat: "hp_bonus",
	};
	return map[term] ?? null;
}

// ── Public API ───────────────────────────────────────────

/**
 * Parse groups into typed EffectRows.
 * Returns effects and diagnostics for unhandled terms.
 */
export function parse(
	groups: GroupEvent[],
	ctx: HandlerContext,
): { effects: EffectRow[]; diagnostics: DiagnosticEvent[] } {
	const effects: EffectRow[] = [];
	const diagnostics: DiagnosticEvent[] = [];

	for (const g of groups) {
		const handler = HANDLER_MAP.get(g.primary.term);
		if (!handler) {
			diagnostics.push({
				level: "warn",
				message: `No handler for term: ${g.primary.term}`,
				term: g.primary.term,
				position: g.primary.position,
			});
			continue;
		}

		const result = handler.parse(g, ctx);
		if (result === null) continue;
		if (Array.isArray(result)) {
			effects.push(...result);
		} else {
			effects.push(result);
		}
	}

	return { effects, diagnostics };
}
