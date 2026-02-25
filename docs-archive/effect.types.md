---
initial date: 2026-2-18
dates of modification: [2026-2-18, 2026-2-19, 2026-2-24]
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

# Effect Type Vocabulary

**Authors:** Z. Zhang & Claude Sonnet 4.5 (Anthropic)

> **Derived from [`keyword.map.md`](keyword.map.md).** This document is an output-side quick-reference. For the authoritative specification — including Chinese patterns, unit definitions, R/O markers, and extraction rules — see `keyword.map.md`. In case of conflict, `keyword.map.md` takes precedence.

---

Defines the canonical set of effect types used in `data/effects.yaml`.
All entries in `effects.yaml` must use only the types listed here.

Structural contract: `lib/schemas/effects.ts` (`EffectsDataSchema`) validates effects.yaml on load.
Content contract: this document defines the allowed type strings and required fields.

Source: [灵书数据全览.md](./灵书数据全览.md)

---

## Unit Definitions

| unit tag | meaning |
|---|---|
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

---

## Mapping Convention: 段 → hits

In [灵书数据全览.md](./灵书数据全览.md), the number of hits is expressed as 段 (e.g. 六段 = 6 hits).
The field name `hits` always maps from 段 in the source text.

**Assumption:** each 段 occupies exactly 1 second.
Therefore: `cast_duration (seconds) = hits × 1s`

This is not stored as a separate field — it is always derived from `hits`.
All per-hit effects fire at t = 0, 1, 2, ... (hits − 1) seconds from cast start.

---

## Section A — Instant Effects

Active only at cast time. No `duration` field.

| type | field | unit | R/O |
|---|---|---|---|
| **`base_attack`** | `hits` | count — mapped from 段 | R |
| | `duration_per_hit` | seconds — always 1 (1段 = 1s) | R |
| | `total` | %atk | R |
| **`attack_bonus`** | `value` | %stat | R |
| **`damage_increase`** | `value` | %stat | R |
| **`skill_damage_increase`** | `value` | %stat | R |
| **`enemy_skill_damage_reduction`** | `value` | %stat | R |
| **`final_damage_bonus`** | `value` | %stat | R |
| **`crit_damage_bonus`** | `value` | %stat | R |
| **`flat_extra_damage`** | `value` | %atk | R |
| **`guaranteed_crit`** | `base_mult` | multiplier | R |
| | `enhanced_mult` | multiplier | R |
| | `enhanced_chance` | probability | R |
| **`probability_multiplier`** | `tiers` | list of `{prob: probability, mult: multiplier}` | R |
| **`probability_to_certain`** | *(no fields)* | | |
| **`ignore_damage_reduction`** | *(no fields)* | | |
| **`conditional_damage`** | `value` | %stat | R |
| | `condition` | string | R |
| **`conditional_crit`** | `condition` | string | R |
| **`conditional_crit_rate`** | `value` | probability | R |
| | `condition` | string | R |
| **`conditional_buff`** | `condition` | string | R |
| | *(stat fields)* | %stat | R |
| **`counter_debuff_upgrade`** | `on_attacked_chance` | probability | R |
| **`per_hit_escalation`** | `value` | %stat per hit | R |
| | `stat` | string | R |
| | `max` | %stat | O |
| **`periodic_escalation`** | `every_n_hits` | count | R |
| | `multiplier` | multiplier | R |
| | `max_stacks` | count | R |
| **`percent_max_hp_damage`** | `value` | %max_hp per hit | R |
| | `hits` | count — mapped from 段 | R |
| | `duration_per_hit` | seconds — always 1 (1段 = 1s) | R |
| | `cap_vs_monster` | %atk | R |
| **`per_self_lost_hp`** | `per_percent` | %stat per 1% own lost HP | R |
| | `min_threshold` | %lost_hp | O |
| **`per_enemy_lost_hp`** | `per_percent` | %stat per 1% enemy lost HP | R |
| **`min_lost_hp_threshold`** | `value` | %lost_hp | R |
| **`self_hp_cost`** | `value` | %current_hp | R |
| **`self_lost_hp_damage`** | `value` | %lost_hp | R |
| | `on_last_hit` | bool | O |
| | `heal_equal` | bool | O |
| **`self_damage_taken_increase`** | `value` | %stat | R |
| **`lifesteal`** | `value` | %stat of damage dealt | R |
| **`healing_to_damage`** | `value` | %stat of heal amount | R |
| **`healing_increase`** | `value` | %stat | R |
| **`self_damage_reduction_during_cast`** | `value` | %stat | R |
| **`shield_strength`** | `value` | %stat | R |
| **`on_shield_expire`** | `damage_percent_of_shield` | %stat of shield value | R |
| **`damage_to_shield`** | `value` | %stat of damage dealt | R |
| | `duration` | seconds | R |
| **`on_buff_debuff_shield_trigger`** | `damage_percent_of_skill` | %stat of skill base damage | R |
| **`next_skill_buff`** | `stat` | string | R |
| | `value` | %stat | R |
| **`enlightenment_bonus`** | `value` | count | R |
| | `max` | count | R |
| **`per_buff_stack_damage`** | `per_n_stacks` | count | R |
| | `value` | %stat | R |
| | `max` | %stat | R |
| **`per_debuff_stack_damage`** | `per_n_stacks` | count | R |
| | `value` | %stat | R |
| | `max` | %stat | R |
| | `dot_half` | bool | O |
| **`per_debuff_stack_true_damage`** | `per_stack` | %max_hp | R |
| | `max` | %max_hp | R |
| **`random_buff`** | `options` | list of effect objects | R |
| **`random_debuff`** | `options` | list of effect objects | R |
| **`buff_strength`** | `value` | %stat | R |
| **`debuff_strength`** | `value` | %stat | R |
| **`buff_duration`** | `value` | % extension of duration | R |
| **`all_state_duration`** | `value` | % extension of duration | R |
| **`buff_stack_increase`** | `value` | % increase in stacks applied | R |
| **`debuff_stack_increase`** | `value` | % increase in stacks applied | R |
| **`debuff_stack_chance`** | `value` | probability | R |
| **`dot_extra_per_tick`** | `value` | %lost_hp per tick | R |
| **`dot_damage_increase`** | `value` | %stat | R |
| **`dot_frequency_increase`** | `value` | % reduction in tick interval | R |
| **`summon_buff`** | `damage_taken_reduction_to` | %stat of player's incoming damage | R |
| | `damage_increase` | %stat | R |
| **`extended_dot`** | `extra_seconds` | seconds | R |
| | `tick_interval` | seconds | R |
| **`delayed_burst_increase`** | `value` | %stat of burst damage | R |
| **`self_buff_extend`** | `buff_name` | string | R |
| | `value` | seconds | R |
| **`self_buff_extra`** | `buff_name` | string | R |
| | *(stat field)* | %stat | R |
| **`periodic_cleanse`** | `chance` | probability | R |
| | `interval` | seconds | R |
| | `cooldown` | seconds | R |
| | `max_triggers` | count | R |
| **`shield_destroy_damage`** | `percent_max_hp` | %max_hp per hit | R |
| | `hits` | count — mapped from 段 | R |
| | `duration_per_hit` | seconds — always 1 (1段 = 1s) | R |
| | `cap_vs_monster` | %atk | R |
| | `no_shield_double_cap` | %atk | R |

