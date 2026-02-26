---
initial date: 2026-2-25
dates of modification: [2026-2-25]
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
  border-left: 3px solid #4b5263;
  padding-left: 10px;
  color: #5c6370;
}

strong {
  color: #e5c07b;
}
</style>

# Divine Book Combat Model: Qualitative Framework

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Constructive framework for book set design.** Four questions answered systematically: (1) what scenarios exist and how they map to the slot sequence, (2) which category combinations serve each scenario, (3) which category leads, and (4) how to select affixes within each category. The framework produces builds from scratch — from design space to slot assignment — without requiring opponent modeling. Complements the quantitative route in [combat.md](combat.md).

---

## Table of Contents

| Section | Content |
|:--------|:--------|
| **1. Design Space** | 14 effect categories, 4 affix pools, interaction types |
| **2. Scenarios** | Common scenarios and their slot sequence logic |
| **3. Category Combinations** | Per scenario, optimal 3-category allocations |
| **4. Primary Category** | Which category leads each scenario and why |
| **5. Affix Selection** | Per category, best options across all pools |
| **6. Construction Procedure** | Greedy algorithm from scenario to slot assignment |

---

## 1. Design Space

### 1.1 Effect Categories

The 14 effect categories from [keyword.map](../data/keyword.map.md) define the vocabulary of book construction:

| $C_n$ | Category | Core effect types | Interaction |
|:--|:---------|:-----------------|:------------|
| 0 | Shared Mechanics | fusion_flat_damage, mastery_extra_damage, enlightenment_damage | Inherent |
| 1 | Base Damage | base_attack, percent_max_hp_damage, shield_destroy_damage | Inherent (main skill) |
| 2 | Damage Multiplier Zones | attack_bonus, damage_increase, skill_damage_increase, final_damage_bonus | Additive within zone |
| 3 | Critical System | guaranteed_crit, probability_multiplier | **Multiplicative** |
| 4 | Conditional Triggers | conditional_damage, probability_to_certain, ignore_damage_reduction | Conditional |
| 5 | Per-Hit Escalation | per_hit_escalation, periodic_escalation | Hit-count dependent |
| 6 | HP-Based Calculations | per_self_lost_hp, per_enemy_lost_hp, self_hp_cost, self_lost_hp_damage | State-dependent |
| 7 | Healing & Survival | lifesteal, healing_increase, self_damage_reduction_during_cast | Sustain |
| 8 | Shield System | shield_strength, on_shield_expire, damage_to_shield | Defense |
| 9 | State Modifiers | buff_strength, debuff_strength, buff_duration, stack_increase | **Multiplicative** (meta) |
| 10 | DoT | dot, dot_damage_increase, dot_frequency_increase, on_dispel | Sustained |
| 11 | Self Buffs | self_buff, self_buff_extend, next_skill_buff | Temporal |
| 12 | Debuffs | debuff, conditional_debuff, cross_slot_debuff | Strategic |
| 13 | Special Mechanics | summon, delayed_burst, per_stack_damage, periodic_dispel | Unique |

**Key distinction:** $C_3$ and $C_9$ are **multiplicative** — they compound with other categories. $C_2$ is additive within zones (diminishing marginal returns when stacking multiple effects in the same zone). This asymmetry drives the observed 5× performance gap between slots with and without multiplicative amplifiers.

### 1.2 Affix Pools

Each divine book is constructed from 3 source books. The affix contributions come from 4 pools:

| Pool | Position | Selection | Power |
|:-----|:---------|:----------|:------|
| **Main primary affix** | Main (主位) | Deterministic — always the book's primary affix | Highest (skill + affix package) |
| **Exclusive (专属)** | Auxiliary (辅位) | Highest priority in random selection | High (28 total, 7 per school) |
| **School (修为)** | Auxiliary (辅位) | Second priority | Medium (17 total, 4–5 per school) |
| **Universal (通用)** | Auxiliary (辅位) | Lowest priority | Baseline (16 total) |

The **main position** is the most constrained and most powerful choice: it determines the skill's damage structure (hit count, %HP, scaling), the primary affix (deterministic), and one of the three source books. The two auxiliary positions provide secondary affixes from the remaining two source books.

### 1.3 Category Interaction Types

