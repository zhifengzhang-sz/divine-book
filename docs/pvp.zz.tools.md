---
initial date: 2026-3-7
dates of modification: [2026-3-7, 2026-3-8]
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

# PVP Build — Tool Results

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

---

## Tools

| Tool | Command | Purpose |
|:-----|:--------|:--------|
| `combo-rank.ts` | `bun app/combo-rank.ts --platform X --top N` | Rank all valid combos per platform |
| `combo-cluster.ts` | `bun app/combo-cluster.ts --platform X --top N` | K-means clustering for archetypes |
| `book-vector.ts` | `bun app/book-vector.ts --platform X --op1 Y --op2 Z` | Time-series factor vectors |
| `book-vector-chart.ts` | `bun app/book-vector-chart.ts --platform X` | HTML chart visualization |

BQ (binding quality) is computed internally by `lib/domain/binding-quality.ts`.

### Scoring

```
raw = D_skill_ratio × 40 + (D_res-1)×100×30 + D_ortho×0.1
    + (M_synchro-1)×100×20 + H_red×5 + H_A×2 + DR_A×2
score = raw × (0.5 + BQ × 0.5)
BQ = utilization × (0.4 × platformFit + 0.25 × zoneCoverage + 0.2 × zoneBreadth + 0.15)
```

Zone factors: [domain.category.md](data/domain.category.md)

### Ranking Caveat

Raw rank is inflated by a dominant anchor affix pairing with every available partner. E.g., if【灵犀九重】is the top anchor, ranks 1-5 are all【灵犀九重】+X — these are not 5 independent choices, they are 1 anchor choice with 5 partner options. Rankings below are grouped by anchor where relevant.

### Model Scope

| Captured | Not captured |
|:---------|:-------------|
| Per-slot damage across all chain zones | Cross-slot buff/DoT propagation |
| Binding validity (ghost combo rejection) | %maxHP damage (game mechanic) |
| BQ: utilization, platform fit, zone breadth | Debuff stack accumulation |
| Time-series: summon, temporal buffs, modifiers | Cycle 2+ carry effects |

---

## Build Sets

Slots 1-3 are fixed across all scenarios. Slot 4 varies. Slots 5-6 are locked in-game (not yet usable) but rankable by tools.

### Scenario A — vs stronger opponent (defensive)

| Slot | Platform | Combo | Score | BQ |
|:-----|:---------|:------|:------|:---|
| 1 | `春黎剑阵` | 【灵犀九重】+【心逐神随】 | 11840.8 | 0.92 |
| 2 | `皓月剑诀` | 【玄心剑魄】+【无极剑阵】 | 1468.2 | 0.83 |
| 3 | `甲元仙符` | 【龙象护身】+【奇能诡道】 | 420.2 | 0.43 |
| 4 | `千锋聚灵剑` | **【通明】+【天倾灵枯】** | **1262.7** | **1.00** |
| 5 | `玄煞灵影诀` | 【索心真诀】+【无相魔威】 | 209.0 | — |
| 6 | `念剑诀` | 【神威冲云】+【灵威】 | 109.6 | — |

No self-damage penalty on slot 4. Prioritizes surviving to slot 5. H_red pressures enemy healing.

### Scenario B — vs equal/weaker opponent (aggressive)

| Slot | Platform | Combo | Score | BQ |
|:-----|:---------|:------|:------|:---|
| 1 | `春黎剑阵` | 【灵犀九重】+【心逐神随】 | 11840.8 | 0.92 |
| 2 | `皓月剑诀` | 【玄心剑魄】+【无极剑阵】 | 1468.2 | 0.83 |
| 3 | `甲元仙符` | 【龙象护身】+【奇能诡道】 | 420.2 | 0.43 |
| 4 | `千锋聚灵剑` | **【通明】+【破釜沉舟】** | **959.4** | **1.00** |
| 5 | `玄煞灵影诀` | 【索心真诀】+【无相魔威】 | 209.0 | — |
| 6 | `念剑诀` | 【神威冲云】+【灵威】 | 109.6 | — |

+380% M_skill on slot 4. +50% self-damage-taken feeds slot 5's lost-HP scaling (【怒血战意】+2%/1%, 【索心真诀】+50%).

---

## Construction

The tool outputs target affix combos. To build the divine book (灵書), map each affix to the skill book that carries it.

### Divine Book Structure

Each 灵書 = 3 skill books:

