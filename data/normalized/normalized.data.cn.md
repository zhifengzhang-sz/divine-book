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

# 灵书数据标准化提取

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Structured intermediate.** This document is the normalized, code-parseable extraction of `data/raw/*.md`. Effect types and field names follow [keyword.map.cn.md](./keyword.map.cn.md). All numeric values are verbatim from about.md; no inference or interpolation.
>
> Pipeline role: `data/raw/*.md` (volatile Chinese prose) → [keyword.map.cn.md](./keyword.map.cn.md) + **normalized.data.cn.md** (strict tables) → code parser → downstream outputs

## 元信息

- **数据源**: `data/raw/*.md`（主书.md, 通用词缀.md, 修为词缀.md, 专属词缀.md）
- **效果类型词汇**: `data/keyword/keyword.map.cn.md`
- **范围**: 灵书效果（主技能、主词缀、专属词缀、通用词缀、修为词缀）
- **排除**: 共有功能（融合伤害、悟境伤害、施法间隙）— 功法书基础机制，不属于灵书效果
- **功法书数量**: 28 本（剑修 7、法修 7、魔修 7、体修 7）
- **详细数据**: 28 本（含主技能；其中 25 本含主词缀，3 本无主词缀：无极御剑诀、九天真雷诀、天煞破虚诀）
- **仅专属词缀**: 0 本

### data_state 默认值约定

| 修为 | 未标注数据的默认状态 | 原文 |
|:---|:---|:---|
| 剑修 | 悟境最高加成 | "没有标识的数据为悟境最高加成" |
| 法修 | 未明确声明 | "所有主词缀效果中的数值受悟境影响" |
| 魔修 | 悟境最高加成 | "没有标识的数据为悟境最高加成" |
| 体修 | 没有悟境 | "没有标识的数据为没有悟境的情况" |

### 字段格式约定

- `key=value` 键值对，逗号分隔
- `parent=X` 表示当前效果隶属于名为 X 的父效果/状态
- 空 `data_state` 列 = 该修为的默认状态
- `locked` = 功能/词缀未解锁

---

## 一、功法书

### `千锋聚灵剑` [剑修]

#### 主技能

> 原文: 剑破天地，对范围内目标造成六段共计x%攻击力的灵法伤害，并每段攻击造成目标y%最大气血值的伤害（对怪物伤害不超过自身z%攻击力）
> 悟0境：x=1500, y=11, z=2200
> 悟1境，融合20重：x=11265, y=15, z=3000
> 悟3境，融合32重：x=14865, y=19, z=3800
> 悟10境，融合51重：x=20265, y=27, z=5400

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=6, total=1500 | enlightenment=0 |
| percent_max_hp_damage | value=11, cap_vs_monster=2200 | enlightenment=0 |
| base_attack | hits=6, total=11265 | [enlightenment=1, fusion=20] |
| percent_max_hp_damage | value=15, cap_vs_monster=3000 | [enlightenment=1, fusion=20] |
| base_attack | hits=6, total=14865 | [enlightenment=3, fusion=32] |
| percent_max_hp_damage | value=19, cap_vs_monster=3800 | [enlightenment=3, fusion=32] |
| base_attack | hits=6, total=20265 | [enlightenment=10, fusion=51] |
| percent_max_hp_damage | value=27, cap_vs_monster=5400 | [enlightenment=10, fusion=51] |

#### 主词缀【惊神剑光】

> 原文: 本神通每段攻击造成伤害后，下一段提升x%神通加成
> 悟3境：x=25
> 悟10境：x=42.5

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| per_hit_escalation | value=25, stat=skill_bonus | enlightenment=3 |
| per_hit_escalation | value=42.5, stat=skill_bonus | |

#### 专属词缀【天哀灵涸】

> 原文: 本神通施放后，会对敌方添加持续8秒的【灵涸】：治疗量降低31%，且无法被驱散

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| debuff | name=灵涸, target=healing_received, value=-31, duration=8, dispellable=false | |

---

### `春黎剑阵` [剑修]

#### 主技能

> 原文: 剑化万千，破空位移向前，对范围内目标造成五段共计22305%攻击力的灵法伤害，并创建一个持续存在16秒的分身，继承自身54%的属性。主角释放神通后分身会攻击敌方，分身受到的伤害为自身的400%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=22305 | |
| summon | inherit_stats=54, duration=16, damage_taken_multiplier=400 | |

#### 主词缀【幻象剑灵】

> 原文: 分身受到伤害降低至自身的120%，造成的伤害增加200%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| summon_buff | damage_taken_reduction_to=120, damage_increase=200 | |

#### 专属词缀【玄心剑魄】

> 原文: 本神通施放后，会对敌方添加持续8秒的【噬心】：每秒受到550%攻击力的伤害，若被驱散，立即受到3300%攻击力的伤害，并眩晕2秒

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| dot | name=噬心, duration=8, tick_interval=1, damage_per_tick=550 | |
| on_dispel | damage=3300, stun=2, parent=噬心 | |

---

### `皓月剑诀` [剑修]

#### 主技能

> 原文: 剑墓既出，天地低昂，一剑出，诸天寂灭。对范围内目标造成十段共计22305%攻击力的灵法伤害，神通释放时自身获得增益状态【寂灭剑心】：每段伤害命中时湮灭敌方1个护盾，并额外造成12%敌方最大气血值的伤害（对怪物最多造成2400%攻击力的伤害）；对无盾目标造成双倍伤害（对怪物最多造成4800%攻击力的伤害）；【寂灭剑心】上限1层，持续4秒

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=10, total=22305 | |
| shield_destroy_damage | shields_per_hit=1, percent_max_hp=12, cap_vs_monster=2400, no_shield_double_cap=4800, name=寂灭剑心, duration=4, max_stacks=1 | |

