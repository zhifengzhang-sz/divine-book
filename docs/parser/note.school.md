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

# School Affix (修为词缀) Parsing

School affixes are school-specific auxiliary affixes. Source: `data/raw/修为词缀.md`, four 2-column tables (`词缀 | 效果描述`) grouped under `#### 剑修` / `#### 法修` / `#### 魔修` / `#### 体修` headers. Each affix has one tier with variable assignments.

## Pipeline

```
data/raw/修为词缀.md
  → readSchoolAffixTable()       → AffixEntry[] (name, school, cell)
  → genericAffixParse(cell, {}, { lastTierOnly: true })
  → EffectRow[]
  → formatAffixesYaml()          → data/yaml/affixes.yaml (under "school:" key)
```

Code: `lib/parser/common-affixes.ts`, CLI: `app/parse-affixes.ts`

### Key difference from universal affixes

- **School-grouped** — same 2-column table format but repeated under each `####` school header
- **Output keyed by school** → `school.Sword.摧云折月`, not flat
- **Higher values** — school affixes are strictly stronger than their universal counterparts (e.g. 摧云折月 gives 300% attack vs 摧山's 20%)
- **All 17 handled by generic pipeline** — no per-affix overrides needed

---

## Full inventory (17 affixes)

### 剑修 (Sword) — 4 affixes

| Affix | Source text | Extractor | Effect type | Values |
|-------|-----------|-----------|-------------|--------|
| 摧云折月 | 提升x%攻击力的效果 | `extractAttackBonusAffix` | `attack_bonus` | 300 |
| 灵犀九重 | 必定会心x倍，y%概率提升至z倍 | `extractGuaranteedResonance` | `guaranteed_resonance` | 2.97 / 25% / 3.97 |
| 破碎无双 | 提升x%攻击力、y%伤害、z%暴击伤害 | `extractTripleBonus` | `triple_bonus` | 15 / 15 / 15 |
| 心火淬锋 | 每造成1段伤害，剩余段数伤害提升x%，最多y% | `extractPerHitEscalation` | `per_hit_escalation` | 5 / max 50 |

### 法修 (Spell) — 4 affixes

| Affix | Source text | Extractor | Effect type | Values |
|-------|-----------|-----------|-------------|--------|
| 长生天则 | 所有治疗效果提升x% | `extractHealingIncrease` | `healing_increase` | 50 |
| 明王之路 | 最终伤害加深提升x% | `extractFinalDamageBonus` | `final_damage_bonus` | 50 |
| 天命有归 | 概率触发→必定触发，伤害提升x% | `extractProbabilityToCertain` | `probability_to_certain` | 50 |
| 景星天佑 | 任意1个加成：攻击/致命伤害/伤害x% | `extractRandomBuff` | `random_buff` | 55 |

### 魔修 (Demon) — 4 affixes

| Affix | Source text | Extractor | Effect type | Values |
|-------|-----------|-----------|-------------|--------|
| 瑶光却邪 | 治疗效果时额外造成治疗量x%的伤害 | `extractHealingToDamage` | `healing_to_damage` | 50 |
| 溃魂击瑕 | 敌方气血低于30%，伤害提升x%，必定暴击 | `extractExecuteConditional` | `execute_conditional` | 100 + guaranteed_crit |
| 玄女护心 | 造成伤害后获得伤害值x%的护盾，持续8秒 | `extractDamageToShield` | `damage_to_shield` | 50 / 8s |
| 祸星无妄 | 任意1个减益：攻击降低x%/暴击率x%/暴击伤害y% | `extractRandomDebuff` | `random_debuff` | 20 / 20 / 50 |

### 体修 (Body) — 5 affixes

| Affix | Source text | Extractor | Effect type | Values |
|-------|-----------|-----------|-------------|--------|
| 金刚护体 | 施放期间提升自身x%伤害减免 | `extractDamageReductionDuringCast` | `damage_reduction_during_cast` | 55 |
| 破灭天光 | 额外造成x%攻击力的伤害 | `extractFlatExtraDamage` | `flat_extra_damage` | 2500 |
| 青云灵盾 | 护盾值提升x% | `extractShieldValueIncrease` | `shield_value_increase` | 50 |
| 贪狼吞星 | 敌方每多损失1%最大气血值，伤害提升x% | `extractPerEnemyLostHp` | `per_enemy_lost_hp` | per_percent=1, value=1 |
| 意坠深渊 | 已损气血值至少按已损x%计算，伤害提升y% | `extractMinLostHpThreshold` | `min_lost_hp_threshold` | 11 / 50 |

---

## Universal ↔ School affix overlap

Several school affixes are stronger versions of universal affixes, sharing the same extractor and effect type:

| Universal | School | Extractor | Universal value | School value |
|-----------|--------|-----------|----------------|-------------|
| 摧山 | 摧云折月 (Sword) | `extractAttackBonusAffix` | 20 | 300 |
| 通明 | 灵犀九重 (Sword) | `extractGuaranteedResonance` | 1.2 / 25% / 1.5 | 2.97 / 25% / 3.97 |
| 福荫 | 景星天佑 (Spell) | `extractRandomBuff` | 20 | 55 |
| 怒目 | 溃魂击瑕 (Demon) | `extractExecuteConditional` | 20 + crit_rate 30% | 100 + guaranteed_crit |
| 金汤 | 金刚护体 (Body) | `extractDamageReductionDuringCast` | 10 | 55 |
| 斩岳 | 破灭天光 (Body) | `extractFlatExtraDamage` | 2000 | 2500 |
| 灵盾 | 青云灵盾 (Body) | `extractShieldValueIncrease` | 20 | 50 |
| 吞海 | 贪狼吞星 (Body) | `extractPerEnemyLostHp` | 0.4 | 1 |
| 破竹 | 心火淬锋 (Sword) | `extractPerHitEscalation` | 1 / max 10 | 5 / max 50 |

Unique to school (no universal counterpart): 破碎无双, 长生天则, 明王之路, 天命有归, 瑶光却邪, 玄女护心, 祸星无妄, 意坠深渊.

---

## Walkthrough: 溃魂击瑕

**Source** (修为词缀.md, #### 魔修):

| 词缀 | 效果描述 |
|------|----------|
| 【溃魂击瑕】 | 本神通施放时，若敌方气血值低于30%，则使本次伤害提升x%，且必定暴击`<br>`融合50重：x=100 |

### Step 1: `readSchoolAffixTable()`

Detects `#### 魔修` → `school: "Demon"`. Strips backticks, calls `splitCell()`:

```
name: "溃魂击瑕"
school: "Demon"
description: ["本神通施放时，若敌方气血值低于30%，则使本次伤害提升x%，且必定暴击"]
tiers:       [{ fusion: 50, vars: { x: 100 } }]
```

### Step 2: `genericAffixParse()`

**2a. Run `AFFIX_EXTRACTORS`** — `extractExecuteConditional` matches:

```
/敌方气血值低于(\d+)%.*?伤害提升(\w+)%.*?(?:暴击率提升(\w+)%|必定暴击)/
```

Captures: `30`, `"x"`, no group 3 (必定暴击 branch) →
```
fields: { hp_threshold: 30, damage_increase: "x", guaranteed_crit: 1 }
```

**2b. Tier resolution** — `lastTierOnly: true` + single tier → vars `{ x: 100 }`.

**2c. `resolveFields()`**:

| field | raw | result |
|-------|-----|--------|
| `hp_threshold` | `30` (number) | `30` |
| `damage_increase` | `"x"` | `100` |
| `guaranteed_crit` | `1` (number) | `1` |

### Final output

```yaml
school:
  Demon:
    溃魂击瑕:
      effects:
        - type: execute_conditional
          hp_threshold: 30
          damage_increase: 100
          guaranteed_crit: 1
```

Compare with universal 怒目 (same extractor, different branch):

```yaml
universal:
  怒目:
    effects:
      - type: execute_conditional
        hp_threshold: 30
        damage_increase: 20
        crit_rate_increase: 30
```

怒目 gives conditional crit *rate* bonus (30%); 溃魂击瑕 gives guaranteed crit (100%). The `guaranteed_crit: 1` vs `crit_rate_increase: y` distinction comes from the regex alternation `(?:暴击率提升(\w+)%|必定暴击)`.
