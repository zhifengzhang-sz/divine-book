---
initial date: 2026-4-3
character: 剑九
scenario: pvp vs stronger opponent
route: weapon support (Route 2)
iteration: 2
base: pvp.so.1.md
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

# Proposal 2 — Weakness Analysis from Proposal 1

**Base:** [pvp.so.1.md](pvp.so.1.md)

Three weaknesses identified in Proposal 1:

| # | Weakness | Window |
|:--|:---------|:-------|
| 1 | No buff — weapons at base power | t=0~12 |
| 2 | Buff expires — 仙佑 +280% ends | t=24 |
| 3 | No heal suppression — enemy heals freely | t=0~24 |

---

## Weakness 2: Buff Expires at t=24

### Problem

仙佑 (+280% atk/def/HP) from Slot 3 (`甲元仙符`, t=12) lasts 12 seconds, covering t=12~24. After t=24, weapons lose the buff. Slots 5-6 fire without the +280% atk multiplier.

### Possible Enhancements

**Option A — Extend buff duration: swap 奇能诡道 for 仙露护元**

Slot 3 辅2: `周天星元`（奇能诡道）→ `念剑诀`（仙露护元 +300% buff duration）

| | Before | After |
|:--|:-------|:------|
| 仙佑 duration | 12s (t=12~24) | 48s (t=12~60) |
| Weapon interface | 奇能诡道: 93.5% debuff duplication + 逆转阴阳 | **Lost** |
| Buff strength | +280% (龙象护身 x4) | +280% (unchanged) |

**Analysis:** 奇能诡道 is the **only weapon interface** in the entire set. It is the direct bridge between 灵書 debuffs and weapon procs — when the weapon system applies 减益 or triggers 伤害加深类增益, 奇能诡道 duplicates the debuff (93.5% chance) and shreds enemy reduction (逆转阴阳 -0.7×). Without it, Slots 4-5's debuffs are not duplicated onto weapon hits, and weapon procs do not shred enemy reduction. The weapon system loses more total DPS from losing this interface than it gains from 24 extra seconds of +280% atk.

**Verdict:** Rejected — weapon interface value exceeds extended buff value.

---

**Option B — Extend buff duration: swap 龙象护身 for 真言不灭**

Slot 3 辅1: `浩然星灵诀`（龙象护身 x4）→ `疾风九变`（真言不灭 +55% all state duration）

| | Before | After |
|:--|:-------|:------|
| 仙佑 duration | 12s (t=12~24) | 18.6s (t=12~30.6) |
| Buff strength | +280% (x4) | **+70%** (no multiplier) |
| Weapon interface | 奇能诡道 | 奇能诡道 (unchanged) |

**Analysis:** +70% for 18.6s is strictly less total value than +280% for 12s. During the weapon peak window (t=12~24), every weapon hit is already amplified by Slot 4's debuffs (结魂锁链 +5.25%) and Slot 3's weapon interface (奇能诡道). These multiplicative effects apply on top of the buff — a 4x stronger buff during this window produces far more total damage than a weaker buff that extends past it. The math: +280% × 12s = 3360%-seconds vs +70% × 18.6s = 1302%-seconds. Not close.

**Verdict:** Rejected — buff strength during peak window matters more than coverage.

---

**Option C — Accept tradeoff, rely on existing mitigation**

Keep Slot 3 unchanged. 仙佑 expires at t=24. Existing mitigation:

- **Slot 5 魔劫 +205%** (t=24~32): damage amplification from a different multiplicative zone covers the post-buff window
- **Slot 5 天人五衰**: enemy stat shred reduces their effective defense, partially compensating for the lost buff
- **Slot 6 神威冲云**: ignores ALL damage reduction at t=30 — doesn't need the buff to be effective

The buff expiry is a structural constraint of the platform pool: no platform can provide both strong buff strength (龙象护身) and extended duration (仙露护元/真言不灭) simultaneously, because both compete for aux positions against the weapon interface (奇能诡道) which is irreplaceable.

**Verdict:** Accepted tradeoff. 魔劫 +205% is the replacement damage source for t=24~32.

---

## Weakness 1: No Buff at t=0~12

### Problem

仙佑 activates at t=12 (Slot 3). For the first 12 seconds, weapons operate at base power with no stat buff. Slot 1 (春黎 clone) and Slot 2 (皓月 shield strip) provide their own value, but neither buffs weapon stats.

### Possible Enhancements

**Option A — Move 甲元仙符 to Slot 1**

Swap Slot 1 and Slot 3 platforms: `春黎剑阵` → Slot 3, `甲元仙符` → Slot 1.

| | Before | After |
|:--|:-------|:------|
| Buff window | t=12~24 | t=0~12 |
| Clone | t=0 (16s weapon doubling) | t=12 (16s, but buff already active) |
| Buff covers weapon peak? | t=12~24 ✓ | t=0~12 (misses Slots 4-5-6) |

