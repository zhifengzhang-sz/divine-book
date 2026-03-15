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

# Divine Book — Intent Contracts

**Status:** Implemented — `lib/simulator/types.ts`
**Updated:** 2026-03-14

## Design Principle

Each entity is sovereign over its own attributes (HP, ATK, DEF, SP). No external code mutates these directly. Cross-entity communication happens through **intents** — the sender declares what it wants to do, the receiver evaluates and applies it to its own state.

## Architecture

```
Arena (runCombat)
  ├── Entity A (class)
  │     └── states: ActiveState[]   (buffs, debuffs, dots, shields, counters)
  └── Entity B (class)
        └── states: ActiveState[]

  Round loop:
    1. Snapshot A, B
    2. resolveSlot(bookA, snapA) → { self_intents, opponent_intents }
    3. resolveSlot(bookB, snapB) → { self_intents, opponent_intents }
    4. Apply self-intents → Apply opponent-intents → Counter intents → Lifesteal → Tick states
```

No XState actors. No event bus. Pure classes with method calls. The arena is a `runCombat()` function that loops rounds. Entities own all their state as `ActiveState[]` objects.

## Book → Intent Mapping

The combinator (`simulateBook()`) transforms parser `EffectRow[]` into `Intent[]`. Each parsed effect type maps to exactly one intent type. Effects are classified as **producers** (emit intents) or **modifiers** (transform producer intents).

### Producers

| Parsed effect type | Intent emitted | Target |
|---|---|---|
| `base_attack` | `ATK_DAMAGE` | opponent |
| `percent_max_hp_damage` | `HP_DAMAGE { basis: "max" }` | opponent |
| `percent_current_hp_damage` | `HP_DAMAGE { basis: "current" }` | opponent |
| `debuff` | `APPLY_DEBUFF` | opponent |
| `attack_reduction` | `APPLY_DEBUFF { stat: "atk" }` | opponent |
| `crit_rate_reduction` | `APPLY_DEBUFF { stat: "crit_rate" }` | opponent |
| `crit_damage_reduction` | `APPLY_DEBUFF { stat: "crit_damage" }` | opponent |
| `dot` / `extended_dot` | `APPLY_DOT` | opponent |
| `counter_debuff` | `COUNTER_STATE` (reactive) | self |
| `counter_buff` | `COUNTER_STATE` (reactive) | self |
| `cross_slot_debuff` | `APPLY_DEBUFF` | opponent |
| `delayed_burst` | `DELAYED_BURST` | opponent |
| `buff_steal` | `BUFF_STEAL` | opponent |
| `periodic_dispel` | `DISPEL` | opponent |
| `shield_destroy_damage` | `SHIELD_DESTROY` | opponent |
| `self_buff` | `SELF_BUFF` | self |
| `self_hp_cost` | `HP_COST` | self |
| `self_heal` | `HEAL` | self |
| `shield` | `SHIELD` | self |
| `self_cleanse` / `periodic_cleanse` | `CLEANSE` | self |
| `summon` | `SUMMON` | self |
| `untargetable_state` | `UNTARGETABLE` | self |
| `lifesteal` | `LIFESTEAL` | self |
| `self_damage_taken_increase` | `SELF_DAMAGE_INCREASE` | self |
| `self_hp_floor` | `HP_FLOOR` | self |

### Modifiers

| Parsed effect type | Targets | Transform |
|---|---|---|
| `crit_damage_bonus` | `ATK_DAMAGE` | `crit_bonus += value` |
| `per_enemy_lost_hp` | `ATK_DAMAGE` | attach operator `{ kind: "per_enemy_lost_hp" }` |
| `per_self_lost_hp` | `ATK_DAMAGE` | attach operator `{ kind: "per_self_lost_hp" }` |
| `per_debuff_stack_damage` | `ATK_DAMAGE` | attach operator `{ kind: "per_debuff_stack" }` |
| `conditional_damage` | `ATK_DAMAGE` | attach operator `{ kind: "conditional" }` |
| `self_lost_hp_damage` | `ATK_DAMAGE` | `amount_per_hit += (value% × lost_hp) / hits` |
| `ignore_damage_reduction` | `ATK_DAMAGE` | `dr_bypass = 1` |
| `damage_increase` / `skill_damage_increase` | `ATK_DAMAGE` | `amount_per_hit *= (1 + value/100)` |
| `final_damage_bonus` | `ATK_DAMAGE` | `amount_per_hit *= (1 + value/100)` |
| `flat_extra_damage` | `ATK_DAMAGE` | `amount_per_hit += (value/100 × effective_atk) / hits` |
| `attack_bonus` | `ATK_DAMAGE` | `amount_per_hit *= (1 + value/100)` |
| `shield_strength` | `SHIELD` | replaces `amount = (value/100) × max_hp` |
| `self_buff_extra` | `SELF_BUFF` (by `buff_name`) | adds fields to matching buff |
| `self_buff_extend` | `SELF_BUFF` | `duration += value` |
| `counter_debuff_upgrade` | `COUNTER_STATE` | `on_hit.chance = value` |
| `delayed_burst_increase` | `DELAYED_BURST` | `burst_base_amount *= (1 + value/100)` |

