# 灵书 — 标准化数据提取（中文版）

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **标准化数据表。** 从 `data/raw/about.md` 提取的所有灵书效果，使用 `keyword.map.cn.md` 作为解析规范。每行一个效果 × 数据状态。

## 元信息

- **数据源**：`data/raw/about.md`（唯一数据源）
- **范围**：功法书主技能、主词缀、专属词缀、通用词缀、修为词缀
- **排除项**：共有功能（融合伤害、悟境伤害、施法间隙）——属于功法书基础机制，非灵书效果
- **功法书数量**：9 本有主技能/主词缀，28 本有专属词缀
- **通用词缀数量**：16
- **修为词缀数量**：剑修 4 + 法修 4 + 魔修 4 + 体修 5 = 17

**默认数据状态约定**：

| 修为 | 未标注数据的默认状态 |
|:---|:---|
| 剑修 | 悟境最高加成（默认最高悟境） |
| 法修 | 数值受悟境影响（无明确默认） |
| 魔修 | 悟境最高加成（默认最高悟境） |
| 体修 | 没有悟境的情况（默认无悟境） |

**字段格式约定**：`key=value` 对以逗号分隔。减益降低属性使用负值。词缀名使用【】。

---

## 一、功法书

---

### 千锋聚灵剑 [剑修]

#### 主技能

> 原文: 剑破天地，对范围内目标造成六段共计x%攻击力的灵法伤害，并每段攻击造成目标y%最大气血值的伤害（对怪物伤害不超过自身z%攻击力）

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `base_attack` | hits=6, total=1500 | enlightenment=0 |
| `base_attack` | hits=6, total=11265 | [enlightenment=1, fusion=20] |
| `base_attack` | hits=6, total=14865 | [enlightenment=3, fusion=32] |
| `base_attack` | hits=6, total=20265 | [enlightenment=10, fusion=51] |
| `percent_max_hp_damage` | value=11, cap_vs_monster=2200 | enlightenment=0 |
| `percent_max_hp_damage` | value=15, cap_vs_monster=3000 | [enlightenment=1, fusion=20] |
| `percent_max_hp_damage` | value=19, cap_vs_monster=3800 | [enlightenment=3, fusion=32] |
| `percent_max_hp_damage` | value=27, cap_vs_monster=5400 | [enlightenment=10, fusion=51] |

#### 主词缀【惊神剑光】

> 原文: 本神通每段攻击造成伤害后，下一段提升x%神通加成

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `per_hit_escalation` | value=25, stat=skill_bonus | enlightenment=3 |
| `per_hit_escalation` | value=42.5, stat=skill_bonus | enlightenment=10 |

---

### 春黎剑阵 [剑修]

#### 主技能

> 原文: 剑化万千，破空位移向前，对范围内目标造成五段共计22305%攻击力的灵法伤害，并创建一个持续存在16秒的分身，继承自身54%的属性。主角释放神通后分身会攻击敌方，分身受到的伤害为自身的400%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `base_attack` | hits=5, total=22305 | |
| `summon` | inherit_stats=54, duration=16, damage_taken_multiplier=400 | |

#### 主词缀【幻象剑灵】

> 原文: 分身受到伤害降低至自身的120%， 造成的伤害增加200%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `summon_buff` | damage_taken_reduction_to=120, damage_increase=200 | |

---

### 皓月剑诀 [剑修]

#### 主技能

> 原文: 剑墓既出，天地低昂，一剑出，诸天寂灭。对范围内目标造成十段共计22305%攻击力的灵法伤害，神通释放时自身获得增益状态【寂灭剑心】：每段伤害命中时湮灭敌方1个护盾，并额外造成12%敌方最大气血值的伤害（对怪物最多造成2400%攻击力的伤害）；对无盾目标造成双倍伤害（对怪物最多造成4800%攻击力的伤害）；【寂灭剑心】上限1层，持续4秒

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `base_attack` | hits=10, total=22305 | |
| `self_buff` | name=寂灭剑心, max_stacks=1, duration=4 | |
| `shield_destroy_damage` | shields_per_hit=1, percent_max_hp=12, cap_vs_monster=2400, no_shield_double_cap=4800, parent=寂灭剑心 | |

