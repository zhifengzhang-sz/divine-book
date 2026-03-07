<!-- Generated from TypeScript registry — do not edit manually -->

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

# Keyword → Effect Type Mapping

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Language decoder for the Divine Book data pipeline.** This document maps Chinese keyword patterns in [about.md](../../data/raw/about.md) to canonical effect type names and field structures. It contains no numeric instances — it is purely a parsing specification that tells downstream code *how to read* the source text.
>
> **English version of** [`keyword.map.cn.md`](./keyword.map.cn.md). Chinese patterns are preserved verbatim — they are the data being mapped.

**Data source**: `data/raw/about.md` (sole source of truth)

**Conventions**:
- `{x}`, `{y}`, `{z}`, `{w}` = numeric variables
- `{n}` = count variable
- `{d}`, `{t}` = time variables (seconds)
- `{p}` = probability variable
- `{m}` = cap / multiplier variable
- `[name]` = state / affix name
- `[stat]` = attribute name
- `[condition]` = condition expression
- `(...)` = optional text (e.g., `共(计)` means 计 may or may not appear)
- Backtick usage in about.md is inconsistent; matching should ignore backticks
- A single affix text may contain multiple effect types (compound patterns); parsing should split them into independent effects

**Unit definitions** (unit identifiers used in the "Fields → Units" column):

| Unit | Meaning | Example values |
|:---|:---|:---|
| `%atk` | Percentage of attack power | 1500, 20265 |
| `%stat` | Percentage of a stat (generic stat modifier) | 15, 104 |
| `%max_hp` | Percentage of maximum HP | 12, 2.1 |
| `%lost_hp` | Percentage of lost HP | 16, 7 |
| `%current_hp` | Percentage of current HP | 10, 7 |
| `seconds` | Duration in seconds | 4, 8, 12 |
| `count` | Integer count | 1, 5, 10 |
| `probability` | Percentage chance (0–100) | 11, 25, 30 |
| `multiplier` | Multiplicative factor | 1.2, 1.4, 4 |
| `bool` | Boolean (true/false) | true, false |
| `string` | Text identifier | 灵涸, healing_received |
| `list` | List of sub-objects | — |

**Sign convention**: Debuff values that reduce a stat must be negative. `value=-31` means "reduced by 31%". Positive = buff/increase; negative = debuff/reduction.

---

## §0. Shared Mechanics (All Schools)

The Sword / Spell / Demon / Body schools share the following keyword patterns under their respective "shared mechanics" sections in about.md:

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `fusion_flat_damage` | `第{n}重：本神通增加{x}%攻击力的伤害` | `fusion_level`→count, `value`→%atk |
| `mastery_extra_damage` | `化境（融合{n}重）：本神通对目标额外造成{x}%攻击力的伤害` | `fusion_level`→count, `value`→%atk |
| `enlightenment_damage` | `每次融合使本神通增加{x}%攻击力的悟境伤害` | `value`→%atk |
| `cooldown` | `施法间隙：{x}秒` | `value`→seconds |

---

## §1. Base Damage

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `base_attack` | `{n}段共(计){x}%攻击力的灵法伤害` / `造成{x}%攻击力的灵法伤害` | `hits`→count (optional), `total`→%atk (optional) |
| `percent_max_hp_damage` | `每段攻击造成目标{x}%最大气血值的伤害（对怪物伤害不超过自身{z}%攻击力）` | `value`→%max_hp, `cap_vs_monster`→%atk |
| `shield_destroy_damage` | `湮灭敌方{n}个护盾，并额外造成{x}%敌方最大气血值的伤害（对怪物最多造成{y}%攻击力的伤害）；对无盾目标造成双倍伤害（对怪物最多造成{z}%攻击力的伤害）` | `shields_per_hit`→count, `percent_max_hp`→%max_hp, `cap_vs_monster`→%atk, `no_shield_double_cap`→%atk |

> **Pattern notes**:
> - `共计` and `共` (without 计) both appear in about.md; treat them as equivalent when matching.
> - 甲元仙符's primary skill has no hit-count modifier — it uses only `造成{x}%攻击力的灵法伤害` (single-hit variant).

---

## §2. Damage Multiplier Zones

