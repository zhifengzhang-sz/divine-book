# Agent: Extract Normalized Data

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Extraction agent.** Reads `data/raw/*.md` (split source files) and produces `data/normalized/normalized.data.cn.md` + `data/normalized/normalized.data.md` using `data/keyword/keyword.map.cn.md` as the parsing specification. This is the first stage of the data pipeline.

## Inputs

| File | Role |
|:---|:---|
| `data/raw/*.md` | Source prose files — `主书.md`, `通用词缀.md`, `修为词缀.md`, `专属词缀.md`, `构造规则.md` (NOT `about.md` — that is a stale monolithic original) |
| `data/keyword/keyword.map.cn.md` | Effect type vocabulary, field specs, units, data_state vocabulary |

## Outputs

| File | Description |
|:---|:---|
| `data/normalized/normalized.data.cn.md` | Chinese version — table headers in Chinese, all content |
| `data/normalized/normalized.data.md` | English version — table headers in English, `> 原文:` blockquotes preserved in Chinese |

## Process

### §1. Preparation

1. Read `keyword.map.cn.md` fully. Internalize:
   - All effect type names and their Chinese keyword patterns
   - Field names and unit types for each effect type
   - Data state vocabulary (`enlightenment={n}`, `fusion={n}`, `max_fusion`, `locked`)
   - Condition vocabulary (`target_controlled`, `target_has_debuff`, etc.)
   - Default data_state per school (Sword/Demon = max enlightenment, Body = no enlightenment, Spell = unspecified)

2. Read all `data/raw/*.md` files fully. Identify the document structure across files:
   - 四修为 sections (剑修, 法修, 魔修, 体修) which may be split across multiple files (e.g., `主书.md`)
   - Affix tables spread across `通用词缀.md`, `修为词缀.md`, `专属词缀.md`
   - Construction rules in `构造规则.md` (used for exclusions and conventions)

### §2. Per-Book Extraction (28 books)

For each 功法书 found across the raw files:

1. **Identify school** from the section it appears in (剑修/法修/魔修/体修).

2. **Extract 主技能** (all 28 books have this in `主书.md`):
   - Copy the relevant Chinese text verbatim into a `> 原文:` blockquote.
   - Identify each effect in the description by matching keyword patterns from `keyword.map`.
   - For each effect × data_state tier mentioned, write one table row: `effect_type | fields | data_state`.
   - Fields use `key=value` format with commas separating pairs.
   - If multiple data_state tiers are given (e.g., 悟0境, 悟1境+融合20重, ...), write separate rows for each.
   - Data_state uses `key=value` format: `enlightenment=0`, `fusion=20`, `[enlightenment=1, fusion=20]` for compound.
   - Empty data_state = default for that school.

3. **Extract 主词缀** (all 28 books have this in `主书.md`):
   - Same process as 主技能.
   - Section heading: `#### 主词缀【name】`.

4. **Extract 专属词缀** (all 28 books):
   - Same process.
   - Section heading: `#### 专属词缀【name】`.

### §3. Affix Table Extraction

1. **通用词缀** (16 affixes):
   - Copy all affix descriptions into a single `> 原文:` blockquote.
   - Write a 4-column table: `affix | effect_type | fields | data_state`.
   - Compound affixes (multiple effects) get multiple rows with the same affix name.
   - Random effect options: one `random_buff`/`random_debuff` row + one row per option with `parent=affix_name`.

2. **修为词缀** (4 schools × 4-5 affixes each):
   - Group by school under `### School` subheadings.
   - Same 4-column format as 通用词缀.

### §4. Nested Effect Handling

When an effect creates a named state that has sub-effects:

- The parent effect gets its own row (e.g., `counter_debuff | name=罗天魔咒, duration=8, on_attacked_chance=30`).
- Each sub-effect gets a row with `parent=ParentName` in its fields (e.g., `dot | name=噬心魔咒, parent=罗天魔咒, ...`).
- This flattens the hierarchy into a parseable table while preserving the relationship.

### §5. Output Formatting

Follow the format in the existing `normalized.data.cn.md` exactly:

- H1, Authors, role blockquote
- Meta section with data source, scope, exclusions, counts, default convention table, field format convention
- Sections: 一、功法书 → 二、通用词缀 → 三、修为词缀

For the English version (`normalized.data.md`):
- Translate section headings (一 → I, 功法书 → Skill Books, 主技能 → Main Skill, etc.)
- Translate table column headers (效果类型 → effect_type, 字段 → fields, 词缀 → affix)
- Translate school names in brackets ([剑修] → [Sword], [法修] → [Spell], [魔修] → [Demon], [体修] → [Body])
- Preserve all `> 原文:` blockquotes in Chinese
- Preserve all Chinese names in backticks and lenticular brackets verbatim

## Rules

1. **No inference.** Only extract values explicitly stated in the source files (`data/raw/*.md`). If a value requires calculation or interpolation, do not include it.
2. **No prose in fields.** The `fields` column contains only `key=value` pairs — never Chinese sentences.
3. **Verbatim numbers.** Copy numeric values exactly as they appear in the source files. Do not round, convert, or normalize.
4. **Verbatim blockquotes.** The `> 原文:` text must be findable in the source files as-is.
5. **Exclude shared mechanics.** Fusion damage, enlightenment damage, and cooldown are 功法书 base mechanics — not 灵书 effects. Do not extract them.
6. **One row per effect × data_state.** Never combine multiple data_state tiers into one row.
7. **Signed debuff values.** When a debuff reduces a stat, the value must be negative. `value=-31` means "reduces by 31%". Positive values = increases/buffs. Negative values = reductions/debuffs.
8. **Affix bracket convention.** Affix names in the `词缀` column must use lenticular brackets: `【name】`.
9. **Random effect decomposition.** Random effects must be decomposed into parent + child rows using `parent=` field, consistent with §4. The parent row's options field lists only the type names: `options=[type1, type2, type3]`.
