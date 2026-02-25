---
initial date: 2026-2-18
dates of modification: [2026-2-19]
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

# 灵书模型参数

**Authors:** Z. Zhang & Claude Sonnet 4.5 (Anthropic)

> 从 `剑九/about.md` 提取的结构化效果参数。每行一个效果，同一词缀可跨多行。
>
> **Where these parameters come from:** [domain.md](domain.md) §5–6 explains what effects are, how the 52 effect types collapse into 20 model dimensions, and the mapping rules. [embedding.md](embedding.md) §2 has the complete type → dimension mapping table.
>
> 本文件由 AI 翻译生成，供程序解析和人工审阅。

## 通用词缀

| 词缀 | effect | value | condition | scope | data_state |
|------|--------|-------|-----------|-------|------------|
| 咒书 | debuff_strength | 20% | — | 本神通 | — |
| 清灵 | buff_strength | 20% | — | 本神通 | — |
| 业焰 | duration_extend | 69% | — | 本神通 | max_fusion |
| 击瑕 | damage_increase | 40% | target_controlled | 本神通 | — |
| 破竹 | per_hit_escalation | 1%/hit | max:10% | 本神通 | — |
| 金汤 | damage_reduction | 10% | casting | 本神通 | — |
| 怒目 | damage_increase | 20% | target_hp<30% | 本神通 | — |
| 怒目 | crit_rate | 30% | target_hp<30% | 本神通 | — |
| 鬼印 | extra_damage | 2% target_lost_hp | dot_tick | 本神通 | — |
| 福荫 | random_one_of | atk+20% / crit_dmg+20% / dmg+20% | — | 本神通 | — |
| 战意 | scaling_damage | 0.5%/1%_self_lost_hp | — | 本神通 | — |
| 斩岳 | extra_damage | 2000% atk | — | 本神通 | — |
| 吞海 | scaling_damage | 0.4%/1%_target_lost_hp | — | 本神通 | — |
| 灵盾 | shield_strength | 20% | — | 本神通 | — |
| 灵威 | skill_damage_deepen | 118% | — | 下一神通 | max_fusion |
| 摧山 | atk_increase | 20% | — | 本神通 | — |
| 通明 | guaranteed_crit | 1.2x | — | 本神通 | — |
| 通明 | crit_upgrade | 1.5x | 25% chance | 本神通 | — |

## 修为词缀

### 剑修

| 词缀 | effect | value | condition | scope | data_state |
|------|--------|-------|-----------|-------|------------|
| 摧云折月 | atk_increase | 55% | — | 本神通 | — |
| 灵犀九重 | guaranteed_crit | 2.97x | — | 本神通 | max_fusion |
| 灵犀九重 | crit_upgrade | 3.97x | 25% chance | 本神通 | max_fusion |
| 破碎无双 | atk_increase | 15% | — | 本神通 | — |
| 破碎无双 | damage_increase | 15% | — | 本神通 | — |
| 破碎无双 | crit_damage | 15% | — | 本神通 | — |
| 心火淬锋 | per_hit_escalation | 5%/hit | max:50% | 本神通 | — |

### 法修

| 词缀 | effect | value | condition | scope | data_state |
|------|--------|-------|-----------|-------|------------|
| 长生天则 | healing_increase | 50% | — | 本神通 | — |
| 明王之路 | final_damage_deepen | 50% | — | 本神通 | — |
| 天命有归 | probability_to_certain | all | — | 本神通 | — |
| 天命有归 | damage_increase | 50% | — | 本神通 | — |
| 景星天佑 | random_one_of | atk+55% / crit_dmg+55% / dmg+55% | — | 本神通 | — |

### 魔修

| 词缀 | effect | value | condition | scope | data_state |
|------|--------|-------|-----------|-------|------------|
| 瑶光却邪 | healing_to_damage | 50% | on_heal | 本神通 | — |
| 溃魂击瑕 | damage_increase | 100% | target_hp<30% | 本神通 | — |
| 溃魂击瑕 | guaranteed_crit | auto | target_hp<30% | 本神通 | — |
| 玄女护心 | shield_on_damage | 50% of_damage_dealt | — | 本神通 | — |
| 玄女护心 | shield_duration | 8s | — | 本神通 | — |
| 祸星无妄 | random_one_of_debuff | atk-20% / crit_rate-20% / crit_dmg-50% | — | 本神通 | — |

