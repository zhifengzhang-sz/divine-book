---
initial date: 2026-2-27
dates of modification: [2026-2-27, 2026-3-5]
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

# Domain Paths: Complete Chain Catalog

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **All qualified paths in the Divine Book effect graph, projected from graph space back to book space.** A path is "qualified" when every node has its input ports satisfied. Each path lists the concrete book chains that realize it — the book-level combinations a constructor selects from. Builds on [domain.graph.md](./domain.graph.md) (network model) and [domain.category.md](./domain.category.md) (affix taxonomy).

> **Convention:** skill books in backticks (`` `book` ``), affixes in lenticular brackets (【affix】). Chain format: `` `book A` ``(【affix A】) + `` `book B` ``(【affix B】). Generic books: `any skill book`, `any 剑修 book`, `any 法修 book`, `any 魔修 book`, `any 体修 book`.

> **Uniqueness constraint:** a 6-book set must have uniqueness of all skill books and all affixes. Each affix appears in **exactly one slot**. Chains in this catalog compete for the same affixes — selecting one chain may exclude another. Construction is the optimization of which chain gets each scarce affix.

> **Combo evaluation.** Cross-cutting amplifiers (X1–X3) and enablers (E1–E3) have no intrinsic output — their value is entirely determined by what they are paired with on the same 灵書. Compare **combos**, not individual affixes. Zone quality matters: amplifiers in crowded zones (ATK) contribute less marginal value than amplifiers in empty zones (final damage, crit).

## Effect Type Glossary

| Symbol | Meaning |
|:---|:---|
| **Offense** | |
| `base_attack` | Base skill damage (% ATK, per hit) |
| `percent_max_hp_damage` | Damage as % of target's max HP |
| `flat_extra_damage` | Flat bonus damage added to each hit (% ATK, additive) |
| `guaranteed_resonance` | Guaranteed critical hit with fixed multiplier |
| `conditional_crit` | Guaranteed critical hit when condition is met |
| `dot` | Damage over time (periodic ticks) |
| `shield_destroy_damage` | Bonus damage when destroying enemy shield |
| `shield_destroy_dot` | DoT triggered per shield layer destroyed |
| `delayed_burst` | Accumulated damage released after delay |
| `summon` | Summon a companion that attacks independently |
| `periodic_dispel` | Periodically strip enemy buffs (deals damage per strip) |
| `counter_buff` | Buff triggered when enemy attacks (reflects damage) |
| `on_dispel` | Burst damage triggered when this effect is dispelled |
| `self_lost_hp_damage` | Damage based on own lost HP (current cast) |
| `on_buff_debuff_shield_trigger` | Damage each time this skill applies any state |
| `per_debuff_stack_true_damage` | True damage per enemy debuff stack (bypasses all defense) |
| **Bridges** | |
| `lifesteal` | Convert % of damage dealt into self-healing |
| `healing_to_damage` | Convert healing done into enemy damage |
| `damage_to_shield` | Convert % of damage dealt into self-shield |
| `on_shield_expire` | Deal damage equal to shield value when shield expires |
| `per_buff_stack_damage` | Bonus damage per own buff stack count |
| `per_debuff_stack_damage` | Bonus damage per enemy debuff stack count |
| `per_self_lost_hp` | Bonus damage per 1% own HP lost |
| `per_enemy_lost_hp` | Bonus damage per 1% enemy HP lost |
| `counter_debuff` | Debuff applied to enemy when they attack |
| **Debuffs** | |
| `debuff` | Direct debuff on enemy (stat reduction, named state) |
| `conditional_debuff` | Debuff applied when condition is met |
| `cross_slot_debuff` | Debuff that affects damage from other skill slots |
| `random_debuff` | One random debuff from a set of options |
| **Buffs** | |
| `self_buff` | Buff applied to self (stat increase, named state) |
| `next_skill_buff` | Buff applied to the next skill cast (cross-slot) |
| `random_buff` | One random buff from a set of options |
| `conditional_buff` | Self-buff activated when condition is met |
| `conditional_heal_buff` | Healing buff when enemy has debuffs |
| **Survival** | |
| `self_damage_reduction_during_cast` | Damage reduction active during skill cast |
| `untargetable_state` | Cannot be targeted for a duration |
| `periodic_cleanse` | Periodically remove debuffs from self |
| **Amplifiers** | |
| `attack_bonus` | Increase ATK stat (% multiplicative zone) |
| `damage_increase` | Increase all damage dealt (% multiplicative zone) |
| `skill_damage_increase` | Increase this skill's damage (% multiplicative zone) |
| `enemy_skill_damage_reduction` | Enemy gains DR against this skill (offsets `skill_damage_increase`) |
| `final_damage_bonus` | Final % multiplier applied after all other zones |
| `crit_damage_bonus` | Increase critical damage multiplier |
| `conditional_damage` | Bonus damage when condition is met |
| `per_hit_escalation` | Damage increases per hit within one cast |
| `periodic_escalation` | Damage multiplier every N hits |
| `conditional_crit_rate` | Crit rate increase when condition is met |
| `dot_damage_increase` | Increase DoT damage per tick |
| `dot_frequency_increase` | Increase DoT tick rate |
| `dot_extra_per_tick` | Extra damage added to each DoT tick |
| `extended_dot` | DoT with extended duration |
| `delayed_burst_increase` | Increase delayed burst accumulated damage |
| `summon_buff` | Buff the summoned companion |
| `counter_debuff_upgrade` | Upgrade counter_debuff trigger chance |
| `debuff_strength` | Increase debuff stat values (%) |
| `debuff_stack_increase` | Double debuff stack capacity |
| `debuff_stack_chance` | Chance to add extra debuff layers |
| `buff_strength` | Increase buff stat values (%) |
| `buff_duration` | Increase buff duration (%) |
| `buff_stack_increase` | Double buff stack capacity |
| `self_buff_extend` | Extend existing self-buff duration |
| `shield_strength` | Increase shield HP (%) |
| `healing_increase` | Increase healing received/dealt (%) |
| **Cross-cutting amplifiers** | |
| `probability_multiplier` | Multiply all effects on this skill by 2–4× |
| `all_state_duration` | Extend all time-based states (buffs, debuffs, DoTs) |
| `ignore_damage_reduction` | All damage bypasses enemy DR |
| **Enablers** | |
| `probability_to_certain` | Convert probability-based triggers to 100% |
| `min_lost_hp_threshold` | Set a floor for HP-loss calculations |
| `enlightenment_bonus` | Raise a book's enlightenment level (+1, max 3) |
| **Resource generators** | |
| `self_hp_cost` | Costs own HP to cast (creates HP loss for exploitation) |
| `self_damage_taken_increase` | Take more damage from enemy (accelerates HP loss) |

## I. Offense Paths (A → B.hp)

