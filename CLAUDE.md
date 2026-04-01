## Project

Divine Book (灵書) — combat simulator for a Chinese RPG. Parses skill/affix prose into structured data, simulates battles.

## Stack

- Runtime: Bun + TypeScript
- Parser: ohm-js PEG grammar (`lib/parser/skill-text.ohm` + `semantics.ts`)
- Simulator: XState v5 state machines (`lib/sim/`)
- Viz: React dev servers (`app/viz/`, `app/parser-viz/`)

## Commands

- `bun run check` — typecheck + lint (must pass before committing)
- `bun test` — all tests
- `bun run parse` — regenerate YAML from raw data
- `bun run parser-viz` — parser pipeline visualizer
- `bun scripts/sync-style.ts` — sync CSS style block across markdown docs

## Key docs

- `docs/parser/design.ohm.md` — parser architecture (why)
- `docs/parser/impl.ohm.md` — implementation spec (what)
- `data/raw/` — source of truth for game data (Chinese prose)

## Schema migration

Per-book schema files in `lib/parser/schema/` are the shared contract between parser and simulator.

### Process for each book/affix

1. **Read raw data** — `data/raw/主书.md`, `data/raw/专属词缀.md`, or affix tables
2. **Write schema** — `lib/parser/schema/{name}.ts`
   - One interface per effect type the book produces
   - Field names derived from the Chinese text meaning (not from existing extractor or handler)
   - JSDoc with the raw Chinese phrase each field maps to
   - `type V = string | number` for variable fields (string pre-resolution, number post-resolution)
   - Aggregate types: `SkillEffect`, `PrimaryAffixEffect`, `ExclusiveAffixEffect`, `Effect`
3. **Update semantic file** — `lib/parser/grammars/semantics/{name}.ts`
   - Import schema types
   - Change `addOperation<any[]>` to `addOperation<Effect[]>`
   - Assign each returned object to a typed `const effect: SchemaType = { ... }`
   - Compiler catches wrong field names
4. **Update handler(s)** — `lib/sim/handlers/*.ts`
   - Import schema type
   - Change `register("type", ...)` to `register<SchemaType>("type", ...)`
   - Remove `as string` / `as number` casts — fields are now typed
   - Compiler catches mismatches with schema
5. **Regenerate YAML** — `bun app/parse-main-skills.ts -o data/yaml/books.yaml`
6. **Run tests** — `bun test`

### Shared effect types

Many books share effect types (e.g., `base_attack` in all 28 books). When a second book needs the same type, import it from whichever schema defined it first, or extract to a shared file if used by 3+ books.

## Mermaid diagrams

All mermaid diagrams must use the dark theme init to match the doc CSS:

```
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
```

Place this as the first line inside every ` ```mermaid ` block, before `flowchart`/`sequenceDiagram`/etc.

## Rules

- Never deviate from design docs without explicit approval
- `data/raw/` is ground truth — if parser output doesn't match raw data, parser is wrong
- Schema field names come from raw text meaning, not existing code
- Run `bun run check` before claiming code works
- XState v5 only — never v4 patterns

## gstack

Available skills: /plan-ceo-review, /plan-eng-review, /review, /ship, /browse, /qa, /retro

If skills aren't working: `cd .claude/skills/gstack && ./setup`

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
