# Agent: Verify Coverage (about.md ↔ normalized.data)

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Coverage verification agent.** Validates that `normalized.data` faithfully and completely represents the data in `about.md`. Checks source traceability, numeric accuracy, and completeness. Does not check schema conformance — that is the schema agent's job.

## Inputs

| File | Role |
|:---|:---|
| `data/raw/about.md` | Source of truth — volatile Chinese prose |
| `docs/data/normalized.data.cn.md` (or `.md`) | Extraction to validate |

## Checks

### Check 1: Source Traceability

For every `> 原文:` blockquote in normalized.data:

- **PASS**: The quoted text can be found in about.md (allowing minor whitespace differences).
- **FAIL**: The quoted text does not appear in about.md.

Report: list of unmatched blockquotes with their location in normalized.data.

### Check 2: Book Completeness

Count and verify all 功法书 entries:

- **Expected**: 28 books total (Sword 7, Spell 7, Demon 7, Body 7)
- **Expected detailed** (主技能 + 主词缀): 9 books
  - Sword: 千锋聚灵剑, 春黎剑阵, 皓月剑诀, 念剑诀
  - Spell: 甲元仙符
  - Demon: 大罗幻诀, 无相魔劫咒
  - Body: 十方真魄, 疾风九变
- **Expected exclusive-only**: 19 books (remaining)
- **PASS**: All 28 books present, 9 have full sections, all 28 have exclusive affix.
- **FAIL**: Missing book, missing section, or wrong count.

Report: list of missing/extra books, missing sections.

### Check 3: Affix Completeness

Count and verify all affix entries:

- **通用词缀**: 16 expected (list each by name from about.md)
- **修为词缀**:
  - 剑修: 4 (摧云折月, 灵犀九重, 破碎无双, 心火淬锋)
  - 法修: 4 (长生天则, 明王之路, 天命有归, 景星天佑)
  - 魔修: 4 (瑶光却邪, 溃魂击瑕, 玄女护心, 祸星无妄)
  - 体修: 5 (金刚护体, 破灭天光, 青云灵盾, 贪狼吞星, 意坠深渊)
- **PASS**: All affixes present with correct names.
- **FAIL**: Missing or extra affix.

Report: list of missing/extra affixes.

### Check 4: Numeric Accuracy

For each data row in normalized.data, trace the numeric values back to about.md:

- **PASS**: Every numeric value in the `fields` column matches the corresponding number in the about.md source text.
- **FAIL**: A value differs from about.md (wrong number, swapped fields, transcription error).

Report: list of mismatched values with expected (from about.md) vs actual (from normalized.data).

### Check 5: Data State Tier Coverage

For books with multiple data_state tiers in about.md (千锋聚灵剑, 甲元仙符, etc.):

- **PASS**: Every data_state tier mentioned in about.md has corresponding rows in normalized.data.
- **FAIL**: A tier present in about.md is missing from normalized.data.

Report: list of missing data_state tiers with book name and expected tier.

### Check 6: Effect Coverage

For each effect description in about.md, verify it has at least one corresponding row in normalized.data:

- **PASS**: The effect is represented (correct effect_type, fields capture the described behavior).
- **WARN**: The effect is partially captured (some aspects of the description are not reflected in the fields).
- **FAIL**: The effect description in about.md has no corresponding row in normalized.data.

This is the most judgment-intensive check — it requires understanding both the Chinese source text and the effect type mapping.

Report: list of uncaptured or partially captured effects.

### Check 7: Exclusion Verification

Verify that shared mechanics are correctly excluded:

- **PASS**: No rows for `fusion_flat_damage`, `mastery_extra_damage`, `enlightenment_damage`, or `cooldown` in normalized.data.
- **FAIL**: Shared mechanics leaked into normalized.data.

Report: list of incorrectly included shared mechanics rows.

## Output Format

```
## Coverage Verification Report

### Summary
- Books: N/28 present (N/9 detailed, N/19 exclusive-only)
- 通用词缀: N/16 present
- 修为词缀: N/17 present
- Source blockquotes: N total, N matched, N unmatched
- Numeric values: N checked, N correct, N mismatched
- Data state tiers: N expected, N present, N missing
- Effect coverage: N descriptions checked, N fully captured, N partial, N missing

### Failures (must fix)
1. [FAIL] Missing book: `BookName` — expected in Sword section
2. [FAIL] Numeric mismatch: `千锋聚灵剑` Main Skill row 2 — field `total`: expected 11265, found 11256
3. [FAIL] Missing data_state tier: `甲元仙符` — enlightenment=7 not found

### Warnings (review)
1. [WARN] Partial capture: `BookName`【AffixName】— description mentions "xxx" but no field captures this

### Pass
- All 28 books present
- All blockquotes traceable
- Shared mechanics excluded
```

## Process

1. **Parse about.md** to build an inventory:
   - List of all 功法书 with their school
   - For each book: 主技能 text, 主词缀 text, 专属词缀 text (where present)
   - List of 通用词缀 with descriptions
   - List of 修为词缀 by school with descriptions
   - All data_state tiers mentioned for each section

2. **Parse normalized.data** to build a parallel inventory:
   - List of all book headings
   - For each book: section types present, blockquotes, table rows
   - List of affixes in 通用 and 修为 tables

3. **Run checks 1–7** by comparing the two inventories.

4. **Output report** in the format above.
