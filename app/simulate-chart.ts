#!/usr/bin/env bun
/**
 * CLI: Visualize combat simulation as a Chart.js HTML timeline.
 *
 * Usage:
 *   bun app/simulate-chart.ts --config config/trace-1v1.json
 *   bun app/simulate-chart.ts --config config/ye1-vs-ye2.json -o tmp/ye-combat.html
 *   bun app/simulate-chart.ts --book1 千锋聚灵剑 --book2 甲元仙符 [-o file.html]
 */

import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
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
		output: { type: "string", short: "o" },
	},
});

// ---------------------------------------------------------------------------
// Config resolution (same as simulate.ts)
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
		"  bun app/simulate-chart.ts --config config/combat.json [-o file.html]\n" +
		"  bun app/simulate-chart.ts --book1 千锋聚灵剑 --book2 甲元仙符 [-o file.html]",
	);
	process.exit(1);
}

const isDuel = !!(values.book1 && values.book2);
const config = isDuel
	? buildDuelConfig(values.book1!, values.book2!, MAX_PROGRESSION)
	: loadCombatConfig(values.config!);
const arenaDef = buildArenaDef(config);

// ---------------------------------------------------------------------------
// Collect time-series snapshots during simulation
// ---------------------------------------------------------------------------

interface ActiveStateInfo {
	id: string;         // human-readable id (e.g., "self_buff-甲元仙符-0")
	remaining: number;
	stacks: number;
	target: string;     // "self" or "opponent" relative to owner
	// Which modifiers are active
	has_dr: boolean;
	has_heal_mod: boolean;
	has_dpt: boolean;
	has_shield: boolean;
	has_counter: boolean;
	has_factor_mods: boolean;
}

interface Snapshot {
	time: number;
	event: string;
	detail: string;
	ea_hp: number;
	ea_hp_pct: number;
	ea_states: number;
	eb_hp: number;
	eb_hp_pct: number;
	eb_states: number;
	ea_shield: number;
	eb_shield: number;
	// New: effective attributes
	ea_eff_atk: number;   // base ATK × (1 + sum of atk_modifier from buffs)
	eb_eff_atk: number;
	ea_eff_dr: number;    // base DR + sum of dr_modifiers (0–1)
	eb_eff_dr: number;
	// New: active state details
	ea_active_states: ActiveStateInfo[];
	eb_active_states: ActiveStateInfo[];
}

/** Per-slot damage record */
interface DamageRecord {
	round: number;
	slot_id: string;
	platform: string;
	side: "player" | "opponent";
	total_damage: number;   // raw damage dealt
	total_effective: number; // after DR
	hit_count: number;
}

const snapshots: Snapshot[] = [];
const damageRecords: DamageRecord[] = [];
const actorIdMap = new Map<string, string>();

let combatTime = 0;
let currentRound = 0;

// Track per-slot damage accumulation during a round
let pendingDamage = new Map<string, { raw: number; effective: number; hits: number }>();
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

function readActiveStates(system: any, entityId: string): ActiveStateInfo[] {
	const entityRef = system.get(entityId);
	if (!entityRef) return [];
	const ctx = entityRef.getSnapshot()?.context as any;
	if (!ctx?.active_states) return [];

	const result: ActiveStateInfo[] = [];
	for (const stateId of ctx.active_states) {
		const ref = system.get(stateId);
		if (!ref) continue;
		const snap = ref.getSnapshot();
		if (snap?.value !== "on") continue;
		const sc = snap.context as any;
		result.push({
			id: sc.id ?? stateId,
			remaining: sc.remaining ?? 0,
			stacks: sc.stacks ?? 1,
			target: stateId.includes(entityId) ? "self" : "opponent",
			has_dr: (sc.dr_modifier ?? 0) !== 0,
			has_heal_mod: (sc.healing_modifier ?? 0) !== 0,
			has_dpt: (sc.damage_per_tick ?? 0) > 0,
			has_shield: (sc.shield_hp ?? 0) > 0,
			has_counter: (sc.counter_damage ?? 0) > 0,
			has_factor_mods: Object.keys(sc.modifiers ?? {}).some(
				(k: string) => (sc.modifiers[k] ?? 0) !== 0,
			),
		});
	}
	return result;
}

