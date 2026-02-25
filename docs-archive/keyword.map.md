---
initial date: 2026-2-23
dates of modification: [2026-2-23, 2026-2-24]
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

# Keyword → Effect Type: Complete Mapping

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **This is the single authoritative spec** for the 灵书 embedding pipeline. It bridges Chinese game text (input) to typed effect parameters (output). `effect.types.md` is a derived output-side reference; for any conflict, this document governs.

**Purpose:** Precise mapping from every Chinese keyword pattern in [灵书数据全览.md](./灵书数据全览.md) to the exact effect type name in [effect.ts](../lib/schemas/effect.ts). This is the Rosetta Stone between the game's Chinese descriptions and the code-side model parameters.

**Sources:**
- Chinese keywords: [灵书数据全览.md](./灵书数据全览.md)
- Effect types: [effect.ts](../lib/schemas/effect.ts) (69 types, with enum validation)
- Verified instances: [effects.yaml](../data/yaml/effects.yaml)

**Conventions:**
- `{x}` = numeric variable
- `[name]` = state/affix name
- `[stat]` = attribute name
- Backticks in [灵书数据全览.md](./灵书数据全览.md) are used inconsistently — match by content, not by backtick presence
- Field markers: **(R)** = Required, **(O)** = Optional

---

## 0. Unit Definitions

| unit tag | meaning |
|:---|:---|
| `%atk` | percentage of player's 攻击力 stat |
| `%max_hp` | percentage of target's maximum HP |
| `%current_hp` | percentage of target's current HP |
| `%lost_hp` | percentage of target's lost HP (max − current) |
| `%stat` | percentage modifier on a stat or effect (dimensionless multiplier) |
| `seconds` | time in seconds |
| `count` | integer count (hits, stacks, levels) |
| `multiplier` | direct damage multiplier (e.g. 1.2×) |
| `probability` | percentage chance (0–100) |
| `bool` | true / false |
| `string` | name or identifier |
| `list` | list of sub-objects |

> **Section A** (instant effects): Active only at cast time. No `duration` field.
> **Section B** (duration-based effects): Create an active window in the combat timeline. `duration` (seconds) is always required.
> Every effect type is classified as exactly one section. Types marked *(Section B)* in the tables below require `duration`.

---

## 1. Base Damage

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `base_attack` | `{n}段共计{x}%攻击力的灵法伤害` | `hits`→count(R), `duration_per_hit`→seconds(R)(=1), `total`→%atk(R) | 千锋聚灵剑(6/20265), 春黎剑阵(5/22305), 大罗幻诀(5/20265) |
| `percent_max_hp_damage` | `每段攻击造成目标{x}%最大气血值的伤害（对怪物伤害不超过自身{z}%攻击力）` | `value`→%max_hp(R), `hits`→count(R), `duration_per_hit`→seconds(R)(=1), `cap_vs_monster`→%atk(R) | 千锋聚灵剑(27/6/cap5400) |
| `shield_destroy_damage` | `湮灭敌方1个护盾，并额外造成{x}%敌方最大气血值的伤害（对怪物最多造成{y}%攻击力的伤害）；对无盾目标造成双倍伤害（对怪物最多造成{z}%攻击力的伤害）` | `percent_max_hp`→%max_hp(R), `hits`→count(R), `duration_per_hit`→seconds(R)(=1), `cap_vs_monster`→%atk(R), `no_shield_double_cap`→%atk(R) | 皓月剑诀(12/10/2400/4800) |

---

## 2. Damage Multiplier Zones

