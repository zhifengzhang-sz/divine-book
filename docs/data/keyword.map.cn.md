---
initial date: 2026-2-24
dates of modification: [2026-2-24, 2026-2-25]
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

# 关键词 → 效果类型 映射

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Language decoder.** Maps Chinese keyword patterns in [about.md](../../data/raw/about.md) to effect type names and field structures. Contains no numeric instances — purely a parsing specification.

**数据源**：`data/raw/about.md`（唯一数据源）

**约定**：
- `{x}`, `{y}`, `{z}`, `{w}` = 数值变量
- `{n}` = 计数变量
- `{d}`, `{t}` = 时间变量（秒）
- `{p}` = 概率变量
- `{m}` = 上限/倍率变量
- `[name]` = 状态/词缀名称
- `[stat]` = 属性名
- `[condition]` = 条件表达式
- `(...)` = 可选文字（如 `共(计)` 表示"计"可有可无）
- about.md 中的反引号使用不一致，匹配时应忽略
- 单条词缀文本可能包含多个效果类型（复合模式），解析时应拆分为独立效果

**单位定义**（`字段 → 单位` 列中使用的单位标识符）：

| 单位 | 含义 | 示例值 |
|:---|:---|:---|
| `%atk` | 攻击力百分比 | 1500, 20265 |
| `%stat` | 通用属性百分比（修饰具体属性） | 15, 104 |
| `%max_hp` | 最大气血值百分比 | 12, 2.1 |
| `%lost_hp` | 已损失气血值百分比 | 16, 7 |
| `%current_hp` | 当前气血值百分比 | 10, 7 |
| `seconds` | 时间（秒） | 4, 8, 12 |
| `count` | 整数计数 | 1, 5, 10 |
| `probability` | 概率百分比（0–100） | 11, 25, 30 |
| `multiplier` | 乘法倍率 | 1.2, 1.4, 4 |
| `bool` | 布尔值（true/false） | true, false |
| `string` | 文本标识符 | 灵涸, healing_received |
| `list` | 子对象列表 | — |

**符号约定**：减益（debuff）中降低属性的 `value` 使用负数。`value=-31` 表示"降低31%"。正值 = 增益/提升，负值 = 减益/降低。

---

## 零、共有功能（四修为通用）

about.md 中剑修/法修/魔修/体修的「共有功能」均使用以下关键词模式：

| 效果类型 | 中文关键词模式 | 字段 → 单位 | 备注 |
|:---|:---|:---|:---|
| `fusion_flat_damage` | `第{n}重：本神通增加{x}%攻击力的伤害` | `fusion_level`→count, `value`→%atk | 四修为结构相同 |
| `mastery_extra_damage` | `化境（融合{n}重）：本神通对目标额外造成{x}%攻击力的伤害` | `fusion_level`→count, `value`→%atk | 四修为结构相同 |
| `enlightenment_damage` | `每次融合使本神通增加{x}%攻击力的悟境伤害` | `value`→%atk | 法修数值异于其他三修 |
| `cooldown` | `施法间隙：{x}秒` | `value`→seconds | 四修为相同 |

---

## 一、基础伤害类

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `base_attack` | `{n}段共(计){x}%攻击力的灵法伤害` | `hits`→count, `total`→%atk |
| `base_attack`（单段变体） | `造成{x}%攻击力的灵法伤害`（无段数修饰） | `total`→%atk |
| `percent_max_hp_damage` | `每段攻击造成目标{x}%最大气血值的伤害（对怪物伤害不超过自身{z}%攻击力）` | `value`→%max_hp, `cap_vs_monster`→%atk |
| `shield_destroy_damage` | `湮灭敌方{n}个护盾，并额外造成{x}%敌方最大气血值的伤害（对怪物最多造成{y}%攻击力的伤害）；对无盾目标造成双倍伤害（对怪物最多造成{z}%攻击力的伤害）` | `shields_per_hit`→count, `percent_max_hp`→%max_hp, `cap_vs_monster`→%atk, `no_shield_double_cap`→%atk |

