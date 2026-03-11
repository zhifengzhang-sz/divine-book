---
initial date: 2026-3-7
dates of modification: [2026-3-7]
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

# Binding Quality & Combo Search

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Layer 3 — Combo evaluation.** Builds on the [combat model](./combat.md) (factor zones) and [domain graph](../data/domain.graph.md) (provides/requires). Defines how to validate, score, and cluster operator combos for a given platform.

---

## Table of Contents

| Section | Content |
|:--------|:--------|
| **1. Problem** | Why naive pairwise enumeration fails |
| **2. Per-Combo Binding Validation** | Replacing the global pool filter |
| **3. Binding Quality** | Three-dimensional evaluation: activation, platform fit, zone coverage |
| **4. Composite Scoring** | Combining factor output with binding quality |
| **5. Clustering** | K-means on factor vectors to discover strategic archetypes |
| **6. CLI Tools** | `combo-rank.ts`, `combo-cluster.ts`, `embed-radar.ts` |

---

## 1. Problem

A platform (skill + primary affix) is the base system. Two **operator affixes** are selected to amplify it. The question: which pair is best?

**Naive approach**: enumerate all `C(n,2)` pairs from the legal affix pool, score by raw damage output. This fails for two reasons:

1. **Ghost combos.** The global pool filter (`filterByBinding`) checks if an affix's requires can be met by *any* affix in the pool. But a specific pair may not satisfy each other's requires. Example: 奇能诡道 requires `[Debuff]` and passes the global filter (天倾灵枯 provides Debuff elsewhere), but paired with 心逐神随 (provides `[Probability]`), no Debuff source exists. The combo is invalid.

2. **Wasted features.** An affix with 5 outputs where only 1 feeds the damage chain is less valuable than one with 2 outputs both feeding different chain zones. Raw scoring doesn't capture this structural efficiency.

## 2. Per-Combo Binding Validation

**Principle**: a combo is valid iff the *system* (platform + op1 + op2) satisfies both operators' requires.

```
System categories = platform.provides ∪ op1.provides ∪ op2.provides (+ T7 expansion)
Valid iff:
  op1.requires ⊆ System categories  (or op1.requires = "free")
  op2.requires ⊆ System categories  (or op2.requires = "free")
```

**T7 expansion**: if any of T2–T6 (Debuff, Buff, Dot, Shield, Healing) is present, T7 (State) is implicitly available.

**Impact**: for 春黎剑阵 (provides `[Damage]`), per-combo validation rejects 618 of 1035 pool-legal pairs (60%). These are all ghost combos where one operator's requires are unmet.

**Implementation**: `isComboValid()` in `lib/domain/binding-quality.ts`.

## 3. Binding Quality (BQ)

BQ measures how well a combo serves the platform. The platform's damage chain is the **primary consumer** — operator outputs that feed the chain are not "wasted" even if the partner doesn't consume them.

### 3.1. Effect Activation (utilization)

Each effect type has an **activation requirement**: the target categories that must exist in the system for the effect to function.

| Effect type | Needs |
|:---|:---|
| `buff_strength`, `buff_duration`, `buff_stack_increase` | `[Buff]` |
| `debuff_strength`, `debuff_stack_chance`, `debuff_stack_increase` | `[Debuff]` |
| `dot_damage_increase`, `dot_frequency_increase`, `dot_extra_per_tick` | `[Dot]` |
| `all_state_duration` | `[State]` |
| `shield_strength`, `on_shield_expire` | `[Shield]` |
| `healing_increase`, `healing_to_damage` | `[Healing]` |
| `per_self_lost_hp` | `[LostHp]` |
| `on_dispel` | `[Dot]` |
| `on_buff_debuff_shield_trigger` | `[Buff, Debuff, Shield]` (any) |
| Everything else | Unconditionally active |

**Utilization** = `active_outputs / total_outputs` across both operators.

For valid combos (after per-combo validation), utilization is typically 1.0 — the validation already filters out combos with unmet requires. Utilization drops below 1.0 only when an affix has outputs with *stricter* activation needs than its binding-level requires.

**Implementation**: `effectUtilization()` checks each output against `EFFECT_NEEDS`.