#### 主词缀【碎魂剑意】

> 原文: 【寂灭剑心】每0.5秒对目标造成`湮灭护盾`的总个数\*600%攻击力的伤害（若触发`湮灭护盾`效果时敌方无护盾加持，则计算湮灭2个护盾）

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| shield_destroy_dot | tick_interval=0.5, per_shield_damage=600, no_shield_assumed=2, parent=寂灭剑心 | |

#### 专属词缀【追神真诀】

> 原文: 1. 本神通所添加的持续伤害触发时，额外造成目标26.5%已损失气血值的伤害
> 2. 在`神通悟境`（悟10境）的条件下：本神通附加目标最大气血的伤害提高50%，并且造成的伤害提升300%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| dot_extra_per_tick | value=26.5 | |
| conditional_buff | condition=enlightenment_10, percent_max_hp_increase=50, damage_increase=300 | |

---

### `念剑诀` [剑修]

#### 主技能

> 原文: 剑影无形，人剑合一，自身化为轰雷剑意，方寸之间位移数次，在4秒内不可被选中。同时降下轰雷剑阵，对范围内目标造成八段共计22305%攻击力的灵法伤害，轰雷剑阵每造成2次伤害时，剑阵接下来的伤害提升1.4倍，单次伤害至多被该效果重复加成10次

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| untargetable_state | duration=4 | |
| base_attack | hits=8, total=22305 | |
| periodic_escalation | every_n_hits=2, multiplier=1.4, max_stacks=10 | |

#### 主词缀【雷阵剑影】

> 原文: 技能结束后雷阵不会马上消失，将额外持续存在6.5秒，每0.5秒造成一次伤害

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| extended_dot | extra_seconds=6.5, tick_interval=0.5 | |

#### 专属词缀【仙露护元】

> 原文: 使本神通添加的`增益`状态持续时间延长300% （受融合影响，数据为最高融合加成）

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| buff_duration | value=300 | max_fusion |

---

### `通天剑诀` [剑修]

#### 主技能

> 原文: 以真火灌注灵剑，破空而出，对范围内目标造成六段共x%攻击力的灵法伤害，并使本神通暴击伤害提高y%，释放后自身8秒内受到伤害提高z%
> x=1500, y=100, z=50

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=6, total=1500 | |
| crit_damage_bonus | value=100 | |
| self_damage_taken_increase | value=50, duration=8 | |

#### 主词缀【焚心剑芒】

> 原文: 敌方当前气血值每损失x%，本神通伤害额外增加y%
> x=5, y=10

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| per_enemy_lost_hp | per_percent=2 | |

#### 专属词缀【神威冲云】

> 原文: 使本神通无视敌方所有伤害减免效果，并提升36%伤害

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| ignore_damage_reduction | | |
| damage_increase | value=36 | |

---

### `新-青元剑诀` [剑修]

#### 主技能

> 原文: 剑破万法，降下剑阵对范围内目标造成六段共x%攻击力的灵法伤害，并依敌方神通装配顺序，使其下一个未释放的神通进入8秒冷却时间
> x=1500

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=6, total=1500 | |
| debuff | name=神通封印, target=next_skill_cooldown, value=-8, duration=8 | |

#### 主词缀【追命剑阵】

> 原文: 使敌方的神通伤害降低x%，持续16秒
> x=30

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| debuff | name=追命剑阵, target=skill_damage, value=-30, duration=16 | |

#### 专属词缀【天威煌煌】

> 原文: 本神通施放后，使下一个施放的神通额外获得x%的`神通伤害加深`
> 融合20重：x=88
> 融合30重：x=108
> 融合40重：x=128

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| next_skill_buff | stat=skill_damage_increase, value=88 | fusion=20 |
| next_skill_buff | stat=skill_damage_increase, value=108 | fusion=30 |
| next_skill_buff | stat=skill_damage_increase, value=128 | fusion=40 |

---

### `无极御剑诀` [剑修]

#### 主技能

> 原文: 万剑归一，引灵剑之力，造成五段共计x%攻击力的灵法伤害，神通命中时此前敌方每被神通多段攻击命中一次，额外附加y%目标当前气血值的伤害
> x=1500, y=1.5

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| percent_current_hp_damage | value=1.5, per_prior_hit=true | |

#### 专属词缀【无极剑阵】

> 原文: 本神通攻击目标时提升555%`神通伤害`，但目标对本神通提升350%`神通伤害减免`

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| skill_damage_increase | value=555 | |
| enemy_skill_damage_reduction | value=350 | |

---

### `甲元仙符` [法修]

#### 主技能

> 原文: 天书尽开，降下神威天光，对范围内目标造成x%攻击力的灵法伤害，释放神通时自身获得【仙佑】状态，提升自身y%攻击力加成、守御加成、最大气血值，持续12秒
> 悟0境，此功能未解锁
> 悟1境，融合51重：x=1500, y=70
> 悟7境，融合51重：x=20310, y=70
> 悟8境，融合51重：x=21090, y=70

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | | locked |
| base_attack | total=1500 | [enlightenment=1, fusion=51] |
| self_buff | name=仙佑, attack_bonus=70, defense_bonus=70, hp_bonus=70, duration=12 | [enlightenment=1, fusion=51] |
| base_attack | total=20310 | [enlightenment=7, fusion=51] |
| base_attack | total=21090 | [enlightenment=8, fusion=51] |

#### 主词缀【天光虹露】