| Effect Type | Chinese Pattern | Fields → Units | Notes |
|:---|:---|:---|:---|
| `attack_bonus` | `提升{x}%攻击力的效果` | `value`→%stat |  |
| `damage_increase` | `造成的伤害提升{x}%` / `伤害提升{x}%` / `提升{x}%伤害` | `value`→%stat |  |
| `skill_damage_increase` | `提升{x}%神通伤害` / `{x}%的神通伤害加深` | `value`→%stat |  |
| `enemy_skill_damage_reduction` | `目标对本神通提升{x}%神通伤害减免` | `value`→%stat |  |
| `final_damage_bonus` | `最终伤害加深提升{x}%` | `value`→%stat |  |
| `crit_damage_bonus` | `暴击伤害提升{x}%` / `致命伤害提升{x}%` | `value`→%stat |  |
| `technique_damage_increase` | `{x}%的技能伤害加深` | `value`→%stat | No data instances in normalized.data.md yet |
| `flat_extra_damage` | `(额外)造成{x}%攻击力的伤害` | `value`→%atk |  |

> **Multiplier zone hierarchy** (inferred from 奇能诡道 descriptions):
> - `伤害加深类` = { `神通伤害加深`, `技能伤害加深`, `最终伤害加深` }
> - `神通伤害加深` → `skill_damage_increase`
> - `技能伤害加深` → `technique_damage_increase`
> - `最终伤害加深` → `final_damage_bonus`
> - Bare `伤害` / `造成的伤害` → `damage_increase`

---

## §3. Resonance System (会心)

> **会心 ≠ 暴击.** The game has three distinct multiplier mechanics that were previously conflated under "Critical System." They are now separated into §3, §3b, and §3c. See the note at the end of §3c for details.

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `guaranteed_resonance` | `必定会心造成{x}倍伤害，并有{p}%概率将之提升至{y}倍` | `base_mult`→multiplier, `enhanced_mult`→multiplier, `enhanced_chance`→probability |

> **Mechanic**: 会心 (resonance) is a fixed multiplier on the entire skill's damage output. It is deterministic (always applies `base_mult`), with a probability-gated enhancement to `enhanced_mult`. No interaction with 暴击率 (crit rate) or 暴击伤害 (crit damage) stats. Examples: 【灵犀九重】(×2.97), 【通明】(×1.2).

---

## §3b. Synchrony System (心逐)

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `probability_multiplier` | `{p1}%概率提升{m1}倍，{p2}%概率提升{m2}倍，{p3}%概率提升{m3}倍` | `prob`→probability, `mult`→multiplier |

> **Mechanic**: 心逐 (synchrony) multiplies **ALL** skill effects (damage, healing, debuffs), not just damage. It is an outer wrapper applied after the damage chain. This is a separate multiplier zone from 会心.
>
> **Cumulative probability note**: `probability_multiplier` (心逐神随) percentages are cumulative thresholds, not independent probabilities. The 悟2境 data (x=60, y=80, z=100, sum 240% > 100%) confirms this reading. Meaning: z% chance of at least ×m3, y% chance of at least ×m2, x% chance of ×m1. Marginals: P(×m1)=x, P(×m2)=y−x, P(×m3)=z−y, P(no boost)=100−z.

---

## §3c. Standard Crit (暴击)

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `conditional_crit` | `若敌方[condition]...必定暴击` | `condition`→string |
| `conditional_crit_rate` | `暴击率提升{x}%` | `value`→probability, `condition`→string |

> **Mechanic**: Standard crit system — scales with 暴击率 (crit rate) and 暴击伤害 (crit damage) stats. Separate multiplier zone from 会心 (resonance). Both can coexist on the same 灵書 and multiply independently.
>
> **Note on `crit_damage_bonus`**: The `crit_damage_bonus` type in §2 (mapping `暴击伤害提升` / `致命伤害提升`) correctly belongs to this system. 致命伤害 and 暴击伤害 are synonyms for the same standard crit damage stat.

---

