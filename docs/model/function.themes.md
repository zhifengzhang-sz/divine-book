---
initial date: 2026-3-8
tool: bun app/function-combos.ts --fn <id> --top 3
bug fix: lib/domain/functions.ts — removed filterByBinding + school filter (same fix as combo-rank.ts)
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

# Function Category × Platform

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

Each function category has a specific aim — only the factor dimensions relevant to that function matter. This doc maps each function to its natural platforms based on baseline vectors (primary affix + skill, no aux affixes).

**Tool:** `bun app/function-combos.ts --fn <id> [--platform X] [--top N]`

---

## Platform Baseline Vectors

| Platform | School | Provides | Baseline Vector |
|:---------|:-------|:---------|:----------------|
| `千锋聚灵剑` | Sword | Damage | D_base=20265  M_skill=42.5  D_orth=27 |
| `春黎剑阵` | Sword | Damage, Buff | D_base=22305 |
| `皓月剑诀` | Sword | Damage, Buff, Dot | D_base=22305  D_orth=1212 |
| `念剑诀` | Sword | Damage, Dot | D_base=22305  M_dmg=40 |
| `甲元仙符` | Spell | Damage, Buff, Healing | D_base=21090  S=70  H=190 |
| `大罗幻诀` | Demon | Damage, Debuff, Dot, State, Probability | D_base=20265  M_final=100 |
| `无相魔劫咒` | Demon | Damage, Debuff, State | D_base=1500 |
| `十方真魄` | Body | Damage, Buff, Healing, LostHp | D_base=1500  S=20  D_orth=6  DR=20 |
| `玄煞灵影诀` | Body | Damage, Buff, LostHp | *(empty — value is in 【怒意滔天】self-drain, not in model)* |
| `疾风九变` | Body | Damage, Buff, Healing, LostHp | D_base=1500  D_orth=55  H=82 |

---

## Function Catalog — Three-Tier Structure

**Tool:** `bun app/function-combos.ts --catalog`

Each function has three dimensions:
1. **Platform (native)** — which platforms serve this function via primary affix
2. **Aux affixes** — which affixes provide this function in aux position (core = directly provides, amp = amplifies)
3. **Adaptable platforms** — which platforms can carry these aux affixes

### Functions with working platform filters

| ID | Purpose | Platform (native) | Aux (core) | Aux (amplifier) | Adaptable |
|:---|:--------|:-------------------|:-----------|:----------------|:----------|
| F_hp_exploit | Own HP loss → damage | 十方真魄, 玄煞灵影诀, 疾风九变 (3) | 【战意】 | 【福荫】, 【摧山】, 【通明】, 【摧云折月】, 【灵犀九重】, 【破碎无双】, 【明王之路】, 【天命有归】, 【景星天佑】, 【意坠深渊】 | [LostHp] platforms (3) |
| F_truedmg | True dmg from debuffs | 大罗幻诀, 无相魔劫咒 (2) | *(none — primary-only mechanic)* | *(debuff stacking is via platform)* | [Debuff] platforms (2) |
| F_dot | Sustained DoT | 皓月剑诀, 念剑诀, 大罗幻诀 (3) | *(none — DoT is primary-only)* | 【业焰】, 【鬼印】 | [Dot] platforms (3) |
| F_sustain | Lifesteal / self-healing | 甲元仙符, 十方真魄, 疾风九变 (3) | *(none — healing is primary-only)* | 【长生天则】, 【瑶光却邪】 | [Healing] platforms (3) |

### Functions needing `primaryAffixOutputs` (TODO)

These return `all (10)` from the tool because `requiresPlatform` is empty — the real filter requires baseline vector thresholds or primary affix output checks not yet in the Platform model.

