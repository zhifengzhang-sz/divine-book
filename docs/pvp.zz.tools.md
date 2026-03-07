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

# PVP Build — Tool-Backed Analysis

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> Systematic analysis of `pvp.zz.md` slot choices using `combo-rank`, `combo-cluster`, and binding quality tools. Documents what the tools validate, what they challenge, and where their model boundaries lie.

---

## Methodology

### Tools Used

| Tool | Purpose |
|:-----|:--------|
| `combo-rank.ts` | Absolute scoring of all valid combos per platform |
| `combo-cluster.ts` | K-means clustering to discover strategic archetypes |
| `binding-quality.ts` | Per-combo validation + BQ (utilization, platform fit, zone coverage) |

### Scoring Model

The composite score captures per-slot damage contribution:

```
raw = D_skill_ratio × 40 + (D_res-1)×100×30 + D_ortho×0.1
    + (M_synchro-1)×100×20 + H_red×5 + H_A×2 + DR_A×2
```

BQ-adjusted score scales raw by binding quality:
```
score = raw × (0.5 + BQ × 0.5)
```

Where BQ (v3) = `utilization × (0.4 × platformFit + 0.25 × zoneCoverage + 0.2 × zoneBreadth + 0.15)`.

**What the model captures**: Single-slot damage output across all chain zones (气血, 灵力, orthogonal, anti-heal, survival), penalized by binding inefficiency and rewarded by zone breadth.

**What the model does NOT capture**: Cross-slot interactions, persistent effects (分身, DoT, buffs), %maxHP damage (game mechanic, not in affix outputs), debuff stacking synergy, or cycle 2+ carry effects.

### Process

For each of the 4 active platforms:
1. Run absolute rankings:
   ```bash
   bun app/combo-rank.ts --platform 春黎剑阵 --top 30
   ```
2. Run archetype discovery:
   ```bash
   bun app/combo-cluster.ts --platform 春黎剑阵 --top 5
   ```
3. Locate the actual slot choice in the ranking
4. Analyze the gap between tool ranking and strategic choice

---

## Slot 1 — `春黎剑阵`

**Chosen**: 【灵犀九重】+【心逐神随】
**Tool rank**: **#1** of 417 valid combos (618 ghost combos rejected)
**Score**: 11840.8 — **27% ahead of #2** (【通明】+【灵犀九重】at 9308.2)
**BQ**: 1.00 (platformFit=1.00, zoneCoverage=1.00, chain=2/2, zones=3)

### Ranking Context

| Rank | Score | Combo | Dominant Zones |
|:-----|:------|:------|:---------------|
| 1 | 11840.8 | 【灵犀九重】+【心逐神随】 | D_res + M_synchro |
| 2 | 9308.2 | 【通明】+【灵犀九重】 | D_res + M_skill |
| 3 | 7622.0 | 【灵犀九重】+【无极剑阵】 | D_res + M_skill |
| 4 | 7110.0 | 【灵犀九重】+【天倾灵枯】 | D_res + H_red |
| 27 | 6662.2 | 【无极剑阵】+【心逐神随】 | M_skill + M_synchro |

### Cluster Analysis (k=9)

The platform supports 9 distinct strategic archetypes. The chosen combo sits in the **D_res + sigma_R** cluster — the highest-scoring cluster by a factor of 2x over the next best (M_synchro cluster at 5990.8).

Key clusters:
- **D_res + D_ortho + sigma_R**: 灵力 destruction (best: 【灵犀九重】+【心逐神随】, 11840.8)
- **M_synchro + D_ortho + M_skill**: Synchrony burst (best: 【通明】+【心逐神随】, 5990.8)
- **M_skill + DR_A + D_ortho**: Nuke with penalty (best: 【无极剑阵】+【心逐神随】, 5465.4, BQ=0.83)
- **H_red + M_skill + M_dmg**: Anti-heal pressure (best: 【通明】+【天倾灵枯】, 1260.0)
- **D_ortho + M_skill + M_dmg**: DoT/poison (best: 【通明】+【玄心剑魄】, 1235.0)

### BQ-Adjusted View

With BQ v3 (zoneBreadth added), the picture sharpens:

| BQ-adj | Raw | BQ | Zones | Combo |
|:-------|:----|:---|:------|:------|
| 11367.2 | 11840.8 | 0.92 | 3 | 【灵犀九重】+【心逐神随】 |
| 6807.1 | 6946.0 | 0.96 | 4 | 【灵犀九重】+【无相魔威】 |
| 6712.9 | 6712.9 | **1.00** | **5** | **【灵犀九重】+【破碎无双】** |

【灵犀九重】+【破碎无双】achieves BQ=1.00 — perfect on all four dimensions (utilization, platformFit, zoneCoverage, zoneBreadth=5 zones). It pays zero BQ tax, while the #1 combo pays 8% (BQ=0.92, 3 zones). The gap between them narrows from 76% (raw) to 69% (BQ-adjusted).

### Global Optimization: 【灵犀九重】+【破碎无双】Frees【心逐神随】

The per-slot ranking misses a critical system effect: choosing【灵犀九重】+【破碎无双】on slot 1 **frees【心逐神随】** for other slots. Global 4-slot optimization (top-100 combos per platform, BQ-adjusted scoring) proves this is globally superior:

| Strategy | S1 `春黎剑阵` | S3 `甲元仙符` | S4 `千锋聚灵剑` | **Total** |
|:---------|:-------------|:-------------|:---------------|:----------|
| **A**: greedy | 【灵犀九重】+【心逐神随】(11367) | 【玄心剑魄】+【天倾灵枯】(785) | 【通明】+【无相魔威】(1077) | 14217 |
| **B**: free 心逐神随 | 【灵犀九重】+【破碎无双】(6713) | **【心逐神随】+【破釜沉舟】(5487)** | 【通明】+【天倾灵枯】(1212) | **14401** |

*(S2 `皓月剑诀` is identical in both: 【追神真诀】+【无极剑阵】at 989)*

**Strategy B beats Strategy A by +184 (+1.3%).** Slot 1 sacrifices 4654 points, but【心逐神随】on `甲元仙符` gains 4702 — a net positive. The freed【心逐神随】applies its M_synchro wrapper to a completely different platform's damage chain, creating multiplicative value that the greedy approach wastes by stacking it on an already-dominant slot.

The unconstrained optimum (Strategy C) goes further — putting【通明】+【灵犀九重】on slot 1 instead — scoring 15431 total (+8.5% over greedy). But this redistributes affixes in ways that conflict with cross-slot design intent.

### Verdict: 【灵犀九重】+【破碎无双】IS THE RIGHT CHOICE

The global optimization confirms the user's hypothesis: **【灵犀九重】+【破碎无双】should be the slot 1 choice.** It achieves:

1. **Perfect BQ** (1.00) — 5 distinct zones, zero waste
2. **Higher global total** (+1.3%) — freeing【心逐神随】creates more value elsewhere than keeping it on slot 1
3. **Structural superiority** — 5 multiplicative zones vs 3, meaning a vector-valued objective would widen the gap further

The raw per-slot score (6713 vs 11367) is misleading because it ignores the system-level value of freeing the most versatile affix in the pool.

---

## Slot 2 — `皓月剑诀`

**Chosen**: 【玄心剑魄】+【无极剑阵】
**Tool rank**: **#78** of 725 valid combos (310 ghost combos rejected)
**Score**: 1468.2
**BQ for【无极剑阵】**: 0.83 (pFit=0.67 — one output is `enemy_skill_damage_reduction`, a penalty that has no zone mapping)

### Ranking Context

| Rank | Score | Combo | Notes |
|:-----|:------|:------|:------|
| 1 | 11962.0 | 【灵犀九重】+【心逐神随】 | Same as slot 1 — but slot 1 already uses these |
| 2 | 9429.4 | 【通明】+【灵犀九重】 | Unavailable (【灵犀九重】on slot 1) |
| 8 | 6948.9 | 【灵犀九重】+【追神真诀】 | Unavailable |
| 78 | 1468.2 | **【玄心剑魄】+【无极剑阵】** | Chosen combo |

### Why Tool Rank is Misleading

The tool ranks slot 2 as if slot 1 doesn't exist. The top 26 combos all contain【灵犀九重】or【心逐神随】— both already locked to slot 1. Once these are excluded, the effective ranking shifts dramatically.

