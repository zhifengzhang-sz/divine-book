---
initial date: 2026-03-23
parent: design.md
supersedes: (old impl.ohm.md)
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

# Grammar Implementation — 34 ohm Files

---

## §0 File Organization & Data Flow

```
lib/parser/
  grammars-v1/              ← original per-book grammars (ground truth, read-only)
    Base.ohm                ← minimal vocabulary (varRef, stateName, cnNumber, gapTo)
    books/                  ← 28 book grammars
    affixes/                ← 5 shared affix grammars
  grammars/
    Base.ohm                ← enriched: adds common patterns catalog for reference
    effect-types.ts         ← TypeScript discriminated union (~90 effect types)
    proto.test.ts           ← grammar-level parse tests (119 tests)
    semantics/
      shared.ts             ← extractVar attribute (shared across all books)
      千锋聚灵剑.ts ...      ← 28 book semantic files
      通用词缀.ts ...        ← 5 affix semantic files
      semantics.test.ts     ← semantic extraction tests
```

**Data flow per book — one grammar, three entry points:**

```
                       BookName.ohm
                   ┌─────────────────────┐
skill column   ──▶ │ skillDescription    │ ──▶ parse tree ──▶ semantics ──▶ Effect[]
                   │                     │
affix column   ──▶ │ primaryAffix        │ ──▶ parse tree ──▶ semantics ──▶ Effect[]
                   │                     │
专属词缀 table ──▶ │ exclusiveAffix      │ ──▶ parse tree ──▶ semantics ──▶ Effect[]
                   └─────────────────────┘
```

The grammar defines the boundaries. Three inputs from three different data sources, same `.ohm` file, same `.ts` semantics, different entry points.

Common/school affixes use their own grammars (通用词缀.ohm, 修为词缀_*.ohm) since they apply across books.

---

## §1 Base.ohm — Vocabulary

Shared primitives inherited by all 34 grammars. No effect rules.

```
Base {
  varRef
    = lower+              -- letters     "x", "y", "abc"
    | digits "." digits   -- decimal     "0.5", "3.5"
    | digits              -- integer     "1500", "10"

  digits = digit+

  stateName = "【" stateNameChars "】"    "【罗天魔咒】" → "罗天魔咒"
  stateNameChars = (~"】" any)+

  cnNumber = cnDigit+                     "六" → 6, "十" → 10
  cnDigit = "一" | "二" | ... | "十" | "两"
  cnNumberOrDigit = cnNumber | digits

  gapTo<target> = (~target any)*         PEG .*? — skip until target
  ws = (" " | "\n" | "\r")*              whitespace including newlines
}
```

---

## §2 Book Grammars — 28 Files

Each book grammar defines 3 entry points:

| Entry point | Description | Count |
|------------|-------------|-------|
| `skillDescription` | Main skill text | 28/28 |
| `primaryAffix` | Per-book primary affix | 25/28 |
| `exclusiveAffix` | Per-book exclusive affix | 28/28 |

### §2.1 Catalog — 剑修 (Sword, 7 books)

| Book | Skill structure | Primary affix | Exclusive affix |
|------|----------------|---------------|-----------------|
| 千锋聚灵剑 | `baseAttack + perHit damageWithCap` | per_hit_escalation | heal_reduction + state |
| 春黎剑阵 | `baseAttack + summonClause` | summon_buff | dot + on_dispel + stun |
| 皓月剑诀 | `baseAttack + stateClause(寂灭剑心: shieldDestroy + noShieldDouble)` | shield_destroy_dot | dot_extra_per_tick + damage_increase |
| 念剑诀 | `untargetable + baseAttack + periodicEscalation` | extended_dot | buff_duration |
| 通天剑诀 | `baseAttack + critDmgBonus + selfDmgTakenIncrease` | conditional_damage(enemy_hp_loss) | ignore_damage_reduction + damage_increase |
| 新青元剑诀 | `baseAttack + sequencedCooldown` | debuff(skill_damage) | next_skill_buff |
| 无极御剑诀 | `baseAttack + crossSkillDamage` | *(none)* | skill_damage_increase + enemy_skill_damage_reduction |

