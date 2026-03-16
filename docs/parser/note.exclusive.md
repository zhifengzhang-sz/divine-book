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

# Generic Affix Parsing Pipeline

Both primary affixes (in `split.ts`) and exclusive affixes (in `exclusive.ts`) share a generic parsing pipeline via `genericAffixParse()`. Hardcoded per-book parsers are kept only for compound patterns that the generic extractors cannot handle.

## Algorithm

```
raw cell text
  → splitCell()           → { description[], tiers[] }
  → genericAffixParse():
      1. join description lines with "，"
      2. strip leading 【affixName】： if present
      3. run AFFIX_EXTRACTORS → [{ type, fields{var refs}, meta{} }]
      4. resolveFields(fields, tier.vars) — substitute vars, including "-x" → -vars.x
      5. merge meta into output
      6. add defaultParent if set (primary affixes pass "this")
      → EffectRow[]
```

### Tier modes

- **No tiers**: resolve with empty vars, no `data_state`
- **Single tier + `lastTierOnly`**: use last tier's vars, no `data_state` (exclusive affix convention)
- **Multi-tier**: expand per-tier, each gets `data_state` from `buildDs(tier)`
- **Locked tier**: emit `{ type: <first_effect_type>, data_state: "locked" }`

### `defaultParent`

Primary affixes pass `defaultParent: "this"` — the affix modifies the platform skill. Applied to all effect types except `self_buff_extra` (which uses `buff_name` instead). Exclusive affixes do not set a default parent.

### Negated variable resolution

Chinese text uses "降低x%" (reduce by x%) which semantically means a negative value. The extractor stores `"-x"` in `fields.value`. `resolveFields` recognizes the `-` prefix: looks up `x` in tier vars, returns `-vars.x`.

---

## Walkthrough: 千锋聚灵剑

**Source** (专属词缀.md):

| 功法 | 词缀 | 效果描述 |
|------|------|----------|
| `千锋聚灵剑` | 【天哀灵涸】 | 本神通施放后，会对敌方添加持续8秒的【灵涸】：治疗量降低x%，且无法被驱散`<br>`悟12境，融合52重：x=80 |

### Step 1: `splitCell()`

Splits on `<br>`. The first segment has no `=` pattern → description. The second has `x=80` → tier.

```
description: ["本神通施放后，会对敌方添加持续8秒的【灵涸】：治疗量降低x%，且无法被驱散"]
tiers:       [{ enlightenment: 12, fusion: 52, vars: { x: 80 } }]
```

### Step 2: `parseExclusiveAffix()`

Checks `EXCLUSIVE_PARSERS["千锋聚灵剑"]` — no entry. Falls through to:
```ts
genericAffixParse(entry.cell, stateRegistry, { lastTierOnly: true })
```

### Step 3: `genericAffixParse()`

**3a. Join** description lines:
```
"本神通施放后，会对敌方添加持续8秒的【灵涸】：治疗量降低x%，且无法被驱散"
```

**3b. Strip** leading `【name】：` — regex `^【.+?】[：:]` does NOT match because text starts with `本`, not `【`. Text unchanged.

**3c. Run `AFFIX_EXTRACTORS`** — 35 extractors tested, only `extractHealReductionDebuff` matches:

```ts
extractHealReductionDebuff(text)
```

Inside the extractor:
- `/治疗量降低(\w+)%/` → captures `"x"`
- "降低" = negative → stores `value: "-x"`
- `/持续(\d+)秒/` → captures `8` → `duration: 8`
- `/无法被驱散/` matches → `meta.dispellable: false`
- `/【(.+?)】/` → captures `"灵涸"` → `meta.name: "灵涸"`

Returns:
```
type:   "debuff"
fields: { target: "healing_received", value: "-x", duration: 8 }
meta:   { dispellable: false, name: "灵涸" }
```

**3d. Tier resolution** — `lastTierOnly: true` + single tier → use vars `{ x: 80 }`, no `data_state`.

**3e. `resolveFields()`** with vars `{ x: 80 }`:

| field | raw | resolution | result |
|-------|-----|------------|--------|
| `target` | `"healing_received"` | string literal, not a var name | `"healing_received"` |
| `value` | `"-x"` | starts with `-`, look up `x` → `80`, negate | `-80` |
| `duration` | `8` | already a number | `8` |

**3f. Merge meta** → `dispellable: false`, `name: "灵涸"` added to the effect.

No `defaultParent` (exclusive affixes don't set one).

### Final output

```yaml
exclusive_affix:
  name: 天哀灵涸
  effects:
    - type: debuff
      target: healing_received
      value: -80
      duration: 8
      dispellable: false
      name: 灵涸
```

---

## Override inventory

### Exclusive affixes — 6 overrides remain

| Book | Why override |
|------|-------------|
| 春黎剑阵 | dot + on_dispel compound, multi-tier, parent linking |
| 皓月剑诀 | dot_extra_per_tick + conditional_buff compound |
| 周天星元 | debuff_stack_chance + conditional_debuff, multi-tier |
| 天刹真魔 | conditional_heal_buff + conditional_debuff compound |
| 无相魔劫咒 | debuff + conditional_damage with parent linking |
| 惊蜇化龙 | per_debuff_stack_true_damage + conditional_buff compound |

### Primary affixes — 5 overrides remain

All 5 require `parent` scoping to a named state that cannot be inferred from the affix text alone.

| Book | Parent | Why |
|------|--------|-----|
| 浩然星灵诀 | `天鹤之佑` | conditional_damage scoped to named state |
| 周天星元 | `回生灵鹤` | shield scoped to named state |
| 星元化岳 | `天龙印` | lifesteal scoped to named state |
| 玉书天戈符 | `self_hp_above_20` | conditional_damage with `per_step` — unique formula |
| 天刹真魔 | `不灭魔体` / `天人五衰` | 5-effect compound: counter_debuff + 3 stat reductions + debuff |

### Primary affixes — ~20 handled by generic pipeline

The remaining primary affixes (including 千锋聚灵剑, 春黎剑阵, 皓月剑诀, 念剑诀, 通天剑诀, 新-青元剑诀, 元磁神光, 甲元仙符, 天魔降临咒, 天轮魔经, 解体化形, 大罗幻诀, 梵圣真魔咒, 无相魔劫咒, 玄煞灵影诀, 惊蜇化龙, 十方真魄, 疾风九变, 煞影千幻, 九重天凤诀) are handled by generic `AFFIX_EXTRACTORS` via `genericAffixParse()` with `defaultParent: "this"`. 16 of these were migrated from hand-written `AFFIX_PARSERS` overrides.
