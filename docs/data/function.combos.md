---
initial date: 2026-3-2
dates of modification: [2026-3-2, 2026-3-3]
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

# Function Combos — Scenario-Oriented Value Functions

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Per-function catalog of qualified (op1, op2) combos on each foundation, with scenario-parameterized value functions.** Combo value depends on the matchup scenario — V(combo, S) produces a single scalar (effective damage multiplier) parameterized by opponent DR, buff state, and objective. All data sourced from [chain.md](chain.md).

> **Convention:** skill books in backticks (`` `book` ``), affixes in lenticular brackets (【affix】). Operator action types: **D** = direct (standalone value), **A** = assistive (amplifies existing — zero from ∅ input), **B** = both (standalone + amplifier).

---

## §1 Enumeration Principle

A combo (op1, op2) qualifies for function F on foundation Fk if:

1. **Port membership.** Both op1 and op2 appear in Fk's Input Ports [chain.md Layer 2].
2. **Function relevance.** At least one of {op1, op2} directly serves F's required effect types [chain.md §D]. For F_burst: `base_attack`, `guaranteed_resonance`, or `probability_multiplier`.
3. **Measurable improvement.** The pair produces a measurable improvement over the foundation's baseline on F's value function — i.e., V(combo, S) > 1.0 for at least one scenario S.

Any combo in the tables below satisfies all three rules. Conversely, any (op1, op2) pair that fails any rule is excluded.

---

## §2 Action Type: 【心逐神随】 → A (Assistive)

**Correction from v1.0:** 【心逐神随】 is reclassified **B → A**.

- **Rationale.** `probability_multiplier` amplifies ALL existing effects on the 灵書 by ×2/×3/×4. From ∅ input it produces zero — it has no standalone damage output. It needs a foundation with `base_attack` to have any effect.
- **"Both" (B) implies standalone value.** 心逐 has none — it is a pure amplifier that happens to be the strongest one (×3.40 expected, monopoly on `probability_multiplier`).
- **Impact.** This changes the action type label in all combo tables below. No numeric values change.

---

## F_burst — Maximize single-slot damage output

**Definition** [chain.md §D]: Maximize the total damage a single 灵書 slot deals in one cast cycle. Required effect types: `base_attack`, `guaranteed_resonance`, `probability_multiplier`.

### Scenario Parameters

Dimensions that change F_burst combo rankings. Mapped to objectives (§C):

| Parameter | Symbol | Source | Range |
|:----------|:-------|:-------|:------|
| Opponent DR | `dr` | Stat gap (O1, O3) or equal (O2) | 0–70% |
| Horizon | `h` | §C Objective table | 18–50s |
| Opponent healing | `heal` | Matchup (O6) | none / moderate / heavy |
| ATK buff present | `buff` | Whether another slot runs F_buff (【仙佑】) | yes / no |
| Self HP trajectory | `hp_loss` | O1 (drops fast) vs O4 (stays high) | fast / slow |
| Target debuffs available | `debuffs` | Whether another slot provides debuffs | yes / no |

**Objective → parameter mapping:**

- **O1** (vs stronger): dr=high, h=long, hp_loss=fast, buff=yes
- **O2** (vs equal): dr=moderate, h=medium, buff=yes, debuffs=yes
- **O3** (vs equal, immunity): dr=moderate, h=long, buff=yes
- **O4** (vs weaker): dr=low, h=short, buff=yes
- **O5** (low enlightenment): deterministic combos preferred
- **O6** (heal-heavy): heal=heavy, h=long

### Value Function

```
V(combo, S) = effective_damage_mult(combo, dr, buff)
```

Single scalar: **effective damage multiplier** on the foundation's base, parameterized by scenario S. This subsumes the old `DR_interact` column (now integrated as V at different `dr` levels) and removes `side_effects` from the value function (noted separately when relevant).

**Definition:**

- `V(combo, dr=0)` = combo's raw damage multiplier on foundation base (no DR).
- `V(combo, dr=X%)` = for **non-bypass** combos: `V(dr=0) × (1 − X/100)` — DR reduces effective output equally.
- `V(combo, dr=X%)` = for **DR-bypass** combos (containing 【神威冲云】): `V(dr=0)` — damage bypasses opponent DR entirely.