## §4. Conditional Triggers

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `conditional_damage` | `若敌方[condition]，则使本次伤害提升{x}%` / `攻击带有[state]的敌方时，(会使本次)伤害提升{x}%` / `伤害提升{x}%，若[condition]，(伤害提升效果)进一步提升至{y}%` | `value`→%stat, `condition`→string, `escalated_value`→%stat (optional) |
| `conditional_buff` | `在神通悟境(的条件下)：本神通附加[stat]的伤害提高{x}%，并(且/使)造成的伤害提升{y}%` | `condition`→string, `damage_increase`→%stat (optional), `percent_max_hp_increase`→%stat (optional), `percent_lost_hp_increase`→%stat (optional) |
| `probability_to_certain` | `概率触发效果提升为必定触发` | *(no fields)* |
| `ignore_damage_reduction` | `无视敌方所有伤害减免效果` | *(no fields)* |

> **`conditional_buff` variable stat fields** (canonical names for the stat being modified):
> - `附加目标最大气血的伤害提高` → `percent_max_hp_increase`
> - `附加自身已损气血的伤害提高` → `percent_lost_hp_increase`
> - `造成的伤害提升` → `damage_increase`

---

## §5. Per-Hit Escalation

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `per_hit_escalation` | `每造成1段伤害，剩余段数[stat]提升{x}%，最多提升{m}%` / `每段攻击造成伤害后，下一段提升{x}%[stat]` | `value`→%stat, `stat`→string, `max`→%stat (optional) |
| `periodic_escalation` | `每造成{n}次伤害时，(接下来的/剩余)伤害提升{m}倍，(单次伤害)至多被该效果重复加成{s}次` | `every_n_hits`→count, `multiplier`→multiplier, `max_stacks`→count |

> **`stat` field values**:
> - `damage` — per-hit damage (corresponds to 伤害提升)
> - `skill_bonus` — skill bonus (corresponds to 神通加成)

---

## §6. HP-Based Calculations

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `per_self_lost_hp` | `自身每多损失1%最大气血值，会使本次伤害提升{x}%` | `per_percent`→%stat |
| `per_enemy_lost_hp` | `敌方每多损失1%最大(值)气血值，会使本次伤害提升{x}%` | `per_percent`→%stat |
| `min_lost_hp_threshold` | `(根据自身已损气血值计算伤害时)至少按已损{x}%计算` | `value`→%lost_hp |
| `self_hp_cost` | `消耗自身{x}%当前气血值` | `value`→%current_hp |
| `self_lost_hp_damage` | `额外对其造成自身{x}%已损失气血值的伤害` | `value`→%lost_hp, `on_last_hit`→bool (optional), `heal_equal`→bool (optional) |
| `self_damage_taken_increase` | `施放期间自身受到的伤害(也)提升{x}%` | `value`→%stat |

> **Modifier keywords**:
> - `等额恢复自身气血` → append `heal_equal: true`
> - `在神通的最后` → append `on_last_hit: true`

---

## §7. Healing and Survival

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `lifesteal` | `{x}%的吸血效果` / `恢复...造成伤害{x}%的气血值` | `value`→%stat |
| `healing_to_damage` | `造成治疗效果时，会对敌方额外造成治疗量{x}%的伤害` | `value`→%stat |
| `healing_increase` | `(所有)治疗效果提升{x}%` / `提升自身{x}%的治疗量` | `value`→%stat |
| `self_damage_reduction_during_cast` | `(会在)施放期间提升自身{x}%的伤害减免` | `value`→%stat |

---

## §8. Shield System

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `shield_strength` | `护盾值提升{x}%` | `value`→%stat |
| `on_shield_expire` | `护盾消失时，会对敌方额外造成护盾值{x}%的伤害` | `damage_percent_of_shield`→%stat |
| `damage_to_shield` | `获得1个本次神通伤害值的{x}%的护盾，护盾持续{d}秒` | `value`→%stat, `duration`→seconds |

---

## §9. State Modifiers

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `buff_strength` | `增益效果强度提升{x}%` | `value`→%stat |
| `debuff_strength` | `减益效果强度提升{x}%` | `value`→%stat |
| `buff_duration` | `增益(状态)持续时间延长{x}%` | `value`→%stat |
| `all_state_duration` | `所有状态(效果)持续时间延长{x}%` | `value`→%stat |
| `buff_stack_increase` | `增益状态层数增加{x}%` | `value`→%stat |
| `debuff_stack_increase` | `减益状态层数增加{x}%` | `value`→%stat |
| `debuff_stack_chance` | `有{x}%概率额外多附加1层该减益状态` | `value`→probability |