These correspond to independent multiplicative zones in the damage formula.

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `attack_bonus` | `提升{x}%攻击力的效果` | `value`→%stat(R) | 摧山(20), 摧云折月(55), 破碎无双(15) |
| `damage_increase` | `造成的伤害提升{x}%` / `伤害提升{x}%` / `提升{x}%伤害` | `value`→%stat(R) | 天命有归(50), 神威冲云(36), 天人合一(5), 意坠深渊(50), 无相魔威(105) |
| `skill_damage_increase` | `提升{x}%神通伤害` | `value`→%stat(R) | 无极剑阵(555), 破釜沉舟(380) |
| `enemy_skill_damage_reduction` | `目标对本神通提升{x}%神通伤害减免` | `value`→%stat(R) | 无极剑阵(350) |
| `final_damage_bonus` | `最终伤害加深提升{x}%` | `value`→%stat(R) | 明王之路(50) |
| `crit_damage_bonus` | `暴击伤害提升{x}%` / `致命伤害提升{x}%` | `value`→%stat(R) | 破碎无双(15) |
| `flat_extra_damage` | `额外造成{x}%攻击力的伤害` (lump-sum, not per-hit) | `value`→%atk(R) | 斩岳(2000), 破灭天光(2500) |

> **Multiplier zone hierarchy** (inferred from 奇能诡道 description in [灵书数据全览.md](./灵书数据全览.md)):
> - `伤害加深类` (damage-deepen category) = { `神通伤害加深`, `技能伤害加深`, `最终伤害加深` }
> - `神通伤害加深` / `技能伤害加深` → `skill_damage_increase`
> - `最终伤害加深` → `final_damage_bonus`
> - Bare `伤害` / `造成的伤害` → `damage_increase`

---

## 3. Crit System

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `guaranteed_crit` | `必定会心造成{x}倍伤害，并有{p}%概率将之提升至{y}倍` | `base_mult`→multiplier(R), `enhanced_mult`→multiplier(R), `enhanced_chance`→probability(R) | 通明(1.2/1.5/25%), 灵犀九重(2.97/3.97/25%) |
| `probability_multiplier` | `{p1}%概率提升{m1}倍，{p2}%概率提升{m2}倍...` | `tiers`→list(R) of {`prob`→probability, `mult`→multiplier} | 心逐神随(11%→4x, 31%→3x, 51%→2x, 7%→1x) |
| `conditional_crit` | `若敌方[condition]...必定暴击` | `condition`→enum(R) | 溃魂击瑕(target_hp_below_30) |
| `conditional_crit_rate` | `若敌方[condition]...暴击率提升{x}%` | `value`→probability(R), `condition`→enum(R) | 怒目(30%, target_hp_below_30) |

---

## 4. Conditional Triggers

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `conditional_damage` | `若敌方[condition]，则使本次伤害提升{x}%` / `攻击带有[state]的敌方时，伤害提升{x}%` | `value`→%stat(R), `condition`→enum(R) | 击瑕(40/target_controlled), 怒目(20/target_hp_below_30), 引灵摘魂(104/target_has_debuff), 乘胜逐北(100/target_controlled), 溃魂击瑕(100/target_hp_below_30), 无相魔威(+100/target_has_no_healing) |
| `conditional_buff` | `在神通悟境的条件下：本神通附加[stat]的伤害提高{x}%，并且造成的伤害提升{y}%` | `condition`→enum(R), variable stat fields→%stat(R) | 追神真诀(enlightenment_10: percent_max_hp_increase=50, damage_increase=300), 紫心真诀(enlightenment_max: percent_lost_hp_increase=50, damage_increase=75) |
| `probability_to_certain` | `概率触发效果提升为必定触发` | *(no fields)* | 天命有归 |
| `ignore_damage_reduction` | `无视敌方所有伤害减免效果` | *(no fields)* | 神威冲云 |

> **Condition vocabulary** (legal values for `condition` field):
>
> | Chinese | condition value |
> |:---|:---|
> | 敌方处于控制效果/控制状态 | `target_controlled` |
> | 敌方气血值低于30% | `target_hp_below_30` |
> | 带有/具有减益状态 | `target_has_debuff` |
> | 不存在任何治疗状态 | `target_has_no_healing` |
> | 敌方有护盾 | `target_has_shield` |
> | 在神通悟境(悟10境)的条件下 | `enlightenment_max` / `enlightenment_10` |

---

