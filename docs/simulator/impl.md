<style>
body {
  max-width: none !important;
  width: 95% !important;
  margin: 0 auto !important;
  padding: 20px 40px !important;
  background-color: #282c34 !important;
  color: #abb2bf !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
  line-height: 1.6 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

h1, h2, h3, h4, h5, h6 {
  color: #ffffff !important;
}

a {
  color: #61afef !important;
}

code {
  background-color: #3e4451 !important;
  color: #e5c07b !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
}

pre {
  background-color: #2c313a !important;
  border: 1px solid #4b5263 !important;
  border-radius: 6px !important;
  padding: 16px !important;
  overflow-x: auto !important;
}

pre code {
  background-color: transparent !important;
  color: #abb2bf !important;
  padding: 0 !important;
  border-radius: 0 !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
}

table {
  border-collapse: collapse !important;
  width: auto !important;
  margin: 16px 0 !important;
  table-layout: auto !important;
  display: table !important;
}

table th,
table td {
  border: 1px solid #4b5263 !important;
  padding: 8px 10px !important;
  word-wrap: break-word !important;
}

table th:first-child,
table td:first-child {
  min-width: 60px !important;
}

table th {
  background: #3e4451 !important;
  color: #e5c07b !important;
  font-size: 14px !important;
  text-align: center !important;
}

table td {
  background: #2c313a !important;
  font-size: 12px !important;
  text-align: left !important;
}

blockquote {
  border-left: 3px solid #4b5263 !important;
  padding-left: 10px !important;
  color: #5c6370 !important;
  background-color: #2c313a !important;
}

strong {
  color: #e5c07b !important;
}
</style>

# Combat Simulator — Implementation Guide

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)
**Date:** 2026-03-16

> **Purpose.** Maps [design.md](design.md) to XState v5 code. Each section references the design section it implements.

---

## 1. Technology

| Concern | Choice |
|:--------|:-------|
| State machines | XState v5 (5.28.0) — `setup()`, `sendTo`, `emit`, `inspect` |
| Runtime | Bun |
| Language | TypeScript (strict) |
| RNG | Mulberry32 (fast, deterministic, 32-bit seed) |
| Testing | `bun:test` |

---

## 2. File Structure

```
lib/
  data/
    types.ts                    ← existing (BookData, EffectRow, StateDef, AffixSection)
  sim/
    types.ts                    ← events, PlayerState, StateInstance, configs
    clock.ts                    ← SimulationClock (XState clock adapter)
    rng.ts                      ← SeededRNG (Mulberry32)
    config.ts                   ← loadConfig, validateConfig, selectTier
    book.ts                     ← processBook(): direct effects → events + listener registrations
    damage-chain.ts             ← buildHitEvents(): zone accumulation → per-hit HIT events
    handlers/
      index.ts                  ← HandlerRegistry
      types.ts                  ← Handler, HandlerContext, HandlerResult
      damage.ts                 ← base_attack, percent_max_hp_damage, flat_extra_damage
      buff.ts                   ← self_buff, self_damage_reduction_during_cast
      debuff.ts                 ← debuff
      dot.ts                    ← dot
      shield.ts                 ← shield_strength
      healing.ts                ← lifesteal
      cost.ts                   ← self_hp_cost
      escalation.ts             ← per_hit_escalation
      resonance.ts              ← guaranteed_resonance
      multiplier.ts             ← probability_multiplier, damage_increase, skill_damage_increase
    player.ts                   ← PlayerMachine (the only XState machine)
    arena.ts                    ← runFight(): clock + scheduler + hit interleaving
    runner.ts                   ← createSimulation(): wires everything, returns event stream
    monte-carlo.ts              ← runMonteCarlo(): batch runner
    trace.ts                    ← formatTrace(): event subscriber → ASCII output
app/
  simulate.ts                   ← CLI entry point
```

---

## 3. XState v5 Mapping

Design §4.1 defines two event layers. XState v5 provides the exact primitives:

