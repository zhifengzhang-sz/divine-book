---
initial date: 2026-4-3
character: 剑九
scenario: pvp vs stronger opponent
route: weapon support (Route 2)
method: docs/books/weapon.support.build.md
---


<style>
body {
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

* {
  max-width: 640px !important;
  overflow-wrap: break-word !important;
  word-break: break-word !important;
}

.mermaid, .mermaid svg {
  max-width: 640px !important;
  width: 640px !important;
  height: auto !important;
  overflow: hidden !important;
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
  color: #e5c07b;
}
</style>

# PvP vs Stronger Opponent — Weapon Support Build

**Character:** 剑九 (Sword school)
**Route:** Weapon support (Route 2)
**Method:** [weapon.support.build.md](weapon.support.build.md)

---

## Step 1: Scenario Analysis

| Question | Answer |
|:---------|:-------|
| Power gap? | Opponent is **stronger** |
| Enemy has healing? | Yes (assumed, pvp) |
| Enemy has damage reduction? | Yes (stronger = more stats, more DR) |
| Enemy has initial immunity? | No |
| Expected fight duration? | 1 cycle (30s) — must kill or cripple before cycle 2 |

---

## Step 2: Theme Selection

Stronger opponent + healing + DR → **Theme 3 (α=0.6)**

Rationale: Can't kill in 3 slots (Theme 1/2), not so outpowered that we need heavy sustain (Theme 4/5). Need suppression (heal suppression + DR removal) because opponent has both.

**Sustain budget:** 1-2 slots have sustain as secondary objective. 4-5 feature slots.

---

## Step 3: Feature → Slot Assignment

| Slot | Time | Feature(s) | Why |
|:-----|:-----|:-----------|:----|
| 1 | t=0 | **Clone** | Duplicate weapon system early, front-load pressure while enemy is full HP |
| 2 | t=6 | **Anti-defense** | Strip shields so weapons hit bare HP from t=6 onward |
| 3 | t=12 | **Buff** + **weapon interface** | Buff covers weapon peak window (t=12~24); interface leverages weapon procs |
| 4 | t=18 | **Debuff (permanent)** + **heal suppression** | Under buff window; suppress enemy recovery |
| 5 | t=24 | **Damage amp** + sustain (secondary) | Buff expired — bridge the gap, stay alive for weapons to finish |
| 6 | t=30 | **Reduction shred** | Bypass stacked DR for finisher window |

---

## Step 4: Platform Selection

Match each slot's feature to the platform whose native functions deliver it.

| Slot | Feature | Platform | Why |
|:-----|:--------|:---------|:----|
| 1 | Clone | `春黎剑阵` | Only platform with summon/clone (16s, inherits stats). dBase=22305. Native: F_burst |
| 2 | Anti-defense | `皓月剑诀` | Shield destroy per hit + double damage if no shield. 10 hits, dBase=22305. Native: F_burst, F_exploit, F_dot |
| 3 | Buff + weapon interface | `甲元仙符` | 仙佑 +70% atk/def/HP (12s) — the only strong buff platform. dBase=42900 (悟8). Native: F_buff, F_sustain |
| 4 | Debuff + heal suppression | `天魔降临咒` | 结魂锁链: permanent debuff, +5.25% damage taken, per-debuff scaling. Native debuff engine |
| 5 | Damage amp + sustain | `天刹真魔` | 不灭魔体: permanent counter-heal (sustain). 魔妄吞天: 天人五衰 stat shred (disruption). Native: defense platform |
| 6 | Reduction shred | `十方真魄` | F_survive + F_hp_exploit + F_buff. 10 hits, lost-HP burst as finisher. Native: F_survive, F_hp_exploit |

---

## Step 5: Aux Affix Selection

For each slot: does the feature need enablement, or is it self-sufficient (use amplifier)?

### Slot 1 — `春黎剑阵` (Clone)

Feature is self-sufficient (clone works on its own). Both aux positions → amplifiers.

| Aux | Affix | Source | Layer | Rationale |
|:----|:------|:-------|:------|:----------|
| 辅1 | 心逐神随 (x4 probability multiplier) | `解体化形`（专属） | **Stack mult** | x4 multiplies clone stats + all damage. The single strongest amplifier available |
| 辅2 | 灵犀九重 (guaranteed 会心 2.97x) | `千锋聚灵剑`（修为） | **Feature: anti-defense** | Adds SP drain channel via guaranteed crit — a second feature, not just an amplifier |

### Slot 2 — `皓月剑诀` (Anti-defense)

Feature is self-sufficient (shield strip is native). Aux → amplifiers + enablement.

| Aux | Affix | Source | Layer | Rationale |
|:----|:------|:-------|:------|:----------|
| 辅1 | 玄心剑魄 (噬心 DoT + dispel trap) | `春黎剑阵`（专属） | **Feature: debuff** | 16s DoT creates dispel dilemma — cleanse triggers 18000% burst + 3s stun |
| 辅2 | 无极剑阵 (+555% 神通伤害, -350% 减免) | `无极御剑诀`（专属） | **Damage amp** | Net +205% — amplifies shield strip and DoT damage |

### Slot 3 — `甲元仙符` (Buff + weapon interface)

Buff has low base (+70%). Needs stack multiplication to reach weapon-supporting levels.

| Aux | Affix | Source | Layer | Rationale |
|:----|:------|:-------|:------|:----------|
| 辅1 | 龙象护身 (buff strength x4) | `浩然星灵诀`（专属） | **Stack mult** | +70% × 4 = +280% atk/def/HP. Core enablement for the buff feature |
| 辅2 | 奇能诡道 (93.5% debuff duplication + 逆转阴阳) | `周天星元`（专属） | **Feature: weapon interface** | Direct weapon proc interaction — the bridge between 灵書 and weapon system |

Sustain (secondary): 天光虹露 (主词缀) provides +190% healing bonus during 仙佑 window.

### Slot 4 — `天魔降临咒` (Debuff + heal suppression)

Feature needs amplification — permanent DoT + per-debuff scaling benefits from tick rate and damage increase.

| Aux | Affix | Source | Layer | Rationale |
|:----|:------|:-------|:------|:----------|
| 辅1 | 追神真诀 (+26.5% lost HP/tick, +50% maxHP, +300% damage) | `皓月剑诀`（专属） | **Damage amp** | +300% damage increase on the permanent DoT engine |
| 辅2 | 天魔真解 (DoT tick rate x2) | `梵圣真魔咒`（专属） | **Duration ext** (effectively) | Doubles DoT DPS by halving tick interval — same net effect as doubling damage |

### Slot 5 — `天刹真魔` (Damage amp + sustain)

Dual-purpose slot: feature (damage amp for weapons) + sustain (stay alive post-仙佑).

| Aux | Affix | Source | Layer | Rationale |
|:----|:------|:-------|:------|:----------|
| 辅1 | 心魔惑言 (x2 debuff stacks) | `天轮魔经`（专属） | **Stack mult** | Doubles 天人五衰 + 魔劫 stacks — feeds 结魂锁链 per-debuff scaling |
| 辅2 | 无相魔威 (魔劫: +205% damage amp, -40.8% heal, 8s) | `无相魔劫咒`（专属） | **Feature: damage amp + heal suppression** | The strongest weapon-supporting damage amp in the set. Covers t=24~32 |

### Slot 6 — `十方真魄` (Reduction shred)

Feature needs enablement — 十方真魄 is a finisher platform, but reduction bypass comes from aux.

| Aux | Affix | Source | Layer | Rationale |
|:----|:------|:-------|:------|:----------|
| 辅1 | 索心真诀 (2.1% maxHP true damage per debuff, cap 10) | `惊蜇化龙`（专属） | **Feature: debuff reader** | Harvests all debuffs from Slots 4-5 — true damage ignores defense |
| 辅2 | 神威冲云 (ignore ALL damage reduction + 36% damage) | `通天剑诀`（专属） | **Feature: reduction shred** | The reduction shred feature itself — nothing stops this hit |

Sustain: 星猿弃天 (主词缀) extends 怒灵降世 to 7.5s + periodic cleanse.

---

## Step 6: Verification

### Build Table

| Slot | Name | 主位 | 辅位1 | 辅位2 |
|:-----|:-----|:-----|:------|:------|
| 1 | 金光真剑 | `春黎剑阵` | `解体化形`（专属） | `千锋聚灵剑`（修为） |
| 2 | 洪荒真剑 | `皓月剑诀` | `春黎剑阵`（专属） | `无极御剑诀`（专属） |
| 3 | 风花真法 | `甲元仙符` | `浩然星灵诀`（专属） | `周天星元`（专属） |
| 4 | 九阳真魔言 | `天魔降临咒` | `皓月剑诀`（专属） | `梵圣真魔咒`（专属） |
| 5 | 浮云真魔典 | `天刹真魔` | `天轮魔经`（专属） | `无相魔劫咒`（专属） |
| 6 | 造化真灵 | `十方真魄` | `惊蜇化龙`（专属） | `通天剑诀`（专属） |

### Taxonomy Summary

| Slot | Feature(s) | Amplifier(s) | Sustain |
|:-----|:-----------|:-------------|:--------|
| 1 | Clone (春黎 16s), anti-defense (灵犀九重 crit → SP drain) | Stack mult (心逐神随 x4) | Clone as distraction |
| 2 | Anti-defense (皓月 shield strip), debuff (噬心 DoT trap) | Damage amp (无极剑阵 +205% net) | — |
| 3 | Buff (仙佑 +280%), weapon interface (奇能诡道) | Stack mult (龙象护身 x4) | Healing (天光虹露 +190%) |
| 4 | Debuff (结魂锁链 permanent) | Damage amp (追神真诀 +300%), duration ext (天魔真解 x2 tick) | — |
| 5 | Damage amp (魔劫 +205%), heal suppression (-40.8%) | Stack mult (心魔惑言 x2) | Defense (不灭魔体 8%), disruption (天人五衰) |
| 6 | Reduction shred (神威冲云 ignore all), debuff reader (索心真诀) | — | Sustain (怒灵降世 cleanse + buff) |

### Conflict Check

| Check | Result |
|:------|:-------|
| 春黎剑阵: main at Slot 1, aux at Slot 2 | Cross-type reuse — **no conflict** |
| 皓月剑诀: main at Slot 2, aux at Slot 4 | Cross-type reuse — **no conflict** |
| No duplicate aux books across slots | **pass** |
| No duplicate main books across slots | **pass** |

### Feature Coverage

| Feature | Slot | Temporal window |
|:--------|:-----|:----------------|
| Clone | 1 (t=0) | t=0~16 |
| Anti-defense (crit/SP drain) | 1 (t=0) | t=0 burst |
| Anti-defense (shield strip) | 2 (t=6) | t=6 burst |
| Buff (+280% atk) | 3 (t=12) | t=12~24 |
| Weapon interface (奇能诡道) | 3 (t=12) | On-cast at t=12 |
| Debuff (结魂锁链) | 4 (t=18) | t=18 → permanent |
| Damage amp (魔劫 +205%) | 5 (t=24) | t=24~32 |
| Heal suppression (-40.8%) | 5 (t=24) | t=24~32 |
| Sustain (不灭魔体) | 5 (t=24) | t=24 → permanent |
| Reduction shred | 6 (t=30) | t=30 burst |

### Gaps

1. **t=0~12: No buff, no sustain** — Clone provides distraction but no stat support. Weapons operate at base power.
2. **t=24~: Buff expired** — 仙佑 ends. 魔劫 +205% partially compensates but is a different multiplicative zone.
3. **Heal suppression is late (t=24)** — Enemy heals freely t=0~24. Acceptable if weapon + 灵書 pressure is high enough to outpace healing.

---

## References

| Doc | Role |
|:----|:-----|
| [weapon.support.build.md](weapon.support.build.md) | Construction method followed |
| [weapon.support.taxonomy.md](../model/weapon.support.taxonomy.md) | Feature/amplifier/sustain definitions |
| [guide.build.md](guide.build.md) | Generic 6-step process |
| [剑九.md](../../data/books/剑九.md) | Detailed per-slot analysis of this same build |