| Type | Categories | Behavior |
|:-----|:----------|:---------|
| **Multiplicative** | $C_3$, $C_9$ | Compounds with all other output — highest ceiling |
| **Additive** | $C_2$ (within same zone) | Diminishing returns as zone crowds |
| **Orthogonal** | $C_6$, $C_{10}$, $C_{12}$ | Independent channels, don't crowd $C_2$ zones |
| **Temporal** | $C_9$, $C_{11}$ | Value propagates across slots via duration |
| **Conditional** | $C_4$ | Full value when condition met, zero otherwise |

---

## 2. Scenarios

### 2.1 Temporal Structure

Combat proceeds through 6 slots separated by the **firing sequence time gap** $T_{gap}$ — the time between consecutive slot activations. This is an observed parameter, not a known game constant; empirical measurement gives $T_{gap} \approx 6s$.

Temporal coverage of any effect:

$$\text{slots covered} = \left\lfloor \frac{\text{duration}}{T_{gap}} \right\rfloor$$

| Duration | Slots covered | Example |
|:---------|:-------------|:--------|
| 8s | 1 subsequent slot | 【命损】(8s) covers next slot only |
| 12s | 2 subsequent slots | 【仙佑】(12s) covers next 2 slots (critical boundary) |
| 16s | 2 subsequent slots | 分身 (16s) covers next 2 slots |
| 48s | all 5 subsequent | 【仙佑】+ 仙露护元 (+300%) covers everything |

$T_{gap}$ is the fundamental constraint on temporal strategies. It determines whether setup effects reach the burst slot and whether debuffs persist to cleanup.

### 2.2 Common Scenarios

| Scenario | Typical slot | HP state | Strategic objective |
|:---------|:------------|:---------|:-------------------|
| **Amplify** | 1 | Both high | Establish buffs/debuffs covering subsequent slots |
| **Burst** | 2–3 | Opponent high→dropping | Maximum single-slot damage via multiplicative stacking |
| **Exploit** | 3–5 | Opponent dropping | Convert accumulated state (HP loss, debuffs) to damage |
| **Suppress** | 2–4 | Variable | Apply debuffs (anti-healing, DR reduction) for subsequent slots |
| **Endure** | 5–6 | Self possibly low | Sustain, protect ongoing effects (DoTs, summons) |

Scenarios are **not rigidly assigned to slots**. The slot sequence is determined by the build, not the other way around. A build might amplify in Slot 3 if the buff coverage reaches Slots 4–6.

### 2.3 Sequencing Constraints

- **Amplify before its targets**: Amplify must precede the slots it covers. A 12s buff covers $\lfloor 12 / T_{gap} \rfloor = 2$ subsequent slots
- **Suppress before exploit**: Debuffs must be applied before per-debuff-stack effects trigger
- **Burst uses finite resources**: The $C_3$ certainty block (心逐神随 + 天命有归) requires 2 specific auxiliary books; once consumed in one slot, secondary conflict prevents reuse. Only one slot gets this combination
- **Endure is terminal**: Self-sustain has no forward value; it belongs in the last slots

---

## 3. Category Combinations

For each scenario, the optimal allocation of the 3 affix contributions (main primary + 2 auxiliary targets).

### 3.1 Amplify

| Position | Target category | Best-in-class |
|:---------|:---------------|:-------------|
| Main | $C_{11}$ Self Buffs (skill applies high-value buff) | 甲元仙符 → 【仙佑】(+70% ATK/DEF/HP, 12s) |
| Aux 1 | $C_9$ State Modifiers (buff strength) | 【龙象护身】(+104% buff strength) |
| Aux 2 | $C_9$ State Modifiers (buff stacks or duration) | 【真极穿空】(+100% stacks, +5.5%/5 stacks) |

**Why:** $C_{11}$ creates the temporal asset; $C_9$×2 multiplies its value. The two $C_9$ contributions target different sub-dimensions (strength vs stacks), so they compound.

**Tradeoff — strength vs coverage:** Replacing one $C_9$ with buff_duration (【仙露护元】+300%) trades buff power for temporal reach (12s → 48s, covering all subsequent slots vs only 2). Net value depends on how many subsequent slots benefit.

### 3.2 Burst

| Position | Target category | Best-in-class |
|:---------|:---------------|:-------------|
| Main | $C_1$ Base Damage (high base %) | 春黎剑阵 (22,305% + summon) |
| Aux 1 | $C_3$ Critical System (multiplicative) | 【心逐神随】(×2/×3/×4, $E = 2.46$) |
| Aux 2 | $C_4$ + $C_2$ (probability→certain + damage) | 【天命有归】(certain + 50% damage) |

