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
**Date:** 2026-03-16

> **Purpose.** This document specifies the conceptual design of the combat simulator — what it does, what abstractions it uses, and how data flows through it. It is implementation-agnostic: no XState, no TypeScript types, no file paths. The companion [impl.md](impl.md) maps this design to concrete XState v5 code.

---

## 1. Core Principle

**Combat is a process of mutating player states on both sides.**

The simulator's job is to:
1. Initialize two players with their combat attributes and book configurations
2. Execute a cast schedule that fires books in slot order
3. Each book cast produces per-hit effects that mutate player states (self and/or opponent)
4. Every state mutation is an observable event
5. The fight ends when one player's HP reaches zero

The simulator produces a **stream of state-change events**. All consumers — trace formatting, visualization, analytics, replay — are subscribers to this stream. The simulator has zero knowledge of how its output is consumed.

---

## 2. Two Combat Resources

Characters have two resource pools that must be managed:

```
  气血 (HP)                         灵力 (SP)
  ─────────                         ─────────
  Primary health.                   Spiritual power.
  Zero = death.                     Consumed to generate 护盾 (shields)
  Attacked by: 攻击 (ATK)           on taking damage.
                                    Attacked by: 会心 (resonance)
```

**Shield generation** (reactive, on taking damage):
```
  On receiving mitigated damage:
    1. shieldGenerated = min(sp, damage) × sp_shield_ratio
    2. sp -= shieldGenerated / sp_shield_ratio     → emit SP_CHANGE
    3. shield += shieldGenerated                    → emit SHIELD_CHANGE
    4. Resolve damage against shield, then HP
```

**灵力 depletion consequence:** When SP reaches zero, the character cannot generate shields. All subsequent damage hits 气血 directly (no shield buffer). This makes 会心 (resonance) one of the highest-value attack vectors — it removes the opponent's defense layer.

**灵力 recovery:** SP regenerates passively at `sp_regen_per_second` (from 灵力恢复 stat). Capped at maxSp.

---

## 3. Player State

Player state is the primary abstraction. It contains **only combat attributes** — nothing about scheduling, slots, or turn order.

### 3.1 State Fields

| Field | Type | Description |
|:------|:-----|:------------|
| hp | number | Current 气血. Death when ≤ 0. |
| maxHp | number | Maximum 气血. Reference for %maxHP effects. |
| sp | number | Current 灵力. Consumed to generate shields on damage. |
| maxSp | number | Maximum 灵力. |
| spRegen | number | 灵力 recovery per second. |
| shield | number | Current 护盾 HP. Absorbs damage before 气血. |
| atk | number | Current effective 攻击 (base + buff modifiers). |
| baseAtk | number | Unmodified base 攻击. Buffs modify atk, not baseAtk. |
| def | number | Current effective 守御. |
| baseDef | number | Unmodified base 守御. |
| states | StateInstance[] | All active states — buffs, debuffs, and named states (see §3.2). |
| alive | boolean | false when hp ≤ 0. |

### 3.2 State Instances

All active effects on a player — buffs, debuffs, and named states — are stored in a single `states[]` collection. Each state instance has:

| Field | Type | Description |
|:------|:-----|:------------|
| name | string | Display name (e.g., 灵涸, 仙佑, 罗天魔咒). Natural key. |
| kind | "buff" \| "debuff" \| "named" | Classification |
| source | string | Book that created it |
| target | "self" \| "opponent" | Who this state lives on |
| effects | StateEffect[] | What this state does (stat modifiers, triggers, etc.) |
| remainingDuration | number | Seconds until expiry (Infinity = permanent) |
| stacks | number | Current stack count |
| maxStacks | number | Maximum stacks allowed |
| dispellable | boolean | Can be removed by cleanse/dispel |
| trigger | string? | "on_cast", "on_attacked", "per_tick" |
| parent | string? | Parent state ID (child expires when parent expires) |

### 3.3 State Effects

Each state instance carries one or more effects that modify the player:

| Field | Type | Description |
|:------|:-----|:------------|
| stat | string | What it modifies (e.g., attack_bonus, healing_received, damage_reduction) |
| value | number | Magnitude per stack |

