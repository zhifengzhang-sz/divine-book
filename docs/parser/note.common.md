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

# Universal Affix (通用词缀) Parsing

Universal affixes are shared across all schools. Source: `data/raw/通用词缀.md`, a single 2-column table (`词缀 | 效果描述`). Each affix has one tier (融合50重) with variable assignments.

## Pipeline

```
data/raw/通用词缀.md
  → readUniversalAffixTable()    → AffixEntry[] (name, cell)
  → genericAffixParse(cell, {}, { lastTierOnly: true })
  → EffectRow[]
  → formatAffixesYaml()          → data/yaml/affixes.yaml
```

Code: `lib/parser/common-affixes.ts`, CLI: `app/parse-affixes.ts`

### Key difference from exclusive affixes

- **2-column** table (no book name column) — affixes are book-independent
- **No `defaultParent`** — universal affixes are not scoped to a named state
- **Backtick stripping** — source markdown wraps game terms in backticks (`` `减益效果` ``), stripped by the reader before extraction
- **All 16 handled by generic pipeline** — no per-affix overrides needed

---

## Full inventory (16 affixes)

| Affix | Source text | Extractor | Effect type |
|-------|-----------|-----------|-------------|
| 咒书 | 减益效果强度提升x% | `extractDebuffStrength` | `debuff_strength` |
| 清灵 | 增益效果强度提升x% | `extractBuffStrength` | `buff_strength` |
| 业焰 | 所有状态效果持续时间延长x% | `extractAllStateDuration` | `all_state_duration` |
| 击瑕 | 敌方处于控制效果，伤害提升x% | `extractConditionalDamageAffix` | `conditional_damage` |
| 破竹 | 每造成1段伤害，剩余段数伤害提升x%，最多y% | `extractPerHitEscalation` | `per_hit_escalation` |
| 金汤 | 施放期间提升自身x%的伤害减免 | `extractDamageReductionDuringCast` | `damage_reduction_during_cast` |
| 怒目 | 敌方气血值低于30%，伤害提升x%，暴击率提升y% | `extractExecuteConditional` | `execute_conditional` |
| 鬼印 | 持续伤害触发时，额外造成目标x%已损失气血值 | `extractDotExtraPerTick` | `dot_extra_per_tick` |
| 福荫 | 任意1个加成：攻击x%、致命伤害x%、伤害x% | `extractRandomBuff` | `random_buff` |
| 战意 | 自身每多损失1%最大气血值，伤害提升x% | `extractPerSelfLostHp` | `per_self_lost_hp` |
| 斩岳 | 额外造成x%攻击力的伤害 | `extractFlatExtraDamage` | `flat_extra_damage` |
| 吞海 | 敌方每多损失1%最大值气血值，伤害提升x% | `extractPerEnemyLostHp` | `per_enemy_lost_hp` |
| 灵盾 | 护盾值提升x% | `extractShieldValueIncrease` | `shield_value_increase` |
| 灵威 | 下一个施放的神通额外获得x%神通伤害加深 | `extractNextSkillBuff` | `next_skill_buff` |
| 摧山 | 提升x%攻击力的效果 | `extractAttackBonusAffix` | `attack_bonus` |
| 通明 | 必定会心x倍，y%概率提升至z倍 | `extractGuaranteedResonance` | `guaranteed_resonance` |

---

## Walkthrough: 通明

**Source** (通用词缀.md):

| 词缀 | 效果描述 |
|------|----------|
| 【通明】 | 使本神通必定`会心`造成x倍伤害，并有y%概率将之提升至z倍`<br>`融合50重：x=1.2, y=25, z=1.5 |

### Step 1: `readUniversalAffixTable()`

Splits table row. Strips backticks from effect text. Calls `splitCell()`:

```
name: "通明"
description: ["使本神通必定会心造成x倍伤害，并有y%概率将之提升至z倍"]
tiers:       [{ fusion: 50, vars: { x: 1.2, y: 25, z: 1.5 } }]
```

### Step 2: `genericAffixParse()`

**2a. Join** description:
```
"使本神通必定会心造成x倍伤害，并有y%概率将之提升至z倍"
```

**2b. Strip** `【name】：` — no match (text starts with `使`). Unchanged.

**2c. Run `AFFIX_EXTRACTORS`** — `extractGuaranteedResonance` matches:

```
/必定.*?会心.*?造成(\w+)倍伤害.*?(\w+)%概率.*?提升至(\w+)倍/
```

Captures: `"x"`, `"y"`, `"z"` → `fields: { base_multiplier: "x", chance: "y", upgraded_multiplier: "z" }`

**2d. Tier resolution** — `lastTierOnly: true` + single tier → use vars `{ x: 1.2, y: 25, z: 1.5 }`.

**2e. `resolveFields()`**:

| field | raw | var lookup | result |
|-------|-----|------------|--------|
| `base_multiplier` | `"x"` | `x → 1.2` | `1.2` |
| `chance` | `"y"` | `y → 25` | `25` |
| `upgraded_multiplier` | `"z"` | `z → 1.5` | `1.5` |

### Final output

```yaml
universal:
  通明:
    effects:
      - type: guaranteed_resonance
        base_multiplier: 1.2
        chance: 25
        upgraded_multiplier: 1.5
```

---

## Extractor exclusion guards

Several existing extractors needed exclusion guards to prevent double-matching on universal affix text. These guards do **not** affect primary/exclusive parsing (verified: `books.yaml` output is byte-identical before and after).

| Extractor | Exclusion added | Why |
|-----------|----------------|-----|
| `extractDamageIncrease` | `段数伤害` | 破竹 uses "段数伤害提升" — handled by `extractPerHitEscalation` |
| `extractDamageIncrease` | `任意1个加成` | 福荫 uses "任意1个加成" — handled by `extractRandomBuff` |
| `extractDamageIncrease` | `概率触发` | 天命有归 (school) uses "概率触发" — handled by `extractProbabilityToCertain` |
| `extractConditionalDamageAffix` | `控制效果` (not just `控制状态`) | 击瑕 uses "控制效果" phrasing instead of "控制状态" |
| `extractPerSelfLostHp` | `敌方每多损失` | 吞海/贪狼吞星 uses "敌方每多损失" — handled by `extractPerEnemyLostHpAffix` |
| `extractAttackBonusAffix` | `攻击力的效果.*伤害.*暴击伤害` | 破碎无双 (school) is triple bonus — handled by `extractTripleBonus` |

### `per_enemy_lost_hp` — two phrasings, one extractor

`extractPerEnemyLostHp` handles both phrasings in a single function:

| Phrasing | Where | Pattern | Fields |
|----------|-------|---------|--------|
| `敌方当前气血值每损失x%...伤害增加y%` | Skill text (通天剑诀) | Configurable step size | `per_percent: x, value: y` |
| `敌方每多损失1%最大气血值...伤害提升x%` | Universal/school affixes (吞海, 贪狼吞星) | Fixed 1% step | `per_percent: 1, value: x` |

Same `type: "per_enemy_lost_hp"`, same field shape. The affix phrasing has implicit step size of 1%.