**Analysis:** Moving the buff to t=0 means it expires at t=12, covering only Slots 1-2. Slots 3-6 (where debuffs, damage amp, and finisher fire) lose the buff entirely. Worse: the clone at t=12 would double weapons during a window where buff is expiring, not starting. The current design puts buff at t=12 precisely because weapon damage peaks during the debuff/amp stacking phase (t=12~24). Front-loading the buff wastes it on a window where weapons haven't ramped yet.

**Verdict:** Rejected — buff at t=0~12 covers the wrong window.

---

**Option B — Move 甲元仙符 to Slot 2**

Swap Slot 2 and Slot 3: `皓月剑诀` → Slot 3, `甲元仙符` → Slot 2.

| | Before | After |
|:--|:-------|:------|
| Buff window | t=12~24 | t=6~18 |
| Shield strip | t=6 (early, clears shields for weapons) | t=12 (delayed) |

**Analysis:** Buff at t=6~18 covers Slots 2-3-4 but misses Slot 5 (魔劫 +205%) and Slot 6 (finisher). Shield strip is delayed to t=12, meaning weapons hit shields for 12 seconds instead of 6. The current design strips shields at t=6 so weapons hit bare HP during the buff window — reversing this order means weapons hit shields during part of the buff window, wasting buff value on shielded hits.

**Verdict:** Rejected — delaying shield strip wastes buff on shielded hits.

---

**Option C — Add a second buff source at Slot 1 or 2 via aux**

Use a buff-providing aux affix at Slot 1 or 2 (e.g. 天威煌煌 from 新-青元剑诀: +88/108/128% next skill buff).

**Analysis:** Available buff aux affixes are weak compared to 仙佑 +280%. 天威煌煌 provides +128% at best, applies only to the next skill, and requires using 新-青元剑诀 as aux — displacing either 心逐神随 (x4 multiplier) or 灵犀九重 (guaranteed crit) at Slot 1. Both are more valuable than a one-shot +128% buff.

**Verdict:** Rejected — available buff aux are too weak to justify displacing Slot 1's amplifiers.

---

**Option D — Accept tradeoff**

Keep Slot 1 and 2 as-is. Weapons operate at base power for t=0~12. Existing value during this window:

- **Slot 1 春黎 clone** (t=0~16): doubles weapon output at base power — 2× base is still significant
- **Slot 1 心逐神随 x4**: multiplies clone + all damage by 4x — compensates for no buff
- **Slot 1 灵犀九重**: guaranteed crit drains enemy 灵力 — opens the SP channel regardless of buff
- **Slot 2 皓月 shield strip** (t=6): clears defensive layers so that when buff arrives at t=12, weapons immediately hit bare HP at +280%

The t=0~12 window is not wasted — it's the **setup phase**. Clone doubles weapons, crit drains SP, shields are stripped. When 仙佑 activates at t=12, weapons are hitting an enemy with no shields, depleted SP, and active clone — the buff amplifies an already-prepared battlefield.

**Verdict:** Accepted tradeoff. t=0~12 is setup, not dead time.

---

## Weakness 3: No Heal Suppression at t=0~24

### Problem

Heal suppression (魔劫 -40.8%) activates at t=24 (Slot 5). For 24 seconds, the enemy heals freely. If the enemy has strong healing, they can outheal the damage from Slots 1-4.

### Possible Enhancements

**Option A — Add early heal suppression via 天哀灵涸**

`千锋聚灵剑` exclusive affix 天哀灵涸: -80% heal, 8s. Currently 千锋聚灵剑 is used at Slot 1 辅2 for **灵犀九重 (修为 affix)**, not its exclusive.

To use 天哀灵涸, move 千锋聚灵剑 to a different slot as exclusive:
- Slot 2 辅位: replace 玄心剑魄 (噬心 DoT trap) or 无极剑阵 (+205% amp)

| Replace | Gain | Lose |
|:--------|:-----|:-----|
| 玄心剑魄 (Slot 2 辅1) | -80% heal, 8s (t=6~14) | 噬心 DoT 16s + dispel trap (18000% burst + 3s stun) |
| 无极剑阵 (Slot 2 辅2) | -80% heal, 8s (t=6~14) | +555% 神通伤害 / -350% 减免 (net +205% amp) |

**Analysis:** 天哀灵涸 covers only 8 seconds (t=6~14) — a narrow window. Losing the dispel trap (玄心剑魄) removes Slot 2's debuff pressure and the 18000% burst deterrent. Losing 无极剑阵 removes +205% damage amplification from Slot 2's shield strip. Either trade gives 8 seconds of heal suppression at the cost of a permanent feature. The heal suppression window (t=6~14) also ends before the buff window starts (t=12) — the enemy can heal during t=14~24, exactly when weapons are buffed and dealing peak damage.

**Verdict:** Rejected — 8s coverage is too narrow, and the timing doesn't align with weapon peak.

---

**Option B — Add early heal suppression via 天倾灵枯**

`甲元仙符` exclusive affix 天倾灵枯: heal reduction, 20s. 甲元仙符 is main at Slot 3. Cross-type reuse is legal — use 甲元仙符 as aux at Slot 1 or 2 for 天倾灵枯.

