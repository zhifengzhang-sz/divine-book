---
initial date: 2026-03-25
parent: workflow.md
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

# Effect Catalog — Grammar Rule to Handler Contract

Extracted from semantic files (the actual `{ type: "...", ... }` objects returned).
Cross-referenced against `lib/parser/grammars/schema/effects.ts` and raw data.

**Source of truth**: this document. Both `effects.ts` (the contract) and handlers must conform to it.

---

## Naming Convention

Effect type names follow Chinese game text conventions:

| Chinese term | Meaning | Suffix | Example |
|---|---|---|---|
| 加成 | buff (additive within zone) | `*_buff` | `damage_buff`, `attack_buff` |
| 加深 | multiplier (multiplicative, separate zone) | `*_multiplier` | `final_damage_multiplier` |
| 提升/提高/上升 | same as 加成 | `*_buff` | `healing_buff`, `crit_damage_buff` |

`effects.ts` is the source of truth for all type names. See `docs/parser/workflow.md` S1 for the data pipeline.

---

## Notation

- **V** = `string | number` (variable reference pre-resolution, number post-resolution)
- **lit** = literal value hardcoded in semantic action
- Fields marked with `?` are optional (only some books produce them)

---

## S1 Skill Effects -- Damage

### base_attack
All 28 books. "造成N段共x%攻击力的(灵法)伤害"
| Field | Type | Source |
|-------|------|--------|
| hits | number | cnNumber parsed |
| total | V | "x%" |

### percent_max_hp_damage
千锋聚灵剑, 皓月剑诀, 玉书天戈符, 天轮魔经. "V%最大气血值的伤害"
| Field | Type | Source |
|-------|------|--------|
| value | V | "y%" |
| cap_vs_monster? | V | "对怪物不超过z%攻击力" |
| per_hit? | boolean | 玉书天戈符: "每段伤害附加" |
| trigger? | string | 天轮魔经: "on_steal" |

### percent_current_hp_damage
无极御剑诀. "额外附加V%目标当前气血值的伤害"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |
| accumulation? | "cross_skill" | 无极御剑诀 |
| per_prior_hit? | boolean | 无极御剑诀 |

### self_lost_hp_damage
惊蜇化龙, 十方真魄, 煞影千幻, 九重天凤诀, 天煞破虚诀, 玄煞灵影诀. "自身V%已损失气血值的伤害"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |
| self_heal? | boolean | 十方真魄: "等额恢复自身气血" |
| per_hit? | boolean | 九重天凤诀, 天煞破虚诀 |
| tick_interval? | number | 玄煞灵影诀: per-second DoT variant |
| every_n_hits? | V | 玄煞灵影诀 affix |
| next_skill_hits? | V | 天煞破虚诀: affects next skill |

### shield_destroy_damage
皓月剑诀. "湮灭敌方N个护盾，并额外造成V%最大气血值的伤害"
| Field | Type | Source |
|-------|------|--------|
| shields_per_hit | V | "N个护盾" |
| percent_max_hp | V | "V%最大气血值" |
| cap_vs_monster? | V | "对怪物不超过..." |

### no_shield_double_damage
皓月剑诀. "对无盾目标造成双倍伤害"
| Field | Type | Source |
|-------|------|--------|
| cap_vs_monster? | V | "对怪物不超过..." |

### echo_damage
星元化岳. "伤害值为当次伤害的V%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "V%" |
| ignore_damage_bonus? | boolean | "该伤害不受伤害加成影响" |
| duration? | V | duration of echo state |

### heal_echo_damage
周天星元. "附加临摹期间所恢复气血值的等额伤害"
| Field | Type | Source |
|-------|------|--------|
| ratio | number | lit 1 |

### per_debuff_stack_damage
解体化形, 天魔降临咒, 天轮魔经. "每具有一个减益状态，伤害提升V%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "V%" |
| max | V | "最多V%" |
| per_n_stacks? | number | 天魔降临咒: per layer |
| parent? | string | state context |
| per_stack? | V | 天轮魔经 variant |

