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

---
initial date: 2026-03-16
dates of modification: [2026-03-16, 2026-03-17]
---

# Implementation Guide — XState v5

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> Maps [design.reactive.md](design.reactive.md) to XState v5 code. For design principles, see [design.reactive.md](design.reactive.md). For detailed spec, see [design.md](design.md).

---

## 1. Actor System

The simulator is an XState v5 actor system. Three kinds of actors:

| Actor | XState primitive | systemId | Responsibility |
|:------|:----------------|:---------|:---------------|
| Arena | Root actor | `arena` | Clock + cast scheduling |
| Player | State machine actor | `playerA`, `playerB` | Combat state + intent resolution |
| Book | Child actor per slot | `bookA-1`..`bookA-6`, `bookB-1`..`bookB-6` | Effect combination + intent production |

```ts
// Arena creates the system
const arena = createActor(arenaMachine, { systemId: 'arena' });
arena.start();

// Arena spawns two player actors
// Each player spawns 6 book actors
// All actors registered with systemId → can find each other via system.get()
```

Communication is exclusively through events:
- `sendTo(({ system }) => system.get('playerB'), intent)` — book sends intent to opponent
- `sendTo('book-1', { type: 'CAST' })` — player delegates cast to book
- `emit(stateChangeEvent)` — player emits to external subscribers

---

## 2. Arena Actor

The arena is the root actor. It owns the virtual clock and the cast schedule.

```ts
const arenaMachine = setup({
  types: {
    context: {} as { clock: SimulationClock },
    events: {} as { type: 'START' },
  },
}).createMachine({
  id: 'arena',
  initial: 'setup',
  states: {
    setup: {
      entry: [
        // Spawn player A and player B with systemId
        spawnChild(playerMachine, { systemId: 'playerA', input: configA }),
        spawnChild(playerMachine, { systemId: 'playerB', input: configB }),
      ],
      always: 'running',
    },
    running: {
      entry: ({ context }) => {
        // Schedule CAST_SLOT events on the virtual clock
        for (let slot = 1; slot <= 6; slot++) {
          context.clock.setTimeout(() => {
            sendTo(({ system }) => system.get('playerA'), { type: 'CAST_SLOT', slot });
            sendTo(({ system }) => system.get('playerB'), { type: 'CAST_SLOT', slot });
          }, (slot - 1) * 6000);
        }
      },
    },
  },
});
```

The arena does not route events, read context, or deliver intents. It is a clock.

---

## 3. Player State Machine

The player is an XState v5 state machine. It manages combat state and resolves incoming intents.

```ts
const playerMachine = setup({
  types: {
    context: {} as PlayerContext,
    input: {} as PlayerInput,
    events: {} as PlayerEvent,
    emitted: {} as StateChangeEvent,
  },
}).createMachine({
  id: 'player',
  context: ({ input, spawn }) => ({
    state: input.initialState,
    formulas: input.formulas,
    // Spawn 6 book actors as children
    bookRefs: input.bookSlots.map((slot, i) =>
      spawn(bookMachine, {
        systemId: `book${input.label}-${slot.slot}`,
        input: { slot, bookData: ..., affixEffects: ..., progression: ... },
      })
    ),
    ...
  }),
  initial: 'alive',
  states: {
    alive: {
      on: {
        CAST_SLOT: {
          // Delegate to book actor — player does NOT touch the damage chain
          actions: sendTo(
            ({ context, event }) => context.bookRefs[event.slot - 1],
            ({ event }) => ({ type: 'CAST', slot: event.slot })
          ),
        },
        HIT:                { actions: 'resolveHit' },
        PERCENT_MAX_HP_HIT: { actions: 'resolvePercentMaxHpHit' },
        APPLY_STATE:        { actions: 'resolveApplyState' },
        APPLY_DOT:          { actions: 'resolveApplyDot' },
        HEAL:               { actions: 'resolveHeal' },
        HP_COST:            { actions: 'resolveHpCost' },
        // ... other intent types
      },
      always: { target: 'dead', guard: 'isDead' },
    },
    dead: {
      type: 'final',
      entry: emit(({ context }) => ({
        type: 'DEATH',
        player: context.label,
        t: context.clock.now(),
      })),
    },
  },
});
```

The player machine:
- **Spawns** book actors as children on init
- **Delegates** CAST_SLOT to the appropriate book actor
- **Resolves** incoming intents (HIT, HEAL, APPLY_STATE, etc.)
- **Emits** state-change events to subscribers
- **Never** touches the damage chain

---

## 4. Book Actor

The book actor combines effects from all sources and produces intent events. It sends intents directly to the opponent's player state machine via the actor system.