#### 主词缀【碎魂剑意】

> 原文: 【寂灭剑心】每0.5秒对目标造成湮灭护盾的总个数*600%攻击力的伤害（若触发湮灭护盾效果时敌方无护盾加持，则计算湮灭2个护盾）

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `shield_destroy_dot` | tick_interval=0.5, per_shield_damage=600, no_shield_assumed=2, parent=寂灭剑心 | |

---

### 念剑诀 [剑修]

#### 主技能

> 原文: 剑影无形，人剑合一，自身化为轰雷剑意，方寸之间位移数次，在4秒内不可被选中。同时降下轰雷剑阵，对范围内目标造成八段共计22305%攻击力的灵法伤害，轰雷剑阵每造成2次伤害时，剑阵接下来的伤害提升1.4倍，单次伤害至多被该效果重复加成10次

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `untargetable_state` | duration=4 | |
| `base_attack` | hits=8, total=22305 | |
| `periodic_escalation` | every_n_hits=2, multiplier=1.4, max_stacks=10 | |

#### 主词缀【雷阵剑影】

> 原文: 技能结束后雷阵不会马上消失，将额外持续存在6.5秒，每0.5秒造成一次伤害

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `extended_dot` | extra_seconds=6.5, tick_interval=0.5 | |

---

### 甲元仙符 [法修]

#### 主技能

> 原文: 天书尽开，降下神威天光，对范围内目标造成x%攻击力的灵法伤害，释放神通时自身获得【仙佑】状态，提升自身y%攻击力加成、守御加成、最大气血值，持续12秒

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `base_attack` | total=1500 | locked |
| `self_buff` | name=仙佑, duration=12 | locked |
| `base_attack` | total=1500 | [enlightenment=1, fusion=51] |
| `self_buff` | name=仙佑, attack_bonus=70, defense_bonus=70, hp_bonus=70, duration=12 | [enlightenment=1, fusion=51] |
| `base_attack` | total=20310 | [enlightenment=7, fusion=51] |
| `self_buff` | name=仙佑, attack_bonus=70, defense_bonus=70, hp_bonus=70, duration=12 | [enlightenment=7, fusion=51] |
| `base_attack` | total=21090 | [enlightenment=8, fusion=51] |
| `self_buff` | name=仙佑, attack_bonus=70, defense_bonus=70, hp_bonus=70, duration=12 | [enlightenment=8, fusion=51] |

#### 主词缀【天光虹露】

> 原文: 【仙佑】状态额外使自身获得x%治疗加成

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `self_buff_extra` | buff_name=仙佑 | locked |
| `self_buff_extra` | buff_name=仙佑, healing_bonus=70 | [enlightenment=1, fusion=51] |
| `self_buff_extra` | buff_name=仙佑, healing_bonus=170 | [enlightenment=7, fusion=51] |
| `self_buff_extra` | buff_name=仙佑, healing_bonus=190 | [enlightenment=8, fusion=51] |

---

### 大罗幻诀 [魔修]

#### 主技能

> 原文: 对目标进行攻击，造成五段共20265%攻击力的灵法伤害，并为自身添加【罗天魔咒】：受到伤害时，各有30%概率对攻击方添加1层【噬心之咒】与【断魂之咒】，各自最多叠加5层。【罗天魔咒】持续8秒

> 原文: 【噬心魔咒】：每0.5秒额外造成目标7%当前气血值的伤害，持续4秒

> 原文: 【断魂之咒】：每0.5秒额外造成目标7%已损失气血值的伤害，持续4秒

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `base_attack` | hits=5, total=20265 | |
| `counter_debuff` | name=罗天魔咒, duration=8, on_attacked_chance=30, max_stacks=5 | |
| `dot` | name=噬心魔咒, parent=罗天魔咒, tick_interval=0.5, percent_current_hp=7, duration=4 | |
| `dot` | name=断魂之咒, parent=罗天魔咒, tick_interval=0.5, percent_lost_hp=7, duration=4 | |

#### 主词缀【魔魂咒界】

