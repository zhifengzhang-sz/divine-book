---
initial date: 2026-4-3
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

# Amplifier Selection

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

Complete analysis of every amplifier affix available for 灵書 construction. For each amplifier: what it does, pros, cons, progression dependency, and when to use it.

**Data source:** `data/yaml/affixes.yaml` (universal + school) and `data/raw/game.data.json` (exclusive).

---

## How to Use This Document

1. Determine which amplifier **type** the slot needs (duration, strength, damage, etc.)
2. Look up the relevant category below
3. Compare all available affixes for that type — check progression requirements
4. Verify the chosen affix is available (carrier book not used elsewhere, constraint check)

**Core principle:** Always compare by **effect type and value**, not by affix name or source. Universal affixes can outperform exclusives for the same effect.

---

## Category 1: Global Multiplier

Multiplies **all** effects of the slot's skill, not just one dimension.

### 心逐神随 — `probability_multiplier`

**Source:** Exclusive (解体化形)

Probabilistically multiplies all effects of the skill. Values are cumulative thresholds:

| Tier | x4 | x3 | x2 | No multiplier | Expected multiplier |
|:-----|:---|:---|:---|:--------------|:--------------------|
| 悟0/融50 | 11% | 20% | 20% | **49%** | ~1.7x |
| 悟2/融63 | 60% | 20% | 20% | **0%** | ~3.4x |

**Pros:**
- Most powerful amplifier in the game — multiplies everything (damage, clone stats, buff values, debuff values)
- At 悟2/融63: guaranteed at least x2, 60% chance of x4

**Cons:**
- At low progression: 49% chance of doing nothing — unreliable
- Exclusive to 解体化形 — locks that book to this slot's aux

**Progression dependency: Critical.** The difference between 悟0 (coin-flip) and 悟2 (guaranteed x2+) is the difference between a wasted aux slot and the strongest amplifier in the game. **悟2/融63 is the minimum viable investment.**

---

## Category 2: Duration Extension

Extends the temporal window of buffs, debuffs, and other states.

### 业焰 — `all_state_duration` +69%

**Source:** Universal

**Pros:**
- Extends ALL states (buffs, debuffs, DoTs, everything)
- Universal — any book can carry it
- Highest value for `all_state_duration`

**Cons:**
- None significant

### 真言不灭 — `all_state_duration` +55%

**Source:** Exclusive (疾风九变)

**Pros:**
- Same effect type as 业焰

**Cons:**
- **Strictly inferior to 业焰** (+55% < +69%) for the same effect
- Locks 疾风九变 to this slot

> **Verdict:** 业焰 always beats 真言不灭. Use 疾风九变 as carrier for 业焰, not for its own exclusive.

### 仙露护元 — `buff_duration` +300%

**Source:** Exclusive (念剑诀)

**Pros:**
- Massive +300% — 4x buff duration
- Transforms short buffs into fight-long effects (e.g. 仙佑 12s → 48s)

**Cons:**
- Only extends **buffs**, not debuffs or other states
- Locks 念剑诀 to this slot
- Competes with other aux for the same slot (e.g. 奇能诡道 at Slot 3)

---

## Category 3: Strength Multiplication

Increases the base strength of buffs or debuffs.

### 龙象护身 — `buff_strength` +300%

**Source:** Exclusive (浩然星灵诀)

**Pros:**
- Dominant — 15x the universal alternative (清灵 +20%)
- Turns +70% buff into +280%

**Cons:**
- Exclusive to 浩然星灵诀 — locks that book

### 清灵 — `buff_strength` +20%

**Source:** Universal

**Pros:**
- Universal — any carrier book
- Available if 龙象护身 is locked elsewhere

**Cons:**
- Weak — +20% vs +300%. Not a real competitor

### 咒书 — `debuff_strength` +20% / +69%

**Source:** Universal

| Tier | Value |
|:-----|:------|
| ��0/融50 | +20% |
| 悟3/融52 | +69% |

**Pros:**
- Universal
- At 悟3: strong +69%

**Cons:**
- Progression-dependent — +20% at low tier is weak

### 心魔惑言 — `debuff_stack_increase` +100% (x2)

**Source:** Exclusive (天轮魔经)

**Pros:**
- Doubles all debuff stacks applied by the slot's skill
- Critical for per-debuff scaling (结魂锁链, 索心真诀)
- Also: +5.5% per 5 stacks (max 27.5%)

**Cons:**
- Exclusive to 天轮魔经
- Only one debuff stack doubler exists — no alternative

### 真极穿空 — `buff_stack_increase` +100%

**Source:** Exclusive (元磁神光)

**Pros:**
- Doubles buff stacks
- Also: +5.5% per 5 stacks damage bonus

**Cons:**
- Specific to 天狼之啸 stacking mechanic (元磁神光 native)
- Niche — only useful if 元磁神光 is the platform

---

## Category 4: Damage Amplification

Direct damage increase on the slot's skill.

