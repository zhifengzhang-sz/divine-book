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

# Parser Verification

The verification agent checks consistency between raw markdown sources and extracted structured data. It should be run after any change to extractors, parsers, or source markdown.

## Usage

```bash
bun app/verify-parser.ts           # full check, compact output
bun app/verify-parser.ts --verbose  # per-entry extractor details
bun app/verify-parser.ts --json     # machine-readable JSON
```

Exit code: `0` on pass, `1` if any errors.

Code: `lib/parser/verify.ts` (library), `app/verify-parser.ts` (CLI)

---

## What it checks

### Per-entry checks (run against every affix in every source)

| Check | Category | Severity | What it catches |
|-------|----------|----------|-----------------|
| **Coverage** | `coverage` | error | A raw affix text matched 0 extractors — new pattern needed |
| **Double match** | `double_match` | error | A text matched >1 extractor — missing exclusion guard |
| **Empty effects** | `empty_effects` | error/warn | Full pipeline produced 0 effects — extractor matched but resolution failed |
| **Unresolved var** | `unresolved_var` | error | A field in the output still contains a single letter like `"x"` instead of a number — tier variable not substituted |
| **Missing var** | `missing_var` | error | A field references variable `"y"` but the tier only has `{ x: 20 }` — var name mismatch |

### Global checks

| Check | Category | Severity | What it catches |
|-------|----------|----------|-----------------|
| **Duplicate registry** | `duplicate_registry` | error | Same extractor name registered twice in `AFFIX_EXTRACTORS` |
| **YAML staleness** | `yaml_stale` | error | `affixes.yaml` or `books.yaml` does not match what the parser would generate now |
| **YAML missing** | `yaml_missing` | warn | Output YAML file doesn't exist on disk |

---

## Sources verified

The agent reads all four raw markdown sources and verifies every parseable entry:

| Source | File | Entry count | Parser path |
|--------|------|-------------|-------------|
| Universal affixes | `data/raw/通用词缀.md` | 16 | `readUniversalAffixTable` → `genericAffixParse` |
| School affixes | `data/raw/修为词缀.md` | 17 | `readSchoolAffixTable` → `genericAffixParse` |
| Exclusive affixes | `data/raw/专属词缀.md` | 28 | `readExclusiveAffixTable` → `parseExclusiveAffix` |
| Primary affixes | `data/raw/主书.md` | 25 | `readMainSkillTables` → `parseBook` |

Total: **86 entries**.

Primary affixes have 3 books with empty affix cells (无极御剑诀, 九天真雷诀, 天煞破虚诀) — these are skipped, not counted as failures.

---

## Verification architecture

```
raw markdown (4 files)
  ├─ read*Table()           → entries (name, cell, school)
  │
  ├─ per entry:
  │   ├─ run AFFIX_EXTRACTORS individually  → matches[]
  │   │   └─ check: exactly 1 match
  │   │
  │   ├─ run full pipeline (genericAffixParse / parseExclusiveAffix / parseBook)
  │   │   └─ check: effects.length > 0
  │   │
  │   ├─ inspect resolved effects
  │   │   └─ check: no unresolved single-letter vars
  │   │
  │   └─ cross-check fields vs tier vars
  │       └─ check: every var reference exists in tier
  │
  ├─ global:
  │   ├─ AFFIX_EXTRACTORS registry  → check: no duplicate names
  │   ├─ affixes.yaml on disk       → check: matches fresh parse
  │   └─ books.yaml on disk         → check: matches fresh parse
  │
  └─ report: { entries[], issues[], summary }
```

### Two-layer verification

The agent runs extractors **twice** on each entry:

1. **Individual probe** — runs each `AFFIX_EXTRACTORS` extractor in isolation against the text. This reveals exactly which extractors fire, catching double matches that the pipeline would silently allow (since `genericAffixParse` collects all matches).

2. **Full pipeline** — runs the actual parser (`genericAffixParse`, `parseExclusiveAffix`, or `parseBook`). This catches issues in tier resolution, variable substitution, meta merging, and book-specific overrides.

If the individual probe finds 1 match but the full pipeline produces 0 effects, that's a resolution bug. If the probe finds 0 matches but the pipeline produces effects, that's a book-specific override (expected for primary/exclusive affixes).

---

## When to run

| Scenario | Required |
|----------|----------|
| Added or modified an extractor in `extract.ts` | Yes |
| Changed `genericAffixParse` or tier resolution | Yes |
| Updated raw markdown source files | Yes |
| Modified a book-specific parser in `split.ts` or `exclusive.ts` | Yes |
| Before committing any parser change | Yes |
| Added a new affix source file | Extend `verifyAll()` first, then yes |

### Recommended workflow

```bash
# 1. Make your change
vim lib/parser/extract.ts

# 2. Run unit tests
bun test lib/parser/parser.test.ts

# 3. Run verification agent
bun app/verify-parser.ts

# 4. Regenerate YAML if needed
bun app/parse-affixes.ts -o data/yaml/affixes.yaml
bun app/parse-main-skills.ts -o data/yaml/books.yaml

# 5. Run verification again (confirms YAML staleness resolved)
bun app/verify-parser.ts
```

---

## Example: catching a double match

Suppose someone adds a new extractor `extractDamageUp` that matches "伤害提升x%". Running the verifier:

```
═══ Universal Affixes (通用词缀) ═══
  ✗ universal/击瑕: [double_match] 2 extractors matched: conditional_damage_affix, damage_up
  ✗ universal/怒目: [double_match] 2 extractors matched: execute_conditional, damage_up
  14/16 clean

─── Summary ───
  Errors: 2
FAILED
```

The fix: add an exclusion guard to `extractDamageUp` for `控制效果` and `气血值低于` patterns.

## Example: catching a stale YAML

After modifying an extractor but forgetting to regenerate:

```
═══ Global Checks ═══
  ✗ [yaml_stale] affixes.yaml: data/yaml/affixes.yaml is out of sync with current parser output

─── Summary ───
  Errors: 1
FAILED
```