> 原文: 【仙佑】状态额外使自身获得x%治疗加成
> 悟0境，此词缀未解锁
> 悟1境，融合51重：x=70
> 悟7境，融合51重：x=170
> 悟8境，融合51重：x=190

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| self_buff_extra | | locked |
| self_buff_extra | buff_name=仙佑, healing_bonus=70 | [enlightenment=1, fusion=51] |
| self_buff_extra | buff_name=仙佑, healing_bonus=170 | [enlightenment=7, fusion=51] |
| self_buff_extra | buff_name=仙佑, healing_bonus=190 | [enlightenment=8, fusion=51] |

#### 专属词缀【天倾灵枯】

> 原文: 本神通施放后，会对敌方添加持续20秒的【灵枯】：治疗量降低31%，若敌方气血值低于30%，所降低的治疗量增至51%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| debuff | name=灵枯, target=healing_received, value=-31, duration=20 | |
| conditional_debuff | condition=target_hp_below_30, name=灵枯, target=healing_received, value=-51 | |

---

### `浩然星灵诀` [法修]

#### 主技能

> 原文: 借天书换来天鹤之灵，对范围内目标造成五段共x%攻击力的灵法伤害，当神通命中后获得【天鹤之佑】状态：提升y%最终伤害加成，持续20秒
> x=1500, y=10

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| self_buff | name=天鹤之佑, final_damage_bonus=10, duration=20 | |

#### 主词缀【天鹤祈瑞】

> 原文: 自身每拥有x%最终伤害加深，本技能附加y%攻击力的伤害，最多计算z%最终伤害加深
> x=10, y=100, z=50

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| conditional_damage | condition=self_final_damage_per_10, value=100 | |

#### 专属词缀【龙象护身】

> 原文: 使本神通添加的`增益`效果强度提升x%
> 融合52重：x=300

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| buff_strength | value=300 | fusion=52 |

---

### `元磁神光` [法修]

#### 主技能

> 原文: 借天书唤来天狼之灵，对范围内目标造成五段共x%攻击力的伤害，自身每次受到神通攻击时获得一层【天狼之啸】：提升y%伤害加深，最多叠加z层，持续12秒
> x=1500, y=8, z=3

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| self_buff | name=天狼之啸, damage_increase=8, max_stacks=3, duration=12, trigger=on_attacked | |

#### 主词缀【天狼战意】

> 原文: 每层【天狼之啸】额外提升自身x%攻击力
> x=7

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| self_buff_extra | buff_name=天狼之啸, attack_bonus=7 | |

#### 专属词缀【真极穿空】

> 原文: 使本神通添加的`增益`状态层数增加100%，自身每5层增益状态，提升5.5%伤害，最大提升27.5%伤害（25层达到最大提升伤害）

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| buff_stack_increase | value=100 | |
| per_buff_stack_damage | per_n_stacks=5, value=5.5, max=27.5 | |

---

### `周天星元` [法修]

#### 主技能

> 原文: 临摹天书之意，4秒内为自身恢复共x%最大气血值，并释放天书之意对范围内目标造成五段共计y%攻击力的灵法伤害，并附加临摹期间所恢复气血值的等额伤害，当技能释放结束后留下一只持续存在20秒的【回生灵鹤】：每秒恢复自身和友方z%气血值，共计恢复w%的最大气血值
> x=20, y=1500, z=3.5, w=70

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| self_heal | value=20, duration=4 | |
| base_attack | hits=5, total=1500 | |
| self_heal | name=回生灵鹤, value=70, duration=20 | |

> **注**: 主技能还附加临摹期间所恢复气血值的等额伤害，该数值无法以数字字段编码。

#### 主词缀【天书灵盾】

> 原文: 灵鹤每次恢复气血时会为目标添加一个x%自身最大气血值的护盾，持续16秒
> x=3.5

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| shield | value=3.5, source=self_max_hp, duration=16, parent=回生灵鹤 | |

#### 专属词缀【奇能诡道】

> 原文: 1. 当本神通为敌方添加`减益`状态时，有20%概率额外多附加1层该减益状态
> 2. 在`神通悟境`的条件下：若本神通施加`伤害加深类`（神通伤害加深/技能伤害加深/最终伤害加深）`增益`状态时，则会额外对目标施加负面状态【逆转阴阳】：敌方会减少0.6倍触发属性的伤害减免类效果，持续时间与触发的增益状态相同

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| debuff_stack_chance | value=20 | |
| conditional_debuff | condition=enlightenment_max, name=逆转阴阳, target=damage_reduction, value=0.6, duration=same_as_trigger | |

---

### `星元化岳` [法修]

#### 主技能

> 原文: 天书尽开，引来真灵天龙，对范围内目标造成五段共x%攻击力的灵法伤害，当目标每次受到伤害时，会额外受到一次攻击，伤害值为当次伤害的y%（该伤害不受伤害加成影响），持续8秒
> x=1500, y=25

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| debuff | name=天龙印, target=echo_damage, value=25, duration=8 | |

#### 主词缀【天龙轮转】

> 原文: 真灵天龙造成伤害时，恢复自身本次伤害x%的气血值
> x=75

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| lifesteal | value=75, parent=天龙印 | |

#### 专属词缀【仙灵汲元】

> 原文: 本神通造成伤害时，会使本次神通获得55%的吸血效果

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| lifesteal | value=55 | |

---

### `玉书天戈符` [法修]

#### 主技能

> 原文: 唤来一对鲲鹏天灵，对范围内目标造成三段共x%攻击力的灵法伤害，同时每段伤害附加y%自身最大气血值的伤害
> x=1500, y=21

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=3, total=1500 | |
| percent_max_hp_damage | value=21, source=self | |

#### 主词缀【天灵怒威】

> 原文: 当前气血高于x%时获得伤害加成，每额外高出y%气血值获得y%伤害加成
> x=20, y=3

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| conditional_damage | condition=self_hp_above_20, per_step=3, value=3 | |