### 体修

| 词缀 | effect | value | condition | scope | data_state |
|------|--------|-------|-----------|-------|------------|
| 金刚护体 | damage_reduction | 55% | casting | 本神通 | — |
| 破灭天光 | extra_damage | 2500% atk | — | 本神通 | — |
| 青云灵盾 | shield_strength | 50% | — | 本神通 | — |
| 贪狼吞星 | scaling_damage | 1%/1%_target_lost_hp | — | 本神通 | — |
| 意坠深渊 | lost_hp_floor | 11% | — | 本神通 | — |
| 意坠深渊 | damage_increase | 50% | — | 本神通 | — |

## 专属词缀

### 剑修

| 功法 | 词缀 | effect | value | condition | scope | data_state |
|------|------|--------|-------|-----------|-------|------------|
| 千锋聚灵剑 | 天哀灵涸 | debuff_apply | healing-31% | — | 本神通 | — |
| 千锋聚灵剑 | 天哀灵涸 | debuff_duration | 8s | — | 本神通 | — |
| 千锋聚灵剑 | 天哀灵涸 | undispellable | true | — | 本神通 | — |
| 春黎剑阵 | 玄心剑魄 | dot | 550%atk/s | — | 本神通 | — |
| 春黎剑阵 | 玄心剑魄 | dot_duration | 8s | — | 本神通 | — |
| 春黎剑阵 | 玄心剑魄 | on_dispel_damage | 3300% atk | on_dispel | 本神通 | — |
| 春黎剑阵 | 玄心剑魄 | on_dispel_stun | 2s | on_dispel | 本神通 | — |
| 皓月剑诀 | 追神真诀 | extra_damage | 26.5% target_lost_hp | dot_tick | 本神通 | — |
| 皓月剑诀 | 追神真诀 | max_hp_damage_increase | 50% | enlightenment>=10 | 本神通 | enlightenment_10 |
| 皓月剑诀 | 追神真诀 | damage_increase | 300% | enlightenment>=10 | 本神通 | enlightenment_10 |
| 念剑诀 | 仙露护元 | buff_duration_extend | 300% | — | 本神通 | max_fusion |
| 通天剑诀 | 神威冲云 | ignore_damage_reduction | all | — | 本神通 | — |
| 通天剑诀 | 神威冲云 | damage_increase | 36% | — | 本神通 | — |
| 新-青元剑诀 | 天威煌煌 | skill_damage_deepen | 50% | — | 下一神通 | — |
| 无极御剑诀 | 无极剑阵 | skill_damage_increase | 555% | — | 本神通 | — |
| 无极御剑诀 | 无极剑阵 | target_skill_damage_reduction | 350% | — | 本神通 | — |

### 法修

| 功法 | 词缀 | effect | value | condition | scope | data_state |
|------|------|--------|-------|-----------|-------|------------|
| 浩然星灵诀 | 龙象护身 | buff_strength | 104% | — | 本神通 | — |
| 元磁神光 | 真极穿空 | buff_layer_increase | 100% | — | 本神通 | — |
| 元磁神光 | 真极穿空 | scaling_damage | 5.5%/5layers | max:27.5% (25layers) | 本神通 | — |
| 周天星元 | 奇能诡道 | debuff_extra_layer | 20% chance | — | 本神通 | — |
| 周天星元 | 奇能诡道 | apply_reverse_debuff | -0.6x dr_type | enlightened + buff_is_damage_deepen | 本神通 | enlightened |
| 甲元仙符 | 天倾灵枯 | debuff_apply | healing-31% | — | 本神通 | — |
| 甲元仙符 | 天倾灵枯 | debuff_duration | 20s | — | 本神通 | — |
| 甲元仙符 | 天倾灵枯 | debuff_enhance | healing-51% | target_hp<30% | 本神通 | — |
| 星元化岳 | 仙灵汲元 | lifesteal | 55% | — | 本神通 | — |
| 玉书天戈符 | 天人合一 | enlightenment_increase | +1 | max:3 | 本神通 | — |
| 玉书天戈符 | 天人合一 | damage_increase | 5% | — | 本神通 | — |
| 九天真雷诀 | 九雷真解 | on_state_apply_damage | 50.8% skill_damage | on_buff/debuff/shield | 本神通 | — |

### 魔修

