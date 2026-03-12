#!/usr/bin/env bun
/**
 * CLI: Visualize combat simulation as a Chart.js HTML timeline.
 *
 * Usage:
 *   bun app/simulate-chart.ts --config config/trace-1v1.json
 *   bun app/simulate-chart.ts --config config/ye1-vs-ye2.json -o tmp/ye-combat.html
 */

import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { createActor } from "xstate";
import { buildArenaDef, loadCombatConfig, MAX_PROGRESSION } from "../lib/simulator/bridge";
import { arenaMachine } from "../lib/simulator/actors/arena";

const { values } = parseArgs({
	options: {
		config: { type: "string", short: "c" },
		output: { type: "string", short: "o" },
	},
});

if (!values.config) {
	console.error("Usage: bun app/simulate-chart.ts --config config/combat.json [-o file.html]");
	process.exit(1);
}

const config = loadCombatConfig(values.config);
const arenaDef = buildArenaDef(config);

// ---------------------------------------------------------------------------
// Collect time-series snapshots during simulation
// ---------------------------------------------------------------------------

interface Snapshot {
	time: number;        // combat time in seconds
	event: string;       // event type
	detail: string;      // short description
	ea_hp: number;       // entity-a HP
	ea_hp_pct: number;
	ea_states: number;   // active state count
	eb_hp: number;       // entity-b HP
	eb_hp_pct: number;
	eb_states: number;
	ea_shield: number;   // remaining shield HP
	eb_shield: number;
}

const snapshots: Snapshot[] = [];
const actorIdMap = new Map<string, string>();

// Track combat time: each round boundary is t_gap seconds
let combatTime = 0;
let currentRound = 0;

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

function readShieldHp(system: any, entityId: string): number {
	// Find shield state effects for this entity
	const shieldId = `shield-sp-${entityId}`;
	const ref = system.get(shieldId);
	if (!ref) return 0;
	const snap = ref.getSnapshot();
	if (snap?.value !== "on") return 0;
	return (snap.context as any)?.shield_hp ?? 0;
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
		ea_shield: readShieldHp(system, "entity-a"),
		eb_shield: readShieldHp(system, "entity-b"),
	});
}

// Use @xstate.snapshot to capture state after each entity change
function chartInspect(evt: any) {
	if (evt.type === "@xstate.actor") {
		const ref = evt.actorRef;
		if (ref) {
			const systemId = ref._systemId ?? ref.systemId;
			if (systemId) actorIdMap.set(ref.id, systemId);
		}
	}

	if (evt.type === "@xstate.snapshot") {
		const actorId = resolveActorName(evt.actorRef);

		// Track round transitions to advance combat time
		if (actorId === "arena") {
			const arenaCtx = evt.snapshot?.context;
			if (arenaCtx && arenaCtx.current_round > currentRound) {
				currentRound = arenaCtx.current_round;
				combatTime = currentRound * arenaDef.t_gap;
			}
		}

		// Capture snapshots when entity state changes
		if (actorId === "entity-a" || actorId === "entity-b") {
			const ctx = evt.snapshot?.context;
			if (!ctx) return;

			// Determine what caused the change from the damage log
			const lastDmg = ctx.damage_log?.[ctx.damage_log.length - 1];
			let detail = "";
			if (lastDmg && ctx.damage_log.length > (snapshots.length > 0 ? 0 : -1)) {
				detail = `${actorId} hit by ${lastDmg.source}: -${fmtNum(lastDmg.effective)}`;
			}

			captureSnapshot(evt.actorRef._parent?.system ?? {}, "state_change", detail);
		}
	}
}

// ---------------------------------------------------------------------------
// Run simulation
// ---------------------------------------------------------------------------

const arena = createActor(arenaMachine, {
	input: arenaDef,
	systemId: "arena",
	inspect: chartInspect,
});

// Initial snapshot
arena.start();
captureSnapshot(arena.system, "START", "Combat begins");
arena.send({ type: "START" });

const snap = arena.getSnapshot();
const winner = snap.context.winner;

// Final snapshot
captureSnapshot(arena.system, "END", winner ? `${winner} wins` : "timeout");