| Design concept | XState v5 primitive |
|:---------------|:-------------------|
| Intent events (cross-player) | `sendTo(otherPlayerRef, event)` |
| State-change events (observable) | `emit(event)` — notifies subscribers of this actor |
| External observation | `actor.on('*', listener)` or `inspect` callback |
| Reactive listeners (affix subscriptions) | XState `on:` event handlers + context-stored listener registry |
| Virtual time | Custom `Clock` implementation passed to `createActor` |
| Named state lifecycle | `after` (delayed transitions) for expiry; clock callbacks for ticks |

**Only the Player is an XState machine.** Arena is a plain function. Book is a pure function.

---

## 4. Types (lib/sim/types.ts)

Implements design §3, §4.

```ts
// ── Player State (design §3.1) ──

interface PlayerState {
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  spRegen: number;
  shield: number;
  atk: number;
  baseAtk: number;
  def: number;
  baseDef: number;
  states: StateInstance[];
  alive: boolean;
}

// ── State Instance (design §3.2) ──

interface StateInstance {
  name: string;
  kind: "buff" | "debuff" | "named";
  source: string;
  target: "self" | "opponent";
  effects: StateEffect[];
  remainingDuration: number;
  stacks: number;
  maxStacks: number;
  dispellable: boolean;
  trigger?: "on_cast" | "on_attacked" | "per_tick";
  parent?: string;
}

interface StateEffect {
  stat: string;
  value: number;
}

// ── Reactive Listener Registration (design §3.4) ──
// Returned by book function for effects with parent != "this"

interface ListenerRegistration {
  parent: string;                // named state to listen to
  trigger: "on_apply" | "on_expire" | "per_tick" | "on_attacked" | "on_cast";
  handler: (ctx: ListenerContext) => IntentEvent[];
}

interface ListenerContext {
  sourcePlayer: Readonly<PlayerState>;
  targetPlayerRef: ActorRef;     // XState actor ref — for sendTo
  rng: SeededRNG;
  book: string;
}

// ── Intent Events (design §4.1, cross-player) ──

type IntentEvent =
  | { type: "HIT"; hitIndex: number; damage: number; spDamage: number;
      perHitEffects?: IntentEvent[] }
  | { type: "HP_DAMAGE"; percent: number; basis: "max" | "current" | "lost" }
  | { type: "APPLY_STATE"; state: StateInstance }
  | { type: "APPLY_DOT"; name: string; damagePerTick: number;
      tickInterval: number; duration: number; source: string }
  | { type: "HEAL"; value: number }
  | { type: "SHIELD"; value: number; duration: number }
  | { type: "HP_COST"; percent: number; basis: "current" | "max" }
  | { type: "DISPEL"; count: number }
  | { type: "BUFF_STEAL"; count: number }
  | { type: "DELAYED_BURST"; damage: number; delay: number }
  | { type: "LIFESTEAL"; percent: number; damageDealt: number }
  | { type: "SELF_CLEANSE"; count?: number }
  | { type: "HP_FLOOR"; minPercent: number };

// ── State-Change Events (design §4.1, emitted to subscribers) ──

type StateChangeEvent =
  | { type: "HP_CHANGE"; player: string; prev: number; next: number;
      cause: IntentEvent; t: number }
  | { type: "SP_CHANGE"; player: string; prev: number; next: number;
      cause: string; t: number }
  | { type: "SHIELD_CHANGE"; player: string; prev: number; next: number;
      cause: string; t: number }
  | { type: "STATE_APPLY"; player: string; state: StateInstance; t: number }
  | { type: "STATE_EXPIRE"; player: string; name: string; t: number }
  | { type: "STATE_TICK"; player: string; name: string; t: number }
  | { type: "STATE_TRIGGERED"; player: string; name: string;
      trigger: string; t: number }
  | { type: "STATE_REMOVE"; player: string; name: string;
      cause: string; t: number }
  | { type: "STAT_CHANGE"; player: string; stat: string;
      prev: number; next: number; t: number }
  | { type: "CAST_START"; player: string; slot: number;
      book: string; t: number }
  | { type: "CAST_END"; player: string; slot: number; t: number }
  | { type: "DEATH"; player: string; t: number };

// ── Configuration (design §10) ──

interface PlayerConfig {
  entity: {
    hp: number; atk: number; sp: number;
    def: number; spRegen: number;
  };
  formulas: { dr_constant: number; sp_shield_ratio: number };
  progression: { enlightenment: number; fusion: number };
  books: BookSlot[];
}

interface BookSlot {
  slot: number;
  platform: string;
  op1?: string;
  op2?: string;
}

interface ArenaConfig {
  playerA: PlayerConfig;
  playerB: PlayerConfig;
  tGap: number;
  maxEvents: number;
  maxChainDepth: number;
  seed: number;
}
```

