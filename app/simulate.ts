#!/usr/bin/env bun
/**
 * CLI: Run combat simulation from a config file or main book duel.
 *
 * Usage:
 *   bun app/simulate.ts --config config/combat.json [--trace]
 *   bun app/simulate.ts --book1 千锋聚灵剑 --book2 甲元仙符 [--trace]
 */

import { parseArgs } from "node:util";
import { createActor } from "xstate";
import {
	buildArenaDef,
	loadCombatConfig,
	MAX_PROGRESSION,
	type CombatConfig,
	type Progression,
} from "../lib/simulator/bridge";
import { arenaMachine } from "../lib/simulator/actors/arena";

const { values } = parseArgs({
	options: {
		config: { type: "string", short: "c" },
		book1: { type: "string" },
		book2: { type: "string" },
		trace: { type: "boolean", short: "t", default: false },
	},
});

// ---------------------------------------------------------------------------
// Main book 1v1 duel mode
// ---------------------------------------------------------------------------

function buildDuelConfig(book1: string, book2: string, prog: Progression): CombatConfig {
	return {
		t_gap: 25,
		max_time: 300,
		progression: prog,
		formulas: { dr_constant: 1e6, sp_shield_ratio: 0 },
		player: {
			entity: { hp: 1e8, atk: 1000, sp: 0, def: 9e5 },
			books: [{ slot: 1, platform: book1, op1: "", op2: "" }],
		},
		opponent: {
			entity: { hp: 1e8, atk: 1000, sp: 0, def: 9e5 },
			books: [{ slot: 1, platform: book2, op1: "", op2: "" }],
		},
	};
}

if (!values.config && !values.book1) {
	console.error(
		"Usage:\n" +
		"  bun app/simulate.ts --config config/combat.json [--trace]\n" +
		"  bun app/simulate.ts --book1 千锋聚灵剑 --book2 甲元仙符 [--trace]",
	);
	process.exit(1);
}

const config = values.book1 && values.book2
	? buildDuelConfig(values.book1, values.book2, MAX_PROGRESSION)
	: loadCombatConfig(values.config!);
const arenaDef = buildArenaDef(config);
const TRACE = values.trace;

// Print setup summary
const prog = config.progression ?? MAX_PROGRESSION;
console.log("=== Combat Simulation ===\n");
console.log(`Progression: 悟境=${prog.enlightenment}  融合=${prog.fusion}\n`);

for (const [label, e] of [["Player (entity-a)", arenaDef.entity_a], ["Opponent (entity-b)", arenaDef.entity_b]] as const) {
	console.log(`${label}:`);
	console.log(`  HP: ${fmtNum(e.hp)}  ATK: ${fmtNum(e.atk)}  DEF: ${fmtNum(e.def)}  SP: ${fmtNum(e.sp)}`);
	const dr = (e.def / (e.def + e.dr_constant) * 100).toFixed(1);
	const shield = fmtNum(e.sp * arenaDef.sp_shield_ratio);
	console.log(`  DR: ${dr}%  Shield: ${shield}`);
}

console.log(`\nSlots: ${arenaDef.slots_a.length} vs ${arenaDef.slots_b.length}  t_gap: ${arenaDef.t_gap}s\n`);

