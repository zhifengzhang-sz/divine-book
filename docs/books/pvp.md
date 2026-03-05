---
initial date: 2026-2-26
dates of modification: [2026-2-26]
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

# PvP Book Set Construction

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Constructive book set designs for PvP scenarios.** Each section targets a specific matchup condition and derives the build from scratch using the qualitative framework ([combat.qualitative.md](../model/combat.qualitative.md)). Every choice includes proof: all available candidates are listed, and the selection is justified by quantitative comparison.

---

## Table of Contents

| Section | Content |
|:--------|:--------|
| **1. Against Stronger Opponent** | |
| 1.1 Result | Summary table + key insights |
| 1.2 Scenario Analysis | |
| — 1.2.1 Asymmetry Features | What "stronger opponent" means concretely |
| — 1.2.2 Fight Duration | Planning horizon: ~1.2 cycles (~43s) |
| — 1.2.3 Strategy | Survive long enough + deal enough damage |
| — 1.2.4 Strategic Orientation | Decision tree: burst-first vs suppress-first vs amplify-first |
| — 1.2.5 Construction Objectives | 6 slots → 3 phases (damage delivery, amplify/suppress, kill/endure) |
| 1.3 Cycle Analysis and Slot Assignment | |
| — 1.3.1 The Cycle Principle | Earlier slots get more casts |
| — 1.3.2 Buff Timing with Cycle Coverage | Conventional vs cycle-optimized ordering |
| — 1.3.3 Slot Assignment | Role → slot mapping with rationale |
| 1.4 Slot-by-Slot Evaluation | |
| — Slot 1: Burst | Main Position → Aux 1 → Aux 2 |
| — Slot 2: Exploit | Main Position → Aux 1 → Aux 2 |
| — Slot 3: Amplify | Main Position → Aux 1 → Aux 2 |
| — Slot 4: Suppress | Main Position → Aux 1 → Aux 2 |
| — Slot 5: Self-HP Exploit | Main Position → Aux 1 → Aux 2 |
| — Slot 6: Endure | Main Position → Aux 1 → Aux 2 |
| 1.5 Global Assignment | Contentions, Assignment A/B, aux-level variants |
| 1.6 Verification | Cross-type reuse, conflict check, temporal map |
| 1.7 Design Insights | 8 insights from the construction process |
| 1.8 Comparison with Standard Build | Trade-offs vs ye.1 |
| 1.9 Open Questions | 9 unresolved questions |
| **2. Against Opponent with Initial Immunity** | |
| 2.1 Scenario Analysis | Immunity window, strategic orientation, 通天剑诀 option |
| 2.2 Cycle Analysis | Buff/debuff coverage, cycle 2 full-power advantage |
| 2.3 Slot-by-Slot Evaluation | |
| — Slot 1: Amplify (Setup) | Main → Aux 1 → Aux 2 |
| — Slot 2: Suppress (Setup) | Main → Aux 1 → Aux 2 |
| — Slot 3: Burst (First Damage) | Main → Aux 1 → Aux 2 |
| — Slot 4: Exploit | Main → Aux 1 → Aux 2 |
| — Slot 5: Self-HP Exploit | Main → Aux 1 → Aux 2 |
| — Slot 6: Endure | Main → Aux 1 → Aux 2 |
| 2.4 Summary | Assignment table, verification, comparison with §1 |
| 2.5 Design Insights | Immunity-specific insights |
| **3. Standard PvP Meta (Mutual Immunity)** | |
| 3.1 Scenario | Equal power, mutual immunity, known opponent build |
| 3.2 The Opponent: ye.1 Reordered | Exact aux composition, three mismatches from copying without adapting |
| 3.3 Two Layers of Advantage | |
| — 3.3.1 Strategic: Slot Ordering | ~40% of opponent's cycle 1 damage wasted |
| — 3.3.2 Technical: Aux Innovations | 【灵犀九重】(+82.5%), 【仙露護元】relocation, Self-HP exploit, anti-healing |
| — 3.3.3 Investment: 解体化形 Enlightenment | Regime barrier 悟0→悟2, chicken-and-egg, 23× amplification |
| 3.4 Per-Slot Comparison | Side-by-side under mutual immunity through cycle 2 |
| 3.5 Design Insights | Information edge, meta dynamics, verification status |
| **Appendix A: Parameters** | Game constants, observed parameters, derived relations |
| **Appendix B: Category Definitions** | $C_0$–$C_{13}$ effect category definitions |

---

## 1. Against Stronger Opponent

### 1.1 Result

| Slot | Specification | Primary Affix → Feature | Objective |
|:-----|:-------------|:----------------------|:----------|
| 1 | `春黎剑阵`（主）+ `解体化形`（专属）+ Sword school（【灵犀九重】） | Stochastic crit $E \approx$ **×10.95** (悟2境), 85% chance ≥ ×6.00, upside to ×15.88 (【心逐神随】, 【灵犀九重】, $C_3$) | Burst |
| 2 | `皓月剑诀`（主）+ `春黎剑阵`（专属）+ `无极御剑诀`（专属） | 10-hit %maxHP + DoT with dispel trap + +555% skill damage (【碎魂剑意】, 【玄心剑魄】/【噬心】, 【无极剑阵】, $C_1$) | Exploit |
| 3 | `甲元仙符`（主）+ `浩然星灵诀`（专属）+ `念剑诀`（专属） | +142.8% ATK/DEF/HP for 48s, covering Slots 4–6 and all of cycle 2 (【仙佑】, 【龙象护身】, 【仙露护元】, $C_{11}$) | Amplify |
| 4 | `大罗幻诀`（主）+ `天轮魔经`（专属）+ `皓月剑诀`（专属） | -100% DR for 8s + debuff stacking rate ×2 (【魔魂咒界】/【命損】, 【心魔惑言】, $C_{12}$) | Suppress |
| 5 | `千锋聚灵剑`（主）+ `玄煞灵影诀`（专属）+ `惊蛰化龙`（专属） | +2% damage per 1% own HP lost + true damage per debuff stack (【怒血战意】, 【紫心真诀】, $C_6$) | Self-HP exploit |
| 6 | `十方真魄`（主）+ `通天剑诀`（【心火淬锋】）+ `千锋聚灵剑`（专属） | Cleanse CC + per-hit escalation +22.5% + -31% healing, undispellable (【星猿弃天】, 【心火淬锋】, 【天哀灵涸】, $C_{11}$) | Endure |

**Key insights:**

1. **$C_6$ self-lost-HP conversion.** Against a stronger opponent, HP loss is inevitable. +2% damage per 1% own HP lost (【怒血战意】) converts this into +100% damage at 50% HP lost. Slot 5 is dedicated to this conversion, timed with -100% DR (【命損】) from Slot 4.

2. **Cycle principle.** The 6-slot sequence repeats every $6 \times T_{gap} \approx 36\text{s}$. Placing Burst in Slot 1 ensures it fires first in cycle 2 ($t = 36\text{s}$), maximizing total casts for the highest-damage skill. Amplify in Slot 3 with ×4 duration (48s) covers the entire cycle 2.

### 1.2 Scenario Analysis

**Matchup:** opponent has higher base stats, better gear, or higher enlightenment.

#### 1.2.1 Asymmetry Features

| Feature | Consequence |
|:--------|:-----------|
| Opponent deals more damage | Self HP drops faster — you are on a clock |
| Opponent has more HP | Takes longer to kill — you need more total output |
| Opponent has higher DR (50%+) | Your damage is halved or worse before penetration |
| Opponent may have dispel | Your buffs/debuffs can be removed |

The asymmetry is bidirectional: you are weaker offensively AND defensively. The opponent's advantage compounds — higher damage means you lose HP faster, which means less time to deliver your damage, which means you need higher per-slot output to compensate.

#### 1.2.2 Fight Duration

If the fight is very short (< 1 cycle, ~36s), there is little to optimize — the stat gap is too large and no book set can compensate. This construction assumes **you can survive at least 1 cycle**, targeting ~1.2 cycles (~43s) as the adequate planning horizon.

| Duration | Slots fired | Viable? |
|:---------|:-----------|:--------|
| < 18s (< 3 slots) | 1–3 | No — cannot reach the kill window. Stat gap too large |
| 18–36s (3–6 slots) | 4–6 | Marginal — all cycle 1 slots fire, no cycle 2 |
| **36–43s (1.0–1.2 cycles)** | **7–8** | **Design target — Burst re-casts, Exploit may re-cast** |
| > 43s | 8+ | Favorable — multiple cycle 2 slots fire under buff |

At ~1.2 cycles, self HP is estimated at ~50% lost (opponent deals more damage, you heal less). This HP loss level is the basis for $C_6$ scaling calculations.

#### 1.2.3 Strategy

Two problems to solve: **survive long enough** and **deal enough damage** within the survival window.

**Survival:**
- Buff DEF/HP to absorb more hits → extends fight duration toward the 1.2-cycle target
- CC cleanse → prevents stunlock death (if stunned against a stronger opponent, death is almost certain)
- Anti-healing on opponent → prevents them from negating your accumulated damage

**Damage within the window:**
- Front-load the highest-damage skills (Burst, Exploit) into early slots → they fire first in cycle 2 if you survive
- Break through opponent DR → without DR penetration, damage against a 50%+ DR opponent is halved
- Convert HP loss to damage → the asymmetry gives you faster HP loss, which is a *resource* if you have $C_6$ scaling
- Buff coverage across the full window → a self-buff active from mid-cycle 1 through cycle 2 amplifies every remaining slot

#### 1.2.4 Strategic Orientation

The strategy requires both damage output and DR penetration. The question is **what to prioritize in Slot 1** — the earliest-firing slot, and the one that gets the most cycle 2 re-casts. This is a strategic fork, not just a book selection:

| Strategy | Slot 1 role | What it front-loads |
|:---------|:-----------|:-------------------|
| **Burst-first** | `春黎剑阵` (damage) | Highest damage skill fires first and re-casts earliest in cycle 2 |
| **Suppress-first** | `大罗幻诀` (debuff) | -100% DR (【命損】) fires first; subsequent slots deal through zero DR |
| **Amplify-first** | `甲元仙符` (buff) | +142.8% ATK/DEF/HP covers all subsequent cycle 1 slots (conventional PvP) |

**Suppress-first** — 【命損】lasts 8s, covering ~1 subsequent slot ($\lfloor 8/T_{gap} \rfloor = 1$). In Slot 1, this covers Slot 2 only. The remaining Slots 3–6 fire without DR removal. In cycle 2, 【命損】re-casts at $t = 36\text{s}$, again covering only 1 slot. Total DR-removed slots: 2 across 1.2 cycles. Critically, this breaks the kill chain: if `大罗幻诀` occupies Slot 1, it is no longer available for Slot 4 → Slot 5 (Self-HP exploit) fires without DR removal, and the designed kill event (×2.0 damage through zero DR) loses half its value or more. To make suppress-first work, the kill mechanism must be completely redesigned around a Slot 1–2 alpha strike — which is unlikely to succeed against a stronger opponent in 2 slots.

**Amplify-first** — conventional PvP ordering. Buff covers cycle 1 Burst and Exploit. With ×4 duration extension: $12\text{s} \times 4 = 48\text{s}$, covering $t = 0$ to $t = 48$. Covers the kill chain (Slots 4–5) and cycle 2 Slots 1–2. However, Burst in Slot 2 re-casts at $t = 42\text{s}$ — 6s later than Slot 1 — and at our 1.2-cycle horizon ($t \approx 43\text{s}$), this second Burst fires at the very edge of the survival window, risking incomplete execution.

**Burst-first** — Burst fires in Slot 1, re-casts earliest at $t = 36\text{s}$ (well within the 43s horizon). Amplify moves to Slot 3 with ×4 duration covering $t = 12$ to $t = 60$ — covers the kill chain, the full cycle 2, and self-sustains on re-cast. `大罗幻诀` stays available for Slot 4, preserving the kill chain.

**→ Burst-first.** Preserves the kill chain (Suppress → Self-HP exploit in Slots 4–5), gives Burst the earliest cycle 2 re-cast, and achieves buff coverage across the full planning horizon.

#### 1.2.5 Construction Objectives

| Objective | Derived from | Serves |
|:----------|:------------|:-------|
| Maximize single-slot burst output | Front-load damage (burst-first) | Slots 1–2 |
| Self-buff with maximum duration | Survive + buff across 1.2-cycle window | Slot 3 |
| Break opponent DR | DR penetration for kill window | Slot 4 |
| Convert HP loss to kill-level damage | Exploit asymmetry ($C_6$) | Slot 5 |
| Survive endgame + deny healing | CC cleanse, anti-healing insurance | Slot 6 |

The 6 slots decompose into three phases:
1. **Damage delivery** (Slots 1–2): Burst + Exploit. Front-loaded to maximize cycle 2 re-casts.
2. **Amplify + Suppress** (Slots 3–4): Self-buff and DR removal. These enable the kill window.
3. **Kill + Endure** (Slots 5–6): Convert accumulated HP loss into lethal damage under zero DR, then survive.