---

## 5. SimulationClock (lib/sim/clock.ts)

Implements design §8.1. XState v5 Clock adapter.

```ts
interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

class SimulationClock implements Clock {
  private queue: PriorityQueue<{ id: number; time: number; fn: () => void }>;
  private currentTime = 0;
  private nextId = 1;

  setTimeout(fn, ms) {
    const id = this.nextId++;
    this.queue.push({ id, time: this.currentTime + ms, fn });
    return id;
  }

  clearTimeout(id) { this.queue.remove(id); }

  advanceTo(targetTime: number) {
    while (!this.queue.isEmpty() && this.queue.peek().time <= targetTime) {
      const entry = this.queue.pop();
      this.currentTime = entry.time;
      entry.fn();
    }
    this.currentTime = targetTime;
  }

  drain() {
    while (!this.queue.isEmpty()) {
      const entry = this.queue.pop();
      this.currentTime = entry.time;
      entry.fn();
    }
  }

  now() { return this.currentTime; }
}
```

---

## 6. SeededRNG (lib/sim/rng.ts)

Mulberry32:

```ts
class SeededRNG {
  private state: number;
  constructor(seed: number) { this.state = seed | 0; }

  next(): number {  // returns [0, 1)
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  chance(p: number): boolean { return this.next() < p; }

  weightedPick<T>(tiers: { weight: number; value: T }[]): T {
    const roll = this.next();
    let cum = 0;
    for (const t of tiers) { cum += t.weight; if (roll < cum) return t.value; }
    return tiers[tiers.length - 1].value;
  }
}
```

---

## 7. Book Function (lib/sim/book.ts)

Implements design §5.3. Pure function — not an actor.

```ts
interface BookResult {
  directEvents: IntentEvent[];           // immediate: HIT[], APPLY_STATE, HEAL, etc.
  listeners: ListenerRegistration[];     // reactive: parent != "this"
}

function processBook(
  bookData: BookData,
  affixEffects: EffectRow[],
  ctx: HandlerContext
): BookResult {
  const directEffects: EffectRow[] = [];
  const reactiveEffects: EffectRow[] = [];

  // Separate direct vs reactive (design §3.4)
  for (const effect of allEffects(bookData, affixEffects)) {
    const tier = selectTier(effect, ctx.progression);
    if (!tier) continue;  // no matching tier — skip
    if (effect.parent === "this" || !effect.parent) {
      directEffects.push(tier);
    } else {
      reactiveEffects.push(tier);
    }
  }

  // Process direct effects through handlers → HandlerResults
  const results = directEffects.map(e => {
    const handler = registry.get(e.type);
    if (!handler) { warn(`No handler for ${e.type}`); return null; }
    return handler(e, ctx);
  }).filter(Boolean);

  // Build damage chain from HandlerResults → HIT events (design §6)
  const hitEvents = buildHitEvents(results, ctx);

  // Collect non-damage intent events
  const otherEvents = results.flatMap(r => r.intents ?? []);

  // Build listener registrations for reactive effects (design §3.4)
  const listeners = reactiveEffects.map(e =>
    buildListenerRegistration(e, ctx)
  );

  return {
    directEvents: [...hitEvents, ...otherEvents],
    listeners,
  };
}
```

