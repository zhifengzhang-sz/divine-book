---
initial date: 2026-2-26
dates of modification: [2026-2-26, 2026-2-27, 2026-3-5, 2026-3-5]
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

# Domain Categories for Divine Book Construction

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Domain-driven affix taxonomy for book set construction.** Parser categories ($C_0$–$C_{13}$) group effect types by Chinese text patterns — useful for extraction, useless for construction. This document classifies all 61 affixes by their combat role and interaction structure. Source: [about.md](../../data/raw/about.md) via [normalized.data.md](./normalized.data.md).

## Target Categories

Formal target categories for the `outputs`/`provides`/`requires` binding model. Used for deterministic pruning: if `requires=T_N` and no provider of T_N exists in the build, the affix has zero value → prune.

**Three-layer model:**

1. **`outputs`** — the effect types an affix produces (from `effects.yaml`). This is the full, uncompressed output of the affix. Example: 【破釜沉舟】has `outputs: [skill_damage_increase, self_damage_taken_increase]`.
2. **`provides`** — target categories, **derived automatically** from `outputs` via the `EFFECT_PROVIDES` mapping. Each effect type either maps to a target category (e.g., `self_damage_taken_increase` → T9) or to nothing (pure amplifiers like `attack_bonus`). Never hand-curated per affix.
3. **`requires`** — target categories that must exist for the affix to function. Hand-curated because requirements are about external conditions, not the affix's own outputs.

> **Key principle.** An affix's output is ALL its effect rows, not just a category label. The previous model hand-curated `provides` at the category level, which was lossy — effects like `self_damage_taken_increase` (which accelerates HP loss and feeds T9 consumers) were invisible unless manually annotated. The output-driven model makes `provides` a derived view: add `outputs`, and `provides` falls out automatically.

| ID | Target | Chinese | Description |
|:---|:---|:---|:---|
| T1 | 伤害 | 伤害 | Damage output (always free — inherent to any skill) |
| T2 | 减益效果 | 减益效果/状态 | Debuffs applied to enemy |
| T3 | 增益效果 | 增益效果/状态 | Buffs applied to self |
| T4 | 持续伤害 | 持续伤害 | DoT effects |
| T5 | 护盾 | 护盾 | Shield creation/presence |
| T6 | 治疗效果 | 治疗效果 | Healing effects |
| T7 | 状态 | 所有状态 | Any time-based state (superset of T2–T6) |
| T8 | 概率触发 | 概率触发 | Probability-gated effects |
| T9 | 已损气血 | 已损气血值计算 | HP-loss-based damage calculation |
| T10 | 控制效果 | 控制效果 | CC on enemy |

**Effect type → category mapping** (only provider types listed; amplifiers produce no category):

| Effect type | → Category | Notes |
|:---|:---|:---|
| `debuff`, `conditional_debuff`, `counter_debuff`, `cross_slot_debuff`, `random_debuff` | T2 | Creates harmful state on enemy |
| `self_buff`, `random_buff`, `counter_buff`, `next_skill_buff` | T3 | Creates beneficial state on self |
| `dot`, `extended_dot`, `shield_destroy_dot` | T4 | Creates periodic damage |
| `damage_to_shield` | T5 | Creates shield |
| `lifesteal`, `conditional_heal_buff` | T6 | Creates healing |
| `probability_multiplier` | T8 | Creates probability-dependent effects |
| `self_hp_cost`, `self_damage_taken_increase`, `min_lost_hp_threshold` | T9 | Creates/accelerates/floors HP loss |

**Binding rules:**
- `requires=free` → always active (targets inherent property like 伤害, or is standalone)
- `requires=T_N` → designated, needs a provider of T_N in the same 灵书 or platform
- `requires=T_A∨T_B` → needs at least one of T_A or T_B
- `provides=T_N` → derived from outputs: this affix's effect types map to category T_N

> **T7 (状态) superset rule.** Any affix that provides T2, T3, T4, T5, or T6 implicitly satisfies `requires=T7`. An affix that `requires=T7` can use any time-based state as its input.

---

## Framework

### Chains

Affixes participate in **chains** — directed paths from enablers through amplifiers to combat output. An affix's construction value depends on what else is in the chain, not on the affix alone.

### Tiers