| Position | Provides | Determined by |
|:---------|:---------|:--------------|
| Main (主位) | Primary affix (fixed) | Always obtained |
| Aux-1 (辅助位) | One random affix from pool | Roll required |
| Aux-2 (辅助位) | One random affix from pool | Roll required |

Each aux book's affix pool, by rarity (low → high chance):

| Type | Pool | Rarity |
|:-----|:-----|:-------|
| Exclusive (专属) | One per skill book | Rare |
| School (修为) | Shared across school (Sword/Spell/Demon/Body) | Medium |
| Universal (通用) | All books | Common |

### Affix → Book Mapping

| Affix | Type | Source Book | School |
|:------|:-----|:-----------|:-------|
| 【心逐神随】 | Exclusive | `解体化形` | Demon |
| 【玄心剑魄】 | Exclusive | `春黎剑阵` | Sword |
| 【无极剑阵】 | Exclusive | `无极御剑诀` | Sword |
| 【龙象护身】 | Exclusive | `浩然星灵诀` | Spell |
| 【奇能诡道】 | Exclusive | `周天星元` | Spell |
| 【天倾灵枯】 | Exclusive | `甲元仙符` | Spell |
| 【破釜沉舟】 | Exclusive | `十方真魄` | Body |
| 【索心真诀】 | Exclusive | `惊蛰化龙` | Body |
| 【无相魔威】 | Exclusive | `无相魔劫咒` | Demon |
| 【神威冲云】 | Exclusive | `通天剑诀` | Sword |
| 【灵犀九重】 | School | Sword school book | Sword |
| 【通明】 | Universal | any book | — |
| 【灵威】 | Universal | any book | — |

Sword school books: `春黎剑阵`, `皓月剑诀`, `千锋聚灵剑`, `念剑诀`, `通天剑诀`, `新-青元剑诀`, `无极御剑诀`

Higher book progression (阶数, 融合重数, 悟境) = better odds for rare affixes. Use the highest-level book available for each aux slot.

### Conflict Rules

| Rule | Condition | Effect |
|:-----|:---------|:-------|
| Core conflict (核心冲突) | Same book as **main** in two slots | Later slot's skill disabled entirely |
| Affix conflict (副词缀冲突) | Same book as **aux** in two slots | Later slot's affix disabled |
| Cross-type reuse | Book as main in one slot, aux in another | **No conflict** (legal) |

Constraint: each book appears as aux **at most once** across the entire 6-slot set.

### Scenario A — Construction (defensive)

| Slot | Main (主位) | Aux-1 → Target | Aux-2 → Target |
|:-----|:-----------|:---------------|:---------------|
| 1 | `春黎剑阵` | `解体化形` → 【心逐神随】(exclusive) | `千锋聚灵剑` → 【灵犀九重】(school) |
| 2 | `皓月剑诀` | `春黎剑阵` → 【玄心剑魄】(exclusive) | `无极御剑诀` → 【无极剑阵】(exclusive) |
| 3 | `甲元仙符` | `周天星元` → 【奇能诡道】(exclusive) | `浩然星灵诀` → 【龙象护身】(exclusive) |
| 4 | `千锋聚灵剑` | `甲元仙符` → 【天倾灵枯】(exclusive) | `玄煞灵影诀` → 【通明】(universal) |
| 5 | `玄煞灵影诀` | `惊蛰化龙` → 【索心真诀】(exclusive) | `无相魔劫咒` → 【无相魔威】(exclusive) |
| 6 | `念剑诀` | `通天剑诀` → 【神威冲云】(exclusive) | `玉书天戈符` → 【灵威】(universal) |

### Scenario B — Construction (aggressive)

Slots 1-3, 5-6 identical to Scenario A. Slot 4 differs:

| Slot | Main (主位) | Aux-1 → Target | Aux-2 → Target |
|:-----|:-----------|:---------------|:---------------|
| 4 | `千锋聚灵剑` | `十方真魄` → 【破釜沉舟】(exclusive) | `玄煞灵影诀` → 【通明】(universal) |

### Verification

**Cross-type reuse** (main in one slot, aux in another — no conflict):

| Book | Main | Aux | Scenario |
|:-----|:-----|:----|:---------|
| `春黎剑阵` | S1 | S2 | Both |
| `甲元仙符` | S3 | S4 (A only) | A |
| `千锋聚灵剑` | S4 | S1 | Both |
| `玄煞灵影诀` | S5 | S4 | Both |