### 无极剑阵 — `skill_damage_increase_affix` +555%

**Source:** Exclusive (无极御剑诀)

**Pros:**
- Highest single-affix damage increase in the game

**Cons:**
- Target also gains -350% 神通伤害减免 — net effect depends on target's existing 减免
- Exclusive to 无极御剑诀

### 破釜沉舟 — `damage_increase` +380%

**Source:** Exclusive (十方真魄)

**Pros:**
- Second highest damage increase

**Cons:**
- **+50% self damage taken** — significant survivability cost
- Exclusive to 十方真魄

### 追神真诀 — `damage_increase` +300%

**Source:** Exclusive (皓月剑诀)

| Tier | Value |
|:-----|:------|
| 悟0 | 0% (not unlocked) |
| 悟10/融50 | +300% |

**Pros:**
- +300% damage with no negative tradeoff
- Also: +50% maxHP, +26.5% lost HP per DoT tick

**Cons:**
- Requires 悟10 for full value — high progression investment
- Exclusive to 皓月剑诀

**Progression dependency: High.** Zero value at 悟0.

### 古魔之魂 — `dot_damage_increase` +104%

**Source:** Exclusive (大罗幻诀)

**Pros:**
- Doubles DoT damage specifically

**Cons:**
- Only affects DoTs, not direct hits
- Exclusive to 大罗幻诀

### 引灵摘魂 — `conditional_damage_debuff` +104%

**Source:** Exclusive (天魔降临咒)

**Pros:**
- +104% damage vs debuffed targets

**Cons:**
- Conditional — target must have debuffs
- Exclusive to 天魔降临咒

### 摧云折月 — `attack_bonus` +300%

**Source:** School (Sword)

**Pros:**
- +300% attack bonus — scales all damage
- School affix — any Sword book can carry it

**Cons:**
- Sword school only

### 摧山 — `attack_bonus` +20%

**Source:** Universal

**Pros:**
- Universal

**Cons:**
- Weak compared to school/exclusive alternatives

### 明王之路 — `final_dmg_bonus` +50%

**Source:** School (Magic)

**Pros:**
- Final damage bonus — multiplicative with other damage increases

**Cons:**
- Magic school only

### 天命有归 — `damage_increase` +50%

**Source:** School (Magic)

**Pros:**
- Also converts probability effects to guaranteed

**Cons:**
- Magic school only
- +50% is moderate

### 意坠深渊 — `damage_increase` +50%

**Source:** School (Body)

**Pros:**
- +50% damage increase

**Cons:**
- Conditional: requires minimum 11% HP threshold
- Body school only

### 天人合一 — `damage_increase` +5%

**Source:** Exclusive (玉书天戈符)

**Cons:**
- Negligible value. Not a real amplifier.

---

## Category 5: Conditional / Scaling Amplifiers

Value depends on game state, not fixed.

### 击瑕 — `conditional_damage_controlled` +40% / +138%

**Source:** Universal

| Tier | Value |
|:-----|:------|
| 悟0 | +40% |
| 悟3/融52 | +138% |

**Pros:**
- +138% at high tier — strong
- Universal

**Cons:**
- Only triggers if enemy is under control effects (stun, etc.)

### 乘胜逐北 — `conditional_damage_controlled` +100%

**Source:** Exclusive (煞影千幻)

**Pros:**
- +100% vs controlled targets

**Cons:**
- Same condition as 击瑕 — if 击瑕 at 悟3 (+138%) is available, it's better
- Exclusive to 煞影千幻

### 战意 — `per_self_lost_hp` +2.95%

**Source:** Universal

**Pros:**
- Scales with own HP loss — gets stronger as fight progresses

**Cons:**
- Value is zero at full HP — no early-fight value

### 怒血战意 — `per_self_lost_hp` +2%

**Source:** Exclusive (玄煞灵影��)

**Cons:**
- Inferior to universal 战意 (+2% < +2.95%) for the same effect

### 吞海 — `per_enemy_lost_hp` +0.4%

**Source:** Universal

**Pros:**
- Scales with enemy HP loss

**Cons:**
- Low per-% rate

### 贪狼吞星 — `per_enemy_lost_hp` +1%

**Source:** School (Body)

**Pros:**
- 2.5x the universal (吞海)

**Cons:**
- Body school only

### 福荫 — `random_buff` +20%

**Source:** Universal

**Pros:**
- Grants one random buff (attack/crit/damage)

**Cons:**
- Random — unreliable

### 景星天佑 — `random_buff` +55%

**Source:** School (Magic)

**Pros:**
- 2.75x the universal

**Cons:**
- Still random
- Magic school only

---

## Category 6: Tick Rate / Per-Hit

### 天魔真解 — `dot_frequency_increase` +50.5%

**Source:** Exclusive (梵圣真魔咒)

**Pros:**
- Nearly doubles DoT tick rate — equivalent to doubling DoT DPS

**Cons:**
- Only affects DoTs
- Only tick rate modifier in the game — no alternative

