---
initial date: 2026-2-25
dates of modification: [2026-2-25, 2026-3-5, 2026-3-9, 2026-3-14]
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


# Divine Book (灵书)

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Structured data extraction for the Divine Book (灵书) mechanic** — a cultivation combat system comprising 28 skill books across four schools. Grammar-based parser extracts structured data from Chinese prose into YAML.

---

## Architecture

```
data/raw/主书.md          ─→  lib/parser/  ─→  data/yaml/books.yaml
data/raw/专属词缀.md      ─→               ─→
data/raw/通用词缀.md      ─→               ─→  data/yaml/affixes.yaml
data/raw/修为词缀.md      ─→               ─→
```

Grammar-based parser that reads Chinese prose directly from markdown tables. No LLM, no intermediate normalized format. Deterministic extraction using regex patterns across 5 grammar types.

| Layer | What | Where |
|:------|:-----|:------|
| MD Table Reader | Raw markdown → per-book cells | `lib/parser/md-table.ts` |
| Book Lookup | 28 books → grammar classification (G2–G6) | `lib/parser/book-table.ts` |
| Split Engine | Grammar-driven per-book parsing | `lib/parser/split.ts` |
| Regex Extractors | Pattern-matching functions for Chinese prose | `lib/parser/extract.ts` |
| State Extractor | 【name】patterns → state registry | `lib/parser/states.ts` |
| Tier Resolver | Enlightenment/fusion tier variable substitution | `lib/parser/tiers.ts` |
| Emitter | ParsedBook → BookData → YAML | `lib/parser/emit.ts` |
| Common Affixes | Universal + school affix parsing | `lib/parser/common-affixes.ts` |
| Exclusive Affixes | Per-book exclusive affix parsing | `lib/parser/exclusive.ts` |
| Verification | Coverage, double-match, staleness checks | `lib/parser/verify.ts` |

**Docs:** [diagram.main.md](docs/parser/diagram.main.md), [note.update.md](docs/parser/note.update.md)

## Quick Start

```bash
bun install
bun run test                                           # 87 tests

# Parser
bun app/parse-main-skills.ts                           # parse all books → stdout
bun app/parse-main-skills.ts -o data/yaml/books.yaml   # regenerate books.yaml
bun app/parse-main-skills.ts --book 通天剑诀            # debug single book
bun app/parse-affixes.ts -o data/yaml/affixes.yaml     # regenerate affixes.yaml
bun app/verify-parser.ts                               # verify parser consistency

# Checks
bun run check                                          # typecheck + lint
```

## Tools

| Tool | Purpose |
|:-----|:--------|
| `app/parse-main-skills.ts` | `data/raw/主书.md` + `专属词缀.md` → `data/yaml/books.yaml` |
| `app/parse-affixes.ts` | `data/raw/通用词缀.md` + `修为词缀.md` → `data/yaml/affixes.yaml` |
| `app/verify-parser.ts` | Verify parser coverage, double-matches, YAML staleness |

## Project Structure

```
app/
  parse-main-skills.ts           Parse main books + exclusive affixes → books.yaml
  parse-affixes.ts               Parse universal + school affixes → affixes.yaml
  verify-parser.ts               Parser verification CLI
lib/
  data/
    types.ts                     Shared types: EffectRow, BookData, AffixSection, StateDef
  parser/
    md-table.ts                  Layer 1: markdown table reader
    book-table.ts                Static lookup: 28 books → grammar
    split.ts                     Layer 2: per-book grammar parsers
    states.ts                    Layer 3: named state extraction
    extract.ts                   Layer 4: regex pattern extractors
    tiers.ts                     Tier resolution + variable substitution
    emit.ts                      Emitter: ParsedBook → BookData → YAML
    common-affixes.ts            Universal + school affix parser
    exclusive.ts                 Exclusive affix parser
    verify.ts                    Parser verification agent
    index.ts                     Orchestrator: parseMainSkills(), parseSingleBook()
    parser.test.ts               87 tests
data/
  raw/                           Source of truth (Chinese prose)
  yaml/                          Parsed output (books.yaml, affixes.yaml)
docs/
  parser/                        Parser docs
  data/                          Domain analysis docs (reference)
  model/                         Combat model docs (reference)
  books/                         Build guides, PvP scenarios (reference)
```

## Documentation

### Parser

| Document | Purpose |
|:---------|:--------|
| [diagram.main.md](docs/parser/diagram.main.md) | Parser pipeline class diagrams |
| [note.update.md](docs/parser/note.update.md) | Parser current state — scope, files, grammars |
| [note.common.md](docs/parser/note.common.md) | Common affix parser notes |
| [note.school.md](docs/parser/note.school.md) | School affix parser notes |
| [note.verify.md](docs/parser/note.verify.md) | Verification agent notes |

### Reference (from prior work)

Design docs from modeling, book construction, and simulator work are preserved in `docs/` for reference. The code for these processes has been removed — only the parser is active.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-25 | Initial project README |
| 2.0 | 2026-03-05 | Full rewrite — four-layer architecture |
| 3.0 | 2026-03-09 | Three-process architecture (data, modeling, book construction) |
| 4.0 | 2026-03-14 | Four-process architecture: grammar-based parser replaces LLM pipeline, combat simulator added, stale artifacts removed |
| 5.0 | 2026-03-16 | Project cleanup — parser only, remove stale code |