---

## §10. Damage over Time (DoT)

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `dot` | `每{t}秒(造成/受到){x}%攻击力的伤害，持续{d}秒` / `每{t}秒额外造成目标{x}%[hp_type]的伤害，持续{d}秒` | `tick_interval`→seconds, `duration`→seconds, `damage_per_tick`→%atk (optional), `percent_current_hp`→%current_hp (optional), `percent_lost_hp`→%lost_hp (optional), `max_stacks`→count (optional) |
| `shield_destroy_dot` | `每{t}秒对目标造成湮灭护盾的总个数*{x}%攻击力的伤害（若...敌方无护盾加持，则计算湮灭{n}个护盾）` | `tick_interval`→seconds, `per_shield_damage`→%atk, `no_shield_assumed`→count |
| `dot_extra_per_tick` | `持续伤害触发时，额外造成目标{x}%已损失气血值的伤害` | `value`→%lost_hp |
| `dot_damage_increase` | `持续伤害上升{x}%` / `持续伤害提升{x}%` | `value`→%stat |
| `dot_frequency_increase` | `持续伤害效果触发间隙缩短{x}%` | `value`→%stat |
| `extended_dot` | `技能结束后...额外持续存在{x}秒，每{t}秒造成一次伤害` | `extra_seconds`→seconds, `tick_interval`→seconds |
| `on_dispel` | `若被驱散，立即受到{x}%攻击力的伤害，并眩晕{d}秒` | `damage`→%atk (optional), `stun`→seconds (optional) |

> **`[hp_type]` field values**:
> - `当前气血值` → `percent_current_hp`
> - `已损失气血值` → `percent_lost_hp`
>
> **Inference flag**: `shield_destroy_dot` (碎魂剑意) — the formula structure, specifically how "total number of annihilated shields" accumulates across ticks and whether already-expired shields are counted, is not precisely defined in about.md.

---

## §11. Self Buffs

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `self_buff` | `获得[name](状态)，提升自身{x}%的[stats]，持续{d}秒` / `[name]上限{n}层，持续{d}秒` | `duration`→seconds, `max_stacks`→count (optional), `attack_bonus`→%stat (optional), `defense_bonus`→%stat (optional), `hp_bonus`→%stat (optional), `damage_reduction`→%stat (optional), `healing_bonus`→%stat (optional) |
| `self_buff_extend` | `延长{x}秒[name]持续时间` | `buff_name`→string, `value`→seconds |
| `self_buff_extra` | `[name]状态额外使自身获得{x}%[stat]` | `buff_name`→string (optional), `healing_bonus`→%stat (optional), `value`→%stat (optional) |
| `counter_buff` | `每秒对目标反射自身所受到伤害值的{x}%与自身{y}%已损失气血值的伤害，持续{d}秒` | `duration`→seconds, `reflect_received_damage`→%stat (optional), `reflect_percent_lost_hp`→%lost_hp (optional) |
| `next_skill_buff` | `(使)下一个施放的神通(释放时)额外获得{x}%的神通伤害加深` | `stat`→string, `value`→%stat |
| `enlightenment_bonus` | `悟境等级加{x}（最高不超过{m}级）` | `value`→count, `max`→count |

> **`self_buff` attribute keywords**:
> - `攻击力(加成)` → `attack_bonus`
> - `守御(加成)` → `defense_bonus`
> - `最大气血值` → `hp_bonus`
> - `伤害减免` → `damage_reduction`
> - `治疗(加成)` → `healing_bonus`

---

