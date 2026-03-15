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

# Combat Simulator — Implementation

**Status:** Implemented — `lib/simulator/simulate.ts`
**Updated:** 2026-03-14

## Overview

Two layers:

1. **Contracts** (`contract.main.md`) — intent types that define entity communication
2. **Combinator** (`simulate.ts`) — pure functions that transform parser output into intents

Code: `lib/simulator/simulate.ts`

## Tier Selection

Parser output contains multiple tiers per effect (gated by `data_state: enlightenment=N`). The simulator picks the highest available tier via `selectTier()`.

```typescript
function selectTier(effects: EffectRow[]): EffectRow[]
```

Rules:
- Effects without `data_state` are always included (ungated)
- Effects with `data_state: "locked"` are skipped
- Among effects with the same `type::name` key, the **last** entry wins (highest tier)
- Groups are keyed by `type + name` to handle separate tiers for named effects

## The Combinator: `simulateBook()`

Three-pass pipeline: **producers → modifiers → parent assembly**.

```typescript
function simulateBook(effects: EffectRow[], owner: OwnerStats): Intent[]
```

### Pre-processing

Before the passes, effects are separated:
- **Direct effects**: no `parent` field (or `parent: "this"`)
- **Parent-scoped effects**: `parent: "state_name"` — held back for Pass 3

### Pass 1 — Producers

Each producer effect type maps to a `produceIntent()` call that emits one or more intents.

```
for each direct effect where isProducer(type):
  intents.push(...produceIntent(effect, owner))
```

26 producer types are recognized (see `PRODUCERS` set in source).

### Pass 2 — Modifiers

Modifiers transform existing producer intents. They match by intent type.

```
for each direct effect where isModifier(type):
  applyModifier(effect, intents, owner)
```

22 modifier types are recognized (see `MODIFIERS` set in source).

### Pass 3 — Parent Assembly

Parent-scoped effects are produced as child intents, then nested under their parent's COUNTER_STATE:

```
for each [parentName, children] in parentChildren:
  childIntents ← produce each child effect
  find COUNTER_STATE intent with id == parentName
  append childIntents to on_hit.apply_to_attacker
```

This is how 大罗幻诀's DoTs (噬心魔咒, 断魂之咒) get nested under the 罗天魔咒 counter.

## Slot Resolution: `resolveSlot()`

```typescript
function resolveSlot(book: BookData, owner: EntitySnapshot): SlotResult
```

1. Collects all effects: `book.skill + book.primary_affix.effects + book.exclusive_affix.effects`
2. Calls `simulateBook(allEffects, owner)`
3. Classifies each intent as `self` or `opponent` via `isSelfIntent()`
4. Returns `{ self_intents, opponent_intents }`

Self-intent types: `HP_COST`, `SELF_BUFF`, `SHIELD`, `HEAL`, `COUNTER_STATE`, `CLEANSE`, `SUMMON`, `UNTARGETABLE`, `LIFESTEAL`, `SELF_DAMAGE_INCREASE`, `CRIT_BONUS`, `HP_FLOOR`, `SELF_BUFF_EXTEND`

Everything else is an opponent intent.

---

## Producer Details

### `base_attack`

```
Config:  { type: "base_attack", hits: 6, total: 20265 }
Owner:   { effective_atk: 50000 }

amount_per_hit = (20265 / 100) × 50000 / 6 = 1,688,750

→ ATK_DAMAGE { amount_per_hit: 1688750, hits: 6, dr_bypass: 0, crit_bonus: 0, operators: [] }
```

### `self_hp_cost`

```
Config:  { type: "self_hp_cost", value: 20 }
Owner:   { hp: 800000 }

→ HP_COST { amount: 160000 }
```

Based on **current** HP. Also supports `per_hit`, `tick_interval`, `duration` variants.

### `self_buff`

```
Config:  { type: "self_buff", name: "仙佑", attack_bonus: 70, defense_bonus: 70, hp_bonus: 70, duration: 12 }

→ SELF_BUFF { id: "仙佑", atk_percent: 70, def_percent: 70, hp_percent: 70, duration: 12 }
```