> 原文: 【罗天魔咒】状态下附加异常概率提升至60%，受到攻击时，额外给目标附加【命损】：最终伤害减免减低100%，持续8秒

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `counter_debuff_upgrade` | on_attacked_chance=60, parent=罗天魔咒 | |
| `cross_slot_debuff` | name=命损, target=final_damage_reduction, value=-100, duration=8, trigger=on_attacked, parent=罗天魔咒 | |

---

### 无相魔劫咒 [魔修]

#### 主技能

> 原文: 魔威浩荡，引魔将之力造成五段共1500%攻击力的灵法伤害，神通施放时对敌方施加负面状态【无相魔劫】，持续12秒。【无相魔劫】期间敌方受到的神通伤害增加10%，并且【无相魔劫】时间结束时，对目标造成10%【无相魔劫】期间提升的伤害+5000%攻击力的伤害 （数据为没有悟境的情况）

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `base_attack` | hits=5, total=1500 | enlightenment=0 |
| `delayed_burst` | name=无相魔劫, duration=12, damage_increase_during=10, burst_accumulated_pct=10, burst_base=5000 | enlightenment=0 |

#### 主词缀【灭劫魔威】

> 原文: 【无相魔劫】状态结束时的伤害提升65% （数据为没有悟境的情况）

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `delayed_burst_increase` | value=65, parent=无相魔劫 | enlightenment=0 |

---

### 十方真魄 [体修]

#### 主技能

> 原文: 借星灵之力快速接近目标，消耗自身10%当前气血值，对目标造成十段共1500%攻击力的灵法伤害，在神通的最后会对踢向目标，额外对其造成自身16%已损失气血值的伤害，并等额恢复自身气血，同时为自身添加【怒灵降世】：持续期间提升自身20%的攻击力与伤害减免，持续4秒

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `self_hp_cost` | value=10 | |
| `base_attack` | hits=10, total=1500 | |
| `self_lost_hp_damage` | value=16, on_last_hit=true, heal_equal=true | |
| `self_buff` | name=怒灵降世, attack_bonus=20, damage_reduction=20, duration=4 | |

#### 主词缀【星猿弃天】

> 原文: 延长3.5秒【怒灵降世】持续时间，并且每秒有30%概率驱散自身所有控制状态，25秒内最多触发1次驱散状态

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `self_buff_extend` | buff_name=怒灵降世, value=3.5 | |
| `periodic_cleanse` | chance=30, interval=1, cooldown=25, max_triggers=1 | |

---

### 疾风九变 [体修]

#### 主技能

> 原文: 积蓄力量冲向敌方，消耗自身10%当前气血值，对目标造成十段共1500%攻击力的灵法伤害，并为自身添加【极怒】：每秒对目标反射自身所受到伤害值的50%与自身15%已损失气血值的伤害，持续4秒

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `self_hp_cost` | value=10 | |
| `base_attack` | hits=10, total=1500 | |
| `counter_buff` | name=极怒, duration=4, reflect_received_damage=50, reflect_percent_lost_hp=15 | |

#### 主词缀【星猿复灵】

> 原文: 恢复【极怒】造成伤害82%的气血值

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `lifesteal` | value=82, parent=极怒 | |

---

## 二、通用词缀

> 原文: 【咒书】使本神通添加的减益效果强度提升20%
> 原文: 【清灵】使本神通添加的增益效果强度提升20%
> 原文: 【业焰】使本神通添加的所有状态效果持续时间延长69% （受融合影响，数据为最高融合加成）
> 原文: 【击瑕】本神通施放时，若敌方处于控制效果，则使本次伤害提升40%
> 原文: 【破竹】本神通施放时，每造成1段伤害，剩余段数伤害提升1%，最多提升10%
> 原文: 【金汤】本神通施放时，会在施放期间提升自身10%的伤害减免
> 原文: 【怒目】本神通施放时，若敌方气血值低于30%，则使本次伤害提升20%，且暴击率提升30%
> 原文: 【鬼印】当本神通所添加的持续伤害触发时，额外造成目标2%已损失气血值的伤害
> 原文: 【福荫】本神通施放时，会使本次神通获得以下任意1个加成：攻击提升20%、致命伤害提升20%、造成的伤害提升20%
> 原文: 【战意】本神通施放时，自身每多损失1%最大气血值，会使本次伤害提升0.5%
> 原文: 【斩岳】本神通施放时，会使本次神通额外造成2000%攻击力的伤害
> 原文: 【吞海】本神通施放时，敌方每多损失1%最大值气血值，会使本次伤害提升0.4%
> 原文: 【灵盾】使本神通添加的护盾值提升20%
> 原文: 【灵威】本神通施放后，使下一个施放的神通释放时额外获得118%的神通伤害加深（受融合影响，数据为最高融合加成）
> 原文: 【摧山】本神通施放时，会使本次神通提升20%攻击力的效果
> 原文: 【通明】使本神通必定会心造成1.2倍伤害，并有25%概率将之提升至1.5倍

