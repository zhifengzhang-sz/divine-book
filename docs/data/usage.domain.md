---
initial date: 2026-3-5
dates of modification: []
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

# Domain Analysis Workflow

**How to go from raw game data to a working combo search system.**

This doc covers the full pipeline from raw data collection through domain docs to TypeScript code. Follow it when new skill books are added or existing ones are updated.

---

## Overview

```
data/raw/主书.md ─────┐
data/raw/通用词缀.md ──┤
data/raw/修为词缀.md ──┼── [1] Extract ──► normalized.data.md
data/raw/专属词缀.md ──┤                        │
data/raw/构造规则.md ──┘                        │
                                          [2] Parse
                                                │
                                          effects.yaml
                                                │
                                    [3] Domain Analysis
                                       ┌────────┼────────┐
                                       ▼        ▼        ▼
                              domain.       domain.    domain.
                              category.md   graph.md   path.md
                                       │        │        │
                                    [4] TypeScript Encoding
                                       ┌────────┼────────┐
                                       ▼        ▼        ▼
                                  bindings.ts  platforms.ts  chains.ts
                                       │
                                    [5] Verify
                                       │
                                  combo-search CLI
```

---

## Step 1: Raw Data Collection

**Files:** `data/raw/主书.md`, `通用词缀.md`, `修为词缀.md`, `专属词缀.md`, `构造规则.md`

**What to collect for a new book:**

1. In `主书.md`, add a row to the school's table with:
   - Book name (功法书)
   - Main skill description (功能) — damage, hit count, named entity mechanics
   - Primary affix (主词缀) — what it adds to the main skill
   - Parameter values at different 悟境/融合 levels

2. In `专属词缀.md`, add a row to the school's table with:
   - Book name (功法)
   - Exclusive affix name (词缀)
   - Effect description (效果描述) with parameter values

**Style conventions:**
- Use 【】 for named entities (【极怒】, 【仙佑】)
- Use backticks for mechanic types (`增益效果`, `减益效果`)
- Include parameter values with fusion/enlightenment conditions
- See existing entries for formatting reference

**When parameters change:** Update the values in place. The domain framework doesn't change — only the numbers do.

---

## Step 2: Parse (existing pipeline)

```bash
bun run parse        # normalized.data.md → effects.yaml
bun run test         # verify parsing
```

See [usage.parser.md](./usage.parser.md) and [usage.dev.md](./usage.dev.md) for details.

---

## Step 3: Domain Analysis

For each new book, derive the following by reading its raw data:

### 3a. Determine provides/requires binding

Read the book's main skill + primary affix + exclusive affix and classify:

**Does it CREATE a target category?**

| Creates... | Indicator in raw data |
|:---|:---|
| T2 减益效果 | Applies debuff to enemy (治疗量降低, 伤害减免减低, etc.) |
| T3 增益效果 | Applies buff to self (攻击力加成, 伤害减免, etc.) |
| T4 持续伤害 | Applies DoT (每秒/每0.5秒造成伤害, 持续N秒) |
| T5 护盾 | Creates shield (获得护盾) |
| T6 治疗效果 | Creates healing (恢复气血, 吸血效果) |
| T9 已损气血 | Active HP cost (消耗自身N%气血值) |

**Does it NEED a target category to function?**

| Needs... | Indicator in raw data |
|:---|:---|
| T2 | "带有减益状态", "添加的减益效果" |
| T3 | "添加的增益效果/状态", buff-related amplifiers |
| T4 | "添加的持续伤害", DoT amplifiers |
| T5 | "添加的护盾", shield amplifiers |
| T6 | "治疗效果", healing amplifiers |
| T7 | "所有状态", state duration amplifiers |
| T9 | "已损气血值计算", HP-loss scalers |
| T10 | "控制效果/状态", CC conditions |
| free | Standalone damage, unconditional effects |

### 3b. Identify named entities

A named entity exists when the main skill creates a named state with specific mechanics:
- Has a 【name】 in the description
- Has its own inputs (trigger conditions) and outputs (effects)
- Persists as a state with duration

