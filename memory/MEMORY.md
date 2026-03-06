# Project Memory

## Project Phase: Discovery → Implementation transition

The project was built through discovery — each layer emerged from the previous. Four components exist but **contracts between them are not yet defined**. This is the next major agenda item: formalize what crosses each boundary (format, guarantees, invariants) so components can evolve independently.

## Four-Layer Architecture

| Layer | Purpose | Key artifacts |
|:------|:--------|:-------------|
| 0. Structure | Effect type formalization | `keyword.map`, `lib/domain/registry.ts`, `lib/domain/effects/` (17 files, 80+ types) |
| 1. Data Pipeline | Extract + parse raw data | `normalized.data.md`, `effects.yaml`, `lib/parse.ts`, LLM agents |
| 2. Domain Model | Affix interaction graph | `domain.*.md`, `lib/domain/bindings,platforms,chains,constraints` |
| 3. Combat Model | Quantitative factor mapping | `docs/model/combat.md`, `lib/schemas/effect.model,book.model,bookset.model,affix.model` |
| Output | Book guides | `docs/books/` (8 files — PvP, chain construction) |

Dependencies: Layer 1 depends on Layer 0. Layer 2 depends on Layer 0 + Layer 1. Layer 3 depends on Layer 0 + Layer 1. Output depends on Layer 2 + Layer 3.

**Inter-layer contracts are undefined** — arrows between layers represent vague dependencies, not formal interfaces. Defining these contracts is the priority for the implementation phase.

## docs/books CSS pattern

All files in `docs/books/` embed a `<style>` block for dark-theme rendering. Key rules:
- Every CSS property needs `!important` or the markdown renderer will override it
- `blockquote` needs an explicit `background-color` (use `#2c313a`) or it renders white
- `strong` color must have `!important` or it renders black

The corrected blockquote + strong block:
```css
blockquote {
  border-left: 3px solid #4b5263 !important;
  padding-left: 10px !important;
  color: #5c6370 !important;
  background-color: #2c313a !important;
}

strong {
  color: #e5c07b !important;
}
```

## Operator Model + Combo Search

The domain docs now have a formal `provides`/`requires` binding model:
- `domain.category.md` §Target Categories: T1-T10 target categories, all 61 affixes annotated
- `domain.graph.md` §V Named Entity Layer (6 entities), §VI Platform Provides (9 platforms), §IX revised Chain Discovery (8-step), §X Construction Constraints
- `domain.path.md` §IX Platform-Projected Paths (9 platforms), §X extended with provides bottlenecks

TypeScript combo search system:
- `lib/domain/enums.ts`: TargetCategory enum (T1-T10), School enum
- `lib/domain/bindings.ts`: All 61 affix bindings (provides/requires)
- `lib/domain/platforms.ts`: 9 platform definitions with provides
- `lib/domain/named-entities.ts`: 6 named entities with transforms/ports
- `lib/domain/chains.ts`: filterByBinding() + discoverChains() (pruning + graph search)
- `lib/domain/constraints.ts`: validateConstruction() (slot uniqueness, school match)
- `app/combo-search.ts`: CLI entry point (`bun app/combo-search.ts --platform 疾风九变`)

## Raw Data Expansion Plan
- `data/raw/主书.md` will expand to cover all 28 skill books (currently 9)
- Updates are parameter-only (numbers), not new mechanics
- When expanded: add new entries to `PLATFORMS` and `NAMED_ENTITIES` in TypeScript
- Domain docs framework (categories, graph, paths) is structurally complete

## Character variants

In Chinese game docs, use `剑` (U+5251, simplified Chinese) not `剣` (U+5263, Japanese variant). They look nearly identical but are different Unicode code points — easy to accidentally produce from a Japanese-locale IME or copy-paste.