## 5. Per-Hit Escalation

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `per_hit_escalation` | `每造成1段伤害，剩余段数[stat]提升{x}%，最多提升{m}%` / `每段攻击造成伤害后，下一段提升{x}%[stat]` | `value`→%stat(R), `stat`→enum(R), `max`→%stat(O) | 破竹(1/damage/max10), 心火淬锋(5/damage/max50), 惊神剑光(42.5/skill_bonus) |
| `periodic_escalation` | `每造成{n}次伤害时，剩余伤害提升{m}倍，至多被该效果重复加成{s}次` | `every_n_hits`→count(R), `multiplier`→multiplier(R), `max_stacks`→count(R) | 念剑诀(2/1.4x/max10) |

> **`stat` field values:**
> - `damage` — hit damage (破竹, 心火淬锋)
> - `skill_bonus` — skill bonus (惊神剑光)

---

## 6. HP-Based Calculations

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `per_self_lost_hp` | `自身每多损失1%最大气血值，会使本次伤害提升{x}%` | `per_percent`→%stat(R), `min_threshold`→%lost_hp(O) | 战意(0.5), 怒血战意(2) |
| `per_enemy_lost_hp` | `敌方每多损失1%最大气血值，会使本次伤害提升{x}%` | `per_percent`→%stat(R) | 吞海(0.4), 贪狼吞星(1) |
| `min_lost_hp_threshold` | `至少按已损{x}%计算` | `value`→%lost_hp(R) | 意坠深渊(11) |
| `self_hp_cost` | `消耗自身{x}%当前气血值` | `value`→%current_hp(R) | 十方真魄(10), 疾风九变(10) |
| `self_lost_hp_damage` | `额外对其造成自身{x}%已损失气血值的伤害` | `value`→%lost_hp(R), `on_last_hit`→bool(O), `heal_equal`→bool(O) | 十方真魄(16, on_last_hit, heal_equal) |
| `self_damage_taken_increase` | `施放期间自身受到的伤害也提升{x}%` | `value`→%stat(R) | 破釜沉舟(50) |

> `等额恢复自身气血` → `heal_equal: true` (on `self_lost_hp_damage`)
> `在神通的最后` → `on_last_hit: true`

---

## 7. Healing & Survival

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `lifesteal` | `{x}%的吸血效果` / `恢复...造成伤害{x}%的气血值` | `value`→%stat(R) | 仙灵汲元(55), 星猿复灵(82) |
| `healing_to_damage` | `造成治疗效果时，会对敌方额外造成治疗量{x}%的伤害` | `value`→%stat(R) | 瑶光却邪(50) |
| `healing_increase` | `治疗效果提升{x}%` | `value`→%stat(R) | 长生天则(50) |
| `self_damage_reduction_during_cast` | `施放期间提升自身{x}%的伤害减免` | `value`→%stat(R) | 金汤(10), 金刚护体(55) |

---

## 8. Shield System

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `shield_strength` | `护盾值提升{x}%` | `value`→%stat(R) | 灵盾(20), 青云灵盾(50) |
| `on_shield_expire` | `护盾消失时，会对敌方额外造成护盾值{x}%的伤害` | `damage_percent_of_shield`→%stat(R) | 玉石俱焚(100) |
| `damage_to_shield` | `获得1个本次神通伤害值的{x}%的护盾，护盾持续{d}秒` | `value`→%stat(R), `duration`→seconds(R) | 玄女护心(50, 8s) |

---

## 9. State Modifiers

These modify the properties of buffs/debuffs/DoTs created by the skill.

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `buff_strength` | `增益效果强度提升{x}%` | `value`→%stat(R) | 清灵(20), 龙象护身(104) |
| `debuff_strength` | `减益效果强度提升{x}%` | `value`→%stat(R) | 咒书(20) |
| `buff_duration` | `增益状态持续时间延长{x}%` | `value`→%stat(R) | 仙露护元(300) |
| `all_state_duration` | `所有状态(效果)持续时间延长{x}%` | `value`→%stat(R) | 业焰(69), 真言不灭(55) |
| `buff_stack_increase` | `增益状态层数增加{x}%` | `value`→%stat(R) | 真极穿空(100) |
| `debuff_stack_increase` | `减益状态层数增加{x}%` | `value`→%stat(R) | 心魔惑言(100) |
| `debuff_stack_chance` | `有{x}%概率额外多附加1层该减益状态` | `value`→probability(R) | 奇能诡道(20) |