| ID | Purpose | Platform (actual) | Aux (core) | Aux (amplifier) | Fix needed |
|:---|:--------|:-------------------|:-----------|:----------------|:-----------|
| F_burst | Max single-slot damage | 千锋, 春黎, 皓月, 念剑, 甲元, 大罗 (6) | 【通明】, 【灵犀九重】 | 【击瑕】, 【破竹】, 【怒目】, 【福荫】, 【战意】, 【斩岳】, 【吞海】, 【摧山】, 【摧云折月】, 【破碎无双】, 【心火淬锋】, 【明王之路】, 【天命有归】, 【景星天佑】, 【溃魂击瑕】, 【破灭天光】, 【贪狼吞星】, 【意坠深渊】 | D_base ≥ 10000 threshold |
| F_exploit | %maxHP damage | 千锋, 皓月 (2) | *(none — primary-only)* | 【福荫】, 【摧山】, 【通明】, etc. | primaryAffixOutputs ∩ `percent_max_hp_damage` |
| F_buff | Team stat buff | 甲元, 十方 (2) | 【福荫】, 【景星天佑】 | 【清灵】, 【业焰】 | baseline S_coeff > 0 |
| F_survive | CC cleanse + DR | 十方真魄 (1) | 【金汤】, 【金刚护体】 | *(none)* | baseline DR_A > 0 |
| F_counter | Reflect attacks | 疾风九变 (1) | *(none — primary-only)* | 【清灵】, 【业焰】 | primaryAffixOutputs ∩ `counter_buff` |
| F_delayed | Delayed burst | 无相魔劫咒 (1) | *(none — primary-only)* | 【业焰】, 【福荫】, etc. | primaryAffixOutputs ∩ `delayed_burst` |

### Aux-only functions (platform-independent)

| ID | Purpose | Platform (native) | Aux (core) | Aux (amplifier) |
|:---|:--------|:-------------------|:-----------|:----------------|
| F_antiheal | Suppress enemy healing | none | 【祸星无妄】 | 【咒书】, 【业焰】 |
| F_dr_remove | Bypass enemy DR | none | *(none — exclusive-only)* | 【业焰】, 【福荫】, 【破碎无双】, 【天命有归】, 【景星天佑】, 【意坠深渊】 |
| F_dispel | Strip enemy buffs | none | *(none — exclusive-only)* | 【福荫】, 【摧山】, 【摧云折月】, 【破碎无双】, 【天命有归】, 【景星天佑】, 【意坠深渊】 |

> **Root cause for TODO functions:** `Platform` only has `provides: TargetCategory[]`. Functions that depend on baseline vector values or primary affix mechanics cannot be filtered. Fix: add `primaryAffixOutputs: string[]` to `Platform`, then `getQualifyingPlatforms` checks `fn.coreEffects ∩ platform.primaryAffixOutputs ≠ ∅`.

---

## Function → Platform Detail

### F_burst — Maximize single-slot damage

Relevant: D_base, M_dmg, M_skill, M_final

| Platform | D_base | Platform Bonus | Fit |
|:---------|:-------|:---------------|:----|
| `春黎剑阵` | 22305 | summon ×2.62 (16s) | **Best** — highest sustained D_base via clone |
| `皓月剑诀` | 22305 | D_orth=1212 (%maxHP) | **Best** — burst + %maxHP side channel |
| `念剑诀` | 22305 | M_dmg=40 | Strong — extra damage multiplier |
| `甲元仙符` | 21090 | S=70 | Good — slightly lower D_base |
| `千锋聚灵剑` | 20265 | M_skill=42.5 (per-hit) | Good — escalation compensates lower base |
| `大罗幻诀` | 20265 | M_final=100 | Good — unique final multiplier |
| Body platforms | 0–1500 | — | **Not suited** for burst |

### F_exploit — %maxHP damage

Relevant: D_orth, M_synchro

| Platform | D_orth (baseline) | Mechanism | Fit |
|:---------|:-----------------|:----------|:----|
| `皓月剑诀` | 1212 | 12% maxHP × 10 hits | **Best** — native %maxHP |
| `千锋聚灵剑` | 27 | enemy %maxHP from primary | Viable — lower magnitude |

### F_dot — Sustained DoT

Relevant: D_orth (DoT channel), requires [Dot] in provides

| Platform | Provides [Dot] | Platform Bonus | Fit |
|:---------|:---------------|:---------------|:----|
| `皓月剑诀` | Yes | D_orth=1212 | **Best** — DoT + %maxHP compound |
| `念剑诀` | Yes | M_dmg=40 | Good — DoT amplified by M_dmg |
| `大罗幻诀` | Yes | M_final=100 | Good — DoT amplified by M_final |

### F_truedmg — True damage from debuff stacks

