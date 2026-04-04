---
initial date: 2026-03-24
revised: 2026-04-04
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

# Parser Workflow

---

## §1 Data Pipeline

```
effects.ts (defines type names + field names)
    │
    │ compiler enforces
    ├──→ semantics/*.ts (produce effects conforming to the schema)
    ├──→ handlers/*.ts (consume effects by type name)
    │
    │ re-parse (editor or batch script)
    └──→ game.data.json (stores raw text + parsed effects)
            │
            │ gen-yaml.ts
            └──→ data/yaml/*.yaml (simulator reads these)
```

**`effects.ts` is the single source of truth for type names and field names.** Everything else is derived from it.

- **Semantic files** return `{ type: "type_name", field: value }`. The compiler checks these against effects.ts.
- **Handlers** call `register<SchemaType>("type_name", ...)`. The compiler checks these against effects.ts.
- **game.data.json** stores the output of the semantic files. The type names and field names in it were assigned by the semantic actions at parse time.
- **YAML files** are generated from game.data.json by `gen-yaml.ts`. They pass the stored effects through unchanged.

---

## §2 game.data.json

`data/raw/game.data.json` stores both the raw Chinese text and the parsed effects for every book and affix:

```json
{
  "books": {
    "千锋聚灵剑": {
      "school": "剑修",
      "skill": {
        "text": "对目标造成x%攻击力的剑法伤害...",
        "effects": [{ "type": "base_attack", "total": "x", ... }]
      },
      "primaryAffix": { "name": "...", "text": "...", "effects": [...] },
      "exclusiveAffix": { "name": "...", "text": "...", "effects": [...] }
    }
  },
  "affixes": {
    "universal": { ... },
    "school": { ... }
  }
}
```

The `effects` arrays are **cached parse results**. They were produced by running the `text` through the ohm parser and semantic actions. The type names and field names in them came from the semantic action code at parse time.

**Editing data:** Use the editor (`bun run editor`, port 3002). Edit text, re-parse, save. The editor calls `parseEntry()` which runs the ohm grammar + semantic actions and produces fresh effects from the current code.

**Generating YAML:** `bun run parse` runs `gen-yaml.ts`, which reads game.data.json and writes `data/yaml/books.yaml` and `data/yaml/affixes.yaml`.

---

## §3 Schema Contract

`lib/parser/schema/effects.ts` defines:

- A Zod schema and TypeScript interface per effect type
- Type name as a string literal: `type: z.literal("base_attack")`
- Field names derived from the raw Chinese text meaning
- `type V = string | number` for variable fields (string before tier resolution, number after)
- JSDoc with the raw Chinese phrase each field maps to

Per-book schema files in `lib/parser/schema/` re-export shared types or define book-specific ones. The aggregate union `EffectWithMeta` covers all effect types.

### How the compiler enforces the contract

1. **Semantic file** imports schema types: `const effect: BaseAttack = { type: "base_attack", total: ... }`. Wrong type name or field name = compile error.
2. **Handler** registers with schema type: `register<Resolved<BaseAttack>>("base_attack", (effect) => { ... })`. Wrong field access = compile error.
3. Both sides reference the same interface. A mismatch between parser output and handler input is caught at compile time.

### Shared types across books

Many books share effect types (e.g., `BaseAttack` in all 28). Import from the first schema that defined it:

```typescript
// lib/parser/schema/春黎剑阵.ts
export { BaseAttack } from "./千锋聚灵剑.js";
```

---

## §4 When to Update

### Schema change (rename types or fields)

The schema is the source of truth. Change it first, then propagate.

1. Rename in `effects.ts` (type literals, interfaces, Zod schemas)
2. `bun run check` — compiler errors show every semantic file and handler that needs updating
3. Fix all compiler errors
4. Re-parse all books/affixes through the editor (or batch script) — this updates game.data.json with fresh effects from the updated semantic actions
5. `bun run parse` — regenerate YAML from the updated game.data.json
6. `bun test` — verify no behavioral change

**Do not find-and-replace in game.data.json.** The effects in game.data.json are derived data. Re-parse from the source of truth (semantic actions) instead.

### Raw text changes for an existing book

1. Edit the text in the editor (`bun run editor`)
2. Re-parse in the editor — produces fresh effects
3. Save — updates game.data.json
4. `bun run parse` — regenerate YAML
5. `bun test`

If the grammar or semantic file also needs changes:

1. Update `.ohm` grammar if needed
2. Update schema if new types/fields
3. Update semantic file
4. Update handler if fields changed
5. Re-parse in editor, save, `bun run parse`, `bun test`

### Adding a new effect type

1. Define the interface in the relevant schema file
2. Add JSDoc with the raw Chinese phrase
3. Update the semantic file to produce it
4. Write a handler with `register<SchemaType>`
5. Re-parse affected books in editor
6. `bun run parse`, `bun test`

---

## §5 Commands

```bash
bun run editor          # data editor (port 3002) — edit text, re-parse, save
bun run parse           # gen-yaml.ts → regenerate YAML from game.data.json
bun run check           # typecheck + lint
bun test                # all tests
```

---

## §6 What NOT to do

- **Do not edit game.data.json effects by hand.** Edit the text and re-parse. The effects are derived from the text via the parser.
- **Do not find-and-replace type names in game.data.json.** That's patching derived data. Re-parse instead.
- **Do not bypass the compiler.** If a rename doesn't produce compiler errors in a file that uses the old name, that file has an untyped string reference. Find it and fix the typing, or add it to the grep sweep.