---

## 10. Damage Over Time (DoT)

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `dot` *(Section B)* | `每{t}秒(造成/受到){x}%攻击力的伤害，持续{d}秒` / `每{t}秒额外造成目标{x}%[hp_type]的伤害，持续{d}秒` | `duration`→seconds(R), `tick_interval`→seconds(R), `damage_per_tick`→%atk(O), `percent_current_hp`→%current_hp(O), `percent_lost_hp`→%lost_hp(O), `name`→string(O), `max_stacks`→count(O), `on_dispel`→object(O) | 噬心(550%atk/1s/8s), 碎魂剑意(1200%atk/0.5s/4s), 噬心魔咒(7%current_hp/0.5s/4s), 断魂之咒(7%lost_hp/0.5s/4s) |
| `dot_extra_per_tick` | `持续伤害触发时，额外造成目标{x}%已损失气血值的伤害` | `value`→%lost_hp(R) | 鬼印(2), 追神真诀(26.5) |
| `dot_damage_increase` | `持续伤害上升{x}%` / `持续伤害提升{x}%` | `value`→%stat(R) | 古魔之魂(104) |
| `dot_frequency_increase` | `持续伤害效果触发间隙缩短{x}%` | `value`→%stat(R) | 天魔真解(50.5) |
| `extended_dot` | `技能结束后...额外持续存在{x}秒，每{t}秒造成一次伤害` | `extra_seconds`→seconds(R), `tick_interval`→seconds(R) | 雷阵剑影(6.5s/0.5s) |

> **`on_dispel`** (triggered on dispel): `若被驱散，立即受到{x}%攻击力的伤害，并眩晕{d}秒`
> - `on_dispel.damage`→%atk, `on_dispel.stun`→seconds
> - Instance: 噬心(damage=3300, stun=2)

---

## 11. Self Buffs

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `self_buff` *(Section B)* | `获得[name]状态，提升自身{x}%的[stats]，持续{d}秒` | `name`→string(R), `duration`→seconds(R), `attack_bonus`→%stat(O), `defense_bonus`→%stat(O), `hp_bonus`→%stat(O), `damage_reduction`→%stat(O) | 仙佑(atk/def/hp+70%, 12s), 怒灵降世(atk+20%/dmg_red+20%, 4s) |
| `self_buff_extend` | `延长{x}秒[name]持续时间` | `buff_name`→string(R), `value`→seconds(R) | 星猿弃天(怒灵降世+3.5s) |
| `self_buff_extra` | `[name]状态额外使自身获得{x}%[stat]` | `buff_name`→string(R), variable stat field→%stat(R) | 天光虹露(仙佑, healing_bonus=190) |
| `counter_buff` *(Section B)* | `每秒对目标反射自身所受到伤害值的{x}%与自身{y}%已损失气血值的伤害，持续{d}秒` | `name`→string(R), `duration`→seconds(R), `reflect_received_damage`→%stat(O), `reflect_percent_lost_hp`→%lost_hp(O) | 极怒(50%/15%/4s) |
| `next_skill_buff` | `下一个施放的神通额外获得{x}%的[stat]` | `stat`→enum(R), `value`→%stat(R) | 灵威(skill_damage_bonus=118), 天威煌煌(skill_damage_bonus=50) |
| `enlightenment_bonus` | `悟境等级加{x}（最高不超过{m}级）` | `value`→count(R), `max`→count(R) | 天人合一(+1, max3) |

> **`next_skill_buff` `stat` field values:**
> - `skill_damage_bonus` — maps from Chinese `神通伤害加深`

---