Relevant: D_orth, requires [Debuff] in provides

| Platform | Provides [Debuff] | Platform Bonus | Fit |
|:---------|:------------------|:---------------|:----|
| `大罗幻诀` | Yes | M_final=100, D_base=20265 | **Best** — Debuff native + high base |
| `无相魔劫咒` | Yes | — | Viable — Debuff native but D_base=1500 |

### F_hp_exploit — Own HP loss → damage

Relevant: M_skill (per_self_lost_hp), requires [LostHp] in provides

| Platform | Provides [LostHp] | Platform Mechanism | Fit |
|:---------|:-------------------|:-------------------|:----|
| `玄煞灵影诀` | Yes | 【怒意滔天】4%HP/s self-drain, 【怒血战意】+2%/1%HP | **Best** — continuous HP-loss engine |
| `十方真魄` | Yes | DR=20 offsets self-damage cost | Good — safer HP exploit |
| `疾风九变` | Yes | H=82 self-healing | Good — HP exploit + sustain |

### F_buff — Persistent team stat buff

Relevant: S_coeff

| Platform | S (baseline) | Mechanism | Fit |
|:---------|:-------------|:----------|:----|
| `甲元仙符` | 70 | 仙佑 +70% ATK/DEF/HP (12s) | **Best** — highest buff coefficient |
| `十方真魄` | 20 | 怒灵降世 buff | Viable — lower S, but has [Healing] for buff sustain |

### F_sustain — Lifesteal / self-healing

Relevant: H_A

| Platform | H (baseline) | Mechanism | Fit |
|:---------|:-------------|:----------|:----|
| `甲元仙符` | 190 | 仙佑 healing | **Best** — highest baseline healing |
| `疾风九变` | 82 | 星猿复灵 healing | Good |
| `十方真魄` | 0 (but [Healing] in provides) | — | Viable — unlocks healing affixes |

### F_survive — CC cleanse + damage reduction

| Platform | DR (baseline) | Mechanism | Fit |
|:---------|:-------------|:----------|:----|
| `十方真魄` | 20 | 怒灵降世 DR + periodic cleanse | **Only** qualifying platform |

### F_counter — Reflect enemy attacks

| Platform | Mechanism | Fit |
|:---------|:----------|:----|
| `疾风九变` | Counter buff mechanic | **Only** qualifying platform |

### F_delayed — Delayed burst accumulation

| Platform | Mechanism | Fit |
|:---------|:----------|:----|
| `无相魔劫咒` | 无相魔劫 delayed detonation | **Only** qualifying platform |

---

## Build Themes

Themes form a **spectrum between two extremes**: all attack and all defense. Each step toward defense sacrifices attack output for survivability, and vice versa.

### Function Classification

| Role | Functions | What they do |
|:-----|:---------|:-------------|
| **Offense** | F_burst, F_exploit, F_hp_exploit, F_truedmg, F_dot, F_delayed | Deal damage directly |
| **Suppression** | F_antiheal, F_dr_remove, F_dispel | Reduce enemy effectiveness |
| **Defense** | F_survive, F_sustain, F_counter, F_buff (defensive) | Keep yourself alive |
| **Amplification** | F_buff (offensive) | Multiply other functions' output |

> F_buff is dual-role: offensive when amplifying burst slots (+ATK), defensive when amplifying survivability (+DEF/HP).

### The Spectrum

A theme is parameterized by a single value **α ∈ [0,1]** — the offense/defense ratio. Since offense + defense = 1, only one parameter is needed.

```
α=1.0          α=0.8          α=0.6          α=0.4          α=0.0
ALL ATTACK ◄──────────────────────────────────────────► ALL DEFENSE

Theme 1        Theme 2        Theme 3        Theme 4        Theme 5
All Attack     + Buff         + Suppression   + Survive      All Defense
```

### Strategic Variance

The number of viable strategies is **not uniform across α** — it peaks in the middle and narrows at both extremes:

```
Strategic
choices
    │
    │          ┌───┐
    │        ┌─┤   ├─┐
    │      ┌─┤ │   │ ├─┐
    │    ┌─┤ │ │   │ │ ├─┐
    │  ──┤ │ │ │   │ │ │ ├──
    └────┴─┴─┴─┴───┴─┴─┴─┴────► α
    0.0              0.5              1.0
    defense                         attack
```