### `shield`

```
Config:  { type: "shield", value: 12, duration: 8 }
Owner:   { max_hp: 1000000 }

→ SHIELD { amount: 120000, duration: 8 }
```

### `debuff`

```
Config:  { type: "debuff", name: "落星", target: "final_damage_reduction", value: -8, duration: 4, per_hit_stack: true, dispellable: false }

→ APPLY_DEBUFF { id: "落星", stat: "final_damage_reduction", value: -8, duration: 4, per_hit_stack: true, dispellable: false }
```

### `dot`

```
Config:  { type: "dot", name: "贪妄业火", percent_current_hp: 3, tick_interval: 1, duration: 8 }

→ APPLY_DOT { id: "贪妄业火", percent: 3, basis: "current", tick_interval: 1, duration: 8 }
```

DoT basis is inferred from which `percent_*` field is present:
- `percent_current_hp` → basis: "current"
- `percent_lost_hp` → basis: "lost"
- `percent_max_hp` → basis: "max"

### `counter_buff`

```
Config:  { type: "counter_buff", name: "极怒", duration: 4, reflect_received_damage: 50, reflect_percent_lost_hp: 15 }

→ COUNTER_STATE { id: "极怒", duration: 4, on_hit: { reflect_received_damage: 50, reflect_percent_lost_hp: 15 } }
```

### `counter_debuff`

```
Config:  { type: "counter_debuff", name: "罗天魔咒", duration: 8, on_attacked_chance: 30 }

→ COUNTER_STATE { id: "罗天魔咒", duration: 8, on_hit: { chance: 30, apply_to_attacker: [] } }
```

Children are populated in Pass 3 (parent assembly).

### `delayed_burst`

```
Config:  { type: "delayed_burst", name: "无相魔劫", duration: 12, burst_base: 5000, burst_accumulated_pct: 10 }
Owner:   { effective_atk: 50000 }

burst_base_amount = (5000 / 100) × 50000 = 2,500,000

→ DELAYED_BURST { id: "无相魔劫", duration: 12, burst_base_amount: 2500000, ... }
```

---

## Modifier Details

### `self_lost_hp_damage` → modifies `ATK_DAMAGE`

```
Config:  { type: "self_lost_hp_damage", value: 10 }
Owner:   { hp: 700000, max_hp: 1000000 }

extra = (10 / 100) × (1000000 - 700000) = 30000
ATK_DAMAGE.amount_per_hit += 30000 / hits
```

Self-resolved — reads owner's own HP. Skipped if `parent` field is set (parent-scoped).

### `shield_strength` → replaces `SHIELD`

```
Config:  { type: "shield_strength", value: 21.5 }
SHIELD.amount = (21.5 / 100) × max_hp
```

### `ignore_damage_reduction` → `ATK_DAMAGE`

```
ATK_DAMAGE.dr_bypass = 1   (bypass 100% of target's DR)
```

### `damage_increase` / `skill_damage_increase` → `ATK_DAMAGE`

```
ATK_DAMAGE.amount_per_hit *= (1 + value / 100)
```

### `per_enemy_lost_hp` → operator on `ATK_DAMAGE`

```
Attaches: { kind: "per_enemy_lost_hp", per_percent: 2 }
Receiver evaluates: damage × (1 + target_lost_hp% × 2 / 100)
```

### `counter_debuff_upgrade` → `COUNTER_STATE`

```
COUNTER_STATE.on_hit.chance = 60   (upgraded from 30)
```

### `delayed_burst_increase` → `DELAYED_BURST`

```
DELAYED_BURST.burst_base_amount *= (1 + 0.65)
```

---

## Worked Example: 煞影千幻

Parser output:

```yaml
skill:
  - type: self_hp_cost, value: 20
  - type: base_attack, hits: 3, total: 1500
  - type: self_lost_hp_damage, value: 10
  - type: shield, value: 12, duration: 8
  - type: debuff, name: 落星, target: final_damage_reduction, value: -8
primary_affix:
  - type: shield_strength, value: 21.5
```

Owner: `{ effective_atk: 50000, hp: 800000, max_hp: 1000000 }`

