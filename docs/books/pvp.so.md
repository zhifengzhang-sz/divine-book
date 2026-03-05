---
initial date: 2026-3-2
dates of modification: [2026-3-2]
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

# PvP Construction: Strong Opponent (O1)

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Mechanical application of [chain.md](chain.md) Construction Methodology (§A–§F).** Three table lookups and one optimization — no narrative reasoning. Every value is read from chain.md's catalogs and solution tables.

---

## Scenario Analysis — "Strong Opponent"

### What the stat gap means mechanically

A "strong opponent" is one with meaningfully higher base stats (ATK, DEF, HP) from gear and cultivation. This creates four mechanical consequences:

| Consequence | Mechanism | Implication |
|:------------|:----------|:------------|
| **Higher incoming damage** | Opponent ATK > self DEF → each enemy skill removes a larger fraction of your HP | Self HP drops faster than opponent HP. Survival tools (cleanse, DR during cast, untargetable) are mandatory, not optional. |
| **Damage reduction wall** | Strong opponents carry 50%–70% DR from defensive stats and gear | Raw damage output is halved or worse. Without DR removal or bypass, even ×10 multiplied burst cannot kill. DR handling is a hard requirement. |
| **HP pool asymmetry** | Opponent maxHP >> self maxHP | You must deal proportionally more total damage to reach lethal. Short-horizon burst alone (O4-style) is insufficient — you cannot kill before they kill you. |
| **Healing / sustain gap** | Strong opponents have access to dispels and healing sources | Any recoverable damage is wasted. Anti-heal must be undispellable (opponent has dispels) or sustained (long duration). Without anti-heal, the fight is unwinnable by attrition. |

### The resource inversion

The stat gap creates a counterintuitive resource: **your own HP loss**. Because the opponent hits harder:

- Self HP drops rapidly → mechanics that scale with `per_self_lost_hp` gain value passively (no enabler needed)
- At 50% HP lost: 【怒血战意】provides +100% damage — for free, because the opponent supplies the HP loss
- 【意坠深渊】(HP-loss floor enabler) and 【破釜沉舟】(accelerated self-damage) are **redundant** — the opponent already provides the resource they create

This means F_hp_exploit is both viable and high-value without spending an aux slot on an enabler.

### Horizon derivation

Against a stat-disadvantaged self:
- 6 灵書 × ~7s average cast cycle ≈ 42–44s full rotation
- Self cannot kill before full rotation (stat gap prevents early lethal)
- Self must survive the full rotation to accumulate enough total damage
- **Horizon ≈ 43s** (long) — buffs must cover the entire window

### Mapping to Objective Inventory [chain.md §C]

| Scenario condition | Maps to | §C match |
|:-------------------|:--------|:---------|
| Opponent stats higher → need to survive | F_survive | O1 ✓ |
| 50%+ DR wall | F_dr_remove | O1 ✓ |
| Long horizon → full-rotation buff needed | F_buff | O1 ✓ |
| Self HP drops faster → HP loss as resource | F_hp_exploit | O1 ✓ |
| Opponent has healing + dispels | F_antiheal | O1 ✓ |
| Must reach lethal total → maximized burst slot | F_burst | O1 ✓ |

All 6 conditions match **O1** (vs stronger, stat gap). No other objective row matches all 6.

---

## Phase 1 — Objective Readoff [chain.md §C → O1]

| Field | Value |
|:------|:------|
| Objective | O1 — vs stronger (stat gap) |
| Win condition | Survive + exploit HP loss → lethal total damage |
| Horizon | Long (~43s) |
| Required functions | **F_burst, F_dr_remove, F_buff, F_hp_exploit, F_antiheal, F_survive** |

> 6 functions → 5 dedicated slots (F_antiheal folds into F_survive) + 1 derived slot.

---

## Phase 2 — Solution Lookup [chain.md §D → Layer 2]

For each required function: consult §D Function Catalog for qualifying foundations, then the Layer 2 Solution Tables for scored candidates.

### F_burst — Maximize single-slot damage output

**Qualifying foundations** [chain.md §D]: F1, F2, F3, F4 (high base); F5–F9 (moderate).