| 词缀 | 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|:---|
| 【咒书】 | `debuff_strength` | value=20 | |
| 【清灵】 | `buff_strength` | value=20 | |
| 【业焰】 | `all_state_duration` | value=69 | max_fusion |
| 【击瑕】 | `conditional_damage` | value=40, condition=target_controlled | |
| 【破竹】 | `per_hit_escalation` | value=1, stat=damage, max=10 | |
| 【金汤】 | `self_damage_reduction_during_cast` | value=10 | |
| 【怒目】 | `conditional_damage` | value=20, condition=target_hp_below_30 | |
| 【怒目】 | `conditional_crit_rate` | value=30, condition=target_hp_below_30 | |
| 【鬼印】 | `dot_extra_per_tick` | value=2 | |
| 【福荫】 | `random_buff` | options=[attack_bonus, crit_damage_bonus, damage_increase] | |
| 【福荫】 | `attack_bonus` | value=20, parent=【福荫】 | |
| 【福荫】 | `crit_damage_bonus` | value=20, parent=【福荫】 | |
| 【福荫】 | `damage_increase` | value=20, parent=【福荫】 | |
| 【战意】 | `per_self_lost_hp` | per_percent=0.5 | |
| 【斩岳】 | `flat_extra_damage` | value=2000 | |
| 【吞海】 | `per_enemy_lost_hp` | per_percent=0.4 | |
| 【灵盾】 | `shield_strength` | value=20 | |
| 【灵威】 | `next_skill_buff` | stat=skill_damage_increase, value=118 | max_fusion |
| 【摧山】 | `attack_bonus` | value=20 | |
| 【通明】 | `guaranteed_crit` | base_mult=1.2, enhanced_mult=1.5, enhanced_chance=25 | |

---

## 三、修为词缀

### 剑修

> 原文: 摧云折月 使本神通提升55%攻击力的效果
> 原文: 灵犀九重 使本神通必定会心造成2.97倍伤害，并有25%概率将之提升至3.97倍 （受融合影响，数据为最高融合加成）
> 原文: 破碎无双 本神通施放时，会使本次神通提升15%攻击力的效果、15%的伤害、15%的暴击伤害
> 原文: 心火淬锋 本神通命中时，每造成1段伤害，剩余段数伤害提升5%，最多提升50%

| 词缀 | 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|:---|
| 【摧云折月】 | `attack_bonus` | value=55 | |
| 【灵犀九重】 | `guaranteed_crit` | base_mult=2.97, enhanced_mult=3.97, enhanced_chance=25 | max_fusion |
| 【破碎无双】 | `attack_bonus` | value=15 | |
| 【破碎无双】 | `damage_increase` | value=15 | |
| 【破碎无双】 | `crit_damage_bonus` | value=15 | |
| 【心火淬锋】 | `per_hit_escalation` | value=5, stat=damage, max=50 | |

### 法修

> 原文: 长生天则 使本神通的所有治疗效果提升50%
> 原文: 明王之路 本神通施放时，会使本次神通的最终伤害加深提升50%
> 原文: 天命有归 使本神通的概率触发效果提升为必定触发，并使本神通造成的伤害提升50%
> 原文: 景星天佑 本神通施放时，会使本次神通获得以下任意1个加成：攻击提升55%、致命伤害提升55%、造成的伤害提升55%