> **模式说明**：
> - `共计` 与 `共`（无"计"）在 about.md 中均出现，解析时应视为等价
> - 甲元仙符主技能无段数修饰，仅写 `造成{x}%攻击力的灵法伤害`（单段变体）

---

## 二、伤害乘区类

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `attack_bonus` | `提升{x}%攻击力的效果` | `value`→%stat |
| `damage_increase` | `造成的伤害提升{x}%` / `伤害提升{x}%` / `提升{x}%伤害` | `value`→%stat |
| `skill_damage_increase` | `提升{x}%神通伤害` / `{x}%的神通伤害加深` | `value`→%stat |
| `enemy_skill_damage_reduction` | `目标对本神通提升{x}%神通伤害减免` | `value`→%stat |
| `final_damage_bonus` | `最终伤害加深提升{x}%` | `value`→%stat |
| `crit_damage_bonus` | `暴击伤害提升{x}%` / `致命伤害提升{x}%` | `value`→%stat |
| `flat_extra_damage` | `(额外)造成{x}%攻击力的伤害`（作为整体附加，非逐段） | `value`→%atk |

> **乘区层级**（从奇能诡道描述推断）：
> - `伤害加深类` = { `神通伤害加深`, `技能伤害加深`, `最终伤害加深` }
> - `神通伤害加深` → `skill_damage_increase`
> - `最终伤害加深` → `final_damage_bonus`
> - 裸 `伤害` / `造成的伤害` → `damage_increase`

---

## 三、暴击系统

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `guaranteed_crit` | `必定会心造成{x}倍伤害，并有{p}%概率将之提升至{y}倍` | `base_mult`→multiplier, `enhanced_mult`→multiplier, `enhanced_chance`→probability |
| `probability_multiplier` | `{p1}%概率提升{m1}倍，{p2}%概率提升{m2}倍，{p3}%概率提升{m3}倍` | `tiers`→list of {`prob`→probability, `mult`→multiplier} |
| `conditional_crit` | `若敌方[condition]...必定暴击` | `condition`→string |
| `conditional_crit_rate` | `暴击率提升{x}%`（出现在条件句内） | `value`→probability, `condition`→string |

> **⚠ 推断标记**：`probability_multiplier`（心逐神随）about.md 仅列出三档概率合计不足 100%，隐含的第四档（剩余概率 → 1× 倍率）未在原文中明确声明。

---

## 四、条件触发类

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `conditional_damage` | `若敌方[condition]，则使本次伤害提升{x}%` / `攻击带有[state]的敌方时，(会使本次)伤害提升{x}%` / `伤害提升{x}%，若[condition]，(伤害提升效果)进一步提升至{y}%` | `value`→%stat, `condition`→string, `escalated_value`→%stat(可选) |
| `conditional_buff` | `在神通悟境(的条件下)：本神通附加[stat]的伤害提高{x}%，并(且/使)造成的伤害提升{y}%` | `condition`→string, variable stat fields→%stat (见下方列表) |
| `probability_to_certain` | `概率触发效果提升为必定触发` | *(无字段)* |
| `ignore_damage_reduction` | `无视敌方所有伤害减免效果` | *(无字段)* |

> **`conditional_buff` 可变属性字段**（对应 `[stat]的伤害提高{x}%` 中的具体属性）：
> - `附加目标最大气血的伤害提高` → `percent_max_hp_increase`
> - `附加自身已损气血的伤害提高` → `percent_lost_hp_increase`
> - `造成的伤害提升` → `damage_increase`

---

