---
initial date: 2026-03-23
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

# Parser Design — Per-Book Grammar Architecture

---

## §1 Problem

Chinese RPG skill descriptions are prose text with embedded numeric variables. Each of 28 skill books has its own sentence structure. Additionally, there are common affixes (16), school affixes (4 schools × 4-5 each), primary affixes (25, per-book), and exclusive affixes (28, per-book).

The parser must turn this prose into typed, structured effect data for the combat simulator.

---

## §2 Why Per-Book Grammars

A monolithic grammar that handles all 28 books in one file fails because:

1. **PEG ordering fragility** — 60+ effect rules in one alternation. PEG tries left-to-right, first match wins. Rule ordering bugs are silent — the wrong rule matches and you get wrong data.
2. **Shared optionals accumulate** — to handle variants across books (`"共计"` vs `"共"`, `"灵法伤害"` vs `"伤害"`), every rule grows optional branches. The grammar becomes "match anything that looks vaguely like an attack."
3. **Post-processing creep** — effects that naturally compose in one book must be post-processed to fold together because the monolithic grammar matches them independently.

Per-book grammars solve all three: each grammar matches **exactly** one book's text, nothing more.

---

## §3 Architecture

Each book has **one grammar file** with **three entry points**. Three separate inputs (from three markdown table columns) go through the same grammar, each using its own entry point:

```
                        千锋聚灵剑.ohm
                    ┌───────────────────────┐
skill raw text  ──▶ │  skillDescription     │ ──▶ parse tree ──▶ Effect[]
                    │                       │
affix raw text  ──▶ │  primaryAffix         │ ──▶ parse tree ──▶ Effect[]
                    │                       │
excl. raw text  ──▶ │  exclusiveAffix       │ ──▶ parse tree ──▶ Effect[]
                    └───────────────────────┘
                              │
                        千锋聚灵剑.ts (semantics)
```

The grammar defines the boundaries — it knows which entry point handles which input. The semantics extract typed effects from each parse tree. Same `.ohm` file, same `.ts` file, three inputs, three outputs.

### §3.1 Separation of Concerns

| Component | Role |
|-----------|------|
| **Grammar** (`.ohm`) | Defines structure AND boundaries — three entry points for three inputs |
| **Semantics** (`.ts`) | Extracts typed `Effect[]` from parse tree nodes |
| **Effect types** (`effect-types.ts`) | Contract between parser and simulator |

### §3.2 What Lives in the Grammar

The grammar is the center of the system. For each book it defines:

- `skillDescription` — the main skill text structure (all 28 books)
- `primaryAffix` — the per-book primary affix (25/28 books)
- `exclusiveAffix` — the per-book exclusive affix (all 28 books)

These are three **entry points** in the same `.ohm` file, not three separate grammars. The grammar knows the boundary between skill text and affix text — it's encoded in the rule structure.

Shared affixes (common + school) have their own grammars since they apply across books, not per-book.

### §3.3 Inheritance

All grammars inherit from `Base.ohm` which provides universal vocabulary: `varRef`, `stateName`, `cnNumber`, `gapTo`. No effect rules — effect patterns stay in each book because the same concept (e.g., "base attack") has different phrasing per book.

---

## §4 Effect Types

Effect types are the contract between parser and simulator. They form a TypeScript discriminated union — each variant has a `type` field and specific fields for that effect.

### §4.1 VarRef Convention

Most numeric fields are string variable references (`"x"`, `"y"`, `"1500"`) — not resolved numbers. They get resolved to concrete values later by tier lookup. Only structurally derived values (like `hits` from Chinese numerals) are parsed to `number`.

### §4.2 Consistency Rule

When the same effect type appears in multiple books (e.g., `base_attack` in all 28), every semantic action that produces it must return the same fields. The TypeScript type enforces this at compile time.

---

## §5 Decisions

### §5.1 Why not one grammar per school?

Each book within a school has a unique sentence structure. 千锋聚灵剑 (sword) has `baseAttack + damageWithCap`. 念剑诀 (sword) has `untargetable + baseAttack + periodicEscalation`. Grouping by school would recreate the monolithic problem.

### §5.2 Why primary + exclusive affixes in the book grammar?

They belong to the book. The primary affix for 千锋聚灵剑 (【惊神剑光】) is as book-specific as its skill description. Scattering one book's data across multiple files was wrong.

### §5.3 Why keep the original grammars as ground truth?

Each was written by walking through the raw data for that specific book. They're the reference for what the raw text actually looks like. Any enriched or refactored grammar is derived from them, not the other way around.

### §5.4 Why Base.ohm has only vocabulary?

Common effect patterns (like "base attack") exist across books but with different phrasing. Putting a "flexible" rule in Base that handles all variants leads back to the monolithic problem. Vocabulary (`varRef`, `stateName`, `cnNumber`) is genuinely universal — it's syntax, not semantics.