### Deferred modifiers (no-op in current implementation)

| Modifier | Reason |
|---|---|
| `periodic_escalation` | Per-hit escalation within a round — needs hit-level simulation |
| `summon_buff` | Summon clone not yet simulated |
| `dot_extra_per_tick` | DoT damage modification — deferred to phase 2 |
| `dot_damage_increase` | DoT damage modification — deferred to phase 2 |

---

## Intent Type Definitions

All types defined in `lib/simulator/types.ts`.

### 1. ATK_DAMAGE — Opponent Intent

Direct damage computed from attacker's ATK and skill factors.

```typescript
{
  type: "ATK_DAMAGE",
  amount_per_hit: number,  // (total/100) × effective_atk / hits
  hits: number,            // per-hit granularity for shields, counters, stacking
  source: string,          // attacker entity id
  dr_bypass: number,       // 0.0–1.0 fraction of DR to ignore
  crit_bonus: number,      // % crit damage bonus (e.g., 100 = +100%)
  operators: Operator[],   // formulas the receiver evaluates
}
```

**Receiver cascade** (Entity `receiveAtkDamage`):
1. For each hit: evaluate operators → apply crit bonus → apply self_damage_increase → DR bypass → shield absorption → HP floor → deduct HP
2. Per-hit debuff stacking
3. Trigger counter states

**Used by**: all 28 books (from `base_attack`)

### 2. HP_DAMAGE — Opponent Intent

Damage based on the **target's own HP**. The target evaluates.

```typescript
{
  type: "HP_DAMAGE",
  percent: number,                       // e.g., 27 = 27%
  basis: "max" | "current" | "lost",
  source: string,
  per_prior_hit?: boolean,               // scales by prior hits (not yet impl)
}
```

**Receiver**: computes `percent% × own [max_hp | current_hp | lost_hp]`, applies own DR, absorbs shield, deducts HP.

**Used by**: 千锋聚灵剑 (`max`, 27%), 无极御剑诀 (`current`, 1.5%), 天魔降临咒 (`max`, 1.6%), 天轮魔经 (`max`, 3%), 玉书天戈符 (`max`, 21%), 惊蜇化龙 (`max`, 10%)

### 3. APPLY_DEBUFF — Opponent Intent

Apply a named state on the target that modifies its stats.

```typescript
{
  type: "APPLY_DEBUFF",
  id: string,                          // state name
  stat: string,                        // which derived stat to modify
  value: number,                       // modifier value (negative = reduction)
  duration: number | "permanent",
  stacks?: number,
  max_stacks?: number,
  per_hit_stack?: boolean,
  dispellable?: boolean,
}
```

**Receiver**: creates `ActiveState { kind: "debuff" }` on itself. If already exists, refreshes duration.

**Used by**: 新-青元剑诀 (神通封印, 追命剑阵), 煞影千幻 (落星), 天魔降临咒 (结魂锁链), 天轮魔经 (惧意), 大罗幻诀 (命損)

### 4. APPLY_DOT — Opponent Intent

Apply a periodic damage state on the target.

```typescript
{
  type: "APPLY_DOT",
  id: string,
  percent: number,                     // damage per tick as % of HP basis
  basis: "max" | "current" | "lost",
  tick_interval: number,
  duration: number,
  stacks?: number,
  max_stacks?: number,
  per_hit_stack?: boolean,
  damage_per_tick?: number,            // alternative: flat ATK-based damage
}
```

**Receiver**: creates `ActiveState { kind: "dot" }`. Each tick in `tickStates()`: computes `percent% × own [basis]_hp × stacks` and self-damages.

**Used by**: 天魔降临咒 (1.6% max/s), 大罗幻诀 (噬心魔咒 7% current, 断魂之咒 7% lost), 梵圣真魔咒 (贪妄业火 3% current)

### 5. DELAYED_BURST — Opponent Intent

```typescript
{
  type: "DELAYED_BURST",
  id: string,
  duration: number,
  damage_increase_during: number,      // % increase to incoming damage (not yet impl)
  burst_base_amount: number,           // pre-computed: (burst_base/100) × effective_atk
  burst_accumulated_pct: number,       // % of accumulated bonus (not yet impl)
}
```

**Receiver**: creates `ActiveState { kind: "delayed_burst" }`. On expiry in `tickStates()`, detonates for `burst_base_amount`.

**Used by**: 无相魔劫咒

### 6. DISPEL — Opponent Intent

```typescript
{ type: "DISPEL", count: number }
```

Receiver removes up to `count` buff-kind states from itself.