| 词缀 | 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|:---|
| 【长生天则】 | `healing_increase` | value=50 | |
| 【明王之路】 | `final_damage_bonus` | value=50 | |
| 【天命有归】 | `probability_to_certain` | | |
| 【天命有归】 | `damage_increase` | value=50 | |
| 【景星天佑】 | `random_buff` | options=[attack_bonus, crit_damage_bonus, damage_increase] | |
| 【景星天佑】 | `attack_bonus` | value=55, parent=【景星天佑】 | |
| 【景星天佑】 | `crit_damage_bonus` | value=55, parent=【景星天佑】 | |
| 【景星天佑】 | `damage_increase` | value=55, parent=【景星天佑】 | |

### 魔修

> 原文: 瑶光却邪 当本神通造成治疗效果时，会对敌方额外造成治疗量50%的伤害
> 原文: 溃魂击瑕 本神通施放时，若敌方气血值低于30%，则使本次伤害提升100%，且必定暴击
> 原文: 玄女护心 本神通造成伤害后，自身会获得1个本次神通伤害值的50%的护盾，护盾持续8秒
> 原文: 祸星无妄 本神通施放时，会对敌方添加以下任意1个减益效果：攻击降低20%、暴击率降低20%、暴击伤害降低50%

| 词缀 | 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|:---|
| 【瑶光却邪】 | `healing_to_damage` | value=50 | |
| 【溃魂击瑕】 | `conditional_damage` | value=100, condition=target_hp_below_30 | |
| 【溃魂击瑕】 | `conditional_crit` | condition=target_hp_below_30 | |
| 【玄女护心】 | `damage_to_shield` | value=50, duration=8 | |
| 【祸星无妄】 | `random_debuff` | options=[attack_reduction, crit_rate_reduction, crit_damage_reduction] | |
| 【祸星无妄】 | `attack_reduction` | value=-20, parent=【祸星无妄】 | |
| 【祸星无妄】 | `crit_rate_reduction` | value=-20, parent=【祸星无妄】 | |
| 【祸星无妄】 | `crit_damage_reduction` | value=-50, parent=【祸星无妄】 | |

### 体修

> 原文: 金刚护体 本神通施放时，会在施放期间提升自身55%的伤害减免
> 原文: 破灭天光 本神通命中时，会使本次神通额外造成2500%攻击力的伤害
> 原文: 青云灵盾 使本神通添加的护盾值提升50%
> 原文: 贪狼吞星 本神通施放时，敌方每多损失1%最大气血值，会使本次伤害提升1%
> 原文: 意坠深渊 使本神通根据自身已损气血值计算伤害时至少按已损11%计算，并使本神通造成的伤害提升50%

| 词缀 | 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|:---|
| 【金刚护体】 | `self_damage_reduction_during_cast` | value=55 | |
| 【破灭天光】 | `flat_extra_damage` | value=2500 | |
| 【青云灵盾】 | `shield_strength` | value=50 | |
| 【贪狼吞星】 | `per_enemy_lost_hp` | per_percent=1 | |
| 【意坠深渊】 | `min_lost_hp_threshold` | value=11 | |
| 【意坠深渊】 | `damage_increase` | value=50 | |

---

## 四、专属词缀

### 剑修

#### 千锋聚灵剑 —【天哀灵涸】

> 原文: 本神通施放后，会对敌方添加持续8秒的【灵涸】：治疗量降低31%，且无法被驱散

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `debuff` | name=灵涸, target=healing_received, value=-31, duration=8, dispellable=false | |

#### 春黎剑阵 —【玄心剑魄】

> 原文: 本神通施放后，会对敌方添加持续8秒的【噬心】：每秒受到550%攻击力的伤害，若被驱散，立即受到3300%攻击力的伤害，并眩晕2秒

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `dot` | name=噬心, tick_interval=1, damage_per_tick=550, duration=8 | |
| `on_dispel` | damage=3300, stun=2, parent=噬心 | |

#### 皓月剑诀 —【追神真诀】

> 原文: 1. 本神通所添加的持续伤害触发时，额外造成目标26.5%已损失气血值的伤害