| Tier | Role | Standalone value | Example |
|:---|:---|:---|:---|
| **Source** | Produces a combat effect directly | Has value alone | 【灵犀九重】`guaranteed_resonance` |
| **Amplifier** | Multiplies an existing source | Needs a source in the build | 【摧山】`attack_bonus` amplifies any damage source |
| **Enabler** | Makes an amplifier/source viable | Needs its target in the build | 【天命有归】`probability_to_certain` enables probability triggers |
| **Context modifier** | Changes data_state, altering what effects exist | Value depends on placement | 【天人合一】`enlightenment_bonus` unlocks higher tiers |

### Interaction types

| Type | Structure | Resolvable statically? |
|:---|:---|:---|
| **Static** | A always modifies B (e.g., `dot_damage_increase` → `dot`) | Yes |
| **Conditional** | A modifies B only if condition met (e.g., `conditional_damage` when `target_controlled`) | Partially — condition depends on game state |
| **Cross-cutting** | A modifies multiple chains (e.g., `all_state_duration` → buffs, debuffs, DoTs) | Yes, but multi-chain |
| **Dynamic** | A's targets depend on placement (e.g., `enlightenment_bonus` → whatever the book unlocks) | No — requires build context |

### Subcategory associations

Affixes that share a subcategory property are natural partners. Given an affix with property X in the build, the prior on which other affixes become useful narrows to X's natural partners. This is the construction shortcut: instead of scanning all 61 affixes, check which subcategories are represented and look up their partners.

Each subcategory now maps to a formal **target category binding** — the `requires` column shows which T_N must be provided.

| Subcategory | Binding | Members | Natural partners (providers) |
|:------------|:--------|:--------|:----------------|
| **Probability** (T8, chance-based triggers) | `requires=T8` | 【心逐神随】, 罗天魔咒, 【奇能诡道】, 【怒目】, 【通明】, 【灵犀九重】, 【福荫】, 【景星天佑】, 【祸星无妄】, 星猿弃天 | **【天命有归】** converts probability → certain |
| **Time-based state** (T7, effects with duration) | `requires=T7` | 仙佑, 命損, 噬心, 怒灵降世, 天哀灵涸, 极怒, all DoTs/buffs/debuffs with duration | **【业焰】**, **【真言不灭】** extend all states; **【仙露护元】** extends buffs |
| **HP-loss-dependent** (T9, scale with own HP lost) | `requires=T9` | 【怒血战意】, 【战意】, `十方真魄` main (16% kick) | **【破釜沉舟】** (`outputs: self_damage_taken_increase` → T9) accelerates loss; **【意坠深渊】** (`outputs: min_lost_hp_threshold` → T9) floors loss; `self_hp_cost` → T9 creates loss |
| **Debuff-stack-dependent** (T2, scale with enemy debuff count) | `requires=T2` | 【紫心真诀】, 【心魔惑言】 | `大罗幻诀` main (`provides=T2`) creates stacks; **【奇能诡道】** (`provides=T2`) adds extra stacks; **【咒书】** amplifies debuffs |
| **Buff-stack-dependent** (T3, scale with own buff count) | `requires=T3` | 【真极穿空】 | Any buff-applying main skill (仙佑, 怒灵降世) — platform `provides=T3` |
| **Shield-dependent** (T5, require shield source) | `requires=T5` | 【灵盾】, 【青云灵盾】, 【玉石俱焚】 | **【玄女护心】** (`provides=T5`) creates shield from damage |
| **Healing-dependent** (T6, require healing source) | `requires=T6` | 【长生天则】, 【瑶光却邪】, 【魔骨明心】 | **【仙灵汲元】** (`provides=T6`), 星猿复灵 (`provides=T6`) create healing via lifesteal |
| **DoT-dependent** (T4, amplify DoTs) | `requires=T4` | 【古魔之魂】, 【天魔真解】, 【鬼印】, 【追神真诀】 | **【玄心剑魄】** (`provides=T4`) creates DoT; `大罗幻诀` main (`provides=T4`) creates DoTs |
| **Debuff-condition** (T2, activate when target has debuffs) | `requires=T2` | 【引灵摘魂】, 【无相魔威】(+205% branch), 【魔骨明心】(heal branch) | Any debuff source: 【天哀灵涸】 (`provides=T2`), 【天倾灵枯】 (`provides=T2`), `大罗幻诀` main (`provides=T2`) |