for (const side of [
	{ name: "Player", slots: arenaDef.slots_a },
	{ name: "Opponent", slots: arenaDef.slots_b },
]) {
	console.log(`${side.name} slots:`);
	for (const slot of side.slots) {
		const f = slot.base_factors;
		const factorStr = [
			f.D_base && `D_base=${f.D_base.toFixed(1)}`,
			f.D_flat && `D_flat=${f.D_flat.toFixed(1)}`,
			f.D_ortho && `D_ortho=${f.D_ortho.toFixed(1)}`,
			f.S_coeff && `S=${f.S_coeff.toFixed(2)}`,
			f.M_dmg && `Md=${f.M_dmg.toFixed(2)}`,
			f.M_skill && `Ms=${f.M_skill.toFixed(2)}`,
			f.M_final && `Mf=${f.M_final.toFixed(2)}`,
			f.M_crit && `Mc=${f.M_crit.toFixed(2)}`,
			(f.sigma_R !== 1) && `σR=${f.sigma_R.toFixed(2)}`,
			f.D_res && `D_res=${f.D_res.toFixed(3)}`,
			f.H_A && `H_A=${f.H_A.toFixed(1)}`,
		].filter(Boolean).join(" ");
		const states = slot.states_to_create.map(s => {
			const parts = [s.id];
			parts.push(`${s.duration}s→${s.target}`);
			const modStr = Object.entries(s.modifiers)
				.filter(([, v]) => v !== 0)
				.map(([k, v]) => `${k}=${(v as number).toFixed(3)}`)
				.join(",");
			if (modStr) parts.push(`mods:{${modStr}}`);
			if (s.atk_modifier) parts.push(`atk+${(s.atk_modifier * 100).toFixed(0)}%`);
			if (s.def_modifier) parts.push(`def+${(s.def_modifier * 100).toFixed(0)}%`);
			if (s.dr_modifier) parts.push(`dr_mod=${s.dr_modifier.toFixed(3)}`);
			if (s.healing_modifier) parts.push(`h_mod=${s.healing_modifier.toFixed(3)}`);
			if (s.damage_per_tick) parts.push(`dpt=${s.damage_per_tick}`);
			if (s.counter_damage) parts.push(`counter=${s.counter_damage}`);
			if (s.burst_damage) parts.push(`burst=${s.burst_damage}`);
			if (s.on_dispel_damage) parts.push(`on_dispel=${s.on_dispel_damage}`);
			if (s.shield_hp) parts.push(`shield=${s.shield_hp}`);
			if (s.max_stacks) parts.push(`max_stacks=${s.max_stacks}`);
			if (s.trigger) parts.push(`trigger=${s.trigger}`);
			if (s.chance != null) parts.push(`chance=${s.chance}%`);
			if (s.per_hit_stack) parts.push(`per_hit_stack`);
			if (s.dispellable === false) parts.push(`!dispellable`);
			return parts.join(" ");
		}).join("\n    ");
		const conds = (slot.conditional_factors ?? []).map(cf => {
			let s = `${cf.condition}(${cf.factor}:${cf.value}`;
			if (cf.threshold != null) s += ` thr=${cf.threshold}`;
			if (cf.max_stacks != null) s += ` max=${cf.max_stacks}`;
			if (cf.per_n_stacks != null) s += ` per${cf.per_n_stacks}`;
			if (cf.probability != null) s += ` p=${cf.probability}`;
			s += ")";
			return s;
		}).join(", ");
		const actions = [
			slot.self_hp_cost && `hp_cost=${slot.self_hp_cost}%`,
			slot.lifesteal && `lifesteal=${slot.lifesteal}%`,
			slot.self_heal && `self_heal=${slot.self_heal}`,
			slot.self_cleanse_count && `cleanse=${slot.self_cleanse_count}`,
			slot.buff_steal_count && `steal=${slot.buff_steal_count}`,
		].filter(Boolean).join(", ");
		console.log(`  ${slot.id}: ${slot.platform} ×${slot.hit_count} {${factorStr}}`);
		if (states) console.log(`    states: ${states}`);
		if (conds) console.log(`    conds: ${conds}`);
		if (actions) console.log(`    actions: ${actions}`);
	}
	console.log();
}

// ---------------------------------------------------------------------------
// Event trace log
// ---------------------------------------------------------------------------

interface TraceEntry {
	seq: number;
	actor: string;
	event: string;
	detail: string;
	/** Entity state snapshot after this event */
	snapshot?: string;
}

const traceLog: TraceEntry[] = [];
let traceSeq = 0;

// Map XState internal IDs to human-readable systemIds
const actorIdMap = new Map<string, string>();

function resolveActorName(ref: any): string {
	if (!ref) return "?";
	const internalId = ref.id ?? "?";
	if (actorIdMap.has(internalId)) return actorIdMap.get(internalId)!;
	const systemId = ref._systemId ?? ref.systemId;
	if (systemId) {
		actorIdMap.set(internalId, systemId);
		return systemId;
	}
	return internalId;
}

function fmtEntitySnap(id: string, ctx: any): string {
	const hpPct = (ctx.hp / ctx.max_hp * 100).toFixed(1);
	return `${id}: HP=${fmtNum(ctx.hp)}(${hpPct}%) states=${ctx.active_states?.length ?? 0}`;
}