This means non-bypass combos degrade at higher DR, while bypass combos hold their value. Direct comparison across columns reveals the DR crossover point where a lower-multiplier bypass combo overtakes a higher-multiplier non-bypass combo.

> **Zone crowding under 【仙佑】.** When `buff=yes` (【仙佑】 active, +142.8% ATK), ATK-zone operators (【摧云折月】, 【摧山】) suffer marginal degradation — their additive ATK bonus yields a smaller percentage gain on the higher base. Final-zone and crit-zone operators are unaffected (those zones remain empty). Noted per combo where applicable.

---

### Qualifying Foundations

[chain.md §D]: F1, F2, F3, F4 (high base ATK ≥ 20,000%); F5, F6 (moderate, ~20,000%); F7, F8, F9 (low, 1,500% — impractical for primary burst).

| Foundation | ATK Base | Hits | 气血 (opponent) | Unique asset |
|:-----------|:---------|:-----|:----------------|:-------------|
| F1 `千锋聚灵剑` | 20,265% | 6 | 162% maxHP (27%/hit) | Per-hit escalation (+42.5%/hit builtin) |
| F2 `春黎剑阵` | 22,305% | 5 | — | 分身 summon (16s, +200% dmg, cross-slot DPS) |
| F3 `皓月剑诀` | 22,305% | 10 | 240% maxHP (shieldless) / 120% (shielded) | Shield-destroy + DoT |
| F4 `念剑诀` | 22,305% | 8+13=21 | — | Extended DoT (6.5s), escalation ×1.4/2hits → ×28.9 peak; 4s untargetable |

---

### F1 `千锋聚灵剑`

**Foundation base:** 20,265% ATK × 6 hits (+42.5%/hit escalation builtin) + 162% opponent maxHP (27%/hit). No defense, no cross-slot output. Both damage channels (ATK and %maxHP) pass through the same multiplier chain.

**Application scenarios:**

- **O1 (vs stronger):** 162% maxHP bypasses stat gap — damage scales with opponent's HP, not your own ATK. High value when `dr=high` paired with 【神威冲云】.
- **O4 (vs weaker):** Pure overkill — 6 hits + %maxHP finishes quickly. Best when `h=short`.
- **O6 (heal-heavy):** %maxHP creates pressure independent of healing reduction.
- **Weak in O2/O3:** No cross-slot output, no sustainability.

**Qualified operators** [chain.md F1 Input Ports]:

| Category | Operators | Type |
|:---------|:----------|:-----|
| Cross-cutting | 【心逐神随】(A: ×3.40 all), 【神威冲云】(A: ignore DR +36%) | A, A |
| 会心 | 【灵犀九重】(D: E[×3.22]), 【通明】(D: E[×1.28]) | D |
| ATK zone | 【摧云折月】(A: +55%), 【摧山】(A: +20%), 【破碎无双】(A: +15%×3) | A |
| Final damage zone | 【明王之路】(A: +50%) | A |
| Per-hit escalation | 【心火淬锋】(D: +5%/hit max +50%) | D |
| HP-scaling | 【怒血战意】(D: +2%/1% self HP lost), 【战意】(D: +0.5%), 【贪狼吞星】(D: +1%/1% enemy HP lost), 【吞海】(D: +0.4%) | D |
| Flat source | 【斩岳】(D: +2000% ATK), 【破灭天光】(D: +2500%) | D |
| Conditional | 【引灵摘魂】(D: +104% if debuffs), 【乘胜逐北】(D: +100% if CC'd), 【溃魂击瑕】(D: +100%+必暴 if HP<30%), 【怒目】(D: +20%+暴击 if HP<30%) | D |
| Enabler | 【天命有归】(B: +50% dmg + certainty), 【意坠深渊】(B: +50% dmg + HP floor) | B |
| Anti-heal | 【天哀灵涸】(D: −31% undispellable 8s cross) | D |

**Combos:**

| # | Op1 (type) | Op2 (type) | V(dr=0) | V(dr=50%) | V(dr=70%) | consumes | scenario fit | conditions |
|:--|:-----------|:-----------|:--------|:----------|:----------|:---------|:-------------|:-----------|
| 1 | 【心逐神随】(A) | 【灵犀九重】(D) | ×10.95 | ×5.48 | ×3.29 | `解体化形`, 剑修 book | O2, O4 (dr=low) | — |
| 2 | 【心逐神随】(A) | 【无相魔威】(B) | ×6.97 | ×3.49 | ×2.09 | `解体化形`, `无相魔劫咒` | O6 (heal-heavy) | antiheal −40.8% 8s; ×10.37 if no healing |
| 3 | 【心逐神随】(A) | 【引灵摘魂】(D) | ×6.94 | ×3.47 | ×2.08 | `解体化形`, `天魔降临咒` | O2 (debuffs=yes) | target has debuffs |
| 4 | 【心逐神随】(A) | 【乘胜逐北】(D) | ×6.80 | ×3.40 | ×2.04 | `解体化形`, `煞影千幻` | O2, O3 (CC available) | target is CC'd |
| 5 | 【心逐神随】(A) | 【天命有归】(B) | ×6.00 | ×3.00 | ×1.80 | `解体化形`, 法修 book | O5 (deterministic) | deterministic (no RNG) |
| 6 | 【心逐神随】(A) | 【明王之路】(A) | ×5.10 | ×2.55 | ×1.53 | `解体化形`, 法修 book | O2, O4 (general) | — |
| 7 | 【心逐神随】(A) | 【摧云折月】(A) | ×5.27 | ×2.64 | ×1.58 | `解体化形`, 剑修 book | O4 (buff=no) | ×4.17 under 【仙佑】 (ATK zone crowded) |
| 8 | 【心逐神随】(A) | 【神威冲云】(A) | ×4.62 | **×4.62** | **×4.62** | `解体化形`, `通天剑诀` | **O1 (dr=high)** | DR bypass; value scales with opponent DR |
| 9 | 【心火淬锋】(D) | 【灵犀九重】(D) | ~×3.4 | ~×1.70 | ~×1.02 | 剑修 book ×2 | O4 | — |
| 10 | 【心火淬锋】(D) | 【怒血战意】(D) | ~×2.5+ | ~×1.25+ | ~×0.75+ | 剑修 book, `玄煞灵影诀` | O1 (hp_loss=fast) | scales with self HP loss |
| 11 | 【灵犀九重】(D) | 【明王之路】(A) | ×4.83 | ×2.42 | ×1.45 | 剑修 book, 法修 book | O2, O4 | — |
| 12 | 【灵犀九重】(D) | 【神威冲云】(A) | ×4.38 | **×4.38** | **×4.38** | 剑修 book, `通天剑诀` | **O1 (dr=high)** | DR bypass |
| 13 | 【天命有归】(B) | 【灵犀九重】(D) | ×5.96 | ×2.98 | ×1.79 | 法修 book, 剑修 book | O5 (deterministic) | 天命 → 灵犀 ×3.97 certain; deterministic |

> **Monopoly gap.** Rows 1–8 (心逐) vs 9–13 (no 心逐): best ×10.95 vs ×5.96 (天命+灵犀) — **1.84× gap**. `probability_multiplier` is an empty zone only 心逐 accesses.

> **DR crossover.** At dr=70%, 心逐+神威 (row 8, ×4.62) overtakes 心逐+灵犀 (row 1, ×3.29). The crossover point is ~58% DR. Above that, bypass combos dominate.

---

### F2 `春黎剑阵`

**Foundation base:** 22,305% ATK × 5 hits. No %maxHP, no defense. **Cross-slot: 分身 summon** (16s, 54% stats, +200% damage — autonomous DPS after each skill cast).

**Application scenarios:**

- **O2 (vs equal):** 分身 provides persistent cross-slot DPS — outscales in medium-horizon fights where sustained pressure matters.
- **O4 (vs weaker):** 22,305% ATK base + 分身 creates overwhelming short-term pressure.
- **O3 (immunity heavy):** Extended 分身 (via 【业焰】, 16s→27s) provides continuous damage during opponent immunity windows.
- **Weak in O1:** No %maxHP, no DR bypass — ATK-based damage is fully reduced by stat gap.

**Qualified operators** [chain.md F2 Input Ports]:

| Category | Operators | Type |
|:---------|:----------|:-----|
| Cross-cutting | 【心逐神随】(A: ×3.40 all + buffs summon), 【神威冲云】(A: ignore DR +36%) | A, A |
| 会心 | 【灵犀九重】(D: E[×3.22]), 【通明】(D: E[×1.28]) | D |
| Final damage zone | 【明王之路】(A: +50%) | A |
| State duration | 【业焰】(A: +69% all states), 【真言不灭】(A: +55%) | A |
| Per-hit escalation | 【心火淬锋】(D: +5%/hit) | D |
| Conditionals | 【引灵摘魂】(D: +104% if debuffs), etc. | D |

**Combos:**

| # | Op1 (type) | Op2 (type) | V(dr=0) | V(dr=50%) | V(dr=70%) | consumes | scenario fit | conditions |
|:--|:-----------|:-----------|:--------|:----------|:----------|:---------|:-------------|:-----------|
| 1 | 【心逐神随】(A) | 【灵犀九重】(D) | ×10.95 | ×5.48 | ×3.29 | `解体化形`, 剑修 book | O2, O4 | — |
| 2 | 【心逐神随】(A) | 【明王之路】(A) | ×5.10 | ×2.55 | ×1.53 | `解体化形`, 法修 book | O2, O4 | — |
| 3 | 【心逐神随】(A) | 【引灵摘魂】(D) | ×6.94 | ×3.47 | ×2.08 | `解体化形`, `天魔降临咒` | O2 (debuffs=yes) | target has debuffs |
| 4 | 【业焰】(A) | 【灵犀九重】(D) | ×3.22 | ×1.61 | ×0.97 | any book, 剑修 book | O2, O3 (分身 27s) | — |
| 5 | 【业焰】(A) | 【心火淬锋】(D) | ~×1.10 | ~×0.55 | ~×0.33 | any book, 剑修 book | O3 (分身 27s, long fight) | — |
| 6 | 【业焰】(A) | 【明王之路】(A) | ×1.50 | ×0.75 | ×0.45 | any book, 法修 book | O3 (分身 27s) | — |
| 7 | 【灵犀九重】(D) | 【明王之路】(A) | ×4.83 | ×2.42 | ×1.45 | 剑修 book, 法修 book | O2, O4 | — |
| 8 | 【灵犀九重】(D) | 【神威冲云】(A) | ×4.38 | **×4.38** | **×4.38** | 剑修 book, `通天剑诀` | **O1 (dr=high)** | DR bypass |

> **Cross-slot output (分身, not part of V).**
> - **Rows 1–3** (心逐 combos): 分身 at 16s, ×3.40 buffed by 心逐. Highest burst + strong summon.
> - **Rows 4–6** (【业焰】 combos): 分身 extended to **27s** (+69%). Lower burst but ~70% more summon uptime. Genuine tradeoff — 分身 is cross-slot autonomous DPS, not wasted value.
> - **Rows 7–8**: 分身 at 16s, unbuffed.

---

### F3 `皓月剑诀`

**Foundation base:** 22,305% ATK × 10 hits + **240% opponent maxHP** (shieldless: 24%/hit) / 120% (shielded: 12%/hit). No defense, no cross-slot. Both ATK and %maxHP pass through the same multiplier chain.

> V values below use shieldless (240%) base. Shielded targets halve the %maxHP component.

**Application scenarios:**

- **O1 (vs stronger):** 240% maxHP (shieldless) is the highest %maxHP source in the game — strongest stat-gap bypass. Every damage_mult row is worth more in absolute 气血 reduction than the same row on F1 (162%) or F2 (0%).
- **O4 (vs weaker):** 10 hits + 240% maxHP provides extreme overkill for short horizons.
- **O2 (vs equal):** Strong burst + shield-destroy utility against shielded opponents.
- **Weak in O6:** No cross-slot anti-heal output. Shield-destroy DoT (【碎魂剑意】) is same-slot only.

**Qualified operators** [chain.md F3 Input Ports]:

| Category | Operators | Type |
|:---------|:----------|:-----|
| Cross-cutting | 【心逐神随】(A: ×3.40 all incl. %maxHP), 【神威冲云】(A: ignore DR +36%) | A, A |
| 会心 | 【灵犀九重】(D: E[×3.22]), 【通明】(D: E[×1.28]) | D |
| Final damage zone | 【明王之路】(A: +50%) | A |
| Per-hit escalation | 【心火淬锋】(D: +5%/hit, 10 hits → +50%) | D |
| DoT amplifiers | 【古魔之魂】(A: DoT +104%), 【天魔真解】(A: freq +50.5%), 【鬼印】(A: +2% lost HP/tick) | A |
| Conditionals | 【引灵摘魂】(D: +104% if debuffs), etc. | D |

> DoT amplifiers target the shield-destroy DoT (【碎魂剑意】) — a separate function (F_dot). They appear in F3's input ports but their combos belong in a future F_dot section, not here.

**Combos — F_burst:**

| # | Op1 (type) | Op2 (type) | V(dr=0) | V(dr=50%) | V(dr=70%) | consumes | scenario fit | conditions |
|:--|:-----------|:-----------|:--------|:----------|:----------|:---------|:-------------|:-----------|
| 1 | 【心逐神随】(A) | 【灵犀九重】(D) | ×10.95 | ×5.48 | ×3.29 | `解体化形`, 剑修 book | O2, O4 | — |
| 2 | 【心逐神随】(A) | 【引灵摘魂】(D) | ×6.94 | ×3.47 | ×2.08 | `解体化形`, `天魔降临咒` | O2 (debuffs=yes) | target has debuffs |
| 3 | 【心逐神随】(A) | 【明王之路】(A) | ×5.10 | ×2.55 | ×1.53 | `解体化形`, 法修 book | O2, O4 | — |
| 4 | 【心火淬锋】(D) | 【灵犀九重】(D) | ~×4.3 | ~×2.15 | ~×1.29 | 剑修 book ×2 | O4 | 10 hits → +50% escalation |
| 5 | 【灵犀九重】(D) | 【明王之路】(A) | ×4.83 | ×2.42 | ×1.45 | 剑修 book, 法修 book | O2, O4 | — |
| 6 | 【灵犀九重】(D) | 【神威冲云】(A) | ×4.38 | **×4.38** | **×4.38** | 剑修 book, `通天剑诀` | **O1 (dr=high)** | DR bypass |
| 7 | 【心火淬锋】(D) | 【神威冲云】(A) | ~×2.04 | **~×2.04** | **~×2.04** | 剑修 book, `通天剑诀` | O1 (dr=high, no 心逐) | DR bypass |

> **%HP amplification.** F3's 240%maxHP (shieldless) is the highest in the game. Every V row above is worth more in absolute 气血 reduction than the same row on F1 (162%) or F2 (0%). At equal V(dr), prefer F3 over F1 when opponent is shieldless.

---

### F4 `念剑诀`

**Foundation base:** 22,305% ATK × 21 hits (8 main + 13 extended DoT). Escalation ×1.4 every 2 hits → **×28.9 peak at hit 21**. **4s untargetable** during main cast. No %maxHP, no cross-slot.

> **Escalation reshapes value.** Late hits (extended DoT phase) are worth 10–29× early hits. Operators amplifying late hits have disproportionate return.

**Application scenarios:**

- **O1 (vs stronger):** 4s untargetable provides survival; ×28.9 escalation on extended DoT delivers massive total damage over a long horizon.
- **O3 (immunity heavy):** Untargetable + extended DoT provides continuous pressure through opponent immunity windows.
- **O2 (vs equal):** 21 hits with escalation creates strong sustained pressure over medium horizons.
- **Weak in O4 (vs weaker):** Long total cast time (4s main + 6.5s extended = 10.5s) is slow for short horizons.

**Escalation progression** [chain.md F4]:

| Hits | Multiplier | Phase |
|:-----|:-----------|:------|
| 1–2 | ×1.0 | Main (4s) |
| 3–4 | ×1.4 | Main |
| 5–6 | ×1.96 | Main |
| 7–8 | ×2.74 | Main (end) |
| 9–10 | ×3.84 | Extended DoT |
| 11–12 | ×5.38 | Extended DoT |
| 13–14 | ×7.53 | Extended DoT |
| 15–16 | ×10.54 | Extended DoT |
| 17–18 | ×14.76 | Extended DoT |
| 19–20 | ×20.66 | Extended DoT |
| 21 | **×28.93** | Extended DoT (max) |

**Qualified operators** [chain.md F4 Input Ports]:

| Category | Operators | Type |
|:---------|:----------|:-----|
| Cross-cutting | 【心逐神随】(A: ×3.40 on all 21 hits) | A |
| DoT amplifiers | 【古魔之魂】(A: DoT +104%), 【天魔真解】(A: freq +50.5%) | A |
| State duration | 【业焰】(A: +69%), 【真言不灭】(A: +55%) | A |
| Damage amplifiers | 【明王之路】(A: +50% final), etc. | A |
| 会心 | 【灵犀九重】(D: E[×3.22]), 【通明】(D: E[×1.28]) | D |
| Conditionals | 【引灵摘魂】(D: +104% if debuffs), etc. | D |

> DoT amplifiers and state duration operators target the extended DoT phase — a separate function (F_dot). They appear in F4's input ports but their combos belong in a future F_dot section, not here.

**Combos — F_burst (flat multiplier across all 21 hits):**

| # | Op1 (type) | Op2 (type) | V(dr=0) | V(dr=50%) | V(dr=70%) | consumes | scenario fit | conditions |
|:--|:-----------|:-----------|:--------|:----------|:----------|:---------|:-------------|:-----------|
| 1 | 【心逐神随】(A) | 【灵犀九重】(D) | ×10.95 | ×5.48 | ×3.29 | `解体化形`, 剑修 book | O1, O2, O3 | — |
| 2 | 【心逐神随】(A) | 【引灵摘魂】(D) | ×6.94 | ×3.47 | ×2.08 | `解体化形`, `天魔降临咒` | O2 (debuffs=yes) | target has debuffs |
| 3 | 【心逐神随】(A) | 【明王之路】(A) | ×5.10 | ×2.55 | ×1.53 | `解体化形`, 法修 book | O1, O3 | — |

> **Cross-slot output (untargetable, not part of V).** All F4 combos provide 4s untargetable during main cast — a survival benefit (F_survive) that doesn't affect the burst V score but adds defensive value.

> **Two strategies for F4.** F_burst combos above (心逐 + X): ×10.95 flat across all 21 hits including ×28.9 peak. Future F_dot combos (【古魔之魂】/【业焰】 + 【天魔真解】): lower flat multiplier but concentrated on highest-value late hits with potential extension. F_dot catalog will appear in a dedicated section.

---

## Document History

| Version | Date | Changes |
|:--------|:-----|:--------|
| 1.0 | 2026-03-02 | Initial: F_burst function with function-specific value function V = [damage_mult, DR_interact, side_effects]. 4 foundations (F1–F4), per-foundation: qualified operators + combo tables. Operator action types: D(direct)/A(assistive)/B(both). Data sourced from chain.md §D, Layer 2 Solution Tables. |
| 1.1 | 2026-03-03 | Scenario-oriented revision. (1) Value function → V(combo, S) = effective_damage_mult(combo, dr, buff), single scalar parameterized by scenario. (2) DR_interact column → integrated as V(dr=50%), V(dr=70%). (3) side_effects → removed from V; cross-slot outputs noted below tables. (4) Added: enumeration principle (§1), scenario parameters table, per-foundation application scenarios, consumes column, scenario fit column. (5) 【心逐神随】 reclassified B→A (§2). (6) Removed F_dot combos from F3/F4 (scope: F_burst only; F_dot deferred to future section). |