| α range | Variance | Why |
|:--------|:---------|:----|
| α ≈ 1.0 | **Low** | All 6 slots must be burst platforms. Only choice is which 6 of 6 burst platforms and aux ordering. |
| α ≈ 0.8 | Medium | 1 slot freed for buff. Buff slot is essentially forced (甲元). Main choice: which burst platform to drop. |
| **α ≈ 0.5-0.6** | **High** | Mix of offense, suppression, and defense. Slot 4 has 5+ variants. Aux positions split between damage/utility/survive. Multiple valid platform combinations. |
| α ≈ 0.4 | Medium | 1-2 defensive platforms. Limited to 十方 and 疾风. Burst slots forced to highest D_base. |
| α ≈ 0.0 | **Low** | All defensive platforms used. Only 2 burst platforms remain (春黎 + 皓月 — highest D_base). Aux forced to survive/sustain amps. |

At the extremes, the build is **forced** — there's only one way to go all-in. In the middle, you have genuine **strategic choices**: which suppression functions to include, which slots to flex, which platform to sacrifice. This is where adaptive branching (pre-building multiple 灵書 variants) has the highest payoff.

### Slot Timing Reference

| Slot | Time | Temporal logic |
|:-----|:-----|:---------------|
| 1 | t=0s | Alpha strike — enemy full HP, no DR |
| 2 | t=4s | Follow-up — enemy HP still high, %maxHP effective |
| 3 | t=8s | Mid-rotation — buff here covers slots 4-6 (12-16s duration) |
| 4 | t=12s | Under buff — amplified. Enemy starts healing |
| 5 | t=16s | Late — own HP low (hp_exploit), debuffs accumulated (truedmg) |
| 6 | t=20s | Final — enemy DR stacked, cycle-wrap to round 2 |

### Available Platforms by Role

**Burst platforms (D_base ≥ 10000):**

| Platform | D_base | Unique bonus | Rank |
|:---------|:-------|:-------------|:-----|
| `春黎剑阵` | 22305 | summon ×2.62 | 1 |
| `皓月剑诀` | 22305 | D_orth=1212 (%maxHP) | 2 |
| `念剑诀` | 22305 | M_dmg=40 | 3 |
| `甲元仙符` | 21090 | S=70, H=190 (dual-role: burst or buff) | 4 |
| `千锋聚灵剑` | 20265 | M_skill=42.5/hit escalation | 5 |
| `大罗幻诀` | 20265 | M_final=100 (unique zone) | 6 |

**Body / defensive platforms:**

| Platform | Native functions | Defensive value |
|:---------|:----------------|:---------------|
| `十方真魄` | F_survive, F_buff (S=20), F_hp_exploit | DR=20, periodic cleanse — **only CC cleanse platform** |
| `疾风九变` | F_counter, F_sustain (H=82), F_hp_exploit | Counter reflect + self-healing |
| `玄煞灵影诀` | F_hp_exploit | Self-drain engine — offensive body platform |

---

### Theme 1: All Attack

**Principle:** Every slot and every aux maximizes damage. No buff, no debuff, no utility. All 6 burst-capable platforms used for F_burst.

**Platform swap vs Theme 3:** `大罗幻诀` replaces `甲元仙符` as buff bot → burst. `玄煞灵影诀` stays — F_hp_exploit IS an attack function (converts HP loss → damage).

| Slot | Platform | Functions | Aux-1 | Aux-2 |
|:-----|:---------|:----------|:------|:------|
| 1 | `春黎剑阵` | F_burst | damage amp | damage amp |
| 2 | `皓月剑诀` | F_burst, F_exploit | damage amp | damage amp |
| 3 | `念剑诀` | F_burst, F_dot | damage amp | damage amp |
| 4 | `千锋聚灵剑` | F_burst | damage amp | damage amp |
| 5 | `玄煞灵影诀` | F_hp_exploit | damage amp | damage amp |
| 6 | `大罗幻诀` | F_burst | damage amp | damage amp |

**Coverage:** F_burst ×5, F_exploit ×1, F_hp_exploit ×1, F_dot ×1. **Zero utility.**