For each named entity, determine:
1. **Transform type** — what it does (self_buff, counter_reflect, counter_debuff, delayed_burst)
2. **Inputs** — what feeds it (received_damage, enemy_attacks, unconditional)
3. **Outputs** — what it produces (reflected damage, stat buffs, DoT stacks)
4. **Operator ports** — which target categories amplify its outputs

### 3c. Determine platform provides

The platform = main skill + primary affix. Its `provides` is the union of:
- T1 (always — every skill deals damage)
- Any target categories the main skill creates (buffs, debuffs, DoTs, healing, HP cost)
- Any target categories the primary affix creates

---

## Step 4: Update Files

### 4a. Domain docs

**`domain.category.md`** — Add row to the appropriate §III Exclusive Affixes table:

```markdown
| E_N | book_name | 【affix_name】 | provides | requires | effect_types | Chain | Tier | Notes |
```

**`domain.graph.md`** — If the book has a named entity, add it to §V Named Entity Layer table. Add the platform to §VI Platform Provides Registry table.

**`domain.path.md`** — Add a new subsection under §IX Platform-Projected Paths:

```markdown
### `book_name` + primary_affix_name

- **Platform provides:** T1, ...
- **Named entities:** ...
- **Accessible:** list accessible paths
- **Inaccessible without provider:** list inaccessible paths + what T_N they need
- **Key operators:** notable affix interactions
```

### 4b. TypeScript code

**`lib/domain/bindings.ts`** — Add entry to the appropriate `EXCLUSIVE_*` array:

```typescript
{
  affix: "affix_name",
  category: "exclusive",
  school: School.X,
  book: "book_name",
  provides: [TargetCategory.Y],
  requires: "free", // or [TargetCategory.Z]
},
```

**`lib/domain/platforms.ts`** — Add entry to `PLATFORMS`:

```typescript
{
  book: "book_name",
  primaryAffix: "primary_affix_name",
  school: School.X,
  namedEntities: ["entity_name"], // or []
  provides: [TargetCategory.Damage, ...],
},
```

**`lib/domain/named-entities.ts`** — If new named entity, add entry to `NAMED_ENTITIES`:

```typescript
{
  name: "entity_name",
  createdBy: "book_name",
  primaryAffix: "primary_affix_name",
  transform: "transform_type",
  inputs: [{ input: "input_name", source: "connector_name" }],
  outputs: ["description"],
  operatorPorts: [TargetCategory.X],
},
```

---

## Step 5: Verify

```bash
# All tests pass
bun test

# Combo search works for new platform
bun app/combo-search.ts --platform book_name

# List all platforms
bun app/combo-search.ts --list
```

**Verification checklist:**
- [ ] New book appears in `bun app/combo-search.ts --list`
- [ ] Platform provides match what the raw data describes
- [ ] Pruned affixes make sense (only T10-dependent affixes should be pruned for most platforms)
- [ ] Chain discovery finds expected amplifier chains
- [ ] All existing tests still pass

---

## When Only Parameters Change

If a book's parameters change (e.g., damage values, durations) but mechanics don't:

1. Update `data/raw/` files with new values
2. Re-run `bun run parse`
3. No domain doc or TypeScript changes needed — the framework is parameter-independent

---

## File Reference

| File | Role | Update when... |
|:---|:---|:---|
| `data/raw/主书.md` | Main skill data | New book or parameter change |
| `data/raw/专属词缀.md` | Exclusive affix data | New book or parameter change |
| `docs/data/domain.category.md` | Affix taxonomy + bindings | New exclusive affix |
| `docs/data/domain.graph.md` | Graph model + platforms | New platform or named entity |
| `docs/data/domain.path.md` | Path catalog + projections | New platform |
| `lib/domain/bindings.ts` | Affix bindings (61→N) | New exclusive affix |
| `lib/domain/platforms.ts` | Platform registry (9→N) | New platform |
| `lib/domain/named-entities.ts` | Named entities (6→N) | New named entity |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-05 | Initial: full workflow from raw data to combo search |
