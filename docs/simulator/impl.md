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

# Combat Simulator — Implementation Spec (XState v5)

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Implementation specification for the event-sourced combat simulator using XState v5.** Maps the design in [design.md](design.md) to concrete XState v5 actors. The arena is the root actor (clock + intent router). Each player is a state machine with book actors, named states, and reactive affixes. Aux affixes are independent always-active actors. All state mutations are emitted events.

---

## Table of Contents

| Section | Content |
|:--------|:--------|
| **1. Actor Topology** | Full actor hierarchy: arena, players, books, aux affixes |
| **2. Continuous Time Model** | XState delayed transitions for slot scheduling, state expiry, DoT ticks |
| **3. Arena Machine** | Root actor: clock, intent routing, termination |
| **4. Player Machine** | State machine: owns HP/ATK/DEF/SP, slot timers, named states |
| **5. Book Actor** | Platform as named state, reactive affixes via guards |
| **6. Aux Affix Actors** | Independent always-active actors |
| **7. Named State Lifecycle** | XState delayed transitions for duration-based expiry |
| **8. Event Taxonomy** | All event types in the system |
| **9. Cross-Player Communication** | Intent routing via arena |
| **10. External Listeners** | emit() + actor.on() for visualization/logging/replay |
| **11. Config & Input** | How combat config flows into the actor system |

---

## 1. Actor Topology

```
createActor(arenaMachine)                       ← root, systemId: "arena"
  ├── Player A (spawned, createMachine)         ← systemId: "player-a"
  │     ├── Book 0 (spawned, createMachine)     ← systemId: "player-a.book-0"
  │     ├── Book 1 (spawned, createMachine)     ← systemId: "player-a.book-1"
  │     ├── ...
  │     ├── Book 5 (spawned, createMachine)     ← systemId: "player-a.book-5"
  │     ├── Aux Affix: 摧山 (spawned)           ← systemId: "player-a.aux-摧山"
  │     ├── Aux Affix: 通明 (spawned)           ← systemId: "player-a.aux-通明"
  │     └── ...
  └── Player B (same structure)
```

| Actor | Role | Lifetime |
|-------|------|----------|
| Arena | Clock, intent router, termination | Entire combat |
| Player | Owns HP/ATK/DEF/SP, slot timers, named states | Entire combat |
| Book | Platform activation + reactive affixes | Entire combat (but activates on slot schedule) |
| Aux Affix | Independent always-active effect | Entire combat |

All actors are spawned at combat start. Books are not created/destroyed per activation — they persist and are triggered by slot timers.

---

## 2. Continuous Time Model

XState v5's **delayed transitions** (`after`) provide the continuous time model. No manual tick loop.

### Slot scheduling

The player machine uses `after` to fire slots on a 6s interval:

```typescript
// Player machine — parallel state for slot timers
slots: {
  type: "parallel",
  states: {
    slot0: {
      initial: "waiting",
      states: {
        waiting: {
          after: {
            0: "activating",       // slot 0 fires at t=0
          },
        },
        activating: {
          entry: sendTo("player-a.book-0", { type: "ACTIVATE" }),
          after: {
            36000: "activating",   // re-fires every 36s (6 slots × 6s)
          },
        },
      },
    },
    slot1: {
      initial: "waiting",
      states: {
        waiting: {
          after: {
            6000: "activating",    // slot 1 fires at t=6s
          },
        },
        activating: {
          entry: sendTo("player-a.book-1", { type: "ACTIVATE" }),
          after: {
            36000: "activating",   // re-fires every 36s
          },
        },
      },
    },
    // ... slots 2-5 staggered by 6s each
  },
}
```

### Named state expiry

When a named state is created, a delayed transition handles its expiry:

```typescript
// Inside player machine — dynamic named state management
on: {
  STATE_CREATED: {
    actions: [
      assign({ /* add state to context */ }),
      // Schedule expiry after duration
      raise({ type: "EXPIRE_STATE", id: event.id }, { delay: event.duration * 1000 }),
    ],
  },
  EXPIRE_STATE: {
    actions: [
      assign({ /* remove state from context */ }),
      emit({ type: "STATE_EXPIRED", ... }),
    ],
  },
}
```

### DoT ticks

DoT states schedule their own ticks via delayed self-transitions:

```typescript
// When a DoT is applied, schedule first tick
raise({ type: "DOT_TICK", id: "贪妄业火" }, { delay: tick_interval * 1000 })

// On tick: apply damage, schedule next tick if state still active
on: {
  DOT_TICK: {
    actions: [
      assign({ /* compute and apply DoT damage */ }),
      emit({ type: "HP_CHANGED", cause: "dot", ... }),
      // Schedule next tick if state still active
      raise({ type: "DOT_TICK", id: event.id }, { delay: tick_interval * 1000 }),
    ],
    guard: "dotStateStillActive",
  },
}
```

---

## 3. Arena Machine

The arena is the root actor. Minimal: clock + intent routing + termination.

```typescript
const arenaMachine = setup({
  types: {
    context: {} as ArenaContext,
    events: {} as ArenaEvent,
    emitted: {} as CombatEvent,
  },
  actors: {
    playerMachine: playerMachine,
  },
}).createMachine({
  id: "arena",
  initial: "spawning",
  context: ({ input }) => ({
    config: input.config,
    playerAConfig: input.playerA,
    playerBConfig: input.playerB,
  }),

  states: {
    spawning: {
      entry: [
        spawnChild("playerMachine", {
          systemId: "player-a",
          input: ({ context }) => context.playerAConfig,
        }),
        spawnChild("playerMachine", {
          systemId: "player-b",
          input: ({ context }) => context.playerBConfig,
        }),
      ],
      always: "running",
    },

    running: {
      // The arena doesn't drive rounds — players run autonomously.
      // The arena only handles:
      // 1. Routing intents between players
      // 2. Checking termination
      on: {
        // Player sends intents to opponent
        OUTBOUND_INTENTS: {
          actions: sendTo(
            ({ event, system }) =>
              system.get(event.source === "player-a" ? "player-b" : "player-a"),
            ({ event }) => ({ type: "INBOUND_INTENTS", intents: event.intents, source: event.source }),
          ),
        },

        // Player sends counter intents back
        OUTBOUND_COUNTERS: {
          actions: sendTo(
            ({ event, system }) =>
              system.get(event.target),
            ({ event }) => ({ type: "INBOUND_COUNTERS", intents: event.intents }),
          ),
        },

        // Player died
        PLAYER_DIED: {
          target: "done",
          actions: assign({ deadPlayer: ({ event }) => event.player }),
        },
      },

      // Timeout check
      after: {
        MAX_COMBAT_TIME: "done",
      },
    },

    done: {
      type: "final",
      entry: [
        emit(({ context }) => ({
          type: "COMBAT_END",
          winner: determineWinner(context),
        })),
        stopChild("player-a"),
        stopChild("player-b"),
      ],
    },
  },
});
```

### Key difference from v1

The arena does **not** orchestrate rounds, phases, or activation order. Players run autonomously on their own slot schedules. The arena is purely reactive — it routes intents when players send them and stops combat when someone dies or time runs out.

---

## 4. Player Machine

The player is a state machine that owns combat attributes and runs slot timers.

### 4.1 Context

```typescript
interface PlayerContext {
  id: string;
  hp: number;
  max_hp: number;
  base_atk: number;
  base_def: number;
  base_sp: number;
  dr_constant: number;
  named_states: Map<string, NamedStateInstance>;  // currently active named states
  books: BookData[];      // 6 book specs
  aux_affixes: AffixSpec[];
}

interface NamedStateInstance {
  id: string;
  def: StateDef;          // from books.yaml
  stacks: number;
  created_at: number;     // timestamp
}
```

Derived stats are pure functions of context:

```typescript
function effectiveAtk(ctx: PlayerContext): number { ... }
function effectiveDr(ctx: PlayerContext): number { ... }
function shieldAmount(ctx: PlayerContext): number { ... }
```

### 4.2 Machine structure