### 破竹 — `per_hit_escalation` +1% per hit (max 10%)

**Source:** Universal

**Cons:**
- Weak cap (+10%)

### 心火淬锋 — `per_hit_escalation` +5% per hit (max 50%)

**Source:** School (Sword)

**Pros:**
- 5x the universal — max +50%

**Cons:**
- Sword school only

---

## Category 7: Resonance (会心)

### 灵犀九重 — `guaranteed_resonance` 2.97x (25% → 3.97x)

**Source:** School (Sword)

**Pros:**
- Guaranteed 会心 at 2.97x — opens the 灵力 damage channel
- 25% chance of 3.97x

**Cons:**
- Sword school only

### 通明 — `guaranteed_resonance` 1.2x (25% → 1.5x)

**Source:** Universal

**Cons:**
- Far weaker than 灵犀九重 (1.2x vs 2.97x)

---

## Category 8: Other

### 斩岳 — `flat_extra_damage` +2000% / +11800%

**Source:** Universal

| Tier | Value |
|:-----|:------|
| 悟0 | +2000% atk |
| 悟3 | +11800% atk |

**Pros:**
- Flat damage addition — not multiplicative, so bypasses diminishing returns

**Cons:**
- Heavily progression-dependent

### 破灭天光 — `flat_extra_damage` +2500%

**Source:** School (Body)

**Cons:**
- Lower than 斩岳 at 悟3

### 溃魂击瑕 — `execute_conditional` +100% + guaranteed crit

**Source:** School (Demon)

**Pros:**
- +100% damage + guaranteed crit vs low HP targets — finisher amplifier

**Cons:**
- Only triggers at low enemy HP
- Demon school only

### 怒目 — `execute_conditional` +20% + 30% crit

**Source:** Universal

**Cons:**
- Weaker version of 溃魂击瑕

---

## Ranking by Progression

The value of many amplifiers changes dramatically with progression level. Here are the key progression breakpoints:

### Must-have progression investments

| Affix | Breakpoint | What changes |
|:------|:-----------|:-------------|
| **心逐神随** | **悟2/融63** | 0% → 100% guaranteed (at least x2). Expected 1.7x → 3.4x |
| **追神真诀** | **悟10** | 0% → +300% damage |
| **击瑕** | **悟3/融52** | +40% → +138% conditional damage |
| **咒书** | **悟3/融52** | +20% → +69% debuff strength |
| **斩岳** | **悟3** | +2000% → +11800% flat damage |

### Always-available (no progression gate)

| Affix | Value | Source |
|:------|:------|:-------|
| 业焰 | +69% all state duration | Universal |
| 龙象护身 | +300% buff strength | Exclusive |
| 心魔惑言 | x2 debuff stacks | Exclusive |
| 天魔真解 | +50.5% tick rate | Exclusive |
| 无极剑阵 | +555% skill damage (with -350% 减免 tradeoff) | Exclusive |
| 破釜沉舟 | +380% damage (with +50% self damage tradeoff) | Exclusive |

---

## Effect-Type Comparison

Where multiple affixes compete for the same effect type, pick the strongest:

| Effect type | Winner | Value | Loser | Value |
|:------------|:-------|:------|:------|:------|
| `all_state_duration` | **业焰** (universal) | +69% | 真言不灭 (exclusive) | +55% |
| `buff_strength` | **龙象护身** (exclusive) | +300% | 清灵 (universal) | +20% |
| `per_self_lost_hp` | **战意** (universal) | +2.95% | 怒血战意 (exclusive) | +2% |
| `per_enemy_lost_hp` | **贪狼吞星** (school) | +1% | 吞海 (universal) | +0.4% |
| `per_hit_escalation` | **心火淬锋** (school) | +5%/hit | 破竹 (universal) | +1%/hit |
| `guaranteed_resonance` | **灵犀九重** (school) | 2.97x | 通明 (universal) | 1.2x |
| `conditional_damage_controlled` | **击瑕** (universal, 悟3) | +138% | 乘胜逐北 (exclusive) | +100% |
| `random_buff` | **景星天佑** (school) | +55% | 福荫 (universal) | +20% |
| `execute_conditional` | **溃魂��瑕** (school) | +100%+crit | 怒目 (universal) | +20%+30%crit |
| `flat_extra_damage` | **斩岳** (universal, 悟3) | +11800% | 破灭天光 (school) | +2500% |

> Note: universal does not always lose to exclusive/school. 业焰 > 真言不灭, 战意 > 怒血战意, 击瑕(悟3) > 乘胜逐北, 斩岳(悟3) > 破灭天光.

---

## References

| Resource | Role |
|:---------|:-----|
| `data/yaml/affixes.yaml` | Universal and school affix data |
| `data/yaml/books.yaml` | Exclusive affix data (per book) |
| `data/raw/game.data.json` | Source of truth for all affix values and progression tiers |
| `lib/construct/constraints.ts` | `isValidPair()` for constraint checking |