## 五、逐段递增类

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `per_hit_escalation` | `每造成1段伤害，剩余段数[stat]提升{x}%，最多提升{m}%` / `每段攻击造成伤害后，下一段提升{x}%[stat]` | `value`→%stat, `stat`→string, `max`→%stat(可选) |
| `periodic_escalation` | `每造成{n}次伤害时，(接下来的/剩余)伤害提升{m}倍，(单次伤害)至多被该效果重复加成{s}次` | `every_n_hits`→count, `multiplier`→multiplier, `max_stacks`→count |

> **`stat` 字段值**：
> - `damage` — 段数伤害（对应「伤害提升」）
> - `skill_bonus` — 神通加成（对应「神通加成」）

---

## 六、气血计算类

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `per_self_lost_hp` | `自身每多损失1%最大气血值，会使本次伤害提升{x}%` | `per_percent`→%stat |
| `per_enemy_lost_hp` | `敌方每多损失1%最大(值)气血值，会使本次伤害提升{x}%` | `per_percent`→%stat |
| `min_lost_hp_threshold` | `(根据自身已损气血值计算伤害时)至少按已损{x}%计算` | `value`→%lost_hp |
| `self_hp_cost` | `消耗自身{x}%当前气血值` | `value`→%current_hp |
| `self_lost_hp_damage` | `额外对其造成自身{x}%已损失气血值的伤害` | `value`→%lost_hp, `on_last_hit`→bool(可选), `heal_equal`→bool(可选) |
| `self_damage_taken_increase` | `施放期间自身受到的伤害(也)提升{x}%` | `value`→%stat |

> **修饰关键词**：
> - `等额恢复自身气血` → 附加 `heal_equal: true`
> - `在神通的最后` → 附加 `on_last_hit: true`

---

## 七、治疗与生存类

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `lifesteal` | `{x}%的吸血效果` / `恢复...造成伤害{x}%的气血值` | `value`→%stat |
| `healing_to_damage` | `造成治疗效果时，会对敌方额外造成治疗量{x}%的伤害` | `value`→%stat |
| `healing_increase` | `(所有)治疗效果提升{x}%` / `提升自身{x}%的治疗量` | `value`→%stat |
| `self_damage_reduction_during_cast` | `(会在)施放期间提升自身{x}%的伤害减免` | `value`→%stat |

---

## 八、护盾系统

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `shield_strength` | `护盾值提升{x}%` | `value`→%stat |
| `on_shield_expire` | `护盾消失时，会对敌方额外造成护盾值{x}%的伤害` | `damage_percent_of_shield`→%stat |
| `damage_to_shield` | `获得1个本次神通伤害值的{x}%的护盾，护盾持续{d}秒` | `value`→%stat, `duration`→seconds |

---

## 九、状态修饰类

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `buff_strength` | `增益效果强度提升{x}%` | `value`→%stat |
| `debuff_strength` | `减益效果强度提升{x}%` | `value`→%stat |
| `buff_duration` | `增益(状态)持续时间延长{x}%` | `value`→%stat |
| `all_state_duration` | `所有状态(效果)持续时间延长{x}%` | `value`→%stat |
| `buff_stack_increase` | `增益状态层数增加{x}%` | `value`→%stat |
| `debuff_stack_increase` | `减益状态层数增加{x}%` | `value`→%stat |
| `debuff_stack_chance` | `有{x}%概率额外多附加1层该减益状态` | `value`→probability |

---

