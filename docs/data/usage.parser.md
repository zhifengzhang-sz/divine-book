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
  border-left: 3px solid #4b5263;
  padding-left: 10px;
  color: #5c6370;
}

strong {
  color: #e5c07b;
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
bun app/parse.ts <input> <output>
```

| Argument | Description |
|:---|:---|
| `<input>` | Path to a `normalized.data.md` file (English headers) |
| `<output>` | Path for the generated YAML file |

The default paths are available via the npm script:

```
bun run parse
```

This expands to:

```
bun app/parse.ts docs/data/normalized.data.md data/yaml/effects.yaml
```

## Output

The parser produces a YAML file with three top-level keys:

| Key | Structure | Content |
|:---|:---|:---|
| `books` | `Record<name, BookData>` | 28 books, each with `school`, optional `skill`, `primary_affix`, and `exclusive_affix` |
| `universal_affixes` | `Record<name, EffectRow[]>` | 16 universal affixes |
| `school_affixes` | `Record<school, Record<name, EffectRow[]>>` | 17 school affixes across 4 schools |

Every effect row is validated against the Zod schema (`lib/schemas/effect.ts`) during parsing. If any row fails validation, the parser prints warnings to stderr and exits with code 1.

## Quality Gates

| Command | What it runs |
|:---|:---|
| `bun run check` | `tsc --noEmit` + `biome check app/ lib/` |
| `bun run test` | 37 unit + integration tests |

Both must pass clean before any change to `app/` or `lib/` is committed.

## Typical Workflow

1. Upstream pipeline produces a new `normalized.data.md` (see [usage.dev.md](usage.dev.md)).
2. Run the parser: `bun run parse`.
3. Inspect the output diff: `git diff data/yaml/effects.yaml`.
4. Run quality gates: `bun run check && bun run test`.
5. Commit `normalized.data.md` and `effects.yaml` together.

## Related Documentation

| Document | Role |
|:---|:---|
| [impl.parser.md](impl.parser.md) | Implementation details — logical flow, components, test coverage |
| [design.md](design.md) | Architectural rationale for the pipeline |
| [usage.dev.md](usage.dev.md) | Full pipeline workflow (extraction, verification, parsing) |
| [keyword.map.md](keyword.map.md) | Effect type vocabulary — the schema's source of truth |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-25 | Initial parser usage guide |