**With 【心逐神随】 (monopoly `probability_multiplier`, ×3.40 E[multiplier]):**

| # | Foundation | Op1 | Op2 | S_same | S_cross | Notes |
|:--|:-----------|:----|:----|:-------|:--------|:------|
| 1 | F1 `千锋聚灵剑` | 【心逐神随】 | 【灵犀九重】 | ×10.95 | — | 162%maxHP base |
| 2 | F3 `皓月剑诀` | 【心逐神随】 | 【灵犀九重】 | ×10.95 | — | 240%maxHP (shieldless) |
| 3 | F2 `春黎剑阵` | 【心逐神随】 | 【灵犀九重】 | ×10.95 | 分身 16s (×3.40 buffed) | +summon DPS |
| 4 | F4 `念剑诀` | 【心逐神随】 | 【灵犀九重】 | ×10.95 | untargetable 4s | 21 hits, ×28.9 peak |
| 5 | F1 `千锋聚灵剑` | 【心逐神随】 | 【神威冲云】 | ×9.24 at 50% DR | — | DR bypass, same-slot |

**Without 【心逐神随】:**

| # | Foundation | Op1 | Op2 | S_same | S_cross | Notes |
|:--|:-----------|:----|:----|:-------|:--------|:------|
| 6 | F3 `皓月剑诀` | 【心火淬锋】 | 【灵犀九重】 | ~×4.0 | — | +50% esc. on 10 hits + ×2.97 会心 |
| 7 | F1 `千锋聚灵剑` | 【心火淬锋】 | 【灵犀九重】 | ~×3.1 | — | esc. + ×2.97 会心 on 6 hits |
| 8 | F2 `春黎剑阵` | 【业焰】 | 【灵犀九重】 | ×2.97 | 分身 16s→27s (+69%) | extended summon, weaker burst |
| 9 | F2 `春黎剑阵` | 【业焰】 | 【心火淬锋】 | moderate | 分身 16s→27s | esc. + duration, no 会心 |

> **Gap:** ×10.95 vs ~×4.0 — 【心逐神随】 provides a **2.7× advantage** over the best non-心逐 alternative. This is the monopoly effect: `probability_multiplier` (×3.40) occupies an otherwise empty multiplier zone, and no other operator accesses it. The optimization will strongly prefer 心逐 on the primary burst slot; the question is which foundation and which Op2.

### F_dr_remove — Remove/bypass enemy DR

**Qualifying foundations** [chain.md §D]: F6 (命損 cross, 8s); any+【神威冲云】(same-灵書 only).

| # | Foundation | Op1 | Op2 | S_same | S_cross | Notes |
|:--|:-----------|:----|:----|:-------|:--------|:------|
| 1 | F6 `大罗幻诀` | 【心魔惑言】 | 【追神真诀】 | debuff ×2 + 26.5% lost HP/tick | 命損 −100% DR 8s; stacks | +300% dmg at 悟10 |
| 2 | F6 `大罗幻诀` | 【心魔惑言】 | 【九雷真解】 | debuff ×2 + 152.4%/enemy atk | 命損 −100% DR 8s; stacks | reactive scaling |
| 3 | F6 `大罗幻诀` | 【心魔惑言】 | 【业焰】 | debuff ×2 + states +69% | 命損 8s→13.5s; stacks | extended DR window |
| 4 | F6 `大罗幻诀` | 【天命有归】 | 【心魔惑言】 | 100% counter + debuff ×2 | 命損 −100% DR 8s; stacks | deterministic |

> F6 is the only source of 命損 (cross-灵書 −100% DR). All solutions include 【心魔惑言】 (debuff ×2 doubles both reactive damage and stack output).

### F_buff — Persistent team stat buff

**Qualifying foundations** [chain.md §D]: F5 (仙佑 +142.8%, 48s); F8 (怒灵降世 +20%, 7.5s).