> 原文: 2. 在神通悟境（悟10境）的条件下：本神通附加目标最大气血的伤害提高50%，并且造成的伤害提升300%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `dot_extra_per_tick` | value=26.5 | |
| `conditional_buff` | condition=enlightenment_10, percent_max_hp_increase=50, damage_increase=300 | enlightenment=10 |

#### 念剑诀 —【仙露护元】

> 原文: 使本神通添加的增益状态持续时间延长300% （受融合影响，数据为最高融合加成）

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `buff_duration` | value=300 | max_fusion |

#### 通天剑诀 —【神威冲云】

> 原文: 使本神通无视敌方所有伤害减免效果，并提升36%伤害

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `ignore_damage_reduction` | | |
| `damage_increase` | value=36 | |

#### 新-青元剑诀 —【天威煌煌】

> 原文: 本神通施放后，使下一个施放的神通额外获得50%的神通伤害加深

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `next_skill_buff` | stat=skill_damage_increase, value=50 | |

#### 无极御剑诀 —【无极剑阵】

> 原文: 本神通攻击目标时提升555%神通伤害，但目标对本神通提升350%神通伤害减免

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `skill_damage_increase` | value=555 | |
| `enemy_skill_damage_reduction` | value=350 | |

### 法修

#### 浩然星灵诀 —【龙象护身】

> 原文: 使本神通添加的增益效果强度提升104%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `buff_strength` | value=104 | |

#### 元磁神光 —【真极穿空】

> 原文: 使本神通添加的增益状态层数增加100%，自身每5层增益状态，提升5.5%伤害，最大提升27.5%伤害（25层达到最大提升伤害）

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `buff_stack_increase` | value=100 | |
| `per_buff_stack_damage` | per_n_stacks=5, value=5.5, max=27.5 | |

#### 周天星元 —【奇能诡道】

> 原文: 1. 当本神通为敌方添加减益状态时，有20%概率额外多附加1层该减益状态

> 原文: 2. 在神通悟境的条件下：若本神通施加伤害加深类（神通伤害加深/技能伤害加深/最终伤害加深）增益状态时，则会额外对目标施加负面状态【逆转阴阳】：敌方会减少0.6倍触发属性的伤害减免类效果，持续时间与触发的增益状态相同

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `debuff_stack_chance` | value=20 | |
| `conditional_debuff` | condition=enlightenment_max, name=逆转阴阳, target=damage_reduction, value=-0.6, duration=same_as_trigger | enlightenment_max |

#### 甲元仙符 —【天倾灵枯】

> 原文: 本神通施放后，会对敌方添加持续20秒的【灵枯】：治疗量降低31%，若敌方气血值低于30%，所降低的治疗量增至51%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `debuff` | name=灵枯, target=healing_received, value=-31, duration=20 | |
| `conditional_debuff` | condition=target_hp_below_30, name=灵枯, target=healing_received, value=-51, duration=20 | |

#### 星元化岳 —【仙灵汲元】

> 原文: 本神通造成伤害时，会使本次神通获得55%的吸血效果

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `lifesteal` | value=55 | |

#### 玉书天戈符 —【天人合一】

> 原文: 使本神通的悟境等级加1（最高不超过3级），并使本神通造成的伤害提升5%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `enlightenment_bonus` | value=1, max=3 | |
| `damage_increase` | value=5 | |

#### 九天真雷诀 —【九雷真解】

> 原文: 本神通每次施加增益/减益状态或添加护盾时，引动真雷轰击敌方，造成一次本神通50.8%的灵法伤害

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `on_buff_debuff_shield_trigger` | damage_percent_of_skill=50.8 | |

### 魔修

#### 天魔降临咒 —【引灵摘魂】

> 原文: 使本神通攻击带有减益状态的敌方时，会使本次伤害提升104%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `conditional_damage` | value=104, condition=target_has_debuff | |

#### 天轮魔经 —【心魔惑言】