---

## 8. Damage Chain (lib/sim/damage-chain.ts)

Implements design §6.

```ts
function buildHitEvents(
  results: HandlerResult[],
  ctx: HandlerContext
): IntentEvent[] {
  // Accumulate from all handler results
  let basePercent = 0, flatExtra = 0, spDamage = 0;
  const zones = { M_dmg: 0, M_skill: 0, M_final: 0, M_synchro: 1 };
  let escalation: ((k: number) => { M_skill?: number; M_dmg?: number }) | undefined;
  let perHitEffectsFn: ((k: number) => IntentEvent[]) | undefined;

  for (const r of results) {
    if (r.basePercent) basePercent = r.basePercent;
    if (r.flatExtra) flatExtra += r.flatExtra;
    if (r.spDamage) spDamage += r.spDamage;
    if (r.zones) {
      zones.M_dmg += r.zones.M_dmg ?? 0;
      zones.M_skill += r.zones.M_skill ?? 0;
      zones.M_final += r.zones.M_final ?? 0;
      zones.M_synchro *= r.zones.M_synchro ?? 1;
    }
    if (r.perHitEscalation) escalation = r.perHitEscalation;
    if (r.perHitEffects) perHitEffectsFn = r.perHitEffects;
  }

  if (!basePercent || !ctx.hits) return [];

  const perHitPercent = basePercent / ctx.hits;
  const perHitFlat = flatExtra / ctx.hits;
  const perHitSp = spDamage / ctx.hits;
  const events: IntentEvent[] = [];

  for (let k = 0; k < ctx.hits; k++) {
    const esc = escalation?.(k) ?? {};
    let damage = (perHitPercent / 100) * ctx.atk + perHitFlat;
    damage *= (1 + zones.M_dmg + (esc.M_dmg ?? 0));
    damage *= (1 + zones.M_skill + (esc.M_skill ?? 0));
    damage *= (1 + zones.M_final);
    damage *= zones.M_synchro;

    if (!Number.isFinite(damage)) throw new Error(`Non-finite damage at hit ${k}`);

    events.push({
      type: "HIT",
      hitIndex: k,
      damage,
      spDamage: perHitSp,
      perHitEffects: perHitEffectsFn?.(k),
    });
  }
  return events;
}
```

---

## 9. Player Machine (lib/sim/player.ts)

Implements design §5.2. **The only XState v5 machine in the system.**