## 12. Debuffs

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `debuff` *(Section B)* | `对敌方添加持续{d}秒的[name]：[stat]降低{x}%` | `name`→string(O), `target`→enum(R), `value`→%stat(R), `duration`→seconds(R), `dispellable`→bool(O) | 灵涸(healing_received/-31/8s/undispellable), 灵枯(healing_received/-31/20s), 魔劫(healing_received/-40.8/8s) |
| `conditional_debuff` *(Section B)* | `若敌方[condition]...[stat]减少{x}%，持续{d}秒` / `在神通悟境的条件下：...对目标施加[name]：[stat]减少{x}%` | `condition`→enum(R), `name`→string(O), `target`→enum(R), `value`→%stat(R), `duration`→seconds(O), `per_hit`→bool(O) | 天倾灵枯(target_hp_below_30/healing_received/-51/20s), 奇能诡道(enlightenment_max/逆转阴阳/damage_reduction/-60), 魔骨明心(enlightenment_max/final_damage_reduction/-20/1s/per_hit) |
| `cross_slot_debuff` *(Section B)* | `受到攻击时，额外给目标附加[name]：[stat]减低{x}%，持续{d}秒` | `name`→string(R), `target`→enum(R), `value`→%stat(R), `duration`→seconds(R), `trigger`→enum(R) | 命损(final_damage_reduction/-100/8s/on_attacked) |
| `counter_debuff` *(Section B)* | `受到伤害时，各有{x}%概率对攻击方添加...最多叠加{n}层...持续{d}秒` | `name`→string(R), `duration`→seconds(R), `on_attacked_chance`→probability(R), `effects`→list(R) of dot | 罗天魔咒(30%/8s, contains 噬心魔咒+断魂之咒) |
| `counter_debuff_upgrade` | `[original effect]概率提升至{x}%` | `on_attacked_chance`→probability(R) | 魔魂咒界(30%→60%) |

> **`target` field values** (debuff target attribute):
> - `healing_received` — healing amount (灵涸, 灵枯, 魔劫)
> - `damage_reduction` — damage reduction (逆转阴阳)
> - `final_damage_reduction` — final damage reduction (魔骨明心, 命损)

> `无法被驱散` → `dispellable: false`

---

## 13. Special Mechanics

### 13.1 Summon & Clone

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `summon` *(Section B)* | `持续存在{d}秒的分身，继承自身{x}%的属性` | `inherit_stats`→%stat(R), `duration`→seconds(R), `damage_taken_multiplier`→%stat(R) | 春黎剑阵(54%/16s/400% damage taken) |
| `summon_buff` | `分身受到伤害降低至自身的{x}%，造成的伤害增加{y}%` | `damage_taken_reduction_to`→%stat(R), `damage_increase`→%stat(R) | 幻象剑灵(120%/+200%) |

### 13.2 Dispel & Cleanse

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `periodic_dispel` *(Section B)* | `每秒驱散敌方{n}个增益状态，持续{d}秒，每次造成{x}%灵法伤害，若无驱散状态则造成双倍伤害` | `interval`→seconds(R), `duration`→seconds(R), `damage_percent_of_skill`→%stat(R), `no_buff_double`→bool(R) | 天煞破虚(1s/10s/25.5%/true) |
| `periodic_cleanse` | `每秒有{x}%概率驱散自身所有控制状态，{d}秒内最多触发{n}次` | `chance`→probability(R), `interval`→seconds(R), `cooldown`→seconds(R), `max_triggers`→count(R) | 星猿弃天(30%/1s/25s/1) |

### 13.3 Delayed Burst

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `delayed_burst` *(Section B)* | `施加[name]，持续{d}秒。期间受到的伤害增加{y}%，时间结束时造成{z}%累积伤害+{w}%攻击力的伤害` | `name`→string(R), `duration`→seconds(R), `damage_increase_during`→%stat(R), `burst_base`→%atk(R), `burst_accumulated_pct`→%stat(R) | 无相魔劫(12s/+10%/base5000/accum10%) |
| `delayed_burst_increase` | `[name]状态结束时的伤害提升{x}%` | `value`→%stat(R) | 灭劫魔威(65) |