> 原文: 使本神通添加的减益状态层数增加100%，敌方每有5层减益状态会使本神通所有伤害提升5.5%，最大提升27.5%（持续伤害效果受一半伤害加成）

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `debuff_stack_increase` | value=100 | |
| `per_debuff_stack_damage` | per_n_stacks=5, value=5.5, max=27.5, dot_half=true | |

#### 天剎真魔 —【魔骨明心】

> 原文: 1. 本神通命中时，若敌方具有减益状态，则提升自身90%的治疗量，持续8秒

> 原文: 2. 在神通悟境的条件下：本神通每次造成伤害时，降低敌方20%最终伤害减免，持续1秒

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `conditional_heal_buff` | condition=target_has_debuff, value=90, duration=8 | |
| `conditional_debuff` | condition=enlightenment_max, target=final_damage_reduction, value=-20, duration=1 | enlightenment_max |

#### 解体化形 —【心逐神随】

> 原文: 本神通施放时，会使本次神通所有效果11%概率提升4倍，31%概率提升3倍，51%概率提升2倍

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `probability_multiplier` | tiers=[{prob=11, mult=4}, {prob=31, mult=3}, {prob=51, mult=2}] | |

#### 大罗幻诀 —【古魔之魂】

> 原文: 使本神通添加的持续伤害上升104%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `dot_damage_increase` | value=104 | |

#### 焚圣真魔咒 —【天魔真解】

> 原文: 使本神通添加的持续伤害效果触发间隙缩短50.5%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `dot_frequency_increase` | value=50.5 | |

#### 无相魔劫咒 —【无相魔威】

> 原文: 本神通命中时，对目标施加负面状态【魔劫】，持续8秒

> 原文: 【魔劫】：降低敌方40.8%的治疗量，并使神通造成的伤害提升105%，若目标不存在任何治疗状态，伤害提升效果进一步提升至205%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `debuff` | name=魔劫, target=healing_received, value=-40.8, duration=8 | |
| `conditional_damage` | value=105, condition=target_has_healing, escalated_value=205, escalated_condition=target_has_no_healing, parent=魔劫 | |

### 体修

#### 玄煞灵影诀 —【怒血战意】

> 原文: 本神通造成伤害时，自身每多损失1%最大气血值，会使本次伤害提升2%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `per_self_lost_hp` | per_percent=2 | |

#### 惊蛰化龙 —【紫心真诀】

> 原文: 1. 本神通造成伤害时，目标每有1层减益状态，会使本次额外造成目标2.1%最大气血值的真实伤害，最多造成21%最大气血值的真实伤害

> 原文: 2. 在神通悟境的条件下：本神通附加自身已损气血的伤害提高50%，并使造成的伤害提升75%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `per_debuff_stack_true_damage` | per_stack=2.1, max=21 | |
| `conditional_buff` | condition=enlightenment_max, percent_lost_hp_increase=50, damage_increase=75 | enlightenment_max |

#### 十方真魄 —【破釜沉舟】

> 原文: 本神通施放时，会使本次神通伤害提升380%（融合54重），施放期间自身受到的伤害也提升50%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `skill_damage_increase` | value=380 | fusion=54 |
| `self_damage_taken_increase` | value=50 | fusion=54 |

#### 疾风九变 —【真言不灭】

> 原文: 使本神通添加的所有状态持续时间延长55%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `all_state_duration` | value=55 | |

#### 煞影千幻 —【乘胜逐北】

> 原文: 本神通造成伤害时，若敌方处于控制状态，则使本次伤害提升100%

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `conditional_damage` | value=100, condition=target_controlled | |

#### 九重天凤诀 —【玉石俱焚】

> 原文: 当本神通所添加的护盾消失时，会对敌方额外造成护盾值100%的伤害

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `on_shield_expire` | damage_percent_of_shield=100 | |

#### 天煞破虚诀 —【天煞破虚】

> 原文: 本神通命中后每秒驱散敌方1个增益状态，持续10秒，且本技能每驱散一个状态对敌方造成本神通25.5%的灵法伤害，若无驱散状态，则造成双倍伤害

| 效果类型 | 字段 | 数据状态 |
|:---|:---|:---|
| `periodic_dispel` | interval=1, duration=10, damage_percent_of_skill=25.5, no_buff_double=true | |