**What you gain:** Slot 3 is now a full burst slot (念剑 D_base=22305). Slot 6 has M_final=100 (unique multiplicative zone). All 12 aux positions amplify damage.

**What you lose:** No F_buff — slots 4-6 not amplified by +70% ATK/DEF/HP. No F_antiheal — enemy heals freely. No F_dr_remove — enemy DR fully effective.

**When to use:** Pure damage race — whoever kills first wins. Opponent has no healing, no DR.

---

### Theme 2: Attack + Buff

**Principle:** Sacrifice one burst slot (slot 3) to add F_buff. The buff amplifies slots 4-6, so net damage may actually increase despite the "sacrifice."

**Platform swap vs Theme 1:** `甲元仙符` replaces `念剑诀` at slot 3. 念剑 moves to slot 6, 大罗 is dropped.

| Slot | Platform | Functions | Aux-1 | Aux-2 |
|:-----|:---------|:----------|:------|:------|
| 1 | `春黎剑阵` | F_burst | damage amp | damage amp |
| 2 | `皓月剑诀` | F_burst, F_exploit | damage amp | damage amp |
| 3 | `甲元仙符` | **F_buff**, F_sustain | **buff amp** | **buff amp** |
| 4 | `千锋聚灵剑` | F_burst | damage amp | damage amp |
| 5 | `玄煞灵影诀` | F_hp_exploit | damage amp | damage amp |
| 6 | `念剑诀` | F_burst, F_dot | damage amp | damage amp |

**Coverage:** F_burst ×4, F_buff ×1, F_exploit ×1, F_hp_exploit ×1, F_dot ×1, F_sustain ×1.

**Cost:** Slot 3 loses ~2 damage amps. Slots 4-6 each gain +70-143% ATK buff. Net: almost certainly positive — **Theme 2 likely deals more total damage than Theme 1.**

**When to use:** General purpose — buff is almost always worth the aux cost.

---

### Theme 3: Attack + Buff + Suppression

**Principle:** Starting from Theme 2, sacrifice some aux damage positions for suppression functions. Platform lineup is identical to Theme 2 — only aux allocation changes.

| Slot | Platform | Functions | Aux-1 | Aux-2 |
|:-----|:---------|:----------|:------|:------|
| 1 | `春黎剑阵` | F_burst | damage amp | damage amp |
| 2 | `皓月剑诀` | F_burst, F_exploit | damage amp | damage amp |
| 3 | `甲元仙符` | F_buff, F_sustain | buff amp | buff amp |
| 4 | `千锋聚灵剑` | F_burst, **+F_antiheal** | **【天倾灵枯】** | damage amp |
| 5 | `玄煞灵影诀` | F_hp_exploit, **+F_truedmg** | **【索心真诀】** | **【无相魔威】** |
| 6 | `念剑诀` | F_burst, F_dot, **+F_dr_remove** | **【神威冲云】** | damage amp |

**Coverage:** F_burst ×4, F_buff ×1, F_antiheal ×1, F_hp_exploit ×1, F_truedmg ×1, F_dr_remove ×1, F_exploit ×1, F_dot ×1, F_sustain ×1. **9 of 13 functions.**

**Aux cost:** 4 of 12 aux positions → suppression instead of damage.

**When to use:** Opponent has healing, DR, or high defense. This is the **current pvp.zz.tools.md build** (Scenario A).

---

### Theme 4: Attack + Buff + Suppression + Survive

**Principle:** Starting from Theme 3, sacrifice one burst platform for a defensive platform. Adds F_survive to stay alive long enough for late-slot functions to fire.

**Platform swap vs Theme 3:** `十方真魄` replaces `千锋聚灵剑` at slot 4. Loses a burst slot, gains DR + CC cleanse.

| Slot | Platform | Functions | Aux-1 | Aux-2 |
|:-----|:---------|:----------|:------|:------|
| 1 | `春黎剑阵` | F_burst | damage amp | damage amp |
| 2 | `皓月剑诀` | F_burst, F_exploit | damage amp | damage amp |
| 3 | `甲元仙符` | F_buff, F_sustain | buff amp | buff amp |
| 4 | `十方真魄` | **F_survive**, F_buff (S=20), F_hp_exploit | **survive amp** | **F_antiheal** |
| 5 | `玄煞灵影诀` | F_hp_exploit, +F_truedmg | 【索心真诀】 | 【无相魔威】 |
| 6 | `念剑诀` | F_burst, F_dot, +F_dr_remove | 【神威冲云】 | damage amp |