### 3.2. Platform Fit (platformFit)

The core question: **does this output feed the platform's damage chain?**

Every effect type maps to zero or more **damage chain zones** via `EFFECT_ZONE`:

| Zone | Example effect types |
|:---|:---|
| `S_coeff` | `attack_bonus` |
| `M_dmg` | `damage_increase`, `conditional_damage`, `per_hit_escalation` |
| `M_skill` | `skill_damage_increase` |
| `M_final` | `final_damage_bonus` |
| `D_res` | `guaranteed_resonance` |
| `M_synchro` | `probability_multiplier`, `probability_to_certain` |
| `D_ortho` | `dot`, `on_dispel`, `per_debuff_stack_damage` |
| `H_A` | `lifesteal`, `healing_increase` |
| `H_red` | `debuff`, `debuff_strength` |

An output that maps to a zone is **consumed by the platform** — it amplifies the platform's damage output regardless of whether the partner affix consumes its provision.

An output with **no zone mapping** only provides target categories. It's consumed if the system needs that category (another output's `EFFECT_NEEDS` requires it); otherwise it's **wasted**.

**Platform fit** = `chain_fed_outputs / active_outputs`.

This is the key insight: the platform itself is a consumer. 灵犀九重 (`guaranteed_resonance` → `D_res`) has platformFit = 1.0 because its output feeds the 灵力 attack line — it doesn't need the partner to "consume" it.

**Implementation**: `outputDisposition()` classifies each output as chain-fed, structural, or wasted.

### 3.3. Zone Coverage (zoneCoverage)

Two operators in the same zone are **additive** (diminishing returns). Two operators in different zones are **multiplicative** (full value).

```
z1 = zones covered by op1's active outputs
z2 = zones covered by op2's active outputs
shared = |z1 ∩ z2|
zoneCoverage = (|z1| + |z2| - shared) / (|z1| + |z2|)
```

| Coverage | Meaning |
|:---|:---|
| 1.0 | All zones distinct — fully multiplicative |
| 0.5 | Half the zones overlap — partial redundancy |
| 0.0 | Complete overlap — purely additive |

**Implementation**: `zoneCoverage()` computes per-operator zone sets and measures overlap.

### 3.4. Zone Breadth (zoneBreadth)

Zone coverage measures **overlap** (ratio), but not **breadth** (count). A combo covering 2 zones with no overlap gets zoneCoverage=1.0 — same as a combo covering 5 zones with no overlap. But the 5-zone combo is structurally superior: it touches more multiplicative dimensions of the damage model.

```
zoneBreadth = min(distinctZones, 5) / 5
```

Capped at 5 (practical maximum for a 2-operator combo; the system has 17 total zone types).

| Breadth | Meaning |
|:---|:---|
| 1.0 | 5+ distinct zones — maximum multiplicative coverage |
| 0.6 | 3 zones — good spread |
| 0.2 | 1 zone — narrow contribution |

Empirical validation: among BQ=1.0 combos (old formula), average score increases monotonically with zone count (2 zones: avg 992, 3 zones: avg 1795, 4 zones: avg 1999).

**Implementation**: uses `zoneCoverage().distinct`, already computed.

### 3.5. Combined Formula

```
BQ = utilization × (0.4 × platformFit + 0.25 × zoneCoverage + 0.2 × zoneBreadth + 0.15)
```

- **utilization** is a hard gate — dead outputs reduce everything proportionally
- **platformFit** is the main signal (weight 0.4) — outputs must serve the chain
- **zoneCoverage** rewards distinct zones over shared (weight 0.25) — multiplicative > additive
- **zoneBreadth** rewards touching more zones (weight 0.2) — more dimensions = more value
- The 0.15 baseline ensures combos with all outputs active but no chain contribution still get partial credit (pure category providers)

## 4. Composite Scoring

The composite score combines **factor output** (how much damage the combo produces) with **binding quality** (how efficiently it uses its features).

### 4.1. Raw Score

```
raw = D_skill_ratio × 40         // 气血 chain output
    + (D_res - 1) × 100 × 30     // 灵力 attack line
    + D_ortho × 0.1               // true damage / %maxHP
    + (M_synchro - 1) × 100 × 20 // synchrony wrapper
    + H_red × 5                   // anti-heal utility
```