## §12. Debuffs

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `debuff` | `对敌方添加持续{d}秒的[name]：[stat]降低{x}%` | `target`→string, `value`→%stat, `duration`→seconds, `dispellable`→bool (optional) |
| `conditional_debuff` | `若敌方[condition]...[stat](降低/减少/增至){x}%` / `在神通悟境的条件下：...对目标施加[name]：[stat]减少{x}(倍/%)...` | `condition`→string, `target`→string, `value`→%stat, `duration`→seconds (optional), `per_hit`→bool (optional) |
| `cross_slot_debuff` | `受到攻击时，额外给目标附加[name]：[stat]减低{x}%，持续{d}秒` | `target`→string, `value`→%stat, `duration`→seconds, `trigger`→string |
| `counter_debuff` | `受到伤害时，各有{x}%概率对攻击方添加{n}层[name]...最多叠加{n}层...持续{d}秒` | `duration`→seconds, `on_attacked_chance`→probability, `max_stacks`→count (optional) |
| `counter_debuff_upgrade` | `[原效果](状态下附加异常)概率提升至{x}%` | `on_attacked_chance`→probability |

> **`target` field values** (debuff target attributes):
> - `治疗量` → `healing_received`
> - `伤害减免` → `damage_reduction`
> - `最终伤害减免` → `final_damage_reduction`
>
> **`无法被驱散`** → `dispellable: false`
>
> **Non-numeric `duration`**: `与触发的增益状态相同` → `duration=same_as_trigger`

---

## §13. Special Mechanics

### §13.1 Summons and Clones

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `summon` | `持续存在{d}秒的分身，继承自身{x}%的属性...分身受到的伤害为自身的{y}%` | `inherit_stats`→%stat, `duration`→seconds, `damage_taken_multiplier`→%stat |
| `summon_buff` | `分身受到伤害降低至自身的{x}%，造成的伤害增加{y}%` | `damage_taken_reduction_to`→%stat, `damage_increase`→%stat |

### §13.2 Untargetable State

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `untargetable_state` | `在{d}秒内不可被选中` | `duration`→seconds |

### §13.3 Dispel and Crowd Control

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `periodic_dispel` | `每秒驱散敌方{n}个增益状态，持续{d}秒...每驱散一个状态(对敌方)造成本神通{x}%的灵法伤害，若无驱散状态(，则)造成双倍伤害` | `interval`→seconds, `duration`→seconds, `damage_percent_of_skill`→%stat, `no_buff_double`→bool |
| `periodic_cleanse` | `每秒有{x}%概率驱散自身所有控制状态，{d}秒内最多触发{n}次` | `chance`→probability, `interval`→seconds, `cooldown`→seconds, `max_triggers`→count |

### §13.4 Delayed Burst

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `delayed_burst` | `施加[name]，持续{d}秒。期间敌方受到的神通伤害增加{y}%，(并且)时间结束时，对目标造成{z}%期间提升的伤害+{w}%攻击力的伤害` | `duration`→seconds, `damage_increase_during`→%stat, `burst_base`→%atk, `burst_accumulated_pct`→%stat |
| `delayed_burst_increase` | `[name]状态结束时的伤害提升{x}%` | `value`→%stat |

### §13.5 Random Effects

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `random_buff` | `获得以下任意1个加成：[效果列表]` | `options`→string (optional) |
| `random_debuff` | `对敌方添加以下任意1个减益效果：[效果列表]` | `options`→string (optional) |
| `attack_reduction` | `攻击降低{x}%` | `value`→%stat |
| `crit_rate_reduction` | `暴击率降低{x}%` | `value`→%stat |
| `crit_damage_reduction` | `暴击伤害降低{x}%` | `value`→%stat |

### §13.6 Stack-Based Damage

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `per_buff_stack_damage` | `(自身)每{n}层增益状态，提升{x}%伤害，最大提升{m}%` | `per_n_stacks`→count, `value`→%stat, `max`→%stat |
| `per_debuff_stack_damage` | `(敌方)每(有){n}层减益状态...伤害提升{x}%，最大(提升){m}%` | `per_n_stacks`→count, `value`→%stat, `max`→%stat, `dot_half`→bool (optional) |
| `per_debuff_stack_true_damage` | `目标每有1层减益状态...额外造成目标{x}%最大气血值的真实伤害，最多(造成){m}%最大气血值的真实伤害` | `per_stack`→%max_hp, `max`→%max_hp |

### §13.7 Other Triggers

