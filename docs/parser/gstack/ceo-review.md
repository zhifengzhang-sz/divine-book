# CEO Plan Review — Reactive Parser Pipeline

**Date:** 2026-03-21
**Skill:** /plan-ceo-review (gstack v0.7.0)
**Branch:** main
**Mode:** HOLD SCOPE
**Status:** CLEAR (0 unresolved, 0 critical gaps)

---

## System Audit

- 86 imperative extractors in `extract.ts` (~2500 lines)
- Working test suite with per-book verification for all 28 books
- Existing snapshot tests (`books.json`, `affixes.json`) provide regression safety
- `pipeline.ts` exists as a wrapper around the imperative parser (TODO to replace)
- `patterns.ts` is a display-only approximation of extractor regexes (for the visualizer)
- `imperative.problems.md` — freshly written analysis documenting 5 failure modes with concrete evidence
- No TODOS.md. No stashed work. No open PR.

---

## Step 0: Scope Decisions

### 0A. Premise Challenge

**Is this the right problem to solve?** Yes — the evidence is strong. The problem doc quantifies 15+ cross-extractor dependency edges, 36 guard lines, 7 ordering tiers — all existing purely for deconfliction. Every new game mechanic added requires updating multiple existing extractors. The `O(n²)` maintenance cost is real and observed.

**What's the actual outcome?** Parse 28 books of Chinese game text into typed effect data. The current parser does this correctly (all tests pass), but at a mounting maintenance cost. The three-stage pipeline achieves the same output with ~5x less code and zero cross-extractor coupling.

**What if we do nothing?** The current parser works. But each new book or mechanic variant compounds the deconfliction burden. `extractDamageIncrease` alone has 7 guards — any new "伤害提升" variant needs guard #8.

### 0B. Existing Code Leverage

| Sub-problem | Existing code | Reuse? |
|-------------|--------------|--------|
| Chinese term recognition | 86 regexes in `extract.ts` | **Regexes reusable** as reader pattern table entries |
| Named state extraction | `buildStateRegistry()` in `states.ts` | **Subsumed** by context listener |
| Tier resolution + data_state | `buildDataState()` + `resolveFields()` in `tiers.ts` | **Keep as-is** |
| YAML generation | `formatBooksYaml` in `emit.ts` | **Keep as-is** |
| Per-book parsers | `BOOK_PARSERS` in `split.ts` (2 entries) | **Replace** |
| Affix parsing | `genericAffixParse()` + `AFFIX_PARSERS` | **Replace** |
| Test suite | 28-book verification + snapshots | **Keep as regression baseline** |

### 0C. Dream State Mapping

```
CURRENT STATE                    THIS PLAN                      12-MONTH IDEAL
86 imperative extractors    →    ~40 reader patterns        →   Pattern table is the
with O(n²) deconfliction         + grouping rules                single source of truth.
                                 + ~25 handlers                  New mechanics are 1-line
2900 lines of parser code   →    ~600 lines                →    additions. Parser viz
                                                                 shows tokens→groups→effects
Grammar gates, ordering,    →    Zero deconfliction logic   →   in real-time for debugging.
negative lookaheads                                              Sim + parser share the
                                                                 same event-driven model.
```

### 0C-bis. Implementation Alternatives

**APPROACH A: Big Bang** (chosen)
- Build reader.ts + context.ts + handlers.ts in one pass. ~600 lines replaces ~2900.
- Effort: L (human: ~1 week / CC: ~45 min)
- Risk: Medium — snapshots catch any regression
- Chosen because snapshot tests provide full regression coverage

**APPROACH B: Incremental Migration** (rejected)
- Migrate one mechanic at a time. Safest but doubles code churn.
- Effort: XL (human: ~2 weeks / CC: ~90 min)

**APPROACH C: Two-Stage** (rejected)
- Skip context listener. Design doc already rejected this (§2.5).

### Key Decisions

1. **Approach:** Big Bang — build all 3 stages at once, verify via snapshot regression
2. **Framework:** XState v5 — pipeline machine with `emit()` for observability, consistent with simulator
3. **XState topology:** Single state machine with states: idle → reading → grouping → parsing → done
4. **Book-specific parsers:** Keep 天魔降临咒 and 惊蜇化龙 as special-case handlers
5. **Testing:** Dual-run migration test (old vs new pipeline) + per-stage unit tests
6. **Deferred:** Old file deletion + parser-viz integration (both in TODOS.md)

---

## Section 1: Architecture Review — 0 issues

