---
initial date: 2026-3-7
dates of modification: [2026-3-7]
---

# Time-Series Factor Model

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Layer 4 — Temporal evaluation.** Builds on the [combat model](./impl.combat.md) (factor zones, Combinators 1-2). Extends the static factor vector into a time-varying `vec(t)` per second, then aggregates to produce a time-averaged book vector and slot coverage metric.

---

## Table of Contents

| Section | Content |
|:--------|:--------|
| **1. Problem** | Why static vectors fail for temporal effects and meta-amplifiers |
| **2. Data Gaps** | modifier_value and summon metadata in model.yaml |
| **3. Time-Series Model** | vec(t) per second, temporal events, modifiers |
| **4. Aggregation** | Book vector (time-averaged) and slot coverage |
| **5. Summon** | Temporal multiplier envelope |
| **6. Modifier Interaction** | buff_strength, buff_duration, all_state_duration |
| **7. Data Flow** | From model.yaml temporal[] through the pipeline |

---

## 1. Problem

The static model (Combinators 1-2) computes a single factor vector per divine book. This is wrong for three reasons:

**1.1 Meta-amplifiers are invisible.** `buff_strength`, `all_state_duration`, `debuff_stack_chance` have no factor fields in AffixModel and no weights in `compositeScore()`. They map to zones in the registry but the scoring pipeline ignores them entirely.

**1.2 Temporal effects are flattened.** A 4s `self_buff` and a 12s `self_buff` get the same static vector treatment. The `temporal[]` array is collected by Combinators 1-2 but never consumed.

**1.3 Summon is unmodeled.** 春黎剑阵's 分身 (54% stat inheritance × (1 + 200% damage_increase) = 1.62× multiplier for 16s) has no factor representation.

### What we need

- `vec(t)`: per-second factor vector for a divine book
- Time-averaged book vector: captures both magnitude and duration
- Slot coverage: how many skill slots the book's effects can span

---

## 2. Data Gaps

### 2.1 modifier_value

Currently, modifier effects (§9 State Modifiers) emit `temporal:` metadata but no `factors:` or `modifier_value:` in model.yaml. The values exist in effects.yaml but are lost during the Map.

| Affix | Effect type | Value |
|:------|:-----------|:------|
| 清灵 | `buff_strength` | 20 |
| 龙象护身 | `buff_strength` | 104 |
| 咒书 | `debuff_strength` | 20 |
| 业焰 | `all_state_duration` | 69 |
| 真言不灭 | `all_state_duration` | 55 |
| 仙露护元 | `buff_duration` | 300 |
| 心魔惑言 | `debuff_stack_increase` | 100 |
| 奇能诡道 | `debuff_stack_chance` | 20 |

Solution: add `modifier_value: number` field to EffectModelSchema. The Map emits this for all §9 effects.

### 2.2 Summon metadata

春黎剑阵 has `summon` + `summon_buff` effects. Currently emitted as type-only entries (no factors). The time-series model needs:

```yaml
- type: summon
  summon:
    inherit_stats: 54
    duration: 16
    damage_increase: 200
  temporal:
    duration: 16
    coverage_type: duration_based
```

Solution: add `summon: { inherit_stats, duration, damage_increase }` to EffectModelSchema. The Map merges `summon` + `summon_buff` into this.

---

## 3. Time-Series Model

### 3.1 Data Structures

```
TemporalEvent {
  t_start: number        // offset from skill activation (usually 0)
  duration: number        // seconds (Infinity for permanent)
  factor: string          // e.g., "S_coeff", "M_dmg"
  value: number           // contribution while active
  source_type: string     // effect type (for modifier targeting)
}

TemporalModifier {
  kind: "strength" | "duration" | "summon"
  value: number           // percentage points
  targets: string[]       // effect types this modifies
  t_start: number
  duration: number
}
```

### 3.2 Event Collection

Read `BookModel.temporal[]` (already collected by Combinators 1-2). Partition into:

1. **Factor events**: entries with a factor + value AND temporal duration > 0
2. **Static baseline**: factors from effects WITHOUT temporal metadata (always-on)
3. **Modifiers**: entries with `modifier_value` (buff_strength, etc.)

### 3.3 Modifier Application

Applied once, before sampling:

- **Duration modifiers** (`buff_duration`, `all_state_duration`): `event.duration *= (1 + modifier.value / 100)`
- **Strength modifiers** (`buff_strength`, `debuff_strength`): `event.value *= (1 + modifier.value / 100)`
- **Summon**: stored as a multiplicative envelope

### 3.4 Sampling

At each `t = 0, 1, ..., T_active`:

```
vec(t) = static_baseline
for each event where t_start <= t < t_start + duration:
    vec(t)[event.factor] += event.value
if summon active at t:
    vec(t) *= summon_multiplier
```

---

## 4. Aggregation

### 4.1 Time-Averaged Book Vector

```
averaged[f] = mean(vec(t)[f] for t in 0..T_active)
```

This captures both the magnitude and the coverage fraction of each factor.

### 4.2 Slot Coverage

```
slot_coverage = floor(T_active / T_gap)
```

Where `T_gap` is the time between consecutive skill activations (default: 4s).

### 4.3 Peak Vector

```
peak[f] = max(vec(t)[f] for t in 0..T_active)
```

---

## 5. Summon as Temporal Multiplier

春黎剑阵 summon:
- inherit_stats: 54% → the summon has 54% of player's stats
- summon_buff damage_increase: 200% → summon deals (1 + 200/100) = 3× its base damage
- Net multiplier: 0.54 × 3.0 = 1.62×
- Duration: 16s
- This multiplier applies to ALL factors during [0, 16s]

---

## 6. Modifier Interaction Rules

| Modifier type | Targets | Effect |
|:-------------|:--------|:-------|
| `buff_strength` | `self_buff`, `counter_buff`, `random_buff` | value × (1 + modifier/100) |
| `debuff_strength` | `debuff`, `counter_debuff`, `conditional_debuff`, `cross_slot_debuff` | value × (1 + modifier/100) |
| `buff_duration` | `self_buff`, `counter_buff` | duration × (1 + modifier/100) |
| `all_state_duration` | ALL `duration_based` events | duration × (1 + modifier/100) |
| `debuff_stack_increase` | debuff stacks | stack count effects (not in factor space) |
| `debuff_stack_chance` | debuff application | probability effects (not in factor space) |

---

## 7. Data Flow

```
effects.yaml ──Map──> model.yaml (with modifier_value, summon)
                           │
                    Combinators 1-2
                           │
                   BookModel.temporal[]
                           │
                   ┌───────┴───────┐
                   │  time-series  │
                   │    module     │
                   └───────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
          averaged     coverage       peak
          vector      (slots)       vector
```