**Coverage:** F_burst ×3, F_buff ×2, F_survive ×1, F_antiheal ×1, F_hp_exploit ×2, F_truedmg ×1, F_dr_remove ×1, F_exploit ×1, F_dot ×1, F_sustain ×1. **10 of 13 functions.**

**What you gain over Theme 3:** Slot 4 DR=20 + periodic cleanse keeps you alive through enemy burst. Double F_buff (slot 3 S=70 + slot 4 S=20). Double F_hp_exploit (slot 4 + slot 5 both scale with HP loss).

**What you lose vs Theme 3:** Slot 4 drops from D_base=20265 (千锋) to D_base=1500 (十方). One less burst slot. No M_skill escalation.

**When to use:** Getting killed before slot 5. Need to survive enemy burst to reach the hp_exploit / truedmg payoff in slots 5-6.

---

### Theme 5: All Defense

**Principle:** Maximize survival. Every slot prioritizes staying alive — damage is incidental. Body and defensive platforms dominate. Win by outlasting.

| Slot | Platform | Functions | Aux-1 | Aux-2 |
|:-----|:---------|:----------|:------|:------|
| 1 | `甲元仙符` | F_buff (+DEF/HP), F_sustain | buff amp (duration) | buff amp (strength) |
| 2 | `十方真魄` | F_survive, F_buff (S=20) | survive amp (【金汤】) | survive amp (【金刚护体】) |
| 3 | `疾风九变` | F_counter, F_sustain (H=82) | sustain amp | sustain amp |
| 4 | `春黎剑阵` | F_burst | damage amp | damage amp |
| 5 | `玄煞灵影诀` | F_hp_exploit | damage amp | damage amp |
| 6 | `皓月剑诀` | F_burst, F_exploit | damage amp | damage amp |

**Coverage:** F_buff ×2, F_survive ×1, F_counter ×1, F_sustain ×2, F_burst ×2, F_hp_exploit ×1, F_exploit ×1. **8 of 13 functions.**

**Key changes:**
- Buff moved to slot 1 — buff covers ALL subsequent slots including defensive ones. F_buff here is +DEF/HP oriented (same S_coeff, different purpose).
- F_survive at slot 2 — early CC cleanse + DR protects through the critical mid-rotation.
- F_counter at slot 3 — reflect enemy damage back, punish aggressive opponents.
- Burst pushed to slots 4-6 — damage only after survival is established.
- Only 2 burst platforms (春黎 + 皓月) — minimum needed to threaten a kill.

**What you gain:** Maximum survivability. Buff duration covers entire rotation. DR + cleanse + counter + healing across slots 1-3. Enemy must burn through multiple defensive layers.

**What you lose:** Only 2 burst slots (vs 4-5 in offensive themes). Damage output roughly halved. Cannot kill fast — relies on attrition and hp_exploit scaling.

**When to use:** Massively outpowered. Enemy kills in 2-3 hits. Only chance is to survive long enough for hp_exploit scaling to matter, then counter-punch in slots 4-6 under full buff.

---

### Theme Comparison

| Dimension | Theme 1 | Theme 2 | Theme 3 | Theme 4 | Theme 5 |
|:----------|:--------|:--------|:--------|:--------|:--------|
| Orientation | All attack | Attack + amp | + suppression | + survive | All defense |
| Burst platforms | 5 | 4 | 4 | 3 | 2 |
| Defensive platforms | 0 | 0 | 0 | 1 (十方) | 2 (十方 + 疾风) |
| Aux: damage | 12/12 | 10/12 | 8/12 | 6/12 | 4/12 |
| Aux: buff/survive | 0 | 2 | 2 | 4 | 8 |
| Aux: suppression | 0 | 0 | 4 | 2 | 0 |
| F_burst slots | 5 | 4 | 4 | 3 | 2 |
| F_buff | No | Yes (S=70) | Yes | Yes (×2) | Yes (×2, DEF focus) |
| F_survive | No | No | No | Yes (DR=20) | Yes (DR=20) |
| F_counter | No | No | No | No | Yes |
| F_antiheal | No | No | Yes | Yes | No |
| F_dr_remove | No | No | Yes | Yes | No |
| Best vs | no-heal, no-DR | general | heal + DR | burst-heavy | massively outpowered |