console.log(`Simulation complete: ${snapshots.length} snapshots captured`);
console.log(`Winner: ${winner ?? "none (timeout)"}`);

// ---------------------------------------------------------------------------
// Generate Chart.js HTML
// ---------------------------------------------------------------------------

function buildHTML(): string {
	// Deduplicate snapshots at same time+hp (keep meaningful changes)
	const filtered: Snapshot[] = [];
	let lastEaHp = -1, lastEbHp = -1, lastEaStates = -1, lastEbStates = -1;
	for (const s of snapshots) {
		if (s.ea_hp !== lastEaHp || s.eb_hp !== lastEbHp ||
			s.ea_states !== lastEaStates || s.eb_states !== lastEbStates ||
			s.event === "START" || s.event === "END") {
			filtered.push(s);
			lastEaHp = s.ea_hp;
			lastEbHp = s.eb_hp;
			lastEaStates = s.ea_states;
			lastEbStates = s.eb_states;
		}
	}

	const labels = filtered.map((s, i) => `${s.time}s`);
	const eaHpData = filtered.map(s => s.ea_hp_pct);
	const ebHpData = filtered.map(s => s.eb_hp_pct);
	const eaStatesData = filtered.map(s => s.ea_states);
	const ebStatesData = filtered.map(s => s.eb_states);
	const eaShieldData = filtered.map(s => s.ea_shield > 0 ? s.ea_shield / (arenaDef.entity_a.sp * arenaDef.sp_shield_ratio || 1) * 100 : 0);
	const ebShieldData = filtered.map(s => s.eb_shield > 0 ? s.eb_shield / (arenaDef.entity_b.sp * arenaDef.sp_shield_ratio || 1) * 100 : 0);

	// Annotations for round boundaries
	const maxRounds = Math.max(arenaDef.slots_a.length, arenaDef.slots_b.length);
	const roundAnnotations: string[] = [];
	for (let r = 1; r <= maxRounds; r++) {
		const t = r * arenaDef.t_gap;
		roundAnnotations.push(`
			round${r}: {
				type: 'line',
				xMin: ${filtered.findIndex(s => s.time >= t)},
				xMax: ${filtered.findIndex(s => s.time >= t)},
				borderColor: 'rgba(255,255,255,0.15)',
				borderWidth: 1,
				borderDash: [4, 4],
				label: { content: 'R${r + 1}', display: true, position: 'start', color: '#666', font: { size: 10 } }
			}`);
	}

	// Event annotations (damage events as points)
	const eventAnnotations: string[] = [];
	filtered.forEach((s, i) => {
		if (s.detail && s.detail.includes("hit by")) {
			eventAnnotations.push(`
			evt${i}: {
				type: 'point',
				xValue: ${i},
				yValue: ${s.detail.includes("entity-a") ? s.ea_hp_pct.toFixed(1) : s.eb_hp_pct.toFixed(1)},
				radius: 3,
				backgroundColor: '${s.detail.includes("entity-a") ? "rgba(99,179,237,0.6)" : "rgba(252,129,129,0.6)"}',
			}`);
		}
	});

	const playerSlots = arenaDef.slots_a.map(s => s.platform).join(", ");
	const opponentSlots = arenaDef.slots_b.map(s => s.platform).join(", ");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Combat Simulation — ${values.config}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation"></script>
<style>
  body { background: #282c34; color: #abb2bf; font-family: 'SF Mono', 'Fira Code', monospace; margin: 0; padding: 20px; }
  h1 { color: #e5c07b; font-size: 1.3em; margin-bottom: 4px; }
  h2 { color: #61afef; font-size: 1.1em; margin-top: 20px; }
  .info { color: #7f848e; font-size: 0.85em; margin-bottom: 16px; }
  .chart-container { position: relative; width: 100%; max-width: 1200px; margin: 0 auto; }
  canvas { background: #21252b; border-radius: 6px; }
  table { border-collapse: collapse; margin: 16px auto; font-size: 0.85em; }
  th, td { padding: 4px 12px; border: 1px solid #3e4451; text-align: right; }
  th { background: #2c313a; color: #e5c07b; }
  td:first-child { text-align: left; color: #98c379; }
  .player { color: #61afef; }
  .opponent { color: #e06c75; }
  .legend { display: flex; gap: 24px; justify-content: center; margin: 12px 0; font-size: 0.9em; }
  .legend span { display: flex; align-items: center; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
</style>
</head>
<body>
<h1>Combat Simulation</h1>
<div class="info">
  Config: ${values.config}<br>
  Winner: ${winner ?? "none (timeout)"}<br>
  Rounds: ${maxRounds} × ${arenaDef.t_gap}s
</div>

<div class="legend">
  <span><span class="dot" style="background:#61afef"></span> <span class="player">Player HP%</span></span>
  <span><span class="dot" style="background:#e06c75"></span> <span class="opponent">Opponent HP%</span></span>
  <span><span class="dot" style="background:rgba(99,179,237,0.3)"></span> Player Shield%</span>
  <span><span class="dot" style="background:rgba(252,129,129,0.3)"></span> Opponent Shield%</span>
</div>

<h2>HP Over Time</h2>
<div class="chart-container">
  <canvas id="hpChart" height="300"></canvas>
</div>

<h2>Active States Over Time</h2>
<div class="chart-container">
  <canvas id="statesChart" height="180"></canvas>
</div>

<h2>Slot Setup</h2>
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
${Array.from({ length: maxRounds }, (_, i) => {
	const sa = arenaDef.slots_a[i];
	const sb = arenaDef.slots_b[i];
	return `<tr><td>${i + 1}</td><td>${sa ? `${sa.platform} ×${sa.hit_count}` : "—"}</td><td>${sb ? `${sb.platform} ×${sb.hit_count}` : "—"}</td></tr>`;
}).join("\n")}
</table>

<script>
const labels = ${JSON.stringify(labels)};

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
        fill: true,
        tension: 0.1,
        pointRadius: 2,
        pointHitRadius: 8,
        borderWidth: 2,
      },
      {
        label: 'Opponent HP%',
        data: ${JSON.stringify(ebHpData)},
        borderColor: '#e06c75',
        backgroundColor: 'rgba(224,108,117,0.08)',
        fill: true,
        tension: 0.1,
        pointRadius: 2,
        pointHitRadius: 8,
        borderWidth: 2,
      },
      ${arenaDef.sp_shield_ratio > 0 ? `{
        label: 'Player Shield%',
        data: ${JSON.stringify(eaShieldData)},
        borderColor: 'rgba(99,179,237,0.3)',
        backgroundColor: 'rgba(99,179,237,0.05)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [4, 4],
      },
      {
        label: 'Opponent Shield%',
        data: ${JSON.stringify(ebShieldData)},
        borderColor: 'rgba(252,129,129,0.3)',
        backgroundColor: 'rgba(252,129,129,0.05)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [4, 4],
      },` : ""}
    ],
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        min: 0,
        max: 105,
        title: { display: true, text: '%', color: '#7f848e' },
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#7f848e' },
      },
      x: {
        title: { display: true, text: 'Combat Time', color: '#7f848e' },
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#7f848e', maxTicksLimit: 20 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterBody: function(items) {
            const idx = items[0]?.dataIndex;
            const snaps = ${JSON.stringify(filtered.map(s => s.detail))};
            return snaps[idx] ? '\\n' + snaps[idx] : '';
          }
        }
      },
      annotation: {
        annotations: {
          ${roundAnnotations.join(",")}
        }
      }
    },
  },
});

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
        fill: true,
        stepped: true,
        pointRadius: 1,
        borderWidth: 2,
      },
      {
        label: 'Opponent States',
        data: ${JSON.stringify(ebStatesData)},
        borderColor: '#e06c75',
        backgroundColor: 'rgba(224,108,117,0.1)',
        fill: true,
        stepped: true,
        pointRadius: 1,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        min: 0,
        title: { display: true, text: 'Active States', color: '#7f848e' },
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#7f848e', stepSize: 1 },
      },
      x: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#7f848e', maxTicksLimit: 20 },
      },
    },
    plugins: {
      legend: { labels: { color: '#abb2bf' } },
    },
  },
});
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const html = buildHTML();
const defaultName = values.config!.replace(/.*\//, "").replace(/\.json$/, "");
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