| # | Foundation | Op1 | Op2 | S_same | S_cross | Notes |
|:--|:-----------|:----|:----|:-------|:--------|:------|
| 1 | F5 `甲元仙符` | 【龙象护身】 | 【仙露护元】 | 21,090% ATK | +142.8% ATK/DEF/HP 48s; +387.6% healing 48s | **forced** — only full-horizon buff |
| 2 | F5 `甲元仙符` | 【龙象护身】 | 【清灵】 | 21,090% ATK | +142.8% ATK/DEF/HP 12s | 4× shorter |
| 3 | F5 `甲元仙符` | 【龙象护身】 | 【业焰】 | 21,090% ATK | +142.8% ATK/DEF/HP 20.3s | <½ horizon |

> **Rank 1 is structurally forced.** No other combination achieves 48s coverage at +142.8% strength. Three books locked: `甲元仙符` + `浩然星灵诀` + `念剑诀`.

### F_hp_exploit — Convert own HP loss → damage

**Qualifying foundations** [chain.md §D]: any+【怒血战意】; F8/F9 (HP cost creates resource).

| # | Foundation | Op1 | Op2 | S_same | S_cross | Notes |
|:--|:-----------|:----|:----|:-------|:--------|:------|
| 1 | F1 `千锋聚灵剑` | 【怒血战意】 | 【紫心真诀】 | +100% dmg at 50% HP | 21%maxHP true dmg | +stacks if F6 provides debuffs |
| 2 | F9 `疾风九变` | 【怒血战意】 | 【紫心真诀】 | +100% dmg at 50% HP | 极怒 4s; 21%maxHP true dmg | +stacks from F6; +HP cost resource |
| 3 | F9 `疾风九变` | 【怒血战意】 | 【长生天则】 | +100% dmg + healing +50% | 极怒 4s; lifesteal ×4.876 under 仙佑 | sustain loop |
| 4 | F1 `千锋聚灵剑` | 【怒血战意】 | 【心火淬锋】 | +100% + +50% esc. | — | no cross-slot feed |

> Against O1 (strong opponent), HP loss accumulates naturally → 【怒血战意】(+2%/1% HP lost) is strong. 【紫心真诀】adds 21%maxHP true damage from F6's debuff stacks (cross-灵書 feed).

### F_antiheal — Suppress enemy healing

**Qualifying foundations** [chain.md §D]: any+【天哀灵涸】(−31% undispellable); any+【天倾灵枯】(−31%/−51%, 20s); F7+【无相魔威】(−40.8%).

| # | Affix | Carrier Book | Strength | Duration | Key Property |
|:--|:------|:-------------|:---------|:---------|:-------------|
| 1 | 【天哀灵涸】 | `千锋聚灵剑` (F1) | −31% | 8s | **Undispellable** |
| 2 | 【天倾灵枯】 | `甲元仙符` (F5) | −31% / −51% below 30% HP | 20s | Long duration, escalates |
| 3 | 【无相魔威】 | `无相魔劫咒` (F7) | −40.8% | 8s | Highest raw reduction |

> F_antiheal folds into another slot as one of its two aux affixes. Carrier book conflicts determine availability (see Phase 3).

### F_survive — CC cleanse + damage reduction

**Qualifying foundations** [chain.md §D]: F8 (cleanse monopoly); F4 (untargetable 4s); any+【金刚护体】(+55% DR).

| # | Foundation | Op1 | Op2 | S_same | S_cross | Notes |
|:--|:-----------|:----|:----|:-------|:--------|:------|
| 1 | F8 `十方真魄` | 【心火淬锋】 | 【天哀灵涸】 | +50% esc. on 10 hits | cleanse 1/25s; +20% ATK/DR 7.5s; antiheal −31% 8s | survive + antiheal fold |
| 2 | F8 `十方真魄` | 【心火淬锋】 | 【怒血战意】 | +50% esc. + HP exploit | cleanse 1/25s; +20% ATK/DR 7.5s; −10% HP resource | survive + HP exploit |
| 3 | F8 `十方真魄` | 【业焰】 | 【天哀灵涸】 | — | cleanse 1/25s; +20% ATK/DR 12.7s; antiheal −31% 13.5s | extended durations |
| 4 | F8 `十方真魄` | 【金刚护体】 | 【怒血战意】 | +55% DR + HP exploit | cleanse 1/25s; −10% HP resource | max survival |

