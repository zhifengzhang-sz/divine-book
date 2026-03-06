---
initial date: 2026-2-25
dates of modification: [2026-2-25]
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

# Usage: Divine Book Pipeline Workflow

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Practical workflow guide.** This document describes the day-to-day usage of the Divine Book (灵书) data pipeline — how to run the extraction and verification agents, in what order, and for which scenarios. It assumes familiarity with the agent specs (`.claude/commands/extract.md`, `verify-schema.md`, `verify-coverage.md`) and is intended as a quick-reference for developers operating the pipeline.

## File Map

```
data/raw/about.md                    <- sole source of truth (volatile Chinese prose)
.claude/commands/
├── extract.md                       <- /extract — extraction agent spec
├── verify-schema.md                 <- /verify-schema — schema verification agent spec
└── verify-coverage.md               <- /verify-coverage — coverage verification agent spec
docs/data/
├── keyword.map.cn.md                <- parsing spec (Chinese)
├── keyword.map.md                   <- parsing spec (English, default)
├── normalized.data.cn.md            <- extracted data (Chinese)
├── normalized.data.md               <- extracted data (English, default)
├── design.md                        <- pipeline design rationale
└── usage.dev.md                     <- this file
lib/schemas/
└── effect.ts                        <- Zod schema (derived from keyword.map)
```

| File | Purpose |
|:---|:---|
| `about.md` | Game designer's authoritative description of all 28 books, 16 universal affixes, and 17 school affixes. Written in Chinese prose. This is the only data source. |
| `keyword.map.cn.md` / `.md` | Defines the effect type vocabulary, field names, units, data_state vocabulary, and condition vocabulary. Acts as the schema for normalized.data. |
| `normalized.data.cn.md` / `.md` | Structured extraction of about.md — markdown tables with `effect_type`, `fields` (key=value pairs), and `data_state` columns. Chinese and English versions are kept in sync. |
| `.claude/commands/extract.md` | Extraction agent spec — Claude Code slash command `/extract`. Tells the LLM how to read about.md and produce normalized.data. |
| `.claude/commands/verify-schema.md` | Schema verification agent spec — slash command `/verify-schema`. Validates normalized.data against keyword.map. |
| `.claude/commands/verify-coverage.md` | Coverage verification agent spec — slash command `/verify-coverage`. Validates normalized.data against about.md. |
| `design.md` | Explains the rationale behind the pipeline architecture and design decisions. |

## Workflow: When about.md Changes

This is the most common scenario — the game designer updates book descriptions, tweaks numbers, or revises effect text.

**Step 1: Run the extraction agent.**

Feed the agent three files and it produces two outputs:

In Claude Code, run `/extract`. Or feed the agent the input files:

| Input | Output |
|:---|:---|
| `about.md` + `keyword.map.cn.md` | `normalized.data.cn.md` |
| `about.md` + `keyword.map.md` | `normalized.data.md` |

The Chinese version is produced first (since about.md is in Chinese), then the English version is produced by translating headings and table headers while preserving all Chinese content in blockquotes and backticks.

**Step 2: Run both verification agents (can be run in parallel).**

| Agent | Inputs | What it checks |
|:---|:---|:---|
| Schema verification | `keyword.map.md` + `normalized.data.md` | Effect type names, field names, value types, data_state vocabulary |
| Coverage verification | `about.md` + `normalized.data.cn.md` | Book/affix completeness, numeric accuracy, source traceability, effect coverage |

These two agents check orthogonal properties. Schema verification does not look at about.md; coverage verification does not look at keyword.map. Both must pass.

**Step 3: Review verification reports — fix any FAILs.**

- FAIL items must be resolved before proceeding. Either re-run the extraction agent with corrections or manually edit normalized.data.
- WARN items should be reviewed but may be acceptable.
- INFO items are advisory (e.g., unused effect types in keyword.map).

**Step 4: Review the diff between old and new normalized.data.**

Use `git diff` or your editor's diff view. Look for:

- Unexpected row additions or deletions (indicates the agent hallucinated or missed something)
- Formatting changes (ordering, whitespace) that are not verification failures but still affect readability
- Blockquote text that was paraphrased rather than copied verbatim

**Step 5: Commit.**

Commit `normalized.data.cn.md` and `normalized.data.md` together. The about.md change should already be committed or included in the same commit.

## Workflow: When keyword.map Changes

This happens when the effect type vocabulary evolves — for example, a new effect type is added, a field is renamed, or a unit type is corrected.

**Step 1: Update both keyword.map files.**