/** Read cached derived stats from entity context — no re-derivation */
function readEntityStats(system: any, entityId: string) {
	const ref = system.get(entityId);
	const ctx = ref?.getSnapshot()?.context as any;
	return {
		effective_atk: ctx?.effective_atk ?? ctx?.atk ?? 0,
		effective_dr: ctx?.effective_dr ?? 0,
	};
}

function captureSnapshot(system: any, event: string, detail: string) {
	const eaRef = system.get("entity-a");
	const ebRef = system.get("entity-b");
	const eaCtx = eaRef?.getSnapshot()?.context as any;
	const ebCtx = ebRef?.getSnapshot()?.context as any;

	snapshots.push({
		time: combatTime,
		event,
		detail,
		ea_hp: eaCtx?.hp ?? 0,
		ea_hp_pct: eaCtx ? eaCtx.hp / eaCtx.max_hp * 100 : 0,
		ea_states: eaCtx?.active_states?.length ?? 0,
		eb_hp: ebCtx?.hp ?? 0,
		eb_hp_pct: ebCtx ? ebCtx.hp / ebCtx.max_hp * 100 : 0,
		eb_states: ebCtx?.active_states?.length ?? 0,
		ea_shield: 0,
		eb_shield: 0,
		ea_eff_atk: readEntityStats(system, "entity-a").effective_atk,
		eb_eff_atk: readEntityStats(system, "entity-b").effective_atk,
		ea_eff_dr: readEntityStats(system, "entity-a").effective_dr,
		eb_eff_dr: readEntityStats(system, "entity-b").effective_dr,
		ea_active_states: readActiveStates(system, "entity-a"),
		eb_active_states: readActiveStates(system, "entity-b"),
	});
}

function chartInspect(evt: any) {
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
		if (!event) return;

		// Track per-round damage from HIT events on entities
		if (event.type === "HIT" && (actorId === "entity-a" || actorId === "entity-b")) {
			const side = actorId === "entity-a" ? "opponent" : "player"; // damage dealt BY the other side
			const key = `${currentRound}-${side}`;
			const prev = pendingDamage.get(key) ?? { raw: 0, effective: 0, hits: 0 };
			prev.raw += event.damage ?? 0;
			prev.hits += 1;
			pendingDamage.set(key, prev);
		}

	}

	if (evt.type === "@xstate.snapshot") {
		const actorId = resolveActorName(evt.actorRef);

		if (actorId === "arena") {
			const arenaCtx = evt.snapshot?.context;
			if (arenaCtx && arenaCtx.current_round > currentRound) {
				// Flush pending damage for completed round
				flushDamageRecords();
				currentRound = arenaCtx.current_round;
				combatTime = currentRound * arenaDef.t_gap;
			}
		}

		if (actorId === "entity-a" || actorId === "entity-b") {
			const ctx = evt.snapshot?.context;
			if (!ctx) return;

			const lastDmg = ctx.damage_log?.[ctx.damage_log.length - 1];
			let detail = "";
			if (lastDmg) {
				detail = `${actorId} hit: -${fmtNum(lastDmg.effective)} (DR=${(lastDmg.dr_applied * 100).toFixed(0)}%)`;
			}

			captureSnapshot(evt.actorRef._parent?.system ?? {}, "state_change", detail);
		}
	}
}

function flushDamageRecords() {
	// Convert pending damage into records for the completed round
	for (const [key, data] of pendingDamage) {
		const [roundStr, side] = key.split("-") as [string, "player" | "opponent"];
		const round = parseInt(roundStr);
		const slots = side === "player" ? arenaDef.slots_a : arenaDef.slots_b;
		const slot = slots[round] ?? slots[0];
		damageRecords.push({
			round,
			slot_id: slot?.id ?? `slot-${round}`,
			platform: slot?.platform ?? "?",
			side,
			total_damage: data.raw,
			total_effective: 0, // will compute from entity damage logs
			hit_count: data.hits,
		});
	}
	pendingDamage.clear();
}

// ---------------------------------------------------------------------------
// Run simulation
// ---------------------------------------------------------------------------

const arena = createActor(arenaMachine, {
	input: arenaDef,
	systemId: "arena",
	inspect: chartInspect,
});

arena.start();
captureSnapshot(arena.system, "START", "Combat begins");
arena.send({ type: "START" });