> F8 provides the only CC cleanse in the game (monopoly). F_survive rank 1 folds F_antiheal (【天哀灵涸】) into the same slot — efficient 2-for-1.

---

## Phase 3 — Global Optimization [chain.md §F]

### Step 1: Monopoly Forcing

Consult [chain.md Structural Properties — Monopoly Nodes].

| Function | Forced Foundation | Forced Affixes | Forced Books |
|:---------|:-----------------|:---------------|:-------------|
| F_buff | F5 `甲元仙符` | 【龙象护身】, 【仙露护元】 | `甲元仙符`, `浩然星灵诀`, `念剑诀` |
| F_dr_remove | F6 `大罗幻诀` | — (multiple viable pairings) | `大罗幻诀` |
| F_survive | F8 `十方真魄` | — (cleanse monopoly forces foundation) | `十方真魄` |
| F_burst | — (multiple foundations) | 【心逐神随】 | `解体化形` |

> 3 foundations forced (F5, F6, F8). 1 affix forced (【心逐神随】on `解体化形`). 3 slots remain for F_burst, F_hp_exploit, and the derived 6th slot.

### Step 2: Uniqueness Propagation

Each forced choice removes books and affixes from other candidate lists.

**Propagation chain:**

| Forced Choice | Removes | Consequence |
|:--------------|:--------|:------------|
| `念剑诀` aux on F5 | F4 `念剑诀` as main | F4 candidates eliminated from F_burst |
| `甲元仙符` main for F5 | 【天倾灵枯】(exclusive of `甲元仙符`) | F_antiheal option #2 pruned |
| 【龙象护身】on F5 | 【龙象护身】elsewhere | No impact (only needed on F_buff) |
| 【仙露护元】on F5 | 【仙露护元】elsewhere | No impact (only needed on F_buff) |

**F_antiheal after pruning:**

| # | Affix | Carrier | Status |
|:--|:------|:--------|:-------|
| 1 | 【天哀灵涸】 | `千锋聚灵剑` (F1) | **Available** — but blocks F1 as main |
| 2 | 【天倾灵枯】 | `甲元仙符` (F5) | **Pruned** — F5 is main |
| 3 | 【无相魔威】 | `无相魔劫咒` (F7) | **Available** — blocks F7 as main |

> **Key decision:** using 【天哀灵涸】(undispellable, critical vs strong opponent with dispels) blocks F1 as main. Using 【无相魔威】blocks F7 instead.

### Step 3: F_antiheal Fold → F_survive

F_survive rank 1 = F8 + 【心火淬锋】+ **【天哀灵涸】** — folds F_antiheal into F_survive slot.

**Consequence:** `千锋聚灵剑` (F1) used as aux on F8 → **F1 cannot be main**.

**Updated F_burst candidates** (F1 eliminated, F4 eliminated):

| # | Foundation | Op1 | Op2 | S_same | Notes |
|:--|:-----------|:----|:----|:-------|:------|
| 1 | F3 `皓月剑诀` | 【心逐神随】 | 【灵犀九重】 | ×10.95 | 240%maxHP (shieldless), 10 hits |
| 2 | F2 `春黎剑阵` | 【心逐神随】 | 【灵犀九重】 | ×10.95 | +分身 16s DPS |

> F3 and F2 have identical S_same (×10.95). F3 has higher %maxHP damage; F2 has summon. F3 selected for primary burst (×10.95 on 240%maxHP base is the highest damage ceiling).

**Assign F_burst → F3 `皓月剑诀` + 【心逐神随】+ 【灵犀九重】.**

### Step 4: Residual Assignment

**Functions assigned so far:**

| Slot | Function | Foundation | Aux1 | Aux2 |
|:-----|:---------|:-----------|:-----|:-----|
| — | F_buff | F5 `甲元仙符` | 【龙象护身】 | 【仙露护元】 |
| — | F_dr_remove | F6 `大罗幻诀` | (pending) | (pending) |
| — | F_survive + F_antiheal | F8 `十方真魄` | 【心火淬锋】 | 【天哀灵涸】 |
| — | F_burst | F3 `皓月剑诀` | 【心逐神随】 | 【灵犀九重】 |
| — | F_hp_exploit | (pending) | (pending) | (pending) |