```ts
interface PlayerContext {
  state: PlayerState;
  label: string;
  formulas: { dr_constant: number; sp_shield_ratio: number };
  opponentRef: ActorRef;              // for sendTo (cross-player intents)
  clock: SimulationClock;
  rng: SeededRNG;
  listeners: ListenerRegistration[];  // reactive affix subscriptions
  chainDepth: number;
  maxChainDepth: number;
}

// All events the player machine can receive
type PlayerEvent =
  | { type: "CAST_SLOT"; slot: number }
  | IntentEvent                        // HIT, HEAL, APPLY_STATE, etc.
  | { type: "STATE_TICK"; name: string }
  | { type: "STATE_EXPIRE"; name: string }
  | { type: "CLOCK_TICK"; dt: number };

const playerMachine = setup({
  types: {
    context: {} as PlayerContext,
    events: {} as PlayerEvent,
  },
  actions: {
    // ── React to CAST_SLOT ──
    // Calls book function, sends HIT events to opponent via sendTo,
    // processes self-targeted events locally
    processCast: ({ context, event, self }) => { /* ... */ },

    // ── React to HIT (design §7) ──
    // DR → SP shield gen → shield absorb → HP → resonance SP → perHitEffects
    // → on_attacked triggers → emit state-change events
    resolveHit: ({ context, event, self }) => { /* ... */ },

    // ── React to other intent events ──
    resolveIntent: ({ context, event, self }) => { /* ... */ },

    // ── React to STATE_TICK ──
    // Fire per_tick listeners, emit STATE_TICK state-change event
    processStateTick: ({ context, event, self }) => { /* ... */ },

    // ── React to STATE_EXPIRE ──
    // Remove state + children, deactivate listeners, recalc stats
    processStateExpire: ({ context, event, self }) => { /* ... */ },

    // ── React to CLOCK_TICK ──
    // SP regen
    processClockTick: ({ context, event, self }) => { /* ... */ },

    emitDeath: ({ context, self }) => { /* ... */ },
  },
  guards: {
    isAlive: ({ context }) => context.state.alive,
    isDead: ({ context }) => !context.state.alive,
  },
}).createMachine({
  id: "player",
  initial: "alive",
  states: {
    alive: {
      on: {
        CAST_SLOT:      { actions: "processCast",       guard: "isAlive" },
        HIT:            { actions: "resolveHit",         guard: "isAlive" },
        HP_DAMAGE:      { actions: "resolveIntent",      guard: "isAlive" },
        APPLY_STATE:    { actions: "resolveIntent",      guard: "isAlive" },
        APPLY_DOT:      { actions: "resolveIntent",      guard: "isAlive" },
        HEAL:           { actions: "resolveIntent",      guard: "isAlive" },
        SHIELD:         { actions: "resolveIntent",      guard: "isAlive" },
        HP_COST:        { actions: "resolveIntent",      guard: "isAlive" },
        DISPEL:         { actions: "resolveIntent",      guard: "isAlive" },
        BUFF_STEAL:     { actions: "resolveIntent",      guard: "isAlive" },
        LIFESTEAL:      { actions: "resolveIntent",      guard: "isAlive" },
        SELF_CLEANSE:   { actions: "resolveIntent",      guard: "isAlive" },
        HP_FLOOR:       { actions: "resolveIntent",      guard: "isAlive" },
        STATE_TICK:     { actions: "processStateTick",   guard: "isAlive" },
        STATE_EXPIRE:   { actions: "processStateExpire" },
        CLOCK_TICK:     { actions: "processClockTick" },
      },
      always: { target: "dead", guard: "isDead" },
    },
    dead: {
      type: "final",
      entry: "emitDeath",
    },
  },
});
```

### 9.1 processCast action (design §5.3 + §8.2)

```ts
// Pseudocode — the reactive flow
processCast: ({ context, event, self }) => {
  const slot = event.slot;
  const bookSlot = context.books[slot - 1];
  const bookData = loadedBooks[bookSlot.platform];
  const affixEffects = resolveAffixes(bookSlot);

  // Call book function — pure computation
  const result = processBook(bookData, affixEffects, {
    sourcePlayer: context.state,
    book: bookSlot.platform,
    slot,
    rng: context.rng,
    atk: context.state.atk,
    hits: extractHits(bookData),
    progression: context.progression,
  });

  // Register reactive listeners (first cast only — or re-register each cast)
  for (const listener of result.listeners) {
    context.listeners.push(listener);
  }

  // Emit CAST_START state-change event
  emit({ type: "CAST_START", player: context.label, slot, book: bookSlot.platform,
         t: context.clock.now() });

  // Self-targeted intent events: process locally
  for (const ev of result.directEvents.filter(e => isSelfTargeted(e))) {
    self.send(ev);  // sends to own machine — processed reactively
  }

  // Opponent-targeted intent events: sendTo opponent
  // HIT events go to arena for interleaving (see §10)
  // Non-HIT events sent after hits resolve
  for (const ev of result.directEvents.filter(e => !isSelfTargeted(e) && e.type !== "HIT")) {
    sendTo(context.opponentRef, ev);
  }

  // HIT events returned to arena for interleaving
  context.pendingHits = result.directEvents.filter(e => e.type === "HIT");
}
```

### 9.2 resolveHit action (design §7)