#### 专属词缀【天人合一】

> 原文: 使本神通的悟境等级加1（最高不超过3级），并使本神通造成的伤害提升5%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| enlightenment_bonus | value=1, max=3 | |
| damage_increase | value=5 | |

---

### `九天真雷诀` [法修]

#### 主技能

> 原文: 仙法化锐，引天将之力，造成五段共x%攻击力的灵法伤害，神通释放时驱散自身y个负面状态，若净化的数量多于自身负面状态，则在接下来的三个神通命中时，每段攻击附加z%自身最大气血值的伤害
> x=1500, y=2, z=4

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| self_cleanse | count=2 | |
| conditional_damage | condition=cleanse_excess, value=4 | |

#### 专属词缀【九雷真解】

> 原文: 本神通每次施加`增益`/`减益`状态或添加`护盾`时，引动真雷轰击敌方，造成一次本神通50.8%的`灵法伤害`

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| on_buff_debuff_shield_trigger | damage_percent_of_skill=50.8 | |

---

### `大罗幻诀` [魔修]

#### 主技能

> 原文: 对目标进行攻击，造成五段共20265%攻击力的灵法伤害，并为自身添加【罗天魔咒】：受到伤害时，各有30%概率对攻击方添加1层【噬心之咒】与【断魂之咒】，各自最多叠加5层。【罗天魔咒】持续8秒
> 【噬心魔咒】：每0.5秒额外造成目标7%当前气血值的伤害，持续4秒
> 【断魂之咒】：每0.5秒额外造成目标7%已损失气血值的伤害，持续4秒

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=20265 | |
| counter_debuff | name=罗天魔咒, duration=8, on_attacked_chance=30 | |
| dot | name=噬心魔咒, parent=罗天魔咒, percent_current_hp=7, tick_interval=0.5, duration=4, max_stacks=5 | |
| dot | name=断魂之咒, parent=罗天魔咒, percent_lost_hp=7, tick_interval=0.5, duration=4, max_stacks=5 | |

#### 主词缀【魔魂咒界】

> 原文: 【罗天魔咒】状态下附加异常概率提升至60%，受到攻击时，额外给目标附加【命损】：`最终伤害减免`减低100%，持续8秒

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| counter_debuff_upgrade | on_attacked_chance=60 | |
| cross_slot_debuff | name=命损, target=final_damage_reduction, value=-100, duration=8, trigger=on_attacked | |

#### 专属词缀【古魔之魂】

> 原文: 使本神通添加的持续伤害上升104%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| dot_damage_increase | value=104 | |

---

### `无相魔劫咒` [魔修]

#### 主技能

> 原文: 魔威浩荡，引魔将之力造成五段共1500%攻击力的灵法伤害，神通施放时对敌方施加`负面状态`【无相魔劫】，持续12秒。【无相魔劫】期间敌方受到的神通伤害增加10%，并且【无相魔劫】时间结束时，对目标造成10%【无相魔劫】期间提升的伤害+5000%攻击力的伤害 （数据为没有悟境的情况）

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | enlightenment=0 |
| delayed_burst | name=无相魔劫, duration=12, damage_increase_during=10, burst_base=5000, burst_accumulated_pct=10 | enlightenment=0 |

#### 主词缀【灭劫魔威】

> 原文: 【无相魔劫】状态结束时的伤害提升65% （数据为没有悟境的情况）

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| delayed_burst_increase | value=65 | enlightenment=0 |

#### 专属词缀【无相魔威】

> 原文: 本神通命中时，对目标施加负面状态【魔劫】，持续8秒
> 【魔劫】：降低敌方40.8%的治疗量，并使神通造成的伤害提升105%，若目标不存在任何治疗状态，伤害提升效果进一步提升至205%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| debuff | name=魔劫, target=healing_received, value=-40.8, duration=8 | |
| conditional_damage | value=105, condition=target_has_no_healing, escalated_value=205, parent=魔劫 | |

---

### `天魔降临咒` [魔修]

#### 主技能

> 原文: 对目标造成五段共x%攻击力的灵法伤害，并对其施加【结魂锁链】：使受到的伤害减少y%，敌方受到的伤害增加z%，锁定目标具有的每层（个）减益效果会使敌方受到的伤害额外提升w%，最多提升至u%
> 【结魂锁链】战斗状态内永久生效，最多叠加1层
> x=1500, y=5.2, z=5.25, w=0.5, u=2

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| self_buff | name=结魂锁链, damage_reduction=5.2, duration=permanent, max_stacks=1 | |
| debuff | name=结魂锁链, target=damage_reduction, value=-5.25, duration=permanent | |
| per_debuff_stack_damage | per_n_stacks=1, value=0.5, max=2, parent=结魂锁链 | |

#### 主词缀【魔念生息】

> 原文: 敌方处于【结魂锁链】下，每秒受到x%最大气血值的伤害，并且【结魂锁链】提升敌方受到的伤害上限提升至y%
> x=1.6, y=4

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| dot | parent=结魂锁链, tick_interval=1, percent_max_hp=1.6, duration=permanent | |
| per_debuff_stack_damage | per_n_stacks=1, value=0.5, max=4, parent=结魂锁链 | |

#### 专属词缀【引灵摘魂】

> 原文: 使本神通攻击带有`减益`状态的敌方时，会使本次伤害提升104%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| conditional_damage | value=104, condition=target_has_debuff | |

---

### `天轮魔经` [魔修]

#### 主技能

> 原文: 召唤幽鬼对范围随机目标造成七段共x%攻击力的灵法伤害，并役使幽鬼偷取目标y个增益状态，每偷取1个增益状态，对目标造成z%最大气血值的伤害
> x=1500, y=2, z=3

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=7, total=1500 | |
| buff_steal | count=2 | |
| percent_max_hp_damage | value=3, per_stolen_buff=true | |