## 十、持续伤害类 (DoT)

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `dot` | `每{t}秒(造成/受到){x}%攻击力的伤害，持续{d}秒` / `每{t}秒额外造成目标{x}%[hp_type]的伤害，持续{d}秒` | `tick_interval`→seconds, `duration`→seconds, `damage_per_tick`→%atk / `percent_current_hp`→%current_hp / `percent_lost_hp`→%lost_hp |
| `shield_destroy_dot` | `每{t}秒对目标造成湮灭护盾的总个数*{x}%攻击力的伤害（若...敌方无护盾加持，则计算湮灭{n}个护盾）` | `tick_interval`→seconds, `per_shield_damage`→%atk, `no_shield_assumed`→count |
| `dot_extra_per_tick` | `持续伤害触发时，额外造成目标{x}%已损失气血值的伤害` | `value`→%lost_hp |
| `dot_damage_increase` | `持续伤害上升{x}%` / `持续伤害提升{x}%` | `value`→%stat |
| `dot_frequency_increase` | `持续伤害效果触发间隙缩短{x}%` | `value`→%stat |
| `extended_dot` | `技能结束后...额外持续存在{x}秒，每{t}秒造成一次伤害` | `extra_seconds`→seconds, `tick_interval`→seconds |
| `on_dispel` | `若被驱散，立即受到{x}%攻击力的伤害，并眩晕{d}秒` | `damage`→%atk, `stun`→seconds |

> **`[hp_type]` 字段值**：
> - `当前气血值` → `percent_current_hp`
> - `已损失气血值` → `percent_lost_hp`
>
> **⚠ 推断标记**：`shield_destroy_dot`（碎魂剑意）的公式结构——「湮灭护盾的总个数」如何跨 tick 累积、是否计入已消失的护盾——about.md 未给出精确定义。

---

## 十一、增益状态类 (Self Buff)

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `self_buff` | `获得[name](状态)，提升自身{x}%的[stats]，持续{d}秒` / `[name]上限{n}层，持续{d}秒` | `name`→string, `duration`→seconds, `max_stacks`→count(可选), `attack_bonus`→%stat, `defense_bonus`→%stat, `hp_bonus`→%stat, `damage_reduction`→%stat (各可选) |
| `self_buff_extend` | `延长{x}秒[name]持续时间` | `buff_name`→string, `value`→seconds |
| `self_buff_extra` | `[name]状态额外使自身获得{x}%[stat]` | `buff_name`→string, variable stat field→%stat |
| `counter_buff` | `每秒对目标反射自身所受到伤害值的{x}%与自身{y}%已损失气血值的伤害，持续{d}秒` | `name`→string, `duration`→seconds, `reflect_received_damage`→%stat, `reflect_percent_lost_hp`→%lost_hp |
| `next_skill_buff` | `(使)下一个施放的神通(释放时)额外获得{x}%的神通伤害加深` | `stat`→string, `value`→%stat |
| `enlightenment_bonus` | `悟境等级加{x}（最高不超过{m}级）` | `value`→count, `max`→count |

> **`self_buff` 属性关键词**：
> - `攻击力(加成)` → `attack_bonus`
> - `守御(加成)` → `defense_bonus`
> - `最大气血值` → `hp_bonus`
> - `伤害减免` → `damage_reduction`
> - `治疗(加成)` → `healing_bonus`

---

## 十二、减益状态类 (Debuff)

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `debuff` | `对敌方添加持续{d}秒的[name]：[stat]降低{x}%` | `name`→string, `target`→string, `value`→%stat, `duration`→seconds, `dispellable`→bool(可选) |
| `conditional_debuff` | `若敌方[condition]...[stat](降低/减少/增至){x}%` / `在神通悟境的条件下：...对目标施加[name]：[stat]减少{x}(倍/%)...` | `condition`→string, `name`→string(可选), `target`→string, `value`→%stat 或 multiplier, `duration`→seconds 或 `与触发的增益状态相同`(可选) |
| `cross_slot_debuff` | `受到攻击时，额外给目标附加[name]：[stat]减低{x}%，持续{d}秒` | `name`→string, `target`→string, `value`→%stat, `duration`→seconds, `trigger`→string |
| `counter_debuff` | `受到伤害时，各有{x}%概率对攻击方添加{n}层[name]...最多叠加{n}层...持续{d}秒` | `name`→string, `duration`→seconds, `on_attacked_chance`→probability, `max_stacks`→count, `effects`→list |
| `counter_debuff_upgrade` | `[原效果](状态下附加异常)概率提升至{x}%` | `on_attacked_chance`→probability |