**Derived views:** "All buffs" = states where kind="buff". "All debuffs" = states where kind="debuff". These are queries on the single collection, not separate storage.

**Parent-child relationship:** States reference a parent via the `parent` field (matching the parent state's `name`). When the parent expires, all children expire. When the parent stacks, children scale.

### 3.4 Named State Events and Reactive Affixes

Named states are **event emitters with a rich lifecycle**. During their lifetime they can emit multiple event types:

| Event | When | Example |
|:------|:-----|:--------|
| STATE_APPLY | State created | 灵鹤 created on cast |
| STATE_EXPIRE | Duration reached 0 or removed | 灵鹤 expires at 20s |
| STATE_TICK | Periodic interval (`per_tick` trigger) | 灵鹤 heals every 1s |
| STATE_TRIGGERED | Reactive condition (`on_attacked`, `on_cast`) | 罗天魔咒 triggers on taking damage |

**Example — 周天星元 + 灵鹤:**

```
  Main skill creates 灵鹤 (self_heal per_tick: 3.5%, interval: 1s, duration: 20s)
  Also applies heal_echo_damage (ratio: 1) — heals echo as damage to opponent

  Primary affix 【天书灵盾】 subscribes: parent=灵鹤, trigger=per_tick
    → on each 灵鹤 tick: generates shield (4.4% max HP)

  灵鹤 lifecycle:
    t=0   STATE_APPLY        → affix listeners registered
    t=1   STATE_TICK          → heals 3.5% → heal echoes as damage → shield generated
    t=2   STATE_TICK          → heals 3.5% → heal echoes as damage → shield generated
    ...
    t=20  STATE_EXPIRE        → affix listeners deactivated, shield stops
```

**Example — 大罗幻诀 + 罗天魔咒:**

```
  Main skill creates 罗天魔咒 (counter_debuff: on_attacked, 30% chance, duration: 8s)

  Primary affix 【魔魂咒界】 subscribes: parent=罗天魔咒
    → on STATE_APPLY: upgrades chance from 30% → 60%, adds 命损 debuff

  罗天魔咒 lifecycle:
    t=0   STATE_APPLY         → affix activates (upgrades chance, adds 命损)
    t=?   STATE_TRIGGERED     → on_attacked → applies 噬心之咒/断魂之咒
    t=8   STATE_EXPIRE        → affix deactivates
```

**Affixes are reactive listeners to named state events.** Any effect with a `parent` field subscribes to its parent state's event stream:

- **`parent: "this"`** = direct effect, fires immediately on cast. Not reactive.
- **`parent: "<state_name>"`** = reactive listener. The `trigger` field specifies which event to listen for:
  - No trigger: activate on STATE_APPLY, deactivate on STATE_EXPIRE (simple on/off modifier)
  - `trigger: per_tick`: fire on every STATE_TICK of the parent
  - `trigger: on_attacked`: fire on every STATE_TRIGGERED(on_attacked) of the parent
  - `trigger: on_cast`: fire on every STATE_TRIGGERED(on_cast) of the parent

This is a pub/sub pattern:
- **Publishers:** named states emit lifecycle events (apply, expire, tick, triggered)
- **Subscribers:** affix effects with `parent` field listen to specific events
- **The player's state machine is the event bus** — it owns the states and routes events to listeners

Both primary and exclusive affixes can be reactive subscribers. Universal/school aux affixes (from affixes.yaml) are always active — they don't use `parent`.

### 3.5 "Casting" is a Temporary State

When a book casts, it does NOT set a `castPhase` field. Instead, the book creates a temporary named state on the player for the cast duration. Effects like `self_damage_reduction_during_cast` subscribe to this state via `parent`. Casting is just another state — no special handling.

### 3.6 Effective Stats

The player's effective stats are derived from base stats + all active state effects:

```
  effectiveAtk = baseAtk × (1 + sum of attack_bonus effects / 100)
  effectiveDef = baseDef × (1 + sum of def_bonus effects / 100)
  effectiveDR  = effectiveDef / (effectiveDef + dr_constant)
                 + sum of damage_reduction effects / 100
  effectiveHealMult = 1 + sum of healing_received effects / 100
```

These are recomputed whenever a state is added, removed, stacked, or expired.

---

## 4. Event Model

The entire simulator is reactive: **events flow in, reactions produce new events, those flow downstream.** There is no imperative control flow — only event streams.

### 4.1 Two Layers of Events

Every interaction in the system is an event. Events fall into two layers:

**Intent events** — cross-player communication. Carry source-side computation. The source player does not need to know the target's state. The target resolves the intent against their own state.

**State-change events** — within-player reactions. Emitted when player state mutates as a consequence of resolving an intent. Flow outward to all subscribers (internal reactive listeners + external consumers).

**Intent events (cross-player, A does not know B's state):**

| Event | Emitted by | Resolved by |
|:------|:-----------|:------------|
| HIT | Book (on cast) | Opponent player (applies own DR → shield → HP) |
| HP_DAMAGE | DoT ticks, %maxHP effects, heal_echo | Target player (HP reduction, bypasses DR) |
| APPLY_STATE | Book, reactive listeners | Target player (adds to states[]) |
| APPLY_DOT | Book | Target player (adds debuff with periodic tick) |
| HEAL | Book, lifesteal, per_tick effects | Self player (HP increase, applies own healing modifiers) |
| SHIELD | Book, reactive listeners | Self player (adds to shield) |
| HP_COST | Book | Self player (self-damage, bypasses DR/shield) |
| DISPEL | Book | Target player (removes N buffs) |
| BUFF_STEAL | Book | Target player → source player (moves buffs) |
| DELAYED_BURST | Book | Scheduled on clock, detonates as HP_DAMAGE later |

**State-change events (within-player reactions, observable by all subscribers):**

| Event | Emitted when | Reacted to by |
|:------|:-------------|:--------------|
| CAST_SLOT | Arena clock fires | Player (triggers book processing) |
| HP_CHANGE | HP mutated (damage, healing, cost) | Death check, heal_echo_damage, conditional triggers |
| SP_CHANGE | SP mutated (shield gen, resonance, regen) | SP depletion tracking |
| SHIELD_CHANGE | Shield mutated (gen, absorb, expire) | Shield-related triggers |
| STATE_APPLY | New state added to player | Reactive affix listeners (activation) |
| STATE_EXPIRE | State duration reached 0 | Reactive affix listeners (deactivation), child cleanup |
| STATE_TICK | Periodic interval of active state | Reactive affix listeners (per_tick effects) |
| STATE_TRIGGERED | Reactive condition (on_attacked, on_cast) | Reactive affix listeners |
| STATE_REMOVE | Dispel, cleanse, steal | Child cleanup, stat recalc |
| STAT_CHANGE | Effective stats recalculated | Consumers of current ATK/DEF/DR |
| DEATH | hp ≤ 0 | Arena (fight ends) |

### 4.2 Event Propagation

Events cascade through the system reactively:

```
  CAST_SLOT(1) arrives at Player A
    → Player A processes book(slot 1)
    → Book emits: HIT(1), HIT(2), ..., STATE_APPLY(灵鹤), SELF_HEAL(20%)
    → HIT events sent to Player B's state machine
    → STATE_APPLY(灵鹤) processed by Player A's state machine
      → Reactive affix listeners for 灵鹤 activate

  Later, clock fires STATE_TICK(灵鹤)
    → self_heal reacts: emits HEAL(3.5%)
    → affix listener reacts: emits SHIELD(4.4%)
    → HEAL processed by Player A:
      → HP_CHANGE emitted
      → heal_echo_damage reacts to HP_CHANGE: emits HIT(3.5%) to opponent

  HIT arrives at Player B
    → DR reacts: mitigated damage
    → SP shield gen reacts: SP_CHANGE, SHIELD_CHANGE
    → Shield absorb reacts: SHIELD_CHANGE
    → HP reduced: HP_CHANGE
    → on_attacked states react: may emit new events
    → HP_CHANGE(hp ≤ 0): DEATH
```

**Every arrow is a reaction.** No component "calls" another. Events flow in, reactions flow out.

### 4.3 Event Structure

| Field | Type | Description |
|:------|:-----|:------------|
| t | number | Simulation time (milliseconds) |
| type | string | Event type (from §4.1) |
| source | string | Who emitted it (player label, book name, state name) |
| target | string | Who should react ("A", "B", "self") |
| data | object | Type-specific payload |
| meta | object? | Additional context for tracing/debugging |

### 4.4 External Subscriber Interface

The same event stream that drives the simulation is exposed to external consumers:

```
subscribe(listener: (event: Event) => void) → unsubscribe()
```

External subscribers (trace formatter, visualizer, analytics) see the exact same events that drive internal behavior. The simulator's internal reactive behavior and external observability use the same event bus.

---

## 5. System Components

### 5.1 Arena (Clock + Scheduler)

The Arena is a minimal scheduler. It owns:
- **Clock**: Virtual simulation clock. Priority queue of timed callbacks. Advances instantly.
- **Cast schedule**: Emits CAST_SLOT events at t=0, 6s, 12s, 18s, 24s, 30s.
- **Hit interleaving**: When both players produce HIT events simultaneously, delivers them alternately (A-hit-1, B-hit-1, A-hit-2, ...). See §7.

The Arena does NOT own player state, route events between players, or make decisions. It is a clock.

### 5.2 Player (XState v5 State Machine)

The Player is the **only state machine** in the system. It is an event-driven reactive processor:

- Receives events (HIT, HEAL, STATE_APPLY, STATE_TICK, etc.)
- Reacts by mutating its own state (PlayerState, §3)
- Emits new events as a consequence of state changes
- Manages registered reactive listeners (affix effects with `parent`)
- Schedules time-based events on the clock (state expiry, DoT ticks, SP regen)

The Player does NOT know about books, slots, or the cast schedule. It only reacts to events.

**Reactive listener management:** When a book is loaded, its reactive effects (those with `parent: "<state_name>"`) are registered as listeners on the player machine. When the named state's event fires, the listener reacts.

### 5.3 Book (Pure Function)

A Book is a **pure function** owned by the Player. When the player reacts to CAST_SLOT, it calls the book function for that slot.

The book function:
1. Selects the correct tier for each effect based on progression (§10.4)
2. Separates direct effects (`parent: "this"`) from reactive effects (`parent: "<name>"`)
3. For direct effects: computes the damage chain (§6), produces HIT and other events
4. For reactive effects: returns listener registrations (what to listen for, what to emit)

The book function is called once at cast time for direct effects. Reactive effects are registered once at simulation start and respond to events throughout the fight.

---

## 6. Damage Chain

When a book reacts to CAST_SLOT, its direct effects produce HIT events. The damage for each hit is computed from the multiplicative chain:

```
  basePercent = base_attack.total                        (e.g., 20265)
  perHitPercent = basePercent / hits                      (e.g., 20265 / 6 = 3377.5)

  For hit k (0-indexed):
    hitDamage = (perHitPercent / 100) × sourceAtk
    hitDamage += flatExtra / hits                         (flat_extra_damage)
    hitDamage × (1 + M_dmg)                               (damage_increase zone)
             × (1 + M_skill + escalation(k))              (skill_damage_increase + per_hit_escalation)
             × (1 + M_final)                               (final_damage_bonus zone)
             × M_synchro                                   (probability_multiplier)

    spDamage = resonance multiplier × sourceAtk           (guaranteed_resonance)
```

Each hit becomes a HIT event with `damage` and `spDamage` pre-computed.

---

## 7. Hit Resolution (Reactive Chain)

When a HIT event arrives at a player, a chain of reactions fires:

```
  HIT { damage, spDamage, perHitEffects }
    │
    ├─→ DR reaction: mitigatedDamage = damage × (1 - totalDR)
    │
    ├─→ SP shield gen reaction:
    │     shieldGen = min(sp, mitigatedDamage) × sp_shield_ratio
    │     → SP_CHANGE (sp decreases)
    │     → SHIELD_CHANGE (shield increases)
    │
    ├─→ Shield absorb reaction:
    │     absorbed = min(mitigatedDamage, shield)
    │     → SHIELD_CHANGE (shield decreases)
    │     hpDamage = mitigatedDamage - absorbed
    │
    ├─→ HP reaction:
    │     hp -= hpDamage
    │     → HP_CHANGE
    │     → if hp ≤ 0: DEATH
    │
    ├─→ SP damage reaction (resonance):
    │     sp -= spDamage
    │     → SP_CHANGE
    │
    ├─→ perHitEffects reaction:
    │     e.g., HP_DAMAGE { percent: 27, basis: "max" } for %maxHP per hit
    │     → HP reduction (bypasses DR and shields)
    │     → HP_CHANGE
    │
    └─→ on_attacked trigger reaction:
          For each state with trigger="on_attacked":
            Listener fires → may emit new events (debuffs, damage, etc.)
            → those events cascade through the same reactive chain
```

**Counter-chain limit:** Reactive triggers can cascade (on_attacked → new event → on_attacked). Maximum depth: 10. Exceeded = drop + warning.

---

## 8. Time Model

### 8.1 Virtual Clock

The clock is a priority queue of timed callbacks. `advance()` pops and executes callbacks in time order. A 36-second fight completes in <1ms wall time.

### 8.2 Cast Schedule and Hit Interleaving

Both players cast simultaneously at each slot time. Hit events are interleaved:

```
  t=0:  A casts slot 1 (6 hits), B casts slot 1 (5 hits)

    A HIT(1) → sent to B    (B reacts: DR, shield, HP, triggers)
    B HIT(1) → sent to A    (A reacts: DR, shield, HP, triggers)
    A HIT(2) → sent to B
    B HIT(2) → sent to A
    ...
    B HIT(5) → sent to A    (B's last hit)
    A HIT(6) → sent to B    (A continues solo)

  Non-damage events (STATE_APPLY, HEAL, etc.) resolve after all hits.
```

Each hit fully resolves (including reactive cascades) before the next hit.

### 8.3 Time-Based Events

Between casts, the clock fires:
- STATE_EXPIRE: state duration reached 0 → listeners deactivate, children removed
- STATE_TICK: periodic interval → listeners react (healing, shields, DoT damage)
- SP regen: 灵力恢复 per second
- DELAYED_BURST: accumulated damage releases

These are scheduled on the clock when the triggering state is first applied.

### 8.4 Counter-Chain Limit

Maximum reactive chain depth: 10 (configurable). If exceeded, remaining reactions are dropped with a warning event.

---

## 9. Effect Handlers

Effect handlers are the bridge between book data (EffectRow from YAML) and intents. Each handler is a **pure function**:

```
handler(effect: EffectRow, context: HandlerContext) → HandlerResult
```

### 9.1 Handler Context

| Field | Type | Description |
|:------|:-----|:------------|
| sourcePlayer | PlayerState | Current state of the casting player (read-only) |
| targetPlayer | PlayerState | Current state of the opponent (read-only) |
| book | string | Name of the casting book |
| slot | number | Slot position (1-6) |
| rng | SeededRNG | Random number generator |
| atk | number | Source player's current effective ATK |
| hits | number | Number of hits from the book's base_attack |

### 9.2 Handler Result

Handlers don't produce intents directly. They produce **zone contributions** and **non-damage intents**:

| Field | Type | Description |
|:------|:-----|:------------|
| basePercent | number? | Base damage percent (from base_attack) |
| flatExtra | number? | Flat extra damage |
| zones | { M_dmg?, M_skill?, M_final?, M_synchro? } | Multiplicative zone contributions |
| perHitEscalation | function? | (hitIndex) → zone bonus for this hit |
| spDamage | number? | Resonance 灵力 damage |
| intents | Intent[] | Non-damage intents (buffs, debuffs, etc.) |

The Book actor collects all HandlerResults, accumulates zones, computes the damage chain (§7.1), and produces the final HIT intents.

### 9.3 Handler Registry

A lookup table mapping effect type strings to handler functions. Every effect type in books.yaml must have a registered handler, or a warning is emitted and the effect is skipped.

### 9.4 Phase 1 Handlers (15 core types)

| Handler | Effect Type | Contributes |
|:--------|:-----------|:------------|
| base_attack | base_attack | basePercent, hits |
| percent_max_hp | percent_max_hp_damage | perHitEffects (HP_DAMAGE per hit) |
| debuff | debuff | intents: APPLY_STATE(kind=debuff) |
| self_buff | self_buff | intents: APPLY_STATE(kind=buff) |
| dot | dot | intents: APPLY_DOT |
| shield | shield_strength | intents: SHIELD |
| lifesteal | lifesteal | intents: LIFESTEAL |
| hp_cost | self_hp_cost | intents: HP_COST |
| per_hit_escalation | per_hit_escalation | perHitEscalation function |
| resonance | guaranteed_resonance | spDamage |
| probability_mult | probability_multiplier | zones.M_synchro |
| damage_increase | damage_increase | zones.M_dmg |
| skill_damage_increase | skill_damage_increase | zones.M_skill |
| flat_extra_damage | flat_extra_damage | flatExtra |
| damage_reduction | self_damage_reduction_during_cast | intents: APPLY_STATE(kind=buff, stat=DR) |

---

## 10. Configuration

### 10.1 Player Configuration

Each player is configured with:

| Field | Description | Source |
|:------|:------------|:-------|
| entity.hp | Starting 气血 | config/*.json |
| entity.atk | Base 攻击 | config/*.json |
| entity.sp | Base 灵力 | config/*.json |
| entity.def | Base 守御 | config/*.json |
| entity.spRegen | 灵力恢复 per second | config/*.json |
| formulas.dr_constant | DR formula constant K | config/*.json |
| formulas.sp_shield_ratio | 灵力 → shield conversion rate | config/*.json |
| progression.enlightenment | 悟境 level (0-10) | config/*.json |
| progression.fusion | 融合重数 | config/*.json |
| books | 6 BookSlot entries | config/*.json |

### 10.2 Book Slot Configuration

Each slot specifies:

| Field | Description |
|:------|:------------|
| slot | Position (1-6) |
| platform | Main book name (e.g., "千锋聚灵剑") |
| op1 | Aux affix 1 name (e.g., "吞海") — from universal, school, or exclusive pool |
| op2 | Aux affix 2 name (e.g., "通明") |

### 10.3 Validation

Before simulation starts, validate:
1. All referenced books exist in books.yaml
2. All referenced affixes exist in affixes.yaml or as exclusive affixes
3. Each book has at least one usable tier matching the player's enlightenment/fusion
4. No duplicate platforms across slots (核心冲突 rule)
5. No duplicate affix sources across slots (副词缀冲突 rule)

Invalid configurations are rejected with a descriptive error. No silent degradation.

### 10.4 Tier Selection

Each effect has a `data_state` field that specifies its tier requirements:
```yaml
- type: base_attack
  total: 20265
  data_state:
    - enlightenment=10
    - fusion=51
```

The simulator selects the highest tier whose requirements are met by the player's progression. If no tier matches, the book is rejected at config validation time.

---

## 11. Monte Carlo

For win rate estimation, the simulator runs N fights with different RNG seeds:

1. For each run i = 1..N:
   - Create a SeededRNG with seed = baseSeed + i
   - Run one full fight
   - Record winner
2. Aggregate: win rate = wins_A / N, with confidence interval

The RNG affects:
- `probability_multiplier` tier selection
- `chance`-based triggers (counter_buff, counter_debuff)
- `random_buff` / `random_debuff` selection
- Any other stochastic effect

Same seed = same fight. Deterministic and reproducible.

---

## 12. GvG Extension (Future)

The design supports GvG without changing Player or Book actors:
- Arena spawns multiple players per team
- Intent routing adds a targeting step: `INTENT + targeting_rule → specific opponent`
- Player and Book actors are unchanged — they don't know about teams

---

## 13. Design Constraints

1. **Player state is the only mutable state.** Books, handlers, and the Arena are stateless or read-only.
2. **Every state mutation emits an event.** No silent changes.
3. **Handlers are pure functions.** No side effects. Given the same input, always produce the same results.
4. **The simulator is data-driven.** It reads BookData from YAML and dispatches to handlers by type. No hardcoded book logic.
5. **The event stream is the public API.** All output (traces, analytics, visualization) derives from events.
6. **Scheduling is not player state.** The cast schedule, slot ordering, and timing belong to the Arena.
7. **Damage chain computation lives in the Book.** The Book computes final per-hit damage; the Player only applies DR + shield + HP.
8. **Hits are the atomic unit of combat.** Each hit fully resolves before the next. No batching.