> **Note — `self_buff_extra`:** adds one extra stat to an already-named buff. The field name is the stat being added, not a fixed key. Known instance: 天光虹露 adds `healing_bonus` to 仙佑. Use the most descriptive stat name available; do not invent new names beyond what appears in [灵书数据全览.md](./灵书数据全览.md).

> **Note — `conditional_buff`:** a conditional stat boost that activates when a condition is met (e.g. enlightenment level). The stat fields are variable — use the most descriptive stat name from [灵书数据全览.md](./灵书数据全览.md). Known instances: 皓月剑诀 追神真诀 (percent_max_hp_increase, damage_increase at 悟10境); 惊蛰化龙 紫心真诀 (percent_lost_hp_increase, damage_increase at 悟境).

> **Note — `counter_debuff_upgrade`:** upgrades an existing `counter_debuff` on the same skill. Only modifies the `on_attacked_chance` field. Known instance: 大罗幻诀 魔魂咒界 upgrades 罗天魔咒 from 30% to 60%.

---

## Section B — Duration-based Effects

These create an active window in the combat timeline.
`duration` is always in `seconds` and always required.

| type | field | unit | R/O |
|---|---|---|---|
| **`self_buff`** | `name` | string | R |
| | `duration` | seconds | R |
| | `attack_bonus` | %stat | O |
| | `defense_bonus` | %stat | O |
| | `hp_bonus` | %stat | O |
| | `damage_reduction` | %stat | O |
| **`counter_buff`** | `name` | string | R |
| | `duration` | seconds | R |
| | `reflect_received_damage` | %stat of each hit received | O |
| | `reflect_percent_lost_hp` | %lost_hp per second | O |
| **`counter_debuff`** | `name` | string | R |
| | `duration` | seconds | R |
| | `on_attacked_chance` | probability | R |
| | `effects` | list of `dot` objects | R |
| **`debuff`** | `name` | string | O |
| | `target` | string | R |
| | `value` | %stat | R |
| | `duration` | seconds | R |
| | `dispellable` | bool | O |
| **`conditional_debuff`** | `condition` | string | R |
| | `name` | string | O |
| | `target` | string | R |
| | `value` | %stat | R |
| | `duration` | seconds | R |
| | `per_hit` | bool | O |
| **`cross_slot_debuff`** | `name` | string | R |
| | `target` | string | R |
| | `value` | %stat | R |
| | `duration` | seconds | R |
| | `trigger` | string | R |
| **`dot`** | `duration` | seconds | R |
| | `tick_interval` | seconds | R |
| | `damage_per_tick` | %atk | O |
| | `percent_current_hp` | %current_hp per tick | O |
| | `percent_lost_hp` | %lost_hp per tick | O |
| | `name` | string | O |
| | `max_stacks` | count | O |
| | `on_dispel` | object | O |
| | `on_dispel.damage` | %atk | O |
| | `on_dispel.stun` | seconds | O |
| **`delayed_burst`** | `name` | string | R |
| | `duration` | seconds | R |
| | `damage_increase_during` | %stat | R |
| | `burst_base` | %atk | R |
| | `burst_accumulated_pct` | %stat of accumulated damage | R |
| **`summon`** | `inherit_stats` | %stat of player stats | R |
| | `duration` | seconds | R |
| | `damage_taken_multiplier` | %stat of player's incoming damage | R |
| **`periodic_dispel`** | `interval` | seconds | R |
| | `duration` | seconds | R |
| | `damage_percent_of_skill` | %stat of skill base damage | R |
| | `no_buff_double` | bool | R |
| **`conditional_heal_buff`** | `condition` | string | R |
| | `value` | %stat of healing output | R |
| | `duration` | seconds | R |