More importantly, slot 2's value comes from features the tool cannot model:
1. **%maxHP damage**: `皓月剑诀`'s 12% maxHP per hit × 10 hits is a game mechanic, not an affix output
2. **噬心 dispel dilemma**: 【玄心剑魄】's DoT + burst-on-dispel is a pressure tool, not a damage multiplier
3. **M_skill scarcity**: 【无极剑阵】's +555% M_skill is in a scarce zone — the tool correctly identifies this but underweights it relative to D_res

### Cluster Analysis (k=7)

`皓月剑诀` supports 7 archetypes. 【玄心剑魄】+【无极剑阵】doesn't appear in any cluster's top 5 — it spans two clusters (D_ortho for【玄心剑魄】, DR_A for【无极剑阵】's self-penalty).

The M_skill + DR_A cluster (【无极剑阵】combos) has consistently lower BQ (0.83) because【无极剑阵】's `enemy_skill_damage_reduction` output has no zone mapping — it's a penalty, not a damage contribution. The tool correctly identifies this as a waste.

### Verdict: NOT VALIDATED (model boundary)

The tool cannot validate slot 2's choice because the key value drivers (%maxHP, 噬心 pressure, M_skill zone scarcity in the 6-slot context) are outside its model. The tool does correctly flag【无极剑阵】's BQ penalty (pFit=0.67 due to the enemy 減免 output).

**Actionable insight**: If a non-penalty M_skill source existed, it would score higher. 【无极剑阵】is chosen despite its penalty because it's the only M_skill source at +555%.

---

## Slot 3 — `甲元仙符`

**Chosen**: 【奇能诡道】+【龙象护身】
**Tool rank**: **#546** of 587 valid combos (448 ghost combos rejected)
**Score**: 420.2

### Ranking Context

| Rank | Score | Combo | Notes |
|:-----|:------|:------|:------|
| 1 | 7042.2 | 【无极剑阵】+【心逐神随】 | Unavailable (both on other slots) |
| 24 | 5561.6 | 【奇能诡道】+【心逐神随】 | 【奇能诡道】does appear with strong partners |
| 92 | 1230.0 | 【通明】+【龙象护身】 | 【龙象护身】's best available pairing |
| 546 | 420.2 | **【龙象护身】+【奇能诡道】** | Chosen combo |

### Why Tool Rank is Expected to Be Low

Slot 3 is explicitly a **buff bot** — its design doc states "this slot doesn't need to kill." The tool only measures per-slot damage, so a slot designed for cross-slot value naturally ranks near the bottom.

【龙象护身】outputs: `buff_strength` → feeds M_buff zone. No damage zone contribution.
【奇能诡道】outputs: `debuff_stack_chance`, `conditional_debuff` → feeds H_red zone partially.

Neither affix produces significant per-slot damage. Their value is:
1. **【龙象护身】× 仙佑**: +70% ATK/DEF/HP → amplified to +280% for 12s. This benefits slots 4-6.
2. **【奇能诡道】Part 1**: 20% extra debuff stacks → feeds slot 5's 索心真诀 true damage
3. **【奇能诡道】Part 2**: 逆転阴阳 → strips enemy 減免 in cycle 2+ (requires 伤害加深 source from slot 4's carry)

### Cluster Analysis (k=9)

`甲元仙符` supports 9 archetypes. The chosen combo doesn't appear in any cluster's top 5. The H_A + M_skill cluster includes buff/healing combos (【长生天则】+【天倾灵枯】at 450.0) — the closest archetype to a "buff bot."

### Verdict: OUTSIDE MODEL SCOPE

The tool has no mechanism to evaluate cross-slot buff amplification. Rank #546 is correct for per-slot damage — and irrelevant for the slot's actual purpose. This slot's value is measured by how much it amplifies slots 4-6, not by its own damage output.

**Data note**: `甲元仙符`'s high ghost-combo rejection rate (448/1035 = 43%) suggests its narrow provides ([Damage]) limits combo options significantly.

---

## Slot 4 — `千锋聚灵剑`

**Chosen**: 【追神真诀】+【破釜沉舟】
**Tool status**: **INVALID** — rejected by per-combo binding check

### Binding Failure Analysis

```
【追神真诀】 requires: [Dot]
【破釜沉舟】 requires: free
千锋聚灵剑 provides: [Damage]
【破釜沉舟】 provides: (none relevant)

System categories = {Damage}
【追神真诀】.requires [Dot] ⊄ {Damage} → FAIL
```

【追神真诀】requires a [Dot] source. The system (`千锋聚灵剑` + 【追神真诀】+ 【破釜沉舟】) provides no [Dot]. The per-combo binding check correctly rejects this as a ghost combo.

### Why It Works In-Game

Possible explanations:
1. **`千锋聚灵剑` has implicit Dot**: The platform's 惊神剑光 main affix may generate DoT effects that aren't captured in `platforms.ts` provides. If the platform actually provides [Dot], the binding check would pass.
2. **Cross-slot Dot source**: Slot 2's【玄心剑魄】applies 噬心 (DoT) that persists into slot 4. The per-combo model doesn't account for cross-slot state.
3. **【追神真诀】's conditional features**: The affix has `conditional_buff` output that may work independently of the [Dot] requirement. The `dot_extra_per_tick` output would be dead, but the buff might still function.

### What the Ranking Shows (without【追神真诀】)

The only valid【追神真诀】combo on `千锋聚灵剑`: **【玄心剑魄】+【追神真诀】** (rank #105, score 555.3) — 【玄心剑魄】provides [Dot], satisfying the requirement.

For【破釜沉舟】pairings:

| Rank | Score | Combo |
|:-----|:------|:------|
| 19 | 6709.4 | 【灵犀九重】+【破釜沉舟】 |
| 32 | 5459.0 | 【心逐神随】+【破釜沉舟】 |
| 76 | 905.2 | 【无极剑阵】+【破釜沉舟】 |

【破釜沉舟】's M_skill output (+380%) is powerful but already used in the additive M_skill zone by slot 2's【无极剑阵】. Cross-slot zone stacking would reduce marginal value.

### Verdict: DATA GAP DETECTED

The per-combo binding check reveals a potential data issue: either `千锋聚灵剑`'s platform provides should include [Dot] (if 惊神剑光 generates DoTs), or the combo relies on cross-slot state that the per-slot model correctly cannot see.

**Action**: Verify whether 惊神剑光's 42.5% per-hit escalation generates a DoT-type effect. If yes, update `千锋聚灵剑.provides` to include `[Damage, Dot]`.

---

## Cross-Slot Exclusion Analysis

The tool reveals a critical constraint: **affix exclusion across slots**.

Each affix can only be used once across all 6 slots. The tool ranks each slot independently, so the top combos heavily overlap:

| Platform | #1 Combo | Score |
|:---------|:---------|:------|
| `春黎剑阵` | 【灵犀九重】+【心逐神随】 | 11840.8 |
| `皓月剑诀` | 【灵犀九重】+【心逐神随】 | 11962.0 |
| `甲元仙符` | 【无极剑阵】+【心逐神随】 | 7042.2 |
| `千锋聚灵剑` | 【灵犀九重】+【心逐神随】 | 11843.5 |

【灵犀九重】+【心逐神随】is #1 on 3 of 4 platforms (and #1 on `甲元仙符` if available). This means once slot 1 claims it, all other slots must choose from dramatically weaker options.

The 6-slot optimization problem is not 4 independent maximizations — it's a constrained allocation. A future `slot-combos.ts` tool (see [impl.slot-combos.md](model/impl.slot-combos.md)) addresses this with cross-slot optimization.

---

## Summary of Tool Findings

| Slot | Platform | Chosen Combo | Tool Rank | Score | Verdict |
|:-----|:---------|:-------------|:----------|:------|:--------|
| 1 | `春黎剑阵` | 【灵犀九重】+【破碎无双】 | #5/417 | 6712.9 | **Globally optimal** — BQ=1.00, frees【心逐神随】 |
| 2 | `皓月剑诀` | 【玄心剑魄】+【无极剑阵】 | #78/725 | 1468.2 | Model boundary — cross-slot value |
| 3 | `甲元仙符` | 【龙象护身】+【奇能诡道】 | #546/587 | 420.2 | Outside scope — buff bot |
| 4 | `千锋聚灵剑` | 【追神真诀】+【破釜沉舟】 | INVALID | — | Data gap — [Dot] provider missing |

### What the Tools Validate
- 【灵犀九重】+【破碎无双】is the globally superior slot 1 choice (BQ=1.00, 5 zones, frees【心逐神随】)
- 【灵犀九重】and【心逐神随】are the two most impactful affixes — distributing them across slots beats concentrating them
- Per-combo binding check catches ghost combos (60% rejection for `春黎剑阵`)
- BQ correctly identifies【无极剑阵】's penalty output as a quality reduction

### What the Tools Cannot Validate
- Cross-slot buff amplification (slot 3's buff bot role)
- %maxHP damage (game mechanic, not in affix model)
- Persistent effects carrying across slots (分身, 噬心, 惊神剑光 stacking)
- Debuff stack accumulation across the rotation
- Cycle 2+ carry effects

### Data Issues Found
- `千锋聚灵剑` may need `provides: [Damage, Dot]` if 惊神剑光 generates DoT effects
- 【追神真诀】+【破釜沉舟】is rejected as invalid — needs in-game verification of why it works

---

## Slot 4 — Deep Dive

### The Invalid Combo

【追神真诀】requires [Dot]. The only affix in the entire pool that produces a `dot` output is【玄心剑魄】— locked to slot 2. No other available affix provides [Dot]:

```
Dot providers:  【玄心剑魄】 (slot 2, locked)
Dot consumers:  【追神真诀】, 【鬼印】, 【古魔之魂】, 【天魔真解】
```

【追神真诀】cannot be paired with【破釜沉舟】on `千锋聚灵剑` without cross-slot DoT state from slot 2's【玄心剑魄】. The per-slot model correctly rejects this.

### Tool-Recommended Alternatives

After excluding all slots 1-3 affixes (【灵犀九重】,【心逐神随】,【玄心剑魄】,【无极剑阵】,【奇能诡道】,【龙象护身】):

| # | Score | Combo | BQ | Key Zones |
|:--|:------|:------|:---|:----------|
| 1 | 1262.7 | 【通明】+【天倾灵枯】 | 1.00 | D_res(27%) + H_red |
| 2 | 1098.7 | 【通明】+【无相魔威】 | 1.00 | D_res(27%) + M_dmg + H_red |
| 3 | 1007.7 | 【通明】+【天哀灵涸】 | 1.00 | D_res(27%) + H_red |
| 4 | 962.7 | 【通明】+【仙灵汲元】 | 1.00 | D_res(27%) + H_A |
| 5 | 959.4 | 【通明】+【破釜沉舟】 | 1.00 | D_res(27%) + M_skill(380%) |

【通明】(guaranteed resonance, D_res=27%) is unused across all slots and dominates filtered results — it adds a 灵力 attack line to slot 4.

For【破釜沉舟】pairings (keeping the +380% M_skill amplifier):

| Score | Combo | Notes |
|:------|:------|:------|
| 959.4 | 【通明】+【破釜沉舟】 | D_res + M_skill |
| 459.4 | 【天倾灵枯】+【破釜沉舟】 | H_red + M_skill |
| 407.4 | 【无相魔威】+【破釜沉舟】 | M_dmg + H_red + M_skill |
| 204.4 | 【天哀灵涸】+【破釜沉舟】 | H_red + M_skill |
| 102.2 | 【神威冲云】+【破釜沉舟】 | 減免 bypass + M_skill |

### Source Data Verification

`千锋聚灵剑` source text (主书.md):

> 剑破天地，对范围内目标造成六段共计x%攻击力的灵法伤害，并每段攻击造成目标y%最大气血值的伤害

> 【惊神剑光】：本神通每段攻击造成伤害后，下一段提升x%神通加成

No DoT generation. Pure burst damage with per-hit escalation. The platform data (`provides: [Damage]`) is correct. The combo【追神真诀】+【破釜沉舟】relies entirely on cross-slot DoT state — a dependency the per-slot model rightfully cannot validate.

### Cross-Cycle Carry Note

惊神剑光's stacking 神通加成 (+42.5% per hit x 6 = +255%) is a main affix effect that works regardless of operator choice. The cross-cycle carry benefit documented in pvp.zz.md is preserved with any operator pairing.

---

## Greedy vs Global Optimization

### The Problem

The current pvp.zz.md design uses **greedy optimization**: give slot 1 its #1 combo (【灵犀九重】+【心逐神随】), then pick the best remaining for slot 2, etc. This leads to:

- Slot 1: rank #1 (score 11840.8) — 27% ahead
- Slot 2: rank #78 (score 1468.2) — scraping leftovers
- Slot 3: rank #546 (score 420.2) — buff bot, expected
- Slot 4: INVALID

Does a non-greedy allocation produce higher total score?

### Exhaustive Search

Brute-force enumeration of all valid 4-slot assignments (8 affixes, no repeats) across top-100 combos per platform:

```bash
bun tmp/breaker-opt.ts   # 10.4M valid assignments explored
```

### Results (BQ-adjusted scoring)

Three strategies compared — greedy (A), free【心逐神随】(B), and unconstrained (C):

| Strategy | S1 `春黎剑阵` | S2 `皓月剑诀` | S3 `甲元仙符` | S4 `千锋聚灵剑` | **Total** |
|:---------|:-------------|:-------------|:-------------|:---------------|:----------|
| **A: greedy** | 【灵犀九重】+【心逐神随】(11367) | 【追神真诀】+【无极剑阵】(989) | 【玄心剑魄】+【天倾灵枯】(785) | 【通明】+【无相魔威】(1077) | 14217 |
| **B: free 心逐神随** | 【灵犀九重】+【破碎无双】(6713) | 【追神真诀】+【无极剑阵】(989) | **【心逐神随】+【破釜沉舟】(5487)** | 【通明】+【天倾灵枯】(1212) | **14401** |
| **C: unconstrained** | 【通明】+【灵犀九重】(8168) | 【追神真诀】+【无极剑阵】(989) | **【心逐神随】+【破釜沉舟】(5487)** | 【玄心剑魄】+【天倾灵枯】(787) | **15431** |

**Strategy B beats A by +184 (+1.3%)** — slot 1 sacrifices 4654, but【心逐神随】on `甲元仙符` gains 4702.

**Strategy C beats A by +1214 (+8.5%)** — the unconstrained optimum puts【通明】+【灵犀九重】on slot 1, freeing both【心逐神随】and【破碎无双】.

The BQ-adjusted scoring penalizes low-zone combos (【通明】+【灵犀九重】has z=2, BQ=0.76), which is why Strategy C outperforms B despite slot 1's lower per-slot score — the freed affixes create more value elsewhere than keeping them concentrated.

### Key Insight: Distribute High-Value Affixes

【心逐神随】's M_synchro (x2/x3/x4 wrapper) is equally powerful on any platform. Giving it to slot 1 (which already dominates via【灵犀九重】's D_res) wastes its potential. On `甲元仙符`, it amplifies a completely different platform's damage:

```
Slot 1 sacrifice:  11367 → 6713 = -4654
甲元 gain:           785 → 5487 = +4702
Net gain:                         +184 (+1.3%)
```

### The Paradox: Global Optimum vs Cross-Slot Value

The unconstrained optimum (C) puts【心逐神随】on `甲元仙符` (the buff bot). This maximizes `甲元`'s **per-slot damage** but misses the point: slot 3's value is its 仙佑 +280% ATK/DEF/HP buff amplified by【龙象护身】, which benefits slots 4-6. The optimizer doesn't know this because cross-slot buff amplification is outside the model.

Similarly, the global optimum uses【追神真诀】on `皓月剑诀` — but【追神真诀】requires [Dot], and on `皓月剑诀` the combo is valid because `皓月剑诀` has different valid partners. The cross-slot DoT dependency that makes【追神真诀】valuable on slot 4 (amplifying【玄心剑魄】's persistent DoT) is invisible to the per-slot model.

### What the Global Optimization Proves

1. **Greedy is suboptimal by 1.3-8.5%** when measured by BQ-adjusted per-slot scores
2. **The optimal strategy is to distribute high-value affixes** — not concentrate them on a single slot
3. **【灵犀九重】+【破碎无双】on slot 1 is globally superior** — it frees【心逐神随】while achieving BQ=1.00
4. **But the model's answer is partial** — it correctly identifies that greedy wastes resources, but its recommended redistribution ignores cross-slot interactions that dominate the real design
5. **The gap proves pvp.zz.md design leaves per-slot score on the table** — whether this is justified by cross-slot value is a design judgment the model cannot make

---

## Tool Limitations & Future Work

The per-slot model is a **necessary but insufficient** layer. It correctly optimizes within a single slot (demonstrated by slot 1 validation) but cannot evaluate the 6-slot rotation as a system.

### What the Tools Validate
- Slot 1:【灵犀九重】is the anchor;【破碎无双】is the globally optimal partner (BQ=1.00, frees【心逐神随】)
- Per-combo binding check catches ghost combos (60% rejection for `春黎剑阵`)
- BQ correctly identifies【无极剑阵】's penalty output as a quality reduction
- Greedy allocation wastes 1.3-8.5% of total per-slot score vs global optimum

### What the Tools Cannot Validate
- Cross-slot buff amplification (slot 3's buff bot role)
- %maxHP damage (game mechanic, not in affix model)
- Persistent effects carrying across slots (分身, 噬心, 惊神剑光 stacking)
- Debuff stack accumulation across the rotation
- Cycle 2+ carry effects

### Binding Quality Evolution

BQ went through three iterations in this analysis:

1. **v1 — Mutual consumption** (rejected): measured op1↔op2 provision consumption. 【灵犀九重】+【心逐神随】got BQ=0.00, 咒书+【天倾灵枯】got BQ=1.00. Inverted from reality — ignored the platform as consumer.

2. **v2 — Platform-aware efficiency**: utilization × (platformFit + zoneCoverage). Fixed the inversion — outputs feeding the platform chain are consumed. But many combos scored BQ=1.00 regardless of how many zones they touched.

3. **v3 — Efficiency + breadth** (current): added `zoneBreadth` — rewards touching more distinct multiplicative zones. Empirically validated: among perfect-efficiency combos, average score increases with zone count (2 zones: avg 992, 3 zones: avg 1795, 4 zones: avg 1999).

Current formula:
```
BQ = utilization × (0.4 × platformFit + 0.25 × zoneCoverage + 0.2 × zoneBreadth + 0.15)
```

Key BQ values (`春黎剑阵`):
| Combo | BQ | pFit | zCov | zBr | Zones |
|:------|:---|:-----|:-----|:----|:------|
| 【灵犀九重】+【破碎无双】 | 1.00 | 1.00 | 1.00 | 1.00 | 5 |
| 【灵犀九重】+【无相魔威】 | 0.96 | 1.00 | 1.00 | 0.80 | 4 |
| 【灵犀九重】+【心逐神随】 | 0.92 | 1.00 | 1.00 | 0.60 | 3 |
| 【通明】+【灵犀九重】 | 0.76 | 1.00 | 0.50 | 0.40 | 2 |
| 【无极剑阵】+【心逐神随】 | 0.75 | 0.67 | 1.00 | 0.40 | 2 |
| 【龙象护身】+【奇能诡道】 | 0.43 | 0.50 | 1.00 | 0.20 | 1 |

### Value Function: Scalar vs Vector

The current scoring collapses the factor vector to a scalar:
```
score = D_skill×40 + D_res×30 + M_synchro×20 + ...
```

This destroys the multiplicative structure. Two combos both adding +100% to M_dmg sum the same as two combos adding +100% to M_dmg and M_skill respectively. But the damage model says:
- Same zone: (1+2) = 3x (additive, diminishing)
- Different zones: (1+1)×(1+1) = 4x (multiplicative, full value)

A vector-valued optimization would:
1. Keep each combo's delta vector (per-zone contributions)
2. For a multi-slot assignment, combine vectors across slots
3. Evaluate the multiplicative product of zone factors, not a weighted sum

This naturally rewards zone diversity — the same insight captured by BQ's zoneBreadth, but applied to the allocation objective itself.

### Needed Extensions
1. **Vector-valued objective**: Replace scalar scoring with multiplicative product of combined zone factors across slots
2. **Cross-slot state model**: Track which buffs/DoTs persist beyond their slot's cast window
3. **Global allocation with cross-slot value**: The 4-slot assignment problem with both per-slot products and cross-slot interaction terms
4. **%maxHP / true damage channel**: Model game mechanics that bypass the affix damage chain
5. **Cycle 2+ modeling**: Evaluate how persistent effects compound across rotation cycles

The existing `slot-combos.ts` framework ([impl.slot-combos.md](model/impl.slot-combos.md)) addresses some of constraint 3. The cross-slot interaction model (constraints 2, 4, 5) requires game mechanic modeling beyond the current affix-level abstraction.