```typescript
const playerMachine = setup({
  types: {
    context: {} as PlayerContext,
    events: {} as PlayerEvent,
    emitted: {} as SelfEvent,
  },
}).createMachine({
  id: "player",
  type: "parallel",   // slots + combat state run concurrently

  states: {
    // Slot timers — each runs independently
    slots: {
      type: "parallel",
      states: {
        slot0: { /* delayed transition at t=0, then every 36s */ },
        slot1: { /* delayed transition at t=6s, then every 36s */ },
        slot2: { /* delayed transition at t=12s, then every 36s */ },
        slot3: { /* delayed transition at t=18s, then every 36s */ },
        slot4: { /* delayed transition at t=24s, then every 36s */ },
        slot5: { /* delayed transition at t=30s, then every 36s */ },
      },
    },

    // Combat state — alive or dead
    vitals: {
      initial: "alive",
      states: {
        alive: {
          on: {
            HP_CHANGED: [{
              guard: "hpReachedZero",
              target: "dead",
            }, {
              actions: [
                assign({ /* update hp */ }),
                emit({ /* HP_CHANGED event */ }),
              ],
            }],
          },
        },
        dead: {
          type: "final",
          entry: sendTo(({ system }) => system.get("arena"), ({ context }) => ({
            type: "PLAYER_DIED",
            player: context.id,
          })),
        },
      },
    },

    // Named state management — handles creation, expiry, reactive triggers
    state_manager: {
      on: {
        STATE_CREATED: {
          actions: [
            assign({ /* add to named_states */ }),
            emit({ type: "STATE_ACTIVATED", ... }),
            // Schedule expiry
            raise({ type: "EXPIRE_STATE", id: "..." }, { delay: "..." }),
          ],
        },
        EXPIRE_STATE: {
          actions: [
            assign({ /* remove from named_states */ }),
            emit({ type: "STATE_EXPIRED", ... }),
          ],
        },

        // Inbound intents from opponent (routed by arena)
        INBOUND_INTENTS: {
          actions: "processInboundIntents",
        },
        INBOUND_COUNTERS: {
          actions: "processInboundCounters",
        },
      },
    },
  },
});
```

### 4.3 Parallel regions

The player machine uses XState v5 **parallel states** — three regions run concurrently:

1. **slots** — 6 parallel slot timers, each on a 36s cycle staggered by 6s
2. **vitals** — alive/dead state, transitions to dead when HP reaches 0
3. **state_manager** — handles named state lifecycle, inbound intents

This is the natural XState model for "many independent timers + reactive event handling."

---

## 5. Book Actor

Each book is a spawned actor. It receives `ACTIVATE` from its slot timer and runs the platform.

```typescript
const bookMachine = setup({
  types: {
    context: {} as BookContext,
    events: {} as BookEvent,
  },
}).createMachine({
  id: "book",
  initial: "idle",
  context: ({ input }) => ({
    spec: input.bookData,       // BookData from YAML
    slot: input.slot,
  }),

  states: {
    idle: {
      on: {
        ACTIVATE: "activating",
      },
    },

    activating: {
      // Invoke the platform — processes spec-driven effects
      invoke: {
        src: "runPlatform",
        input: ({ context }) => ({
          spec: context.spec,
          // Player context is queried via system
        }),
        onDone: {
          target: "idle",
          actions: [
            // Send self-events to player
            // Send cross-entity intents to player (for arena routing)
            // Notify player of created named states
          ],
        },
      },
    },
  },
});
```

### Platform activation

The platform reads the book spec and produces events. It does NOT hardcode what any book does — it interprets the spec.

When the platform creates a named state (e.g., `self_buff` with `name: 仙佑`), it sends a `STATE_CREATED` event to the player. The player adds it to `named_states` and schedules expiry.

### Book → Player context access

The book actor needs the player's live state (HP, ATK, etc.) to compute damage and effects. The book queries the player via the system:

```typescript
// Book queries player for current stats:
const playerSnapshot = system.get("player-a").getSnapshot();
const atk = effectiveAtk(playerSnapshot.context);
```

Alternatively, the player passes its current stats as part of the `ACTIVATE` event:

```typescript
// Player slot fires:
sendTo("player-a.book-0", {
  type: "ACTIVATE",
  stats: { hp: context.hp, effective_atk: effectiveAtk(context), ... },
});
```

The second approach avoids the book reaching into the player's internals. The player provides what the book needs at activation time. Self-events (buffs, HP costs) that change state mid-activation are sent back to the player immediately, and subsequent effects in the same activation read updated stats from the player.

### Reactive affixes

Primary and exclusive affixes are **guards** on the player's named state events. When a `STATE_CREATED` event matches the affix's `parent` field, the affix triggers.

```typescript
// In player's state_manager:
on: {
  STATE_ACTIVATED: [
    {
      // Primary affix reacts to its parent state
      guard: ({ event, context }) =>
        context.books[event.slot].primary_affix?.effects.some(
          e => e.parent === event.state_id || e.parent === "this"
        ),
      actions: "triggerPrimaryAffix",
    },
    {
      // Exclusive affix reacts to its parent state
      guard: ({ event, context }) =>
        context.books[event.slot].exclusive_affix?.effects.some(
          e => e.parent === event.state_id || e.parent === "this"
        ),
      actions: "triggerExclusiveAffix",
    },
  ],
}
```