Edit `keyword.map.cn.md` and `keyword.map.md` to stay in sync.

**Step 2: Run schema verification against existing normalized.data.**

This tells you whether the existing data still conforms to the updated schema.

**Step 3: If schema failures exist, fix normalized.data.**

Two options:

- Re-run the extraction agent to regenerate normalized.data from scratch.
- Manually edit normalized.data to match the updated schema (faster for small changes like a field rename).

**Step 4: Run coverage verification to ensure nothing was lost.**

If you re-ran extraction, coverage verification confirms the new output is still faithful to about.md. If you manually edited, it confirms you did not accidentally corrupt data.

**Step 5: Commit both keyword.map and normalized.data together.**

## Workflow: When a New Book is Added

This happens when the game designer introduces a new book in about.md.

**Step 1: Game designer updates about.md with the new book data.**

The new book appears under its school section (Sword, Spell, Demon, or Body).

**Step 2: If new effect types are needed, update keyword.map first.**

Check whether the new book's effects use any types not yet defined in keyword.map. If so, add them to both `keyword.map.cn.md` and `keyword.map.md` before running extraction.

**Step 3: Run the full pipeline: extract, then verify schema, then verify coverage.**

This is the same as the "about.md changes" workflow but with special attention to the new book's rows in the verification reports.

**Step 4: Commit all changed files.**

This includes: `about.md` (if not already committed), both `keyword.map` files (if updated), and both `normalized.data` files.

## Workflow: Downstream Code Outputs

After normalized.data is stable and verified, it can be consumed by code parsers:

```
normalized.data -> [code parser ~100 LOC] -> effects.yaml, scaling_data, etc.
```

The code parser performs these steps:

1. **Split by headings**: match `^#{2,4} (.+)$` to identify sections (school, book, skill/affix).
2. **Parse markdown tables**: split each row by `|`, strip whitespace, map to column headers.
3. **Parse `key=value` pairs**: split the `fields` column by `,` then each pair by `=`.
4. **Map heading hierarchy to structure**: heading depth determines whether you are at the school, book, or section (main skill / main affix / exclusive affix) level.
5. **Reconstruct nested effects**: rows with `parent=SomeName` in their fields are children of the row where `name=SomeName`. Reassemble the tree.

Because normalized.data is plain markdown with a strict, predictable format, the parser is simple string processing — no NLP, no ambiguity, no special cases.

## Running the Agents

### With Claude Code (slash commands)

The agents are registered as Claude Code custom commands in `.claude/commands/`:

```
/extract              Run the extraction agent
/verify-schema        Run schema verification
/verify-coverage      Run coverage verification
```

### With Any LLM

The command files are self-contained prompts. To use them with any LLM:

1. Copy the content of the command file (e.g., `.claude/commands/extract.md`) into the system prompt or initial message.
2. Attach the required input files as context (listed in the "Inputs" table of each spec).
3. The LLM must have a sufficient context window to hold all input files simultaneously — about.md alone can be large.
4. The output should follow the format specified in the spec exactly.

No special tooling or API integration is required. The agents are pure text-in, text-out.

## Tips

- **Always run BOTH verification agents after extraction.** Schema verification and coverage verification catch different classes of errors. Schema catches invalid type names, malformed fields, and vocabulary violations. Coverage catches missing books, wrong numbers, and unfaithful blockquotes. Neither subsumes the other.

- **Review the diff, not just the verification report.** Some issues — formatting inconsistencies, row ordering changes, whitespace problems — are not verification failures but still matter for downstream parsers and readability. Always inspect `git diff` on normalized.data after regeneration.

- **The Chinese version is the primary working document.** Since about.md is written in Chinese, start verification with `normalized.data.cn.md` and `keyword.map.cn.md`. The English version is a translation of the structured output, not a separate extraction.

- **For partial updates, extract only the changed section.** If the game designer only changed one book, you can run extraction on just that book's section of about.md and manually merge the result into the existing normalized.data. This is faster and reduces the risk of unrelated changes. Run both verification agents afterward to confirm the merge is clean.

- **When in doubt, re-extract from scratch.** Manual edits to normalized.data accumulate risk. If the data has drifted or you are unsure of its state, a full re-extraction from about.md is the safest path. It takes a few minutes and the verification agents will confirm correctness.

- **Keep keyword.map and normalized.data in sync.** Never commit a keyword.map change without verifying that normalized.data still passes schema validation. Never commit a normalized.data change without verifying it against about.md for coverage.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-25 | Initial workflow and usage guide |