**F_hp_exploit foundation selection.**

Available foundations: {F2, F7, F9} (F1 aux, F3 main, F4 aux, F5 main, F6 main, F8 main).

From §D: F9 has `self_hp_cost` (−10% current HP) — creates HP loss resource. Against O1, opponent damage adds to this. F9 also provides 极怒 counter (4s reflect + 15% lost HP) and lifesteal (82% via 星猿复灵), gaining massive S_feed from F5's 天光虹露 (+387.6% healing → lifesteal = 82% × 4.876 = **400%** of reflected damage).

| Candidate | Op1 | Op2 | S_same | S_cross | Feed from F6 |
|:----------|:----|:----|:-------|:--------|:-------------|
| F9 + 【怒血战意】+ 【紫心真诀】 | HP exploit | true damage | +100% at 50% HP | 极怒 4s; 21%maxHP true dmg | stacks from 命損 triggers |
| F9 + 【怒血战意】+ 【长生天则】 | HP exploit | healing amp | +100% at 50% HP | 极怒 4s; lifesteal ×4.876 | — |

> 【紫心真诀】 (21%maxHP true damage, bypasses all defenses) outperforms 【长生天则】 (+50% healing) because F9's inherent lifesteal already reaches 400% under 仙佑 天光虹露 — additional healing amp has diminishing returns. True damage is unreducible against O1's 50%+ DR.

**Assign F_hp_exploit → F9 `疾风九变` + 【怒血战意】+ 【紫心真诀】.**

**F6 aux selection.** Available affixes after uniqueness:

From F6 solution table, pruning already-used affixes (心逐, 灵犀, 心火, 天哀灵涸, 怒血, 紫心):

| # | Op1 | Op2 | S_same | Notes |
|:--|:----|:----|:-------|:------|
| 1 | 【心魔惑言】 | 【追神真诀】 | debuff ×2 + 26.5%/tick | 【追神真诀】carrier = `皓月剑诀` (F3) — **conflict: F3 is main** |
| 2 | 【心魔惑言】 | 【九雷真解】 | debuff ×2 + 152.4%/enemy atk | ✓ no conflict |
| 3 | 【心魔惑言】 | 【业焰】 | debuff ×2 + states +69% | ✓ no conflict |

> 【追神真诀】 pruned (carrier `皓月剑诀` = F3, already main). Rank 2: 【心魔惑言】+【九雷真解】— reactive scaling (152.4% skill damage per enemy attack) is strong vs O1's active attacker.

**Assign F_dr_remove → F6 `大罗幻诀` + 【心魔惑言】+ 【九雷真解】.**

### Step 5: 6th Slot Derivation

5 functions assigned to 5 slots. Remaining foundations: {F2, F7}.

| Foundation | Base ATK | Key Asset | Best Available Pairing |
|:-----------|:---------|:----------|:-----------------------|
| F2 `春黎剑阵` | 22,305% | 分身 16s DPS | 【神威冲云】+ 【明王之路】 |
| F7 `无相魔劫咒` | 1,500% | +10% skill dmg taken 12s (cross) | low S_same |

> F2 dominates: 22,305% ATK base vs 1,500%, plus 分身 16s autonomous DPS. 【神威冲云】(ignore all DR + 36% damage, monopoly) is maximally valuable at O1's 50%+ DR. 【明王之路】(+50% final damage, monopoly) fills the empty final-damage zone.

Combined on F2: 22,305% × 1.36 (神威冲云) × 1.50 (明王之路) × 1/(1−DR) = 22,305% × **4.08** at 50% DR. Plus 分身 DPS.

**Assign 6th slot → F2 `春黎剑阵` + 【神威冲云】+ 【明王之路】.**

### Step 6: Uniqueness Verification

**Foundations (6, all unique):**

| Slot | Foundation |
|:-----|:-----------|
| — | F5 `甲元仙符` |
| — | F2 `春黎剑阵` |
| — | F6 `大罗幻诀` |
| — | F3 `皓月剑诀` |
| — | F8 `十方真魄` |
| — | F9 `疾风九变` |

