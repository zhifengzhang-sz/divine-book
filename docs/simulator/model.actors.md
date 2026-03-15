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

# Runtime Model — Entity & Arena

**Status:** Implemented — `lib/simulator/entity.ts`, `lib/simulator/arena.ts`
**Updated:** 2026-03-14

This document describes the runtime behavior of the Entity class and Arena orchestrator.

> **Architecture change from design phase**: The original design specified XState v5 actors (Arena, Entity, StateEffect machines). The implementation uses **pure classes and functions** instead — simpler to test, debug, and reason about. XState dependency remains in `package.json` but is not used by the simulator. If multi-book rotation or async scenarios are needed later, the classes can be wrapped in XState actors.

---

## 1. System Overview

```
runCombat(bookA, bookB, nameA, nameB, config) → CombatResult

  Creates:
    Entity A (class instance)
    Entity B (class instance)

  Round loop:
    snapshot() → resolveSlot() → applySelf() → receiveIntent() → counter → lifesteal → tickStates()
```

Three components, two implemented as classes, one as a function:

| Component | Type | File | Role |
|-----------|------|------|------|
| Arena | `runCombat()` function | `arena.ts` | Clock, round lifecycle, event dispatch |
| Entity | `Entity` class | `entity.ts` | HP sovereign, defense evaluation, reactive triggers, state management |
| State | `ActiveState` interface | `types.ts` | Duration-gated modifier attached to Entity |

No separate StateEffect actor. States are `ActiveState` objects stored in `entity.states[]`. The entity ticks its own states.

---

## 2. Entity

### 2.1 State Model

The Entity is always in one of two states, checked via the `alive` getter:

```
alive (hp > 0) ←→ dead (hp ≤ 0)
```

There is no transient `receiving_hit` state. Death is checked by the arena after each round.

### 2.2 Properties

```typescript
class Entity {
  // Immutable
  readonly id: string
  readonly max_hp: number
  readonly base_atk: number
  readonly base_def: number
  readonly base_sp: number

  // Mutable
  hp: number
  states: ActiveState[]           // all active buffs, debuffs, dots, shields, counters
  total_damage_dealt: number
  total_damage_taken: number
}
```

### 2.3 Derived Stats (computed properties)

All derived stats are computed on-the-fly by iterating `states[]`:

| Property | Computation |
|----------|-------------|
| `effective_atk` | `base_atk × ∏(1 + buff.atk_percent × stacks / 100)` for all SELF_BUFF states |
| `effective_def` | `base_def × ∏(1 + buff.def_percent × stacks / 100)` for all SELF_BUFF states |
| `effective_dr` | sum of `buff.damage_reduction × stacks` + `debuff.value × stacks` (for stat="damage_reduction") |
| `self_damage_increase` | sum of `SELF_DAMAGE_INCREASE.percent` |
| `shield_amount` | sum of `SHIELD.amount` across shield-kind states |
| `debuff_count` | count of states with kind "debuff" or "dot" |
| `buff_count` | count of states with kind "buff" |
| `hp_floor_percent` | first HP_FLOOR state's percent, or 0 |
| `lost_hp` | `max_hp - hp` |

### 2.4 Snapshot

`entity.snapshot()` returns an immutable `EntitySnapshot` for simultaneous resolution:

```typescript
interface EntitySnapshot extends OwnerStats {
  debuff_count: number
  buff_count: number
  has_shield: boolean
  shield_amount: number
  effective_dr: number
  lost_hp: number
}
```

### 2.5 Self-Intent Application

`entity.applySelf(intent: Intent): string[]`

Handles self-targeting intents. Returns event log strings.

| Intent | Behavior |
|--------|----------|
| `HP_COST` | Deduct from HP. Cannot kill self (floor at 1). |
| `SELF_BUFF` | Create ActiveState `{ kind: "buff" }`. If exists: per_hit_stack → increment stacks; else refresh duration. |
| `SHIELD` | Create ActiveState `{ kind: "shield" }`. |
| `HEAL` | Increase HP, capped at max_hp. |
| `COUNTER_STATE` | Create ActiveState `{ kind: "counter" }`. |
| `CLEANSE` | Remove up to N debuff/dot states (respects dispellable flag). |
| `LIFESTEAL` | Create permanent buff state. Arena reads it post-damage to apply healing. |
| `SELF_DAMAGE_INCREASE` | Create ActiveState `{ kind: "damage_increase" }` with duration. |
| `HP_FLOOR` | Create permanent ActiveState `{ kind: "hp_floor" }`. |
| `UNTARGETABLE` | Create ActiveState `{ kind: "buff", id: "untargetable" }` with duration. |
| `SELF_BUFF_EXTEND` | Add duration to all buff-kind states. |