```ts
resolveHit: ({ context, event, self }) => {
  const hit = event as HitIntent;
  const s = context.state;
  const f = context.formulas;
  const t = context.clock.now();

  // 1. DR
  const baseDR = s.def / (s.def + f.dr_constant);
  const buffDR = sumStatEffects(s.states, "damage_reduction") / 100;
  const totalDR = Math.min(Math.max(baseDR + buffDR, 0), 1);
  const mitigated = hit.damage * (1 - totalDR);

  // 2. SP → shield generation
  const shieldGen = Math.min(s.sp, mitigated) * f.sp_shield_ratio;
  if (shieldGen > 0) {
    const prevSp = s.sp;
    s.sp -= shieldGen / f.sp_shield_ratio;
    emit({ type: "SP_CHANGE", player: context.label, prev: prevSp, next: s.sp,
           cause: "shield_gen", t });
    const prevShield = s.shield;
    s.shield += shieldGen;
    emit({ type: "SHIELD_CHANGE", player: context.label, prev: prevShield,
           next: s.shield, cause: "shield_gen", t });
  }

  // 3. Shield absorb
  const absorbed = Math.min(mitigated, s.shield);
  if (absorbed > 0) {
    const prevShield = s.shield;
    s.shield -= absorbed;
    emit({ type: "SHIELD_CHANGE", player: context.label, prev: prevShield,
           next: s.shield, cause: "absorb", t });
  }

  // 4. HP
  const hpDamage = mitigated - absorbed;
  if (hpDamage > 0) {
    const prevHp = s.hp;
    s.hp = Math.max(s.hp - hpDamage, 0);
    emit({ type: "HP_CHANGE", player: context.label, prev: prevHp, next: s.hp,
           cause: hit, t });
    if (s.hp <= 0) s.alive = false;
  }

  // 5. SP damage (resonance)
  if (hit.spDamage > 0) {
    const prevSp = s.sp;
    s.sp = Math.max(s.sp - hit.spDamage, 0);
    emit({ type: "SP_CHANGE", player: context.label, prev: prevSp, next: s.sp,
           cause: "resonance", t });
  }

  // 6. Per-hit effects (e.g., %maxHP damage)
  if (hit.perHitEffects) {
    for (const effect of hit.perHitEffects) {
      self.send(effect);  // process reactively through own machine
    }
  }

  // 7. on_attacked triggers
  if (context.chainDepth < context.maxChainDepth) {
    context.chainDepth++;
    for (const listener of context.listeners.filter(l => l.trigger === "on_attacked")) {
      const state = findState(s.states, listener.parent);
      if (state) {
        const events = listener.handler({
          sourcePlayer: s, targetPlayerRef: context.opponentRef,
          rng: context.rng, book: listener.source,
        });
        for (const ev of events) {
          // Route: self-targeted → self, opponent-targeted → sendTo
          isSelfTargeted(ev) ? self.send(ev) : sendTo(context.opponentRef, ev);
        }
      }
    }
    context.chainDepth--;
  }
}
```

---

## 10. Arena (lib/sim/arena.ts)

Implements design §5.1, §8.2. **Plain function — not an XState machine.**

```ts
function runFight(
  playerARef: ActorRef,
  playerBRef: ActorRef,
  clock: SimulationClock,
  config: ArenaConfig,
): { winner: string | null } {
  const tGap = config.tGap * 1000;  // seconds → ms

  // Schedule cast slots on the virtual clock
  for (let slot = 1; slot <= 6; slot++) {
    const t = (slot - 1) * tGap;
    clock.setTimeout(() => {
      // Both players produce hits
      playerARef.send({ type: "CAST_SLOT", slot });
      playerBRef.send({ type: "CAST_SLOT", slot });

      const aHits = playerARef.getSnapshot().context.pendingHits ?? [];
      const bHits = playerBRef.getSnapshot().context.pendingHits ?? [];

      // Interleave hits (design §8.2)
      const maxHits = Math.max(aHits.length, bHits.length);
      for (let i = 0; i < maxHits; i++) {
        if (i < aHits.length) {
          playerBRef.send(aHits[i]);  // A's hit → B resolves
          if (!playerBRef.getSnapshot().context.state.alive) {
            return;  // B died
          }
        }
        if (i < bHits.length) {
          playerARef.send(bHits[i]);  // B's hit → A resolves
          if (!playerARef.getSnapshot().context.state.alive) {
            return;  // A died
          }
        }
      }
    }, t);
  }

  // Schedule periodic clock ticks (SP regen, state ticks)
  // ... scheduled by player machine when states are applied

  // Run the simulation
  clock.drain();

  // Determine winner
  const aAlive = playerARef.getSnapshot().context.state.alive;
  const bAlive = playerBRef.getSnapshot().context.state.alive;
  if (aAlive && !bAlive) return { winner: "A" };
  if (!aAlive && bAlive) return { winner: "B" };
  return { winner: null };  // draw or timeout
}
```