> **`target` 字段值**（减益目标属性）：
> - `治疗量` → `healing_received`
> - `伤害减免` → `damage_reduction`
> - `最终伤害减免` → `final_damage_reduction`
>
> **`无法被驱散`** → `dispellable: false`
>
> **非数值 `duration`**：`与触发的增益状态相同` → `duration=same_as_trigger`

---

## 十三、特殊机制类

### 13.1 召唤与分身

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `summon` | `持续存在{d}秒的分身，继承自身{x}%的属性...分身受到的伤害为自身的{y}%` | `inherit_stats`→%stat, `duration`→seconds, `damage_taken_multiplier`→%stat |
| `summon_buff` | `分身受到伤害降低至自身的{x}%，造成的伤害增加{y}%` | `damage_taken_reduction_to`→%stat, `damage_increase`→%stat |

### 13.2 不可选中状态

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `untargetable_state` | `在{d}秒内不可被选中` | `duration`→seconds |

### 13.3 驱散与控制

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `periodic_dispel` | `每秒驱散敌方{n}个增益状态，持续{d}秒...每驱散一个状态(对敌方)造成本神通{x}%的灵法伤害，若无驱散状态(，则)造成双倍伤害` | `interval`→seconds, `duration`→seconds, `damage_percent_of_skill`→%stat, `no_buff_double`→bool |
| `periodic_cleanse` | `每秒有{x}%概率驱散自身所有控制状态，{d}秒内最多触发{n}次` | `chance`→probability, `interval`→seconds, `cooldown`→seconds, `max_triggers`→count |

### 13.4 延迟爆发

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `delayed_burst` | `施加[name]，持续{d}秒。期间敌方受到的神通伤害增加{y}%，(并且)时间结束时，对目标造成{z}%期间提升的伤害+{w}%攻击力的伤害` | `name`→string, `duration`→seconds, `damage_increase_during`→%stat, `burst_base`→%atk, `burst_accumulated_pct`→%stat |
| `delayed_burst_increase` | `[name]状态结束时的伤害提升{x}%` | `value`→%stat |

### 13.5 随机效果

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `random_buff` | `获得以下任意1个加成：[效果列表]` | `options`→list of {type, value} |
| `random_debuff` | `对敌方添加以下任意1个减益效果：[效果列表]` | `options`→list of {type, value} |

> **随机效果选项关键词**：
> - `攻击提升{x}%` → `attack_bonus`
> - `致命伤害提升{x}%` → `crit_damage_bonus`
> - `造成的伤害提升{x}%` → `damage_increase`
> - `攻击降低{x}%` → `attack_reduction`
> - `暴击率降低{x}%` → `crit_rate_reduction`
> - `暴击伤害降低{x}%` → `crit_damage_reduction`

### 13.6 叠层伤害

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `per_buff_stack_damage` | `(自身)每{n}层增益状态，提升{x}%伤害，最大提升{m}%` | `per_n_stacks`→count, `value`→%stat, `max`→%stat |
| `per_debuff_stack_damage` | `(敌方)每(有){n}层减益状态...伤害提升{x}%，最大(提升){m}%` | `per_n_stacks`→count, `value`→%stat, `max`→%stat, `dot_half`→bool(可选) |
| `per_debuff_stack_true_damage` | `目标每有1层减益状态...额外造成目标{x}%最大气血值的真实伤害，最多(造成){m}%最大气血值的真实伤害` | `per_stack`→%max_hp, `max`→%max_hp |

> **`dot_half`** 对应关键词：`持续伤害效果受一半伤害加成`

### 13.7 其他触发