### 2.6 Opponent Intent Reception

`entity.receiveIntent(intent: Intent, attackerSnapshot: EntitySnapshot): [string[], Intent[]]`

Returns `[events, counterIntents]`. Counter intents are sent back to the attacker.

**Untargetable check**: If entity has an active untargetable state, all intents except HP_DAMAGE are dropped.

### 2.7 ATK_DAMAGE Processing — The Damage Cascade

For each hit (0 to `intent.hits`):

```
1. Start with intent.amount_per_hit
2. Evaluate each operator against own state (receiver-side)
3. Apply crit_bonus: damage × (1 + crit_bonus/100)
4. Apply self_damage_increase: damage × (1 + self_damage_increase/100)
5. DR: if dr_bypass < 1, apply effective_dr × (1 - dr_bypass)
   - Positive DR → damage reduction
   - Negative DR → damage amplification
6. Shield absorption: deduct from shield states
7. HP floor: cap damage so HP doesn't drop below floor
8. Deduct HP
9. Per-hit debuff stacking: increment stacks on per_hit_stack debuffs
```

After all hits:
- Trigger counter states → produce counter intents (ATK_DAMAGE or APPLY_DOT/APPLY_DEBUFF)

### 2.8 State Ticking

`entity.tickStates(dt: number): string[]`

Called by the arena at end of each round:

1. Decrement `remaining` by `dt` on all non-permanent states
2. **DoT tick**: for each dot-kind state, compute damage:
   - If `damage_per_tick`: flat damage (ATK-based)
   - Else: `percent% × getDotBase(basis) × stacks` (HP-based)
   - Apply via `takeDamage()` (respects HP floor)
3. **Delayed burst**: if remaining ≤ 0, detonate for `burst_base_amount`
4. **Expiry**: remove states where `remaining ≤ 0`

### 2.9 Counter Trigger Logic

Counters fire after all hits of an ATK_DAMAGE are processed:

```typescript
for each counter-kind state:
  if reflect_received_damage:
    → ATK_DAMAGE { amount: received% × totalDamage }
  if reflect_percent_lost_hp:
    → ATK_DAMAGE { amount: percent% × own lost_hp }
  if apply_to_attacker.length > 0:
    roll chance% → if success, emit all child intents
```

Counter HITs go back to the attacker as ATK_DAMAGE intents (not "dot" source), so they CAN trigger the attacker's own counters. In practice, counter damage is finite and states expire.

---

## 3. Arena

### 3.1 Function Signature

```typescript
function runCombat(
  bookA: BookData, bookB: BookData,
  nameA: string, nameB: string,
  config: CombatConfig
): CombatResult
```

### 3.2 Round Lifecycle

```
for round = 1 to max_rounds:

  Phase 1: SNAPSHOT
    snapA ← entityA.snapshot()
    snapB ← entityB.snapshot()

  Phase 2: RESOLVE (pure, no side effects)
    resultA ← resolveSlot(bookA, snapA)
    resultB ← resolveSlot(bookB, snapB)

  Phase 3: SELF-INTENTS (ordered: HP_COST → buffs → HEAL)
    for each ordered self-intent in resultA: entityA.applySelf(intent)
    for each ordered self-intent in resultB: entityB.applySelf(intent)

  Phase 4: OPPONENT INTENTS
    for each intent in resultA.opponent_intents:
      entityB.receiveIntent(intent, snapA) → collect counter intents from B
    for each intent in resultB.opponent_intents:
      entityA.receiveIntent(intent, snapB) → collect counter intents from A

  Phase 5: COUNTER INTENTS
    counter intents from B → entityA.receiveIntent()
    counter intents from A → entityB.receiveIntent()

  Phase 6: LIFESTEAL
    for each entity with LIFESTEAL state:
      heal = lifesteal% × damage_dealt_this_round
      entity.hp += heal (capped at max_hp)

  Phase 7: TICK STATES
    entityA.tickStates(config.tick_interval)
    entityB.tickStates(config.tick_interval)

  TERMINATION CHECK:
    if !entityA.alive || !entityB.alive → break
```