`parent: "this"` means the affix reacts to the platform activation itself — the platform is an implicit named state.

---

## 6. Aux Affix Actors

Aux affixes are structurally different from book affixes. They are independent, always-active actors.

```typescript
const auxAffixMachine = setup({
  types: {
    context: {} as AuxAffixContext,
  },
}).createMachine({
  id: "aux-affix",
  initial: "active",
  context: ({ input }) => ({
    spec: input.affixSpec,
    playerId: input.playerId,
  }),

  states: {
    active: {
      // Always-on — applies its effect continuously
      // Some aux affixes modify derived stats (passive)
      // Some trigger on conditions (e.g., 怒目: when target HP < 30%)
      // Behavior is entirely spec-driven
      entry: "applyPassiveEffects",
    },
  },
});
```

Aux affixes that modify derived stats (e.g., 摧山: ATK +20%) are reflected in the player's derived stat functions — `effectiveAtk()` checks active aux affixes in context.

Aux affixes with conditional triggers (e.g., 怒目: execute bonus when HP < 30%) react to player events via the system.

---

## 7. Named State Lifecycle

Named states are the central concept. Their lifecycle in XState:

### Creation

1. Book platform activates → produces `STATE_CREATED` event
2. Player's `state_manager` receives it → adds to `named_states` context
3. Player emits `STATE_ACTIVATED` event (for external listeners)
4. Player schedules `EXPIRE_STATE` via `raise` with delay = duration × 1000ms
5. Affixes with matching `parent` trigger reactively

### During lifetime

- Other effects can read the state (e.g., `effectiveAtk` checks for ATK buffs)
- Per-tick states (DoTs) schedule their own ticks via delayed `raise`
- Stacking states increment `stacks` on re-application
- Refreshing states reset the expiry timer (cancel + re-raise)

### Trigger modes

Named states have different activation triggers (from `StateDef.trigger`):

| Trigger | XState pattern |
|---------|---------------|
| `on_cast` (default) | Effects fire immediately when `STATE_CREATED` is processed |
| `on_attacked` | Player listens for `INBOUND_INTENTS` with ATK_DAMAGE; if this state is active, fire its effects |
| `per_tick` | Schedule recurring `raise` with delay = `tick_interval × 1000ms`; fire effects on each tick |

```typescript
// on_attacked trigger:
on: {
  INBOUND_INTENTS: {
    guard: ({ context, event }) =>
      event.intents.some(i => i.type === "ATK_DAMAGE") &&
      context.named_states.has("天狼之啸"),
    actions: "triggerOnAttackedStates",
  },
}
```

### Expiry

1. Delayed `EXPIRE_STATE` fires
2. Player removes from `named_states` context
3. Player emits `STATE_EXPIRED` event
4. Affixes bound to this state stop their effects

### Cancellation

External effects (cleanse, dispel) can remove states early:
- Remove from `named_states`
- Cancel the scheduled `EXPIRE_STATE` (via XState `cancel()` action)
- Emit `STATE_EXPIRED` with cause `"cleansed"` or `"dispelled"`

---

## 8. Event Taxonomy

### 8.1 Player-internal events

```typescript
type PlayerEvent =
  // Named state lifecycle
  | { type: "STATE_CREATED"; state_id: string; def: StateDef; slot: number }
  | { type: "EXPIRE_STATE"; id: string }
  | { type: "DOT_TICK"; id: string }

  // HP mutations
  | { type: "HP_CHANGED"; delta: number; cause: string; source?: string }

  // Inbound from arena
  | { type: "INBOUND_INTENTS"; intents: Intent[]; source: string }
  | { type: "INBOUND_COUNTERS"; intents: Intent[] }
```

### 8.2 Player → Arena

```typescript
type PlayerToArena =
  | { type: "OUTBOUND_INTENTS"; intents: Intent[]; source: string }
  | { type: "OUTBOUND_COUNTERS"; intents: Intent[]; target: string }
  | { type: "PLAYER_DIED"; player: string }
```

### 8.3 Emitted events (for external listeners)