### 13.4 Random Effects

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `random_buff` | `获得以下任意1个加成：[effect list]` | `options`→list(R) of {type, value} | 福荫(atk/crit_dmg/dmg 20% each), 景星天佑(atk/crit_dmg/dmg 55% each) |
| `random_debuff` | `对敌方添加以下任意1个减益效果：[effect list]` | `options`→list(R) of {type, value} | 祸星无妄(atk-20%/crit_rate-20%/crit_dmg-50%) |

### 13.5 Stack-Based Damage

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `per_buff_stack_damage` | `每{n}层增益状态，提升{x}%伤害，最大提升{m}%` | `per_n_stacks`→count(R), `value`→%stat(R), `max`→%stat(R) | 真极穿空(5/5.5%/max27.5) |
| `per_debuff_stack_damage` | `每{n}层减益状态...伤害提升{x}%，最大{m}%` | `per_n_stacks`→count(R), `value`→%stat(R), `max`→%stat(R), `dot_half`→bool(O) | 心魔惑言(5/5.5%/max27.5/dot_half) |
| `per_debuff_stack_true_damage` | `目标每有1层减益状态...额外造成目标{x}%最大气血值的真实伤害，最多{m}%` | `per_stack`→%max_hp(R), `max`→%max_hp(R) | 紫心真诀(2.1%/max21%) |

### 13.6 Other Triggers

| Effect Type | Chinese Pattern | Fields → Units | Instances |
|:---|:---|:---|:---|
| `on_buff_debuff_shield_trigger` | `每次施加增益/减益状态或添加护盾时，造成一次本神通{x}%的灵法伤害` | `damage_percent_of_skill`→%stat(R) | 九雷真解(50.8) |
| `conditional_heal_buff` *(Section B)* | `若敌方具有减益状态，则提升自身{x}%的治疗量，持续{d}秒` | `condition`→enum(R), `value`→%stat(R), `duration`→seconds(R) | 魔骨明心(target_has_debuff/90%/8s) |

---

## 14. `data_state` Mapping

Set `data_state` when [灵书数据全览.md](./灵书数据全览.md) explicitly qualifies a value to a specific cultivation stage.

| Chinese Qualifier | data_state Value | Instances |
|:---|:---|:---|
| `悟10境` (default max) | *(omit — default)* | Most affixes |
| `悟0境` / `没有悟境` | `no_enlightenment` | 无相魔劫咒 skill, 灭劫魔威, 十方真魄 skill, 星猿弃天, 疾风九变 skill, 星猿复灵 |
| `悟1境` | `enlightenment_1` | — |
| `悟3境` | `enlightenment_3` | — |
| `悟7境` | `enlightenment_7` | — |
| `悟8境` | `enlightenment_8` | 甲元仙符 skill, 天光虹露 |
| `最高融合加成` / `受融合影响` | `max_fusion` | 业焰, 灵威, 灵犀九重, 仙露护元 |
| `融合{N}重` | `fusion_N` | 破釜沉舟(fusion_54) |

---

## 15. Coverage

| Category | Type Count | Instances |
|:---|:---|:---|
| Base damage | 3 | 3 |
| Damage multiplier zones | 7 | 7 |
| Crit system | 4 | 4 |
| Conditional triggers | 4 | 4 |
| Per-hit escalation | 2 | 2 |
| HP-based calculations | 6 | 6 |
| Healing & survival | 4 | 4 |
| Shield system | 3 | 3 |
| State modifiers | 7 | 7 |
| DoT | 5 | 5 |
| Self buffs | 6 | 6 |
| Debuffs | 5 | 5 |
| Special mechanics | 13 | 13 |
| **Total** | **69** | **69** |

All 69 effect types mapped to Chinese keyword patterns.

---

## 16. Modeling Assumptions