### 3.3 Self-Intent Ordering

Self-intents are ordered before application:

```
1. HP_COST     (self-damage first — increases lost HP for subsequent calculations)
2. Everything else (buffs, shields, counters, etc.)
3. HEAL        (last — benefits from buffs applied above)
```

### 3.4 Winner Determination

```
if both dead     → "draw"
if A dead        → B wins
if B dead        → A wins
if timeout       → higher HP wins
```

### 3.5 Lifesteal Implementation

Lifesteal is applied in Phase 6, after all damage intents are resolved. It computes healing from the actual HP delta the entity suffered (not pre-DR damage). This means lifesteal accounts for shields, DR, and operator bonuses.

```typescript
damageDealt = hpBefore - entity.hp  // actual HP loss this round
heal = lifesteal% × damageDealt
```

### 3.6 Simultaneous Death

Both entities can die in the same round. The arena checks both entities after the round completes. If both are dead, the result is `"draw"`.

---

## 4. Active State

All runtime states share one interface:

```typescript
interface ActiveState {
  id: string
  kind: "buff" | "debuff" | "dot" | "shield" | "counter" | "delayed_burst" | "hp_floor" | "damage_increase"
  remaining: number | "permanent"
  stacks: number
  source_intent: Intent          // the full intent that spawned this state
}
```

The `kind` field determines which derived stat computations read it. The `source_intent` preserves all original data for later evaluation (e.g., counter on_hit rules, DoT basis).

### State Roles

| kind | Derived stat affected | Lifecycle |
|------|----------------------|-----------|
| `buff` | effective_atk, effective_def, effective_dr | Duration expiry |
| `debuff` | effective_dr (if stat="damage_reduction"), debuff_count | Duration expiry, cleansable |
| `dot` | Self-damage on tick | Duration expiry, cleansable |
| `shield` | Shield absorption on damage | Duration expiry, depleted on absorption |
| `counter` | Triggers on ATK_DAMAGE received | Duration expiry |
| `delayed_burst` | Detonates on expiry | Duration-triggered |
| `hp_floor` | HP minimum | Permanent |
| `damage_increase` | Self-damage amplification | Duration expiry |

---

## 5. Combat Result

```typescript
interface CombatResult {
  winner: string | "draw"
  rounds: number
  a_final_hp: number
  b_final_hp: number
  log: RoundLog[]
}

interface RoundLog {
  round: number
  a_hp: number
  b_hp: number
  a_damage_dealt: number
  b_damage_dealt: number
  events: string[]
}
```

---

## 6. Event Ordering Within a Round

```
1. Self HP costs         (increase lost HP → affects self_lost_hp_damage)
2. Self buffs/shields    (modify derived stats before damage)
3. Self heals            (benefit from buffs)
4. Opponent ATK_DAMAGE   (per-hit: operator → crit → self_dmg_inc → DR → shield → floor → HP)
5. Opponent HP_DAMAGE    (% of own HP basis)
6. Opponent debuffs/DoTs (create states)
7. Counter intents       (reactive, one level deep)
8. Lifesteal             (heal based on actual damage dealt)
9. State ticking         (DoT damage, burst detonation, duration expiry)
10. Death check          (round boundary)
```

---

## 7. Known Limitations (Phase 2)

| Mechanic | What's missing |
|----------|---------------|
| `periodic_escalation` | Per-hit damage scaling within a round |
| `summon` | Clone actor creation and damage contribution |
| `summon_buff` | Clone stat modification |
| `dot_extra_per_tick` | Additional DoT tick damage |
| `dot_damage_increase` | DoT damage multiplier |
| `per_stolen_buff` | Feedback loop (天轮魔经) |
| `next_skill_hits` | Cross-activation state (天煞破虚诀) |
| `echo_damage` | Damage echo mechanic (星元化岳) |
| `next_skill_cooldown` | Opponent activation delay (新-青元剑诀) |
| `buff_steal` transfer | Stolen buffs are destroyed, not transferred |
| `damage_increase_during` | DELAYED_BURST damage amplification during duration |
| `burst_accumulated_pct` | DELAYED_BURST accumulated damage tracking |
| SP shield | Initial shield from 灵力 at combat start |
| DEF → DR formula | `DR = def / (def + K)` formula not yet applied |