### per_debuff_stack_true_damage
惊蜇化龙. "每层...真实伤害"
| Field | Type | Source |
|-------|------|--------|
| per_stack | V | per stack damage |
| max | V | max stacks |

### periodic_escalation
念剑诀. "每造成N次伤害时，伤害提升V倍"
| Field | Type | Source |
|-------|------|--------|
| every_n_hits | V | "N次" |
| multiplier | V | "V倍" |
| max_stacks | V | max |

### delayed_burst
无相魔劫咒. Delayed state-end damage burst
| Field | Type | Source |
|-------|------|--------|
| name | V | state name |
| increase | V | damage increase during state |
| burst_damage | V | % of accumulated damage |
| burst_atk_damage | V | + % attack power |

### conditional_damage
九天真雷诀, 通天剑诀. Conditional bonus damage
| Field | Type | Source |
|-------|------|--------|
| value | V | "V%" |
| damage_base? | "self_max_hp" | 九天真雷诀 |
| per_hit? | boolean | 九天真雷诀 |
| condition | string | "cleanse_excess", "enemy_hp_loss" |
| per_step? | V | 通天剑诀: per % hp loss |

### flat_extra_damage
通用词缀 斩岳. "额外造成x%攻击力的伤害"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

---

## S2 Skill Effects -- Cost

### self_hp_cost
玄煞灵影诀, 煞影千幻, 十方真魄, 疾风九变, 九重天凤诀, 天煞破虚诀, 惊蜇化龙. "消耗V%当前气血值"
| Field | Type | Source |
|-------|------|--------|
| value | V | "V%" |
| tick_interval? | number | 玄煞灵影诀: per-second cost |
| per_hit? | boolean | 九重天凤诀: cost per hit |

---

## S3 Skill Effects -- DoT

### dot
春黎剑阵, 大罗幻诀, 梵圣真魔咒. Damage over time
| Field | Type | Source |
|-------|------|--------|
| state? | V | state name (春黎剑阵) |
| name? | string | state name (大罗幻诀) |
| tick_interval | V | seconds between ticks |
| damage_per_tick? | V | 春黎剑阵 |
| percent_current_hp? | V | 大罗幻诀, 梵圣真魔咒 |
| percent_lost_hp? | V | 大罗幻诀 variant |
| duration? | V | |
| trigger_stack? | V | 梵圣真魔咒 |
| source_state? | V | 梵圣真魔咒 |

---

## S4 Skill Effects -- Healing / Shield

### self_heal
周天星元. "恢复共V%最大气血值"
| Field | Type | Source |
|-------|------|--------|
| value? | V | total heal |
| per_tick? | V | per-second healing |
| total? | V | total over duration |
| tick_interval? | number | seconds between ticks |

### shield
煞影千幻, 周天星元. "添加V%最大气血值的护盾"
| Field | Type | Source |
|-------|------|--------|
| value | V | "V%" |
| duration? | V | |
| source? | "self_max_hp" | 周天星元 灵鹤 |
| trigger? | "per_tick" | 周天星元 灵鹤 |

---

## S5 Skill Effects -- Buff

### self_buff
Multiple books. Stat buff on self.
| Field | Type | Source |
|-------|------|--------|
| name? | string | state context |
| attack_buff? | V | 十方真魄, 甲元仙符 |
| damage_buff? | V | 元磁神光 |
| skill_damage_buff? | V | 惊蜇化龙 |
| final_damage_multiplier? | V | 浩然星灵诀 |
| damage_reduction? | V | 天魔降临咒, 十方真魄 |
| crit_rate? | V | 九重天凤诀 |
| healing_bonus? | V | 甲元仙符, 天刹真魔 |
| defense_bonus? | V | 甲元仙符 |
| hp_bonus? | V | 甲元仙符 |
| duration? | V | |
| max_stacks? | V | 元磁神光 |
| condition? | string | 天刹真魔: "enemy_has_debuff" |