> **Key insight:** The spectrum is not linear in damage output. Theme 2 may deal MORE damage than Theme 1 (buff amplification). Theme 3 deals less but denies enemy resources. Themes 4-5 trade damage for probability of reaching late slots where hp_exploit pays off.

---

### Theme Selection — Decision Tree

Theme selection is a decision tree over **scenario observables** — facts you know before the match starts. Each leaf is a theme (α value).

#### Scenario Observables

| Observable | How to assess | Values |
|:-----------|:-------------|:-------|
| **Power gap** | Compare stats, gear, progression | stronger / equal / weaker |
| **Enemy healing** | Known build, skill books, affixes | yes / no |
| **Enemy DR** | Known build, defensive affixes | yes / no |
| **Kill speed** | Estimate from power gap + burst potential | ≤3 slots / 4-5 slots / 6+ slots |
| **Survival risk** | Can you survive to slot 5? | safe / at risk / dying early |
| **Enemy immunity** | Initial immunity phase? | yes / no |

#### Decision Tree

```
Assess scenario observables
│
├─ Q1: Power gap?
│   │
│   ├─ Massively outpowered (dying in 1-2 slots)
│   │   └─ → Theme 5 (α=0.0, all defense)
│   │
│   ├─ Significantly weaker (dying before slot 5)
│   │   └─ Q2: Enemy has healing or DR?
│   │       ├─ Yes → Theme 4 (α=0.4, + survive + suppression)
│   │       └─ No  → Theme 4 (α=0.4, + survive, skip suppression)
│   │
│   ├─ Roughly equal
│   │   └─ Q3: Enemy has healing or DR?
│   │       ├─ Yes → Theme 3 (α=0.6, + suppression)
│   │       └─ No  → Theme 2 (α=0.8, + buff)
│   │
│   └─ Stronger than opponent
│       └─ Q4: Can kill in ≤3 slots?
│           ├─ Yes → Theme 1 (α=1.0, all attack)
│           └─ No  → Q5: Enemy has healing or DR?
│               ├─ Yes → Theme 3 (α=0.6)
│               └─ No  → Theme 2 (α=0.8)
```

The tree's first split is **power gap** — it determines how much defense you need. Within each branch, **enemy capabilities** (heal, DR) determine whether suppression is needed.

#### Special Case: Enemy Immunity

If the opponent has an initial immunity window, the standard slot ordering (burst first) wastes damage. Instead, reorder:

```
With enemy immunity:
├─ Slots 1-2: Setup (buff + debuff) — damage would be wasted anyway
├─ Slots 3-4: Burst — immunity expired, under buff
├─ Slots 5-6: Exploit + endure
```

This is a **slot reorder** within the chosen theme, not a different theme. See [剑九.md](../../data/books/剑九.md) for a full construction analysis example.

---

### Slot-Level Adaptation

After selecting a theme, adapt individual slots based on more specific conditions. This is the **second-level** decision — within a theme, which slot variant to use.

> **Constraint:** 灵書 are pre-built — can't change mid-combat. Adaptation means **pre-building multiple 灵書 for the same slot** and choosing which set to equip before the match.

#### Slot 4 — Primary Flex Point

Slot 4 sits at the offense/defense boundary. It has the most variants across themes.

| Variant | Condition | Platform | Aux-1 | Aux-2 | Theme |
|:--------|:----------|:---------|:------|:------|:------|
| **4a: Burst + antiheal** | Enemy heals | `千锋聚灵剑` | 【天倾灵枯】 | 【通明】 | 3 |
| **4b: Burst + self-damage** | Feed slot 5 hp_exploit | `千锋聚灵剑` | 【破釜沉舟】 | 【通明】 | 3 |
| **4c: Pure burst** | No utility needed | `千锋聚灵剑` | damage amp | damage amp | 1-2 |
| **4d: Survive** | Dying before slot 5 | `十方真魄` | survive amp | F_antiheal | 4 |
| **4e: Double hp_exploit** | HP loss extreme | `疾风九变` | hp_exploit amp | sustain amp | 4-5 |