```ts
const bookMachine = setup({
  types: {
    context: {} as BookContext,
    input: {} as BookInput,
    events: {} as { type: 'CAST'; slot: number },
  },
}).createMachine({
  id: 'book',
  initial: 'idle',
  states: {
    idle: {
      on: {
        CAST: {
          actions: enqueueActions(({ context, enqueue, system }) => {
            const opponentId = context.opponentSystemId; // 'playerA' or 'playerB'
            const opponent = system.get(opponentId);

            // 1. Gather effects from all sources
            // 2. Select tiers per source
            // 3. Separate direct vs reactive
            // 4. Run handlers → zones, escalation, spDamage, intents
            // 5. Compute damage chain → HIT events

            // 6. Send each intent directly to opponent
            for (const intent of hitIntents) {
              enqueue(sendTo(opponent, intent));
            }
            for (const intent of otherIntents) {
              if (isSelfTargeted(intent)) {
                // Self-targeted: send to own player
                enqueue(sendTo(system.get(context.ownPlayerSystemId), intent));
              } else {
                enqueue(sendTo(opponent, intent));
              }
            }
          }),
        },
      },
    },
  },
});
```

The book actor:
- **Receives** CAST from its parent player
- **Combines** effects from skill + primary affix + exclusive affix + aux affixes
- **Computes** damage chain (S_coeff, M_dmg, M_skill, M_final, M_synchro, escalation)
- **Sends** intents directly to opponent via `system.get(opponentId)`
- **Never** stores intents or returns them to the player

---

## 5. Actor Communication Summary

```
Arena (root)
  │
  ├── spawns Player A (systemId: 'playerA')
  │     ├── spawns Book A-1 (systemId: 'bookA-1')
  │     ├── spawns Book A-2
  │     └── ...
  │
  └── spawns Player B (systemId: 'playerB')
        ├── spawns Book B-1 (systemId: 'bookB-1')
        └── ...

Event flows:
  Arena  ──CAST_SLOT──►  Player A
  Player A  ──CAST──►  Book A-1
  Book A-1  ──HIT──►  Player B (via system.get('playerB'))
  Player B  ──emit──►  External subscribers (HP_CHANGE, DEATH, etc.)
```

No actor reads another actor's context. No actor calls another actor's functions. All communication is through events.

---

## 6. File Structure

```
lib/sim/
  types.ts              ← PlayerState, IntentEvent, StateChangeEvent, configs
  clock.ts              ← SimulationClock (XState Clock adapter)
  rng.ts                ← SeededRNG (Mulberry32)
  config.ts             ← loadConfig, validateConfig, selectTiers
  damage-chain.ts       ← buildHitIntents (zone accumulation → HIT events)
  handlers/
    registry.ts         ← handler registration (separate from index to avoid circular deps)
    index.ts            ← resolve(effect, ctx) — throws on missing handler
    types.ts            ← Handler, HandlerContext, HandlerResult
    damage.ts           ← base_attack, percent_max_hp_damage, flat_extra_damage
    buff.ts             ← self_buff, damage_reduction_during_cast
    debuff.ts           ← debuff
    dot.ts              ← dot
    shield.ts           ← shield_strength
    healing.ts          ← lifesteal, self_heal, heal_echo_damage
    cost.ts             ← self_hp_cost
    escalation.ts       ← per_hit_escalation
    resonance.ts        ← guaranteed_resonance
    multiplier.ts       ← probability_multiplier, damage_increase, skill_damage_increase, attack_bonus
  actors/
    arena.ts            ← ArenaMachine (root: clock + scheduling)
    player.ts           ← PlayerMachine (state machine: resolves intents)
    book.ts             ← BookMachine (actor: combines effects, produces intents)
  runner.ts             ← createSimulation() — creates actor system
  trace.ts              ← ASCII trace (event subscriber)
  monte-carlo.ts        ← batch runner
app/
  simulate.ts           ← CLI
  viz/                  ← React visualization (event subscriber)
```

---

## 7. Implementation Order

```
Phase 1: Refactor to actor model
  1. actors/book.ts     ← book as XState actor (not a function)
  2. actors/player.ts   ← player spawns books, delegates CAST_SLOT
  3. actors/arena.ts    ← root actor, spawns players, schedules clock
  4. runner.ts          ← createSimulation using actor system

Phase 2: More handlers
  5. Each new handler verified against source text + combat model
  6. Tested with real divine book config (platform + aux affixes)

Phase 3: Multi-slot
  7. Arena schedules 6 CAST_SLOT events per player
  8. Clock advances between slots (buff expiry, DoT ticks, SP regen)

Phase 4: Monte Carlo + analytics
  9. Batch runner with seeded RNG
  10. Win rate, damage breakdown subscribers
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-16 | Initial: imperative model (book as function, pendingHits, arena routing) |
| 2.0 | 2026-03-17 | **Full rewrite.** XState v5 actor system: Arena spawns Players, Players spawn Books. Books send intents via system.get(). No pendingHits, no arena delivery. |