**Affixes (12, all unique):**

| Affix | Carrier | Slot |
|:------|:--------|:-----|
| 【龙象护身】 | `浩然星灵诀` | F5 |
| 【仙露护元】 | `念剑诀` | F5 |
| 【神威冲云】 | `通天剑诀` | F2 |
| 【明王之路】 | 法修 school | F2 |
| 【心魔惑言】 | `天轮魔经` | F6 |
| 【九雷真解】 | `九天真雷诀` | F6 |
| 【心逐神随】 | `解体化形` | F3 |
| 【灵犀九重】 | 剑修 school | F3 |
| 【心火淬锋】 | 剑修 school | F8 |
| 【天哀灵涸】 | `千锋聚灵剑` | F8 |
| 【怒血战意】 | `玄煞灵影诀` | F9 |
| 【紫心真诀】 | `惊蛰化龙` | F9 |

**Named books (15, all unique):** 6 foundations (甲元仙符, 春黎剑阵, 大罗幻诀, 皓月剑诀, 十方真魄, 疾风九变) + 9 exclusive carriers (浩然星灵诀, 念剑诀, 通天剑诀, 天轮魔经, 九天真雷诀, 解体化形, 千锋聚灵剑, 玄煞灵影诀, 惊蛰化龙) + 3 school-type books (剑修 ×2, 法修 ×1). ✓

---

## Phase 4 — Slot Ordering

### Cross-灵書 Outputs with Durations [chain.md Cross-Foundation Feed Table]

| Source | Output | Duration | Coverage |
|:-------|:-------|:---------|:---------|
| F5 `甲元仙符` | 仙佑 +142.8% ATK/DEF/HP | 48s | ~8 slots (all) |
| F5 `甲元仙符` | 天光虹露 +387.6% healing | 48s | ~8 slots (all) |
| F2 `春黎剑阵` | 分身 (summon) | 16s | ~2.5 slots |
| F6 `大罗幻诀` | 命損 −100% DR | 8s | ~1 slot |
| F6 `大罗幻诀` | Debuff stacks | persist | all subsequent |
| F8 `十方真魄` | 天哀灵涸 −31% healing | 8s | ~1 slot |
| F8 `十方真魄` | 怒灵降世 +20% ATK/DR | 7.5s | ~1 slot |
| F8 `十方真魄` | Periodic cleanse | 1/25s | limited |
| F9 `疾风九变` | 极怒 reflect | 4s | current slot only |

### Feed Dependency Constraints

```
F5 → ALL           (仙佑 48s covers everything → place earliest)
F6 → F3            (命損 8s ≈ 1 slot → F6 immediately precedes F3)
F6 → F9            (debuff stacks persist → F6 before F9)
F2 → F3            (分身 16s ≈ 2.5 slots → F2 before F3 for summon during burst)
F8 → F9            (天哀灵涸 8s ≈ 1 slot → F8 immediately precedes F9)
F9                  (reads accumulated debuff stacks + HP loss → place last)
```

### Derived Temporal Ordering

Topological sort with duration constraints:

| Slot | Foundation | Function | Rationale |
|:-----|:-----------|:---------|:----------|
| **1** | F5 `甲元仙符` | F_buff | 仙佑 48s — must fire first to buff all subsequent slots |
| **2** | F2 `春黎剑阵` | 6th (burst + DR bypass) | 分身 16s starts — covers slots 3–5; 神威冲云 ignores DR on own burst |
| **3** | F6 `大罗幻诀` | F_dr_remove | 命損 8s — must immediately precede F3; debuff stacks begin accumulating |
| **4** | F3 `皓月剑诀` | F_burst | ×10.95 burst under 命損 window (DR removed) + 仙佑 ATK buff + 分身 active |
| **5** | F8 `十方真魄` | F_survive + F_antiheal | Cleanse for late-game survival; 天哀灵涸 8s covers slot 6 |
| **6** | F9 `疾风九变` | F_hp_exploit + F_truedmg + F_counter | HP loss peaks at end; reads max debuff stacks; 极怒 reflect + 400% lifesteal under 仙佑 |