**Pass 1** (producers):

```
self_hp_cost  → HP_COST { amount: 160000 }
base_attack   → ATK_DAMAGE { amount_per_hit: 250000, hits: 3 }
shield        → SHIELD { amount: 120000, duration: 8 }
debuff        → APPLY_DEBUFF { id: "落星", stat: "final_damage_reduction", value: -8 }
```

**Pass 2** (modifiers):

```
self_lost_hp_damage:
  extra = 10% × 200000 = 20000, per hit = 6667
  ATK_DAMAGE.amount_per_hit = 256667

shield_strength:
  SHIELD.amount = 21.5% × 1000000 = 215000
```

**Pass 3** — no parent-scoped effects

**Final**: `resolveSlot()` classifies:

```
Self:     HP_COST { 160000 }, SHIELD { 215000, 8s }
Opponent: ATK_DAMAGE { 256667/hit, 3 hits }, APPLY_DEBUFF { 落星 }
```

## Worked Example: 大罗幻诀

```yaml
skill:
  - type: base_attack, hits: 5, total: 20265
  - type: counter_debuff, name: 罗天魔咒, duration: 8, on_attacked_chance: 30
  - type: dot, name: 噬心魔咒, parent: 罗天魔咒, percent_current_hp: 7, ...
  - type: dot, name: 断魂之咒, parent: 罗天魔咒, percent_lost_hp: 7, ...
primary_affix:
  - type: counter_debuff_upgrade, on_attacked_chance: 60
```

**Pre-processing**: the two DoTs have `parent: "罗天魔咒"` → separated into `parentChildren`.

**Pass 1** (direct producers):
```
base_attack    → ATK_DAMAGE { amount_per_hit: 2026500, hits: 5 }
counter_debuff → COUNTER_STATE { id: "罗天魔咒", on_hit: { chance: 30, apply_to_attacker: [] } }
```

**Pass 2** (modifiers):
```
counter_debuff_upgrade → COUNTER_STATE.on_hit.chance = 60
```

**Pass 3** (parent assembly):
```
parent "罗天魔咒" children:
  dot 噬心魔咒 → APPLY_DOT { percent: 7, basis: "current" }
  dot 断魂之咒 → APPLY_DOT { percent: 7, basis: "lost" }

COUNTER_STATE.on_hit.apply_to_attacker = [APPLY_DOT × 2]
```

**Final**:
```
Self:     COUNTER_STATE { id: "罗天魔咒", chance: 60, apply_to_attacker: [2 DoTs] }
Opponent: ATK_DAMAGE { 2026500/hit, 5 hits }
```

---

## Design Decisions (Resolved)

### 1. Operator approach for opponent-dependent conditionals

**Decision: Operators.** The book attaches operator formulas to ATK_DAMAGE intents. The receiver evaluates them against its own state at hit time.

**Rationale**: Entity sovereignty is preserved — the book never reads opponent state. Operators are simple discriminated union variants evaluated in the entity's per-hit loop.

**Lifesteal interaction**: Lifesteal is computed in the arena after all damage is dealt. The arena measures the actual HP delta (not pre-DR damage), so it accounts for shields, DR, and operator bonuses.

### 2. Self-effect ordering

**Decision: Fixed order.** The arena orders self-intents: `HP_COST` first (increases lost HP for `self_lost_hp_damage`), then buffs/shields, then `HEAL` last.

### 3. Architecture

**Decision: Pure classes, not XState.** The Entity is a plain class, the arena is a `runCombat()` function. States are `ActiveState[]` objects on the entity. This is simpler to test, debug, and reason about. XState can be added later if needed for multi-book rotation or async scenarios.

### 4. Intent ordering within a round

**Decision: Simultaneous resolution.** Both books are resolved against frozen snapshots. Self-intents first, then opponent intents, then counter intents, then lifesteal, then state ticking.

### 5. DoT ticking

**Decision: Arena-driven.** The arena calls `entity.tickStates(dt)` at the end of each round. The entity ticks all its own states, computing DoT damage against its own HP. Entity sovereignty is preserved — the entity damages itself.