### §2.2 Catalog — 法修 (Spell, 7 books)

| Book | Skill structure | Primary affix | Exclusive affix |
|------|----------------|---------------|-----------------|
| 浩然星灵诀 | `baseAttack + stateClause(天鹤之佑: finalDmgBonus + duration)` | conditional_hp_scaling | buff_strength |
| 元磁神光 | `baseAttack + stateClause(天狼之啸: damageIncrease + maxStacks + duration)` | attack_bonus per_state_stack | buff_stack_increase + per_buff_stack_damage |
| 周天星元 | `selfHeal + baseAttack + healEcho + stateClause(灵鹤: perTickHeal)` | shield(per_tick) | debuff_stack_chance + cross_slot_debuff |
| 甲元仙符 | `baseAttack(no hits) + stateClause(仙佑: tripleStatBuff + duration)` | self_buff(healing_bonus) | heal_reduction(conditional) |
| 星元化岳 | `baseAttack + echoDamage + noDamageBonus + duration` | lifesteal | lifesteal |
| 玉书天戈符 | `baseAttack + perHitMaxHpDmg` | conditional_hp_scaling | enlightenment_bonus + damage_increase |
| 九天真雷诀 | `baseAttack + selfCleanse + conditionalDamage(cleanse_excess)` | *(none)* | on_buff_debuff_shield |

### §2.3 Catalog — 魔修 (Demon, 7 books)

| Book | Skill structure | Primary affix | Exclusive affix |
|------|----------------|---------------|-----------------|
| 天魔降临咒 | `baseAttack + stateAdd(结魂锁链) + inlineDmgReduction + inlineDmgIncrease + inlinePerDebuff` | dot_permanent_max_hp + per_debuff_damage_upgrade | conditional_damage_debuff |
| 天轮魔经 | `baseAttack + buffSteal + perStealDmg` | per_stolen_buff_debuff | debuff_stack_increase + per_debuff_stack_damage |
| 天刹真魔 | `baseAttack + stateAdd(不灭魔体) + counterBuffHeal + noHealingBonus` | self_buff_extra(cycling debuff) | self_buff(healing) + debuff(final_dr on_hit) |
| 解体化形 | `baseAttack + perDebuffStackDmg` | attack_bonus(per_debuff_stack, pre_cast) | probability_multiplier |
| 大罗幻诀 | `baseAttack + stateAdd(罗天魔咒) + counterDebuff + 2× childBlock(dot)` | counter_debuff_upgrade + cross_slot_debuff | dot_damage_increase |
| 梵圣真魔咒 | `baseAttack + perHitStateAdd(贪妄业火) + dotCurrentHp` | dot(triggered by stack accumulation) | dot_frequency_increase |
| 无相魔劫咒 | `baseAttack + stateApply(无相魔劫) + delayedBurst` | delayed_burst_increase | debuff(heal_reduction + damage_increase, conditional) |

### §2.4 Catalog — 体修 (Body, 7 books)

| Book | Skill structure | Primary affix | Exclusive affix |
|------|----------------|---------------|-----------------|
| 玄煞灵影诀 | `baseAttack + stateAdd(怒意滔天) + hpCostDot + selfLostHpDamageDot` | self_lost_hp_damage(every_n_hits) | per_self_lost_hp |
| 惊蜇化龙 | `hpCost + baseAttack + selfLostHpDmg + skillDmgBuff + duration` | percent_max_hp_affix(triggered by stack) | per_debuff_true_damage + damage_increase |
| 十方真魄 | `hpCost + baseAttack + selfLostHpWithHeal + stateAdd(怒灵降世) + dualStatBuff` | self_buff_extend + periodic_cleanse | damage_increase + self_damage_taken_increase |
| 疾风九变 | `hpCost + baseAttack + stateAdd(极怒) + counterBuffReflect` | lifesteal_with_parent | all_state_duration |
| 煞影千幻 | `hpCost + baseAttack + selfLostHpDmg + shield + perHit stateAdd(落星) + debuffFinalDr` | shield_strength + chance(no_hp_cost) | conditional_damage_controlled |
| 九重天凤诀 | `baseAttack + perHitSelfLostHpDmg + perHitCost + stateAdd(蛮神) + dualStatBuff` | periodic_dispel + self_hp_floor | on_shield_expire |
| 天煞破虚诀 | `baseAttack + hpCost + stateClause(破虚: nextSkillScope + selfLostHpDmg)` | *(none)* | periodic_dispel(with damage) |