**Assumed values:** $T_{gap} = 6\text{s}$, max enlightenment, max fusion, opponent DR 50%+, self HP ~50% lost by Slot 5, combat reaches ~1.2 cycles (~43s). See [Appendix A](#appendix-a-parameters) for parameter definitions.

### 1.3 Cycle Analysis and Slot Assignment

#### 1.3.1 The Cycle Principle

The 6-slot firing sequence repeats. One cycle lasts $6 \times T_{gap} \approx 36\text{s}$. If combat extends beyond one cycle, skills fire again in order:

| Slot | Cycle 1 ($t$) | Cycle 2 ($t$) | Total casts (if combat ends mid-cycle 2) |
|:-----|:-------------|:-------------|:----------------------------------------|
| 1 | $0\text{s}$ | $36\text{s}$ | 2 (fires first in cycle 2) |
| 2 | $6\text{s}$ | $42\text{s}$ | 2 or 1 (fires second) |
| 3 | $12\text{s}$ | $48\text{s}$ | 2 or 1 |
| 4 | $18\text{s}$ | $54\text{s}$ | 2 or 1 |
| 5 | $24\text{s}$ | $60\text{s}$ | 2 or 1 |
| 6 | $30\text{s}$ | $66\text{s}$ | 1 (fires last in cycle 2) |

**Implication:** skills in earlier slots get more total casts. If combat ends at $t \approx 50\text{s}$, Slot 1 has fired twice while Slots 5–6 fired once. The highest-damage skill should therefore occupy Slot 1 — it benefits most from the extra cast.

The conventional ordering in PvP theory is **Amplify → Burst → Exploit** — buff first, then deal damage under the buff. This maximizes cycle 1 burst/exploit output. But the cycle principle suggests reconsidering: if Burst occupies Slot 1, it fires again earliest in cycle 2, getting the most total casts for the highest-damage skill.

#### 1.3.2 Buff Timing with Cycle Coverage

The key question: if Amplify moves to Slot 3, does the buff still cover enough? With Amplify in Slot 3 ($t = 12\text{s}$), the self-buff (【仙佑】) activates at $t = 12\text{s}$ (on cast — 释放神通时, instant). With ×4 duration (【仙露护元】), the buff lasts $12 \times 4 = 48\text{s}$, covering $t = 12\text{s}$ to $t = 60\text{s}$:

| Slot activation | Time | Buff active? |
|:---------------|:-----|:------------|
| Slot 1 Burst (cycle 1) | $0\text{s}$ | No |
| Slot 2 Exploit (cycle 1) | $6\text{s}$ | No |
| Slot 3 Amplify (cycle 1) | $12\text{s}$ | Activates here |
| Slot 4 Suppress (cycle 1) | $18\text{s}$ | **Yes** |
| Slot 5 Self-HP (cycle 1) | $24\text{s}$ | **Yes** |
| Slot 6 Endure (cycle 1) | $30\text{s}$ | **Yes** |
| Slot 1 Burst (cycle 2) | $36\text{s}$ | **Yes** ← critical |
| Slot 2 Exploit (cycle 2) | $42\text{s}$ | **Yes** |
| Slot 3 Amplify (cycle 2) | $48\text{s}$ | **Yes** (re-casts, refreshes buff) |
| Slot 4+ (cycle 2) | $54\text{s}$+ | **Yes** (refreshed at $t=48$) |

**Conventional vs cycle-optimized ordering:**

| | Conventional: Amplify(1), Burst(2), Exploit(3) | Cycle-optimized: Burst(1), Exploit(2), Amplify(3) |
|:--|:-----------------------------------------------|:--------------------------------------------------|
| Buff duration | 12s (no duration extension) | 48s (×4 via 【仙露护元】) |
| Slots buffed (cycle 1) | Burst, Exploit (2 slots) | Suppress, Self-HP, Endure (3 slots) |
| Slots buffed (cycle 2) | None (12s expired) | **All** (Burst, Exploit, Amplify re-cast, ...) |
| Total buffed activations | 2 | 9+ |
| Burst fires in cycle 2 at | $t=42\text{s}$ (Slot 2) | $t=36\text{s}$ (Slot 1) ← 6s earlier |

The conventional ordering buffs 2 slots in cycle 1 then expires. The cycle-optimized ordering sacrifices cycle 1 Burst/Exploit buff for 48s coverage spanning Slots 4–6 and the entire cycle 2 — including a buffed Burst re-cast at $t = 36\text{s}$. Given our scenario assumption of ~1.2 cycles, the cycle-optimized ordering covers the full planning horizon while the conventional ordering covers only the first 12s.

#### 1.3.3 Slot Assignment

| Slot | Scenario | Rationale |
|:-----|:---------|:----------|
| 1 | Burst | Highest damage skill fires first; gets earliest cycle 2 re-cast at $t=36\text{s}$ |
| 2 | Exploit | Second highest output; 10-hit %maxHP structure; re-casts at $t=42\text{s}$ |
| 3 | Amplify | Buff (【仙佑】) with ×4 duration covers Slots 4–6 and all of cycle 2 |
| 4 | Suppress | -100% DR (【命損】, 8s) must immediately precede Slot 5 |
| 5 | Self-HP exploit | ~$4 \times T_{gap}$ into combat; significant own HP lost; $C_6$ scaling peaks; now buffed by +142.8% ATK (【仙佑】) |
| 6 | Endure | Sustain + anti-healing (general PvP insurance) |

**Sequencing constraint:** -100% DR (【命損】, 8s duration) must immediately precede the self-HP exploit slot. $T_{overlap} = 8 - T_{gap} = 2\text{s}$ — barely reaches Slot 5. This forces Suppress → Slot 4, Self-HP exploit → Slot 5.

### 1.4 Slot-by-Slot Evaluation

> Each slot below evaluates candidates on merit for that slot's objective — no book is excluded because of other slots' assignments. The **→** marker indicates the per-slot top candidate. Cross-slot conflicts and the final assignment are resolved in [§1.5 Global Assignment](#15-global-assignment).

#### Slot 1: Burst

**Objective:** maximum single-slot damage. Primary damage slot of the build. Fires again first in cycle 2 ($t = 36\text{s}$), maximizing total casts.

##### Main Position

Evaluate on base damage and forward value (contribution to subsequent slots):

| | Book | Base Damage | Forward Effect |
|:---:|:-----|:-----------|:---------------|
| **→** | `春黎剑阵` | 22,305% ATK (5 hits) | 分身 16s: inherits 54% stats, +200% damage, follows subsequent skills |
| 2 | `皓月剑诀` | 22,305% ATK (10 hits) + 12%maxHP × 10 | DoT, shield destroy (【碎魂剑意】) |
| 3 | `甲元仙符` | 21,090% ATK (1 hit) | +70% ATK/DEF/HP (【仙佑】) 12s |
| 4 | `念剑诀` | 22,305% ATK (8 hits) | 4s untargetable, 雷阵剑影 DoT zone |
| 5 | `千锋聚灵剑` | 20,265% ATK (6 hits) + 27%maxHP × 6 | +42.5%/hit escalation (【惊神剑光】) |
| 6 | `大罗幻诀` | 20,265% ATK (5 hits) | DR removal debuffs (【命損】) |
| — | `十方真魄` / `疾风九变` | 1,500% ATK (10 hits) | — |

**→ `春黎剑阵`.** Ties #2 and #4 on ATK% (22,305%). Its 分身 (+200% damage, 16s) follows Slots 2–3 attacks, amplifying their output — forward value that no other candidate provides. `皓月剑诀` (#2) adds +120%maxHP own-slot output but no forward benefit. `甲元仙符` (#3) has lower base and its buff benefits other slots, not burst itself. `念剑诀` (#4) has same base but 雷阵 is sustained DoT, not concentrated burst, with no forward value. `千锋聚灵剑` (#5) and `大罗幻诀` (#6) have lower ATK% base.

**Cycle 2 note:** At $t = 36\text{s}$ (cycle 2), Burst fires again under the +142.8% ATK/DEF/HP buff (【仙佑】from Slot 3, still active until $t = 60\text{s}$). This second cast with buff is stronger than the first cast without buff.

##### Aux 1

Slot 1 fires at $t = 0$ — before any HP is lost, before any debuffs are applied, before any buffs from other slots. This constrains which affix categories are useful:

| Category | Best affix for Slot 1 | Value at $t = 0$ | Why weak |
|:---------|:---------------------|:-----------------|:---------|
| $C_6$ self-HP | 【怒血战意】+2%/1% own HP lost | ~0% (no HP lost yet) | Requires combat time |
| $C_6$ enemy-HP | 【贪狼吞星】+1%/1% enemy HP lost | ~0% (no damage dealt yet) | Requires prior damage |
| $C_5$ per-hit | 【心火淬锋】+5%/hit, max 50% | avg +12.5% on 5 hits (`春黎剑阵`) | Low hit count limits value |
| $C_{12}$ debuff | 【命損】-100% DR | strategic (enables later slots) | Not direct burst damage |
| $C_{10}$ DoT | 【古魔之魂】+104% DoT | sustained over time | Spreads value, doesn't concentrate burst |
| $C_9$ buff | 【龙象护身】+70% ATK | ×1.7 on subsequent slots | Benefits other slots, not this one |

Best non-crit 2-aux pair at $t = 0$ (realistic ceiling):

| Aux 1 | Aux 2 | Combined multiplier |
|:------|:------|:-------------------|
| $C_2$ +100% damage | $C_5$ +12.5% avg (5 hits) | ~×2.25 |
| $C_2$ +100% damage | $C_2$ +50% damage | ~×2.5 (additive) |
| $C_9$ +70% ATK | $C_2$ +100% damage | ~×1.7 × ×2.0 = ×3.4 |
| **Best realistic pair** | | **~×3.5 ceiling** |

The $C_3$/$C_4$ crit system produces $E \approx$ ×10.95 (悟2境) from the same 2 aux slots — roughly **3× the output** of the best non-crit pair. Crit multiplication is unconditional (no timing, no HP threshold, no prerequisite) and scales the entire skill output multiplicatively rather than additively.

**→ `解体化形`（专属）→ 【心逐神随】.** The only source of `probability_multiplier` in the game — exclusive to `解体化形`. Stochastic multiplier with enlightenment scaling:

| Tier | P(×4) | P(×3) | P(×2) | P(no boost) | $E$ |
|:-----|:------|:------|:------|:------------|:----|
| 悟0境, 融合50重 | 11% | 20% | 20% | 49% | 1.93 |
| **悟2境, 融合63重** | **60%** | **20%** | **20%** | **0%** | **3.40** |

> **Probability interpretation.** Source: `x%概率提升4倍，y%概率提升3倍，z%概率提升2倍`. At 悟2境: x=60, y=80, z=100. Since 60+80+100 = 240 > 100%, values are cumulative: P(at least ×2) = z%, P(at least ×3) = y%, P(×4) = x%. Marginals: P(×4) = x, P(×3) = y−x, P(×2) = z−y, P(no boost) = 100−z. At 悟2境, z=100 → guaranteed minimum ×2.

【心逐神随】appears in every top crit combination. Without it, the best crit pair is 【灵犀九重】+ 【天命有归】= ×5.96 — well below the ×10.95 available with 【心逐神随】. It is the anchor of the crit system; aux 2 determines how it's paired.

##### Aux 2

Given 【心逐神随】in aux 1, the remaining $C_3$/$C_4$ sources:

- 【天命有归】(Magic school 法修) — probability → certain, +50% damage. Overrides 【心逐神随】→ guaranteed ×4, then ×1.50: **×6.00 regardless of enlightenment**.
- 【灵犀九重】(Sword school 剑修) — guaranteed ×2.97, 25% chance ×3.97, $E = 3.22$
- 【通明】(Universal) — guaranteed ×1.2, 25% chance ×1.5, $E = 1.275$

**Combinations with 【心逐神随】:**

| | Aux 2 | 悟0境 | 悟2境 | Deterministic? |
|:---:|:------|:-----|:-----|:---------------|
| 1 | 【天命有归】 | ×6.00 | ×6.00 | **Yes** — enlightenment-invariant |
| **→** | 【灵犀九重】 | $E = 6.21$ | $E =$ **10.95** | No — scales with enlightenment |
| 3 | 【通明】 | $E \approx 2.5$ | $E \approx 4.3$ | No — dominated |

**#1 vs → — full probability analysis at both tiers.**

At 悟0境 (【心逐神随】: 49% no boost, 20% ×2, 20% ×3, 11% ×4; 【灵犀九重】: 75% ×2.97, 25% ×3.97):

| 【心逐神随】 | 【灵犀九重】 | Combined | vs ×6.00 | Probability |
|:-----------|:-----------|:---------|:---------|:-----------|
| ×1 (49%) | ×2.97 (75%) | ×2.97 | −50.5% | 36.75% |
| ×1 (49%) | ×3.97 (25%) | ×3.97 | −33.8% | 12.25% |
| ×2 (20%) | ×2.97 (75%) | ×5.94 | −1.0% | 15.00% |
| ×2 (20%) | ×3.97 (25%) | ×7.94 | +32.3% | 5.00% |
| ×3 (20%) | ×2.97 (75%) | ×8.91 | +48.5% | 15.00% |
| ×3 (20%) | ×3.97 (25%) | ×11.91 | +98.5% | 5.00% |
| ×4 (11%) | ×2.97 (75%) | ×11.88 | +98.0% | 8.25% |
| ×4 (11%) | ×3.97 (25%) | ×15.88 | +164.7% | 2.75% |

**悟0境 verdict: #1 wins.** P(→ < ×6.00) = 64%. $E[\text{→}] = 6.21$ (+3.5% over #1). The 49% no-boost outcome makes → a coin flip — 64% of the time you get less than the guaranteed ×6.00, for a marginal +3.5% expected value.

At 悟2境 (【心逐神随】: 0% no boost, 20% ×2, 20% ×3, 60% ×4; 【灵犀九重】: 75% ×2.97, 25% ×3.97):

| 【心逐神随】 | 【灵犀九重】 | Combined | vs ×6.00 | Probability |
|:-----------|:-----------|:---------|:---------|:-----------|
| ×2 (20%) | ×2.97 (75%) | ×5.94 | −1.0% | 15.00% |
| ×2 (20%) | ×3.97 (25%) | ×7.94 | +32.3% | 5.00% |
| ×3 (20%) | ×2.97 (75%) | ×8.91 | +48.5% | 15.00% |
| ×3 (20%) | ×3.97 (25%) | ×11.91 | +98.5% | 5.00% |
| ×4 (60%) | ×2.97 (75%) | ×11.88 | +98.0% | 45.00% |
| ×4 (60%) | ×3.97 (25%) | ×15.88 | +164.7% | 15.00% |

| | #1 (deterministic) | → (stochastic, 悟2境) |
|:--|:-------------------|:----------------------|
| Expected value | ×6.00 | **×10.95** (+82.5%) |
| P(outperforms the other) | 15% | **85%** |
| When losing, magnitude | vs ×5.94 only (−1%) | n/a |
| Worst case | ×6.00 | ×5.94 (−1.0%) |
| Best case | ×6.00 | ×15.88 (+165%) |
| P(≥ ×11.88) | 0% | **60%** |

**悟2境 verdict: → is categorically superior.** The no-boost outcome is eliminated ($z=100$, guaranteed ≥×2). Worst case: ×5.94, 15% probability — essentially equal to #1's ×6.00. Meanwhile, 60% of the time 【心逐神随】fires at ×4, producing ×11.88 or ×15.88 — roughly double #1's output. Expected value is +82.5% higher.

**Enlightenment shifts the qualitative optimum.** At 悟0: the 49% no-boost outcome makes deterministic ×6.00 the rational choice. At 悟2: the no-boost outcome vanishes and 60% of outcomes hit ×4. The optimal strategy changes qualitatively with enlightenment. If higher tiers exist for 【心逐神随】beyond 悟2境, the dominance only increases.

**→ 【灵犀九重】at 悟2境** (build assumption: max enlightenment). $E = 10.95$, wins 85%, worst case ≈ #1. Vehicle: any Sword school book — not book-specific, any 剑修 works.

**#1 【天命有归】at 悟0境.** Deterministic ×6.00 is correct at low enlightenment. Vehicle: any Magic school book.

##### Slot 1 Summary

> **→** `春黎剑阵`（主）+ `解体化形`（专属, 【心逐神随】）+ Sword school book（【灵犀九重】）
> **Alt:** `春黎剑阵`（主）+ `解体化形`（专属, 【心逐神随】）+ Magic school book（【天命有归】）

---

#### Slot 2: Exploit

**Objective:** high sustained output. If paired after `春黎剑阵` (Burst), its 分身 follows this slot's attacks (+200%).

**Primary category: $C_1$ Base Damage.** The $C_3$ certainty block (【心逐神随】+ 【天命有归】) can only appear in one slot — whichever slot gets it becomes Burst. Exploit therefore needs inherent damage structure — hit count, %maxHP, DoT — rather than multiplicative amplification.

**Main position — high-structure damage skills:**

| | Book | Damage Structure | Against Stronger Opponent |
|:---:|:-----|:----------------|:------------------------|
| **→** | `皓月剑诀` | 10 hits, 22,305% ATK, +12%maxHP/hit, shield destroy + DoT | Highest hit count; %maxHP bypasses DR; shield destroy creates DoT (via 【碎魂剑意】) |
| 2 | `千锋聚灵剑` | 6 hits, 20,265% ATK, +27%maxHP/hit, +42.5%/hit escalation | Higher per-hit %maxHP (27% vs 12%) but only 6 hits — limits $C_5$/$C_{10}$ aux synergy; built-in $C_5$ makes aux $C_5$ redundant; %maxHP scales best with $C_6$ self-HP (self HP barely lost at Slot 2 timing) |
| 3 | `春黎剑阵` | 5 hits, 22,305% ATK, 分身 16s | Same ATK% but only 5 hits (low for exploit); 分身 is forward value, not exploit output; no %maxHP |
| 4 | `念剑诀` | 8 hits, 22,305% ATK, 雷阵 6.5s DoT zone, 4s untargetable | Sustained but lower hit-based burst; no shield mechanic |
| 5 | `大罗幻诀` | 5 hits, 20,265% ATK, counter debuffs | Lower ATK%; 5 hits limits exploit structure; primary affix (【命損】) is a debuff — strategic value, not exploit output |
| — | `十方真魄` / `疾风九变` | 1,500% ATK | Base too low |

**→ `皓月剑诀`.** 10 hits enables $C_5$/$C_{10}$ synergy from aux positions. 12%maxHP/hit × 10 = 120%maxHP bypasses DR — especially valuable against tankier opponents. Shield destroy feeds DoT (【碎魂剑意】: destroyed shields × 600% ATK per 0.5s). `千锋聚灵剑` (#2) has higher per-hit %maxHP (27% vs 12%) but fewer hits (6 vs 10), limiting aux $C_5$/$C_{10}$ value; its built-in $C_5$ makes aux $C_5$ redundant; and its %maxHP component is best amplified by $C_6$ self-HP scaling, which has minimal value at Slot 2 timing (self HP barely lost). `春黎剑阵` (#3) has only 5 hits and its key strength (分身 forward value) serves burst/amplify, not exploit.

**Aux 1 — Multi-category evaluation:**

`皓月剑诀` (10 hits, shield-destroy DoT) is compatible with multiple affix categories. The main skill's structure — high hit count AND DoT production — makes both $C_{10}$ and $C_5$ viable:

| Category | Best affix | Source | Effect | Mechanism |
|:---------|:----------|:-------|:-------|:----------|
| $C_{10}$ DoT | 【玄心剑魄】 | `春黎剑阵` exclusive | DoT: 550%/s, 8s; on dispel → 3,300% + 2s stun (【噬心】) | Creates dispel dilemma |
| $C_5$ Per-Hit | 【心火淬锋】 | Sword school | +5%/hit, max 50%; avg +22.5% on 10 hits | Pure numerical uplift |

**→ Dispel-trap DoT (【玄心剑魄】, primary).** Creates a dilemma: opponent endures 550%/s DoT for 8s (total 4,400% ATK) or dispels and takes 3,300% burst + 2s stun. Against a stronger opponent, forcing suboptimal choices has strategic value beyond raw numbers.

**Alternative: Per-hit escalation (【心火淬锋】).** +22.5% average on 10 hits is a reliable numerical uplift with no counterplay dependency. In sub-scenarios where the opponent lacks dispel capability, the dispel trap (【玄心剑魄】) has no strategic value and 【心火淬锋】is strictly better. The qualitative framework ([§3.3](../model/combat.qualitative.md)) recommends $C_5$ for exploit slots with high hit count — this is the category-match principle.

Cross-type reuse note: `春黎剑阵` as main in one slot and aux here → no conflict (legal cross-type).

**Aux 2 — $C_2$ Damage Multiplier:**

| | Affix | Source | Effect | Against 50%+ DR |
|:---:|:------|:-------|:-------|:---------------|
| **→** | 【无极剑阵】 | `无极御剑诀` exclusive | +555% 神通伤害; target gains +350% 神通伤害减免 | Net effect uncertain (待验证) |
| 2 | 【神威冲云】 | `通天剑诀` exclusive | Ignore all DR, +36% damage | ×2.72 at 50% DR; ×4.53 at 70% DR |
| 3 | 【明王之路】 | Magic school | +50% 最终伤害加深 | ×1.50, guaranteed, no penalty |
| 4 | 【引灵摘魂】 | `天魔降临咒` exclusive | Debuffed targets +104% | No debuffs on target at Slot 2 → 0 value |
| 5 | 【摧云折月】 | Sword school | +55% ATK bonus | Additive with existing ATK bonuses |
| 6 | 【破碎无双】 | Sword school | +15% ATK, +15% damage, +15% crit damage | Three small bonuses vs one large |
| 7 | 【破灭天光】 | Body school | +2,500% ATK flat damage on hit | Flat; doesn't scale with slot output |

**→ +555% skill damage (【无极剑阵】).** +555% 神通伤害 on `皓月剑诀`'s 10 hits is the largest single $C_2$ modifier available. The -350% target 神通伤害减免 penalty is a concern:
- +555% applies to all 10 hits of ATK-based damage
- The %maxHP component (12%/hit) may be outside the penalty's scope (待验证)
- -100% DR (【命損】, Slot 4) would neutralize the penalty, but fires after this slot

**Fallback:** DR bypass + 36% (#2, 【神威冲云】) is safer — guaranteed. At opponent DR 70%: effective ×4.53, with no penalty. If the +555% penalty (【无极剑阵】) proves too costly in testing, DR bypass (【神威冲云】) is the replacement.

> `皓月剑诀`（主）+ `春黎剑阵`（专属）+ `无极御剑诀`（专属）

---

#### Slot 3: Amplify

**Objective:** establish self-buff covering Slots 4–6 and the entire cycle 2. In the new ordering, Amplify fires at $t = 12\text{s}$ — after Burst and Exploit have already fired in cycle 1, but before the critical Suppress→Self-HP chain and before cycle 2.

**Primary category: $C_{11}$ Self Buffs.** The slot exists to create temporal value for subsequent slots and cycle 2.

**Main position — books with main-skill self-buffs:**

| | Book | Main Skill | $C_{11}$ Effect | Duration |
|:---:|:-----|:-----------|:---------------|:---------|
| **→** | `甲元仙符` | 21,090% ATK (1 hit) | +70% ATK/DEF/HP (【仙佑】) | 12s (2 slots) |
| 2 | `十方真魄` | 1,500% ATK (10 hits) | +20% ATK/DR (【怒灵降世】) | 4s → 7.5s with affix (1 slot) |
| 3 | `疾风九变` | 1,500% ATK (10 hits) | Reflect 50% + 15% lostHP/s (【极怒】) | 4s (~0.5 slots) |
| — | All others | — | No main-skill self-buff | Excluded |

**→ `甲元仙符`.** Dominates on every axis: +70% vs +20% (×3.5 buff value), triple-stat (ATK + DEF + HP) vs dual-stat (ATK + DR), 12s vs 7.5s duration. DEF/HP components especially important against a stronger opponent. `十方真魄` (#2) is strictly inferior as an amplify main — its buff is weaker, shorter, and dual-stat; its self-cleanse (【星猿弃天】) is a survival mechanic, not an amplify mechanic.

**Aux 1 — $C_9$ buff strength amplification:**

| | Affix | Source | Sub-type | Effect on self-buff (【仙佑】) |
|:---:|:------|:-------|:---------|:-------------------|
| **→** | 【龙象护身】 | `浩然星灵诀` exclusive | buff_strength | ×2.04 → +142.8% ATK/DEF/HP |
| 2 | 【清灵】 | Universal | buff_strength | ×1.20 → +84% ATK/DEF/HP |

**→ Buff strength ×2.04 (【龙象护身】).** No other affix doubles buff effect strength. At ×2.04, the self-buff (【仙佑】) becomes +142.8% ATK/DEF/HP — the strongest achievable.

**Aux 2 — Multi-category evaluation:**

With Amplify now in Slot 3, the buff timing changes fundamentally. The buff cannot cover cycle 1 Burst/Exploit (already fired), so its value comes entirely from covering Slots 4–6 and cycle 2. This shifts the strength-vs-coverage decision:

| Category | Best affix | Source | Effect |
|:---------|:----------|:-------|:-------|
| $C_9$ duration | 【仙露护元】 | `念剑诀` exclusive | ×4 duration → 12s → 48s; covers Slots 4–6 + cycle 2 |
| $C_9$ stacks | 【真极穿空】 | `元磁神光` exclusive | +100% buff stacks; +5.5%/5 stacks (max 27.5%) |
| $C_9$ duration | 【业焰】 | Universal | ×1.69 → 12s → 20.3s (3 slots, no cycle 2) |
| $C_9$ duration | 【真言不灭】 | `疾风九变` exclusive | ×1.55 → 12s → 18.6s (3 slots, no cycle 2) |

**Coverage vs strength decision (revised by cycle principle):**

- **Coverage path** (【龙象护身】+ 【仙露护元】): +142.8% ATK/DEF/HP for 48s. Covers Slots 4–6 in cycle 1 AND the critical cycle 2 Burst at $t = 36\text{s}$ with the full +142.8% buff. The buff re-casts at $t = 48\text{s}$ (cycle 2 Slot 3), becoming self-sustaining.
- **Strength path** (【龙象护身】+ 【真极穿空】): +142.8% ATK/DEF/HP for 12s + 27.5% stacking damage. Covers Slots 4–5 only. Cycle 2 Burst fires without any buff.

**→ Coverage path.** The cycle principle makes this decisive: 48s coverage means the cycle 2 Burst (×6.00 deterministic, $t = 36\text{s}$) fires with +142.8% ATK — a ×2.43 multiplier on the build's highest-damage slot. The +27.5% stacking damage from the strength path cannot compensate for losing this.

Additionally, +142.8% DEF/HP covering the Self-HP slot (Slot 5, $t = 24\text{s}$) improves survivability during the critical 【命損】window.

<a id="alternative-slot-ordering-for-short-fights"></a>
**Alternative: Strength path for short fights.** If combat reliably ends within cycle 1 (opponent dies before $t \approx 36\text{s}$), cycle 2 coverage has zero value. In this sub-scenario, 【真极穿空】(+27.5% stacking damage) is strictly superior. Also consider reverting to the old ordering (Amplify→Burst→Exploit) so the buff covers cycle 1 Burst and Exploit. The short-fight configuration:

> Short-fight alternative: `甲元仙符`（主）+ `浩然星灵诀`（专属）+ `元磁神光`（专属）, Slot 1 (Amplify→Burst→Exploit ordering)

> `甲元仙符`（主）+ `浩然星灵诀`（专属）+ `念剑诀`（专属）

---

#### Slot 4: Suppress

**Objective:** apply -100% DR (【命損】) to cover Slot 5. Secondary: accumulate debuffs for Slot 5's per-debuff-stack damage.

**Primary category: $C_{12}$ Debuffs.** Damage is secondary to the strategic debuff.

**Main position — source of -100% DR (【命損】):**

| | Book | $C_{12}$ Effect |
|:---:|:-----|:---------------|
| **→** | `大罗幻诀` | -100% final DR, 8s (【魔魂咒界】→ 【命損】). 60% counter-debuff chance (【罗天魔咒】) |
| — | All others | No source of -100% DR (【命損】) in the game |

**→ `大罗幻诀`.** Deterministic — only source of -100% DR (【命損】). Against a stronger opponent with high DR, this effect is devastating:

| Opponent DR | DR removal effect (【命損】→ 0%) | Effective damage multiplier |
|:-----------|:---------------------|:--------------------------|
| 50% | 50% → 0% | ×2.0 |
| 70% | 70% → 0% | ×3.33 |
| 90% | 90% → 0% | ×10.0 |

**Aux 1 — $C_9$ State Modifiers (debuff amplification):**

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【心魔惑言】 | `天轮魔经` exclusive | Debuff stacks +100%; +5.5%/5 debuff stacks (max 27.5%) |
| 2 | 【奇能诡道】 | `周天星元` exclusive | +20% debuff stack chance; enlightenment: 逆转阴阳. Note: secondary conflict if `周天星元` is also aux in Burst |
| 3 | 【咒书】 | Universal | Debuff strength +20% |
| 4 | 【业焰】 | Universal | All state duration +69% (→ 【命損】8s → 13.5s, covers 2 slots) |

**→ Debuff stacks ×2 (【心魔惑言】).** Doubles debuff stacking rate from the 60% counter mechanism (【罗天魔咒】), directly feeding Slot 5's per-debuff-stack true damage (【紫心真诀】). The +5.5%/5 debuff stacks (max 27.5%) is additional output. Duration +69% (#3, 【业焰】) extends 【命損】to 13.5s (covering 2 slots instead of 1), which is attractive, but debuff acceleration (【心魔惑言】) is more valuable: it enables true damage (【紫心真诀】) in Slot 5.

**Alternative: Duration extension (【业焰】) for double-slot 【命損】coverage.** If 【命損】needs to cover both Slots 5 and 6, +69% duration (8s → 13.5s → $\lfloor 13.5 / 6 \rfloor = 2$ slots) achieves this. Trade-off: lose debuff stack doubling → lower true damage from 【紫心真诀】.

**Aux 2 — $C_6$ HP-Based (enemy lost HP):**

By Slot 4, the opponent has taken damage from Slots 1–2 (burst + exploit). Their lost HP is significant.

| | Affix | Source | Effect at ~50% enemy HP lost |
|:---:|:------|:-------|:---------------------------|
| **→** | 【追神真诀】 | `皓月剑诀` exclusive | DoT triggers +26.5% enemy lost HP as damage; enlightenment 10: +50% maxHP damage, **+300% total damage** |
| 2 | 【贪狼吞星】 | Body school | +1%/1% enemy lost HP → +50% all damage |
| 3 | 【吞海】 | Universal | +0.4%/1% enemy lost HP → +20% all damage |

**→ DoT +26.5% enemy lost HP, +300% total at E10 (【追神真诀】).** At max enlightenment, the "+300% total damage" means all affix-derived damage is ×4.0. This dwarfs alternatives at end-state. +50% to ALL damage (#2, 【贪狼吞星】) has broader scope but no enlightenment scaling — at max enlightenment, +300% (【追神真诀】) is strictly superior in total output.

Cross-type reuse note: `皓月剑诀` as main in one slot and aux here → no conflict (legal cross-type).

> `大罗幻诀`（主）+ `天轮魔经`（专属）+ `皓月剑诀`（专属）

**Temporal note:** -100% DR (【命損】) lasts 8s → covers 1 subsequent slot ($\lfloor 8 / T_{gap} \rfloor = 1$). Reaches Slot 5 with $8 - T_{gap} \approx 2\text{s}$ remaining — tight but sufficient. Does NOT reach Slot 6.

---

#### Slot 5: Self-HP Exploit

**Objective:** convert accumulated own HP loss into maximum damage. If preceded by Suppress (【命損】-100% DR) and Amplify (【仙佑】+142.8% ATK/DEF/HP), this slot benefits from both — the $C_6$ scaling is multiplied by the buff and applied through zero DR.

This is the **key innovation** for the "against stronger" matchup. By Slot 5 (~$4 \times T_{gap}$ into combat), self HP loss is ~50% under our assumptions. Standard builds treat HP loss as pure cost; this build treats it as fuel.

**Primary category: $C_6$ HP-Based (self-lost-HP).**

**Aux 1 — $C_6$ self-lost-HP scaling:**

| | Affix | Source | At 50% HP lost | At 70% HP lost | Penalty |
|:---:|:------|:-------|:---------------|:---------------|:--------|
| **→** | 【怒血战意】 | `玄煞灵影诀` exclusive | +100% damage | +140% damage | None |
| 2 | 【破釜沉舟】 | `十方真魄` exclusive | +380% damage | +380% damage | Self +50% damage taken |
| 3 | 【意坠深渊】 | Body school | +50% damage | +50% damage | None; min 11% floor |
| 4 | 【战意】 | Universal | +25% damage | +35% damage | None |

**→ +2%/1% own HP lost, no penalty (【怒血战意】).** At 50% HP lost: +100% — doubles +50% (#3, 【意坠深渊】) and quadruples +25% (#4, 【战意】). +380% flat (#2, 【破釜沉舟】) is numerically higher but its self-damage penalty (+50% damage taken) is dangerous against a stronger opponent who already deals excessive damage — the increased incoming damage could cause death before Slot 5 even completes. +2%/1% (【怒血战意】) is penalty-free and continues to scale: +140% at 70% lost, +200% at 100% lost.

**Aux 2 — $C_6$/$C_{13}$ per-debuff-stack true damage:**

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【紫心真诀】 | `惊蛰化龙` exclusive | Per debuff stack: 2.1%maxHP true damage (max 10 stacks = 21%); enlightenment: +50% lost HP damage, +75% total |
| 2 | 【引灵摘魂】 | `天魔降临咒` exclusive | Debuffed targets +104% damage; broad but additive |
| 3 | 【吞海】 | Universal | +0.4%/1% enemy lost HP → +20% at 50% enemy lost |

**→ 2.1%maxHP true damage per debuff stack (【紫心真诀】).** True damage ignores DR — orthogonal to all other damage modifiers. At 8 debuff stacks (from counter-debuffs 【罗天魔咒】+ stacking ×2 【心魔惑言】in Slot 4): 8 × 2.1%maxHP = 16.8%maxHP true damage. With enlightenment (+75% total → ×1.75): 29.4%maxHP true damage. +104% to debuffed targets (#2, 【引灵摘魂】) is additive with other damage bonuses, while true damage (【紫心真诀】) is a separate channel entirely.

**Main position — base damage for ×2.0 self-HP multiplier (【怒血战意】) to scale:**

Both aux positions are consumed by the $C_6$ chain (【怒血战意】+ 【紫心真诀】). The main needs high base damage with %maxHP — %maxHP bypasses DR and is multiplied by 【怒血战意】's +2%/1% own HP lost:

| | Book | Base Damage | $C_6$ Synergy |
|:---:|:-----|:-----------|:-------------|
| **→** | `千锋聚灵剑` | 20,265% ATK (6 hits) + 27%maxHP/hit; +42.5%/hit escalation (【惊神剑光】) | %maxHP bypasses DR; built-in $C_5$; ×2.0 on full output (【怒血战意】) |
| 2 | `念剑诀` | 22,305% ATK (8 hits); 雷阵 DoT zone | Higher ATK% but no %maxHP; DoT zone doesn't benefit from 【命損】window (~2s) |
| 3 | `皓月剑诀` | 22,305% ATK (10 hits) + 12%maxHP/hit | 10 hits + %maxHP, but lower per-hit %maxHP (12% vs 27%); lacks built-in $C_5$ |
| 4 | `春黎剑阵` | 22,305% ATK (5 hits) + 分身 | No %maxHP; 5 hits too few for $C_6$ hit concentration; 分身 forward value is wasted at Slot 5 (endgame) |
| 5 | `十方真魄` | 1,500% ATK (10 hits); 16% own lost HP kick | HP-kick synergizes with $C_6$ thematically, but 1,500% base too low for ×2.0 |

**→ `千锋聚灵剑`.** 27%maxHP/hit × 6 = 162%maxHP + 20,265% ATK. Against a stronger (higher HP) opponent, the %maxHP component is especially valuable — it scales with their HP pool. Built-in +42.5%/hit escalation (【惊神剑光】, avg ×2.06 across 6 hits) provides $C_5$ without consuming an aux slot. `念剑诀` (#2) has higher ATK% (22,305%) but no %maxHP and its 雷阵 zone is sustained damage that doesn't concentrate into the tight 【命損】window.

**Damage projection at 50% own HP lost, under 【命損】, with 【仙佑】buff:**
- `千锋聚灵剑` base: 20,265% ATK + 162%maxHP (across 6 hits)
- Per-hit escalation +42.5%/hit (【惊神剑光】): avg ×2.06 → 41,746% ATK + 334%maxHP
- Self-HP exploit at 50% lost, ×2.0 (【怒血战意】): 83,492% ATK + 668%maxHP
- True damage at 8 stacks (【紫心真诀】): +29.4%maxHP (with enlightenment)
- +142.8% ATK from 【仙佑】buff (active at $t = 24\text{s}$): applies to ATK% component
- DR removal (【命損】): -100% DR → all damage fully penetrates

> `千锋聚灵剑`（主）+ `玄煞灵影诀`（专属）+ `惊蛰化龙`（专属）

---

#### Slot 6: Endure

**Objective:** survive the endgame, maintain ongoing effects, suppress opponent healing if present.

**Primary category: $C_{11}$ Self Buffs** — sustain through buff + cleanse.

**Main position — endgame survival:**

The endure role requires survival mechanics (CC cleanse, DR, reflect). Books without survival mechanics rank low regardless of damage output:

| | Book | Survival Mechanic |
|:---:|:-----|:-----------------|
| **→** | `十方真魄` | +20% ATK/DR, 7.5s (【怒灵降世】); 30%/s chance to cleanse CC, max 1/25s (【星猿弃天】) |
| 2 | `疾风九变` | Reflect 50% + 15% lostHP/s (【极怒】); recover 82% of damage dealt as HP (【星猿复灵】) |
| 3 | `念剑诀` | 4s untargetable; 雷阵 DoT zone provides sustained pressure |
| — | Other books | No survival mechanics → unsuitable for endure regardless of damage |

**→ `十方真魄`.** Self-cleanse (CC removal) is critical in endgame — if stunned against a stronger opponent, death is likely. DR (+20%) provides direct survivability. `疾风九变` (#2) offers HP recovery via reflect, but its sustain depends on dealing damage (low output in endgame). `念剑诀` (#3) provides 4s untargetable but no ongoing sustain — its higher value is as aux carrier for 【仙露护元】(see §1.5 contention resolution).

**Aux 1 — Multi-category evaluation:**

`十方真魄` (10 hits, 1,500% ATK) has high hit count but low base damage. Multiple categories are viable:

| Category | Best affix | Source | Effect | Synergy with `十方真魄` |
|:---------|:----------|:-------|:-------|:----------------------|
| $C_5$ Per-Hit | 【心火淬锋】 | Sword school | +5%/hit, max 50%; avg +22.5% on 10 hits | 10 hits → full $C_5$ value |
| $C_6$ HP-Based | 【意坠深渊】 | Body school | Min 11% lost HP calc, +50% damage | Late-slot low HP → high $C_6$ value |
| $C_9$ Duration | 【业焰】 | Universal | +69% → 【怒灵降世】7.5s → 12.7s | Extends sustain buff to 2 slots |
| $C_9$ Duration | 【真言不灭】 | `疾风九变` exclusive | +55% → 【怒灵降世】7.5s → 11.6s | Extends sustain buff |

**→ Per-hit escalation +22.5% (【心火淬锋】, primary).** 10 hits on `十方真魄` fully activates $C_5$ per-hit escalation. The +22.5% applies to the entire hit sequence as a separate multiplier zone ($C_5$), compounding with other damage sources rather than crowding additive zones. The vehicle book (`通天剑诀`, Sword school) is not used elsewhere → no secondary conflict.

**Alternative: +50% damage at low HP (【意坠深渊】).** By Slot 6 ($t = 30\text{s}$), self HP is likely 40–60% lost. The +50% damage is effectively unconditional (min 11% floor ensures activation). In sub-scenarios where self HP loss exceeds 50% by Slot 6, 【意坠深渊】's flat +50% may exceed 【心火淬锋】's +22.5%. However, +50% damage is additive with other $C_6$ bonuses (if any), while per-hit escalation (【心火淬锋】) is in its own $C_5$ zone — the zone separation gives 【心火淬锋】better effective value in most builds.

**Alternative: Buff duration extension (【业焰】).** 【怒灵降世】7.5s → 12.7s extends the +20% ATK/DR buff to cover 2 slots. In sustain-heavy endgames, this duration may matter more than +22.5% damage. But 12.7s is still only 2 slots; the buff is relatively weak (+20%) compared to 【仙佑】(+142.8%), so extending it has limited value.

**Aux 2 — $C_{12}$ anti-healing (general PvP insurance):**

In PvP, most opponents carry healing. In the endgame, any recovery undoes accumulated damage from Slots 1–5.

| | Affix | Source | Healing reduction | Duration | Undispellable? |
|:---:|:------|:-------|:-----------------|:---------|:--------------|
| **→** | 【天哀灵涸】 | `千锋聚灵剑` exclusive | -31% | 8s | **Yes** |
| 2 | 【天倾灵枯】 | `甲元仙符` exclusive | -31% (-51% if HP<30%) | 20s | No |
| 3 | 【无相魔威】 | `无相魔劫咒` exclusive | -40.8%, +105% damage (+205% if no heal buff) | 8s | No |

**→ -31% healing, undispellable (【天哀灵涸】).** Undispellable — the opponent cannot remove it. Against a stronger opponent who likely has dispel capabilities, this is decisive. -31%/-51% at HP<30% (#2, 【天倾灵枯】) has longer duration (20s) and stronger conditional, but is dispellable — a stronger opponent will cleanse it. -40.8% + damage bonus (#3, 【无相魔威】) has highest anti-heal value, but also dispellable.

Cross-type reuse note: `千锋聚灵剑` as main in one slot and aux here → no conflict (legal cross-type).

> `十方真魄`（主）+ `通天剑诀`（【心火淬锋】）+ `千锋聚灵剑`（专属）

---

### 1.5 Global Assignment

Per-slot evaluations (§1.4) rank candidates on merit independently. Books that rank highly for multiple slots create **contentions** — resolved here by comparing the book's marginal value across competing slots.

#### 1.5.1 Contentions

| Book | Competing slots | Resolution |
|:-----|:---------------|:-----------|
| `皓月剑诀` | Burst (#2), Exploit (#1), Self-HP (#3) | **→ Exploit.** 10-hit structure enables $C_5$/$C_{10}$ aux synergy in Exploit; in Burst, both aux consumed by $C_3$/$C_4$ → 10 hits and %maxHP produce no aux synergy. In Self-HP, lower per-hit %maxHP (12% vs `千锋聚灵剑`'s 27%) and no built-in $C_5$. |
| `千锋聚灵剑` | Exploit (#2), Self-HP (#1) | **→ Self-HP.** At Slot 2 timing ($t = 6\text{s}$), self HP barely lost → $C_6$ scaling ≈ 0; %maxHP is unamplified. At Slot 5 timing ($t = 24\text{s}$), ~50% HP lost → ×2.0 from 【怒血战意】applies to 162%maxHP + 20,265% ATK. Same base, ×2.0 effective output in Self-HP. |
| `念剑诀` | Burst (#4), Exploit (#4), Endure (#3), Aux for Amplify | **→ Aux (Slot 3).** Ranks #3–#4 as main in every contending slot. As aux carrying 【仙露护元】(×4 buff duration), it enables 48s coverage — buffing cycle 2 including the Burst re-cast. Aux value exceeds any main-position contribution. |
| `大罗幻诀` | Exploit (#5), Suppress (#1) | **→ Suppress.** Only source of 【命損】(-100% DR). As Exploit main, ranks low (5 hits, lower ATK%, debuff primary affix doesn't serve exploit output). |

**Uncontested:** `春黎剑阵` → Burst (#1 after `皓月剑诀` → Exploit), `甲元仙符` → Amplify (only viable amplify main), `十方真魄` → Endure (self-cleanse dominates on merit).

#### 1.5.2 Assignment A — Primary (Multi-Cycle)

Optimized for combat reaching cycle 2 ($t > 36\text{s}$). Burst fires first, gets earliest cycle 2 re-cast. Amplify with 48s coverage buffs entire cycle 2.

| Slot | Specification | Primary Affix → Feature | Objective |
|:-----|:-------------|:----------------------|:----------|
| 1 | `春黎剑阵`（主）+ `解体化形`（专属）+ Sword school（【灵犀九重】） | Stochastic crit $E \approx$ ×10.95 (悟2境), upside to ×15.88 (【心逐神随】, 【灵犀九重】, $C_3$) | Burst |
| 2 | `皓月剑诀`（主）+ `春黎剑阵`（专属）+ `无极御剑诀`（专属） | 10-hit %maxHP + dispel trap + +555% skill damage (【碎魂剑意】, 【玄心剑魄】, 【无极剑阵】, $C_1$) | Exploit |
| 3 | `甲元仙符`（主）+ `浩然星灵诀`（专属）+ `念剑诀`（专属） | +142.8% ATK/DEF/HP for 48s (【仙佑】, 【龙象护身】, 【仙露护元】, $C_{11}$) | Amplify |
| 4 | `大罗幻诀`（主）+ `天轮魔经`（专属）+ `皓月剑诀`（专属） | -100% DR for 8s + debuff stacking ×2 (【命損】, 【心魔惑言】, $C_{12}$) | Suppress |
| 5 | `千锋聚灵剑`（主）+ `玄煞灵影诀`（专属）+ `惊蛰化龙`（专属） | +2%/1% HP lost + true damage per debuff stack (【怒血战意】, 【紫心真诀】, $C_6$) | Self-HP exploit |
| 6 | `十方真魄`（主）+ `通天剑诀`（【心火淬锋】）+ `千锋聚灵剑`（专属） | CC cleanse + per-hit +22.5% + -31% healing undispellable (【星猿弃天】, 【心火淬锋】, 【天哀灵涸】, $C_{11}$) | Endure |

**Note:** 【灵犀九重】(Sword school) frees `周天星元` — previously locked as 【天命有归】vehicle. This opens `周天星元`(【奇能诡道】) as an option for Slot 4 Aux 1 (see §1.5.4).

#### 1.5.3 Assignment B — Alternative (Single-Cycle / Short Fight)

When combat ends within cycle 1 ($t < 36\text{s}$), cycle 2 coverage is wasted. Two changes from Assignment A:

1. **Slot ordering**: Amplify(1) → Burst(2) → Exploit(3). Buff covers cycle 1 Burst and Exploit.
2. **Amplify Aux 2**: 【仙露护元】→ 【真极穿空】(+100% buff stacks, +27.5% damage). Duration extension has no value without cycle 2.

| Slot | Specification | Change from A |
|:-----|:-------------|:-------------|
| 1 | `甲元仙符`（主）+ `浩然星灵诀`（专属）+ `元磁神光`（专属） | Amplify first; strength path (【真极穿空】) |
| 2 | `春黎剑阵`（主）+ `解体化形`（专属）+ Sword/Magic school（【灵犀九重】or 【天命有归】） | Burst second — buffed by +142.8% ATK; same #3/#1 crit choice as Assignment A |
| 3 | `皓月剑诀`（主）+ `春黎剑阵`（专属）+ `无极御剑诀`（专属） | Exploit third — buffed by +142.8% ATK |
| 4–5 | Same as A | — |
| 6 | `十方真魄`（主）+ `念剑诀`（专属）+ `千锋聚灵剑`（专属） | 【仙露护元】extends 【怒灵降世】to 30s (freed from Slot 3) |

**When to use:** opponent is very strong (expect death before $t = 36\text{s}$), or matchup where cycle 1 burst under full buff is decisive. Trade-off: loses cycle 2 buffed Burst, gains cycle 1 buffed Burst + Exploit + +27.5% stacking damage.

#### 1.5.4 Aux-Level Variants

Within either assignment, individual aux positions have alternatives for specific sub-scenarios:

| Position | Primary (against stronger) | Alternative | When alternative is better |
|:---------|:--------------------------|:-----------|:--------------------------|
| Slot 1 Aux 2 | 【灵犀九重】($C_3$ stochastic, $E$ ×10.95 at 悟2境) | 【天命有归】($C_4$ deterministic ×6.00) | Even/favorable matchup where consistency > expected value |
| Slot 2 Aux 1 | 【玄心剑魄】($C_{10}$ dispel trap) | 【心火淬锋】($C_5$ +22.5%) | Opponent lacks dispel; raw DPS over strategic pressure |
| Slot 4 Aux 1 | 【心魔惑言】($C_9$ debuff ×2) | 【业焰】($C_9$ +69% duration) | Need 【命損】to cover 2 slots (8s → 13.5s) |
| Slot 6 Aux 1 | 【心火淬锋】($C_5$ +22.5%) | 【意坠深渊】($C_6$ +50% at low HP) | Self HP > 50% lost by Slot 6; flat +50% exceeds +22.5% |

---

### 1.6 Verification

**Cross-type reuse** (main in one slot, aux in another — no conflict):

| Book | Main | Aux | Legal? |
|:-----|:-----|:----|:-------|
| `春黎剑阵` | Slot 1 | Slot 2 | Cross-type ✓ |
| `皓月剑诀` | Slot 2 | Slot 4 | Cross-type ✓ |
| `千锋聚灵剑` | Slot 5 | Slot 6 | Cross-type ✓ |

**Core conflict check:** All 6 mains distinct → no core conflict.

**Secondary conflict check:** No book appears as aux in more than one slot → no secondary conflict.

**Distinct books used:** 15.

**Cross-Slot Temporal Map:**

| Effect | Source | Activation | Duration | Covers |
|:-------|:-------|:-----------|:---------|:-------|
| Summon +200% damage (分身) | Slot 1 | $t = 0\text{s}$ | 16s | Slots 2–3 |
| DoT + dispel trap (【噬心】) | Slot 2 | $t = 6\text{s}$ | 8s | Slot 3 |
| Shield-destroy DoT (【碎魂剑意】) | Slot 2 | $t = 6\text{s}$ | ongoing | Slots 3–4 |
| +142.8% ATK/DEF/HP (【仙佑】×【龙象护身】×【仙露护元】) | Slot 3 | $t = 12\text{s}$ | **48s** | **Slots 4–6, cycle 2 Slots 1–4** |
| Counter debuffs (【罗天魔咒】) | Slot 4 | $t = 18\text{s}$ | 8s | Slot 5 (debuff accumulation) |
| -100% DR (【命損】) | Slot 4 | $t = 18\text{s}$ | 8s | Slot 5 (~2s overlap) |
| +20% ATK/DR (【怒灵降世】) | Slot 6 | $t = 30\text{s}$ | 7.5s | Slot 6 only |
| -31% healing, undispellable (【天哀灵涸】) | Slot 6 | $t = 30\text{s}$ | 8s | Endgame |
| $E \approx$ ×10.95 Burst (cycle 2, **buffed**) | Slot 1 | $t = 36\text{s}$ | — | +142.8% ATK from 【仙佑】 |
| Amplify re-cast (cycle 2, refreshes buff) | Slot 3 | $t = 48\text{s}$ | 48s | Buff sustained indefinitely |

**Critical path:** -100% DR (【命損】, Slot 4) → Self-HP exploit (Slot 5). 8s duration leaves $8 - T_{gap}$ seconds for Slot 5 to execute under DR removal. `千锋聚灵剑` has 6 hits — if cast time $< 8 - T_{gap}$, full benefit; otherwise partial.

**Cycle 2 critical path:** +142.8% ATK/DEF/HP (【仙佑】, Slot 3, 48s) is active when Burst re-casts at $t = 36\text{s}$. The $E \approx$ ×10.95 stochastic crit (悟2境) on 133,830% ATK with +142.8% ATK buff produces the build's single highest-damage event.

### 1.7 Design Insights

**1. $C_6$ self-lost-HP as matchup-specific advantage.** Standard builds treat HP loss as pure cost. Against a stronger opponent, +2%/1% lost (【怒血战意】) converts inevitable HP loss into +100% at 50% lost — equivalent to a strong $C_2$ multiplier obtained for free.

**2. DR removal (【命損】) covers the highest-output slot.** -100% DR covers exactly 1 subsequent slot. Placing it before Slot 5 — where self-HP exploit (【怒血战意】) + true damage (【紫心真诀】) + `千锋聚灵剑` converge — maximizes the DR removal's value.

**3. Cross-type reuse enables the self-HP chain.** `千锋聚灵剑` as main in Slot 5 AND aux in Slot 6 (for undispellable anti-healing, 【天哀灵涸】) is only possible via cross-type reuse.

**4. Cycle principle: earlier slots fire more.** The 6-slot sequence cycles every ~36s. Placing the highest-damage skill (Burst, $E \approx$ ×10.95 at 悟2境) in Slot 1 gives it the earliest cycle 2 re-cast ($t = 36\text{s}$). This extra cast — now buffed by +142.8% ATK from 【仙佑】— may exceed the damage of the entire cycle 1 Burst (which fires without the buff).

**5. Buff timing follows cycle structure.** Amplify in Slot 3 with ×4 duration (48s) covers 9+ slot activations across cycle 1 and cycle 2, vs 2 slots with the old ordering (Amplify in Slot 1, 12s). The trade-off — losing cycle 1 buff on Burst/Exploit — is compensated by gaining cycle 2 buff on ALL slots. The buff re-casts at $t = 48\text{s}$ (cycle 2 Slot 3), making it self-sustaining for any number of cycles.

**6. Multi-category evaluation prevents blind spots.** Each aux position should enumerate all plausible affix categories based on main skill compatibility (hit count → $C_5$; DoT → $C_{10}$; buff → $C_9$; HP state → $C_6$), then compare across categories. Pre-assigning one category per position hides cross-category options — e.g., 【心火淬锋】($C_5$) for `十方真魄` (10 hits) was hidden when only $C_9$ buff extension was considered.

**7. Global assignment over greedy slot-by-slot.** Per-slot evaluation identifies candidates; the final assignment is a global decision that resolves contentions. A book that ranks #1 for one slot may produce more total value in another slot — e.g., `念剑诀` ranks #3–#4 as main anywhere, but as aux carrying 【仙露护元】it enables 48s buff coverage worth more than any single main-slot contribution. The greedy approach (commit per slot, exclude from later slots) hides these global optima.

**8. Enlightenment as qualitative strategy shift.** 【心逐神随】's cumulative probabilities ($x, y, z$) create a regime transition: at 悟0境, 49% of outcomes are ×1 (no amplification), making deterministic ×6.00 (#1) optimal. At 悟2境, P(×1)=0% and P(×4)=60%, making stochastic #3 ($E = 10.95$) categorically superior. This is not just a quantitative scaling — the optimal combination changes. Players at different enlightenment tiers should use fundamentally different Burst configurations.

### 1.8 Comparison with Standard Build (ye.1)

| Slot | Standard (ye.1) | Against Stronger | Change |
|:-----|:----------------|:-----------------|:-------|
| 1 | Amplify (`甲元仙符`) | **Burst** (`春黎剑阵`) | Slot reorder: burst priority for cycle 2 |
| 2 | Burst (`春黎剑阵`) | **Exploit** (`皓月剑诀`) | Slot reorder |
| 3 | Exploit (`皓月剑诀`) | **Amplify** (`甲元仙符`) | Slot reorder + 【仙露护元】for 48s coverage |
| 4 | Same | Same | — |
| 5 | `念剑诀`（主）+ `惊蛰化龙`（专属）+ `焚圣真魔咒`（专属） | `千锋聚灵剑`（主）+ `玄煞灵影诀`（专属）+ `惊蛰化龙`（专属） | DoT sustain → self-HP exploit |
| 6 | `十方真魄`（主）+ `玄煞灵影诀`（【意坠深渊】）+ `念剑诀`（专属） | `十方真魄`（主）+ `通天剑诀`（【心火淬锋】）+ `千锋聚灵剑`（专属） | 【仙露护元】→ 【心火淬锋】; anti-healing added |

**Trade-offs:**
- **Lost:** `念剑诀` DoT zone (sustained pressure), 12s buff on cycle 1 Burst/Exploit, 30s 【怒灵降世】extension (Slot 6)
- **Gained:** +100% at 50% HP (【怒血战意】), true damage (【紫心真诀】), anti-healing (【天哀灵涸】), cycle 2 buffed Burst, +142.8% ATK/DEF/HP on Slots 4–6
- **This build better:** opponent is tankier (high DR → 【命損】more valuable), combat reaches cycle 2 (buff coverage + extra Burst cast), self HP drops faster ($C_6$ scaling)
- **Standard better:** evenly matched (moderate HP loss → 【怒血战意】underscales), combat ends in cycle 1 (cycle 2 coverage wasted), opponent lacks healing (【天哀灵涸】unnecessary)

### 1.9 Open Questions

| # | Question | Impact | Priority |
|:---:|:---------|:-------|:---------|
| 1 | Does +damage% (【怒血战意】) apply to `千锋聚灵剑`'s %maxHP per-hit? | Slot 5 output hinges on this | High |
| 2 | `千锋聚灵剑` cast time vs DR removal (【命損】) remaining window (~$8 - T_{gap}$)? | How many of 6 hits benefit from -100% DR (【命損】) | High |
| 3 | How many debuff stacks from counter-debuffs (【罗天魔咒】) + stacking ×2 (【心魔惑言】) by Slot 5? | True damage output (【紫心真诀】): 2.1%maxHP × stacks, max 21% | Medium |
| 4 | +555% skill damage (【无极剑阵】) vs target +350% DR: net effective multiplier? | Slot 2 aux 2 selection; DR bypass (【神威冲云】) as fallback | Medium |
| 5 | At what combat duration does cycle 2 value exceed cycle 1 buff value? | Determines slot ordering choice (Burst-first vs Amplify-first) | Medium |
| 6 | 【心火淬锋】vs 【玄心剑魄】empirical DPS comparison on `皓月剑诀` 10-hit? | Slot 2 aux 1 selection (strategic trap vs raw DPS) | Low |
| 7 | -31% undispellable (【天哀灵涸】) vs -51% at HP<30% dispellable (【天倾灵枯】)? | Slot 6 anti-healing strategy | Low |
| 8 | Do 【心逐神随】probabilities continue to scale beyond 悟2境 (e.g., 悟5, 悟10)? | If so, #3's dominance increases further. At 悟2, P(×4)=60%; at 悟10 this could approach 100%, making #3 converge toward guaranteed ×4 × ×3.22 = ×12.88 | **High** |
| 9 | Is the cumulative probability interpretation confirmed by game mechanics documentation? | 悟2境 data ($60+80+100=240\%$) forces cumulative reading, but an independent source would verify | Medium |

---

## 2. Against Opponent with Initial Immunity

### 2.1 Scenario Analysis

#### 2.1.1 Immunity Window

Some opponents have a damage immunity window at the start of combat. Observed duration: **8–12s**.

| Time | Slot firing | Immunity (8s) | Immunity (12s) |
|:-----|:-----------|:-------------|:---------------|
| $t = 0$ | Slot 1 | **Immune** — damage wasted | **Immune** — damage wasted |
| $t = 6$ | Slot 2 | **Immune** — damage wasted | **Immune** — damage wasted |
| $t = 12$ | Slot 3 | Post-immunity | **Borderline** |
| $t = 18$ | Slot 4 | Post-immunity | Post-immunity |

Slots 1–2 fire into immunity. Any damage-dealing skill in these positions is wasted. This creates **2 free setup slots** — slots where buffs, debuffs, and preparation have full value but damage has zero value.

#### 2.1.2 Strategic Implication

The immunity window inverts the §1 strategic orientation. In §1 (Against Stronger Opponent), burst-first is optimal because Slot 1 gets the most cycle 2 re-casts. Here, burst-first is the worst option — the highest-damage skill fires into nothing.

Instead, the 2 free slots should be used for **setup**: self-buffs and/or enemy debuffs that persist beyond the immunity window. Then the first post-immunity slot (Slot 3, $t = 12\text{s}$) delivers the first real damage — already buffed, against a potentially debuffed target.

#### 2.1.3 Strategic Orientation

| Strategy | Slot 1 | Slot 2 | First damage (Slot 3) | Advantage |
|:---------|:-------|:-------|:---------------------|:----------|
| **Amplify → Suppress** | `甲元仙符` (【仙佑】+142.8% ATK) | `大罗幻诀` (【命損】-100% DR, 8s) | Burst under buff + zero DR | Both setup effects active for Slot 3; 【命損】8s covers Slots 3–4 |
| **Suppress → Amplify** | `大罗幻诀` (【命損】-100% DR, 8s) | `甲元仙符` (【仙佑】+142.8% ATK) | Burst under buff + zero DR | Same effects, but 【命損】fires at $t=0$ → expires at $t=8$ → may NOT reach Slot 3 at $t=12$ |
| **Amplify → Amplify** | `甲元仙符` (buff) | second buff source | Burst under double buff | No DR removal — opponent's 50%+ DR halves damage |
| **Suppress → Burst** | `大罗幻诀` (【命損】) | `春黎剑阵` (damage) | — (Slot 2 damage wasted) | Burst fires into immunity at $t=6$ → wasted |

**→ Amplify(1) → Suppress(2).** 【命損】fired at $t = 6\text{s}$ (Slot 2) lasts 8s, covering $t = 6$ to $t = 14$. Slot 3 ($t = 12$) fires within this window — the first damage slot hits through zero DR. 【仙佑】from Slot 1 is already active ($t = 0$ + duration). Both setup effects converge on Slot 3.

Note: Suppress → Amplify (reversed order) fails because 【命損】at $t = 0$ expires at $t = 8$, before Slot 3 fires at $t = 12$.

#### 2.1.4 The 通天剑诀 (【神威冲云】) Option

`通天剑诀` → 【神威冲云】: this skill ignores all enemy damage reduction effects, +36% damage. As aux on a post-immunity damage slot, it provides per-skill DR bypass.

Two roles for 【神威冲云】:

1. **Insurance on Slot 3 (Burst):** if 【命損】's 8s window is tight ($t = 6$ to $t = 14$, Slot 3 at $t = 12$ — only 2s of overlap), adding 【神威冲云】as aux on Slot 3 guarantees DR bypass regardless of timing. The +36% damage stacks with any other effects.

2. **Replace 【命損】entirely:** if 【神威冲云】is on the Burst slot, 大罗幻诀 is freed from Slot 2. Slot 2 could then be a second damage setup (DoT, summon) or another buff. Trade-off: 【命損】covers ALL damage sources in the 8s window (DoTs, summons, etc.), while 【神威冲云】only covers the one skill it's attached to.

**Open questions:**

| # | Question | Impact |
|:---:|:---------|:-------|
| 1 | Do debuffs (【命損】) apply during immunity? | If no: suppress in Slot 2 is also wasted → amplify-only setup, 【神威冲云】becomes the only DR bypass option |
| 2 | Does 【命損】at $t = 6$ reliably reach Slot 3 at $t = 12$? ($8 - 6 = 2\text{s}$ remaining) | If too tight: 【神威冲云】insurance is necessary |
| 3 | Does 【仙佑】buff activate normally during opponent immunity? | If no: amplify in Slot 1 is also wasted |

### 2.2 Cycle Analysis

The immunity window changes cycle dynamics. In cycle 1, Slots 1–2 are setup-only (damage wasted). In cycle 2, immunity has expired — Slots 1–2 fire with full effect.

| Slot | Role | Cycle 1 ($t$) | Cycle 1 status | Cycle 2 ($t$) | Cycle 2 status |
|:-----|:-----|:-------------|:--------------|:-------------|:--------------|
| 1 | Amplify | $0\text{s}$ | Setup — damage wasted, self-buff activates | $36\text{s}$ | **Full** — re-buff + damage |
| 2 | Suppress | $6\text{s}$ | Setup — damage wasted, debuff applied (if permitted) | $42\text{s}$ | **Full** — re-debuff + damage |
| 3 | Burst | $12\text{s}$ | First damage — under buff + 【命損】 | $48\text{s}$ | Damage — under fresh buff + fresh 【命損】 |
| 4 | Exploit | $18\text{s}$ | Damage — under buff + 【命損】(tight) | $54\text{s}$ | Damage — under buff + 【命損】(tight) |
| 5 | Self-HP | $24\text{s}$ | Damage — under buff, 【命損】expired | $60\text{s}$ | Damage — under buff, 【命損】expired |
| 6 | Endure | $30\text{s}$ | Endure — under buff | $66\text{s}$ | Endure — under buff |

**Cycle 2 is full-power.** Immunity has expired. Amplify re-casts at $t = 36\text{s}$ (refreshing 48s buff, self-sustaining). Suppress re-casts at $t = 42\text{s}$ (refreshing 【命損】13.5s with 【业焰】, covering cycle 2 Slots 3–4). Both slots now deal damage in addition to their setup effects. Cycle 2 has 6 damage-dealing slots vs cycle 1's 4 — the warm-up cost of immunity is amortized.

**Buff coverage (【仙佑】+142.8% ATK/DEF/HP, 48s via 【仙露护元】):**

Amplify fires at $t = 0$: buff active from $t = 0$ to $t = 48$. Covers ALL cycle 1 slots (Slots 2–6) and cycle 2 Slots 1–2 ($t = 36, 42$). At $t = 48$ (cycle 2 Slot 3), Amplify re-casts, refreshing. Coverage is continuous.

Compare with §1: Amplify in Slot 3 ($t = 12$) covers $t = 12$ to $t = 60$ — Slots 4–6 and cycle 2 Slots 1–3. In §2, Amplify in Slot 1 covers MORE cycle 1 slots (5 vs 3). Both achieve continuous coverage from cycle 2 onward via re-cast.

**【命損】coverage (8s base, 13.5s with 【业焰】):**

Suppress fires at $t = 6$: 【命損】active from $t = 6$ to $t = 19.5$. Coverage:
- Slot 3 ($t = 12$): 7.5s remaining — comfortable
- Slot 4 ($t = 18$): 1.5s remaining — tight, partial cast coverage
- Slot 5 ($t = 24$): expired

**Structural difference from §1:** In §1, 【命損】in Slot 4 ($t = 18$) specifically covers the Self-HP slot (Slot 5, $t = 24$, 2s remaining). In §2, 【命損】covers the Burst and Exploit slots (Slots 3–4) but NOT the Self-HP slot. The Self-HP slot relies on true damage (ignores DR) and the %maxHP component of `千锋聚灵剑`.

### 2.3 Slot-by-Slot Evaluation

> Same methodology as §1.4: each slot evaluates candidates on merit. **→** marks the per-slot top candidate. The analysis assumes 【命損】applies during immunity (§2.1 open question #1); alternatives are noted where this assumption matters.

#### Slot 1: Amplify (Setup)

**Objective:** establish self-buff covering all subsequent slots. Damage is wasted (immunity) — the slot's value comes entirely from its buff.

##### Main Position

Since damage is zero, only the buff component matters:

| | Book | Buff Effect | Duration |
|:---:|:-----|:-----------|:---------|
| **→** | `甲元仙符` | +70% ATK/DEF/HP (【仙佑】) | 12s |
| 2 | `十方真魄` | +20% ATK/DR (【怒灵降世】) | 4s → 7.5s with affix |
| — | All others | No main-skill self-buff | Excluded |

**→ `甲元仙符`.** Triple-stat buff (+70% ATK/DEF/HP) dominates +20% ATK/DR on every axis. 【仙佑】is a self-buff — "释放神通时自身获得" — activates on cast, not on hit. Expected to activate normally during opponent immunity. (If not: see open question #3.)

##### Aux 1

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【龙象护身】 | `浩然星灵诀` exclusive | Buff strength ×2.04 → +142.8% ATK/DEF/HP |
| 2 | 【清灵】 | Universal | Buff strength ×1.20 → +84% ATK/DEF/HP |

**→ Buff strength ×2.04 (【龙象护身】).** Same as §1 Slot 3 — no other affix doubles buff effect strength. The ×2.04 affects every subsequent slot and cycle 2.

##### Aux 2

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【仙露护元】 | `念剑诀` exclusive | ×4 duration → 48s; covers Slots 2–6 + cycle 2 Slots 1–2 |
| 2 | 【真极穿空】 | `元磁神光` exclusive | +100% stacks, +27.5% damage; 12s (2 slots) |
| 3 | 【业焰】 | Universal | ×1.69 → 20.3s (3 slots) |

**→ Duration ×4 (【仙露护元】).** Even more decisive here than in §1. Without ×4 duration, the base 12s buff covers only Slots 2–3, barely reaching the first damage slot (Slot 3, $t = 12\text{s}$, at the edge). With ×4, 48s coverage from $t = 0$ spans the entire cycle 1 and into cycle 2, where it is refreshed at $t = 48\text{s}$.

##### Slot 1 Summary

> `甲元仙符`（主）+ `浩然星灵诀`（专属, 【龙象护身】）+ `念剑诀`（专属, 【仙露护元】）

---

#### Slot 2: Suppress (Setup)

**Objective:** apply 【命損】(-100% DR) covering the post-immunity damage slots. Damage wasted (immunity). Setup value: debuff application + counter-debuff accumulation.

##### Main Position

| | Book | $C_{12}$ Effect |
|:---:|:-----|:---------------|
| **→** | `大罗幻诀` | -100% final DR, 8s (【命損】). 60% counter-debuff (【罗天魔咒】, 8s) |
| — | All others | No source of -100% DR |

**→ `大罗幻诀`.** Only source of 【命損】in the game. 【罗天魔咒】is a self-buff — activates on cast ("为自身添加"), persists regardless of opponent immunity. When the opponent attacks during the 8s window, 【命損】applies to them via the counter mechanism ("受到攻击时，额外给目标附加【命损】"). Whether the debuff lands on an immune target is the open question #1.

##### Aux 1

The trade-off between duration extension and debuff stacking shifts in §2 vs §1. In §1 Slot 4, 【命損】already covered the next slot (Slot 5, 2s overlap) — extension unnecessary. Here, base 【命損】(8s from $t = 6$) barely reaches Slot 3 ($t = 12$, 2s remaining) and does NOT reach Slot 4 ($t = 18$):

| | Affix | Source | Effect on 【命損】coverage | Downstream |
|:---:|:------|:-------|:------------------------|:-----------|
| **→** | 【业焰】 | Universal | +69% → 13.5s: Slot 3 (7.5s), Slot 4 (1.5s) | Two damage slots under zero DR |
| 2 | 【心魔惑言】 | `天轮魔经` exclusive | No extension: Slot 3 only (2s, tight) | Debuff stacks ×2 for 【紫心真诀】 |

**→ Duration +69% (【业焰】).** Extends 【命損】from 8s to 13.5s, covering both Slot 3 (7.5s remaining — comfortable) and Slot 4 (1.5s remaining — tight but reachable). Without extension, Slot 4 (Exploit, 10-hit `皓月剑诀`) fires against full opponent DR — at 50% DR, halving its output. Two-slot coverage justifies losing debuff stacking.

**Side benefit:** 【业焰】also extends 【罗天魔咒】(8s → 13.5s), giving the counter-debuff mechanism more time to accumulate stacks from incoming attacks during the immunity window.

##### Aux 2

Damage is wasted; the best aux provides downstream value:

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【心魔惑言】 | `天轮魔经` exclusive | Debuff stacks ×2; +5.5%/5 stacks (max 27.5%) |
| 2 | 【咒书】 | Universal | Debuff strength +20% |
| 3 | 【古魔之魂】 | `大罗幻诀` exclusive | DoT +104% — wasted (immunity) |

**→ Debuff stacks ×2 (【心魔惑言】).** Since 【业焰】takes Aux 1, 【心魔惑言】moves to Aux 2. Doubles the counter-debuff accumulation rate (60% chance per incoming attack → more 【噬心之咒】and 【断魂之咒】stacks). These feed 【紫心真诀】in Slot 5 and provide the +5.5%/5 stacks damage bonus (active in cycle 2 re-cast, when this slot deals damage).

##### Slot 2 Summary

> `大罗幻诀`（主）+ Universal（【业焰】）+ `天轮魔经`（专属, 【心魔惑言】）

---

#### Slot 3: Burst (First Damage)

**Objective:** maximum output on the first post-immunity damage slot. Fires at $t = 12\text{s}$ under +142.8% ATK (【仙佑】, Slot 1) and -100% DR (【命損】, Slot 2, 7.5s remaining with 【业焰】). This is the build's single most impactful cycle 1 event — the first real damage, already buffed and penetrating.

##### Main Position

Same candidate pool as §1 Slot 1, same burst objective:

| | Book | Base Damage | Forward Effect |
|:---:|:-----|:-----------|:---------------|
| **→** | `春黎剑阵` | 22,305% ATK (5 hits) | 分身 16s: +200% damage, covers Slots 4–5 |
| 2 | `皓月剑诀` | 22,305% ATK (10 hits) + 12%maxHP × 10 | DoT, shield destroy |
| 3 | `千锋聚灵剑` | 20,265% ATK (6 hits) + 27%maxHP × 6 | +42.5%/hit escalation |
| 4 | `念剑诀` | 22,305% ATK (8 hits) | 4s untargetable, DoT zone |

**→ `春黎剑阵`.** Same reasoning as §1 Slot 1: forward value (分身) is unique. The 分身 from $t = 12$ lasts until $t = 28$, covering Slot 4 ($t = 18$, 10s remaining) and Slot 5 ($t = 24$, 4s remaining).

**分身 coverage — §2 advantage over §1.** In §1, 分身 from Slot 1 ($t = 0$) covers Slots 2–3 (Exploit and Amplify). In §2, 分身 from Slot 3 ($t = 12$) covers Slots 4–5 (Exploit and **Self-HP**). The Self-HP slot benefits from 分身's +200% damage on top of $C_6$ scaling — a synergy absent in §1.

**Buffed output.** Unlike §1 Slot 1 (fires at $t = 0$ without buff), this Burst fires under +142.8% ATK. Effective base: $22{,}305\% \times 2.428 \approx 54{,}157\%$ ATK — already 2.4× §1's unbuffed Burst before crit multiplication.

##### Aux 1

At $t = 12$, some self HP is lost from opponent attacks during immunity (est. 5–20%). But $C_6$ scaling at 10–20% HP lost yields only +20–40% — far below crit $E = 10.95$. The $C_3$ system still dominates:

**→ `解体化形`（专属）→ 【心逐神随】.** Same as §1 Slot 1 Aux 1. Unconditional stochastic multiplier, enlightenment-scaled:

| Tier | P(×4) | P(×3) | P(×2) | P(no boost) | $E$ |
|:-----|:------|:------|:------|:------------|:----|
| **悟2境, 融合63重** | **60%** | **20%** | **20%** | **0%** | **3.40** |

##### Aux 2

Given 【心逐神随】in Aux 1, the pairing analysis introduces a new dimension — the 【神威冲云】alternative from §2.1.4:

| | Aux 2 | Effect | With 【命損】(DR = 0%) | Without 【命損】(DR = 50%) | Without 【命損】(DR = 70%) |
|:---:|:------|:-------|:-------------------|:---------------------|:---------------------|
| **→** | 【灵犀九重】 | Crit ×2.97/×3.97, $E_{\text{pair}} = 10.95$ | **10.95** | 5.48 | 3.29 |
| alt | 【神威冲云】 | Ignore all DR, +36%, $E_{\text{pair}} = 4.62$ | 4.62 | **4.62** | **4.62** |
| 2 | 【天命有归】 | Certain ×4, +50% = ×6.00 | 6.00 | 3.00 | 1.80 |

**→ 【灵犀九重】(primary, assumes 【命損】active).** When 【命損】removes DR, the crit pair ($E = 10.95$) vastly outperforms alternatives. Under +142.8% ATK buff, effective: $22{,}305\% \times 2.428 \times 10.95 \approx 593{,}000\%$ ATK equivalent — the build's peak cycle 1 event.

**Alternative: 【神威冲云】(if 【命損】does not apply during immunity).** Break-even vs 【灵犀九重】:

$$10.95 \times (1 - \text{DR}) = 4.62 \implies \text{DR} \approx 57.8\%$$

Against a stronger opponent (DR 50–70%): 【灵犀九重】slightly wins at 50% DR, 【神威冲云】wins at 58%+ DR. If 【命損】status is uncertain, 【神威冲云】is the safer choice — guaranteed full output regardless of DR. Vehicle: `通天剑诀` (exclusive affix).

##### Slot 3 Summary

> **Primary:** `春黎剑阵`（主）+ `解体化形`（专属, 【心逐神随】）+ Sword school（【灵犀九重】）
> **Alt (no 【命損】, DR > 58%):** `春黎剑阵`（主）+ `解体化形`（专属, 【心逐神随】）+ `通天剑诀`（专属, 【神威冲云】）

---

#### Slot 4: Exploit

**Objective:** high sustained output. Fires at $t = 18\text{s}$ under +142.8% ATK (【仙佑】), 分身 (+200% damage, 10s remaining from Slot 3), and 【命損】(-100% DR, 1.5s remaining with 【业焰】— tight).

##### Main Position

Same candidate pool as §1 Slot 2:

| | Book | Damage Structure | Synergy at $t = 18$ |
|:---:|:-----|:----------------|:-------------------|
| **→** | `皓月剑诀` | 10 hits, 22,305% ATK, +12%maxHP/hit, shield destroy + DoT | 10 hits under 分身 (+200%); %maxHP bypasses DR if 【命損】expires mid-cast |
| 2 | `千锋聚灵剑` | 6 hits, 20,265% ATK, +27%maxHP/hit | Higher per-hit %maxHP but fewer hits |
| 3 | `念剑诀` | 8 hits, 22,305% ATK, DoT zone | No %maxHP |

**→ `皓月剑诀`.** Same as §1 Slot 2. 10-hit structure enables $C_5$/$C_{10}$ aux synergy. Under 分身 (+200%), each of 10 hits is amplified. The %maxHP component (12%/hit × 10 = 120%maxHP) is especially valuable here — if 【命損】's 1.5s remaining doesn't cover all 10 hits, %maxHP output (which may bypass DR) is the fallback.

##### Aux 1

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【玄心剑魄】 | `春黎剑阵` exclusive | DoT: 550%/s, 8s (【噬心】); on dispel → 3,300% + 2s stun |
| alt | 【心火淬锋】 | Sword school | +5%/hit, max 50%; avg +22.5% on 10 hits |

**→ Dispel trap (【玄心剑魄】).** Same as §1 Slot 2 Aux 1. Creates a dilemma: endure the DoT or dispel and take burst + stun. The 8s DoT (【噬心】) adds a debuff stack that persists into Slot 5, contributing to 【紫心真诀】's true damage.

##### Aux 2

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【无极剑阵】 | `无极御剑诀` exclusive | +555% skill damage; target gains +350% skill DR |
| alt | 【神威冲云】 | `通天剑诀` exclusive | Ignore all DR, +36% |
| 2 | 【明王之路】 | Magic school | +50% final damage |

**→ +555% skill damage (【无极剑阵】).** Same as §1 Slot 2 Aux 2. With 【命損】active (1.5s remaining), the target's +350% skill DR penalty is mitigated by -100% DR removal. The +555% on 10 hits is the largest $C_2$ modifier available.

**Alternative: 【神威冲云】(if 【命損】doesn't reach Slot 4).** Without 【命損】, the -350% penalty from 【无极剑阵】compounds with existing opponent DR — potentially catastrophic. 【神威冲云】ignores all DR cleanly: +36% damage, no penalty, guaranteed full output.

##### Slot 4 Summary

> `皓月剑诀`（主）+ `春黎剑阵`（专属, 【玄心剑魄】）+ `无极御剑诀`（专属, 【无极剑阵】）

---

#### Slot 5: Self-HP Exploit

**Objective:** convert accumulated own HP loss into maximum damage. Fires at $t = 24\text{s}$ under +142.8% ATK (【仙佑】) and 分身 (+200% damage, 4s remaining from Slot 3). 【命損】has expired ($t = 19.5$) — this slot fires against opponent's full DR.

**Structural difference from §1:** In §1, 【命損】(Slot 4) specifically covers Slot 5 — the $C_6$ scaling fires through zero DR. In §2, 【命損】(Slot 2) covers Slots 3–4 but expires before Slot 5. The Self-HP slot instead relies on:
1. **True damage** (【紫心真诀】) — ignores DR by definition
2. **%maxHP** component of `千锋聚灵剑` — may bypass DR (unverified)
3. **分身 +200%** (from Slot 3) — absent in §1, partially compensates for DR

##### Aux 1

| | Affix | Source | At 50% HP lost | Penalty |
|:---:|:------|:-------|:---------------|:--------|
| **→** | 【怒血战意】 | `玄煞灵影诀` exclusive | +100% damage | None |
| 2 | 【破釜沉舟】 | `十方真魄` exclusive | +380% damage | Self +50% damage taken |
| 3 | 【意坠深渊】 | Body school | +50% damage | None |

**→ +2%/1% own HP lost, no penalty (【怒血战意】).** Same as §1 Slot 5. At 50% HP lost: +100%. Here the buff (【仙佑】+142.8% ATK) AND 分身 (+200%) both multiply this further — a triple stack absent in §1.

##### Aux 2

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【紫心真诀】 | `惊蛰化龙` exclusive | Per debuff stack: 2.1%maxHP true damage (max 10 stacks); enlightenment: +50% HP damage, **+75% total damage** |
| 2 | 【贪狼吞星】 | Body school | +1%/1% enemy lost HP → +50% at 50% enemy lost |

**→ True damage + 75% total (【紫心真诀】).** Debuff stacks at $t = 24$ are lower than §1's: counter-debuffs from 【罗天魔咒】(extended to 13.5s, $t = 6$ to $t = 19.5$) have expired. Active debuffs: 【噬心】from Slot 4 (8s from $t = 18$, 2s remaining) plus any surviving counter-debuff stacks — estimated 2–4 stacks vs §1's 6–8.

However, the enlightenment bonus provides +75% total damage regardless of stack count — a strong $C_2$-class multiplier applying to ALL damage components (ATK%, %maxHP, 【怒血战意】scaling). The +50% to self-lost-HP damage directly enhances 【怒血战意】and `千锋聚灵剑`'s built-in HP-kick. 【紫心真诀】remains the best Aux 2 even with reduced debuff stacks.

##### Main Position

Both aux consumed by $C_6$ chain. Main needs high %maxHP base:

| | Book | Base Damage | $C_6$ Synergy |
|:---:|:-----|:-----------|:-------------|
| **→** | `千锋聚灵剑` | 20,265% ATK (6 hits) + 27%maxHP/hit; +42.5%/hit escalation | %maxHP + built-in $C_5$; ×2.0 from 【怒血战意】 |
| 2 | `皓月剑诀` | 22,305% ATK (10 hits) + 12%maxHP/hit | Higher hit count, lower per-hit %maxHP, no built-in $C_5$ |

**→ `千锋聚灵剑`.** Same as §1 Slot 5. 27%maxHP/hit × 6 = 162%maxHP is the highest %maxHP concentration. Built-in +42.5%/hit escalation provides $C_5$ without consuming an aux.

**分身 bonus (§2 exclusive).** 分身 (+200% damage, 4s remaining from Slot 3) amplifies all hits that complete within 4s. In §1, 分身 from $t = 0$ expired at $t = 16$ — nowhere near Slot 5 at $t = 24$. In §2, 分身 from $t = 12$ reaches $t = 28$, covering this slot. Under 分身: 162%maxHP × 3.0 (1 + 200%) = 486%maxHP equivalent — even without 【命損】, this is devastating if %maxHP bypasses DR.

##### Slot 5 Summary

> `千锋聚灵剑`（主）+ `玄煞灵影诀`（专属, 【怒血战意】）+ `惊蛰化龙`（专属, 【紫心真诀】）

---

#### Slot 6: Endure

**Objective:** survive the endgame, suppress opponent healing. Same requirements as §1 Slot 6.

##### Main Position

| | Book | Survival Mechanic |
|:---:|:-----|:-----------------|
| **→** | `十方真魄` | +20% ATK/DR, 7.5s; 30%/s CC cleanse (【怒灵降世】, 【星猿弃天】) |
| 2 | `疾风九变` | Reflect 50% + HP recovery (【极怒】, 【星猿复灵】) |

**→ `十方真魄`.** Same as §1 Slot 6. CC cleanse is critical in endgame against a stronger opponent.

##### Aux 1

| | Affix | Source | Effect |
|:---:|:------|:-------|:-------|
| **→** | 【心火淬锋】 | Sword school | +5%/hit, max 50%; avg +22.5% on 10 hits |
| alt | 【意坠深渊】 | Body school | +50% at low HP |

**→ Per-hit +22.5% (【心火淬锋】).** Same as §1 Slot 6 Aux 1. 10 hits on `十方真魄` fully activates $C_5$. Vehicle: any Sword school book not used in Slot 3 (if Slot 3 uses `通天剑诀` for 【灵犀九重】, use `新-青元剑诀` here; vice versa).

##### Aux 2

| | Affix | Source | Healing reduction | Undispellable? |
|:---:|:------|:-------|:-----------------|:--------------|
| **→** | 【天哀灵涸】 | `千锋聚灵剑` exclusive | -31%, 8s | **Yes** |
| 2 | 【天倾灵枯】 | `甲元仙符` exclusive | -31%/-51%, 20s | No |

**→ -31% undispellable (【天哀灵涸】).** Same as §1 Slot 6 Aux 2. Undispellable anti-healing is decisive against a stronger opponent with dispel.

##### Slot 6 Summary

> `十方真魄`（主）+ Sword school（【心火淬锋】）+ `千锋聚灵剑`（专属, 【天哀灵涸】）

---

### 2.4 Summary

#### Assignment Table

| Slot | Specification | Primary Feature | Objective |
|:-----|:-------------|:---------------|:----------|
| 1 | `甲元仙符`（主）+ `浩然星灵诀`（专属）+ `念剑诀`（专属） | +142.8% ATK/DEF/HP for 48s (【仙佑】×【龙象护身】×【仙露护元】) | Amplify (Setup) |
| 2 | `大罗幻诀`（主）+ Universal（【业焰】）+ `天轮魔经`（专属） | 【命損】13.5s covering Slots 3–4 + debuff stacks ×2 (【业焰】, 【心魔惑言】) | Suppress (Setup) |
| 3 | `春黎剑阵`（主）+ `解体化形`（专属）+ Sword school（【灵犀九重】） | Crit $E \approx$ ×10.95 + 分身 16s covering Slots 4–5 (【心逐神随】, 【灵犀九重】) | Burst |
| 4 | `皓月剑诀`（主）+ `春黎剑阵`（专属）+ `无极御剑诀`（专属） | 10-hit %maxHP + dispel trap + +555% skill damage (【玄心剑魄】, 【无极剑阵】) | Exploit |
| 5 | `千锋聚灵剑`（主）+ `玄煞灵影诀`（专属）+ `惊蛰化龙`（专属） | +2%/1% HP lost + true damage + 75% total + 分身 bonus (【怒血战意】, 【紫心真诀】) | Self-HP |
| 6 | `十方真魄`（主）+ Sword school（【心火淬锋】）+ `千锋聚灵剑`（专属） | CC cleanse + per-hit +22.5% + -31% healing undispellable (【星猿弃天】, 【心火淬锋】, 【天哀灵涸】) | Endure |

#### Verification

**Cross-type reuse** (main in one slot, aux in another):

| Book | Main | Aux | Legal? |
|:-----|:-----|:----|:-------|
| `春黎剑阵` | Slot 3 | Slot 4 | Cross-type ✓ |
| `千锋聚灵剑` | Slot 5 | Slot 6 | Cross-type ✓ |

**Core conflict check:** All 6 mains distinct → no core conflict.

**Secondary conflict check:** Sword school vehicle books for Slot 3 and Slot 6 must be different (e.g., `通天剑诀` for one, `新-青元剑诀` for the other) → no secondary conflict.

#### Structural Comparison with §1

| Aspect | §1 (Against Stronger) | §2 (Initial Immunity) |
|:-------|:---------------------|:---------------------|
| Slot 1 | Burst (`春黎剑阵`) | Amplify (`甲元仙符`) — setup |
| Slot 2 | Exploit (`皓月剑诀`) | Suppress (`大罗幻诀`) — setup |
| Slots 3–6 | Amplify → Suppress → Self-HP → Endure | Burst → Exploit → Self-HP → Endure |
| Buff coverage start | $t = 12\text{s}$ (Slot 3) | $t = 0\text{s}$ (Slot 1) |
| Cycle 1 buffed slots | 3 (Slots 4–6) | 5 (Slots 2–6) |
| 【命損】covers | Slot 5 (Self-HP) | Slots 3–4 (Burst + Exploit) |
| Self-HP under 【命損】? | **Yes** (Suppress in Slot 4) | **No** (Suppress in Slot 2, expired) |
| 分身 covers Self-HP? | **No** (Slot 1 → expires at $t = 16$) | **Yes** (Slot 3 → expires at $t = 28$) |
| Slot 2 Suppress aux | 【心魔惑言】+ 【追神真诀】 | 【业焰】+ 【心魔惑言】 |
| Book pool | 15 distinct books | **Same 15 books** — only ordering changes |
| Cycle 2 setup re-cast | Amplify only ($t = 48$) | **Both** Amplify ($t = 36$) + Suppress ($t = 42$) |

**Key trade-off:** §1 places 【命損】immediately before the Self-HP slot — the $C_6$ scaling fires through zero DR. §2 places 【命損】earlier, covering the Burst and Exploit slots instead. §2 compensates with: (1) true damage on Slot 5 ignores DR, (2) 分身 (+200%) from Slot 3 reaches Slot 5 (absent in §1), and (3) cycle 2 refreshes both Amplify and Suppress (§1 only refreshes Amplify in cycle 2).

### 2.5 Design Insights

**1. Immunity converts two slots into free setup.** Slots 1–2 deal zero damage but provide full buff/debuff value. Rather than waste high-damage skills into immunity, the build front-loads the setup phase — a gain that persists for the entire fight.

**2. 分身 reaches the Self-HP slot.** With Burst in Slot 3 (instead of Slot 1), 分身 (16s) covers Slots 4–5, including Self-HP. Under 分身, `千锋聚灵剑`'s 162%maxHP is effectively 486%maxHP. This synergy is absent in §1 and partially compensates for losing 【命損】on Slot 5.

**3. 【命損】coverage trades depth for breadth.** In §1, 【命損】covers 1 slot (Self-HP) — the highest-value target. In §2, 【命損】covers 2 slots (Burst + Exploit) — the two highest-base-damage slots. The total DR-removed damage across 2 slots may exceed the DR-removed damage on 1 slot, especially since the Burst slot carries the $E \approx$ ×10.95 crit multiplier.

**4. Cycle 2 is full-power.** Both Amplify ($t = 36$) and Suppress ($t = 42$) re-cast in cycle 2 — now dealing damage AND refreshing their setup effects. §1 cycle 2 only re-casts Amplify; Suppress doesn't fire again until $t = 54$ (Slot 4). §2 cycle 2 has fresh 【命損】covering Slots 3–4 again, achieving the same coverage pattern as cycle 1.

**5. Same book pool, different slot assignment.** The immunity scenario uses the same 15 distinct books as §1. The build doesn't need new books — only a different ordering. This makes the two configurations switchable between matchups using the same underlying book collection.

**6. 【神威冲云】as contingency for open question #1.** If debuffs (【命損】) cannot be applied during immunity, the Slot 2 Suppress setup partially fails. 【神威冲云】on Slot 3 Aux 2 provides per-skill DR bypass independently: $E = 4.62$ through any DR, vs $E = 10.95$ at 0% DR. The break-even (DR ≈ 58%) suggests 【神威冲云】is the correct choice if 【命損】is unavailable AND opponent DR exceeds ~58%.

---

## 3. Standard PvP Meta (Mutual Immunity)

### 3.1 Scenario

In practice, the most common PvP scenario is not fighting a stronger or weaker opponent — it is fighting an **equal**. Both players have access to the same resources, same instruments, and same game data. Most players copy ye's Book Set 1 and apply a slot reorder (Slots 1↔3, 2↔1, 3↔2), arriving at a Burst(1)→Exploit(2)→Amplify(3) ordering — the same strategic logic as our §1. Additionally, immunity instruments (8–12s) are standard equipment; **both** players activate them.

**Assumptions:**

| | Value |
|:--|:------|
| Power differential | Equal (similar stats, fusion, enlightenment) |
| Immunity | **Mutual** — both players have 8–12s instruments |
| Opponent build | ye.1 reordered: Burst(1)→Exploit(2)→Amplify(3)→Suppress(4)→DoT(5)→Endure(6) |
| Our build | §2: Amplify(1)→Suppress(2)→Burst(3)→Exploit(4)→Self-HP(5)→Endure(6) |
| Fight duration | Longer than §1/§2 (equal power → neither has decisive early advantage) → cycle 2 likely |

### 3.2 The Opponent: ye.1 Reordered

ye.1 original (from `data/books/ye.md`), with Slots 1–3 reordered:

| Slot | Main | Aux 1 | Aux 2 | Role |
|:-----|:-----|:------|:------|:-----|
| 1 | `春黎剑阵` | `解体化形`（【心逐神随】） | `周天星元`（**【天命有归】**） | Burst |
| 2 | `皓月剑诀` | `春黎剑阵`（【玄心剑魄】） | `无极御剑诀`（【无极剑阵】） | Exploit |
| 3 | `甲元仙符` | `元磁神光`（**【真极穿空】**） | `浩然星灵诀`（【龙象护身】） | Amplify |
| 4 | `大罗幻诀` | `天轮魔经`（【心魔惑言】） | `皓月剑诀`（【追神真诀】） | Suppress |
| 5 | `念剑诀` | `惊蛰化龙`（【紫心真诀】） | `焚圣真魔咒`（【天魔真解】） | DoT |
| 6 | `十方真魄` | `玄煞灵影诀`（【意坠深渊】） | `念剑诀`（**【仙露护元】**） | Endure |

The reorder applied the correct **strategic logic** (burst-first for cycle 2 re-casts), but the **aux composition was not adapted**. Three mismatches result from copying without understanding:

**Mismatch 1: 【真极穿空】on Amplify (Slot 3).** ye's original Amplify was Slot 1 — the strength path (【真极穿空】: +27.5% stacking damage, 12s buff) made sense because 12s covered the next 2 slots (Burst, Exploit). After reordering to Slot 3, 12s covers Slots 4–5 only. Cycle 2 Burst ($t = 36\text{s}$) fires **without any buff** — the build's highest-damage re-cast has no amplification.

**Mismatch 2: 【仙露护元】stranded on Slot 6.** ye.1 uses 【仙露護元】to extend 【怒灵降世】(+20% ATK/DR) from 7.5s to 30s — a modest endgame sustain buff. Meanwhile, Amplify's +142.8% buff (【仙佑】×【龙象护身】) lasts only 12s. Relocating 【仙露護元】from Slot 6 to Amplify would extend +142.8% to **48s** — the value of ×4 duration on a 142.8% buff vs a 20% buff is incomparable.

**Mismatch 3: 【天命有归】on Burst.** ye.1 uses 【天命有归】(deterministic ×6.00) for Burst crit. At 悟2境, 【灵犀九重】paired with 【心逐神随】yields $E = 10.95$ — **+82.5%** on the single most important damage event.

### 3.3 Two Layers of Advantage

#### 3.3.1 Layer 1 — Strategic: Slot Ordering for Immunity

Under mutual immunity (8–12s), both players' Slots 1–2 fire into the opponent's immunity shield:

| | Opponent (ye.1 reordered) | Us (§2) |
|:--|:--------------------------|:--------|
| Slot 1 fires into immunity | **Burst** (`春黎剑阵`, ×6.00 crit) — **wasted** | **Amplify** (`甲元仙符`) — damage wasted, **self-buff preserved** |
| Slot 2 fires into immunity | **Exploit** (`皓月剑诀`, 120%maxHP) — **wasted** | **Suppress** (`大罗幻诀`) — damage wasted, **debuff mechanism preserved** |
| Cycle 1 damage lost | ~40% of total cycle 1 output | ~0% (setup, not damage) |
| First real damage | Slot 3 ($t = 12$): Amplify — **21,090% ATK (no crit, no buff)** | Slot 3 ($t = 12$): Burst — **$E \approx 593{,}000\%$ ATK (buffed + crit + 【命損】)** |

The opponent's two strongest damage skills — their carefully reordered Burst and Exploit — fire into nothing. Our two setup skills lose only their negligible damage component while their strategic value (buff activation, debuff application) is fully preserved.

**分身 asymmetry.** The opponent's 分身 fires at $t = 0$ → lasts until $t = 16$. During our immunity (8–12s), the 分身 attacks deal zero damage. Post-immunity, only 4–8s of 分身 remain. Our 分身 fires at $t = 12$ (post-immunity) → lasts until $t = 28$, with full damage for the entire 16s window.

#### 3.3.2 Layer 2 — Technical: Aux Innovations

Even on a hypothetical level playing field (same ordering, no immunity), our aux composition outperforms ye.1:

| Innovation | ye.1 | Ours | Gain | Status |
|:-----------|:-----|:-----|:-----|:-------|
| **Burst crit** | 【天命有归】→ ×6.00 | 【灵犀九重】→ $E = 10.95$ | **+82.5%** on Burst | Pending verification |
| **Buff duration** | 【仙露護元】on Slot 6 (+20% → 30s) | 【仙露護元】on Amplify (+142.8% → 48s) | **9+ buffed activations** vs 2 | Pending verification |
| **Self-HP exploit** | `念剑诀` + 【天魔真解】(DoT sustain) | `千锋聚灵剑` + 【怒血战意】(×2.0 at 50% HP) | **+100% on Slot 5** at 50% HP lost | Pending verification |
| **Anti-healing** | None | 【天哀灵涸】(-31%, undispellable) | **New capability** | Confirmed |
| **【命損】extension** (§2) | 8s (1 slot) | 13.5s via 【业焰】(2 slots) | **2× DR-removal coverage** | Pending verification |

Each innovation is independent — any one of them provides a meaningful edge. Combined, they represent a qualitative improvement over the standard build.

#### 3.3.3 Layer 3 — Investment: 解体化形 Enlightenment

The 【灵犀九重】technique (Layer 2) only works at high 解体化形 enlightenment. Most players follow ye's resource allocation guidance: invest in main-position books first (`春黎剑阵`, `皓月剑诀`, `甲元仙符`, etc.). `解体化形` — which only ever appears in auxiliary positions — is deprioritized. Most players remain at **悟0境**.

This creates a regime barrier that makes the technique invisible:

| `解体化形` tier | 【心逐神随】$E$ | With 【灵犀九重】$E$ | vs 【天命有归】×6.00 | P(【灵犀九重】loses) | Rational choice |
|:---------------|:-------------|:----------------|:-------------------|:-------------------|:---------------|
| **悟0境** | 1.93 | 6.21 | +3.5% | **64%** | **【天命有归】** — deterministic wins |
| **悟2境** | 3.40 | **10.95** | **+82.5%** | **15%** | **【灵犀九重】** — stochastic dominates |

**The chicken-and-egg barrier.** A player at 悟0 who discovers 【灵犀九重】and tests it would correctly find it unreliable — 49% of the time 【心逐神随】doesn't fire (no boost), and the resulting ×2.97 or ×3.97 is well below ×6.00. The rational response is to dismiss 【灵犀九重】and keep 【天命有归】. This is not an error at 悟0 — it IS the correct choice.

But this correct rejection prevents the investment in 解体化形 that would reveal the regime transition. At 悟2, the no-boost probability drops from 49% to **0%**, and P(×4) jumps from 11% to **60%**. The technique transforms from marginally worse to categorically superior. Players never reach this threshold because the technique "doesn't work" at the threshold they're at.

**Amplification factor.** The investment 悟0→悟2 converts 【灵犀九重】from a +3.5% marginal gain into a +82.5% transformative advantage — a **23× amplification** of the technique's value from the same enlightenment investment.

**Resource allocation insight.** Investing in `解体化形` (auxiliary book) has higher marginal ROI than investing in any main-position book past a certain threshold. Main books scale linearly (more fusion → more base damage%). `解体化形` scales via a **phase transition** — the value is near-zero until the threshold, then jumps discontinuously. This non-linear return is invisible to the standard "upgrade main books first" heuristic.

### 3.4 Per-Slot Comparison Under Mutual Immunity

Side-by-side at each time step. **Bold** = active buff/debuff. *Italic* = wasted by immunity.

| $t$ | Opponent (ye.1 reordered) | Us (§2) |
|:----|:--------------------------|:--------|
| $0\text{s}$ | *Burst: 春黎剑阵 ×6.00 crit → our immunity* | Amplify: **+142.8% ATK/DEF/HP** buff activates (48s) |
| $6\text{s}$ | *Exploit: 皓月剑諾 120%maxHP → our immunity* | Suppress: **【命損】-100% DR** (13.5s), counter-debuffs |
| $12\text{s}$ | Amplify: +142.8% buff (12s, expires $t=24$); 21,090% ATK | **Burst: 春黎剑阵 $E ≈ 10.95$ × 54,157% ATK** (buffed) under **【命損】** |
| $18\text{s}$ | **Suppress**: 【命損】-100% DR (8s → Slot 5) | **Exploit: 皓月剑诀** 10-hit under **buff + 分身 + 【命損】(1.5s)** |
| $24\text{s}$ | **DoT**: 念剑诀 under buff + 【命損】| **Self-HP: 千锋聚灵剑** under **buff + 分身(4s) + 【怒血战意】×2.0** |
| $30\text{s}$ | Endure: 十方真魄. Buff expired ($t=24$). | **Endure: 十方真魄** under **buff (until $t=48$)** + **-31% anti-heal** |
| $36\text{s}$ | Burst re-cast: **no buff** (expired), ×6.00 crit | **Amplify re-cast: buff refreshed** + 21,090% ATK damage |
| $42\text{s}$ | Exploit re-cast: **no buff**, no 【命損】 | **Suppress re-cast: 【命損】refreshed** + 20,265% ATK damage |
| $48\text{s}$ | Amplify re-cast: buff refreshes (12s → $t=60$) | **Burst re-cast: $E ≈ 10.95$ under fresh buff + fresh 【命損】** |

**Cycle 2 divergence.** The opponent's cycle 2 Burst ($t = 36$) and Exploit ($t = 42$) fire without any buff — their 12s buff expired at $t = 24$. Our cycle 2 Burst ($t = 48$) fires under **fresh** +142.8% ATK (re-cast at $t = 36$) AND **fresh** 【命損】(re-cast at $t = 42$). The opponent doesn't achieve this dual-setup convergence until their cycle 2 Slot 5 at the earliest.

### 3.5 Design Insights

**1. Information is the true edge.** Both players access the same books, same instruments, same game. The advantage comes entirely from understanding the interaction between immunity, slot ordering, and aux composition. Copying ye's build without understanding why each aux was chosen produces a suboptimal build when the strategic context changes (Slot 1→3 reorder, immunity instruments).

**2. Strategic and technical gains are independent and multiplicative.** The slot ordering advantage (Layer 1: ~40% of opponent's damage wasted) and the aux innovations (Layer 2: +82.5% Burst, 48s buff, Self-HP exploit) compound. Even if the opponent somehow adapted their ordering for immunity, our technical innovations still provide a substantial edge. Even if they discovered 【灵犀九重】, our ordering advantage under mutual immunity remains.

**3. 【仙露護元】relocation is the highest-impact design decision.** ye.1 uses 【仙露護元】to extend a +20% buff from 7.5s to 30s — a total of $20\% \times 30\text{s} = 600\%\text{s}$ of buff-time. Our relocation extends a +142.8% buff from 12s to 48s — a total of $142.8\% \times 48\text{s} = 6{,}854\%\text{s}$ of buff-time. The relocated use delivers **11.4× more buff-time value** from the same affix. This single decision restructures the entire temporal dynamics of the build.

**4. 解体化形 enlightenment is the hidden prerequisite.** The 【灵犀九重】technique (Layer 2) and the 解体化形 investment (Layer 3) are coupled: without 悟2境, the technique is rationally rejected. Without the technique, the investment seems pointless. This chicken-and-egg barrier is self-reinforcing — players at 悟0 never see the 悟2 regime. The resource allocation heuristic ("upgrade main books first") actively prevents discovery. The result: a durable, three-layer advantage (ordering × technique × investment) where each layer protects the others from imitation.

**5. The meta is self-correcting but slow.** Once immunity instruments became standard, the optimal PvP build shifted from Burst-first (§1) to Amplify-first (§2). But because most players copy ye.1 without understanding the logic, the meta lags behind the optimal. Every fight against a ye.1 copier under mutual immunity is a structural mismatch in our favor. The edge persists until the meta catches up — and the 解体化形 investment barrier slows catch-up further, since even a player who discovers the correct ordering and technique must spend significant time and resources upgrading an auxiliary book.

**6. All innovations require verification.** The theoretical gains — 【灵犀九重】's $E = 10.95$, 【仙露護元】's 48s coverage, 【怒血战意】's ×2.0 at 50% HP — are derived from the game data and probability analysis but are pending empirical testing. Any single confirmed innovation over ye.1 is a significant gain in practice.

---

## Appendix A: Parameters

### Game Constants

| Parameter | Symbol | Value | Notes |
|:----------|:-------|:------|:------|
| Number of slots | $n$ | 6 | Fixed by game design |
| Affix positions per slot | — | 1 main + 2 auxiliary | Main is deterministic; auxiliaries are targeted (exclusive > school > universal) |

### Observed Parameters

| Parameter | Symbol | Observed | Notes |
|:----------|:-------|:---------|:------|
| Firing sequence time gap | $T_{gap}$ | ~6s | Time between consecutive slot activations. Empirical; not a known game constant |
| Slot activation time | $T_{cast}$ | unknown | Duration of a single skill cast. Varies by skill |
| Cycle duration | $T_{cycle}$ | ~36s | $n \times T_{gap}$; time for one complete sequence |

### Derived Relations

Temporal coverage of any effect with duration $d$:

$$\text{subsequent slots covered} = \left\lfloor \frac{d}{T_{gap}} \right\rfloor$$

Overlap window — time remaining from a prior-slot effect when the next slot fires:

$$T_{overlap} = d - T_{gap}$$

Total sequence duration (one cycle):

$$T_{cycle} = n \times T_{gap}$$

Cycle 2 activation time for Slot $k$ (1-indexed):

$$t_{k,2} = T_{cycle} + (k - 1) \times T_{gap}$$

### Coverage Table ($T_{gap} = 6\text{s}$)

| Duration | Slots covered | $T_{overlap}$ | Example |
|:---------|:-------------|:---------------|:--------|
| 8s | 1 | 2s | -100% DR (【命損】) |
| 12s | 2 | 0s (critical boundary) | +70% ATK/DEF/HP (【仙佑】) base |
| 16s | 2 | 4s | 分身 |
| 20s | 3 | 2s | — |
| 48s | all 5 subsequent + cycle 2 | 18s | +142.8% ATK/DEF/HP (【仙佑】×【龙象护身】×【仙露护元】) |

---

## Appendix B: Category Definitions ($C_n$)

| $C_n$ | Name | Description |
|:------|:-----|:-----------|
| $C_0$ | Common Mechanics | Fusion, mastery, enlightenment, cooldown |
| $C_1$ | Base Damage | Base attack %, percent max HP, shield destruction |
| $C_2$ | Damage Multipliers | ATK bonus, damage increase, skill damage, crit damage, flat extra |
| $C_3$ | Critical System | Guaranteed crit, probability multiplier, conditional crit |
| $C_4$ | Condition Triggers | Conditional damage/buff, ignore reduction, probability → certain |
| $C_5$ | Per-Hit Escalation | Escalation patterns, periodic escalation |
| $C_6$ | HP-Based Calculation | Self lost HP, enemy lost HP, min threshold, HP cost, lost HP damage |
| $C_7$ | Healing & Survival | Lifesteal, healing-to-damage, healing increase, damage reduction |
| $C_8$ | Shield System | Shield strength, shield expire damage, damage-to-shield |
| $C_9$ | State Modification | Buff/debuff strength, duration, stacks |
| $C_{10}$ | DoT Mechanics | DoT ticks, DoT damage increase, extended DoT, on-dispel effects |
| $C_{11}$ | Self Buffs | Self buff, buff extension, counter buff, next-skill buff, enlightenment bonus |
| $C_{12}$ | Debuffs | Debuff application, conditional debuff, counter debuff, periodic cleanse |
| $C_{13}$ | Special Mechanics | Summons, untargetable, dispel/cleanse, delayed burst, random effects, per-stack damage |

---

## Document History

| Version | Date | Changes |
|:--------|:-----|:--------|
| 1.0 | 2026-02-26 | Initial: "Against Stronger Opponent" section |
| 2.0 | 2026-02-26 | Restructured: result upfront, brief assumptions, parameters to appendix, exhaustive candidate tables with proof for each selection |
| 3.0 | 2026-02-26 | Cycle principle: reorder Slots 1–3 (Burst→Exploit→Amplify). 48s buff coverage via 【仙露护元】. Multi-category evaluation for aux positions. Slot 6 aux revised (【心火淬锋】). Alternatives discussed for each decision point |
| 4.0 | 2026-02-26 | Restructured construction process: per-slot evaluation (no premature exclusion) → global assignment (contention resolution) → alternatives (Assignment A multi-cycle, Assignment B short-fight, aux-level variants). All "reserved for" / "excluded" reasoning replaced with merit-based analysis |
| 5.0 | 2026-02-26 | **Probability interpretation corrected.** 悟2境 data ($x{=}60, y{=}80, z{=}100$, sum $>100\%$) proves cumulative reading. 悟0境 corrected from independent (E=2.46) to cumulative (E=1.93). Added 悟2境 tier: E[心逐]=3.40, E[#3]=10.95 (+82.5% over #1). Discovery: enlightenment shifts qualitative optimum — #1 wins at 悟0, #3 dominates at 悟2. All downstream references updated |
| 6.0 | 2026-02-26 | **§2 slot-by-slot construction.** Full Main → Aux 1 → Aux 2 evaluation for immunity scenario: Amplify(1) → Suppress(2) → Burst(3) → Exploit(4) → Self-HP(5) → Endure(6). Key findings: 【业焰】extends 【命損】to 13.5s (2-slot coverage), 分身 reaches Self-HP (§2 exclusive synergy), cycle 2 re-casts both setup effects, same 15-book pool as §1. 【神威冲云】contingency for open question #1 |
| 7.0 | 2026-02-26 | **§3 standard PvP meta analysis.** Mutual immunity scenario with equal opponents. ye.1 reordered as known opponent build. Three-layer advantage: strategic (ordering, ~40% wasted) + technical (【灵犀九重】+82.5%, 【仙露護元】relocation 11.4×) + investment (解体化形 悟0→悟2 regime transition, 23× amplification, chicken-and-egg barrier). Per-slot comparison through cycle 2 |