| # | Path | requires | Nodes | Book Chains |
|:---|:---|:---|:---|:---|
| O1 | Direct damage | free | `base_attack` | All 9 detailed books (main skill) |
| O2 | %HP damage | free | `percent_max_hp_damage` | `千锋聚灵剑`(main: 27%×6)<br>`皓月剑诀`(main via 寂灭剑心: 12%×10) |
| O3 | Flat extra damage | free | `flat_extra_damage` | `any skill book`(【斩岳】)<br>`any 体修 book`(【破灭天光】) |
| O4 | Crit | free | `guaranteed_resonance`, `conditional_crit` | `any skill book`(【通明】)<br>`any 剑修 book`(【灵犀九重】)<br>`any 魔修 book`(【溃魂击瑕】) — conditional: target HP < 30% |
| O5 | DoT chain | T4 | `dot` → amplifiers | See [O5 expanded](#o5-dot-chain) |
| O6 | Shield-destroy | free | `shield_destroy_damage`, `shield_destroy_dot` | `皓月剑诀`(main + primary 碎魂剑意) — self-contained |
| O7 | Delayed burst | free | `delayed_burst`, `delayed_burst_increase` | `无相魔劫咒`(main + primary 灭劫魔威) — self-contained |
| O8 | Summon | free | `summon`, `summon_buff` | `春黎剑阵`(main + primary 幻象剑灵) — self-contained |
| O9 | Dispel damage | free | `periodic_dispel` | `天煞破虚诀`(【天煞破虚】) |
| O10 | Counter reflect | free | `counter_buff` | `疾风九变`(main: 极怒) |
| O11 | On-dispel burst | T4 | `on_dispel` | `春黎剑阵`(【玄心剑魄】) |
| O12 | Self-HP → damage | T9 | `self_lost_hp_damage` | `十方真魄`(main: 16% lost HP) |
| O13 | State-trigger damage | T3∨T2∨T5 | `on_buff_debuff_shield_trigger` | See [O13 expanded](#o13-state-trigger-damage) |
| O14 | True damage (stacks) | T2 | `per_debuff_stack_true_damage` | See [O14 expanded](#o14-true-damage) |

### O5 DoT chain

Nodes: `dot` → `dot_damage_increase`, `dot_frequency_increase`, `dot_extra_per_tick`, `extended_dot`, `on_dispel`

| # | Book Chain | Connection |
|:---|:---|:---|
| 1 | `春黎剑阵`(【玄心剑魄】) | Source: dot 噬心 550%/tick 8s + on_dispel 3300% |
| 2 | `大罗幻诀`(main) | Source: 2 DoTs (噬心魔咒 + 断魂之咒) |
| 3 | `皓月剑诀`(primary 碎魂剑意) | Source: shield_destroy_dot 600%/shield |
| 4 | `念剑诀`(primary 雷阵剑影) | Source: extended_dot 6.5s |
| 5 | `春黎剑阵`(【玄心剑魄】) + `大罗幻诀`(【古魔之魂】) | Source + dot_damage_increase +104% |
| 6 | `春黎剑阵`(【玄心剑魄】) + `焚圣真魔咒`(【天魔真解】) | Source + dot_frequency_increase +50.5% |
| 7 | `春黎剑阵`(【玄心剑魄】) + `皓月剑诀`(【追神真诀】) | Source + dot_extra_per_tick +26.5% |
| 8 | `春黎剑阵`(【玄心剑魄】) + `any skill book`(【鬼印】) | Source + dot_extra_per_tick +2% enemy HP |
| 9 | `大罗幻诀`(main + 【古魔之魂】) | Source + amplifier on same book |
| 10 | `大罗幻诀`(main) + `焚圣真魔咒`(【天魔真解】) | Source + dot_frequency_increase +50.5% |
| 11 | any DoT source + `any skill book`(【业焰】) | Cross-cutting: duration +69% |
| 12 | any DoT source + `疾风九变`(【真言不灭】) | Cross-cutting: duration +55% |

### O13 State-trigger damage

Nodes: `on_buff_debuff_shield_trigger` — damage per state application on same skill

| # | Book Chain | Connection |
|:---|:---|:---|
| 1 | `九天真雷诀`(【九雷真解】) + `any 魔修 book`(【玄女护心】) | Shield application triggers 50.8% |
| 2 | `九天真雷诀`(【九雷真解】) + `any 魔修 book`(【祸星无妄】) | Random debuff application triggers 50.8% |

> **Same-skill scope:** 【九雷真解】 triggers on state applications by THIS skill only. Value scales with how many state-applying effects are on the same 灵书. Dead edges pruned: 【咒书】 amplifies existing debuffs but doesn't CREATE state applications (no trigger). 【福荫】 adds one trigger but +20% random buff is too weak to justify the affix slot under uniqueness.

### O14 True damage

Nodes: `per_debuff_stack_true_damage` — needs debuff stacks on enemy

| # | Book Chain | Connection |
|:---|:---|:---|
| 1 | `惊蛰化龙`(【紫心真诀】) + `千锋聚灵剑`(【天哀灵涸】) | True damage + undispellable anti-heal debuff |
| 2 | `惊蛰化龙`(【紫心真诀】) + `甲元仙符`(【天倾灵枯】) | True damage + 20s anti-heal debuff |
| 3 | `惊蛰化龙`(【紫心真诀】) + `大罗幻诀`(main: 罗天魔咒) | True damage + counter debuff stacks |
| 4 | `惊蛰化龙`(【紫心真诀】) + `天轮魔经`(【心魔惑言】) | True damage + debuff_stack_increase +100% |
| 5 | `惊蛰化龙`(【紫心真诀】) + `any skill book`(【咒书】) | True damage + debuff_strength amplifier |

## II. Bridge Paths (resource conversion)

| # | Path | requires | Conversion | Book Chains |
|:---|:---|:---|:---|:---|
| B1 | Damage → Healing | T6 source | `lifesteal` | `星元化岳`(【仙灵汲元】)<br>`疾风九变`(primary 星猿复灵)<br>`星元化岳`(【仙灵汲元】) + `any 法修 book`(【长生天则】)<br>`疾风九变`(primary 星猿复灵) + `any 法修 book`(【长生天则】) |
| B2 | Healing → Damage | T6 | `healing_to_damage` | `any 魔修 book`(【瑶光却邪】) + `星元化岳`(【仙灵汲元】)<br>`any 魔修 book`(【瑶光却邪】) + `疾风九变`(primary 星猿复灵)<br>`any 魔修 book`(【瑶光却邪】) + `天剎真魔`(【魔骨明心】) |
| B3 | Damage → Shield | T5 creation | `damage_to_shield` | `any 魔修 book`(【玄女护心】)<br>`any 魔修 book`(【玄女护心】) + `any skill book`(【灵盾】)<br>`any 魔修 book`(【玄女护心】) + `any 体修 book`(【青云灵盾】) |
| B4 | Shield → Damage | T5 | `on_shield_expire` | `九重天凤诀`(【玉石俱焚】) + `any 魔修 book`(【玄女护心】) |
| B5 | Buff stacks → Damage | T3 | `per_buff_stack_damage` | `元磁神光`(【真极穿空】) + any buff-stacking source |
| B6 | Debuff stacks → Damage | T2 | `per_debuff_stack_damage` | `天轮魔经`(【心魔惑言】) + any debuff source |
| B7 | Own HP loss → Damage | T9 | `per_self_lost_hp` | See [B7 expanded](#b7-own-hp-loss--damage) |
| B8 | Enemy HP loss → Damage | free | `per_enemy_lost_hp` | `any skill book`(【吞海】)<br>`any 体修 book`(【贪狼吞星】) |
| B9 | Opponent attack → Debuffs | T2 source | `counter_debuff` | See [B9 expanded](#b9-opponent-attack--debuffs) |
| B10 | Opponent attack → Damage | free | `counter_buff` | `疾风九变`(main: 极怒 50% reflect + 15% lost HP) |
| B11 | Self buff → Opponent debuff | T3∧T2 | `conditional_debuff` | `周天星元`(【奇能诡道】) + `甲元仙符`(main: 仙佑)<br>`周天星元`(【奇能诡道】) + `十方真魄`(main: 怒灵降世)<br>`周天星元`(【奇能诡道】) + any damage-increase buff source |

### B7 Own HP loss → Damage

Nodes: `per_self_lost_hp` ← `self_hp_cost`, `self_damage_taken_increase`, `min_lost_hp_threshold`

| # | Book Chain | Connection |
|:---|:---|:---|
| 1 | `玄煞灵影诀`(【怒血战意】) | Source: +2%/1% HP lost |
| 2 | `any skill book`(【战意】) | Source (weak): +0.5%/1% HP lost |
| 3 | `玄煞灵影诀`(【怒血战意】) + `十方真魄`(【破釜沉舟】) | Source + accelerated HP loss (+50% damage taken) |
| 4 | `玄煞灵影诀`(【怒血战意】) + `any 体修 book`(【意坠深渊】) | Source + floor guarantee (min 11% HP lost) |
| 5 | `玄煞灵影诀`(【怒血战意】) + `十方真魄`(main: self_hp_cost) | Source + direct HP cost (−10% per cast) |
| 6 | `玄煞灵影诀`(【怒血战意】) + `十方真魄`(【破釜沉舟】) + `any 体修 book`(【意坠深渊】) | Full chain: source + accelerator + floor |
| 7 | `any skill book`(【战意】) + `十方真魄`(【破釜沉舟】) | Weak source + accelerator |

### B9 Opponent attack → Debuffs

Nodes: `counter_debuff` ← `counter_debuff_upgrade`, `debuff_stack_increase`, `debuff_stack_chance`

| # | Book Chain | Connection |
|:---|:---|:---|
| 1 | `大罗幻诀`(main: 罗天魔咒 30%) | Source: counter_debuff on enemy attack |
| 2 | `大罗幻诀`(main + primary 魔魂咒界) | Source + upgrade to 60% + cross_slot_debuff 命損 |
| 3 | `大罗幻诀`(main) + `天轮魔经`(【心魔惑言】) | Source + debuff_stack_increase +100% |
| 4 | `大罗幻诀`(main) + `周天星元`(【奇能诡道】) | Source + debuff_stack_chance +20% |
| 5 | `大罗幻诀`(main) + `any 法修 book`(【天命有归】) | Source + probability_to_certain (30% → 100%) |

## III. Debuff Paths (A → B.state)

| # | Path | Effect | Book Chains |
|:---|:---|:---|:---|
| D1 | Direct debuff | `debuff` + `debuff_strength` | `千锋聚灵剑`(【天哀灵涸】): healing −31%, undispellable, 8s<br>`甲元仙符`(【天倾灵枯】): healing −31%, 20s<br>`无相魔劫咒`(【无相魔威】): healing −40.8%, 8s<br>`千锋聚灵剑`(【天哀灵涸】) + `any skill book`(【咒书】)<br>`甲元仙符`(【天倾灵枯】) + `any skill book`(【咒书】)<br>`无相魔劫咒`(【无相魔威】) + `any skill book`(【咒书】) |
| D2 | Conditional debuff | `conditional_debuff` | `甲元仙符`(【天倾灵枯】): escalates to −51% below 30% HP<br>`天剎真魔`(【魔骨明心】): −20% final DR per hit (enlightenment)<br>`周天星元`(【奇能诡道】): 逆转阴阳 (enlightenment) |
| D3 | Counter debuff | `counter_debuff` chain | `大罗幻诀`(main + primary 魔魂咒界): source + upgrade<br>`大罗幻诀`(main) + `天轮魔经`(【心魔惑言】): source + stack ×2<br>`大罗幻诀`(main) + `周天星元`(【奇能诡道】): source + stack chance |
| D4 | Cross-slot debuff | `cross_slot_debuff` | `大罗幻诀`(primary 魔魂咒界): 命損 −100% final DR, 8s |
| D5 | Anti-heal | `debuff`(healing) | `千锋聚灵剑`(【天哀灵涸】): −31% undispellable<br>`甲元仙符`(【天倾灵枯】): −31%/−51%, 20s<br>`无相魔劫咒`(【无相魔威】): −40.8%<br>`千锋聚灵剑`(【天哀灵涸】) + `无相魔劫咒`(【无相魔威】): stack to −71.8% |
| D6 | Anti-buff | `periodic_dispel` | `天煞破虚诀`(【天煞破虚】): strips 1 buff/s, 10s |
| D7 | Random debuff | `random_debuff` | `any 魔修 book`(【祸星无妄】): ATK−20% / crit_rate−20% / crit_dmg−50% |

## IV. Self-Buff Paths (A → A.stats)

| # | Path | Effect | Book Chains |
|:---|:---|:---|:---|
| S1 | Direct self-buff | `self_buff` + amplifiers | See [S1 expanded](#s1-direct-self-buff) |
| S2 | Next-skill buff | `next_skill_buff` | `新-青元剑诀`(【天威煌煌】) + next slot's book: +50% skill damage<br>`any skill book`(【灵威】) + next slot's book: +118% skill damage |
| S3 | Random buff | `random_buff` | `any skill book`(【福荫】): ATK/crit_dmg/dmg +20%<br>`any 法修 book`(【景星天佑】): ATK/crit_dmg/dmg +55% |
| S4 | Conditional heal buff | `conditional_heal_buff` | `天剎真魔`(【魔骨明心】) + `千锋聚灵剑`(【天哀灵涸】)<br>`天剎真魔`(【魔骨明心】) + `甲元仙符`(【天倾灵枯】)<br>`天剎真魔`(【魔骨明心】) + `无相魔劫咒`(【无相魔威】)<br>`天剎真魔`(【魔骨明心】) + any debuff source |

### S1 Direct self-buff

Nodes: `self_buff` ← `buff_strength`, `buff_duration`, `buff_stack_increase`, `self_buff_extend`

| # | Book Chain | Connection |
|:---|:---|:---|
| 1 | `甲元仙符`(main: 仙佑 +70% ATK/DEF/HP 12s) | Source: strongest base buff |
| 2 | `十方真魄`(main: 怒灵降世 +20% ATK/DR 4s) | Source: short burst buff |
| 3 | `皓月剑诀`(main: 寂灭剑心) | Source |
| 4 | `甲元仙符`(main: 仙佑) + `浩然星灵诀`(【龙象护身】) | +70% buff → +142.8% (buff_strength +104%) |
| 5 | `甲元仙符`(main: 仙佑) + `念剑诀`(【仙露护元】) | 12s buff → 48s (buff_duration +300%) |
| 6 | `甲元仙符`(main: 仙佑) + `any skill book`(【清灵】) | +70% buff → +84% (buff_strength +20%) |
| 7 | `甲元仙符`(main: 仙佑) + `浩然星灵诀`(【龙象护身】) + `念剑诀`(【仙露护元】) | Full chain: +142.8% for 48s |
| 8 | `十方真魄`(main: 怒灵降世) + `十方真魄`(primary 星猿弃天) | Source + self_buff_extend +3.5s (same book) |
| 9 | `十方真魄`(main: 怒灵降世) + `念剑诀`(【仙露护元】) | 4s buff → 16s |
| 10 | any buff source + `元磁神光`(【真极穿空】) | buff_stack_increase +100% + stack→damage 5.5%/5 |

## V. Survival Paths (preserving A.hp)

| # | Path | Effect | Book Chains |
|:---|:---|:---|:---|
| V1 | Damage reduction | `self_damage_reduction_during_cast` | `any skill book`(【金汤】): +10%<br>`any 体修 book`(【金刚护体】): +55% |
| V2 | Untargetable | `untargetable_state` | `念剑诀`(main: 4s untargetable) |
| V3 | Shield | `damage_to_shield` + `shield_strength` | `any 魔修 book`(【玄女护心】): 50% damage → shield 8s<br>`any 魔修 book`(【玄女护心】) + `any skill book`(【灵盾】): shield +20%<br>`any 魔修 book`(【玄女护心】) + `any 体修 book`(【青云灵盾】): shield +50% |
| V4 | Cleanse | `periodic_cleanse` | `十方真魄`(primary 星猿弃天): 30%/s cleanse, max 1/25s |
| V5 | Lifesteal | `lifesteal` + `healing_increase` | `星元化岳`(【仙灵汲元】): 55% lifesteal<br>`疾风九变`(primary 星猿复灵): 82% lifesteal<br>`星元化岳`(【仙灵汲元】) + `any 法修 book`(【长生天则】): 55% + healing +50%<br>`疾风九变`(primary 星猿复灵) + `any 法修 book`(【长生天则】): 82% + healing +50% |

## VI. Cross-Cutting Amplifiers

| # | Node | Scope | Book Chains |
|:---|:---|:---|:---|
| X1 | `probability_multiplier` | **Same-skill scope:** all effects on this 灵书 ×2–4 | See [X1 expanded](#x1-probability_multiplier) |
| X2 | `all_state_duration` | All time-based states | See [X2 expanded](#x2-all_state_duration) |
| X3 | `ignore_damage_reduction` | All damage bypasses B.DR | See [X3 expanded](#x3-ignore_damage_reduction) |

### X1 probability_multiplier

Source: 【心逐神随】(`解体化形` exclusive). Multiplies ALL effects on same 灵書 ×2–4. Monopoly node — no substitute.

X1 occupies one aux slot. The remaining aux slot and the main book together determine the combo value. Evaluate as **triplet**: main + 【心逐神随】 + aux 2.

**Aux 2 pairings (at 悟2, $E[\text{心逐神随}] = 3.40$):**

| # | Aux 2 | Type | Combined | Zone | Condition |
|:--|:------|:-----|:---------|:-----|:----------|
| 1 | 【灵犀九重】 | Source (crit) | **×10.95** | Crit (empty) | None — strongest unconditional |
| 2 | 【无相魔威】 | Source + conditional | ×6.97 / **×10.37** | Conditional | Peak requires anti-heal stacking on target |
| 3 | 【引灵摘魂】 | Conditional amplifier | **×6.94** | Conditional | Target has debuffs (near-universal in PvP) |
| 4 | 【乘胜逐北】 | Conditional amplifier | **×6.80** | Conditional | Target controlled |
| 5 | 【天命有归】 | Enabler + amplifier | **×6.00** | Enabler | Deterministic; enlightenment-invariant. 心逐 certain ×4 × 天命 own +50% dmg |
| 6 | 【摧云折月】 | Amplifier | ×5.27 / **×4.17** | ATK (crowded) | Standalone / under 仙佑 (+142.8% ATK) |
| 7 | 【破碎无双】 | Amplifier (triple) | **×5.17** | Triple (3 zones × +15%) | Marginal per zone |
| 8 | 【明王之路】 | Amplifier | **×5.10** | Final (empty) | Rare zone; high marginal value |
| 9 | 【神威冲云】 | Enabler + amplifier | **×4.62** × DR factor | DR bypass + Damage | ×9.24 at 50% DR; ×20.90 at 70% DR |
| 10 | 【通明】 | Source (crit) | **×4.34** | Crit (empty) | Dominated by 【灵犀九重】 |

> **Zone quality.** ATK-zone pairings (【摧云折月】, 【破碎无双】) degrade when the build includes ATK buffs (仙佑, 怒灵降世). Final-zone (【明王之路】) and crit-zone (【灵犀九重】) hold their value because those zones are typically empty. Conditional pairings (【引灵摘魂】, 【乘胜逐北】, 【无相魔威】) can match or exceed deterministic options but depend on game state.

> **#5 attribution.** The ×4.00 in 【天命有归】's combo belongs to 【心逐神随】 (made certain by 天命有归's `probability_to_certain`). The ×1.50 belongs to 【天命有归】's own `damage_increase` +50%. The enabler changes the other affix's behavior — it does not contribute ×4 itself.

### X2 all_state_duration

Sources: 【业焰】(universal, +69%) and 【真言不灭】(`疾风九变` exclusive, +55%). Extends ALL time-based states on same 灵書.

Value = the coverage gain across all time-based states on the same 灵書. Extending a state from 1-slot to 2-slot coverage doubles its effective contribution.

**State pairings:**

| State | Base duration | With 【业焰】(+69%) | With 【真言不灭】(+55%) | Coverage gain |
|:------|:-------------|:-------------------|:--------------------|:-------------|
| 仙佑 +142.8% ATK/DEF/HP | 12s (2 slots) | 20.3s (3 slots) | 18.6s (3 slots) | +1 slot |
| 命損 −100% DR | 8s (1 slot) | **13.5s (2 slots)** | **12.4s (2 slots)** | **+1 slot — doubles DR window** |
| 噬心 DoT 550%/tick | 8s | 13.5s | 12.4s | +5.5s / +4.4s of ticks |
| 怒灵降世 +20% ATK/DR | 7.5s (1 slot) | 12.7s (2 slots) | 11.6s (1–2 slots) | +1 slot |
| 天哀灵涸 −31% healing | 8s (1 slot) | 13.5s (2 slots) | 12.4s (2 slots) | +1 slot |
| 极怒 reflect 50% | 4s (<1 slot) | 6.8s (1 slot) | 6.2s (1 slot) | +0.5 slot |

> **Highest-value pairing:** 命損 8s → 13.5s doubles the DR removal window from 1 slot to 2 slots. The 仙佑 extension (12s → 20.3s) gains +1 slot but falls far short of 【仙露护元】's 48s — X2 does not substitute for S1 #7's dedicated buff duration chain.

### X3 ignore_damage_reduction

Source: 【神威冲云】(`通天剑诀` exclusive). All damage on same 灵書 bypasses opponent DR. Also provides `damage_increase` +36%. Monopoly node.

Value = main_output × 1.36 × $\frac{1}{1 - \text{DR}}$. Scales with opponent DR.

**DR-dependent multiplier:**

| Opponent DR | Without X3 | With X3 (full + 36%) | Effective multiplier |
|:-----------|:-----------|:---------------------|:--------------------|
| 30% | ×0.70 | ×1.36 | **×1.94** |
| 50% | ×0.50 | ×1.36 | **×2.72** |
| 70% | ×0.30 | ×1.36 | **×4.53** |
| 90% | ×0.10 | ×1.36 | **×13.60** |

> **Same-灵書 vs cross-灵書 DR removal.** X3 bypasses DR permanently for one 灵書. D4 (命損 −100% DR) removes DR for ALL 灵書 during its 8s window. X3 is a same-灵書 permanent; D4 is a cross-灵書 temporary. When both exist in the build, X3 is redundant during the 命損 window but valuable outside it.

## VII. Damage Amplifiers

| # | Node | Zone | Book Chains |
|:---|:---|:---|:---|
| A1 | `attack_bonus` | ATK | `any skill book`(【摧山】): +20%<br>`any 剑修 book`(【摧云折月】): +55%<br>`any 剑修 book`(【破碎无双】): +15% (also damage_increase +15%, crit_damage_bonus +15%)<br>`甲元仙符`(main: 仙佑): +70% via buff<br>`十方真魄`(main: 怒灵降世): +20% via buff |
| A2 | `damage_increase` | General | `通天剑诀`(【神威冲云】): +36%<br>`玉书天戈符`(【天人合一】): +5%<br>`any 法修 book`(【天命有归】): +50%<br>`any 体修 book`(【意坠深渊】): +50%<br>`any 剑修 book`(【破碎无双】): +15% |
| A3 | `skill_damage_increase` | Skill | `无极御剑诀`(【无极剑阵】): +555% / enemy −350% DR<br>`十方真魄`(【破釜沉舟】): +380% / self +50% damage taken<br>`any skill book`(【灵威】) → next slot's book: +118%<br>`新-青元剑诀`(【天威煌煌】) → next slot's book: +50% |
| A4 | `final_damage_bonus` | Final | `any 法修 book`(【明王之路】): +50% |
| A5 | `crit_damage_bonus` | Crit | `any 剑修 book`(【破碎无双】): +15% |
| A6 | `conditional_damage` | Conditional | See [A6 expanded](#a6-conditional-damage) |
| A7 | `conditional_buff` | Conditional (self-state) | `皓月剑诀`(【追神真诀】): enlightenment=10 → +50% HP dmg, +300% dmg<br>`惊蛰化龙`(【紫心真诀】): enlightenment → +50% lost_hp, +75% dmg |
| A8 | `per_hit_escalation` | Per-hit | `any skill book`(【破竹】): +1%/hit max 10%<br>`any 剑修 book`(【心火淬锋】): +5%/hit max 50%<br>`千锋聚灵剑`(primary 惊神剑光): +42.5%/hit skill_bonus |
| A9 | `periodic_escalation` | Per-N-hits | `念剑诀`(main: ×1.4 every 2 hits, max 10 stacks) |
| A10 | `conditional_crit_rate` | Crit rate | `any skill book`(【怒目】): +30% crit rate when target HP < 30% |

### A6 Conditional damage

| # | Book Chain | Condition |
|:---|:---|:---|
| 1 | `any skill book`(【击瑕】) + any CC source | +40% when target_controlled |
| 2 | `any skill book`(【怒目】) | +20% when target HP < 30% |
| 3 | `any 魔修 book`(【溃魂击瑕】) | +100% when target HP < 30% + guaranteed crit |
| 4 | `煞影千幻`(【乘胜逐北】) + any CC source | +100% when target_controlled |
| 5 | `天魔降临咒`(【引灵摘魂】) + `千锋聚灵剑`(【天哀灵涸】) | +104% when target has debuffs |
| 6 | `天魔降临咒`(【引灵摘魂】) + `甲元仙符`(【天倾灵枯】) | +104% when target has debuffs |
| 7 | `天魔降临咒`(【引灵摘魂】) + `大罗幻诀`(main: 罗天魔咒) | +104% when target has debuffs |
| 8 | `天魔降临咒`(【引灵摘魂】) + any debuff source | +104% when target has debuffs |
| 9 | `无相魔劫咒`(【无相魔威】) | +105% standalone |
| 10 | `无相魔劫咒`(【无相魔威】) + `千锋聚灵剑`(【天哀灵涸】) | +205% when target has no healing (anti-heal stacking) |
| 11 | `无相魔劫咒`(【无相魔威】) + `甲元仙符`(【天倾灵枯】) | +205% when target has no healing |

## VIII. Enablers

> Enablers produce a **resource** (certainty, HP loss, enlightenment) that another affix **consumes** to generate output. No intrinsic offensive value — combo-dependent, like cross-cutting amplifiers. Dual-nature enablers (【天命有归】, 【破釜沉舟】, 【意坠深渊】) also carry an intrinsic damage bonus, but their enabler function is the construction-relevant property.

| # | Node | Resource created | Combo targets |
|:---|:---|:---|:---|
| E1 | `probability_to_certain` | Certainty | See [E1 expanded](#e1-probability_to_certain) |
| E2 | `min_lost_hp_threshold` | HP loss floor (11%) | See [E2 expanded](#e2-min_lost_hp_threshold) |
| E3 | `enlightenment_bonus` | Enlightenment level (+1) | See [E3 expanded](#e3-enlightenment_bonus) |
| E4 | `self_hp_cost` | Direct HP loss (−10% per cast) | See [E4 expanded](#e4-self_hp_cost) |
| E5 | `self_damage_taken_increase` | Accelerated HP loss (+50% dmg taken) | See [E5 expanded](#e5-self_damage_taken_increase) |

### E1 probability_to_certain

Affix: 【天命有归】(Spell school, also `damage_increase` +50%)
Carrier: `any 法修 book` — `甲元仙符`, `浩然星灵诀`, `元磁神光`, `周天星元`, `星元化岳`, `玉书天戈符`, `九天真雷诀`

> **Uniqueness constraint:** each affix can only appear **once** across the entire 6-book set (`data/raw/构造规则.md` §核心冲突/副词缀冲突). 【天命有归】 goes on exactly one 法修 book — the choice of which book carries it determines which slot gets probability→certainty conversion. The +50% `damage_increase` also applies only to that one slot.

| # | Book Chain | What becomes certain | Combo output |
|:---|:---|:---|:---|
| 1 | `any 法修 book`(【天命有归】) + `解体化形`(【心逐神随】) | 心逐神随 probability → certain highest tier | 心逐 ×4 × 天命 own +50% = **×6.00** (deterministic) |
| 2 | `周天星元`(【天命有归】 + 【奇能诡道】) | 奇能诡道 20% extra stacks → 100% | **5× debuff stack rate** (no extra slot cost) |
| 3 | `any 法修 book`(【天命有归】) + `大罗幻诀`(main: 罗天魔咒) | 罗天魔咒 30% counter-debuff → 100% | **3.33× trigger rate** + 天命 own +50% dmg |
| 4 | `any 法修 book`(【天命有归】) + `any skill book`(【怒目】) | 怒目 +30% crit rate → +100% below 30% HP | **Guaranteed execute crit** + 天命 own +50% dmg |

> **Dead edges pruned:** 【天命有归】 + 【通明】, 【天命有归】 + 【灵犀九重】, and 【天命有归】 + 【福荫】 are technically valid graph connections but never worth selecting under uniqueness. Both crit affixes are already strong without certainty — the marginal gain (~23%) never justifies spending the one-time 【天命有归】. The graph must distinguish **transformative** edges (20%/30% → 100% on a gated effect) from **marginal** edges (25% → 100% on an already-good effect).

### E2 min_lost_hp_threshold

Affix: 【意坠深渊】(Body school, also `damage_increase` +50%)
Carrier: `any 体修 book` — `十方真魄`, `疾风九变`, `玄煞灵影诀`, `惊蛰化龙`, `煞影千幻`, `九重天凤诀`, `天煞破虚诀`

| # | Book Chain | What is enabled |
|:---|:---|:---|
| 1 | `any 体修 book`(【意坠深渊】) + `玄煞灵影诀`(【怒血战意】) | Floor 11% for per_self_lost_hp (+2%/1%) — guarantees +22% minimum |
| 2 | `any 体修 book`(【意坠深渊】) + `any skill book`(【战意】) | Floor 11% for per_self_lost_hp (+0.5%/1%) — guarantees +5.5% minimum |
| 3 | `any 体修 book`(【意坠深渊】) + `十方真魄`(【破釜沉舟】) | Floor + accelerated HP loss — controlled self-damage |

### E3 enlightenment_bonus

Affix: 【天人合一】(exclusive to `玉书天戈符`, also `damage_increase` +5%)
Carrier: `玉书天戈符` only — but placed on OTHER books to raise their enlightenment

| # | Book Chain | What is unlocked |
|:---|:---|:---|
| 1 | `玉书天戈符`(【天人合一】) placed on `解体化形` | 【心逐神随】 probability thresholds shift (悟0→悟1: 11/31/51% → 35/55/75%) |
| 2 | `玉书天戈符`(【天人合一】) placed on `皓月剑诀` | 【追神真诀】 approaches enlightenment=10 conditional_buff |
| 3 | `玉书天戈符`(【天人合一】) placed on `天剎真魔` | 【魔骨明心】 conditional_debuff unlocked/upgraded |
| 4 | `玉书天戈符`(【天人合一】) placed on `周天星元` | 【奇能诡道】 逆转阴阳 unlocked/upgraded |
| 5 | `玉书天戈符`(【天人合一】) placed on any book | +1 enlightenment level — value is whatever the next tier unlocks |

> Fully dynamic: the value of 【天人合一】 cannot be determined without knowing which book receives the enlightenment bonus and what that book's next tier provides.

### E4 self_hp_cost

Source: `十方真魄`(main: −10% current HP per cast) and `疾风九变`(main: −10% current HP per cast). The HP cost is a resource: it creates HP loss that `per_self_lost_hp` affixes convert to damage.

| # | Book Chain | Combo output |
|:---|:---|:---|
| 1 | `十方真魄`(main) + `玄煞灵影诀`(【怒血战意】) | −10% HP → +20% damage via per_self_lost_hp (+2%/1%). Repeats each cast. |
| 2 | `疾风九变`(main) + `玄煞灵影诀`(【怒血战意】) | Same: −10% HP → +20% damage per cast |
| 3 | `十方真魄`(main) + `any skill book`(【战意】) | −10% HP → +5% damage via per_self_lost_hp (+0.5%/1%) |

> E4 is a **cross-灵書 enabler**: the HP loss persists on self. The main skill costs HP; any other 灵書 carrying 【怒血战意】 reads the cumulative loss. Unlike same-灵書 enablers, E4 does not need to be on the same 灵書 as the exploit — it just needs to fire before it.

### E5 self_damage_taken_increase

Source: 【破釜沉舟】(`十方真魄` exclusive, also `skill_damage_increase` +380%). Self takes +50% more damage from opponent — accelerates HP loss, feeding `per_self_lost_hp` chains.

| # | Book Chain | Combo output |
|:---|:---|:---|
| 1 | `十方真魄`(【破釜沉舟】) + `玄煞灵影诀`(【怒血战意】) | Take +50% more → lose HP ~50% faster → per_self_lost_hp scales ~50% faster |
| 2 | `十方真魄`(【破釜沉舟】) + `any 体修 book`(【意坠深渊】) | Accelerated loss + 11% floor → controlled risk (lose fast but never below the floor's guarantee) |
| 3 | `十方真魄`(【破釜沉舟】) + `玄煞灵影诀`(【怒血战意】) + `any 体修 book`(【意坠深渊】) | Full HP exploitation chain: accelerate + exploit + floor |

> **Dual nature.** 【破釜沉舟】's +380% `skill_damage_increase` is intrinsic offense (also listed in A3). The +50% `self_damage_taken_increase` is the enabler function. In construction, the decision is which role matters more: if the build has 【怒血战意】, the enabler function adds value on top of the +380%; if not, it's pure cost. This parallels 【天命有归】's dual nature (+50% damage_increase + probability_to_certain).

---

## IX. Platform-Projected Paths

Given a platform choice, which paths are accessible and which require external providers? This is the "projected path" view — the combo search space for each platform.

### `千锋聚灵剑` + 惊神剑光

- **Platform provides:** T1
- **Named entities:** —
- **Accessible (free/T1):** O1, O2, O3, O4, O6, A1, A2, A3, A4, A5, A6, A8, X3
- **Inaccessible without provider:** O5 (T4), O12 (T9), O13 (T3∨T2∨T5), O14 (T2), B1 (T6), B3 (T5), B7 (T9), B11 (T3∧T2)
- **Unlockable by aux affixes:** 【天哀灵涸】 unlocks T2 → O14, A6#5; 【玄心剑魄】 unlocks T4 → O5

### `春黎剑阵` + 幻象剑灵

- **Platform provides:** T1
- **Named entities:** —
- **Accessible:** O1, O3, O4, O8, A1, A2, A3, A4, A5, A6, A8, X3
- **Inaccessible without provider:** O5 (T4), O12 (T9), O13 (T3∨T2∨T5), O14 (T2), B1 (T6), B3 (T5), B7 (T9)
- **Key exclusive:** 【玄心剑魄】 (`provides=T4`) unlocks the entire DoT chain (O5, O11)

### `皓月剑诀` + 碎魂剑意

- **Platform provides:** T1, T3, T4
- **Named entities:** 寂灭剑心
- **Accessible:** O1, O2, O3, O4, O5, O6, O11, A1–A8, X2, X3, S1
- **Inaccessible without provider:** O12 (T9), O13 (needs T2∨T5 beyond T3), O14 (T2), B1 (T6), B3 (T5), B7 (T9)
- **Key operators:** DoT amplifiers (【古魔之魂】, 【天魔真解】, 【鬼印】) all active due to T4

### `念剑诀` + 雷阵剑影

- **Platform provides:** T1, T4
- **Named entities:** —
- **Accessible:** O1, O3, O4, O5, V2, A1–A8, X2, X3
- **Inaccessible without provider:** O12 (T9), O13 (T3∨T2∨T5), O14 (T2), B1 (T6), B3 (T5), B7 (T9), S1 (T3)
- **Key feature:** V2 (untargetable 4s) is unique to this platform

### `甲元仙符` + 天光虹露

- **Platform provides:** T1, T3, T6
- **Named entities:** 仙佑
- **Accessible:** O1, O3, O4, B1, B2, B5, S1, S4, V5, A1–A6, X2
- **Inaccessible without provider:** O5 (T4), O12 (T9), O14 (T2), B3 (T5), B7 (T9)
- **Key operators:** 【龙象护身】 amplifies 仙佑 (T3 satisfied); 【仙露护元】 extends 仙佑; healing chain (T6) enables 【长生天则】, 【瑶光却邪】

### `大罗幻诀` + 魔魂咒界

- **Platform provides:** T1, T2, T4, T7, T8
- **Named entities:** 罗天魔咒
- **Accessible:** O1, O3, O4, O5, O14, B6, B9, D1–D7, A1–A6, X2
- **Inaccessible without provider:** O12 (T9), B1 (T6), B3 (T5), B7 (T9), S1 (T3)
- **Key operators:** 【古魔之魂】 + 【天魔真解】 amplify DoTs (T4); 【引灵摘魂】 (T2 satisfied); 【天命有归】 converts 罗天魔咒 30% → 100% (T8 satisfied); 【心魔惑言】 doubles debuff stacks (T2 satisfied)

### `无相魔劫咒` + 灭劫魔威

- **Platform provides:** T1, T2, T7
- **Named entities:** 无相魔劫
- **Accessible:** O1, O3, O4, O7, D1, D5, A1–A6, X2
- **Inaccessible without provider:** O5 (T4), O12 (T9), B1 (T6), B3 (T5), B7 (T9), S1 (T3)
- **Key operators:** 【无相魔威】 provides T2 (anti-heal debuff); 【引灵摘魂】 consumes T2 (conditional damage); anti-heal stacking with 【天哀灵涸】/【天倾灵枯】 pushes 【无相魔威】 to +205%

### `十方真魄` + 星猿弃天

- **Platform provides:** T1, T3, T6, T9
- **Named entities:** 怒灵降世
- **Accessible:** O1, O3, O4, O12, B1, B7, B8, V1, V4, V5, S1, A1–A6, X2, E2, E4, E5
- **Inaccessible without provider:** O5 (T4), B3 (T5), B4 (T5), O14 (T2 — needs external debuff stacks)
- **Key operators:** 【怒血战意】 (`requires=T9`, satisfied: +2%/1% HP lost), 【意坠深渊】 (`provides=T9`, floor 11%), 【破釜沉舟】 (`provides=T9`, accelerator +50% damage taken)

### `疾风九变` + 星猿复灵

- **Platform provides:** T1, T3, T6, T9
- **Named entities:** 极怒
- **Accessible:** O1, O3, O4, O10, B1, B7, B8, B10, V1, V5, S1, A1–A6, X2, E2, E4, E5
- **Inaccessible without provider:** O5 (T4), B3 (T5), B4 (T5), O14 (T2)
- **Key operators:** 【破釜沉舟】 feeds 极怒 input ① (self_damage_taken_increase → more received damage → more reflected), 【怒血战意】/【战意】 exploit 极怒 input ② (per_self_lost_hp from T9), 【仙灵汲元】 creates healing sustain alongside 星猿复灵's lifesteal

---

## X. Structural Properties

### Bottleneck paths

Paths with exactly **1 affix source**. The entire chain dies without this affix.

| Path | Sole source | Implication |
|:---|:---|:---|
| B2 Healing → Damage | `any 魔修 book`(【瑶光却邪】) | Non-Demon builds cannot access this bridge |
| B4 Shield → Damage | `九重天凤诀`(【玉石俱焚】) | Shield-to-damage cycle requires this specific book |
| B11 Self buff → Opponent debuff | `周天星元`(【奇能诡道】) | Buff-to-debuff bridge requires this book + enlightenment |
| X1 `probability_multiplier` | `解体化形`(【心逐神随】) | The most powerful cross-cutting amplifier has no substitute |
| X3 `ignore_damage_reduction` | `通天剑诀`(【神威冲云】) | Full DR bypass is exclusive to one book |
| A4 `final_damage_bonus` | `any 法修 book`(【明王之路】) | Non-Spell builds cannot access the final multiplier zone |
| A5 `crit_damage_bonus` | `any 剑修 book`(【破碎无双】) | Dedicated crit damage amplification has one source |
| A9 `periodic_escalation` | `念剑诀`(main) | This escalation type is locked to one book's main skill |
| A10 `conditional_crit_rate` | `any skill book`(【怒目】) | Only source — but universal, so always accessible |
| O13 State-trigger damage | `九天真雷诀`(【九雷真解】) | State-trigger damage requires this specific book |
| O14 True damage (stacks) | `惊蛰化龙`(【紫心真诀】) | The only true-damage path in the game |
| S4 Conditional heal buff | `天剎真魔`(【魔骨明心】) | Debuff-gated healing has one source |
| V2 Untargetable | `念剑诀`(main) | Invulnerability locked to one book |
| V4 Cleanse | `十方真魄`(primary 星猿弃天) | CC cleanse locked to one book |

### Monopoly nodes

Affixes that are the **only provider** of a critical graph node. If you want the path, the book choice is forced.

| Affix | Node | Forced book |
|:---|:---|:---|
| 【心逐神随】 | `probability_multiplier` | `解体化形` |
| 【神威冲云】 | `ignore_damage_reduction` | `通天剑诀` |
| 【明王之路】 | `final_damage_bonus` | `any 法修 book` (school forced, not book) |
| 【玉石俱焚】 | `on_shield_expire` | `九重天凤诀` |
| 【九雷真解】 | `on_buff_debuff_shield_trigger` | `九天真雷诀` |
| 【紫心真诀】 | `per_debuff_stack_true_damage` | `惊蛰化龙` |

### Rich paths

Paths with the **most book chain options** — the most construction flexibility.

| Path | Chain count | Span |
|:---|:---|:---|
| A6 `conditional_damage` | 11 chains | 4 conditions × 6 affixes across 3 schools |
| O5 DoT chain | 12 chains | 4 source books × 4 amplifier affixes |
| S1 Direct self-buff | 10 chains | 3 source books × 4 amplifier affixes |
| B7 Own HP loss → Damage | 7 chains | 2 source affixes × 3 enabler/accelerator books |
| E1 `probability_to_certain` | 7 chains | 1 affix connects to 7 distinct targets |
| D5 Anti-heal | 3 sources + stacking | 3 competing sources across Sword/Spell/Demon |

### Competing affixes

Affixes with **identical port signatures** — direct substitutes in the same chain role.

| Role | Competitors | Strongest |
|:---|:---|:---|
| Crit source | `any 剑修 book`(【灵犀九重】) vs `any skill book`(【通明】) | 【灵犀九重】(2.5× stronger) |
| Flat extra damage | `any 体修 book`(【破灭天光】) vs `any skill book`(【斩岳】) | 【破灭天光】(+25%) |
| Damage reduction | `any 体修 book`(【金刚护体】) vs `any skill book`(【金汤】) | 【金刚护体】(5.5×) |
| Shield strength | `any 体修 book`(【青云灵盾】) vs `any skill book`(【灵盾】) | 【青云灵盾】(2.5×) |
| Per-enemy HP loss | `any 体修 book`(【贪狼吞星】) vs `any skill book`(【吞海】) | 【贪狼吞星】(2.5×) |
| Per-self HP loss | `玄煞灵影诀`(【怒血战意】) vs `any skill book`(【战意】) | 【怒血战意】(4×) |
| Per-hit escalation | `any 剑修 book`(【心火淬锋】) vs `any skill book`(【破竹】) | 【心火淬锋】(5×) |
| All-state duration | `any skill book`(【业焰】) vs `疾风九变`(【真言不灭】) | 【业焰】(universal, always accessible) |
| Buff strength | `浩然星灵诀`(【龙象护身】) vs `any skill book`(【清灵】) | 【龙象护身】(5×) |
| Next-skill buff | `any skill book`(【灵威】) vs `新-青元剑诀`(【天威煌煌】) | 【灵威】(2.4×, universal) |
| Lifesteal | `疾风九变`(primary 星猿复灵) vs `星元化岳`(【仙灵汲元】) | 星猿复灵 (1.5×, but locked to `疾风九变`) |
| Random buff | `any 法修 book`(【景星天佑】) vs `any skill book`(【福荫】) | 【景星天佑】(2.75×) |

> **Pattern:** Body school dominates the "strictly better universal" category — 5 of 12 competing pairs have the Body version as strongest. Sword school dominates crit and escalation. The universal version exists as a weaker fallback for other schools.

> All 61 affixes and all 9 detailed skill books appear in at least one chain. The 19 exclusive-affix-only books are covered through their exclusive affixes.

### Provides bottlenecks

Target categories with **few providers** — if the sole provider is excluded, all dependents die.

| Target | Exclusive providers | Platform providers | Bottleneck? |
|:---|:---|:---|:---|
| T4 (持续伤害) | 【玄心剑魄】 (sole aux provider) | `皓月剑诀`, `念剑诀`, `大罗幻诀` | Yes — outside these 3 platforms, only 【玄心剑魄】 enables DoT amplifiers |
| T5 (护盾) | 【玄女护心】 (sole aux provider) | — (no platform provides T5) | **Severe** — ALL shield-dependent affixes (【灵盾】, 【青云灵盾】, 【玉石俱焚】) need this one Demon school affix |
| T6 (治疗效果) | 【仙灵汲元】, 【魔骨明心】 (2 providers) | `甲元仙符`, `十方真魄`, `疾风九变` | Moderate — 3 platforms provide T6 directly, 2 aux affixes can add it |
| T8 (概率触发) | — | `大罗幻诀` (sole platform) | Yes — 大罗幻诀 is the only platform with probability-gated mechanics |
| T9 (已损气血) | 【破釜沉舟】, 【意坠深渊】 (2 aux providers) | `十方真魄`, `疾风九变` | Moderate — 2 platforms + 2 aux providers |
| T10 (控制效果) | — (no affix provides T10) | — (no platform provides T10) | **External** — CC comes from external sources (PvP opponent, game mechanics), not from the affix system |

### Provides richness

Target categories with **many providers** — maximum construction flexibility.

| Target | Provider count | Providers |
|:---|:---|:---|
| T2 (减益效果) | 5 exclusive + 1 school + 1 conditional | 【天哀灵涸】, 【天倾灵枯】, 【无相魔威】, 【奇能诡道】, 【魔骨明心】 (exclusive); 【祸星无妄】 (school); 大罗幻诀/无相魔劫咒 (platform) |
| T3 (增益效果) | 2 universal + platform | 【福荫】, 【景星天佑】 (aux); `甲元仙符`, `十方真魄`, `疾风九变`, `皓月剑诀` (platform) |

### Named entity monopolies

Named entities that are the **sole bridge** to specific paths.

| Named entity | Unique bridge | Implication |
|:---|:---|:---|
| 极怒 | Only `counter_buff` source → O10 + B10 | Counter-reflect damage path requires `疾风九变` platform |
| 罗天魔咒 | Only `counter_debuff` source → B9 | Counter-debuff stacking path requires `大罗幻诀` platform |
| 无相魔劫 | Only `delayed_burst` source → O7 | Delayed burst path requires `无相魔劫咒` platform |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-27 | Initial: complete path catalog with affix and skill book mappings for all 59 paths |
| 2.0 | 2026-02-27 | Restructured: projected from graph space to book space. Replaced split Affixes/Skill Books columns with unified Book Chains using `book`(【affix】) + `book`(【affix】) format. Added expanded sub-sections for complex paths (O5, O13, O14, B7, B9, S1, A6, E1, E2, E3). Fixed E1 to list 法修 carrier books and all connection targets. |
| 3.0 | 2026-02-27 | Combo evaluation: added convention note. Added X1/X2/X3 expanded pairing tables (cross-cutting amplifiers). Added combo output column to E1 (enablers). Zone quality and attribution notes. |
| 4.0 | 2026-02-27 | Merged §VIII Enablers + §IX Resource Generators into unified §VIII Enablers. R1/R2 → E4/E5 with combo output tables. Enabler category: produces resource consumed by another affix. Renumbered §X → §IX. |
| 5.0 | 2026-03-05 | Add `requires` column to all path tables (§I, §II). Add §IX Platform-Projected Paths (9 platforms with accessible/inaccessible paths). Extend §X Structural Properties with provides bottlenecks, provides richness, and named entity monopolies. Renumbered §IX → §X. |