---

## S6 Skill Effects -- Debuff

### debuff
新青元剑诀, 煞影千幻, 天魔降临咒, 天刹真魔, 无极御剑诀. Named debuff on target
| Field | Type | Source |
|-------|------|--------|
| name? | string | state name |
| target? | string | "skill_damage", "next_skill_cooldown", etc. |
| value? | V | |
| duration? | V | |
| sequenced? | boolean | 新青元剑诀 |
| trigger? | string | 天刹真魔: "on_hit" |
| heal_reduction? | V | 无相魔劫咒 |
| damage_buff? | V | 无相魔劫咒 |
| enhanced_damage_buff? | V | 无相魔劫咒 |

---

## S7 Skill Effects -- Complex / Multi-clause

### buff_steal
天轮魔经. "偷取目标N个增益状态"
| Field | Type | Source |
|-------|------|--------|
| value | V | "N个" |

### untargetable
念剑诀. "N秒内不可被选中"
| Field | Type | Source |
|-------|------|--------|
| value | V | "N秒" |

### counter_debuff
大罗幻诀. "受到伤害时，各有N%概率添加N层..."
| Field | Type | Source |
|-------|------|--------|
| trigger | string | "on_attacked" |
| chance | V | "N%" |
| count | V | "N层" |
| name | V | state name |
| states | V[] | child state names |

### counter_buff
天刹真魔, 疾风九变. "受到伤害时..."
| Field | Type | Source |
|-------|------|--------|
| trigger? | string | "on_attacked" |
| heal_on_damage_taken? | V | 天刹真魔 |
| no_healing_bonus? | boolean | 天刹真魔 |
| reflect_received_damage? | V | 疾风九变 |
| reflect_percent_lost_hp? | V | 疾风九变 |

### summon
春黎剑阵. "创建分身，继承V%属性"
| Field | Type | Source |
|-------|------|--------|
| inherit_stats | V | "V%" |
| duration? | V | |
| trigger? | "on_cast" | |
| damage_taken_multiplier? | V | |

### crit_damage_buff
通天剑诀. "暴击伤害提高V%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "V%" |

### self_damage_taken_increase
通天剑诀, 十方真魄. "自身受到伤害提高V%"
| Field | Type | Source |
|-------|------|--------|
| duration? | V | "N秒" (通天剑诀) |
| value | V | "V%" |

### self_cleanse
九天真雷诀. "驱散自身N个负面状态"
| Field | Type | Source |
|-------|------|--------|
| count | V | "N个" |

---

## S8 Skill Effects -- State References

### state_ref
Multiple books. "获得/添加 【name】"
| Field | Type | Source |
|-------|------|--------|
| state | V | state name |

### state_add
Multiple books. "添加N层 【name】"
| Field | Type | Source |
|-------|------|--------|
| state | V | state name |
| count? | V | "N层" |
| per_hit? | boolean | 梵圣真魔咒, 煞影千幻 |
| undispellable? | boolean | 煞影千幻 |

---

## S9 Common Affixes (通用词缀)

### debuff_strength
通用 咒书. "减益效果强度提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### buff_strength
通用 清灵. "增益效果强度提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### all_state_duration
通用 业焰, 疾风九变. "所有状态效果持续时间延长x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### conditional_damage_controlled
通用 击瑕, 煞影千幻. "若敌方处于控制效果，伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### per_hit_escalation
通用 破竹, 修为_剑修. Affix form: "每造成1段伤害，剩余段数伤害提升x%"
Also: 千锋聚灵剑 book form (different fields -- see note)
| Field | Type | Source |
|-------|------|--------|
| hits | V | "1段" |
| per_hit | V | "x%" |
| max | V | "y% maximum" |