---

## 11. Runner (lib/sim/runner.ts)

Wires everything together. Implements design §4.4.

```ts
function createSimulation(config: ArenaConfig) {
  const clock = new SimulationClock();
  const rng = new SeededRNG(config.seed);

  // Validate
  validateConfig(config.playerA);
  validateConfig(config.playerB);

  // Create player actors with shared clock
  const playerARef = createActor(playerMachine, {
    input: { config: config.playerA, label: "A", clock, rng, ... },
    clock,
  });
  const playerBRef = createActor(playerMachine, {
    input: { config: config.playerB, label: "B", clock, rng, ... },
    clock,
  });

  // Wire opponent refs (each player needs to sendTo the other)
  playerARef.getSnapshot().context.opponentRef = playerBRef;
  playerBRef.getSnapshot().context.opponentRef = playerARef;

  return {
    subscribe(listener: (event: StateChangeEvent) => void) {
      // Subscribe to both players' emitted events
      const unsubA = playerARef.on("*", listener);
      const unsubB = playerBRef.on("*", listener);
      return () => { unsubA(); unsubB(); };
    },
    run() {
      playerARef.start();
      playerBRef.start();
      return runFight(playerARef, playerBRef, clock, config);
    },
  };
}
```

---

## 12. Monte Carlo (lib/sim/monte-carlo.ts)

Implements design §11.

```ts
function runMonteCarlo(config: ArenaConfig, n: number, baseSeed: number) {
  let winsA = 0, winsB = 0, draws = 0;

  for (let i = 0; i < n; i++) {
    const sim = createSimulation({ ...config, seed: baseSeed + i });
    const result = sim.run();
    if (result.winner === "A") winsA++;
    else if (result.winner === "B") winsB++;
    else draws++;
  }

  const p = winsA / n;
  const se = Math.sqrt(p * (1 - p) / n);
  return { winsA, winsB, draws, total: n, winRate: p,
           ci95: [p - 1.96 * se, p + 1.96 * se] as [number, number] };
}
```

---

## 13. Trace Formatter (lib/sim/trace.ts)

Event subscriber → ASCII output.

```ts
function createTraceSubscriber(verbose: boolean): (event: StateChangeEvent) => void {
  return (event) => {
    const t = (event.t / 1000).toFixed(3);
    switch (event.type) {
      case "CAST_START":
        console.log(`t=${t}  ⚔  ${event.player} casts ${event.book} (slot ${event.slot})`);
        break;
      case "HP_CHANGE":
        if (verbose) {
          const delta = event.next - event.prev;
          console.log(`t=${t}  ${event.player} HP ${event.prev.toLocaleString()} → ${event.next.toLocaleString()} (${delta > 0 ? "+" : ""}${delta.toLocaleString()})`);
        }
        break;
      case "STATE_APPLY":
        console.log(`t=${t}  ${event.player} +${event.state.name} (${event.state.kind})`);
        break;
      case "DEATH":
        console.log(`t=${t}  💀 ${event.player} dies`);
        break;
      // ... other event types
    }
  };
}
```

---

## 14. CLI (app/simulate.ts)