**Why:** $C_3$ provides deterministic ×4.00, $C_4$ converts stochastic to certain, $C_2$ adds +50%. Combined: **×6.00 multiplicative factor**. No additive combination comes close.

**This is the highest-ceiling combination in the game.** The ×6.00 factor explains the observed 5× outperformance of Slot 2 over Slot 3 in ye.1: Slot 2 has $C_3$+$C_4$ multiplicative stacking; Slot 3 has $C_1$+$C_5$ additive stacking.

### 3.3 Exploit

| Position | Target category | Best-in-class |
|:---------|:---------------|:-------------|
| Main | $C_1$ (high hit count + %HP) | 皓月剑诀 (10 hits, 12%maxHP/hit, shield destroy) |
| Aux 1 | $C_5$ Per-Hit Escalation | 【心火淬锋】(+5%/hit, max +50%) |
| Aux 2 | $C_6$ HP-Based or $C_2$ Damage Multiplier | 【追神真诀】(+26.5% lost HP) or 【无极剑阵】(+555%) |

**Why:** High hit count activates $C_5$; %HP base bypasses ATK scaling. The exploit scenario occurs after burst has lowered opponent HP, making $C_6$ lost-HP effects valuable.

**Main skill compatibility is critical:** $C_5$ per-hit escalation is worthless on low-hit skills. The main skill's damage structure (hit count, %HP, buff dependency) determines which secondary categories are effective — **synergy with main skill > affix rarity**.

### 3.4 Suppress

| Position | Target category | Best-in-class |
|:---------|:---------------|:-------------|
| Main | $C_{12}$ Debuffs (debuff-applying skill) | 大罗幻诀 → 【命损】(-100% DR, 8s) |
| Aux 1 | $C_9$ State Modifiers (debuff amplification) | 【心魔惑言】(+100% debuff stacks) |
| Aux 2 | $C_{10}$ DoT or $C_6$ HP-Based | 【古魔之魂】(+104% DoT) or 【追神真诀】 |

**Why:** $C_{12}$ applies the strategic debuff; $C_9$ amplifies stacking efficiency; $C_{10}$/$C_6$ provides ongoing damage while debuffs accumulate.

**命損 coverage:** 8s duration → covers 1 subsequent slot. Placing suppress in Slot 2 covers Slot 3 (the burst/exploit slot — highest value target). Placing it in Slot 4 covers Slot 5 only.

### 3.5 Endure

| Position | Target category | Best-in-class |
|:---------|:---------------|:-------------|
| Main | $C_{11}$ or $C_{13}$ (sustain skill) | 十方真魄 → 【星猿弃天】(buff extend, self-cleanse) |
| Aux 1 | $C_6$ HP-Based (own lost HP → damage) | 【意坠深渊】(min 11% lost HP, +50% damage) |
| Aux 2 | $C_9$ State Modifiers (duration) | 【仙露护元】(+300%) or 【真言不灭】(+55%) |

**Why:** Late-slot self HP is likely low, making $C_6$ lost-HP scaling high-value. $C_9$ duration extension sustains protective buffs through remaining combat.

---

## 4. Primary Category Selection

### 4.1 The Multiplicative Ceiling Principle

The primary category determines the slot's damage ceiling. Categories are not equal:

| Tier | Categories | Mechanism | Ceiling example |
|:-----|:----------|:----------|:----------------|
| **Tier 1** | $C_3$ Critical System | Multiplicative on entire output | ×6.00 (心逐神随 + 天命有归) |
| **Tier 2** | $C_9$ State Modifiers | Multiplicative on buff/debuff values | ×2.04 (龙象护身 on 仙佑) |
| **Tier 3** | $C_2$ Damage Multipliers | Additive within zone | +555% (无极剑阵, with penalty) |
| **Tier 4** | $C_5$, $C_6$ | State/hit-count dependent | +50% (心火淬锋 avg on 10-hit) |

**Implication:** The slot allocated the $C_3$ combination becomes the dominant damage slot. In a 6-slot build with one $C_3$ burst slot, that slot alone may contribute 40–50% of total output.

### 4.2 Main Skill Compatibility

The primary category must be compatible with the main skill's damage structure:

