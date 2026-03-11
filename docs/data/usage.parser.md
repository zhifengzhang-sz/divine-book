---
initial date: 2026-2-25
dates of modification: [2026-2-25, 2026-3-9]
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

# Usage: Parser

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Operational guide for the code parser** — Stage 3 of the Divine Book data pipeline. Covers installation, CLI usage, quality gates, and integration with the upstream extraction pipeline.

---

## Prerequisites

- [Bun](https://bun.sh) v1.2+

```
bun install
```

## Running the Parser

```
bun app/parse.ts <normalized-data.md> <output-dir>
```

| Argument | Description |
|:---|:---|
| `<normalized-data.md>` | Path to a `normalized.data.md` file (English headers) |
| `<output-dir>` | Directory for the generated YAML files |

The parser does not read `keyword.map.md` at runtime. The keyword map's influence is indirect: it constrains the extraction agent's output (which becomes `normalized.data.md`) and it is transcribed into the Zod schema (`lib/schemas/effect.ts`) at design time. See [impl.parser.md](impl.parser.md) §1 for details.

The default paths are available via the npm script:

```
bun run parse
```

This expands to:

```
bun app/parse.ts data/normalized/normalized.data.md data/yaml
```

## Output

The parser produces two YAML files:

### `effects.yaml`

Three top-level keys:

| Key | Structure | Content |
|:---|:---|:---|
| `books` | `Record<name, BookData>` | 28 books, each with `school`, optional `skill`, `primary_affix`, and `exclusive_affix` |
| `universal_affixes` | `Record<name, EffectRow[]>` | 16 universal affixes |
| `school_affixes` | `Record<school, Record<name, EffectRow[]>>` | 17 school affixes across 4 schools |

Every effect row is validated against the Zod schema (`lib/schemas/effect.ts`) during parsing. If any row fails validation, the parser prints warnings to stderr and exits with code 1.

### `groups.yaml`

Effect type classification extracted from keyword.map.md's section structure (§0–§13):

| Key | Structure | Content |
|:---|:---|:---|
| `groups` | `EffectGroup[]` | 14 groups, each with `id`, `section`, `label`, and `types` list |

Each effect type appears in exactly one group. The group assignment is determined by the keyword.map.md section it is defined in.

## Quality Gates

| Command | What it runs |
|:---|:---|
| `bun run check` | `tsc --noEmit` + `biome check app/ lib/` |
| `bun run test` | 37 unit + integration tests |

Both must pass clean before any change to `app/` or `lib/` is committed.

## Related Documentation

| Document | Role |
|:---|:---|
| [note.data.md](note.data.md) | Pipeline quick reference — layers, commands, agents, full workflow |
| [impl.parser.md](impl.parser.md) | Implementation details — logical flow, components, test coverage |
| [design.md](design.md) | System design — containers, components, boundaries |
| [keyword.map.md](../../data/keyword/keyword.map.md) | Effect type vocabulary — the schema's source of truth |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-25 | Initial parser usage guide |
| 1.1 | 2026-03-09 | Fixed CLI signature: parser takes 2 args (no keyword-map.md). Added note on indirect keyword.map relationship. |