| 功法 | 词缀 | effect | value | condition | scope | data_state |
|------|------|--------|-------|-----------|-------|------------|
| 天魔降临咒 | 引灵摘魂 | damage_increase | 104% | target_has_debuff | 本神通 | — |
| 天轮魔经 | 心魔惑言 | debuff_layer_increase | 100% | — | 本神通 | — |
| 天轮魔经 | 心魔惑言 | scaling_damage | 5.5%/5layers | max:27.5% (25layers), dot_half | 本神通 | — |
| 天剎真魔 | 魔骨明心 | healing_increase | 90% | target_has_debuff | 本神通 | — |
| 天剎真魔 | 魔骨明心 | healing_duration | 8s | target_has_debuff | 本神通 | — |
| 天剎真魔 | 魔骨明心 | target_final_dr_reduction | 20% | enlightened | 本神通 | enlightened |
| 天剎真魔 | 魔骨明心 | debuff_duration | 1s | enlightened | 本神通 | enlightened |
| 解体化形 | 心逐神随 | probability_multiplier | 11%->4x, 31%->3x, 51%->2x | — | 本神通 | — |
| 大罗幻诀 | 古魔之魂 | dot_damage_increase | 104% | — | 本神通 | — |
| 焚圣真魔咒 | 天魔真解 | dot_frequency_increase | 50.5% | — | 本神通 | — |
| 无相魔劫咒 | 无相魔威 | debuff_apply | healing-40.8% | — | 本神通 | — |
| 无相魔劫咒 | 无相魔威 | debuff_duration | 8s | — | 本神通 | — |
| 无相魔劫咒 | 无相魔威 | damage_increase | 105% | — | 本神通 | — |
| 无相魔劫咒 | 无相魔威 | damage_increase | 205% | target_has_no_healing | 本神通 | — |

### 体修

| 功法 | 词缀 | effect | value | condition | scope | data_state |
|------|------|--------|-------|-----------|-------|------------|
| 玄煞灵影诀 | 怒血战意 | scaling_damage | 2%/1%_self_lost_hp | — | 本神通 | — |
| 惊蛰化龙 | 紫心真诀 | extra_damage | 2.1%_target_max_hp/debuff_layer | max:21% (10layers) | 本神通 | — |
| 惊蛰化龙 | 紫心真诀 | lost_hp_damage_increase | 50% | enlightened | 本神通 | enlightened |
| 惊蛰化龙 | 紫心真诀 | damage_increase | 75% | enlightened | 本神通 | enlightened |
| 十方真魄 | 破釜沉舟 | skill_damage_increase | 380% | — | 本神通 | fusion_54 |
| 十方真魄 | 破釜沉舟 | self_damage_taken_increase | 50% | casting | 本神通 | — |
| 疾风九变 | 真言不灭 | duration_extend | 55% | — | 本神通 | — |
| 煞影千幻 | 乘胜逐北 | damage_increase | 100% | target_controlled | 本神通 | — |
| 九重天凤诀 | 玉石俱焚 | on_shield_expire_damage | 100% shield_value | on_shield_expire | 本神通 | — |
| 天煞破虚诀 | 天煞破虚 | dispel_buff | 1/s | — | 本神通 | — |
| 天煞破虚诀 | 天煞破虚 | dispel_duration | 10s | — | 本神通 | — |
| 天煞破虚诀 | 天煞破虚 | on_dispel_damage | 25.5% skill_damage | on_dispel | 本神通 | — |
| 天煞破虚诀 | 天煞破虚 | on_dispel_damage | 51% skill_damage | no_buff_to_dispel | 本神通 | — |

## 主词缀