#### 主词缀【魔意震慑】

> 原文: 每偷取目标一个增益状态对目标附加一层【惧意】状态：攻击力降低x%，持续12秒
> x=14

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| debuff | name=惧意, target=attack, value=-14, duration=12, per_stolen_buff=true | |

#### 专属词缀【心魔惑言】

> 原文: 使本神通添加的`减益`状态层数增加100%，敌方每有5层减益状态会使本神通所有伤害提升5.5%，最大提升27.5%（持续伤害效果受一半伤害加成）
> 注：25层能达到最大提升伤害

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| debuff_stack_increase | value=100 | |
| per_debuff_stack_damage | per_n_stacks=5, value=5.5, max=27.5, dot_half=true | |

---

### `天剎真魔` [魔修]

#### 主技能

> 原文: 对目标进行攻击，造成五段共x%攻击力的灵法伤害，并为自身添加【不灭魔体】：受到伤害时，自身恢复该次伤害损失气血值的y%的气血值（该效果不受治疗加成影响）
> 【不灭魔体】战斗状态内永久生效
> x=1500, y=8

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| counter_buff | name=不灭魔体, duration=permanent, heal_on_damage_taken=8, no_healing_bonus=true | |

#### 主词缀【魔妄吞天】

> 原文: 在【不灭魔体】状态下受到攻击时，为目标附加【天人五衰】：每3秒轮流降低目标x%致命率、x%暴击伤害、x%暴击率、y%攻击力、y%最终伤害减免，持续15秒
> x=50, y=23

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| counter_debuff | name=天人五衰, duration=15, on_attacked_chance=100, parent=不灭魔体 | |
| crit_rate_reduction | value=-50, parent=天人五衰 | |
| crit_damage_reduction | value=-50, parent=天人五衰 | |
| attack_reduction | value=-23, parent=天人五衰 | |
| debuff | name=天人五衰, target=final_damage_reduction, value=-23, duration=15, parent=天人五衰 | |

#### 专属词缀【魔骨明心】

> 原文: 1. 本神通命中时，若敌方具有`减益`状态，则提升自身90%的治疗量，持续8秒
> 2. 在`神通悟境`的条件下：本神通每次造成伤害时，降低敌方20%`最终伤害减免`，持续1秒

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| conditional_heal_buff | condition=target_has_debuff, value=90, duration=8 | |
| conditional_debuff | condition=enlightenment_max, target=final_damage_reduction, value=-20, per_hit=true, duration=1 | |

---

### `解体化形` [魔修]

#### 主技能

> 原文: 召唤魔神虚影攻击目标，造成五段共x%攻击力的灵法伤害，同时目标当前每具有一个减益状态效果，本次神通伤害提升y%，最多计算10个减益状态
> x=1500, y=50

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| per_debuff_stack_damage | per_n_stacks=1, value=50, max=500 | |

#### 主词缀【魔神降世】

> 原文: 技能释放前根据目标身上减益状态的最高层数提升自身攻击力，每层提升自身x%的攻击力，最多计算30层
> x=13

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| attack_bonus | value=13, per_debuff_stack=true, max_stacks=30 | |

#### 专属词缀【心逐神随】

> 原文: 本神通施放时，会使本次神通所有效果x%概率提升4倍，y%概率提升3倍，z%概率提升2倍
> 悟0境，融合50重，x=11, y=31, z=51
> 悟2境，融合63重，x=60, y=80, z=100

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| probability_multiplier | prob=11, mult=4 | [enlightenment=0, fusion=50] |
| probability_multiplier | prob=31, mult=3 | [enlightenment=0, fusion=50] |
| probability_multiplier | prob=51, mult=2 | [enlightenment=0, fusion=50] |
| probability_multiplier | prob=60, mult=4 | [enlightenment=2, fusion=63] |
| probability_multiplier | prob=80, mult=3 | [enlightenment=2, fusion=63] |
| probability_multiplier | prob=100, mult=2 | [enlightenment=2, fusion=63] |

---

### `焚圣真魔咒` [魔修]

#### 主技能

> 原文: 役使六道鬼王攻击目标，对其造成六段共计x%攻击力的灵法伤害，每段攻击会为目标添加1层【贪妄业火】：每秒对目标造成y%当前气血值的伤害，持续8秒
> x=1500, y=3

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=6, total=1500 | |
| dot | name=贪妄业火, tick_interval=1, percent_current_hp=3, duration=8, per_hit_stack=true | |

#### 主词缀【魔心焚尽】

> 原文: 目标每获得两个【贪妄业火】，会额外附加一层持续8秒的【瞋痴业火】：每秒造成目标x%已损气血值伤害
> x=8

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| dot | name=瞋痴业火, parent=贪妄业火, per_n_stacks=2, tick_interval=1, percent_lost_hp=8, duration=8 | |

#### 专属词缀【天魔真解】

> 原文: 使本神通添加的持续伤害效果触发间隙缩短50.5%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| dot_frequency_increase | value=50.5 | |

---

### `十方真魄` [体修]

#### 主技能

> 原文: 借星灵之力快速接近目标，消耗自身10%当前气血值，对目标造成十段共1500%攻击力的灵法伤害，在神通的最后会对踢向目标，额外对其造成自身16%已损失气血值的伤害，并`等额恢复自身气血`，同时为自身添加【怒灵降世】：持续期间提升自身20%的攻击力与伤害减免，持续4秒

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| self_hp_cost | value=10 | |
| base_attack | hits=10, total=1500 | |
| self_lost_hp_damage | value=16, on_last_hit=true, heal_equal=true | |
| self_buff | name=怒灵降世, attack_bonus=20, damage_reduction=20, duration=4 | |