> **Reading the table.** Members are affixes/effects that HAVE the property (`requires=T_N`). Partners are affixes/effects that CREATE what members need (`provides=T_N`). In construction: if a member is in the build, its partners become high-priority candidates for the remaining slots. If no provider of T_N exists, all members with `requires=T_N` have zero value → prune.

---

## Affix Walkthrough

> Convention: each affix lists its effect types (= `outputs`) from [normalized.data.md](./normalized.data.md), then chain classification, tier, and dependencies. `→` means "depends on" or "modifies." The `provides` column shows target categories **derived from outputs** via the effect type → category mapping above.

### I. Universal Affixes (16)

| # | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|
| U1 | 【咒书】 | — | T2 | `debuff_strength` value=20 | Debuff | Amplifier | → any `debuff` in build. Increases debuff stat values by 20%. |
| U2 | 【清灵】 | — | T3 | `buff_strength` value=20 | Self Buff | Amplifier | → any `self_buff` in build. Increases buff stat values by 20%. |
| U3 | 【业焰】 | — | T7 | `all_state_duration` value=69 (max_fusion) | **Cross-cutting** | Amplifier | → any time-based state: buffs, debuffs, DoTs. Value scales with count of time-based effects in build. One of the strongest cross-cutters. |
| U4 | 【击瑕】 | — | T10 | `conditional_damage` value=40, condition=target_controlled | Damage | Amplifier (conditional) | → any damage source, BUT requires enemy to be controlled. Value depends on control uptime in the scenario. |
| U5 | 【破竹】 | — | free | `per_hit_escalation` value=1, max=10 | Hit Escalation | Source | Standalone value on multi-hit skills. Weak ceiling (+10% max). |
| U6 | 【金汤】 | — | free | `self_damage_reduction_during_cast` value=10 | Survival | Source | Standalone. DR during cast only — value depends on cast duration and incoming damage. |
| U7 | 【怒目】 | — | free | `conditional_damage` value=20 + `conditional_crit_rate` value=30, both condition=target_hp_below_30 | Damage + Crit (dual chain) | Amplifier (conditional) | → any damage source. Execute-phase affix: only active below 30% HP. Crit rate feeds into crit chain if crit source exists. |
| U8 | 【鬼印】 | — | T4 | `dot_extra_per_tick` value=2 | DoT | Amplifier | → requires `dot` in build. Adds 2% enemy lost HP per tick. Zero value without DoT. |
| U9 | 【福荫】 | T3 | free | `random_buff`: one of `attack_bonus`=20 / `crit_damage_bonus`=20 / `damage_increase`=20 | Damage | Source (random, weak) | Standalone but unreliable — 1/3 chance for each. Low values (20%). |
| U10 | 【战意】 | — | T9 | `per_self_lost_hp` per_percent=0.5 | HP Exploitation | Source | +0.5% damage per 1% own HP lost. Needs active HP loss provider (self_hp_cost, self_damage_taken_increase). Pairs with `self_hp_cost`, `min_lost_hp_threshold`. |
| U11 | 【斩岳】 | — | free | `flat_extra_damage` value=2000 | Damage | Source | Standalone. Flat 2000% ATK extra damage — bypasses multiplier zones (additive, not multiplicative). |
| U12 | 【吞海】 | — | free | `per_enemy_lost_hp` per_percent=0.4 | HP Exploitation | Source | Standalone. +0.4% damage per 1% enemy HP lost. Stronger in long fights. |
| U13 | 【灵盾】 | — | T5 | `shield_strength` value=20 | Shield | Amplifier | → requires shield-generating effect in build (`damage_to_shield`, or `self_buff` with shield). |
| U14 | 【灵威】 | — | free | `next_skill_buff` stat=skill_damage_increase, value=118 (max_fusion) | Damage | Amplifier (temporal) | → the **next** skill's damage, not this one's. Value depends on slot ordering — strongest when preceding a burst skill. Cross-slot interaction. |
| U15 | 【摧山】 | — | free | `attack_bonus` value=20 | Damage | Amplifier | → any damage source. Generic +20% ATK. Always useful, never transformative. |
| U16 | 【通明】 | — | free | `guaranteed_resonance` base_mult=1.2, enhanced_mult=1.5, enhanced_chance=25 | Crit | Source | Standalone crit source. Weak compared to school version (【灵犀九重】2.97×). Universal fallback. |