```ts
const args = parseArgs(process.argv.slice(2));
const config = loadConfig(args.config);

if (args.monteCarlo) {
  const result = runMonteCarlo(config, args.monteCarlo, args.seed ?? 42);
  console.log(`Win rate A: ${(result.winRate * 100).toFixed(1)}%`);
  console.log(`95% CI: [${(result.ci95[0] * 100).toFixed(1)}%, ${(result.ci95[1] * 100).toFixed(1)}%]`);
} else {
  const sim = createSimulation(config);
  sim.subscribe(createTraceSubscriber(args.verbose));
  const result = sim.run();
  console.log(`Winner: ${result.winner ?? "draw"}`);
}
```

---

## 15. Implementation Order

```
Phase 1A: Primitives (no XState)
  1. lib/sim/types.ts         ← all type definitions
  2. lib/sim/clock.ts         ← SimulationClock + tests
  3. lib/sim/rng.ts           ← SeededRNG + tests
  4. lib/sim/config.ts        ← loadConfig, validateConfig, selectTier + tests

Phase 1B: Handlers + Book (no XState)
  5. lib/sim/handlers/        ← 15 handlers + tests
  6. lib/sim/damage-chain.ts  ← buildHitEvents + tests
  7. lib/sim/book.ts          ← processBook + tests

Phase 1C: Player Machine (XState)
  8. lib/sim/player.ts        ← PlayerMachine + tests
     - resolveHit (HIT → DR → SP → shield → HP → resonance → triggers)
     - resolveIntent (HEAL, APPLY_STATE, HP_COST, etc.)
     - processCast (CAST_SLOT → book function → send events)
     - processStateTick (STATE_TICK → reactive listeners)
     - processStateExpire (STATE_EXPIRE → cleanup)

Phase 1D: Integration
  9.  lib/sim/arena.ts        ← runFight + hit interleaving + tests
  10. lib/sim/runner.ts       ← createSimulation + E2E tests
  11. lib/sim/trace.ts        ← trace formatter
  12. lib/sim/monte-carlo.ts  ← batch runner + tests
  13. app/simulate.ts         ← CLI entry point
```

Each phase is independently testable. Phases 1A-1B require zero XState. Phase 1C introduces the single XState machine. Phase 1D wires everything.

---

## 16. Testing Strategy

### Unit Tests (Phases 1A-1B)

| Module | Key assertions |
|:-------|:---------------|
| clock | advanceTo fires in order; clearTimeout works; simultaneous callbacks |
| rng | Same seed = same sequence; distribution sanity; edge seeds |
| config | Tier selection; validation rejects locked tiers, missing books, conflicts |
| handlers | Each handler: given EffectRow + context → expected HandlerResult |
| damage-chain | Zone accumulation; escalation; NaN guard throws |
| book | Direct/reactive separation; listener registration |

### Integration Tests (Phase 1C)

| Test | What it covers |
|:-----|:---------------|
| Single HIT resolution | HIT → DR → SP shield → shield absorb → HP + all emitted events |
| SP depletion | Resonance drains SP → no shield gen → full HP damage |
| State lifecycle | APPLY_STATE → stat recalc → STATE_TICK → STATE_EXPIRE → cleanup |
| Reactive affix | Named state ON → listener activates → listener fires on tick → named state OFF → listener stops |
| Counter-chain | on_attacked → intent → on_attacked → chain depth limit |
| Death | HP ≤ 0 → DEATH event → machine enters dead state → ignores further events |

### E2E Tests (Phase 1D)

| Test | What it covers |
|:-----|:---------------|
| Known fight | Two books, seeded RNG, assert exact event sequence |
| Hit interleaving | 6 hits vs 5 hits, verify A-B-A-B-A-B-A ordering |
| Full 6-slot | All slots fire, winner determined |
| Monte Carlo determinism | Same seed → same results |
| Config validation | Invalid → descriptive error |

### Snapshot Tests

Capture full event traces of specific fights. Any simulation logic change that alters the trace breaks the snapshot.