// Flush final round damage
flushDamageRecords();

const snap = arena.getSnapshot();
const winner = snap.context.winner;

captureSnapshot(arena.system, "END", winner ? `${winner} wins` : "timeout");

console.log(`Simulation complete: ${snapshots.length} snapshots, ${damageRecords.length} damage records`);
console.log(`Winner: ${winner ?? "none (timeout)"}`);

// ---------------------------------------------------------------------------
// Compute per-round effective damage from entity damage logs
// ---------------------------------------------------------------------------

const eaCtx = arena.system.get("entity-a")?.getSnapshot()?.context as any;
const ebCtx = arena.system.get("entity-b")?.getSnapshot()?.context as any;

// Group damage log entries into per-round totals
interface RoundDamage {
	player_dealt: number;   // damage player dealt to opponent (effective)
	opponent_dealt: number; // damage opponent dealt to player (effective)
}

const maxRounds = Math.max(arenaDef.slots_a.length, arenaDef.slots_b.length);
const roundDamages: RoundDamage[] = [];

// Simple approach: divide damage log into rounds by index
// Each round has slots_a[i] + slots_b[i] activating
if (ebCtx?.damage_log && eaCtx?.damage_log) {
	// Player deals damage to opponent (eb's damage log)
	let ebIdx = 0;
	let eaIdx = 0;
	for (let r = 0; r < maxRounds; r++) {
		const sa = arenaDef.slots_a[r];
		const sb = arenaDef.slots_b[r];
		let playerDealt = 0;
		let opponentDealt = 0;

		// Player's slot hits opponent
		if (sa) {
			const hits = sa.hit_count + (sa.states_to_create?.length ?? 0); // approximate
			for (let h = 0; h < sa.hit_count && ebIdx < ebCtx.damage_log.length; h++, ebIdx++) {
				playerDealt += ebCtx.damage_log[ebIdx].effective;
			}
		}

		// Opponent's slot hits player
		if (sb) {
			for (let h = 0; h < sb.hit_count && eaIdx < eaCtx.damage_log.length; h++, eaIdx++) {
				opponentDealt += eaCtx.damage_log[eaIdx].effective;
			}
		}

		roundDamages.push({ player_dealt: playerDealt, opponent_dealt: opponentDealt });
	}

	// Remaining damage (DoTs, counters, etc.)
	let extraPlayer = 0, extraOpponent = 0;
	for (; ebIdx < ebCtx.damage_log.length; ebIdx++) extraPlayer += ebCtx.damage_log[ebIdx].effective;
	for (; eaIdx < eaCtx.damage_log.length; eaIdx++) extraOpponent += eaCtx.damage_log[eaIdx].effective;
	if (extraPlayer > 0 || extraOpponent > 0) {
		if (roundDamages.length > 0) {
			roundDamages[roundDamages.length - 1].player_dealt += extraPlayer;
			roundDamages[roundDamages.length - 1].opponent_dealt += extraOpponent;
		}
	}
}

// ---------------------------------------------------------------------------
// Build state Gantt data
// ---------------------------------------------------------------------------

interface GanttBar {
	label: string;      // state name
	entity: string;     // "player" or "opponent" — who it's ON
	startTime: number;
	endTime: number;
	type: string;       // "buff" | "debuff" | "dot" | "shield"
}

const ganttBars: GanttBar[] = [];
const stateTracker = new Map<string, { label: string; entity: string; startTime: number; type: string }>();

for (const s of snapshots) {
	const time = s.time;

	// Process both entities
	for (const [entityLabel, states] of [
		["player", s.ea_active_states],
		["opponent", s.eb_active_states],
	] as const) {
		const currentIds = new Set(states.map(st => `${entityLabel}-${st.id}`));

		// Check for new states
		for (const st of states) {
			const key = `${entityLabel}-${st.id}`;
			if (!stateTracker.has(key)) {
				let type = "buff";
				if (st.has_dpt) type = "dot";
				else if (st.has_shield) type = "shield";
				else if (st.has_heal_mod || st.has_dr) type = "debuff";
				else if (st.id.includes("debuff")) type = "debuff";

				stateTracker.set(key, {
					label: st.id.replace(/-\d+$/, ""),
					entity: entityLabel,
					startTime: time,
					type,
				});
			}
		}

		// Check for expired states
		for (const [key, info] of stateTracker) {
			if (info.entity === entityLabel && !currentIds.has(key)) {
				ganttBars.push({
					label: info.label,
					entity: info.entity,
					startTime: info.startTime,
					endTime: time,
					type: info.type,
				});
				stateTracker.delete(key);
			}
		}
	}
}