| Effect Type | Chinese Pattern | Fields → Units |
|:---|:---|:---|
| `on_buff_debuff_shield_trigger` | `每次施加增益/减益状态或添加护盾时，(引动真雷轰击敌方，)造成一次本神通{x}%的灵法伤害` | `damage_percent_of_skill`→%stat |
| `conditional_heal_buff` | `(命中时，)若敌方具有减益状态，则提升自身{x}%的治疗量，持续{d}秒` | `condition`→string, `value`→%stat, `duration`→seconds |

> **Random effect option keywords**:
> - `攻击提升{x}%` → `attack_bonus`
> - `致命伤害提升{x}%` → `crit_damage_bonus`
> - `造成的伤害提升{x}%` → `damage_increase`
> - `攻击降低{x}%` → `attack_reduction`
> - `暴击率降低{x}%` → `crit_rate_reduction`
> - `暴击伤害降低{x}%` → `crit_damage_reduction`
>
> **`dot_half`** corresponds to the keyword: `持续伤害效果受一半伤害加成`

---

## Condition Vocabulary

Mapping of Chinese keywords to canonical `condition` field values:

| Chinese Pattern | condition Value |
|:---|:---|
| `敌方处于控制效果` / `敌方处于控制状态` | `target_controlled` |
| `敌方气血值低于{x}%` | `target_hp_below_{x}` |
| `(攻击)带有减益状态的敌方` / `敌方具有减益状态` | `target_has_debuff` |
| `目标不存在任何治疗状态` | `target_has_no_healing` |
| `在神通悟境(悟{n}境)的条件下` | `enlightenment_{n}` / `enlightenment_max` |

---

## Data State Vocabulary

When about.md explicitly annotates the cultivation stage a value belongs to, the corresponding `data_state` field is:

| Chinese Annotation | data_state Value |
|:---|:---|
| `悟10境` (default maximum) | *(omitted; this is the default)* |
| `悟0境` / `没有悟境` / `数据为没有悟境的情况` | `enlightenment=0` |
| `悟{n}境` (n ≠ 10 and n ≠ 0) | `enlightenment={n}` |
| `最高融合加成` / `受融合影响，数据为最高融合加成` | `max_fusion` |
| `融合{n}重` | `fusion={n}` |
| `此功能未解锁` / `此词缀未解锁` | `locked` |

> **Default values vary by school** (per about.md):
> - Sword / Demon: `没有标识的数据为悟境最高加成` — unlabeled values default to maximum enlightenment.
> - Body: `没有标识的数据为没有悟境的情况` — unlabeled values default to no enlightenment.
> - Spell: states only `数值受悟境影响`; no explicit default declared.
> - Demon additionally states: `主技能效果受悟境影响，也可能受修炼阶数影响`.

---

## Unresolved Formulas

The following game-mechanic-level details from about.md lack precise formulas and must be treated as assumptions during modeling:

1. **`神通加成` (skill bonus)** — The exact calculation of `提升{x}%神通加成` in 惊神剑光 is undefined. Mapped as the `stat: skill_bonus` field value in `per_hit_escalation`, but the formula by which `skill_bonus` converts to final damage is unknown.

2. **`灵法伤害` (spirit-art damage) and `灵法防御` (spirit-art defense)** — `灵法伤害` is the damage-type label on all skills. Whether a corresponding `灵法防御` damage-reduction attribute exists is unknown.

3. **`守御` (defense) attribute** — Referenced in 甲元仙符【仙佑】as `守御加成`, mapped to `self_buff.defense_bonus`. The precise damage-reduction formula is unknown.

4. **Multiplier zone resolution order** — The priority and additive-vs-multiplicative relationships among `伤害加深` / `神通伤害加深` / `最终伤害加深` / `伤害减免` / `最终伤害减免` are unknown.

5. **碎魂剑意 "total annihilated shields" accumulation rule** — Per-tick damage = total count x {x}% ATK, but the accumulation method for "total count" (whether it resets across ticks, how shieldless targets are counted) is only partially described; the complete formula is undefined.

6. **心逐神随 cumulative probabilities** — ~~Resolved~~. The 悟2境 data (x=60, y=80, z=100, sum 240%) confirms percentages are cumulative thresholds. At 悟0境, 49% (=100−z=100−51) is the no-boost probability; at 悟2境, 0% (=100−100) means guaranteed at least ×2.
