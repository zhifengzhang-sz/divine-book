---
initial date: 2026-3-15
dates of modification: [2026-3-15]
---


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

# Combat Simulator — Design

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Design document for the combat simulator.** Describes how combat works in the game and how the simulator should model it. The game is continuous-time, not turn-based. Each player is a state machine with books, named states, and reactive affixes. All state mutations are events. The arena is just a clock.

---

## Core Principles

1. **Player sovereignty** — each player is an independent state machine. No external code mutates its state directly.
2. **Event-sourced state** — every state mutation is an event. Current state is the result of applying the event stream. Nothing happens "silently."
3. **Data-driven behavior** — what a book does is defined by its spec (YAML), not hardcoded. The simulator executes specs, it doesn't know what any particular book "should" do.
4. **Continuous time** — combat runs on a continuous clock. There are no "rounds." Slots fire on a timer, named states have real durations, DoTs tick on intervals.

---

## 1. Events, Not Mutations

Every state change is an **event**. The player doesn't "set HP to X." It emits an `HP_CHANGED` event, and its state reflects that.

This means:
- The full history of what happened is preserved as an ordered event stream
- Any query about state at a point in time can be answered by replaying events
- Cross-player effects are events routed through the arena
- Self-effects are events applied internally

### The event stream is the single source of truth

All downstream consumers are listeners on the same event stream:

- **Visualization** — subscribe to events, render as they arrive
- **Logging** — the event stream *is* the log
- **Replay** — save the event stream, replay at any speed
- **Debugging** — filter events by player, type, time range
- **Analysis** — "how much damage did 仙佑 contribute?" → compare events before/after BUFF_APPLIED

The simulator produces events. Everything else — console output, HTML charts, damage breakdowns — is a projection of that stream.

---

## 2. Time Model

Combat runs on **continuous time**, not discrete rounds.

### Slots and the activation schedule

Each player has 6 book slots. Slots fire on a fixed schedule with a configurable interval (default 6s):

```
t=0s:  Slot 0 fires → activates Book 0
t=6s:  Slot 1 fires → activates Book 1
t=12s: Slot 2 fires → activates Book 2
t=18s: Slot 3 fires → activates Book 3
t=24s: Slot 4 fires → activates Book 4
t=30s: Slot 5 fires → activates Book 5
t=36s: Slot 0 fires again → reactivates Book 0
...
```

The slot is **just a trigger**. It sends an activation signal to its book. That's all it does.

### Book lifecycle is independent of the slot

When a slot fires, it activates the book. But when the next slot fires, the previous book is **not deactivated**. The book has its own lifecycle — its named states have their own durations and expire independently.

Example: 甲元仙符 in slot 0:
- t=0s: Slot 0 fires → book activates → 仙佑 state starts (duration 12s)
- t=6s: Slot 1 fires (different book). 仙佑 is still alive (6s remaining).
- t=12s: Slot 2 fires. 仙佑 expires on its own.
- t=36s: Slot 0 fires again → book reactivates → 仙佑 refreshes.

Multiple books' named states can be **alive simultaneously** on the same player, overlapping and interacting.

### No "rounds"

The current implementation's concept of "rounds" is wrong. The game is continuous. Things that happen on intervals — DoT ticks, state expiry, slot activations — are all independent timers, not phases of a global round.

---

## 3. Player State Machine

Each player is a state machine that owns:

| Attribute | Description |
|-----------|-------------|
| HP (气血) | Health. Dies at 0. |
| ATK (攻击) | Base attack power. Skill damage scales from this. |
| DEF (守御) | Defense. Converts to damage reduction. |
| SP (灵力) | Spirit power. |

Plus a collection of **active named states** (buffs, debuffs, DoTs, shields, counters, etc.) that modify derived stats. Named states live on the **player**, not on the book that created them.

**All derived stats are computed live** — `effective_atk`, `effective_dr`, `shield_amount`, etc. There is no snapshot. When a buff is applied, any subsequent read of `effective_atk` sees the buffed value immediately.

---

## 4. The Book: Platform + Reactive Affixes

A divine book has three components:

### Platform (main skill)

The platform is the core of the book. When activated by its slot, the platform does whatever its **spec** defines — it might deal damage, create named states, apply shields, cost HP, summon clones, or any combination. The platform itself is a named state (`parent: this` in the data).

The platform's behavior is entirely data-driven. The simulator reads the spec and executes it.

### Primary affix

A **reactive listener** bound to a named state on the platform via the `parent` field. When that named state is active, the affix's effect triggers.

Example: 甲元仙符's primary affix 天光虹露:
- `parent: 仙佑` (bound to the 仙佑 named state)
- `effect: self_buff_extra { healing_bonus: 190 }`
- When 仙佑 is active → the affix adds healing bonus to 仙佑