---

## Result

### Final 灵書 Specification

| Slot | Function | Main (Foundation) | Aux1 | Aux2 | Chains |
|:-----|:---------|:------------------|:-----|:-----|:-------|
| 1 | F_buff | `甲元仙符` (F5) | 【龙象护身】 | 【仙露护元】 | buff_strength ×2.04 + buff_duration ×4 → 仙佑 +142.8% 48s |
| 2 | 6th (burst+DR) | `春黎剑阵` (F2) | 【神威冲云】 | 【明王之路】 | ignore_DR + final_damage ×1.5 → 22,305% × 4.08 at 50% DR; 分身 16s |
| 3 | F_dr_remove | `大罗幻诀` (F6) | 【心魔惑言】 | 【九雷真解】 | debuff_stack ×2 + state_trigger 152.4%/atk → 命損 −100% DR 8s |
| 4 | F_burst | `皓月剑诀` (F3) | 【心逐神随】 | 【灵犀九重】 | probability_multiplier ×3.40 + 会心 ×2.97 → ×10.95 on 240%maxHP |
| 5 | F_survive + F_antiheal | `十方真魄` (F8) | 【心火淬锋】 | 【天哀灵涸】 | per_hit_escalation +50% + antiheal −31% undispellable 8s; cleanse 1/25s |
| 6 | F_hp_exploit + F_truedmg | `疾风九变` (F9) | 【怒血战意】 | 【紫心真诀】 | per_self_lost_hp +2%/1% + true_damage 21%maxHP; 极怒 reflect; lifesteal ×4.876 |

### Cross-灵書 Temporal Map

| Effect | Source Slot | Fires at | Duration | Covers |
|:-------|:-----------|:---------|:---------|:-------|
| 仙佑 +142.8% ATK/DEF/HP | 1 (F5) | ~0s | 48s | Slots 1–6 |
| 天光虹露 +387.6% healing | 1 (F5) | ~0s | 48s | Slots 1–6 |
| 分身 DPS (summon) | 2 (F2) | ~7s | 16s | Slots 2–5 |
| 神威冲云 DR bypass + 36% | 2 (F2) | ~7s | same-slot | Slot 2 |
| 罗天魔咒 counter debuffs | 3 (F6) | ~14s | 8s reactive | Slot 3–4 |
| 命損 −100% DR | 3 (F6) | ~14s+ | 8s (from trigger) | Slot 4 |
| 九雷真解 reactive damage | 3 (F6) | ~14s | 8s | Slot 3 |
| Debuff stacks on enemy | 3 (F6) | ~14s+ | persist | Slots 4–6 |
| F3 burst (×10.95 × 240%maxHP) | 4 (F3) | ~21s | instant | Slot 4 |
| 怒灵降世 +20% ATK/DR | 5 (F8) | ~28s | 7.5s | Slots 5–6 |
| 天哀灵涸 −31% healing (undispellable) | 5 (F8) | ~28s | 8s | Slots 5–6 |
| Periodic cleanse | 5 (F8) | ~28s | 1/25s | Slots 5–6 |
| 极怒 reflect 50% + 15% lost HP | 6 (F9) | ~35s | 4s | Slot 6 |
| 紫心真诀 21%maxHP true damage | 6 (F9) | ~35s | reads stacks | Slot 6 |
| 怒血战意 HP exploit | 6 (F9) | ~35s | reads HP loss | Slot 6 |

---

## Document History

| Version | Date | Changes |
|:--------|:-----|:--------|
| 1.0 | 2026-03-02 | Initial: O1 strong opponent build derived mechanically from chain.md §A–§F. 3 monopoly forcings (F5, F6, F8) + 1 affix monopoly (心逐神随) → uniqueness propagation prunes F1/F4 as mains and 天倾灵枯 → F_antiheal folds into F_survive via 天哀灵涸 → burst on F3, HP exploit + true damage on F9, 6th slot F2 with dual monopoly operators (神威冲云 + 明王之路). 15 named books, 12 unique affixes, 6 foundations. |