#### 主词缀【星猿弃天】

> 原文: 延长3.5秒【怒灵降世】持续时间，并且每秒有30%概率驱散自身所有`控制状态`，25秒内最多触发1次驱散状态

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| self_buff_extend | buff_name=怒灵降世, value=3.5 | |
| periodic_cleanse | chance=30, interval=1, cooldown=25, max_triggers=1 | |

#### 专属词缀【破釜沉舟】

> 原文: 本神通施放时，会使本次神通伤害提升380%（融合54重），施放期间自身受到的伤害也提升50%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| skill_damage_increase | value=380 | fusion=54 |
| self_damage_taken_increase | value=50 | fusion=54 |

---

### `疾风九变` [体修]

#### 主技能

> 原文: 积蓄力量冲向敌方，消耗自身10%当前气血值，对目标造成十段共1500%攻击力的灵法伤害，并为自身添加【极怒】：每秒对目标`反射`自身所受到伤害值的50%与自身15%已损失气血值的伤害，持续4秒

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| self_hp_cost | value=10 | |
| base_attack | hits=10, total=1500 | |
| counter_buff | name=极怒, duration=4, reflect_received_damage=50, reflect_percent_lost_hp=15 | |

#### 主词缀【星猿复灵】

> 原文: 恢复【极怒】造成伤害82%的气血值

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| lifesteal | value=82 | |

#### 专属词缀【真言不灭】

> 原文: 使本神通添加的`所有状态`持续时间延长55%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| all_state_duration | value=55 | |

---

### `玄煞灵影诀` [体修]

#### 主技能

> 原文: 通灵星辰巨猿之影，星辰巨猿与自身同时位移向前，分别对目标进行攻击，造成四段共x%攻击力的灵法伤害，并为自身添加【怒意滔天】：自身每秒损失y%的当前气血值，并每秒对目标造成自身z%已损气血值和期间消耗气血的伤害。【怒意滔天】战斗状态内永久生效，最多叠加1层。
> 悟1境，融合51重：x=18255, y=4, z=11

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=4, total=18255 | [enlightenment=1, fusion=51] |
| self_hp_cost | value=4, tick_interval=1, name=怒意滔天, duration=permanent | [enlightenment=1, fusion=51] |
| self_lost_hp_damage | value=11, tick_interval=1, parent=怒意滔天, duration=permanent | [enlightenment=1, fusion=51] |

#### 主词缀【星猿之怒】

> 原文: 【怒意滔天】每造成4次伤害，额外附加x%自身已损气血值和期间消耗气血值的伤害
> 悟1境，融合51重：x=12

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| self_lost_hp_damage | value=12, parent=怒意滔天, every_n_hits=4 | [enlightenment=1, fusion=51] |

#### 专属词缀【怒血战意】

> 原文: 本神通造成伤害时，自身每多损失1%最大气血值，会使本次伤害提升2%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| per_self_lost_hp | per_percent=2 | |

---

### `惊蛰化龙` [体修]

#### 主技能

> 原文: 合猿影构筑星辰杀阵，消耗自身x%当前气血值，对目标造成八段共x%攻击力的灵法伤害，额外对目标造成自身y%已损失气血值的伤害，并提升自身z%神通伤害加深，持续4秒
> x=1500, y=10, z=20

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=8, total=1500 | |
| self_lost_hp_damage | value=10 | |
| self_buff | name=星辰杀阵, skill_damage_increase=20, duration=4 | |

> **注**: 原文中 x 同时用于"消耗自身x%当前气血值"和"八段共x%攻击力的灵法伤害"（x=1500）。1500%气血消耗不合理，故省略 self_hp_cost 行。

#### 主词缀【星猿幻杀】

> 原文: 本技能每段攻击必定给目标附加一层【镇杀】：每叠加两层便会消耗并造成目标x%最大气血值伤害
> x=10

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| percent_max_hp_damage | name=镇杀, value=10 | |

#### 专属词缀【索心真诀】

> 原文: 1. 本神通造成伤害时，目标每有1层`减益`状态，会使本次额外造成目标2.1%最大气血值的真实伤害，最多造成21%最大气血值的真实伤害
> 注：10层能达到最大气血值的真实伤害
> 2. 在`神通悟境`的条件下：本神通附加自身已损气血的伤害提高50%，并使造成的伤害提升75%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| per_debuff_stack_true_damage | per_stack=2.1, max=21 | |
| conditional_buff | condition=enlightenment_max, percent_lost_hp_increase=50, damage_increase=75 | |

---

### `煞影千幻` [体修]

#### 主技能

> 原文: 通灵星辰巨猿，消耗自身x%当前气血值，对目标造成三段共y%攻击力的灵法伤害，额外对目标造成自身z%已损失气血值的伤害，并为自身添加w%最大气血值的护盾，护盾持续8秒，同时每段攻击必定会对目标添加1层不可驱散的【落星】：降低u%最终伤害减免，持续4秒
> x=20, y=1500, z=10, w=12, u=8

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| self_hp_cost | value=20 | |
| base_attack | hits=3, total=1500 | |
| self_lost_hp_damage | value=10 | |
| shield | value=12, source=self_max_hp, duration=8 | |
| debuff | name=落星, target=final_damage_reduction, value=-8, duration=4, per_hit_stack=true, dispellable=false | |

#### 主词缀【星猿援护】

> 原文: 获得的护盾提升至自身x%最大气血值，且有y%的概率不消耗气血值
> x=21.5, y=30

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| shield_strength | value=21.5 | |

#### 专属词缀【乘胜逐北】

