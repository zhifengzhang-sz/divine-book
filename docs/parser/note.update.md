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

The old parser (`lib/parse.ts`) and its normalized data pipeline (`data/normalized/`) have been removed. The `effects.yaml` file remains as a static data artifact for the simulator bridge, but is no longer regenerated.

## Scope

- **In scope**: main skills + primary affixes from `data/raw/主書.md`
  - 28 books, each with `school`, `skill` effects, `primary_affix`, and `states` registry
- **Not yet implemented**: exclusive affixes (`專屬詞綴.md`), universal affixes (`通用詞綴.md`), school affixes (`修為詞綴.md`)

The simulator target is **main book vs main book** (platform + primary affix only).

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
Simulator bridge / effects.yaml / JSON
```

## Type Ownership

Types live in the files that define them:

| Type | Defined in | Purpose |
|---|---|---|
| `EffectRow` | `emit.ts` | `{ type: string; [k]: unknown }` — single parsed effect |
| `BookData` | `emit.ts` | Emitter output — per-book structured data |
| `AffixSection` | `emit.ts` | `{ name, effects[] }` — affix name + its effects |
| `StateDef` | `states.ts` | Named state lifecycle metadata |
| `StateRegistry` | `states.ts` | `Record<string, StateDef>` |
| `ParsedBook` | `split.ts` | Internal parse result before emission |
| `ExtractedEffect` | `extract.ts` | Single regex extractor output |
| `NamedStateInfo` | `extract.ts` | Named state extracted from prose |
| `RawBookEntry` | `md-table.ts` | Raw markdown table row |
| `SplitCell`, `TierLine` | `md-table.ts` | Cell split into description + tier data |
| `TierSpec` | `tiers.ts` | Tier variable bindings |
| `Grammar`, `BookMeta` | `book-table.ts` | Static per-book grammar classification |
| `ParseResult` | `index.ts` | Orchestrator output: books + warnings + errors |

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
| `lib/parser/split.ts` | 1147 | Layer 2: per-book grammar parsers, produces `ParsedBook` |
| `lib/parser/states.ts` | 249 | Layer 3: named state extraction → `StateRegistry`, `StateDef` |
| `lib/parser/extract.ts` | 928 | Layer 4: 31 regex pattern extractors for Chinese prose |
| `lib/parser/tiers.ts` | 121 | Tier resolution + variable substitution |
| `lib/parser/emit.ts` | 199 | Emitter: `ParsedBook` → `BookData`, shared output types |
| `lib/parser/index.ts` | 117 | Orchestrator: `parseMainSkills()`, `parseSingleBook()` |
| `lib/parser/parser.test.ts` | 516 | 57 tests, 313 assertions |
| `app/parse-main-skills.ts` | — | CLI: `--book`, `--verify`, `--output` |

Total: ~3,486 lines of parser code.

## Grammars

Each book maps to one of 5 grammar types in `BOOK_TABLE`:

| Grammar | Pattern | Example Books |
|---|---|---|
| G2 | `base_attack` + effects | 春黎剑阵, 大罗幻诀 |
| G3 | `base_attack` + named state | 甲元仙符, 千锋聚灵剑 |
| G4 | `hp_cost` + `base_attack` + effects | 十方真魄, 煞影千幻 |
| G5 | `hp_cost` + `base_attack` + named state | 玄煞灵影诀 |
| G6 | `base_attack` + cleanse + carry | 疾风九变 |

## Downstream: Simulator Bridge

The bridge (`lib/simulator/bridge.ts`) reads parser output via `getBookStates(bookName)`:

1. **State lifecycle**: `target`, `duration`, `max_stacks`, `trigger`, `chance`, `per_hit_stack`, `dispellable` from the registry
2. **Entity stat buffs**: `attack_bonus`/`defense_bonus` routed to `atk_modifier`/`def_modifier` on StateDef
3. **Derived stats**: Entity caches `effective_atk`, `effective_dr`, `buff_modifiers` via `computeDerivedStats()`
4. **Simultaneous resolution**: Arena resolves both sides against same snapshot, applies events, ticks states

Bridge imports:
- `BookData` from `lib/parser/emit`
- `StateDef` from `lib/parser/states`
- `parseMainSkills` from `lib/parser/index`

## What was removed (2026-03-13)

The old parser pipeline and all its artifacts:

| Removed | Was |
|---|---|
| `lib/parse.ts` | Old parser: normalized.data.md → effects.yaml |
| `lib/parse.test.ts` | Old parser tests |
| `lib/parse.groups.ts` | Deprecated groups parser |
| `app/parse.ts` | Old parser CLI |
| `data/normalized/` | Hand-curated normalized tables (old pipeline input) |
| `tmp-verify-output/` | Old pipeline verification output |
| `scripts/verify-pipeline.ts` | Old pipeline verification script |

The `data/yaml/effects.yaml` file remains as a static artifact — it contains all book data including exclusive/universal/school affixes. The simulator bridge still reads from it for effect routing. But it is no longer regenerated by any parser.
