---
initial date: 2026-2-18
dates of modification: [2026-2-19, 2026-2-23]
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
h1, h2, h3, h4, h5, h6 { color: #ffffff !important; }
a { color: #61afef !important; }
code { background-color: #3e4451 !important; color: #e5c07b !important; padding: 2px 6px !important; border-radius: 3px !important; }
table { border-collapse: collapse !important; width: auto !important; margin: 16px 0 !important; table-layout: auto !important; display: table !important; }
table th, table td { border: 1px solid #4b5263 !important; padding: 8px 10px !important; word-wrap: break-word !important; }
table th:first-child, table td:first-child { min-width: 60px !important; }
table th { background: #3e4451 !important; color: #e5c07b !important; font-size: 14px !important; text-align: center !important; }
table td { background: #2c313a !important; font-size: 12px !important; text-align: left !important; }
blockquote { border-left: 3px solid #4b5263; padding-left: 10px; color: #5c6370; }
strong { color: #e5c07b; }
</style>

# 灵书向量表示与嵌入

**Authors:** Z. Zhang & Claude Sonnet 4.5 (Anthropic)

> 从 model.md 的效果参数构建向量表示，支持相似度搜索、分类和配置优化。
>
> **Why 20 dimensions?** See [domain.md](domain.md) §6 for the rationale — how the damage formula and combat mechanics decompose into these axes, with concrete game examples.

## 1. 效果维度空间 (D = 20)

每个维度对应一类战斗贡献。所有值归一化为百分比或倍率。

| dim | id | 含义 | 单位 | 来源效果类型 |
|-----|----|------|------|-------------|
| 0 | base_damage | 主技能基础伤害 | %atk | base_damage |
| 1 | hit_count | 段数 | count | hits |
| 2 | atk_mod | 攻击力加成 | % | atk_increase |
| 3 | dmg_mod | 伤害加成 | % | damage_increase |
| 4 | skill_dmg_mod | 神通伤害加成 | % | skill_damage_increase, skill_damage_deepen |
| 5 | final_dmg_mod | 最终伤害加深 | % | final_damage_deepen |
| 6 | crit_rate_mod | 暴击率加成 | % | crit_rate, guaranteed_resonance |
| 7 | crit_dmg_mod | 暴击伤害倍率 | x | crit_damage, guaranteed_resonance value |
| 8 | extra_flat_dmg | 额外固定伤害 | %atk | extra_damage (flat) |
| 9 | hp_pct_dmg | 基于最大HP伤害 | %/hit | percent_max_hp |
| 10 | lost_hp_pct_dmg | 基于已损HP伤害 | %/hit | scaling_damage (lost_hp variants) |
| 11 | dot_power | DoT总贡献 | %atk/cycle | dot × duration × frequency |
| 12 | per_hit_esc | 每段递增率 | %/hit | per_hit_escalation |
| 13 | prob_mult | 概率倍增期望 | x | probability_multiplier E[value] |
| 14 | buff_amp | 增益放大 | composite | buff_strength + buff_layer + buff_duration |
| 15 | debuff_amp | 减益放大 | composite | debuff_strength + debuff_layer + debuff_duration |
| 16 | heal_net | 治疗净值 | % | heal_increase + lifesteal - anti_heal_applied |
| 17 | survivability | 生存能力 | composite | damage_reduction + shield + self_heal |
| 18 | temporal_buff | 跨槽增益输出 | value × slots | buff_value × coverage_slots |
| 19 | temporal_debuff | 跨槽减益输出 | value × slots | debuff_value × coverage_slots |

## 2. 效果类型 → 维度映射

> 当前由 `model-vector.ts` 实现；目标架构中由 `keyword.map.md` 的模型映射列定义。

model.md 中的 effect type 映射到维度：

| model.md effect | → dim | 映射规则 |
|-----------------|-------|---------|
| atk_increase | 2 | 直接值 |
| damage_increase | 3 | 直接值 |
| skill_damage_increase | 4 | 直接值 |
| skill_damage_deepen | 4 | 直接值（同维合并） |
| final_damage_deepen | 5 | 直接值 |
| crit_rate | 6 | 直接值 |
| guaranteed_resonance | 6=100, 7=value | 暴击率设满，倍率为值 |
| crit_damage | 7 | 直接值 |
| crit_upgrade | 7 | p × (upgrade - base) 加到期望 |
| extra_damage (flat) | 8 | 直接值 |
| percent_max_hp | 9 | 直接值 |
| scaling_damage (*_lost_hp) | 10 | 直接值 |
| scaling_damage (*_target_lost_hp) | 10 | 直接值（假设50%已损） |
| dot | 11 | dps × duration |
| dot_damage_increase | 11 | 乘法修正 |
| dot_frequency_increase | 11 | 乘法修正 |
| per_hit_escalation | 12 | value（cap 作为元数据） |
| probability_multiplier | 13 | Σ(p_i × mult_i) |
| probability_to_certain | 13 | 将同槽 prob_mult 提升至 max tier |
| buff_strength | 14 | 直接值 |
| buff_layer_increase | 14 | 折算为等效强度 |
| buff_duration_extend | 14 | 折算为等效强度 |
| duration_extend | 14 or 15 | 根据目标状态类型分配 |
| debuff_strength | 15 | 直接值 |
| debuff_layer_increase | 15 | 折算为等效强度 |
| healing_increase | 16 | 正值 |
| lifesteal | 16 | 正值 |
| healing_to_damage | 16 | 负值（减少敌方有效治疗） |
| debuff_apply (healing) | 16 | 负值 |
| damage_reduction | 17 | 正值 |
| shield_strength / shield_on_damage | 17 | 正值 |
| self_heal | 17 | 正值 |
| cross_slot_debuff | 19 | value × floor(duration / T_gap) |
| self_buff (with duration) | 18 | value × floor(duration / T_gap) |
| summon (with duration) | 18 | inherit% × floor(duration / T_gap) |

## 3. 时间依赖向量

时间序列按三个层级构建（详见 `design.md` §Three Composition Levels）：

```
Level 1 — 词缀: effects.yaml → 效果时间序列 (52D × T) → §2映射 → 模型时间序列 (20D × T)
Level 2 — 灵书: 4个词缀模型时间序列 → 编译 → 灵书模型时间序列 (20D × T)
Level 3 — 配置: 6本灵书模型时间序列 → 按槽位编译 + 跨槽传播 → 配置时间序列 (20D × 6)
```

52D 效果时间序列是基础——每个维度对应 `effect.types.md` 中的一种效果类型。
20D 模型时间序列由 52D 通过 §2 的映射规则程序化降维得到，而非重新从 about.md 提取。

以下定义 Level 3（配置级）的数学形式。

### 3.1 定义

设 T_gap = 6s，槽位 k ∈ {1,2,3,4,5,6}，释放时刻 t_k = (k-1) × T_gap。

每个灵书槽位 k 由 4 个词缀组成：
- 主技能 skill_k
- 主词缀 primary_k
- 副词缀1 sub1_k
- 副词缀2 sub2_k

每个词缀 a 的效果分为两类：

**即时效果** (scope = 本神通)：仅作用于本槽位

$$v^{instant}_a \in \mathbb{R}^D$$

**时序效果** (scope = 跨槽/下一神通)：生成持续状态，影响后续槽位

$$v^{temporal}_a(duration) \in \mathbb{R}^D$$

### 3.2 槽位向量计算

**本槽即时贡献**：

$$v^{self}_k = v^{instant}_{skill_k} + v^{instant}_{primary_k} + v^{instant}_{sub1_k} + v^{instant}_{sub2_k}$$

**接收的跨槽效果**（来自之前仍存活的时序效果）：

$$v^{received}_k = \sum_{j < k} \sum_{a \in slot_j} v^{temporal}_a \cdot \mathbb{1}[d_a > (k - j) \times T_{gap}]$$

其中 $d_a$ 为效果 a 的持续时间，$\mathbb{1}[\cdot]$ 为指示函数。

**槽位状态向量**：

$$s_k = v^{self}_k + v^{received}_k$$

### 3.3 完整时间序列

$$S = [s_1, s_2, s_3, s_4, s_5, s_6] \in \mathbb{R}^{6 \times D}$$

### 3.4 示例：叶钦组合二 Slot 2-3

**Slot 2** (大罗幻诀 + 心逐神随 + 心魔惑言):

```
v^self_2:
  dim 0 (base_damage) = 20265
  dim 1 (hit_count) = 5
  dim 13 (prob_mult) = 2.46  [心逐神随 E[X]]
  dim 15 (debuff_amp) = 100   [心魔惑言 层数+100%]

v^temporal_2:
  dim 19 (temporal_debuff): 命损 = 100 × 1 slot = 100  [8s / 6s = 1 slot covered]
```

**Slot 3** (皓月剑诀 + 玄心剑魄 + 无极剑阵):

```
v^self_3:
  dim 0 (base_damage) = 22305
  dim 1 (hit_count) = 10
  dim 4 (skill_dmg_mod) = 555  [无极剑阵]
  dim 9 (hp_pct_dmg) = 12      [12%/hit]
  dim 11 (dot_power) = 550 × 8 = 4400  [玄心剑魄]

v^received_3 (from Slot 2):
  dim 5 (final_dmg_mod) = +100  [命损: -100% DR → effective +100% final damage]
```

```
s_3 = v^self_3 + v^received_3
    → dim 0 = 22305, dim 4 = 555, dim 5 = 100, dim 9 = 12, dim 11 = 4400, ...
```

## 4. 聚合：时间序列 → 嵌入向量 (Step 2)

### 4.1 为什么聚合极其重要

聚合决定了嵌入向量保留哪些信息：
- 不同聚合 → 不同的相似度语义
- 聚合必须保留 **时序交互** 信息（跨槽增益是灵书配置的核心）
- 聚合必须使得"好的配置"和"差的配置"在嵌入空间中可区分

### 4.2 三层聚合

#### 层1：词缀嵌入 (position-aware)

词缀 a 在位置 k 的嵌入：

$$e_a(k) = v^{instant}_a + v^{temporal}_a \cdot coverage(k)$$

其中 $coverage(k) = \min(floor(d_a / T_{gap}),\ 6 - k)$ 为从位置 k 可覆盖的剩余槽位数。

这使得同一词缀在不同位置有不同嵌入：
- 命损 at Slot 1: coverage = 1, temporal_debuff = 100 × 1 = 100
- 命损 at Slot 2: coverage = 1, temporal_debuff = 100 × 1 = 100
- 仙佑 at Slot 1: coverage = 2, temporal_buff = 70 × 2 = 140
- 仙佑 at Slot 3: coverage = 2, temporal_buff = 70 × 2 = 140
- 仙佑 at Slot 5: coverage = 1, temporal_buff = 70 × 1 = 70

#### 层2：灵书嵌入 (single slot)

槽位 k 的灵书嵌入 = 其状态向量（含接收的跨槽效果）：

$$e_{book}(k) = s_k = v^{self}_k + v^{received}_k$$

#### 层3：配置嵌入 (full 6-slot set)

**方案 A：加权求和**

$$e_{set} = \sum_{k=1}^{6} w_k \cdot s_k$$

权重选项：
- 均匀: $w_k = 1/6$
- 角色优先: $w_{VITAL} > w_{PREP} > w_{ASSIST}$，如 $w = [0.12, 0.18, 0.25, 0.18, 0.15, 0.12]$
- 伤害加权: $w_k \propto D_{base,k}$（按基础伤害比例）

**方案 B：拼接 + 降维**

$$e_{set} = W \cdot [s_1; s_2; s_3; s_4; s_5; s_6]$$

其中 $W \in \mathbb{R}^{D \times 6D}$ 是降维矩阵。保留位置信息但需要训练数据。

**方案 C：统计聚合**

$$e_{set} = [mean(S), max(S), std(S)]$$

沿时间轴取均值、最大值、标准差，得到 3D 维向量。
- mean: 平均贡献水平
- max: 峰值能力
- std: 爆发-持续 分化程度（std 高 = 极端爆发型；std 低 = 均衡持续型）

### 4.3 推荐方案

**方案 C（统计聚合）** 最适合作为初始方案：

1. 不需要训练数据
2. 保留了时序特征（std 编码了 burst vs sustained）
3. 维度固定为 3D（60维），足够捕获配置差异
4. 可直接用于相似度和分类

具体来说：

$$e_{set} = \begin{bmatrix} \bar{s} \\ s_{max} \\ \sigma_s \end{bmatrix} \in \mathbb{R}^{3D}$$

其中：
- $\bar{s} = \frac{1}{6}\sum_k s_k$ — 平均战力轮廓
- $s_{max} = \max_k s_k$ — 峰值能力（沿每个维度）
- $\sigma_s = std_k(s_k)$ — 战力分布（爆发 vs 持续）

### 4.4 聚合的语义

| 查询 | 使用 |
|------|------|
| "找类似配置" | cos(e_set_A, e_set_B) |
| "我的配置和叶钦差在哪" | e_叶钦 - e_mine → 查看哪些维度差距大 |
| "burst vs sustained 分类" | std 分量：高 std → burst，低 std → sustained |
| "给定库存，最优配置" | 目标 e_target，搜索使 ‖e_set - e_target‖ 最小的合法配置 |
| "下一步该养什么" | 查看 e_target - e_current 中最大缺口的维度 → 对应需要的词缀 |

## 5. 从目标向量反向构建

给定目标 $e_{target}$（来自专家配置或理论推导）：

```
Input:  e_target ∈ ℝ^{3D}, inventory W
Output: 6-slot configuration

1. 分解目标: 从 e_target 的 mean 分量推导每个槽位的理想 s_k
   （利用 max 和 std 分量约束分配）

2. 对每个槽位 k（按优先级 3→1→2→4→5→6）:
   a. 从 W 中枚举 (main, sub1, sub2) 组合
   b. 计算 e_book(k) 含跨槽接收
   c. 选择使残差 ‖s_k^{target} - e_book(k)‖ 最小的组合
   d. 从 W 中标记已用书籍，检查冲突
   e. 更新后续槽位的 v^received（基于时序效果）

3. 输出配置 + 残差向量（缺口分析）
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-18 | Initial: 20D model space, effect → dimension mapping, time series, aggregation |
| 1.1 | 2026-02-19 | Restructured from tools/ to embedding/ |
| 1.2 | 2026-02-23 | Added model mapping provenance note (§2 → keyword.map.md target) |
