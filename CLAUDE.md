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
- `docs/parser/impl.ohm.effects.md` — effect reference: raw text → output → grammar → semantic
- `data/raw/` — source of truth for game data (Chinese prose)

## Rules

- Never deviate from design docs without explicit approval
- `data/raw/` is ground truth — if parser output doesn't match raw data, parser is wrong
- Run `bun run check` before claiming code works
- XState v5 only — never v4 patterns

## gstack

Available skills: /plan-ceo-review, /plan-eng-review, /review, /ship, /browse, /qa, /retro

If skills aren't working: `cd .claude/skills/gstack && ./setup`