#### Slot 3 — Orientation Switch

| Variant | Condition | Platform | Function | Theme |
|:--------|:----------|:---------|:---------|:------|
| **3a: Buff** | Fight goes 4+ slots | `甲元仙符` | F_buff, F_sustain | 2-5 |
| **3b: Burst** | Kill in ≤3 slots | `念剑诀` or `大罗幻诀` | F_burst | 1 |

#### Slot 1 — Lead Choice

| Variant | Condition | Platform | Function | Theme |
|:--------|:----------|:---------|:---------|:------|
| **1a: Alpha strike** | Opponent vulnerable | `春黎剑阵` | F_burst (summon) | 1-4 |
| **1b: Buff lead** | Opponent has immunity or massive burst | `甲元仙符` | F_buff (+DEF/HP) | 5 |

#### Slot 5 / Slot 6 — Late Flex

| Variant | Condition | Aux change |
|:--------|:----------|:-----------|
| **5a: Truedmg** | Debuff stacks accumulated | 【索心真诀】+【无相魔威】 |
| **5b: Pure hp_exploit** | Few debuffs, HP very low | damage amp × 2 |
| **6a: DR bypass** | Enemy has high DR | 【神威冲云】+【灵威】 |
| **6b: Cycle wrap** | Match going to round 2 | 【灵威】+ damage amp |

---

### Pre-Build Inventory

| Slot | Variants needed | Builds to prepare |
|:-----|:---------------|:------------------|
| 1 | 2 | `春黎剑阵` (alpha) or `甲元仙符` (buff lead) |
| 2 | 1 | `皓月剑诀` + 【玄心剑魄】+【无极剑阵】 |
| 3 | 2 | `甲元仙符` (buff) or `念剑诀`/`大罗幻诀` (burst) |
| 4 | 3-5 | `千锋聚灵剑` × 3 variants, optionally `十方真魄` or `疾风九变` |
| 5 | 2 | `玄煞灵影诀` × 2 variants (truedmg or pure hp_exploit) |
| 6 | 2 | `念剑诀` × 2 variants (DR bypass or cycle-wrap) |

**Total: 12-14 pre-built 灵書** to cover the full spectrum. Slot 4 has the most variants (offense/defense boundary).

---

## Function Dependency Graph

```
Slot 3: F_buff ──────────────────→ amplifies Slots 4-6 burst
Slot 4: F_antiheal ──────────────→ suppresses enemy healing from Slots 1-3 damage
Slot 5: F_truedmg ← needs debuff stacks from Slots 2-4
Slot 5: F_hp_exploit ← needs HP loss accumulated over Slots 1-4
Slot 4b: +50% self-damage-taken ──→ feeds Slot 5 F_hp_exploit scaling
Slot 6: F_dr_remove ← most valuable when enemy has DR from Slot 5 combat
Slot 6: F_burst (cycle-wrap) ───→ amplifies Cycle 2 Slot 1
```

---

## Platform × Function Matrix

| Platform | Primary Function | Secondary Function |
|:---------|:----------------|:-------------------|
| `春黎剑阵` | **F_burst** (D_base=22305, summon ×2.62) | — |
| `皓月剑诀` | **F_burst** (D_base=22305) | **F_exploit** (D_orth=1212), **F_dot** |
| `念剑诀` | **F_burst** (D_base=22305, M_dmg=40) | **F_dot**, F_dr_remove |
| `千锋聚灵剑` | **F_burst** (D_base=20265, M_skill=42.5) | **F_exploit** (D_orth=27) |
| `甲元仙符` | **F_buff** (S=70) | **F_sustain** (H=190) |
| `大罗幻诀` | **F_burst** (M_final=100) | **F_truedmg**, **F_dot** |
| `玄煞灵影诀` | **F_hp_exploit** (self-drain engine) | — |
| `十方真魄` | **F_survive** (DR=20) | **F_buff** (S=20), **F_hp_exploit** |
| `疾风九变` | **F_counter** | **F_sustain** (H=82), **F_hp_exploit** |
| `无相魔劫咒` | **F_delayed** | **F_truedmg** ([Debuff] native) |
