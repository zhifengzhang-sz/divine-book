---
initial date: 2026-03-23
parent: design.md
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

# IO Implementation — Input Readers, Output Emitters, Tier Resolution

These files are the layers around the grammar system. They read raw markdown, resolve tier variables, and emit YAML output. They predate the per-book grammar redesign and need rewiring to use the new grammar system.

---

## §1 Pipeline Overview

```
data/raw/主书.md ──→ md-table.ts ──→ per-book raw text
                                          │
data/raw/通用词缀.md ──→ common-affixes.ts ──→ affix raw text
data/raw/修为词缀.md ──┘                        │
                                                │
data/raw/专属词缀.md ──→ exclusive.ts ──→ exclusive affix raw text
                                                │
                     ┌──────────────────────────┘
                     │
                     ▼
              grammars + semantics ──→ Effect[]
                     │
                     ▼
              tiers.ts ──→ resolve "x","y" → concrete numbers
                     │
                     ▼
              emit.ts ──→ YAML output
                     │
                     ▼
              index.ts ──→ orchestrates the full pipeline
```

---

## §2 Files

### `md-table.ts` — Markdown Table Reader

**Status:** Works. No broken imports.

Reads `data/raw/主书.md`. Parses the markdown tables (`| 功法书 | 功能 | 主词缀 |`) into structured entries per book.

```typescript
interface RawBookEntry {
  name: string;       // "千锋聚灵剑"
  school: string;     // "剑修"
  skillText: string;  // raw Chinese prose (with backticks, tier lines, <br>)
  affixText: string;  // primary affix raw text
}
```

Also exports `SCHOOL_MAP` (Chinese school name → English) and `splitCell()` (splits `<br>`-delimited cells into description + tier lines).

### `common-affixes.ts` — Common & School Affix Reader

**Status:** Broken import (`pipeline.ts` deleted). Needs rewiring.

Reads `data/raw/通用词缀.md` and `data/raw/修为词缀.md`. Parses 2-column tables (`词缀 | 效果描述`) into affix entries.

```typescript
interface AffixEntry {
  name: string;       // "咒书"
  effects: EffectRow[];
}
```

Currently calls `runPipeline()` from the deleted old pipeline. Needs to call the per-affix grammar + semantics instead.

### `exclusive.ts` — Exclusive Affix Reader

**Status:** Broken import (`pipeline.ts`, `state-builder.ts` deleted). Needs rewiring.

Reads `data/raw/专属词缀.md`. Parses 3-column tables (`功法 | 词缀 | 效果描述`) into per-book exclusive affix entries.

Currently calls `runPipeline()`. Needs to call each book's `exclusiveAffix` grammar rule instead.

### `tiers.ts` — Tier Resolution

**Status:** Works. No broken imports.

Parses tier lines (e.g., `悟0境：x=1500, y=11`) and substitutes variable references in effects.

```typescript
interface TierSpec {
  enlightenment?: number;  // 悟境 level
  fusion?: number;         // 融合 level
  locked?: boolean;
  vars: Record<string, number>;  // { x: 1500, y: 11 }
}
```

Takes `Effect[]` with string variable references (`total: "x"`) and produces resolved copies (`total: 1500`) tagged with `data_state`.

### `emit.ts` — YAML Emitter

**Status:** Works. No broken imports.

Converts parsed book data into the YAML format consumed by the simulator.

```typescript
function emitBooks(books: ParsedBook[]): Record<string, BookData>
function formatYaml(data: object): string
function cleanEffects(effects: EffectRow[]): EffectRow[]  // strip internal fields
```

### `index.ts` — Orchestrator

**Status:** Broken imports (`book-table.ts`, `pipeline.ts` deleted). Needs rewrite.

Wires all layers together. Current flow (broken):

1. Read 主书.md → md-table.ts → per-book raw cells
2. For each book: old pipeline → effects
3. For each book: primary affix → old pipeline → effects
4. Read 专属词缀.md → exclusive.ts → merge into books
5. Emit YAML

New flow (to implement):

1. Read 主书.md → md-table.ts → per-book raw cells
2. For each book: load book grammar → `grammar.match(text, "skillDescription")` → semantics → `Effect[]`
3. For each book: `grammar.match(affixText, "primaryAffix")` → semantics → `Effect[]`
4. For each book: `grammar.match(exclusiveText, "exclusiveAffix")` → semantics → `Effect[]`
5. Common/school affixes: load affix grammar → `grammar.match(text, "affixDescription")` → semantics → `Effect[]`
6. Tier resolution → emit YAML

---

## §3 Rewiring Plan

| File | Status | Work needed |
|------|--------|-------------|
| `md-table.ts` | ✓ Works | None |
| `tiers.ts` | ✓ Works | None |
| `emit.ts` | ✓ Works | None |
| `common-affixes.ts` | ✗ Broken | Replace `runPipeline()` with affix grammar + semantics calls |
| `exclusive.ts` | ✗ Broken | Replace `runPipeline()` with per-book `exclusiveAffix` grammar calls |
| `index.ts` | ✗ Broken | Rewrite orchestration to load per-book grammars and call semantics |