> **Note — `on_dispel`:** is a nested object. Dotted notation denotes sub-fields, e.g. `on_dispel: {damage: 3300, stun: 2}`.

---

## Condition Vocabulary

All `condition` fields must use exactly one of these strings:

| string | meaning |
|---|---|
| `target_controlled` | enemy is under a control effect |
| `target_hp_below_30` | enemy current HP < 30% |
| `target_has_debuff` | enemy has at least one debuff |
| `target_has_no_healing` | enemy has no healing states active |
| `target_has_shield` | enemy has at least one active shield |
| `enlightenment_max` | this skill has reached max enlightenment (悟10境) |
| `enlightenment_10` | this skill has enlightenment level 10 (悟10境) |

---

## `data_state` Vocabulary

Add `data_state` only when the value in [灵书数据全览.md](./灵书数据全览.md) is explicitly tied to a specific
cultivation stage. Omit when [灵书数据全览.md](./灵书数据全览.md) says "悟境最高加成" or gives no qualification
(max enlightenment is the default).

| string | meaning |
|---|---|
| `max_enlightenment` | 悟10境 — default, omit this field |
| `enlightenment_1` | 悟1境 |
| `enlightenment_3` | 悟3境 |
| `enlightenment_7` | 悟7境 |
| `enlightenment_8` | 悟8境 |
| `no_enlightenment` | 悟0境 |
| `max_fusion` | max fusion count (最高融合加成) |
| `fusion_N` | exactly N fusion stacks (e.g. `fusion_54`) |

---

## Extraction Rules for AI

When extracting from [灵书数据全览.md](./灵书数据全览.md) into effects.yaml, follow these rules exactly:

1. Use only type strings from this document. Never invent a new type.
2. Every field marked R must be present. Never omit a required field.
3. Every field must carry the correct unit as defined above.
4. Every effect in Section B must have `duration`. Missing `duration` is an error.
5. Every `dot` must have both `duration` and `tick_interval`.
6. Normalize all `condition` values to the condition vocabulary above.
7. Use the value from the highest-cultivation data point shown in [灵书数据全览.md](./灵书数据全览.md).
   If the source explicitly qualifies a lower stage, set `data_state` accordingly.
8. If a sub-effect only activates under a cultivation condition
   (在神通悟境的条件下), add `data_state: enlightenment_max` to that sub-effect only.
9. Do not infer effects not stated. Do not add fields not in this vocabulary.
10. After extraction, verify: does every Section B effect have `duration`?
    Does every `dot` have `tick_interval`? If not, return to [灵书数据全览.md](./灵书数据全览.md).

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-18 | Initial effect type vocabulary |
| 1.1 | 2026-02-18 | Phase 1.2: align effect types, add 5 new types, expand shield_destroy_damage |
| 1.2 | 2026-02-19 | Restructured from tools/ to embedding/ |
| 1.3 | 2026-02-24 | change the about.md to [灵书数据全览.md](./灵书数据全览.md), the normalized about.md |