| 功法 | 词缀 | effect | value | condition | scope | data_state |
|------|------|--------|-------|-----------|-------|------------|
| 千锋聚灵剑 | 惊神剑光 | per_hit_escalation | 25% skill_bonus | — | 本神通 | enlightenment_3 |
| 春黎剑阵 | 幻象剑灵 | summon_damage_taken_reduction | to 120% | — | 本神通 | — |
| 春黎剑阵 | 幻象剑灵 | summon_damage_increase | 200% | — | 本神通 | — |
| 皓月剑诀 | 碎魂剑意 | periodic_damage | shields_destroyed x 600%atk | per 0.5s during 寂灭剑心 | 本神通 | — |
| 皓月剑诀 | 碎魂剑意 | shield_destroy_floor | 2 | no_shield_on_target | 本神通 | — |
| 念剑诀 | 雷阵剑影 | extended_duration | 6.5s | after_skill | 本神通 | — |
| 念剑诀 | 雷阵剑影 | periodic_damage | per 0.5s | after_skill | 本神通 | — |
| 甲元仙符 | 天光虹露 | healing_bonus | 70% | 仙佑 active | 本神通 | enlightenment_1 |
| 大罗幻诀 | 魔魂咒界 | counter_proc_rate | 60% | on_hit_received | 本神通 | — |
| 大罗幻诀 | 魔魂咒界 | cross_slot_debuff | final_dr-100% | on_hit_received, 60% | 跨槽 8s | — |
| 无相魔劫咒 | 灭劫魔威 | delayed_burst_increase | 65% | on_魔劫_expire | 本神通 | — |
| 十方真魄 | 星猿弃天 | buff_duration_extend | 3.5s | — | 本神通 | — |
| 十方真魄 | 星猿弃天 | self_cleanse | 30%/s | — | 本神通 | — |
| 十方真魄 | 星猿弃天 | self_cleanse_limit | 1 per 25s | — | 本神通 | — |
| 疾风九变 | 星猿复灵 | lifesteal | 82% | from 极怒 damage | 本神通 | — |

## 主技能

| 功法 | base_damage | hits | effect | value | condition | data_state |
|------|-------------|------|--------|-------|-----------|------------|
| 千锋聚灵剑 | 11265% | 6 | percent_max_hp | 15%/hit | — | max_enlightenment |
| 千锋聚灵剑 | — | — | percent_max_hp_cap | 3000%atk/hit vs monster | — | — |
| 春黎剑阵 | 22305% | 5 | summon | inherit 54%, 16s | — | max_enlightenment |
| 春黎剑阵 | — | — | summon_damage_taken | 400% | — | — |
| 皓月剑诀 | 22305% | 10 | shield_destroy | 1/hit | — | max_enlightenment |
| 皓月剑诀 | — | — | percent_max_hp | 12%/hit | — | — |
| 皓月剑诀 | — | — | percent_max_hp_cap | 2400%atk/hit vs monster | — | — |
| 皓月剑诀 | — | — | double_damage | vs unshielded | no_shield_on_target | — |
| 皓月剑诀 | — | — | percent_max_hp_cap_double | 4800%atk/hit vs monster | no_shield_on_target | — |
| 皓月剑诀 | — | — | self_buff | 寂灭剑心 1 stack, 4s | — | — |
| 念剑诀 | 22305% | 8 | periodic_escalation | 1.4x/2hits | max:10x | max_enlightenment |
| 念剑诀 | — | — | self_buff | untargetable 4s | — | — |
| 甲元仙符 | 20310% | — | self_buff | atk+70%, def+70%, hp+70%, 12s | — | enlightenment_7 |
| 大罗幻诀 | 20265% | 5 | self_buff | 罗天魔咒 8s | — | max_enlightenment |
| 大罗幻诀 | — | — | counter_debuff | 噬心之咒: 7%current_hp/0.5s, 4s | on_hit_30% | — |
| 大罗幻诀 | — | — | counter_debuff | 断魂之咒: 7%lost_hp/0.5s, 4s | on_hit_30% | — |
| 大罗幻诀 | — | — | counter_debuff_cap | 5 stacks each | — | — |
| 无相魔劫咒 | 1500% | 5 | delayed_burst | 10% of boosted dmg + 5000%atk | after 12s | no_enlightenment |
| 无相魔劫咒 | — | — | target_debuff | skill_dmg_taken+10%, 12s | — | — |
| 十方真魄 | 1500% | 10 | self_hp_cost | 10% current_hp | — | no_enlightenment |
| 十方真魄 | — | — | extra_damage | 16% self_lost_hp | last_hit | — |
| 十方真魄 | — | — | self_heal | equal to last_hit damage | last_hit | — |
| 十方真魄 | — | — | self_buff | atk+20%, dr+20%, 4s | — | — |
| 疾风九变 | 1500% | 10 | self_hp_cost | 10% current_hp | — | no_enlightenment |
| 疾风九变 | — | — | self_buff | 极怒: reflect 50%dmg_taken + 15%lost_hp/s, 4s | — | — |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-18 | Initial: structured effect parameters in tabular format |
| 1.1 | 2026-02-19 | Restructured from tools/ to embedding/ |