| Skill property | Compatible categories | Incompatible |
|:--------------|:---------------------|:-------------|
| High hit count (8–10) | $C_5$ Per-Hit Escalation, $C_3$ Critical | — |
| %maxHP per hit | $C_6$ HP-Based (orthogonal to %max) | $C_{11}$ ATK buff (doesn't scale %HP) |
| Buff-creating | $C_9$ State Modifiers (amplify the buff) | — |
| DoT-producing | $C_{10}$ DoT (amplify frequency/damage) | $C_5$ (per-hit may not apply to ticks — 待验证) |
| High base % | $C_3$ Critical (multiplicative on large base) | — |

**The 心火淬锋 vs 仙露护元 principle:** 【仙露护元】($C_9$: +300% buff duration) is optimal on 甲元仙符 (buff-creating) but worthless on 皓月剑诀 (damage skill with minimal buffs). 【心火淬锋】($C_5$: +5%/hit) is optimal on 皓月剑诀 (10 hits) but weak on 甲元仙符 (few hits). Affix selection must match the main skill's damage structure.

### 4.3 Primary Category by Scenario

| Scenario | Primary category | Why it leads |
|:---------|:----------------|:-------------|
| Amplify | $C_{11}$ Self Buffs | The slot's purpose IS the buff — everything else amplifies it |
| Burst | $C_3$ Critical System | Highest multiplicative ceiling; defines the slot's output |
| Exploit | $C_1$ Base Damage (main skill) | Hit count and %HP are fixed by skill choice; auxiliaries enhance |
| Suppress | $C_{12}$ Debuffs | The debuff IS the strategic objective |
| Endure | $C_7$ or $C_{11}$ | Survival is the constraint |

---

## 5. Affix Selection by Category

For each category, the best options across all 4 pools, ranked by power.

### 5.1 $C_3$ Critical System

The scarcest and highest-impact category. Only 3 options exist:

| Affix | Pool | Source | Value |
|:------|:-----|:-------|:------|
| **【心逐神随】** | Exclusive | 解体化形 | ×2/×3/×4 ($E = 2.46$); pair with 天命有归 → ×4.00 certain |
| **【灵犀九重】** | School | Sword | ×2.97 guaranteed, 25% chance → ×3.97 |
| **【通明】** | Universal | Any | ×1.2 guaranteed, 25% chance → ×1.5 |

**Selection:** 心逐神随 + 天命有归 is strictly dominant (×6.00) but consumes 2 auxiliary slots. 灵犀九重 is self-contained (×2.97 floor) and leaves one auxiliary free. 通明 is the fallback.

### 5.2 $C_9$ State Modifiers

High-impact meta-amplifiers with many options:

| Affix | Pool | Source | Sub-type | Value |
|:------|:-----|:-------|:---------|:------|
| **【龙象护身】** | Exclusive | 浩然星灵诀 | buff_strength | +104% |
| **【真极穿空】** | Exclusive | 元磁神光 | buff_stack + damage | +100% stacks, +5.5%/5 stacks |
| **【心魔惑言】** | Exclusive | 天轮魔经 | debuff_stack + damage | +100% stacks, +5.5%/5 stacks |
| **【奇能诡道】** | Exclusive | 周天星元 | debuff_stack_chance | +20% extra; enlightenment: 逆转阴阳 |
| **【真言不灭】** | Exclusive | 疾风九变 | all_state_duration | +55% |
| **【业焰】** | Universal | Any | all_state_duration | +69% |
| **【清灵】** | Universal | Any | buff_strength | +20% |
| **【咒书】** | Universal | Any | debuff_strength | +20% |

**Selection:** Match the sub-type to what the slot needs. Amplify slots: 龙象护身 (strength) or 真极穿空 (stacks). Suppress slots: 心魔惑言 (debuff stacks) or 咒书 (debuff strength). Duration extensions (业焰, 真言不灭) are most valuable when temporal coverage is the bottleneck.

### 5.3 $C_2$ Damage Multiplier Zones

The most populated category. Additive within each zone, so **zone selection matters**:

| Affix | Pool | Source | Zone | Value | Notes |
|:------|:-----|:-------|:-----|:------|:------|
| **【无极剑阵】** | Exclusive | 无极御剑诀 | skill_damage | +555% | Penalty: target +350% DR |
| **【破釜沉舟】** | Exclusive | 十方真魄 | damage | +380% | Penalty: self +50% damage taken |
| **【引灵摘魂】** | Exclusive | 天魔降临咒 | damage | +104% | Conditional: target has debuff |
| **【明王之路】** | School | Spell | final_damage | +50% | Scarce zone (less crowding) |
| **【灵威】** | Universal | Any | skill_damage (next) | +118% | Next-skill only |
| **【摧云折月】** | School | Sword | attack_bonus | +55% | Crowded zone |
| **【破碎无双】** | School | Sword | attack+damage+crit | +15% each | Spread across 3 zones |
| **【摧山】** | Universal | Any | attack_bonus | +20% | Crowded zone |

**Selection:** Prefer **scarce zones** (final_damage via 明王之路) over **crowded zones** (attack_bonus). High-value exclusive affixes (无极剑阵, 破釜沉舟) come with penalties — the penalty defines the secondary category need.

### 5.4 $C_5$ Per-Hit Escalation

Value is proportional to main skill hit count:

| Affix | Pool | Source | Rate | Max | Avg on 10 hits |
|:------|:-----|:-------|:-----|:----|:---------------|
| **【心火淬锋】** | School | Sword | +5%/hit | +50% | ×1.225 (+22.5%) |
| **【破竹】** | Universal | Any | +1%/hit | +10% | ×1.045 (+4.5%) |

Main position: 千锋聚灵剑 (【惊神剑光】) has built-in +25%/hit escalation (6 hits).

**Selection:** 心火淬锋 is 5× stronger than 破竹. Only valuable on skills with 6+ hits. On 皓月剑诀 (10 hits): +22.5%. On low-hit skills: negligible.

### 5.5 $C_6$ HP-Based Calculations

Value depends on combat state:

| Affix | Pool | Source | Mechanic | Value |
|:------|:-----|:-------|:---------|:------|
| **【追神真诀】** | Exclusive | 皓月剑诀 | per_enemy_lost_hp (DoT trigger) | +26.5% lost HP; E10: +50%maxHP, +300% |
| **【紫心真诀】** | Exclusive | 惊蛰化龙 | per_debuff_stack_true_damage | 2.1%maxHP/stack (max 21% at 10) |
| **【怒血战意】** | Exclusive | 玄煞灵影诀 | per_self_lost_hp | +2%/1% own HP lost |
| **【贪狼吞星】** | School | Body | per_enemy_lost_hp | +1%/1% enemy HP lost |
| **【意坠深渊】** | School | Body | min_lost_hp + damage | Min 11% lost HP calc, +50% |
| **【吞海】** | Universal | Any | per_enemy_lost_hp | +0.4%/1% enemy HP lost |
| **【战意】** | Universal | Any | per_self_lost_hp | +0.5%/1% own HP lost |

**Selection:** Opponent-lost-HP affixes (追神真诀, 贪狼吞星, 吞海) scale with combat progress — strongest in exploit/cleanup. Self-lost-HP affixes (怒血战意, 战意) are risk-reward — strongest when own HP is low. 紫心真诀 requires debuff accumulation from prior slots.

### 5.6 $C_{12}$ Debuffs

Strategic suppression, especially anti-healing:

| Affix | Pool | Source | Target | Value |
|:------|:-----|:-------|:-------|:------|
| **【天哀灵涸】** | Exclusive | 千锋聚灵剑 | healing_received | -31%, undispellable |
| **【天倾灵枯】** | Exclusive | 甲元仙符 | healing_received | -31% / -51% if HP<30% |
| **【无相魔威】** | Exclusive | 无相魔劫咒 | healing + damage | healing -40.8%, damage +105%/+205% |
| **【祸星无妄】** | School | Demon | random debuff | ATK / crit rate / crit damage down |

Main position: 大罗幻诀 → 【魔魂咒界】provides 【命损】(-100% final DR, 8s) + counter mechanism.

**Selection:** 天哀灵涸 (undispellable -31%) is the most reliable anti-healing. 天倾灵枯 escalates near kill threshold. 无相魔威 combines anti-healing with damage. 命損 from main position is the strongest DR debuff but only covers 1 subsequent slot.

### 5.7 $C_{10}$ DoT

Sustained damage through periodic effects:

| Affix | Pool | Source | Mechanic | Value |
|:------|:-----|:-------|:---------|:------|
| **【古魔之魂】** | Exclusive | 大罗幻诀 | dot_damage_increase | +104% |
| **【天魔真解】** | Exclusive | 焚圣真魔咒 | dot_frequency_increase | +50.5% (tick interval halved) |
| **【玄心剑魄】** | Exclusive | 春黎剑阵 | dot + on_dispel | 550%/s 8s; dispel: 3300% + 2s stun |
| **【鬼印】** | Universal | Any | dot_extra_per_tick | +2% enemy lost HP/tick |

Main position: 念剑诀 → 【雷阵剑影】provides persistent DoT zone (6.5s, 0.5s/tick).

**Selection:** 古魔之魂 amplifies damage; 天魔真解 doubles frequency. Combined: ~4× DoT output. 玄心剑魄 creates a dilemma (endure DoT or suffer dispel penalty).

### 5.8 $C_4$ Conditional Triggers

State-gated bonuses — full value when met, zero otherwise:

| Affix | Pool | Source | Condition | Value |
|:------|:-----|:-------|:----------|:------|
| **【天命有归】** | School | Spell | probability triggers | All probability→certain, +50% damage |
| **【溃魂击瑕】** | School | Demon | HP < 30% | +100% damage, guaranteed crit |
| **【神威冲云】** | Exclusive | 通天剑诀 | unconditional | Ignore all DR, +36% damage |
| **【击瑕】** | Universal | Any | target controlled | +40% damage |
| **【怒目】** | Universal | Any | HP < 30% | +20% damage, +30% crit rate |

**Selection:** 天命有归 is uniquely powerful as a $C_3$ enabler (心逐神随 pairing). 溃魂击瑕 is the strongest HP-conditional but only activates in cleanup. 神威冲云 (ignore DR) is unconditional and strongest against high-DR opponents.

### 5.9 $C_{11}$ Self Buffs

Primarily determined by main position choice:

| Source | Main affix | Buff | Duration |
|:-------|:----------|:-----|:---------|
| **甲元仙符** | 【天光虹露】 | 【仙佑】+70% ATK/DEF/HP | 12s |
| **十方真魄** | 【星猿弃天】 | 【怒灵降世】+20% ATK, DR, extend +3.5s | 4s → 7.5s |
| **春黎剑阵** | 【幻象剑灵】 | Summon +200%, follows subsequent skills | 16s |

Auxiliary buff extensions:

| Affix | Pool | Source | Value |
|:------|:-----|:-------|:------|
| **【仙露护元】** | Exclusive | 念剑诀 | Buff duration +300% |
| **【业焰】** | Universal | Any | All state duration +69% |
| **【真言不灭】** | Exclusive | 疾风九变 | All state duration +55% |

### 5.10 $C_7$ Healing & Survival / $C_8$ Shield

Niche categories for endure scenarios:

| Affix | Pool | Source | $C_n$ | Value |
|:------|:-----|:-------|:--|:------|
| **【仙灵汲元】** | Exclusive | 星元化岳 | $C_7$ | 55% lifesteal |
| **【长生天则】** | School | Spell | $C_7$ | +50% all healing |
| **【金刚护体】** | School | Body | $C_7$ | DR +55% during cast |
| **【瑶光却邪】** | School | Demon | $C_7$ | Healing → 50% as damage |
| **【玄女护心】** | School | Demon | $C_8$ | Shield = 50% skill damage |
| **【玉石俱焚】** | Exclusive | 九重天凤诀 | $C_8$ | On expire: 100% shield as damage |
| **【青云灵盾】** | School | Body | $C_8$ | Shield +50% |
| **【金汤】** | Universal | Any | $C_7$ | DR +10% during cast |
| **【灵盾】** | Universal | Any | $C_8$ | Shield +20% |

### 5.11 $C_{13}$ Special Mechanics

Unique mechanics primarily from main position:

| Source | Main affix | Mechanic |
|:-------|:----------|:---------|
| **春黎剑阵** | 【幻象剑灵】 | Summon: +200% damage, 16s, follows subsequent skills |
| **无相魔劫咒** | 【灭劫魔威】 | Delayed burst: 12s collection window, +65% on settlement |
| **大罗幻诀** | 【魔魂咒界】 | Counter: 60% chance on-hit to apply debuffs; +【命损】 |
| **十方真魄** | 【星猿弃天】 | Periodic cleanse: 30%/s dispel self-control, 7.5s |

Per-stack damage ($C_{13}$ subcategory):

| Affix | Pool | Source | Value |
|:------|:-----|:-------|:------|
| **【紫心真诀】** | Exclusive | 惊蛰化龙 | Per debuff stack: 2.1%maxHP true damage (max 21%) |
| **【九雷真解】** | Exclusive | 九天真雷诀 | Per buff/debuff/shield trigger: 50.8% skill damage |

---

## 6. Construction Procedure

### 6.1 The Greedy Algorithm

Given 6 empty slots, construct a book set:

**Step 1 — Assign scenarios to slots.** Determine which scenario each slot serves, respecting temporal constraints ($T_{gap}$). Typical starting point: Slot 1 amplify, Slot 2 burst, Slots 3–4 exploit/suppress, Slots 5–6 endure.

**Step 2 — Select primary category.** For each slot, use Section 4.3 to determine which category leads. The primary category sets the slot's ceiling.

**Step 3 — Select best affix in primary category.** Use Section 5 rankings. This determines one source book. Consider: is this affix from the main position (primary affix) or an auxiliary? Does it have side effects?

**Step 4 — Identify secondary need from side effects.** The primary affix's costs determine the secondary category:

| Primary affix side effect | Secondary category need |
|:--------------------------|:----------------------|
| Stochastic output (心逐神随) | $C_4$ probability_to_certain (天命有归) |
| Self-damage cost (十方真魄 HP cost) | $C_7$ lifesteal or $C_6$ min_lost_hp (意坠深渊) |
| Duration too short (仙佑 12s) | $C_9$ buff_duration (仙露护元, 业焰) |
| DR penalty (无极剑阵 +350%) | $C_4$ ignore_DR (命损) or $C_{12}$ (神威冲云) |
| Requires debuff stacks (紫心真诀) | $C_{12}$ debuff-applying skill in prior slot |

**Step 5 — Select secondary affix.** This determines the second source book. Check conflict with other slots.

**Step 6 — Determine remaining position.** The remaining position addresses tertiary need. If main position is still open, choose the skill whose damage structure best synergizes with the chosen affixes (hit count for $C_5$, %HP for $C_6$, buff-creating for $C_9$).

**Step 7 — Check conflicts.**
- **Core conflict**: Same book as main in two slots → higher slot cannot cast
- **Secondary conflict**: Same book as auxiliary in two slots → higher slot affix dead
- **Cross-type reuse**: Main in one slot, auxiliary in another → no conflict (exploit this)

**Step 8 — Iterate across slots.** Resolve conflicts and optimize global allocation. The $C_3$ certainty block can only appear once — assign it to the highest-value slot.

### 6.2 Construction Constraints

| Constraint | Impact |
|:----------|:-------|
| $C_3$ certainty block is unique | Only 1 slot gets ×6.00; that slot dominates total output |
| Each source book as auxiliary at most once | Auxiliary affixes are a scarce resource across 6 slots |
| Main determines skill + primary affix | Cannot separate skill choice from primary affix |
| Temporal coverage has hard limits | 12s buff covers 2 slots; 8s debuff covers 1 |
| Cross-type reuse is free | Book as main in slot $k$, auxiliary in slot $k+1$ is common and legal |

### 6.3 Open Questions

| Question | Status | Impact |
|:---------|:-------|:-------|
| Does $C_5$ per-hit escalation apply to DoT ticks? | 待验证 | $C_5$ + $C_{10}$ combination viability |
| Does summon (分身) count as a buff state? | 待验证 | Whether 仙露护元 extends summon duration |
| Does 心魔惑言 apply to counter-triggered debuffs? | 待验证 | $C_9$ + $C_{12}$ counter synergy |
| How does 命損 interact with 无极剑阵 DR penalty? | 待验证 | $C_4$ + $C_2$ penalty cancellation |
| Does 追神真诀 "DoT trigger" apply to %maxHP per-hit? | 待验证 | $C_6$ applicability on 千锋聚灵剑 |

---

## Document History

| Version | Date | Changes |
|:--------|:-----|:--------|
| 1.0 | 2026-02-25 | Initial: scenario-driven descriptive framework |
| 2.0 | 2026-02-25 | Complete rewrite: constructive framework. 4-question structure (scenarios, category combinations, primary category, affix selection by category across all pools). Greedy construction algorithm. Multiplicative ceiling principle explaining observed 5× slot performance gaps |
