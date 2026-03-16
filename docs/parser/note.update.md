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

# Main Skill Parser — Current State

## Overview

The grammar-based parser (`lib/parser/`) is the **sole parser** in the project. It reads `data/raw/主書.md` directly and produces structured `BookData` output — deterministic, no LLM, no intermediate normalized format.

The old parser (`lib/parse.ts`) and its normalized data pipeline (`data/normalized/`) have been removed.

## Scope

- **In scope**: main skills + primary affixes + exclusive affixes from `data/raw/主書.md`
  - 28 books, each with `school`, `skill` effects, `primary_affix`, `exclusive_affix`, and `states` registry
- Universal affixes and school affixes are implemented in `lib/parser/common-affixes.ts`

## Pipeline

```
data/raw/主書.md
    ↓  readMainSkillTables()
RawBookEntry[]  (name, school, skillText, affixText)
    ↓  splitCell()
SplitCell  (description lines + tier data)
    ↓  parseBook()  ← grammar from BOOK_TABLE
ParsedBook  (school, states, skill[], primaryAffix)
    ↓  emitBooks()
BookData  (school, states, skill[], primary_affix)
    ↓
data/yaml/books.yaml
```

## Type Ownership

Types live in the files that define them:

| Type | Defined in | Purpose |
|---|---|---|
| `EffectRow` | `lib/data/types.ts` (re-exported by `emit.ts`) | `{ type: string; [k]: unknown }` — single parsed effect |
| `BookData` | `lib/data/types.ts` (re-exported by `emit.ts`) | Emitter output — per-book structured data |
| `AffixSection` | `lib/data/types.ts` (re-exported by `emit.ts`) | `{ name, effects[] }` — affix name + its effects |
| `StateDef` | `lib/data/types.ts` (re-exported by `states.ts`) | Named state lifecycle metadata |
| `StateRegistry` | `states.ts` | `Record<string, StateDef>` |
| `ParsedBook` | `split.ts` | Internal parse result before emission |
| `ExtractedEffect` | `extract.ts` | Single regex extractor output |
| `NamedStateInfo` | `extract.ts` | Named state extracted from prose |
| `RawBookEntry` | `md-table.ts` | Raw markdown table row |
| `SplitCell`, `TierLine` | `md-table.ts` | Cell split into description + tier data |
| `TierSpec` | `tiers.ts` | Tier variable bindings |
| `Grammar`, `BookMeta` | `book-table.ts` | Static per-book grammar classification |
| `ParseResult` | `index.ts` | Orchestrator output: books + warnings + errors |
| `CommonAffixResult` | `common-affixes.ts` | Universal/school affix parse output |
| `ExclusiveAffixEntry` | `exclusive.ts` | Per-book exclusive affix entry |
| `VerifyReport`, `VerifyIssue` | `verify.ts` | Verification agent output types |

## State Registry

16 of 28 books have named states. The state registry separates lifecycle from mechanical behavior:

| Semantic | Where |
|---|---|
| Who is affected | `StateDef.target: self \| opponent \| both` |
| How long | `StateDef.duration: number \| "permanent"` |
| When it triggers | `StateDef.trigger: on_cast \| on_attacked \| per_tick` |
| Stacking rules | `StateDef.max_stacks`, `StateDef.per_hit_stack` |
| Parent-child | `StateDef.children: string[]` |
| Dispellable | `StateDef.dispellable: boolean` |

Effect rows describe pure mechanical behavior ("what happens"). The state registry owns lifecycle ("when, to whom, how long, how it stacks").

### YAML output example

```yaml
煞影千幻:
  school: Body
  states:
    落星:
      target: opponent
      duration: 4
      dispellable: false
      per_hit_stack: true
  skill:
    - type: self_hp_cost
      value: 20
    - type: base_attack
      hits: 3
      total: 1500
    - type: debuff
      name: 落星
      target: final_damage_reduction
      value: -8
      duration: 4
      per_hit_stack: true
      dispellable: false
```

## Files

| File | Lines | Role |
|---|---|---|
| `lib/parser/md-table.ts` | 154 | Layer 1: markdown table reader (`readMainSkillTables`, `splitCell`) |
| `lib/parser/book-table.ts` | 55 | Static lookup: 28 books → grammar type (G2–G6) |
| `lib/parser/split.ts` | 573 | Layer 2: per-book grammar parsers, produces `ParsedBook` |
| `lib/parser/states.ts` | 220 | Layer 3: named state extraction → `StateRegistry`, `StateDef` |
| `lib/parser/extract.ts` | 2527 | Layer 4: 99 regex pattern extractors (30 skill + 69 affix) for Chinese prose |
| `lib/parser/tiers.ts` | 126 | Tier resolution + variable substitution |
| `lib/parser/emit.ts` | 188 | Emitter: `ParsedBook` → `BookData`, re-exports shared types |
| `lib/parser/exclusive.ts` | 270 | Exclusive affix parser (`parseExclusiveAffix`, `readExclusiveAffixTable`) |
| `lib/parser/common-affixes.ts` | 205 | Universal + school affix parser (`parseCommonAffixes`) |
| `lib/parser/verify.ts` | 534 | Verification agent: coverage, double-match, YAML staleness checks |
| `lib/parser/index.ts` | 166 | Orchestrator: `parseMainSkills()`, `parseSingleBook()` |
| `lib/data/types.ts` | 37 | Shared data contract: `EffectRow`, `BookData`, `AffixSection`, `StateDef` |
| `lib/parser/parser.test.ts` | 771 | 87 tests, 440 assertions |
| `app/parse-main-skills.ts` | — | CLI: `--book`, `--verify`, `--output` |
| `app/parse-affixes.ts` | 83 | CLI: parse universal/school/exclusive affixes → YAML |
| `app/verify-parser.ts` | 157 | CLI: run verification agent |

Total: ~6,066 lines of parser code.

## Grammars

Each book maps to one of 5 grammar types in `BOOK_TABLE`:

| Grammar | Pattern | Example Books |
|---|---|---|
| G2 | `base_attack` + effects | 千锋聚灵剑, 春黎剑阵, 念剑诀, 通天剑诀, 新-青元剑诀, 无极御剑诀, 星元化岳, 玉书天戈符, 天轮魔经, 解体化形 |
| G3 | `base_attack` + named state | 皓月剑诀, 浩然星灵诀, 元磁神光, 周天星元, 甲元仙符, 天魔降临咒, 天刹真魔, 大罗幻诀, 梵圣真魔咒, 无相魔劫咒, 玄煞灵影诀, 九重天凤诀, 天煞破虚诀 |
| G4 | `hp_cost` + `base_attack` + effects | 惊蜇化龙 |
| G5 | `hp_cost` + `base_attack` + named state | 十方真魄, 疾风九变, 煞影千幻 |
| G6 | `base_attack` + cleanse + carry | 九天真雷诀 |

Previous parser and simulator code were removed during the 2026-03-16 cleanup.