The game publisher has not released official technical documentation on the damage calculation formula. The following 4 items are game-mechanics-level unknowns where [灵书数据全览.md](./灵书数据全览.md) does not provide exact formulas. Each is documented with analysis, the assumption adopted by this project, and its impact on the model.

No official source was found. Community guides focus on builds and recommendations, not formulas. The analysis below draws on general RPG design patterns and one official-account-published player guide.

### 16.1 `神通加成` (Skill Bonus)

- **Source:** 千锋聚灵剑【惊神剑光】— `每段攻击造成伤害后，下一段提升{x}%神通加成`
- **Problem:** [灵书数据全览.md](./灵书数据全览.md) does not specify whether `神通加成` belongs to the `攻击力提升` zone, the `伤害加深` zone, or is an independent multiplier.
- **Analysis:** Given the description `提升神通加成` (not `提升攻击力` or `提升伤害`), and that 千锋聚灵剑 is a multi-hit skill where this compounds per hit, it is likely an **independent multiplier on the skill's final damage**, distinct from base attack.
- **Assumption adopted:** Mapped as `per_hit_escalation` with `stat: skill_bonus`. Treated as an independent skill-level multiplier zone in the damage formula.

### 16.2 `灵法伤害` (Spell Damage Type)

- **Source:** All skill descriptions use `造成{x}%攻击力的灵法伤害` as the damage type label.
- **Problem:** [灵书数据全览.md](./灵书数据全览.md) does not state whether a corresponding `灵法防御` (spell defense) attribute exists to specifically reduce this damage type.
- **Analysis:** Most mobile RPGs use a simplified model without separate physical/spell defense. `灵法伤害` is likely just a flavor label, with damage reduction handled uniformly by `伤害减免`, `最终伤害减免`, and `守御`.
- **Assumption adopted:** `灵法伤害` is treated as generic skill damage. No separate `灵法防御` attribute is modeled. All reduction uses the unified `伤害减免` / `最终伤害减免` / `守御` stats.

### 16.3 `守御` (Defense)

- **Source:** 甲元仙符【仙佑】— `提升自身{y}%攻击力加成、守御加成、最大气血值`
- **Problem:** The exact damage reduction formula for `守御` is completely missing. This is the **largest obstacle** to building a precise numerical model.
- **Analysis:** Two common RPG models:
  1. **Subtractive defense:** `base_damage = attack × skill_coefficient − defense` (or a variant). Common in classic RPGs.
  2. **Percentage reduction:** `守御` directly provides a percentage of `伤害减免`.
- **Assumption adopted:** Mapped as `self_buff.defense_bonus` (%stat). The subtractive model is assumed as default. **Must be verified by in-game testing** — record the same skill's damage against targets with different `守御` values and reverse-engineer the formula.

### 16.4 Multiplier Zone Ordering

- **Source:** [灵书数据全览.md](./灵书数据全览.md) defines `神通伤害加深`, `最终伤害加深`, `伤害减免`, `最终伤害减免` as distinct concepts, but does not specify their interaction.
- **Problem:** The stacking rules (additive within zone? multiplicative across zones?) and the settlement order are unknown.
- **Analysis:**
  - **`最终` (final) prefixed** effects (明王之路's `最终伤害加深`, 命損's `最终伤害减免降低`) are likely **highest-priority independent zones** that apply at the end of the calculation chain, multiplicative with everything else.
  - **Non-`最终`** effects (灵威's `神通伤害加深`, 金汤's `伤害减免`) likely **add within the same zone**, then multiply with other zones.
- **Assumed settlement order:**

```
base_damage (attack × skill_coefficient)
  → subtract defense (守御)
  → × damage_increase zone (伤害加深 types, additive within)
  → × (1 − damage_reduction zone) (伤害减免, additive within)
  → × final zone (最终伤害加深 × (1 − 最终伤害减免))
  → × crit multiplier
```

### 16.5 How to Resolve These Unknowns