> **Note**: 千锋聚灵剑 primary affix produces `per_hit_escalation` with different fields:
> `{ value, stat: "skill_bonus", parent: "this" }`. Same type string, incompatible fields.
> **Decision needed**: split into `per_hit_escalation` (book) vs `per_hit_escalation_affix`?
> Or keep one interface with all fields optional?

### damage_reduction_during_cast
通用 金汤, 修为_体修. "施放期间提升自身x%伤害减免"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### execute_conditional
通用 怒目, 修为_魔修. "若敌方气血值低于N%，伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| hp_threshold | V | "N%" |
| damage_buff | V | "x%" |
| crit_rate_increase? | V | 通用: "暴击率提升y%" |
| guaranteed_crit? | number | 修为_魔修: lit 1 |

### dot_extra_per_tick
通用 鬼印, 皓月剑诀 exclusive. "持续伤害触发时，额外造成x%已损失气血值的伤害"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### random_buff
通用 福荫, 修为_剑修, 修为_法修. "获得任意1个加成：攻击x%、致命伤害x%、伤害x%"
| Field | Type | Source |
|-------|------|--------|
| attack | V | all three options share same variable "x%" |

### per_self_lost_hp
通用 战意, 玄煞灵影诀 exclusive. "自身每多损失1%气血，伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### per_enemy_lost_hp
通用 吞海, 修为_体修. "敌方每多损失1%气血，伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| per_percent | V | "1%" (通用 lit "1", 体修 parameterized) |
| value | V | "x%" |

### shield_value_increase
通用 灵盾, 修为_体修. "护盾值提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### next_skill_buff
通用 灵威, 新青元剑诀. "下一个神通额外获得x%伤害加深"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### attack_buff
通用 摧山, 修为_剑修, 元磁神光 primary, 解体化形 primary. "攻击力提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |
| per_state_stack? | V | 元磁神光: per state stack |
| per_debuff_stack? | boolean | 解体化形: per debuff |
| max_stacks? | V | 解体化形 |
| timing? | string | 解体化形: "pre_cast" |

### guaranteed_crit
通用 通明, 修为_剑修. "必定会心造成x倍伤害"
| Field | Type | Source |
|-------|------|--------|
| base_multiplier | V | "x倍" |
| chance | V | "y%" |
| upgraded_multiplier | V | "z倍" |

---

## S10 School Affixes (修为词缀)

### triple_bonus
修为_剑修. "攻击力x%、伤害提升y%、致命伤害z%"
| Field | Type | Source |
|-------|------|--------|
| attack_buff | V | "x%" |
| damage_buff | V | "y%" |
| crit_damage_buff | V | "z%" |

### healing_buff
修为_法修. "治疗量提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### final_damage_multiplier
修为_法修. "最终伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### probability_to_certain
修为_法修. "概率类效果必定触发"
| Field | Type | Source |
|-------|------|--------|
| (no fields) | | |

### damage_buff
通天剑诀, 皓月剑诀, 玉书天戈符, 十方真魄, 惊蜇化龙, 修为_法修. "伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### healing_to_damage
修为_魔修. "治疗转化为伤害x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### damage_to_shield
修为_魔修. "伤害转化为护盾x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |
| duration | V | seconds |

### random_debuff
修为_魔修. "随机施加减益：攻击x%、暴击率y%、致命伤害z%"
| Field | Type | Source |
|-------|------|--------|
| attack | V | "x%" |
| crit_rate | V | "y%" |
| crit_damage | V | "z%" |

### min_lost_hp_threshold
修为_体修. "最低损失气血x%，伤害提升y%"
| Field | Type | Source |
|-------|------|--------|
| min_percent | V | "x%" |
| damage_buff | V | "y%" |

---

## S11 Per-book Primary Affixes (主词缀)

### summon_buff
春黎剑阵. "分身受到伤害降低，伤害提升"
| Field | Type | Source |
|-------|------|--------|
| damage_taken_reduction_to | V | |
| damage_buff | V | |