### Exclusive affix

Same reactive model as primary affix — bound to a named state, triggers when active.

### The publisher-subscriber pattern

The platform **publishes** named states. Affixes **subscribe** to named states via `parent`. This is not a sequential pipeline. The platform doesn't "run affixes after itself." The affixes react to state changes independently.

```
Platform activates
  → creates named state 仙佑 (event: STATE_ACTIVATED)
  → Primary affix listens for 仙佑 → triggers its effect
  → Exclusive affix listens for its bound state → triggers its effect
```

---

## 5. Aux Affixes: Independent Actors

Aux affixes (universal + school) are structurally different from primary/exclusive affixes:

- **No `parent` field** — they are not bound to any named state
- **Always active** — they run independently as long as the aux book is equipped
- **Independent actors** on the player's state machine

They are not "modifiers applied to the main book." They are their own actors with their own effects.

```
Player state machine
  ├── Book slots [0..5] — timers
  ├── Books [0..5] — actors with platform + reactive affixes
  └── Aux affixes — independent always-active actors
```

---

## 6. Cross-Player Communication: Intents

Players cannot directly mutate each other's state. Cross-player effects are communicated via **intents** — events routed through the arena.

- The sender computes the intent from its own live state (e.g., ATK_DAMAGE amount from own `effective_atk`)
- The arena routes the intent to the opponent
- The receiver processes the intent against its own live state (e.g., applies its own DR, shield absorption, HP floor)

**Player sovereignty is preserved**: the sender never reads the receiver's state. Receiver-dependent formulas (like `per_enemy_lost_hp`) are attached as **operators** on the intent — the receiver evaluates them.

### Operators and cross-player state references

Most operators reference the **receiver's** state. The receiver evaluates them against its own live state. No sovereignty issue.

Some operators reference the **attacker's** state (e.g., `per_self_lost_hp`). Two resolution modes, selectable via config:

| Mode | `per_self_lost_hp` reads | Mechanism |
|------|--------------------------|-----------|
| `activation` | Attacker's state at event creation time | Value baked into the intent |
| `delivery` | Attacker's state at delivery time | Operator formula + event stream query |

Config field: `attacker_operator_timing: "activation" | "delivery"`

---

## 7. The Arena: Clock + Event Router

The arena is minimal. It does NOT:
- Snapshot player state
- Decide execution order within a book
- Orchestrate which effects apply first
- Manage "rounds" or "phases"

The arena DOES:
- Run the continuous clock
- Route cross-player intents (Player A's outbox → Player B's inbox)
- Check termination conditions (death, timeout)

Both players run their own state machines in parallel. The arena just connects them.

---

## 8. Named State Lifecycle

Named states are the central concept. They are created by platforms, listened to by affixes, and live on the player.

Each named state has:
- **Target**: `self`, `opponent`, or `both`
- **Duration**: real time (seconds), or `permanent`
- **Trigger**: `on_cast`, `on_attacked`, `per_tick`
- **Max stacks**: optional stacking limit
- **Dispellable**: whether it can be cleansed

Named states **expire on their own timeline**. They are not tied to the slot that created them. A state with duration 12s created at t=0 expires at t=12, regardless of what slots fire in between.

When a named state is created, any affix bound to it via `parent` triggers. When it expires, the affix stops. This is the reactive model.

---

## 9. What the Current Implementation Gets Wrong

The current implementation (`lib/simulator/`) has fundamental design errors:

1. **Round-based, not continuous.** The game runs on continuous time with overlapping book activations. The implementation uses discrete rounds where both books resolve simultaneously.

2. **Snapshot-based pipeline.** Freezes state, resolves both books from frozen state, then applies. Self-buffs are delayed by 1 round. In the game, effects read live state immediately.

3. **Sequential pipeline model.** Effects are treated as a fixed pipeline (producers → modifiers → parent assembly). In the game, the platform publishes named states and affixes react to them.

4. **No book lifecycle.** Each "round" resolves the same book with no memory. In the game, books have independent lifecycles with named states that persist across slot activations.

5. **No aux affixes as actors.** Aux affixes are bolted on as modifiers. In the game, they are independent always-active actors.

6. **No continuous time.** There is no real clock. DoTs, state expiry, and slot timing are all faked through a discrete round loop.

7. **State changes are invisible.** No event stream, no history.

---

## Related Docs

- [contract.main.md](contract.main.md) — intent type definitions (cross-player event types)
- [config.md](config.md) — CLI usage and config format
- [impl.md](impl.md) — implementation spec (XState v5)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-15 | Initial design — event-sourced entity model, replaces snapshot-based pipeline |
| 2.0 | 2026-03-15 | Rewrite — continuous time model, player state machine, books as actors with reactive affixes, aux affixes as independent actors, named state lifecycle |