> 原文: 本神通造成伤害时，若敌方处于`控制状态`，则使本次伤害提升100%

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| conditional_damage | value=100, condition=target_controlled | |

---

### `九重天凤诀` [体修]

#### 主技能

> 原文: 化身星猿，对目标造成八段共x%攻击力的灵法伤害，同时每段攻击额外对目标造成自身y%已损失气血值的伤害，每段攻击会消耗自身z%当前气血值并为自身添加1层【蛮神】：持续期间提升自身w%的攻击力与暴击率，持续4秒
> x=1500, y=25, z=5, w=2.5

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=8, total=1500 | |
| self_lost_hp_damage | value=25, per_hit=true | |
| self_hp_cost | value=5, per_hit=true | |
| self_buff | name=蛮神, attack_bonus=2.5, crit_rate=2.5, duration=4, per_hit_stack=true | |

#### 主词缀【星猿永生】

> 原文: 本技能造成伤害前优先驱散目标两个增益效果，释放本技能时气血不会降至x%以下
> x=10

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| periodic_dispel | count=2 | |
| self_hp_floor | value=10 | |

#### 专属词缀【玉石俱焚】

> 原文: 当本神通所添加的`护盾`消失时，会对敌方额外造成护盾值100%的伤害

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| on_shield_expire | damage_percent_of_shield=100 | |

---

### `天煞破虚诀` [体修]

#### 主技能

> 原文: 森罗龙象，引力士之灵造成五段共x%攻击力的灵法伤害。消耗y%当前气血值，本技能释放结束后使自身进入【破虚】状态：接下来神通的8段攻击，每段攻击附加自身z%已损气血值的伤害
> x=1500, y=20, z=10

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| base_attack | hits=5, total=1500 | |
| self_hp_cost | value=20 | |
| self_lost_hp_damage | value=10, per_hit=true, name=破虚, next_skill_hits=8 | |

#### 专属词缀【天煞破虚】

> 原文: 本神通命中后每秒`驱散`敌方1个`增益`状态，持续10秒，且本技能每驱散一个状态对敌方造成本神通25.5%的灵法伤害，若无驱散状态，则造成双倍伤害

| 效果类型 | 字段 | data_state |
|:---|:---|:---|
| periodic_dispel | interval=1, duration=10, damage_percent_of_skill=25.5, no_buff_double=true | |

---

## 二、通用词缀

> 原文 (data/raw → 副词缀 → 通用词缀):
> - 【咒书】使本神通添加的`减益效果`强度提升20%
> - 【清灵】使本神通添加的`增益效果`强度提升20%
> - 【业焰】使本神通添加的`所有状态`效果持续时间延长69% （受融合影响，数据为最高融合加成）
> - 【击瑕】本神通施放时，若敌方处于`控制效果`，则使本次伤害提升40%
> - 【破竹】本神通施放时，每造成1段伤害，剩余`段数伤害`提升1%，最多提升10%
> - 【金汤】本神通施放时，会在施放期间提升自身10%的`伤害减免`
> - 【怒目】本神通施放时，若敌方气血值低于30%，则使本次伤害提升20%，且暴击率提升30%
> - 【鬼印】当本神通所添加的持续伤害触发时，额外造成目标2%已损失气血值的伤害
> - 【福荫】本神通施放时，会使本次神通获得以下任意1个加成：攻击提升20%、致命伤害提升20%、造成的伤害提升20%
> - 【战意】本神通施放时，自身每多损失1%最大气血值，会使本次伤害提升2.95%
> - 【斩岳】本神通施放时，会使本次神通额外造成2000%攻击力的伤害
> - 【吞海】本神通施放时，敌方每多损失1%最大值气血值，会使本次伤害提升0.4%
> - 【灵盾】使本神通添加的`护盾值`提升20%
> - 【灵威】本神通施放后，使下一个施放的神通释放时额外获得118%的`神通伤害加深`（受融合影响，数据为最高融合加成）
> - 【摧山】本神通施放时，会使本次神通提升20%攻击力的效果
> - 【通明】使本神通必定`会心`造成1.2倍伤害，并有25%概率将之提升至1.5倍

| 词缀 | 效果类型 | 字段 | data_state |
|:---|:---|:---|:---|
| 【咒书】 | debuff_strength | value=20 | |
| 【清灵】 | buff_strength | value=20 | |
| 【业焰】 | all_state_duration | value=69 | max_fusion |
| 【击瑕】 | conditional_damage | value=40, condition=target_controlled | |
| 【破竹】 | per_hit_escalation | value=1, stat=damage, max=10 | |
| 【金汤】 | self_damage_reduction_during_cast | value=10 | |
| 【怒目】 | conditional_damage | value=20, condition=target_hp_below_30 | |
| 【怒目】 | conditional_crit_rate | value=30, condition=target_hp_below_30 | |
| 【鬼印】 | dot_extra_per_tick | value=2 | |
| 【福荫】 | random_buff | | |
| 【福荫】 | attack_bonus | value=20, parent=福荫 | |
| 【福荫】 | crit_damage_bonus | value=20, parent=福荫 | |
| 【福荫】 | damage_increase | value=20, parent=福荫 | |
| 【战意】 | per_self_lost_hp | per_percent=2.95 | |
| 【斩岳】 | flat_extra_damage | value=2000 | |
| 【吞海】 | per_enemy_lost_hp | per_percent=0.4 | |
| 【灵盾】 | shield_strength | value=20 | |
| 【灵威】 | next_skill_buff | stat=skill_damage_increase, value=118 | max_fusion |
| 【摧山】 | attack_bonus | value=20 | |
| 【通明】 | guaranteed_resonance | base_mult=1.2, enhanced_mult=1.5, enhanced_chance=25 | |