Where `D_skill_ratio = combo_D_skill / baseline_D_skill`.

**Zone weights** reflect strategic scarcity from PvP analysis:
- D_res, M_synchro: highest value (unique zones, few sources)
- M_skill, M_final: scarce multiplicative zones
- M_dmg: crowded, low marginal value
- D_ortho: bypasses defense
- H_red: offensive utility (anti-heal)

### 4.2. BQ-Adjusted Score

```
score = raw × (0.5 + BQ × 0.5)
```

BQ scales the raw score between 50% (BQ=0, all outputs wasted) and 100% (BQ=1, perfect utilization). This ensures that:
- A high-value combo with poor BQ is penalized but not eliminated
- A low-value combo with perfect BQ doesn't outrank genuinely powerful combos
- Among combos with similar raw scores, higher BQ wins

## 5. Clustering

K-means on **operator delta vectors** discovers natural groupings of combos.

### 5.1. Operator Delta

The operator-only contribution (platform baseline subtracted):

```
delta[zone] = buildFactorVector(platform, op1, op2)[zone]
            - buildFactorVector(platform, "", "")[zone]
```

For multiplicative zones (D_res, M_synchro), values are converted to percentage points: `(raw - 1) × 100`.

### 5.2. Standardization

Each dimension is standardized to zero mean and unit variance before clustering. This prevents high-magnitude zones (D_ortho can reach 3000+) from dominating the distance metric.

### 5.3. K Selection

Auto-detected via elbow method: run k-means for k=2..10, compute inertia, find the k where the rate of decrease drops most sharply.

### 5.4. Cluster Labeling

Each cluster is labeled by its top 3 axes (by average absolute value across members). This reveals the strategic archetype:

| Label | Interpretation |
|:---|:---|
| D_res + sigma_R + M_synchro | 灵力 destruction |
| M_skill + DR_A | Raw 气血 nuke |
| D_ortho + H_red | DoT + anti-heal pressure |
| M_synchro + M_dmg | Synchrony burst |
| S_coeff + M_dmg | ATK scaling |
| H_A + D_ortho | Lifesteal sustain |

## 6. CLI Tools

### `combo-rank.ts`

Absolute scoring of all valid combos.

```bash
bun app/combo-rank.ts --platform 春黎剑阵 [--top 30] [--slot 1]
```

Output: ranked list with score, D_skill ratio, D_res, M_synchro, D_ortho, H_red.

### `combo-cluster.ts`

Clustering + binding quality analysis.

```bash
bun app/combo-cluster.ts --platform 春黎剑阵 [--k 8] [--top 5]
```

Output: clusters with per-combo BQ breakdown (platformFit, zoneCoverage, chainFed/total, distinctZones).

### `embed-radar.ts`

Radar chart visualization (Chart.js HTML).

```bash
bun app/embed-radar.ts --platform 春黎剑阵 [--top 10] [--threshold 0.5]
```

Output: `tmp/<platform>-radar.html` with radar chart + raw values table.

### `embed-search.ts`

Cosine similarity search against a known-good reference combo.

```bash
bun app/embed-search.ts --platform 春黎剑阵 [--ref op1,op2] [--top 20]
bun app/embed-search.ts --list
```

Output: ranked by weighted cosine similarity with delta vs reference.

---

## Source Files

| File | Role |
|:---|:---|
| `lib/domain/binding-quality.ts` | `isComboValid()`, `computeBindingQuality()` |
| `lib/domain/bindings.ts` | Affix outputs, provides, requires registry |
| `lib/domain/chains.ts` | `filterByBinding()` (global pool), chain discovery |
| `lib/domain/platforms.ts` | Platform provides registry |
| `lib/model/model-data.ts` | `buildFactorVector()`, `buildBookModel()` |
| `lib/model/combinators.ts` | Factor aggregation, damage chain evaluation |
| `app/combo-rank.ts` | Absolute ranking CLI |
| `app/combo-cluster.ts` | Clustering + BQ analysis CLI |
| `app/embed-radar.ts` | Radar chart visualization CLI |
| `app/embed-search.ts` | Cosine similarity search CLI |