**Aux uniqueness check** — each book appears as aux at most once:

| Aux book | Scenario A | Scenario B |
|:---------|:-----------|:-----------|
| `解体化形` | S1 | S1 |
| `千锋聚灵剑` | S1 | S1 |
| `春黎剑阵` | S2 | S2 |
| `无极御剑诀` | S2 | S2 |
| `周天星元` | S3 | S3 |
| `浩然星灵诀` | S3 | S3 |
| `甲元仙符` | S4 | — |
| `十方真魄` | — | S4 |
| `玄煞灵影诀` | S4 | S4 |
| `惊蛰化龙` | S5 | S5 |
| `无相魔劫咒` | S5 | S5 |
| `通天剑诀` | S6 | S6 |
| `玉书天戈符` | S6 | S6 |

Scenario A: 12 aux books, 12 unique. Scenario B: 12 aux books, 12 unique (swaps `甲元仙符` → `十方真魄` on S4). 6 main books all distinct. S6 construction is shared — only S4 changes between scenarios.

### Construction Cost

Slots with two exclusive targets are expensive — both aux rolls must hit rare affixes:

| Slot | Exclusive rolls | Cost |
|:-----|:----------------|:-----|
| 1 | 1 (心逐神随) | Medium — 灵犀九重 is school (easier) |
| 2 | 2 (玄心剑魄 + 无极剑阵) | **High** — both aux are exclusive |
| 3 | 2 (奇能诡道 + 龙象护身) | **High** — both aux are exclusive |
| 4 | 1 (天倾灵枯 or 破釜沉舟) | Low — 通明 is universal (common) |
| 5 | 2 (索心真诀 + 无相魔威) | **High** — both aux are exclusive |
| 6 | 1 (神威冲云) | Low — 灵威 is universal |

---

## Slot 1 — `春黎剑阵`

**Combo**: 【灵犀九重】+【心逐神随】 — score 11840.8 (417 valid combos, 618 ghost rejected)

### Best Combo per Anchor

| Anchor | Best Partner | Score | BQ | Zones |
|:-------|:------------|:------|:---|:------|
| **【灵犀九重】** | **【心逐神随】** | **11840.8** | **0.92** | **3** |
| 【灵犀九重】 | 【无相魔威】 | 6946.0 | 0.96 | 4 |
| 【灵犀九重】 | 【破碎无双】 | 6712.9 | 1.00 | 5 |
| 【无极剑阵】 | 【心逐神随】 | 6662.2 | 0.75 | 2 |
| 【通明】 | 【心逐神随】 | 5990.8 | — | — |

【灵犀九重】dominates as anchor — top 4 of 5 rows.【心逐神随】is the best partner by 27%.

### Clusters (k=9)

| Cluster | Best Combo | Score |
|:--------|:-----------|:------|
| D_res + D_ortho + sigma_R | 【灵犀九重】+【心逐神随】 | 11840.8 |
| M_synchro + D_ortho + M_skill | 【通明】+【心逐神随】 | 5990.8 |
| M_skill + DR_A + D_ortho | 【无极剑阵】+【心逐神随】 | 5465.4 |
| H_red + M_skill + M_dmg | 【通明】+【天倾灵枯】 | 1260.0 |
| D_ortho + M_skill + M_dmg | 【通明】+【玄心剑魄】 | 1235.0 |

### Time-Series (`book-vector.ts`)

Summon envelope is platform-level (identical for any operator pair):

| Factor | Total | Efficiency | Peak | Permanent | Temporal |
|:-------|:------|:-----------|:-----|:----------|:---------|
| D_base | 935026 | 58439 | 58439 | 22305 | +36134 |
| D_res | 51.52 | 3.22 | 3.22 | 3.22 | — |
| D_ortho | 57200 | 3575 | 3850 | 3300 | +275 |

分身 (×1.62 for 16s) amplifies D_base from 22305 → 58439. Covers 4 slot windows at T_gap=4s. Invisible to static `compositeScore()`.

---

## Slot 2 — `皓月剑诀`

**Combo**: 【玄心剑魄】+【无极剑阵】 — score 1468.2, BQ 0.83 (725 valid combos)

### Best Combo per Anchor (excluding slot 1 affixes)

All【灵犀九重】and【心逐神随】combos locked to slot 1.