---

## 三、修为词缀

### 剑修

> 原文 (data/raw → 副词缀 → 修为词缀 → 剑修):
> - 摧云折月：使本神通提升300%攻击力的效果
> - 灵犀九重：使本神通必定`会心`造成2.97倍伤害，并有25%概率将之提升至3.97倍 （受融合影响，数据为最高融合加成）
> - 破碎无双：本神通施放时，会使本次神通提升15%攻击力的效果、15%的伤害、15%的暴击伤害
> - 心火淬锋：本神通命中时，每造成1段伤害，剩余段数伤害提升5%，最多提升50%

| 词缀 | 效果类型 | 字段 | data_state |
|:---|:---|:---|:---|
| 【摧云折月】 | attack_bonus | value=300 | |
| 【灵犀九重】 | guaranteed_resonance | base_mult=2.97, enhanced_mult=3.97, enhanced_chance=25 | max_fusion |
| 【破碎无双】 | attack_bonus | value=15 | |
| 【破碎无双】 | damage_increase | value=15 | |
| 【破碎无双】 | crit_damage_bonus | value=15 | |
| 【心火淬锋】 | per_hit_escalation | value=5, stat=damage, max=50 | |

### 法修

> 原文 (data/raw → 副词缀 → 修为词缀 → 法修):
> - 长生天则：使本神通的所有治疗效果提升50%
> - 明王之路：本神通施放时，会使本次神通的`最终伤害加深`提升50%
> - 天命有归：使本神通的`概率触发`效果提升为必定触发，并使本神通造成的伤害提升50%
> - 景星天佑：本神通施放时，会使本次神通获得以下任意1个加成：攻击提升55%、致命伤害提升55%、造成的伤害提升55%

| 词缀 | 效果类型 | 字段 | data_state |
|:---|:---|:---|:---|
| 【长生天则】 | healing_increase | value=50 | |
| 【明王之路】 | final_damage_bonus | value=50 | |
| 【天命有归】 | probability_to_certain | | |
| 【天命有归】 | damage_increase | value=50 | |
| 【景星天佑】 | random_buff | | |
| 【景星天佑】 | attack_bonus | value=55, parent=景星天佑 | |
| 【景星天佑】 | crit_damage_bonus | value=55, parent=景星天佑 | |
| 【景星天佑】 | damage_increase | value=55, parent=景星天佑 | |

### 魔修

> 原文 (data/raw → 副词缀 → 修为词缀 → 魔修):
> - 瑶光却邪：当本神通造成治疗效果时，会对敌方额外造成治疗量50%的伤害
> - 溃魂击瑕：本神通施放时，若敌方气血值低于30%，则使本次伤害提升100%，且必定暴击
> - 玄女护心：本神通造成伤害后，自身会获得1个本次神通伤害值的50%的`护盾`，护盾持续8秒
> - 祸星无妄：本神通施放时，会对敌方添加以下任意1个`减益`效果：攻击降低20%、暴击率降低20%、暴击伤害降低50%

| 词缀 | 效果类型 | 字段 | data_state |
|:---|:---|:---|:---|
| 【瑶光却邪】 | healing_to_damage | value=50 | |
| 【溃魂击瑕】 | conditional_damage | value=100, condition=target_hp_below_30 | |
| 【溃魂击瑕】 | conditional_crit | condition=target_hp_below_30 | |
| 【玄女护心】 | damage_to_shield | value=50, duration=8 | |
| 【祸星无妄】 | random_debuff | | |
| 【祸星无妄】 | attack_reduction | value=-20, parent=祸星无妄 | |
| 【祸星无妄】 | crit_rate_reduction | value=-20, parent=祸星无妄 | |
| 【祸星无妄】 | crit_damage_reduction | value=-50, parent=祸星无妄 | |

### 体修

> 原文 (data/raw → 副词缀 → 修为词缀 → 体修):
> - 金刚护体：本神通施放时，会在施放期间提升自身55%的`伤害减免`
> - 破灭天光：本神通命中时，会使本次神通额外造成2500%攻击力的伤害
> - 青云灵盾：使本神通添加的`护盾值`提升50%
> - 贪狼吞星：本神通施放时，敌方每多损失1%最大气血值，会使本次伤害提升1%
> - 意坠深渊：使本神通根据自身已损气血值计算伤害时至少按已损11%计算，并使本神通造成的伤害提升50%

| 词缀 | 效果类型 | 字段 | data_state |
|:---|:---|:---|:---|
| 【金刚护体】 | self_damage_reduction_during_cast | value=55 | |
| 【破灭天光】 | flat_extra_damage | value=2500 | |
| 【青云灵盾】 | shield_strength | value=50 | |
| 【贪狼吞星】 | per_enemy_lost_hp | per_percent=1 | |
| 【意坠深渊】 | min_lost_hp_threshold | value=11 | |
| 【意坠深渊】 | damage_increase | value=50 | |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-25 | Initial: normalized 28 books (9 detailed + 19 exclusive-only), 16 通用词缀, 17 修为词缀 from `data/raw/*.md` |
| 1.1 | 2026-02-25 | Array notation for multi-value data_state; fixed cross-references; renamed to normalized.data.cn.md |
| 1.2 | 2026-02-25 | Fixed `灵威`/`天威煌煌` stat field: `skill_damage_bonus` → `skill_damage_increase` per keyword.map |
| 1.3 | 2026-03-09 | Full extraction: added 主技能+主词缀 for 19 previously exclusive-only books from updated `主书.md`. Fixed numeric values: 战意 0.5→2.95, 摧云折月 55→300, 天威煌煌 single→multi-tier, 龙象护身 104→300. Updated data source references. |