---

## §3 Affix Grammars — 5 Files

### §3.1 通用词缀 (16 common affixes)

| Rule | Chinese name | Effect type |
|------|-------------|------------|
| `ty_zhouShu` | 咒书 | `debuff_strength` |
| `ty_qingLing` | 清灵 | `buff_strength` |
| `ty_yeYan` | 业焰 | `all_state_duration` |
| `ty_jiXia` | 击瑕 | `conditional_damage_controlled` |
| `ty_poZhu` | 破竹 | `per_hit_escalation` |
| `ty_jinTang` | 金汤 | `damage_reduction_during_cast` |
| `ty_nuMu` | 怒目 | `execute_conditional` (with crit_rate) |
| `ty_guiYin` | 鬼印 | `dot_extra_per_tick` |
| `ty_fuYin` | 福荫 | `random_buff` |
| `ty_zhanYi` | 战意 | `per_self_lost_hp` |
| `ty_zhanYue` | 斩岳 | `flat_extra_damage` |
| `ty_tunHai` | 吞海 | `per_enemy_lost_hp` |
| `ty_lingDun` | 灵盾 | `shield_value_increase` |
| `ty_lingWei` | 灵威 | `next_skill_buff` |
| `ty_cuiShan` | 摧山 | `attack_bonus` |
| `ty_tongMing` | 通明 | `guaranteed_resonance` |

### §3.2 修为词缀 (4 school files)

| School | Affixes | Effect types |
|--------|---------|-------------|
| 剑修 | 摧云折月, 灵犀九重, 破碎无双, 心火淬锋 | attack_bonus, guaranteed_resonance, triple_bonus, per_hit_escalation |
| 法修 | 长生天则, 明王之路, 天命有归, 景星天佑 | healing_increase, final_dmg_bonus, probability_to_certain + damage_increase, random_buff |
| 魔修 | 瑶光却邪, 溃魂击瑕, 玄女护心, 祸星无妄 | healing_to_damage, execute_conditional(guaranteed_crit), damage_to_shield, random_debuff |
| 体修 | 金刚护体, 破灭天光, 青云灵盾, 贪狼吞星, 意坠深渊 | damage_reduction_during_cast, flat_extra_damage, shield_value_increase, per_enemy_lost_hp, min_lost_hp_threshold |

---

## §4 Common Patterns Catalog

Observed across 28 books. Not in Base.ohm (each book defines its own), but documented here for reference.

### §4.1 baseAttack (28/28 books)

```
("对目标" | "对其")? "造成" cnHitCount? ("共计" | "共")? varRef "%" "攻击力的" "灵法"? "伤害"
```

Variants: prefix (`对目标`/`对其`/none), `共计`/`共`, `灵法` optional, hit count optional (甲元仙符 has none).

### §4.2 hpCost (5/28 books — all 体修 + 惊蜇化龙)

```
"消耗" "自身"? varRef "%" "当前气血值"
```

### §4.3 selfLostHpDmg (4/28 books)

```
"额外" ("对其" | "对目标")? "造成" "自身"? varRef "%" "已损" "失"? "气血值的伤害"
```

### §4.4 stateAdd (6/28 books)

```
("为自身添加" | "对其施加") stateName
```

### §4.5 duration (6/28 books)

```
"持续" "存在"? varRef "秒"
```

### §4.6 capVsMonster (2/28 books)

```
"对怪物" ("伤害不超过" | "最多造成") "自身"? varRef "%" "攻击力" "的伤害"?
```