| Anchor | Best Partner | Score | BQ | Available? |
|:-------|:------------|:------|:---|:-----------|
| **【玄心剑魄】** | **【无极剑阵】** | **1468.2** | **0.83** | **Yes** |
| 【通明】 | 【天倾灵枯】 | 1260.0 | — | Yes |
| 【通明】 | 【玄心剑魄】 | 1235.0 | — | Yes |

### Model gaps for this slot

- `皓月剑诀` 12% maxHP × 10 hits — game mechanic, not affix output
- 【玄心剑魄】噬心 dispel dilemma — pressure, not scored as damage
- 【无极剑阵】+555% M_skill — scarce zone, underweighted vs D_res
- BQ=0.83 because【无极剑阵】outputs `enemy_skill_damage_reduction` (penalty, no zone mapping)

**【无极剑阵】is the only M_skill source at +555%. No non-penalty alternative exists.**

---

## Slot 3 — `甲元仙符`

**Combo**: 【龙象护身】+【奇能诡道】 — score 420.2, BQ 0.43 (587 valid combos)

Low rank expected: this is a buff bot. Neither affix produces per-slot damage. Value is cross-slot:
- 【龙象护身】amplifies 仙佑 +70% ATK/DEF/HP → **+280%** for 12s (benefits slots 4-6)
- 【奇能诡道】+20% debuff stacks (feeds slot 5's true damage) + 逆転阴阳 in cycle 2+

### Time-Series (`book-vector.ts`)

```
bun app/book-vector.ts --platform 甲元仙符 --op1 龙象护身 --op2 奇能诡道
```

| Factor | Total | Efficiency | Peak | Permanent | Temporal |
|:-------|:------|:-----------|:-----|:----------|:---------|
| S_coeff | 1713.60 | 85.68 | 142.80 | 0 | +85.68 |
| H_A | 3800 | 190 | 190 | 190 | — |
| H_red | 1640 | 82 | 82 | 51 | +31 |

龙象护身 buff_strength (+104%) amplifies S_coeff from 70 → **142.80** peak. Buff covers 5 slot windows.

### Alternative: 仙露护元 (duration) vs 龙象护身 (strength)

| Modifier | S_coeff total | S_coeff peak | Slot coverage |
|:---------|:-------------|:--------------|:--------------|
| 龙象护身 (strength +104%) | 1713.60 | 142.80 | 5 |
| 仙露护元 (duration +300%) | 3360.00 | 70.00 | 12 |

仙露护元 doubles total factor-seconds (3360 vs 1714) but at lower peak. Tradeoff: burst intensity vs sustained coverage.

---

## Slot 4 — `千锋聚灵剑`

### Best Available Combos (excluding slots 1-3 affixes)

| Anchor | Best Partner | Score | BQ | Key Zones |
|:-------|:------------|:------|:---|:----------|
| 【通明】 | 【天倾灵枯】 | 1262.7 | 1.00 | D_res + H_red |
| 【通明】 | 【无相魔威】 | 1098.7 | 1.00 | D_res + M_dmg + H_red |
| 【通明】 | 【破釜沉舟】 | 959.4 | 1.00 | D_res + M_skill |

【通明】(D_res=27%) is unused across all slots and dominates.

### Key Affix Data

| Affix | Effect | Value | Note |
|:------|:-------|:------|:-----|
| 【天倾灵枯】 | `heal_reduction` | H_red zone | No self-cost |
| 【破釜沉舟】 | `skill_damage_increase` | +380% M_skill | Slot 4 damage |
| 【破釜沉舟】 | `self_damage_taken_increase` | +50% | Cost on slot 4, feeds slot 5 `per_self_lost_hp` |

惊神剑光 stacking 神通加成 (+42.5%/hit × 6 = +255%) is a main affix effect — works with any operator pair. Cross-cycle carry is preserved.

### Rejected: 【追神真诀】+【破釜沉舟】 (pvp.zz.md current choice)

```
【追神真诀】 requires: [Dot]
千锋聚灵剑 provides: [Damage]
→ [Dot] ⊄ {Damage} → INVALID
```

Source text confirms no DoT:
> 【惊神剑光】：本神通每段攻击造成伤害后，下一段提升x%神通加成

pvp.zz.md assumes this combo works. Unverified.

### Verification Experiment

1. Equip `千锋聚灵剑` with【追神真诀】+【破釜沉舟】, **remove slot 2's【玄心剑魄】** (no cross-slot DoT)
2. Check `dot_extra_per_tick`: does it trigger? If yes → `千锋聚灵剑` has implicit [Dot], update `provides`
3. Check `conditional_buff` (+300% damage, +50% maxHP): does it activate without [Dot]? If yes → affix partially functional without requirement

---

## Slot 5 — `玄煞灵影诀` (locked in-game)

**Combo**: 【索心真诀】+【无相魔威】 — score 209.0 (654 valid combos)

### Best Combo per Anchor (excluding slots 1-4 affixes)

| Anchor | Best Partner | Score | Key Zones |
|:-------|:------------|:------|:----------|
| 【天哀灵涸】 | 【无相魔威】 | 359.0 | H_red 72 |
| 【金刚护体】 | 【无相魔威】 | 314.0 | H_red 41 |
| 【天哀灵涸】 | 【仙灵汲元】 | 265.0 | H_red 31 |
| **【无相魔威】** | **【索心真诀】** | **209.0** | **D_ortho 50, H_red 41** |

【索心真诀】requires [Debuff] — only valid with partners that provide it. 【无相魔威】(`requires: "free"`, `provides: [Debuff]`) is the best available [Debuff] provider after slots 1-4. Also contributes H_red (anti-heal).

Scores are low: this slot's value is cross-slot (【怒意滔天】permanent self-drain → lost HP scaling, 【索心真诀】true damage per debuff stack). The per-slot scorer sees almost nothing.

### Rejected: 【索心真诀】+【摧云折月】(previous choice)

Neither 【摧云折月】nor `玄煞灵影诀` provides [Debuff]. Ghost combo — 【索心真诀】cannot activate.

### Design

- 【怒意滔天】permanent self-drain (4%HP/sec) → 11% lost HP/sec to enemy
- 【索心真诀】converts debuff stacks to 2.1% maxHP true damage/stack (max 10 stacks = 21%)
- 【无相魔威】debuff 【魔劫】: -40.8% healing, +105%/+205% damage for 8s — provides [Debuff] for 【索心真诀】AND H_red
- 【怒血战意】(exclusive, platform-level) +2% damage per 1% HP lost

### Time-Series (`book-vector.ts`)

```
bun app/book-vector.ts --platform 玄煞灵影诀 --op1 索心真诀 --op2 无相魔威
```

| Factor | Total | Efficiency | Peak | Permanent | Temporal |
|:-------|:------|:-----------|:-----|:----------|:---------|
| M_dmg | 1456 | 182 | 182 | 182 | — |
| D_ortho | 400 | 50 | 50 | 50 | — |
| H_red | 326.4 | 40.8 | 40.8 | 0 | +40.8 |

【怒意滔天】is platform-level — its self-drain feedback loop is not captured in affix time-series.

### Platform alternatives explored

`无相魔劫咒` (provides [Debuff] natively) was evaluated as slot 5 platform — would unlock 【索心真诀】+【意坠深渊】. Rejected: 1500% ATK baseline (vs 18255%), no self-HP exploit (loses 【怒意滔天】+ 【怒血战意】), score 95 vs 209.

### Model gaps

- Debuff stack count from slots 2-4 (determines 【索心真诀】output)
- Self-HP interaction with slot 3's +280% DEF/HP
- 【怒意滔天】persistence into slot 6 and cycle 2
- Cross-slot: slot 4B's +50% self-damage-taken amplifies lost-HP scaling

---

## Slot 6 — `念剑诀` (locked in-game)

**Combo**: 【神威冲云】+【灵威】 — score 109.6, rank #304 (570 valid combos)

Low rank expected: both affixes provide value invisible to the per-slot scorer (DR bypass, cycle wrap).

### Best Combo per Anchor (excluding slots 1-5 affixes)

All slots 1-4 affixes excluded. 【索心真诀】and【无相魔威】also excluded (slot 5).

| Anchor | Best Partner | Score | Key Zones |
|:-------|:------------|:------|:----------|
| 【天哀灵涸】 | 【仙灵汲元】 | 305.0 | H_red 31 |
| 【追神真诀】 | 【天哀灵涸】 | 288.4 | D_skill ×3.14, D_ortho 77, H_red 31 |
| 【灵威】 | 【天哀灵涸】 | 242.2 | D_skill ×2.18, H_red 31 |
| **【灵威】** | **【神威冲云】** | **109.6** | **D_skill ×2.74** |

### Design

- 【神威冲云】ignores ALL enemy 減免, +36% damage — value scales with enemy DR (invisible to scorer)
- 【灵威】gives next skill +118% 伤害加深 → cycle 2 slot 1 (cross-cycle carry, invisible to scorer)
- 【雷阵剣影】persistent DoT 6.5s after skill ends
- 4s untargetable during cast

### Time-Series (`book-vector.ts`)

```
bun app/book-vector.ts --platform 念剑诀 --op1 神威冲云 --op2 灵威
```

| Factor | Total | Efficiency | Peak | Permanent | Temporal |
|:-------|:------|:-----------|:-----|:----------|:---------|
| D_base | 89220 | 22305 | 22305 | 22305 | — |
| M_dmg | 304 | 76 | 76 | 76 | — |
| M_skill | 472 | 118 | 118 | 118 | — |

All permanent. 【灵威】+118% M_skill carries into cycle 2 slot 1 — amplifying the ×10.95 crit burst under +280% ATK buff.

### Model gaps

- 【灵威】cycle wrap value (not modeled)
- 減免 bypass value (enemy-state-dependent)
- Interaction with slot 5's 【怒意滔天】(persistent DoT stacking)

---

## Cross-Slot Affix Exclusion

Each affix is used once across all 6 slots.【灵犀九重】+【心逐神随】is the #1 combo on 4/6 analyzed platforms:

| Platform | #1 Combo | Score |
|:---------|:---------|:------|
| `春黎剑阵` | 【灵犀九重】+【心逐神随】 | 11840.8 |
| `皓月剑诀` | 【灵犀九重】+【心逐神随】 | 11962.0 |
| `甲元仙符` | 【无极剑阵】+【心逐神随】 | 7042.2 |
| `千锋聚灵剑` | 【灵犀九重】+【心逐神随】 | 11843.5 |
| `玄煞灵影诀` | 【通明】+【心逐神随】 | 5850.0 |
| `念剑诀` | 【灵犀九重】+【心逐神随】 | 11840.8 |

Slot 1 claims both. All other slots draw from weaker options — this is by design, not waste. The build concentrates the two strongest affixes on the alpha-strike slot and assigns cross-slot roles (buff bot, DoT pressure, %maxHP) that the per-slot scorer cannot value.

---

## BQ Reference

### Formula

```
BQ = utilization × (0.4 × platformFit + 0.25 × zoneCoverage + 0.2 × zoneBreadth + 0.15)
```

### Key Values (`春黎剑阵`)

| Combo | BQ | pFit | zCov | zBr | Zones |
|:------|:---|:-----|:-----|:----|:------|
| 【灵犀九重】+【破碎无双】 | 1.00 | 1.00 | 1.00 | 1.00 | 5 |
| 【灵犀九重】+【无相魔威】 | 0.96 | 1.00 | 1.00 | 0.80 | 4 |
| 【灵犀九重】+【心逐神随】 | 0.92 | 1.00 | 1.00 | 0.60 | 3 |
| 【通明】+【灵犀九重】 | 0.76 | 1.00 | 0.50 | 0.40 | 2 |
| 【无极剑阵】+【心逐神随】 | 0.75 | 0.67 | 1.00 | 0.40 | 2 |
| 【龙象护身】+【奇能诡道】 | 0.43 | 0.50 | 1.00 | 0.20 | 1 |

### Evolution

1. **v1** (rejected): Measured op1↔op2 mutual consumption. Inverted results — 【灵犀九重】+【心逐神随】got BQ=0.00.
2. **v2**: Platform-aware — outputs feeding the chain are consumed. Many combos tied at BQ=1.00.
3. **v3** (current): Added zoneBreadth. Empirically validated: avg score increases with zone count (2z: 992, 3z: 1795, 4z: 1999).

---

## Known Limitations

### Scoring: Scalar vs Vector

The scoring formula collapses the factor vector to a weighted sum. This treats same-zone and cross-zone contributions equally, but the damage model is multiplicative:
- Same zone: (1+2) = 3× (additive, diminishing)
- Cross zone: (1+1)×(1+1) = 4× (multiplicative, full value)

A vector-valued objective would multiply zone factors instead of summing — naturally rewarding zone diversity without BQ as a proxy.

### Needed Extensions

1. **Slots 5-6 analysis** — run rankings when unlocked
2. **Vector-valued scoring** — multiplicative product of zone factors across slots
3. **Cross-slot state model** — buffs/DoTs persisting beyond cast window
4. **%maxHP / true damage channel** — game mechanics bypassing the affix chain
5. **Cycle 2+ modeling** — persistent effect compounding across rotation cycles