// Close any still-active states
for (const [, info] of stateTracker) {
	ganttBars.push({
		label: info.label,
		entity: info.entity,
		startTime: info.startTime,
		endTime: combatTime,
		type: info.type,
	});
}

// ---------------------------------------------------------------------------
// Generate Chart.js HTML
// ---------------------------------------------------------------------------

function buildSlotRows(): string {
	const rows: string[] = [];
	for (let i = 0; i < maxRounds; i++) {
		const sa = arenaDef.slots_a[i];
		const sb = arenaDef.slots_b[i];
		const saText = sa ? sa.platform + " ×" + sa.hit_count : "—";
		const sbText = sb ? sb.platform + " ×" + sb.hit_count : "—";
		rows.push("<tr><td>" + (i + 1) + "</td><td>" + saText + "</td><td>" + sbText + "</td></tr>");
	}
	return rows.join("\n");
}

function buildHTML(): string {
	// Deduplicate snapshots (keep meaningful changes)
	const filtered: Snapshot[] = [];
	let lastEaHp = -1, lastEbHp = -1, lastEaStates = -1, lastEbStates = -1;
	let lastEaDr = -1, lastEbDr = -1;
	for (const s of snapshots) {
		if (s.ea_hp !== lastEaHp || s.eb_hp !== lastEbHp ||
			s.ea_states !== lastEaStates || s.eb_states !== lastEbStates ||
			Math.abs(s.ea_eff_dr - lastEaDr) > 0.001 || Math.abs(s.eb_eff_dr - lastEbDr) > 0.001 ||
			s.event === "START" || s.event === "END") {
			filtered.push(s);
			lastEaHp = s.ea_hp;
			lastEbHp = s.eb_hp;
			lastEaStates = s.ea_states;
			lastEbStates = s.eb_states;
			lastEaDr = s.ea_eff_dr;
			lastEbDr = s.eb_eff_dr;
		}
	}

	const labels = filtered.map(s => `${s.time}s`);
	const eaHpData = filtered.map(s => s.ea_hp_pct);
	const ebHpData = filtered.map(s => s.eb_hp_pct);
	const eaStatesData = filtered.map(s => s.ea_states);
	const ebStatesData = filtered.map(s => s.eb_states);

	// Effective ATK as multiplier of base ATK
	const baseAtkA = arenaDef.entity_a.atk;
	const baseAtkB = arenaDef.entity_b.atk;
	const eaAtkMult = filtered.map(s => baseAtkA > 0 ? s.ea_eff_atk / baseAtkA : 1);
	const ebAtkMult = filtered.map(s => baseAtkB > 0 ? s.eb_eff_atk / baseAtkB : 1);

	// Effective DR%
	const eaDrPct = filtered.map(s => s.ea_eff_dr * 100);
	const ebDrPct = filtered.map(s => s.eb_eff_dr * 100);

	// Round annotations
	const roundAnnotations: string[] = [];
	for (let r = 1; r <= maxRounds; r++) {
		const t = r * arenaDef.t_gap;
		const idx = filtered.findIndex(s => s.time >= t);
		if (idx >= 0) {
			roundAnnotations.push(`
				round${r}: {
					type: 'line',
					xMin: ${idx}, xMax: ${idx},
					borderColor: 'rgba(255,255,255,0.15)',
					borderWidth: 1,
					borderDash: [4, 4],
					label: { content: 'R${r + 1}', display: true, position: 'start', color: '#666', font: { size: 10 } }
				}`);
		}
	}

	// Damage bar chart data
	const roundLabels = roundDamages.map((_, i) => `R${i + 1}`);
	const playerDmgData = roundDamages.map(r => r.player_dealt);
	const opponentDmgData = roundDamages.map(r => r.opponent_dealt);

	// Gantt data for state timeline
	// Assign each unique state a row index
	const ganttLabels = [...new Set(ganttBars.map(b => `${b.entity}: ${b.label}`))];
	const ganttDatasets: string[] = [];

	const typeColors: Record<string, { bg: string; border: string }> = {
		buff: { bg: "rgba(152,195,121,0.6)", border: "#98c379" },
		debuff: { bg: "rgba(224,108,117,0.6)", border: "#e06c75" },
		dot: { bg: "rgba(229,192,123,0.6)", border: "#e5c07b" },
		shield: { bg: "rgba(97,175,239,0.6)", border: "#61afef" },
	};

	// Build floating bar dataset for Gantt
	const ganttBarData = ganttBars.map(b => {
		const yIdx = ganttLabels.indexOf(`${b.entity}: ${b.label}`);
		return { x: [b.startTime, b.endTime], y: yIdx, type: b.type, label: b.label, entity: b.entity };
	});

	// Group by type for coloring
	const ganttByType: Record<string, Array<{ x: number[]; y: number }>> = {};
	for (const b of ganttBarData) {
		if (!ganttByType[b.type]) ganttByType[b.type] = [];
		ganttByType[b.type].push({ x: b.x, y: b.y });
	}

	for (const [type, bars] of Object.entries(ganttByType)) {
		const colors = typeColors[type] ?? typeColors.buff;
		ganttDatasets.push(`{
			label: '${type}',
			data: ${JSON.stringify(bars)},
			backgroundColor: '${colors.bg}',
			borderColor: '${colors.border}',
			borderWidth: 1,
			borderSkipped: false,
			barPercentage: 0.7,
		}`);
	}

	const playerSlots = arenaDef.slots_a.map(s => s.platform).join(", ");
	const opponentSlots = arenaDef.slots_b.map(s => s.platform).join(", ");
	const titleText = isDuel
		? `${values.book1} vs ${values.book2}`
		: values.config;

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Combat — ${titleText}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation"></script>
<style>
  body { background: #282c34; color: #abb2bf; font-family: 'SF Mono', 'Fira Code', monospace; margin: 0; padding: 20px; }
  h1 { color: #e5c07b; font-size: 1.3em; margin-bottom: 4px; }
  h2 { color: #61afef; font-size: 1.1em; margin-top: 24px; margin-bottom: 8px; }
  .info { color: #7f848e; font-size: 0.85em; margin-bottom: 16px; }
  .charts { max-width: 1200px; margin: 0 auto; }
  .chart-container { position: relative; width: 100%; margin-bottom: 16px; }
  canvas { background: #21252b; border-radius: 6px; }
  table { border-collapse: collapse; margin: 16px auto; font-size: 0.85em; }
  th, td { padding: 4px 12px; border: 1px solid #3e4451; text-align: right; }
  th { background: #2c313a; color: #e5c07b; }
  td:first-child { text-align: left; color: #98c379; }
  .player { color: #61afef; }
  .opponent { color: #e06c75; }
  .legend { display: flex; gap: 16px; justify-content: center; margin: 8px 0; font-size: 0.85em; flex-wrap: wrap; }
  .legend span { display: flex; align-items: center; gap: 4px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="charts">
<h1>${titleText}</h1>
<div class="info">
  Winner: <strong>${winner ?? "none (timeout)"}</strong>&nbsp;&nbsp;
  Rounds: ${maxRounds} × ${arenaDef.t_gap}s&nbsp;&nbsp;
  Snapshots: ${filtered.length}
</div>

<div class="legend">
  <span><span class="dot" style="background:#61afef"></span> <span class="player">Player</span></span>
  <span><span class="dot" style="background:#e06c75"></span> <span class="opponent">Opponent</span></span>
</div>

<h2>HP%</h2>
<div class="chart-container">
  <canvas id="hpChart" height="250"></canvas>
</div>

<h2>Effective Attributes</h2>
<div class="grid">
  <div class="chart-container">
    <canvas id="atkChart" height="200"></canvas>
  </div>
  <div class="chart-container">
    <canvas id="drChart" height="200"></canvas>
  </div>
</div>

<h2>Damage per Round</h2>
<div class="chart-container">
  <canvas id="dmgChart" height="200"></canvas>
</div>

${ganttLabels.length > 0 ? `
<h2>State Timeline</h2>
<div class="legend">
  <span><span class="dot" style="background:#98c379"></span> Buff</span>
  <span><span class="dot" style="background:#e06c75"></span> Debuff</span>
  <span><span class="dot" style="background:#e5c07b"></span> DoT</span>
  <span><span class="dot" style="background:#61afef"></span> Shield</span>
</div>
<div class="chart-container">
  <canvas id="ganttChart" height="${Math.max(120, ganttLabels.length * 28 + 40)}"></canvas>
</div>
` : ""}

<h2>Active States Count</h2>
<div class="chart-container">
  <canvas id="statesChart" height="150"></canvas>
</div>

<h2>Setup</h2>
<table>
<tr><th></th><th class="player">Player (entity-a)</th><th class="opponent">Opponent (entity-b)</th></tr>
<tr><td>HP</td><td>${fmtNum(arenaDef.entity_a.hp)}</td><td>${fmtNum(arenaDef.entity_b.hp)}</td></tr>
<tr><td>ATK</td><td>${fmtNum(arenaDef.entity_a.atk)}</td><td>${fmtNum(arenaDef.entity_b.atk)}</td></tr>
<tr><td>DEF</td><td>${fmtNum(arenaDef.entity_a.def)}</td><td>${fmtNum(arenaDef.entity_b.def)}</td></tr>
<tr><td>SP</td><td>${fmtNum(arenaDef.entity_a.sp)}</td><td>${fmtNum(arenaDef.entity_b.sp)}</td></tr>
<tr><td>DR</td><td>${(arenaDef.entity_a.def / (arenaDef.entity_a.def + arenaDef.entity_a.dr_constant) * 100).toFixed(1)}%</td>
    <td>${(arenaDef.entity_b.def / (arenaDef.entity_b.def + arenaDef.entity_b.dr_constant) * 100).toFixed(1)}%</td></tr>
</table>

<table>
<tr><th>Slot</th><th class="player">Player</th><th class="opponent">Opponent</th></tr>
${buildSlotRows()}
</table>
</div>

<script>
const labels = ${JSON.stringify(labels)};
const tooltipDetails = ${JSON.stringify(filtered.map(s => s.detail))};
const roundAnno = { ${roundAnnotations.join(",")} };

const sharedScales = {
  x: {
    title: { display: true, text: 'Combat Time', color: '#7f848e' },
    grid: { color: 'rgba(255,255,255,0.03)' },
    ticks: { color: '#7f848e', maxTicksLimit: 20 },
  },
};

const sharedTooltip = {
  callbacks: {
    afterBody: function(items) {
      const idx = items[0]?.dataIndex;
      return tooltipDetails[idx] ? '\\n' + tooltipDetails[idx] : '';
    }
  }
};

// --- HP Chart ---
new Chart(document.getElementById('hpChart').getContext('2d'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'Player HP%',
        data: ${JSON.stringify(eaHpData)},
        borderColor: '#61afef',
        backgroundColor: 'rgba(97,175,239,0.08)',
        fill: true, tension: 0.1, pointRadius: 2, borderWidth: 2,
      },
      {
        label: 'Opponent HP%',
        data: ${JSON.stringify(ebHpData)},
        borderColor: '#e06c75',
        backgroundColor: 'rgba(224,108,117,0.08)',
        fill: true, tension: 0.1, pointRadius: 2, borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { min: 0, max: 105, title: { display: true, text: 'HP%', color: '#7f848e' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7f848e' } },
      ...sharedScales,
    },
    plugins: {
      legend: { display: false },
      tooltip: sharedTooltip,
      annotation: { annotations: roundAnno },
    },
  },
});

// --- ATK Multiplier Chart ---
new Chart(document.getElementById('atkChart').getContext('2d'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'Player ATK×',
        data: ${JSON.stringify(eaAtkMult)},
        borderColor: '#61afef',
        backgroundColor: 'rgba(97,175,239,0.08)',
        fill: true, tension: 0, pointRadius: 1, borderWidth: 2, stepped: true,
      },
      {
        label: 'Opponent ATK×',
        data: ${JSON.stringify(ebAtkMult)},
        borderColor: '#e06c75',
        backgroundColor: 'rgba(224,108,117,0.08)',
        fill: true, tension: 0, pointRadius: 1, borderWidth: 2, stepped: true,
      },
    ],
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { title: { display: true, text: 'ATK Multiplier', color: '#7f848e' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7f848e' } },
      ...sharedScales,
    },
    plugins: {
      legend: { labels: { color: '#abb2bf' } },
      tooltip: sharedTooltip,
    },
  },
});

// --- DR% Chart ---
new Chart(document.getElementById('drChart').getContext('2d'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'Player DR%',
        data: ${JSON.stringify(eaDrPct)},
        borderColor: '#61afef',
        backgroundColor: 'rgba(97,175,239,0.08)',
        fill: true, tension: 0, pointRadius: 1, borderWidth: 2, stepped: true,
      },
      {
        label: 'Opponent DR%',
        data: ${JSON.stringify(ebDrPct)},
        borderColor: '#e06c75',
        backgroundColor: 'rgba(224,108,117,0.08)',
        fill: true, tension: 0, pointRadius: 1, borderWidth: 2, stepped: true,
      },
    ],
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { min: 0, max: 100, title: { display: true, text: 'Effective DR%', color: '#7f848e' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7f848e' } },
      ...sharedScales,
    },
    plugins: {
      legend: { labels: { color: '#abb2bf' } },
      tooltip: sharedTooltip,
    },
  },
});

// --- Damage per Round Chart ---
new Chart(document.getElementById('dmgChart').getContext('2d'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(roundLabels)},
    datasets: [
      {
        label: 'Player Dealt',
        data: ${JSON.stringify(playerDmgData)},
        backgroundColor: 'rgba(97,175,239,0.7)',
        borderColor: '#61afef',
        borderWidth: 1,
      },
      {
        label: 'Opponent Dealt',
        data: ${JSON.stringify(opponentDmgData)},
        backgroundColor: 'rgba(224,108,117,0.7)',
        borderColor: '#e06c75',
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: { title: { display: true, text: 'Effective Damage', color: '#7f848e' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7f848e' } },
      x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#7f848e' } },
    },
    plugins: {
      legend: { labels: { color: '#abb2bf' } },
      tooltip: {
        callbacks: {
          label: function(ctx) {
            return ctx.dataset.label + ': ' + fmtNumJS(ctx.raw);
          }
        }
      },
    },
  },
});

${ganttLabels.length > 0 ? `
// --- State Timeline (Gantt) Chart ---
new Chart(document.getElementById('ganttChart').getContext('2d'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(ganttLabels)},
    datasets: [${ganttDatasets.join(",")}],
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Combat Time (s)', color: '#7f848e' },
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#7f848e' },
        min: 0,
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#abb2bf', font: { size: 11 } },
      },
    },
    plugins: {
      legend: { labels: { color: '#abb2bf' } },
      tooltip: {
        callbacks: {
          label: function(ctx) {
            const d = ctx.raw;
            return ctx.dataset.label + ': ' + d.x[0] + 's → ' + d.x[1] + 's (' + (d.x[1] - d.x[0]) + 's)';
          }
        }
      },
    },
  },
});
` : ""}

// --- States Chart ---
new Chart(document.getElementById('statesChart').getContext('2d'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: 'Player States',
        data: ${JSON.stringify(eaStatesData)},
        borderColor: '#61afef',
        backgroundColor: 'rgba(97,175,239,0.1)',
        fill: true, stepped: true, pointRadius: 1, borderWidth: 2,
      },
      {
        label: 'Opponent States',
        data: ${JSON.stringify(ebStatesData)},
        borderColor: '#e06c75',
        backgroundColor: 'rgba(224,108,117,0.1)',
        fill: true, stepped: true, pointRadius: 1, borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { min: 0, title: { display: true, text: 'Active States', color: '#7f848e' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7f848e', stepSize: 1 } },
      ...sharedScales,
    },
    plugins: { legend: { labels: { color: '#abb2bf' } } },
  },
});

function fmtNumJS(n) {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e16) return (n / 1e16).toFixed(2) + '京';
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + '兆';
  if (abs >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (abs >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return n.toFixed(0);
}
</script>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const html = buildHTML();
const defaultName = isDuel
	? `${values.book1}-vs-${values.book2}`
	: values.config!.replace(/.*\//, "").replace(/\.json$/, "");
const outFile = values.output ?? `tmp/${defaultName}-combat.html`;
writeFileSync(outFile, html);
console.log(`Chart written to ${outFile}`);

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