### 7. BUFF_STEAL — Opponent Intent

```typescript
{ type: "BUFF_STEAL", count: number, source: string }
```

Receiver removes up to `count` buffs. Stolen buffs are currently destroyed (not transferred back — deferred).

### 8. SHIELD_DESTROY — Opponent Intent

```typescript
{
  type: "SHIELD_DESTROY",
  count: number,
  bonus_hp_damage: number,             // % max HP per destroyed shield
  no_shield_double: boolean,           // double damage if no shield
  source: string,
}
```

Receiver: destroys shields, takes `bonus_hp_damage% × max_hp`. If no shield and `no_shield_double`, damage is doubled.

---

## Self-Intents (internal, never cross entity boundary)

| Intent | What it does | Stored as |
|---|---|---|
| `HP_COST` | reduce own HP by computed amount | immediate mutation (no state) |
| `SELF_BUFF` | modify ATK/DEF/HP via `ActiveState { kind: "buff" }` | `states[]` |
| `SHIELD` | absorb damage before DR | `ActiveState { kind: "shield" }` |
| `HEAL` | restore HP (capped at max_hp) | immediate mutation |
| `COUNTER_STATE` | register reactive trigger | `ActiveState { kind: "counter" }` |
| `CLEANSE` | remove own debuffs/DoTs | filter `states[]` |
| `SUMMON` | create clone (deferred — not yet simulated) | — |
| `UNTARGETABLE` | drop incoming intents | `ActiveState { kind: "buff", id: "untargetable" }` |
| `LIFESTEAL` | heal after damage dealt | `ActiveState { kind: "buff" }`, applied by arena |
| `SELF_DAMAGE_INCREASE` | amplify own incoming damage | `ActiveState { kind: "damage_increase" }` |
| `HP_FLOOR` | HP cannot drop below % | `ActiveState { kind: "hp_floor" }` |
| `SELF_BUFF_EXTEND` | add duration to all buffs | modifies existing `states[]` |
| `CRIT_BONUS` | handled in combinator (modifies `ATK_DAMAGE.crit_bonus`) | no state |

---

## Operators (receiver-evaluated formulas)

Operators are attached to `ATK_DAMAGE.operators[]`. The receiver evaluates them against its own state during the per-hit damage loop.

```typescript
type Operator =
  | { kind: "per_enemy_lost_hp", per_percent: number }
  | { kind: "per_self_lost_hp", per_percent: number }
  | { kind: "per_debuff_stack", value: number, max_stacks: number }
  | { kind: "conditional", condition: string, bonus_percent: number }
```

| Operator | Evaluation |
|---|---|
| `per_enemy_lost_hp` | `damage × (1 + receiver_lost_hp% × per_percent / 100)` |
| `per_self_lost_hp` | `damage × (1 + attacker_lost_hp% × per_percent / 100)` — uses attacker snapshot |
| `per_debuff_stack` | `damage × (1 + min(debuff_count, max_stacks) × value / 100)` |
| `conditional` | if `evaluateCondition(condition)` → `damage × (1 + bonus_percent / 100)` |

Supported conditions: `target_hp_below_30`, `target_hp_above_20`, `target_controlled`, `target_has_no_healing`

---

## Counter States (reactive intents)

Counters fire when the entity receives ATK_DAMAGE. Two flavors:

**Damage reflection** (counter_buff → COUNTER_STATE):
```typescript
on_hit: {
  reflect_received_damage: 50,   // 50% of damage received → ATK_DAMAGE back
  reflect_percent_lost_hp: 15,   // 15% of own lost HP → ATK_DAMAGE back
}
```

**Debuff application** (counter_debuff → COUNTER_STATE):
```typescript
on_hit: {
  chance: 60,                    // probability %
  apply_to_attacker: [           // nested intents from parent assembly
    APPLY_DOT { id: "噬心魔咒", percent: 7, basis: "current", ... },
    APPLY_DOT { id: "断魂之咒", percent: 7, basis: "lost", ... },
  ]
}
```

Counter intents are dispatched in the arena's Phase 3, after all damage intents.

---

## Round Flow

```
Entity A                                    Entity B
  resolveSlot(bookA, snapA)                   resolveSlot(bookB, snapB)
  → self_intents, opponent_intents            → self_intents, opponent_intents

  Phase 1: apply self-intents (ordered: HP_COST → buffs → HEAL)
  Phase 2: A.opponent_intents → B.receiveIntent()
           B.opponent_intents → A.receiveIntent()
           → each may return counter intents
  Phase 3: counter intents dispatched to opposite entity
  Phase 4: lifesteal healing (based on HP delta this round)
  Phase 5: tickStates(dt) on both entities
           → DoT damage, state expiry, delayed burst detonation

  Check: if either entity dead → end. Else next round.
```

Each entity only mutates its own state. Intents declare what the sender wants. The receiver decides what actually happens.