| 效果类型 | 中文关键词模式 | 字段 → 单位 |
|:---|:---|:---|
| `on_buff_debuff_shield_trigger` | `每次施加增益/减益状态或添加护盾时，(引动真雷轰击敌方，)造成一次本神通{x}%的灵法伤害` | `damage_percent_of_skill`→%stat |
| `conditional_heal_buff` | `(命中时，)若敌方具有减益状态，则提升自身{x}%的治疗量，持续{d}秒` | `condition`→string, `value`→%stat, `duration`→seconds |

---

## 条件词汇表

`condition` 字段的中文 → 英文值映射：

| 中文关键词 | condition 值 |
|:---|:---|
| `敌方处于控制效果` / `敌方处于控制状态` | `target_controlled` |
| `敌方气血值低于{x}%` | `target_hp_below_{x}` |
| `(攻击)带有减益状态的敌方` / `敌方具有减益状态` | `target_has_debuff` |
| `目标不存在任何治疗状态` | `target_has_no_healing` |
| `在神通悟境(悟{n}境)的条件下` | `enlightenment_{n}` / `enlightenment_max` |

---

## 数据状态标注词汇表

当 about.md 中明确标注数值所属的养成阶段时，对应 `data_state` 字段：

| 中文标注 | data_state 值 |
|:---|:---|
| `悟10境`（默认最高） | *(省略，为默认值)* |
| `悟0境` / `没有悟境` / `数据为没有悟境的情况` | `enlightenment=0` |
| `悟{n}境`（n ≠ 10 且 n ≠ 0） | `enlightenment={n}` |
| `最高融合加成` / `受融合影响，数据为最高融合加成` | `max_fusion` |
| `融合{n}重` | `fusion={n}` |
| `此功能未解锁` / `此词缀未解锁` | `locked` |

> **默认值因修为而异**（about.md 原文）：
> - 剑修/魔修：`没有标识的数据为悟境最高加成` → 未标注值默认为最高悟境
> - 体修：`没有标识的数据为没有悟境的情况` → 未标注值默认为无悟境
> - 法修：仅声明 `数值受悟境影响`，无明确默认
> - 魔修额外声明：`主技能效果受悟境影响，也可能受修炼阶数影响`

---

## 未明确的底层公式

以下来自 about.md 的游戏机制层面，原文未给出精确公式，在建模中需作为假设处理：

1. **`神通加成`** — 惊神剑光中 `提升{x}%神通加成` 的具体计算方式不明。已映射为 `per_hit_escalation` 的 `stat: skill_bonus` 字段值，但 `skill_bonus` 如何折算为最终伤害的公式未知。

2. **`灵法伤害` 与 `灵法防御`** — `灵法伤害` 是所有神通的伤害类型标注。是否存在独立的 `灵法防御` 减伤属性未知。

3. **`守御` 属性** — 甲元仙符【仙佑】中提及 `守御加成`，映射为 `self_buff.defense_bonus`。具体减伤公式未知。

4. **乘区结算顺序** — `伤害加深` / `神通伤害加深` / `最终伤害加深` / `伤害减免` / `最终伤害减免` 各乘区之间的优先级和加/乘关系未知。

5. **碎魂剑意的 `湮灭护盾总个数` 累积规则** — 每 tick 的伤害 = 总个数 × {x}%攻击力，但 `总个数` 的累积方式（跨 tick 是否重置、无盾时按几个计算）仅有部分描述，完整公式不明。

6. **心逐神随的隐含第四档** — about.md 列出三档概率合计 93%，剩余 7% 的行为（推测为 1× 即无加成）未明确声明。

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-24 | Initial: keyword-to-effect-type mapping for all about.md patterns |
| 1.1 | 2026-02-25 | Added formatting (frontmatter, style, author, history) |
| 1.2 | 2026-02-25 | Added unit definitions table; renamed to keyword.map.cn.md |
| 1.3 | 2026-02-25 | Added `conditional_buff` canonical field names; added `on_last_hit`/`heal_equal` to `self_lost_hp_damage` fields; added `same_as_trigger` duration value |