```
                    ┌──────────────────────────┐
                    │   pipelineMachine         │
                    │   (XState v5 setup())     │
                    │                           │
                    │  ┌──────────────────┐     │
    text ──PARSE──▶ │  │ Stage 1: Reader  │     │  emit(TOKEN)
                    │  │ (pattern table)  │─────│──────────▶ viz
                    │  └────────┬─────────┘     │
                    │           │ TOKENS_READY   │
                    │  ┌────────▼─────────┐     │
                    │  │ Stage 2: Context  │     │  emit(GROUP)
                    │  │ (grouping rules) │─────│──────────▶ viz
                    │  └────────┬─────────┘     │
                    │           │ GROUPS_READY   │
                    │  ┌────────▼─────────┐     │
                    │  │ Stage 3: Handlers │     │  emit(EFFECT)
                    │  │ (group→effect)   │─────│──────────▶ viz
                    │  └────────┬─────────┘     │
                    │           │ DONE           │
                    └───────────┼────────────────┘
                                │
                          EffectRow[]
                                │
                    ┌───────────▼────────────────┐
                    │  Post-processing           │
                    │  (tiers.ts — unchanged)    │
                    └───────────────────────────┘
```

## Section 2: Error & Rescue Map — 4 paths, 0 gaps

| Method | Exception | Rescued? | Action | Impact |
|--------|-----------|----------|--------|--------|
| reader.scan | No match for text | Y | Empty array | No effects (correct) |
| context.group | Orphaned modifier | Y | emit(DIAGNOSTIC), skip | Warning in viz |
| handlers.parse | No handler for term | Y | emit(DIAGNOSTIC), skip | Warning in viz |
| pipeline.run | Book not in table | Y | Fall back to generic | Uses default school |

## Section 3: Security — 0 issues
Internal parser, no network, no user input, no attack surface.

## Section 4: Data Flow Edge Cases — 5 mapped, 0 unhandled
1. Nested named states (大罗幻诀)
2. 各自 qualifier propagation
3. Multiple per_hit tokens (九重天凤诀)
4. Affix 【name】： prefix
5. enrichWithNamedStates equivalence

## Section 5: Code Quality — 0 issues

## Section 6: Test Review — 14 tests, 0 gaps
See `impl.reactive.md` §10 for complete test spec.

## Section 7: Performance — 0 issues (build-time tool)

## Section 8: Observability — 0 gaps
XState emit() + DIAGNOSTIC events provide full pipeline visibility.

## Section 9: Deployment — 0 risks (no deployment, git revert rollback)

## Section 10: Long-Term — Reversibility 5/5, 0 debt introduced

## Section 11: Design/UX — SKIPPED (no UI scope)

---

## NOT in scope
- Parser-viz integration (separate PR)
- Affix taxonomy reclassification
- Simulator changes
- Old file deletion (TODOS.md)

## TODOS.md
2 items created:
1. Delete old parser files after parity confirmed (P2, S)
2. Integrate parser-viz with XState emit() events (P3, M)

---

## Completion Summary

```
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | HOLD SCOPE                                   |
| System Audit         | 86 extractors, 28-book tests pass, no stash  |
| Step 0               | Big Bang + XState v5 + 2 book special cases   |
| Section 1  (Arch)    | 0 issues                                      |
| Section 2  (Errors)  | 4 error paths mapped, 0 GAPS                  |
| Section 3  (Security)| 0 issues                                      |
| Section 4  (Data/UX) | 5 edge cases mapped, 0 unhandled              |
| Section 5  (Quality) | 0 issues                                      |
| Section 6  (Tests)   | Diagram produced, 0 gaps                      |
| Section 7  (Perf)    | 0 issues                                      |
| Section 8  (Observ)  | 0 gaps                                        |
| Section 9  (Deploy)  | 0 risks                                       |
| Section 10 (Future)  | Reversibility: 5/5, debt items: 0             |
| Section 11 (Design)  | SKIPPED (no UI scope)                         |
+--------------------------------------------------------------------+
| NOT in scope         | written (4 items)                             |
| What already exists  | written (7 items)                             |
| Dream state delta    | written (~80% toward ideal)                   |
| Error/rescue registry| 4 methods, 0 CRITICAL GAPS                    |
| Failure modes        | 5 total, 0 CRITICAL GAPS                      |
| TODOS.md updates     | 2 items added                                 |
| Lake Score           | 3/3 chose complete option                     |
| Diagrams produced    | 3 (architecture, data flow, error flow)        |
| Unresolved decisions | 0                                              |
+====================================================================+
```