### II. School Affixes (17)

#### Sword (4)

| # | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|
| Sw1 | 【摧云折月】 | — | free | `attack_bonus` value=55 | Damage | Amplifier | → any damage source. Strong ATK buff (55% vs 【摧山】's 20%). |
| Sw2 | 【灵犀九重】 | — | free | `guaranteed_resonance` base_mult=2.97, enhanced_mult=3.97, enhanced_chance=25 (max_fusion) | Crit | Source | **Strongest crit source in the game.** Standalone. 2.97× base, 25% chance of 3.97×. Transforms any damage into crit damage. |
| Sw3 | 【破碎无双】 | — | free | `attack_bonus`=15, `damage_increase`=15, `crit_damage_bonus`=15 | Damage + Crit | Amplifier (triple) | → any damage source. Three multiplier zones at once — weak individually (15% each) but multiplicative across zones. |
| Sw4 | 【心火淬锋】 | — | free | `per_hit_escalation` value=5, max=50 | Hit Escalation | Source | Standalone on multi-hit skills. Much stronger ceiling than 【破竹】(50% vs 10%). |

#### Spell (4)

| # | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|
| Sp1 | 【长生天则】 | — | T6 | `healing_increase` value=50 | Healing | Amplifier | → requires healing source (`lifesteal`, `healing_to_damage`). 50% healing boost. Zero value alone. |
| Sp2 | 【明王之路】 | — | free | `final_damage_bonus` value=50 | Damage | Amplifier | → any damage source. Final multiplier zone — multiplicative with all other damage bonuses. Strong. |
| Sp3 | 【天命有归】 | — | free | `probability_to_certain` + `damage_increase`=50 | Crit + Damage | **Enabler** + Amplifier | Enabler: converts probability triggers to certain (→ `probability_multiplier`, `conditional_crit_rate`, `debuff_stack_chance`). Also standalone +50% damage. **Dual nature**: enabler for probability chain, amplifier for damage. |
| Sp4 | 【景星天佑】 | T3 | free | `random_buff`: one of `attack_bonus`=55 / `crit_damage_bonus`=55 / `damage_increase`=55 | Damage | Source (random) | Stronger version of 【福荫】(55% vs 20%). Still random — 1/3 chance each. |

#### Demon (4)

| # | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|
| De1 | 【瑶光却邪】 | — | T6 | `healing_to_damage` value=50 | Healing→Damage | Source (conversion) | Converts healing into enemy damage (50%). **Dual chain**: needs healing source to deal damage. |
| De2 | 【溃魂击瑕】 | — | free | `conditional_damage`=100 + `conditional_crit`, both condition=target_hp_below_30 | Damage + Crit | Source (conditional) | **Execute affix.** +100% damage AND guaranteed crit below 30% HP. Standalone but conditional on enemy HP. Strongest execute in the game. |
| De3 | 【玄女护心】 | T5 | free | `damage_to_shield` value=50, duration=8 | Shield | Source | Standalone. Converts 50% of damage dealt into 8s shield. Creates shield for 【灵盾】/【青云灵盾】to amplify. |
| De4 | 【祸星无妄】 | T2 | free | `random_debuff`: one of `attack_reduction`=-20 / `crit_rate_reduction`=-20 / `crit_damage_reduction`=-50 | Debuff (enemy) | Source (random) | Random enemy debuff. All options reduce enemy combat stats. Independent of build — always has value, but unreliable. |

#### Body (5)

| # | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|
| Bo1 | 【金刚护体】 | — | free | `self_damage_reduction_during_cast` value=55 | Survival | Source | Standalone. 55% DR during cast (vs 【金汤】's 10%). Strongest defensive affix. |
| Bo2 | 【破灭天光】 | — | free | `flat_extra_damage` value=2500 | Damage | Source | Standalone. Flat 2500% ATK (vs 【斩岳】's 2000%). Strongest flat damage. |
| Bo3 | 【青云灵盾】 | — | T5 | `shield_strength` value=50 | Shield | Amplifier | → requires shield source. 50% shield buff (vs 【灵盾】's 20%). |
| Bo4 | 【贪狼吞星】 | — | free | `per_enemy_lost_hp` per_percent=1 | HP Exploitation | Source | Standalone. +1% damage per 1% enemy lost HP (vs 【吞海】's 0.4%). 2.5× stronger. |
| Bo5 | 【意坠深渊】 | T9 | free | `min_lost_hp_threshold`=11 + `damage_increase`=50 | HP Exploitation + Damage | **Enabler** + Amplifier | Enabler: guarantees minimum 11% HP-loss for `per_self_lost_hp` calculations. Also standalone +50% damage. **Dual nature** like 【天命有归】: enabler for HP chain, amplifier for damage. |

### III. Exclusive Affixes (28)

> Exclusive affixes are locked to their book. Choosing a book implicitly selects its exclusive affix. But this does NOT make exclusive affixes more important than universal/school ones — many universals (【业焰】, 【灵犀九重】) outvalue most exclusives. The exclusive affix determines what chain the book contributes to, which drives slot assignment.

#### Sword (7)

| # | Book | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| E1 | 千锋聚灵剑 | 【天哀灵涸】 | T2 | free | `debuff` name=灵涸, healing_received=-31, duration=8, dispellable=false | Debuff (anti-heal) | Source | Standalone. Healing reduction that **cannot be dispelled** — unique property. Competes with 【天倾灵枯】(E8, longer duration, conditional escalation) and 【无相魔威】(E16, stronger + damage). |
| E2 | 春黎剑阵 | 【玄心剑魄】 | T4 | free | `dot` name=噬心 550%/tick, 8s + `on_dispel` 3300% + 2s stun | DoT | Source | Standalone DoT. The `on_dispel` creates a dilemma: enemy either eats 8s DoT or takes burst + stun. Strategic interaction with any dispel pressure. |
| E3 | 皓月剑诀 | 【追神真诀】 | — | T4 | `dot_extra_per_tick` 26.5% + `conditional_buff` (enlightenment_10: +50% max_hp damage, +300% damage) | DoT + Damage | Amplifier + **Context modifier** | The `dot_extra_per_tick` → requires DoT. The `conditional_buff` is ONLY active at enlightenment=10 (max) — **dynamic edge**: value depends on the book's enlightenment level. At e10, this is transformative (+300% damage). Below e10, it's just a DoT amplifier. |
| E4 | 念剑诀 | 【仙露护元】 | — | T3 | `buff_duration` value=300 (max_fusion) | Self Buff | Amplifier (**cross-cutting**) | → any buff in build. +300% duration is extreme — a 4s buff becomes 16s. Value scales with how many and how powerful the buffs in the build are. Cross-slot: amplifies buffs from OTHER skills in the book set too. |
| E5 | 通天剑诀 | 【神威冲云】 | — | free | `ignore_damage_reduction` + `damage_increase` value=36 | Damage | Enabler + Amplifier | Enabler: bypasses ALL enemy DR — unique effect. Makes all damage sources bypass a defensive layer. Also standalone +36% damage. Compare to 【天命有归】's dual nature. |
| E6 | 新-青元剑诀 | 【天威煌煌】 | — | free | `next_skill_buff` skill_damage_increase=50 | Damage | Amplifier (temporal) | → the **next** skill's damage, not this one's. Weaker version of 【灵威】(50% vs 118%). Value depends entirely on slot ordering — what skill follows this one? Cross-slot interaction. |
| E7 | 无极御剑诀 | 【无极剑阵】 | — | free | `skill_damage_increase` value=555 + `enemy_skill_damage_reduction` value=350 | Damage | Source (net) | +555% skill damage but enemy gets +350% skill DR against this skill. Net effect depends on the damage formula — NOT simply 555-350=205%. Requires understanding the multiplicative zones. Self-contained, no dependencies. |

#### Spell (7)

| # | Book | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| E8 | 甲元仙符 | 【天倾灵枯】 | T2 | free | `debuff` name=灵枯, healing=-31, duration=20 + `conditional_debuff` (hp<30%: healing=-51) | Debuff (anti-heal) | Source | Standalone. 20s duration (vs 【天哀灵涸】's 8s). Escalates to -51% below 30% HP — execute synergy with 【怒目】/【溃魂击瑕】. |
| E9 | 浩然星灵诀 | 【龙象护身】 | — | T3 | `buff_strength` value=104 | Self Buff | Amplifier | → any `self_buff` in build. **5× stronger** than 【清灵】(104% vs 20%). Doubles buff stat values. Massive if the book applies powerful buffs (e.g., 甲元仙符's 仙佑 +70% ATK/DEF/HP → +142.8%). |
| E10 | 元磁神光 | 【真极穿空】 | — | T3 | `buff_stack_increase` 100% + `per_buff_stack_damage` 5.5%/5stacks, max=27.5% | Self Buff + Stack Exploit | Amplifier + Source | Dual: doubles buff stack capacity AND converts stacks to damage. → requires buff-stacking skill. The more buff layers the skill applies, the more damage. Bridge between Self Buff chain and Damage output. |
| E11 | 周天星元 | 【奇能诡道】 | T2 | T2 | `debuff_stack_chance` 20% + `conditional_debuff` (enlightenment: 逆转阴阳, DR reduction) | Debuff | Amplifier + **Context modifier** | (1) 20% extra debuff layer → amplifies any debuff application. (2) At enlightenment: when applying damage-increase buffs, ALSO applies enemy DR reduction. **Bridge effect**: converts Self Buff application → enemy Debuff. Dynamic: the DR reduction's value depends on what damage-increase buffs exist. |
| E12 | 星元化岳 | 【仙灵汲元】 | T6 | free | `lifesteal` value=55 | Healing | Source | Standalone. 55% lifesteal. Converts damage dealt to healing. Creates a healing source that 【长生天则】(+50%) and 【瑶光却邪】(healing→damage) can amplify. |
| E13 | 玉书天戈符 | 【天人合一】 | — | free | `enlightenment_bonus` +1 (max 3) + `damage_increase` value=5 | **Dynamic** + Damage | **Context modifier** + Amplifier | The enlightenment_bonus has **fully dynamic edges** — its value is whatever effects the equipped book unlocks at the next tier. +5% damage is negligible standalone. Value ranges from zero (book already at max enlightenment) to transformative (unlocking a powerful tier). |
| E14 | 九天真雷诀 | 【九雷真解】 | — | T3∨T2∨T5 | `on_buff_debuff_shield_trigger` damage=50.8% of skill | **Cross-cutting** | Source (triggered) | Deals damage every time the skill applies ANY buff, debuff, or shield. Value = 50.8% × number of state applications per cast. **Cross-cutting source**: benefits from ALL state-applying effects in the skill. More buffs/debuffs/shields = more triggers. |

#### Demon (7)

| # | Book | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| E15 | 大罗幻诀 | 【古魔之魂】 | — | T4 | `dot_damage_increase` value=104 | DoT | Amplifier | → requires `dot` in build. +104% DoT damage per tick. Zero value without DoT. The strongest single DoT amplifier. |
| E16 | 无相魔劫咒 | 【无相魔威】 | T2 | free | `debuff` name=魔劫, healing=-40.8, 8s + `conditional_damage` 105% (205% if no healing on target) | Debuff (anti-heal) + Damage | Source (dual) | Standalone. Anti-heal debuff AND damage boost in one. The 105%→205% escalation when target has no healing creates **strategic interaction**: pair with other anti-heal (【天哀灵涸】/【天倾灵枯】) to suppress all healing, then this affix deals 205% instead of 105%. |
| E17 | 天魔降临咒 | 【引灵摘魂】 | — | T2 | `conditional_damage` value=104, condition=target_has_debuff | Damage | Amplifier (conditional) | → requires enemy to have debuffs. +104% damage. Near-universal in debuff-heavy builds (most PvP builds apply debuffs). Strongest conditional_damage after 【溃魂击瑕】. |
| E18 | 天轮魔经 | 【心魔惑言】 | — | T2 | `debuff_stack_increase` 100% + `per_debuff_stack_damage` 5.5%/5stacks, max=27.5% (DoT at half) | Debuff + Stack Exploit | Amplifier + Source | Mirror of 【真极穿空】(E10) for debuffs. Doubles debuff stacks AND converts stacks to damage. Note: DoT receives only half the damage bonus — partial chain interaction. |
| E19 | 天剎真魔 | 【魔骨明心】 | T6, T2 | T2 | `conditional_heal_buff` (target_has_debuff: +90% healing, 8s) + `conditional_debuff` (enlightenment: -20% final DR per hit, 1s) | Healing + Debuff | Source (conditional) + **Context modifier** | (1) `conditional_heal_buff` → T6: +90% healing when enemy has debuffs. (2) `conditional_debuff` → T2: at enlightenment, stacks -20% enemy final DR per hit. **Dual provider**: both T6 and T2 are derived from outputs. Per-hit DR shred value scales with hit count AND enlightenment level. |
| E20 | 解体化形 | 【心逐神随】 | — | free | `probability_multiplier` (悟0: 11/31/51% → 4/3/2×) (悟2: 60/80/100% → 4/3/2×) | **Cross-cutting** | Amplifier (universal) | Multiplies ALL effects on the skill by 2-4×. Does not belong to any single chain — it amplifies **whatever chain the skill is in**. At 悟2, guaranteed 2× minimum. The most powerful cross-cutting amplifier. → 【天命有归】converts the probability thresholds to certainty (Enabler relationship). Multi-tier: value changes dramatically with enlightenment. |
| E21 | 焚圣真魔咒 | 【天魔真解】 | — | T4 | `dot_frequency_increase` value=50.5 | DoT | Amplifier | → requires `dot` in build. Ticks 50.5% faster — nearly doubles DoT DPS. Complements 【古魔之魂】(damage per tick) and 【业焰】(duration). |

#### Body (7)

| # | Book | Affix | provides | requires | Effect types | Chain(s) | Tier | Dependencies / Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| E22 | 十方真魄 | 【破釜沉舟】 | T9 | free | `skill_damage_increase` value=380 (fusion=54) + `self_damage_taken_increase` value=50 | Damage + HP Exploit | Amplifier + **Enabler** | +380% skill damage is massive. `self_damage_taken_increase` → T9: the +50% self-damage-taken looks like a cost, but it **enables HP exploitation** — you lose HP faster, making 【战意】/【怒血战意】stronger. The output-driven model derives `provides=T9` automatically from the effect type, making this hidden synergy visible. When consumer count exceeds slot capacity (3), consumption naturally spans multiple slots → cross-slot binding. |
| E23 | 疾风九变 | 【真言不灭】 | — | T7 | `all_state_duration` value=55 | **Cross-cutting** | Amplifier | → all time-based states. +55% duration on buffs, debuffs, DoTs. Weaker than 【业焰】(69%) but stacks with it. Body-school version. |
| E24 | 玄煞灵影诀 | 【怒血战意】 | — | T9 | `per_self_lost_hp` per_percent=2 | HP Exploitation | Source | +2% damage per 1% own HP lost (4× stronger than 【战意】's 0.5%). Core of the HP exploitation chain. Needs active HP loss provider. Pairs with 【破釜沉舟】(take more damage → lose more HP → more bonus), 【意坠深渊】(minimum HP floor). |
| E25 | 惊蛰化龙 | 【紫心真诀】 | — | T2 | `per_debuff_stack_true_damage` 2.1%/stack max=21% + `conditional_buff` (enlightenment: +50% lost_hp damage, +75% damage) | Stack Exploit + Damage | Source + **Context modifier** | (1) True damage per enemy debuff stack — bypasses all defenses. Needs debuffs on enemy. (2) At enlightenment: massive buff (+75% damage, +50% HP-based damage). Dynamic: the second effect is locked behind enlightenment. Bridge: Debuff chain feeds Stack Exploit. |
| E26 | 煞影千幻 | 【乘胜逐北】 | — | T10 | `conditional_damage` value=100, condition=target_controlled | Damage | Amplifier (conditional) | → any damage source + enemy must be controlled. +100% is very strong (vs 【击瑕】's 40%). Value entirely depends on control uptime. Exclusive to Body but shares condition with 【击瑕】. |
| E27 | 九重天凤诀 | 【玉石俱焚】 | — | T5 | `on_shield_expire` damage=100% of shield value | Shield | Source (triggered) | → requires shield creation in build (`damage_to_shield`/【玄女护心】). When shield expires, deals 100% of shield value as damage. Creates a damage loop: damage → shield → expire → more damage. Zero value without shield source. |
| E28 | 天煞破虚诀 | 【天煞破虚】 | — | free | `periodic_dispel` 1/s for 10s, 25.5% skill damage per dispel (double if no buffs) | Debuff (anti-buff) + Damage | Source | Standalone. Strips enemy buffs AND deals damage. Counter to buff-heavy builds. The "double if no buffs" means damage floor even against unbuffed targets. |

---

## Amplification Model

The `provides`/`requires` binding model (T1–T10) answers: **"Can this affix function?"** — gating.

The **amplification model** answers: **"What makes this affix stronger?"** — discovery.

### Three scopes of amplification

| Scope | Mechanism | Example |
|:------|:----------|:--------|
| **Cross-cutting** | Multiplies ALL effects on the skill | 【心逐神随】`probability_multiplier` (x2-4); 【天命有归】`probability_to_certain` |
| **Zone-multiplicative** | Output in a different damage formula zone — multiplicative stacking | 【摧山】`attack_bonus` (S_coeff) amplifies 【怒血战意】`per_self_lost_hp` (M_dmg) |
| **Zone-additive** | Output in the same damage formula zone — diminishing returns | 【战意】`per_self_lost_hp` (M_dmg) + 【怒血战意】`per_self_lost_hp` (M_dmg) |

Plus **input-side** amplifiers: structural relationships where one effect creates a resource consumed by another (e.g., `self_damage_taken_increase` accelerates HP loss → feeds `per_self_lost_hp`).

### Damage formula zones

Zone data comes from the effect type registry (`lib/domain/effects/*.ts`). Each effect type is annotated with the damage formula zone(s) it contributes to. Two effects in different zones are multiplicative; same zone is additive.

| Zone | Description | Effect types |
|:-----|:-----------|:-------------|
| D_base | Base skill damage | `base_attack`, `summon` |
| D_flat | Flat extra damage | `flat_extra_damage` |
| S_coeff | ATK coefficient | `attack_bonus`, `self_buff` |
| M_dmg | General damage multiplier | `damage_increase`, `conditional_damage`, `per_self_lost_hp`, `per_enemy_lost_hp`, `per_hit_escalation`, `crit_damage_bonus` |
| M_skill | Skill-specific multiplier | `skill_damage_increase`, `next_skill_buff` |
| M_final | Final multiplier | `final_damage_bonus`, `ignore_damage_reduction` |
| M_res | Resonance (crit) | `guaranteed_resonance` |
| M_synchro | Cross-cutting probability | `probability_multiplier`, `probability_to_certain` |
| D_ortho | Orthogonal damage (DoT, bridges) | `dot`, `on_dispel`, `healing_to_damage`, `on_shield_expire`, etc. |

> **Example: amplifiers for 【怒血战意】** (`per_self_lost_hp`, zone M_dmg). Cross-cutting: 【心逐神随】, 【天命有归】. Zone-multiplicative (25): 【摧山】(S_coeff), 【明王之路】(M_final), 【通明】(M_res), 【破釜沉舟】(M_skill), 【斩岳】(D_flat), etc. Input-side: 【破釜沉舟】(`self_damage_taken_increase`), 【意坠深渊】(`min_lost_hp_threshold`). The previous model found only 2 amplifiers; the zone model finds 47+.

### Implementation

`lib/domain/amplifiers.ts` — `findAmplifiers(affix)` returns categorized results: `{ crossCutting, multiplicative, additive, inputSide }`. Uses the registry's zone annotations for zone relationships and a hand-curated `INPUT_FEEDERS` map for structural input-side relationships.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-26 | Initial: framework (chains, tiers, interaction types) + universal (16) + school (17) affix walkthrough |
| 1.1 | 2026-02-27 | Add subcategory associations table (9 subcategories with member→partner mappings) |
| 2.0 | 2026-03-05 | Add §Target Categories (T1–T10 binding model). Add `provides`/`requires` columns to all walkthrough tables (61 affixes). Reframe subcategory associations with formal target-category bindings. |
| 2.1 | 2026-03-05 | Output-driven binding model: `provides` is now derived from `outputs` (effect types) via `EFFECT_PROVIDES` mapping, not hand-curated per affix. Added effect type → category mapping table. Fixed 【魔骨明心】 provides (T6→T6,T2). Updated 【破釜沉舟】 notes to explain how `self_damage_taken_increase` → T9 makes the hidden enabler visible automatically. |
| 3.0 | 2026-03-05 | Add §Amplification Model: three scopes (cross-cutting, zone-multiplicative, zone-additive) + input-side. Damage formula zone table. `findAmplifiers()` finds 47+ amplifiers for any affix vs 2 with the old chain-specific model. |