| Placement | Heal suppression window | Displaces |
|:----------|:-----------------------|:----------|
| Slot 1 辅1 | t=0~20 | 心逐神随 (x4 multiplier) |
| Slot 1 辅2 | t=0~20 | 灵犀九重 (guaranteed crit) |
| Slot 2 辅1 | t=6~26 | 玄心剑魄 (噬心 DoT trap) |
| Slot 2 辅2 | t=6~26 | 无极剑阵 (+205% amp) |

**Analysis:** Every placement displaces a high-value component. Losing 心逐神随 (x4) at Slot 1 is catastrophic — it's the single strongest amplifier. Losing 灵犀九重 removes the SP drain channel. Losing Slot 2 components repeats the same problems as Option A. 天倾灵枯's 20s window is better than 天哀灵涸's 8s, but the cost of displacing core amplifiers or features is too high.

**Verdict:** Rejected — no aux position can absorb heal suppression without losing more value.

---

**Option C — Accept tradeoff, rely on pressure exceeding healing**

Keep Slot 5 as the sole heal suppression point. The enemy heals freely for t=0~24. Existing pressure during this window:

- **t=0~16**: Clone doubles all weapon output + 4x multiplier + guaranteed crit SP drain. Raw damage throughput is high enough to outpace most healing
- **t=6~**: Shield strip removes defensive layers. Healing recovers HP but not shields — once stripped, weapons continue hitting bare HP
- **t=12~24**: +280% atk buff amplifies all damage. Healing must outpace buffed weapon hits + buffed 灵書 hits simultaneously
- **t=18~**: 结魂锁链 permanent debuff means enemy takes +5.25% more damage from everything, compounding over time

The build's damage output during t=0~24 is front-loaded (clone x4 burst at t=0, shield strip at t=6, +280% buff at t=12). For the enemy's healing to matter, they would need to outheal this combined pressure — which requires exceptional healing throughput. When 魔劫 arrives at t=24 (-40.8% heal + +205% damage), it shuts the door on any remaining recovery.

**Verdict:** Accepted tradeoff. Damage pressure outpaces healing; 魔劫 at t=24 closes the gap.

---

## Proposal 2 Summary

All three weaknesses analyzed. None can be cheaply fixed — each potential enhancement requires displacing a component whose value exceeds the fix.

| Weakness | Verdict | Mitigation |
|:---------|:--------|:-----------|
| t=0~12 no buff | **Accepted** | Setup phase: clone doubles weapons, crit drains SP, shields stripped. Buff at t=12 amplifies a prepared battlefield |
| t=24 buff expires | **Accepted** | 魔劫 +205% (t=24~32) replaces buff as damage source. 神威冲云 ignores reduction at t=30 |
| t=0~24 no heal suppression | **Accepted** | Front-loaded damage pressure (clone x4 + shield strip + +280% buff) outpaces healing. 魔劫 -40.8% at t=24 closes the gap |

**Conclusion:** Proposal 1's build table is unchanged. The weaknesses are structural constraints of the platform and affix pool — not design errors. Each weakness has existing mitigation that the build already provides. The build is at a **local optimum** for this platform pool and Route 2 strategy.

### Unchanged Build Table

| Slot | Name | 主位 | 辅位1 | 辅位2 |
|:-----|:-----|:-----|:------|:------|
| 1 | 金光真剑 | `春黎剑阵` | `解体化形`（专属） | `千锋聚灵剑`（修为） |
| 2 | 洪荒真剑 | `皓月剑诀` | `春黎剑阵`（专属） | `无极御剑诀`（专属） |
| 3 | 风花真法 | `甲元仙符` | `浩然星灵诀`（专属） | `周天星元`（专属） |
| 4 | 九阳真魔言 | `天魔降临咒` | `皓月剑诀`（专属） | `梵圣真魔咒`（专属） |
| 5 | 浮云真魔典 | `天刹真魔` | `天轮魔经`（专属） | `无相魔劫咒`（专属） |
| 6 | 造化真灵 | `十方真魄` | `惊蜇化龙`（专属） | `通天剑诀`（专属） |

---

## Next Iteration

If the build is at a local optimum for the current feature assignment (Step 3), the next iteration should question whether the feature assignment itself is optimal:

- Could a different feature at Slot 1 (e.g. counter instead of clone) produce a better overall set?
- Could a different debuff platform at Slot 4 enable earlier heal suppression?
- Does the weapon rotation data (once available) change which slots need which features?

These are Proposal 3 questions — they require re-running Steps 3-5 with different feature assignments, not just swapping aux affixes within the current assignment.

---

## References

| Doc | Role |
|:----|:-----|
| [pvp.so.1.md](pvp.so.1.md) | Base proposal with weakness identification |
| [weapon.support.build.md](weapon.support.build.md) | Construction method |
| [weapon.support.taxonomy.md](../model/weapon.support.taxonomy.md) | Feature/amplifier/sustain definitions |