1. **In-game testing** (most reliable): Design controlled experiments — vary one stat at a time, record damage, reverse-engineer formulas.
2. **Community research**: Monitor TapTap forums and player communities for data-mined or tested results.
3. **Model sensitivity**: When unknowns affect optimization results, run the optimizer under both assumptions and flag cases where the recommendation changes.

---

## 17. Extraction Rules

When extracting from [灵书数据全览.md](./灵书数据全览.md) into [effects.yaml](../data/yaml/effects.yaml), follow these rules:

1. **Use only type strings from this document** (Sections 1–13). Never invent a new type.
2. **Match Chinese text to patterns** in Sections 1–13. Find the pattern whose Chinese template best matches the source text, then use that effect type.
3. **Resolve variables using highest cultivation stage** from [灵书数据全览.md](./灵书数据全览.md). If the source explicitly qualifies a lower stage, set `data_state` per Section 14.
4. Every field marked **(R)** must be present. Never omit a required field.
5. Every field must carry the correct unit as defined in Section 0.
6. Every Section B effect must have `duration`. Missing `duration` is an error.
7. Every `dot` must have both `duration` and `tick_interval`.
8. Normalize all `condition` values to the condition vocabulary in Section 4.
9. Normalize all `target` values to the target vocabulary in Section 12.
10. Normalize all enum fields (`stat`, `trigger`) to the vocabularies in Sections 5, 11, 12.
11. If a sub-effect only activates under a cultivation condition (在神通悟境的条件下), use `conditional_buff` or `conditional_debuff` with the appropriate condition.
12. Do not infer effects not stated. Do not add fields not in this vocabulary.
13. After extraction, verify: does every Section B effect have `duration`? Does every `dot` have `tick_interval`? Do all enum fields use legal values? If not, return to the source text.

---

## 18. Planned Expansion

This document currently maps Chinese patterns to effect types (Sections 1–17). Two additional columns are planned to make it the complete spec for the entire extraction-to-model pipeline.

### 18.1 Regex Column

Machine-readable regex for each Chinese pattern. Captures numeric variables and structural elements.

| Chinese Pattern | Regex |
|:---|:---|
| `{n}段共计{x}%攻击力的灵法伤害` | `(\d+)段共计([\d.]+)%攻击力的灵法伤害` |
| `提升{x}%攻击力的效果` | `提升([\d.]+)%攻击力的效果` |
| `造成的伤害提升{x}%` | `造成的伤害提升([\d.]+)%` |

With regex patterns, a deterministic parser can replace AI extraction: match normalized Chinese text against regex → extract capture groups → produce `Effect[]`.

### 18.2 Model Mapping Column

Which 20D model dimensions each effect type maps to, and how. Currently this mapping lives in `model-vector.ts` as switch cases.

| Effect Type | Model Mapping |
|:---|:---|
| `base_attack` | `BASE_DAMAGE += total`, `HIT_COUNT += hits` |
| `attack_bonus` | `ATK_MOD += value` |
| `damage_increase` | `DMG_MOD += value` |
| `dot` | `DOT += dps × duration` |

With all four columns (Chinese pattern, effect type, regex, model mapping), keyword.map.md becomes the complete specification for the entire pipeline from normalized Chinese text to model vectors. The `model-vector.ts` switch cases become derivable from this document.

**Status:** Planned. Not blocking current pipeline phases.

---

**Verification:** All instances in this document have corresponding entries in `data/effects.yaml`. Run `bun test`, in the root directory, to verify [effects.yaml](../data/yaml/effects.yaml) ↔ [灵书数据全览.md](./灵书数据全览.md) consistency. Schema enums in [effect.ts](../lib/schemas/effect.ts) enforce the `condition`, `target`, `stat`, and `trigger` vocabularies at parse time.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-23 | Initial: 69 effect types, 17 sections, extraction rules, modeling assumptions |
| 1.1 | 2026-02-23 | Added Section 18: Planned Expansion (regex + model mapping columns), formatting (frontmatter, author, history) |
| 1.2 | 2026-02-24 | change about.md to [灵书数据全览.md](./灵书数据全览.md), the normalized about.md |