### shield_destroy_dot
皓月剑诀. "护盾销毁持续伤害"
| Field | Type | Source |
|-------|------|--------|
| state | V | state name |
| interval | V | tick interval |
| value | V | damage per tick |

### extended_dot
念剑诀. "持续伤害延长N秒"
| Field | Type | Source |
|-------|------|--------|
| extra_seconds | V | "N秒" |
| interval | V | tick interval |

### self_buff_extra
天刹真魔. "在状态下额外获得增益"
| Field | Type | Source |
|-------|------|--------|
| state | V | source state |
| target_state | V | target state to buff |
| crit_rate | V | "x%" |
| duration | V | seconds |

### self_buff_extend
十方真魄. "延长自身增益状态持续时间"
| Field | Type | Source |
|-------|------|--------|
| value | V | duration extension |
| state | V | state name |

### periodic_cleanse
十方真魄. "每N秒有x%概率净化"
| Field | Type | Source |
|-------|------|--------|
| chance | V | "x%" |
| target | string | state to cleanse |
| cooldown | V | "N秒" |
| max_times | V | max triggers |

### lifesteal_with_parent
疾风九变. "附带吸血效果"
| Field | Type | Source |
|-------|------|--------|
| state | V | parent state |
| value | V | lifesteal % |

### shield_strength
煞影千幻. "护盾强度提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### counter_debuff_upgrade
大罗幻诀. "反击减益升级"
| Field | Type | Source |
|-------|------|--------|
| state | V | state name |
| value | V | upgrade amount |

### dot_permanent_max_hp
天魔降临咒. "持续伤害为最大气血%"
| Field | Type | Source |
|-------|------|--------|
| state | V | state name |
| value | V | "x%" |

### per_debuff_damage_upgrade
天魔降临咒. "每层减益提升伤害"
| Field | Type | Source |
|-------|------|--------|
| state | V | state name |
| value | V | "x%" |

### per_stolen_buff_debuff
天轮魔经. "每偷取一个增益，施加减益"
| Field | Type | Source |
|-------|------|--------|
| state | V | state name |
| value | V | |
| duration | V | |

### delayed_burst_increase
无相魔劫咒. "延迟爆发伤害提升"
| Field | Type | Source |
|-------|------|--------|
| state | V | state name |
| value | V | "x%" |

### percent_max_hp_affix
惊蜇化龙. "最大气血%伤害（词缀版）"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |
| state | V | state context |
| trigger_stack | V | trigger stack count |

### conditional_hp_scaling
浩然星灵诀, 玉书天戈符. "气血阈值条件伤害缩放"
| Field | Type | Source |
|-------|------|--------|
| hp_threshold | V | threshold % |
| value | V | damage value |
| max? | V | 浩然星灵诀: cap |
| per_step? | V | 玉书天戈符: per step |

### per_buff_stack_damage
元磁神光. "每层增益状态提升伤害"
| Field | Type | Source |
|-------|------|--------|
| per_stack | V | per N stacks |
| value | V | damage % |
| max | V | cap |

### buff_stack_increase
元磁神光. "增益层数增加x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### debuff_stack_increase
天轮魔经. "减益层数增加x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### debuff_stack_chance
周天星元. "减益触发概率x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### buff_duration
念剑诀. "增益持续时间延长x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

---

## S12 Exclusive Affixes (专属词缀)

### heal_reduction
千锋聚灵剑, 甲元仙符. "治疗量降低x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |
| state | V | state name |
| duration | V | seconds |
| undispellable? | boolean | 千锋聚灵剑: true |
| enhanced_value? | V | 甲元仙符 |
| hp_threshold? | V | 甲元仙符 |

### lifesteal
星元化岳. "吸血x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### on_dispel
春黎剑阵. "驱散时造成伤害"
| Field | Type | Source |
|-------|------|--------|
| damage | V | "x%" |
| stun_duration | V | stun seconds |