function traceInspect(evt: any) {
	if (evt.type === "@xstate.actor") {
		const ref = evt.actorRef;
		if (ref) {
			const systemId = ref._systemId ?? ref.systemId;
			if (systemId) actorIdMap.set(ref.id, systemId);
		}
	}

	if (evt.type === "@xstate.event") {
		const actorId = resolveActorName(evt.actorRef);
		const event = evt.event;
		if (!event || event.type === "xstate.init") return;

		let detail = "";
		switch (event.type) {
			case "HIT":
				detail = `damage=${fmtNum(event.damage)} dr_bypass=${event.dr_bypass?.toFixed(3) ?? "0"} healing=${fmtNum(event.healing ?? 0)} src=${event.source} hit#${event.hit_index}`;
				break;
			case "HEAL":
				detail = `amount=${fmtNum(event.amount)} src=${event.source}`;
				break;
			case "START":
				detail = "";
				break;
			case "TICK":
				detail = `dt=${event.dt}`;
				break;
			case "STATE_APPLIED":
				detail = `state=${event.state_id}`;
				break;
			case "ENTITY_DIED":
				detail = `entity=${event.entity_id}`;
				break;
			case "STACK":
				detail = "";
				break;
			case "ABSORB":
				detail = `amount=${fmtNum(event.amount)}`;
				break;
			case "DISPEL":
				detail = "";
				break;
			default:
				detail = JSON.stringify(event).slice(0, 120);
		}

		traceLog.push({
			seq: traceSeq++,
			actor: actorId,
			event: event.type,
			detail,
		});
	}

	// After snapshot events on entities, attach state to the last trace entry
	if (evt.type === "@xstate.snapshot") {
		const ref = evt.actorRef;
		if (!ref) return;
		const actorId = resolveActorName(ref);
		if (actorId !== "entity-a" && actorId !== "entity-b") return;
		const ctx = evt.snapshot?.context;
		if (!ctx) return;

		const stateStr = fmtEntitySnap(actorId, ctx);
		const last = traceLog[traceLog.length - 1];
		if (last) {
			if (!last.snapshot) {
				last.snapshot = stateStr;
			} else {
				last.snapshot += "  |  " + stateStr;
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Run simulation
// ---------------------------------------------------------------------------

const arena = createActor(arenaMachine, {
	input: arenaDef,
	systemId: "arena",
	...(TRACE && { inspect: traceInspect }),
});
arena.start();

const eaRef = arena.system.get("entity-a");
const ebRef = arena.system.get("entity-b");

arena.send({ type: "START" });

const snap = arena.getSnapshot();
const winner = snap.context.winner;

// ---------------------------------------------------------------------------
// Trace output
// ---------------------------------------------------------------------------

if (TRACE) {
	console.log("=== Event Trace ===\n");
	console.log(`${"seq".padStart(4)}  ${"actor".padEnd(40)}  ${"event".padEnd(16)}  detail`);
	console.log("─".repeat(120));
	for (const t of traceLog) {
		console.log(
			`${String(t.seq).padStart(4)}  ${t.actor.padEnd(40)}  ${t.event.padEnd(16)}  ${t.detail}`,
		);
		if (t.snapshot) {
			console.log(`      → ${t.snapshot}`);
		}
	}
	console.log(`\nTotal events: ${traceLog.length}\n`);
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

console.log("=== Results ===\n");

const eaSnap = eaRef?.getSnapshot();
const ebSnap = ebRef?.getSnapshot();

const eaCtx = eaSnap?.context as any;
const ebCtx = ebSnap?.context as any;

if (eaCtx) {
	const hpPct = (eaCtx.hp / eaCtx.max_hp * 100).toFixed(1);
	console.log(`Player:   HP ${fmtNum(eaCtx.hp)} / ${fmtNum(eaCtx.max_hp)} (${hpPct}%)  took ${eaCtx.damage_log.length} hits`);
	if (eaCtx.damage_log.length > 0) {
		const totalDmg = eaCtx.damage_log.reduce((s: number, d: any) => s + d.effective, 0);
		console.log(`          total damage taken: ${fmtNum(totalDmg)}`);
	}
}

if (ebCtx) {
	const hpPct = (ebCtx.hp / ebCtx.max_hp * 100).toFixed(1);
	const status = ebCtx.hp <= 0 ? " DEAD" : "";
	console.log(`Opponent: HP ${fmtNum(Math.max(0, ebCtx.hp))} / ${fmtNum(ebCtx.max_hp)} (${hpPct}%)${status}  took ${ebCtx.damage_log.length} hits`);
	if (ebCtx.damage_log.length > 0) {
		const totalDmg = ebCtx.damage_log.reduce((s: number, d: any) => s + d.effective, 0);
		console.log(`          total damage taken: ${fmtNum(totalDmg)}`);
	}
} else {
	console.log("Opponent: entity ref unavailable");
}

console.log(`\nState: ${snap.value}  Winner: ${winner ?? "none (timeout)"}`);

// Per-round damage log
console.log("\n=== Damage Log ===\n");

for (const side of [
	{ name: "Player", ctx: eaCtx },
	{ name: "Opponent", ctx: ebCtx },
]) {
	if (!side.ctx) {
		console.log(`${side.name}: died during combat`);
		continue;
	}
	console.log(`${side.name} damage received:`);
	for (let i = 0; i < side.ctx.damage_log.length; i++) {
		const d = side.ctx.damage_log[i];
		console.log(`  #${i + 1}: raw=${fmtNum(d.damage)} DR=${(d.dr_applied * 100).toFixed(1)}% effective=${fmtNum(d.effective)} from=${d.source}`);
	}
	console.log();
}

arena.stop();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtNum(n: number): string {
	if (n === 0) return "0";
	const abs = Math.abs(n);
	if (abs >= 1e16) return (n / 1e16).toFixed(2) + "京";
	if (abs >= 1e12) return (n / 1e12).toFixed(1) + "兆";
	if (abs >= 1e8) return (n / 1e8).toFixed(1) + "亿";
	if (abs >= 1e4) return (n / 1e4).toFixed(1) + "万";
	return n.toFixed(0);
}