```typescript
type EmittedEvent =
  // State lifecycle
  | { type: "STATE_ACTIVATED"; player: string; id: string; duration: number }
  | { type: "STATE_EXPIRED"; player: string; id: string; cause: "duration" | "cleansed" | "dispelled" }

  // Combat
  | { type: "HP_CHANGED"; player: string; delta: number; cause: string; source?: string }
  | { type: "SHIELD_ABSORBED"; player: string; amount: number }
  | { type: "INTENT_SENT"; source: string; target: string; intent: Intent }
  | { type: "INTENT_RECEIVED"; player: string; intent: Intent }

  // Slot activation
  | { type: "SLOT_FIRED"; player: string; slot: number; book: string }

  // Combat-level
  | { type: "COMBAT_START"; player_a: string; player_b: string }
  | { type: "COMBAT_END"; winner: string | "draw" }
```

---

## 9. Cross-Player Communication

Players never reference each other. All routing goes through the arena.

### Flow

1. Book activates → produces cross-player intents
2. Book sends intents to player
3. Player sends `OUTBOUND_INTENTS` to arena
4. Arena routes to opponent player as `INBOUND_INTENTS`
5. Opponent player processes intents → may produce counter intents
6. Opponent sends `OUTBOUND_COUNTERS` to arena
7. Arena routes counters back

```typescript
// Player sends intents to arena:
sendTo(({ system }) => system.get("arena"), {
  type: "OUTBOUND_INTENTS",
  intents: outbox,
  source: context.id,
});

// Arena routes to opponent:
sendTo(
  ({ system, event }) => system.get(event.source === "player-a" ? "player-b" : "player-a"),
  ({ event }) => ({ type: "INBOUND_INTENTS", intents: event.intents, source: event.source }),
);
```

### Operators

Receiver-referencing operators (`per_enemy_lost_hp`, `target_hp_below_30`) are evaluated by the receiver against its own live context. No sovereignty issue.

Attacker-referencing operators (`per_self_lost_hp`) — two modes via config:

| Mode | Mechanism |
|------|-----------|
| `activation` | Value baked into intent at creation time |
| `delivery` | Intent carries formula; receiver queries attacker's state via arena |

---

## 10. External Listeners

XState v5's `emit()` action + `actor.on()` subscription.

### Emitting

Every state mutation emits a typed event. Books emit to their parent (player), players emit to the root (arena). The arena re-emits for external subscribers.

```typescript
// Player emits on state change:
emit({ type: "HP_CHANGED", player: context.id, delta: -damage, cause: "atk_damage" })

// Arena re-emits player events for root-level subscribers:
// (or: external code subscribes to individual player actors via system.get)
```

### Subscribing

```typescript
const actor = createActor(arenaMachine, { input: combatInput });

// All events
actor.on("*", (event) => renderEvent(event));

// Specific
actor.on("HP_CHANGED", (event) => updateHpBar(event.player, event.delta));
actor.on("SLOT_FIRED", (event) => highlightSlot(event.player, event.slot));

actor.start();
const result = await toPromise(actor);
```

### Replay

```typescript
const events: EmittedEvent[] = [];
actor.on("*", (event) => events.push({ ...event, t: Date.now() }));
// Later: replay with timing
```

---

## 11. Config & Input

```typescript
interface CombatInput {
  config: {
    slot_interval: number;   // seconds between slot activations (default: 6)
    max_combat_time: number; // seconds before timeout
    attacker_operator_timing: "activation" | "delivery";
    dr_constant: number;
  };
  playerA: {
    id: string;
    stats: { hp: number; atk: number; def: number; sp: number };
    books: BookData[];       // 6 main books
    aux_affixes: AffixSpec[]; // from affixes.yaml
  };
  playerB: {
    id: string;
    stats: { hp: number; atk: number; def: number; sp: number };
    books: BookData[];
    aux_affixes: AffixSpec[];
  };
}
```

---

## Related Docs

- [design.md](design.md) — design principles: continuous time, player sovereignty, event-sourced state, reactive affixes
- [contract.main.md](contract.main.md) — intent type definitions (reused as cross-player events)
- [config.md](config.md) — CLI usage and config format (needs update for new model)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-15 | Initial impl spec — round-based, two entities |
| 2.0 | 2026-03-15 | Rewrite — continuous time, player state machine with parallel slot timers, books as actors with reactive affixes, aux affixes as independent actors, arena as pure router |