### periodic_dispel
九重天凤诀, 天煞破虚诀. "定期驱散敌方增益"
| Field | Type | Source |
|-------|------|--------|
| count? | V | number to dispel |
| interval? | number | seconds between |
| duration? | V | total duration |
| damage_percent_of_skill? | V | 天煞破虚诀 |
| no_buff_double? | boolean | 天煞破虚诀 |

### on_shield_expire
九重天凤诀. "护盾到期时造成伤害"
| Field | Type | Source |
|-------|------|--------|
| value | V | damage % of shield |

### on_buff_debuff_shield
九天真雷诀. "增益/减益/护盾触发伤害"
| Field | Type | Source |
|-------|------|--------|
| trigger_kind | string | "增益/减益/护盾" |
| value | V | "x%" |

### probability_multiplier
解体化形. "概率倍增伤害"
| Field | Type | Source |
|-------|------|--------|
| chance_4x | V | 4x chance |
| chance_3x | V | 3x chance |
| chance_2x | V | 2x chance |

### dot_damage_buff
大罗幻诀. "持续伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### dot_frequency_increase
梵圣真魔咒. "持续伤害频率提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### conditional_damage_debuff
天魔降临咒. "有减益时伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### self_hp_floor
九重天凤诀. "气血不会低于x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### enlightenment_bonus
玉书天戈符. "悟境等级加1，伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### ignore_damage_reduction
通天剑诀. "无视伤害减免"
| Field | Type | Source |
|-------|------|--------|
| (no fields) | | |

### skill_damage_buff
无极御剑诀. "神通伤害提升x%"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |

### cross_slot_debuff
周天星元, 大罗幻诀. "跨神通位施加减益"
| Field | Type | Source |
|-------|------|--------|
| state? | V | 周天星元 variant |
| name? | V | 大罗幻诀 variant |
| target? | string | target stat |
| value | V | |
| duration? | V | |
| trigger? | string | 大罗幻诀 |

### chance
煞影千幻. "x%概率触发效果"
| Field | Type | Source |
|-------|------|--------|
| value | V | "x%" |
| effect | string | effect description |

---

## Known Issues

### Same type string, incompatible fields
- **`per_hit_escalation`**: Book form (千锋聚灵剑) has `{ value, stat, parent }`. Affix form (通用词缀) has `{ hits, per_hit, max }`. Zero field overlap.

### Handler type string mismatches (handler vs schema)
| Handler registers | Semantic produces | Action |
|-------------------|------------------|--------|
| `untargetable_state` | `untargetable` | handler changes |
| `on_buff_debuff_shield_trigger` | `on_buff_debuff_shield` | handler changes |
| `crit_damage_bonus` | `crit_damage_buff` | handler changes |

### Handler field name mismatches (handler reads vs semantic produces)
| Handler | Handler reads | Semantic produces | Action |
|---------|--------------|-------------------|--------|
| `buff_steal` | `count` | `value` | handler changes |
| `on_shield_expire` | `damage_percent_of_shield` | `value` | handler changes |
| `enlightenment_bonus` | `damage_buff` | `value` | handler changes |
| `periodic_cleanse` | `interval`, `max_triggers` | `cooldown`, `max_times` | handler changes |
| `random_buff` | `crit_damage`, `damage` | only `attack` | handler changes |
| `delayed_burst` | `burst_base` | `burst_damage` + `burst_atk_damage` | handler changes |
| `periodic_escalation` | `hits` | `every_n_hits` | handler changes |
| `periodic_escalation` | `max` | `max_stacks` | handler changes |
| `extended_dot` | `extra_seconds` matches | `extra_seconds` | OK (handler comment misleading) |

### Duplicate handler registration
- `enlightenment_bonus` registered in both `multiplier.ts:114` and `misc.ts:502`

### Total effect type count
~89 unique type strings across all semantic files.
