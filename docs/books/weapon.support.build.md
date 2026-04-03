---
initial date: 2026-4-3
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

# Weapon Support Build — Route 2 Construction

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

Construction guide for building a 6-slot 灵書 set whose primary route is **weapon support** (Route 2). Uses the [weapon support taxonomy](../model/weapon.support.taxonomy.md) (features/amplifiers/sustain) on top of the [generic build process](guide.build.md).

---

## Relationship to the Generic Process

The [generic build guide](guide.build.md) defines 6 steps that apply to any build. This doc specializes Steps 2, 3, and 5 for weapon support:

| Generic step | Weapon support specialization |
|:-------------|:-----------------------------|
| Step 2: Theme | Theme α also sets the **sustain budget** — how many slots/aux positions go to keeping you alive vs serving weapons |
| Step 3: Function → Slot | Slot objectives are stated as **features** from the taxonomy, not raw functions |
| Step 5: Aux selection | Aux positions serve either **amplifiers** (scale features) or **sustain** (buy time) |

Steps 1 (scenario), 4 (platform), and 6 (verify) are unchanged.

---

## Sustain Budget by Theme

Theme α determines how much of the 6-slot budget goes to sustain vs features:

| Theme | α | Feature slots | Sustain allocation |
|:------|:--|:-------------|:-------------------|
| Theme 1 | 1.0 | 6 | Aux positions only (e.g. passive counter-heal) |
| Theme 2 | 0.8 | 5 | 1 slot has sustain as secondary objective |
| Theme 3 | 0.6 | 4-5 | 1-2 slots have sustain as secondary objective |
| Theme 4 | 0.4 | 3 | 2 dedicated sustain slots |
| Theme 5 | 0.0 | 2 | 4+ sustain slots, weapons are secondary |

---

## Feature → Slot Assignment

Each feature has a natural slot affinity based on timing and what the weapon system needs at that point in the fight:

| Slot | Time | Natural features | Why |
|:-----|:-----|:----------------|:----|
| 1 | t=0 | Clone, counter | Enemy full HP — opener sets tempo, duplicate weapon system early |
| 2 | t=6 | Anti-defense, debuff | Strip shields early so weapons hit bare HP from t=6 onward |
| 3 | t=12 | Buff, weapon interface | Buff duration covers weapon peak window (t=12~24) |
| 4 | t=18 | Debuff (permanent), heal suppression | Under buff window; enemy starts healing, need to suppress |
| 5 | t=24 | Damage amp, sustain | Buff expired — bridge the gap, stay alive for weapons to finish |
| 6 | t=30 | Reduction shred | Enemy DR stacked — bypass everything for the closing window |

Each slot should name **1-2 features**, not more.

---

## Amplifier Selection Principle

For each slot's 2 aux positions:

1. If the feature needs **enablement** (can't function alone) → aux serves the feature directly
2. If the feature is **self-sufficient** → aux is an **amplifier** (damage amp, duration extension, or stack multiplication)

The choice between amplifier types depends on the feature:

| Feature type | Best amplifier | Why |
|:-------------|:---------------|:----|
| Buff with short duration | Duration extension | More weapon hits covered |
| Buff with low base value | Stack multiplication | Higher multiplier |
| Per-stack debuff | Stack multiplication | More stacks = more scaling |
| Any high-damage feature | Damage amp | Multiplicative on top |

---

## Temporal Verification

After assigning features and amplifiers, verify that each feature's **active window** covers the weapon hits that need it:

1. Map each feature's duration against the slot rotation (t=0, 6, 12, 18, 24, 30)
2. Check: does the buff reach the weapon peak window? Does the debuff last until the finisher reads it?
3. Identify gaps — windows where no feature is active and weapons are unsupported

If gaps exist, either:
- Add a duration extension amplifier to stretch a feature across the gap
- Accept the gap and ensure sustain covers it (so you survive until the next feature activates)

---

## Example: 剑九 Variation A

| Slot | Feature(s) | Amplifier(s) | Sustain |
|:-----|:-----------|:-------------|:--------|
| 1 | Clone (春黎 16s), anti-defense (灵犀九重 crit → SP drain) | Stack mult (心逐神随 x4) | Clone as distraction |
| 2 | Anti-defense (皓月 shield strip) | Damage amp (无极剑阵 +205% net) | — |
| 3 | Buff (仙佑 +280%), weapon interface (奇能诡道) | Stack mult (龙象护身 x4) | Healing (天光虹露 +190%) |
| 4 | Debuff (结魂锁链 permanent) | Duration ext (天魔真解 x2 tick), damage amp (追神真诀 +300%) | — |
| 5 | Damage amp (魔劫 +205%), heal suppression (-40.8%) | Stack mult (心魔惑言 x2) | Defense (不灭魔体 8%), disruption (天人五衰) |
| 6 | Reduction shred (神威冲云 ignore all) | — | Sustain (怒灵降世 cleanse + buff) |

> Some components serve dual roles. 天人五衰 is both a debuff feature (feeds 结魂锁链 stacks) and disruption sustain (weakens enemy). 魔劫 is both a feature (damage amp for weapons) and an amplifier (scales all other features' damage). Classification follows the **primary purpose** in the slot's objective.

---

## References

| Doc | What it provides |
|:----|:----------------|
| [Weapon support taxonomy](../model/weapon.support.taxonomy.md) | Feature/amplifier/sustain definitions |
| [Generic build guide](guide.build.md) | The 6-step process this doc specializes |
| [剑九.md](../../data/books/剑九.md) | Full worked example with per-slot analysis |
