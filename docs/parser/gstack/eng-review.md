# Eng Plan Review — Reactive Parser Pipeline

**Date:** 2026-03-21
**Skill:** /plan-eng-review (gstack v0.7.0)
**Branch:** main
**Mode:** FULL_REVIEW
**Status:** CLEAR (0 unresolved, 0 critical gaps)

---

## Step 0: Scope Challenge

**Files touched:** 4 new + 1 rewrite + 1 test = 6 total. Under 8-file threshold. PASS.

**Minimum set of changes:**
- `reader.ts` — Stage 1 pattern table + scan
- `context.ts` — Stage 2 grouping rules
- `handlers.ts` — Stage 3 group→effect handlers
- `reactive.ts` — XState v5 pipeline machine
- `pipeline.ts` — Rewrite to use reactive pipeline
- `reactive.test.ts` — Per-stage unit tests + dual-run migration

**Complexity check:** No new abstractions beyond what the design doc specifies. Clean.

**TODOS cross-reference:** TODOS.md has 2 items (delete old files, viz integration). Neither blocks this plan. This plan is the prerequisite for both.

**Completeness check:** The plan IS the complete version — full three-stage pipeline for all 28 books + all affixes. No shortcuts.

Scope accepted as-is.

---

## Section 1: Architecture — 1 issue resolved

### Issue 1: XState Machine Topology

**Question:** Single state machine vs actor composition vs callback actor?

**Options evaluated:**
- A) Single machine with states: idle → reading → grouping → parsing → done
- B) Actor composition (parent + 3 child actors)
- C) Callback actor

**Decision:** A — Single state machine. Explicit, readable, consistent with simulator. ~50 lines boilerplate. The pipeline is synchronous so actor composition adds messaging overhead for no benefit. Callback actors lose the explicit state diagram.

**No other architecture issues.** The three-stage pipeline design is well-separated:
- Each stage has one input type, one output type
- No stage reaches back into a previous stage
- Post-processing (tiers.ts) is cleanly separated
- Book-specific overrides bypass the pipeline entirely

---

## Section 2: Code Quality — 0 issues

**Reader pattern overlap:** Resolved by longest-match-first ordering in the scan algorithm. No negative lookbehinds needed. This is how lexers work.

**Affix vs skill dispatch:** Same pipeline handles both with minor pre/post processing (affix prefix stripping, parent resolution). No structural concern.

**Handler dispatch:** Map-based (`HANDLER_MAP.set(term, handler)`) — more explicit and testable than switch-based dispatch. Matches the design doc's `GroupHandler` interface.

**Context listener complexity:** The grouping logic has 5 rules (state scoping, modifier attachment, stat aggregation, qualifier propagation, affix prefix). ~150 lines of logic. The dual-run test catches any divergence from the current `buildStateRegistry()` + `enrichWithNamedStates()` behavior.

---

## Section 3: Test Review — 14 tests, 0 gaps

### Test Map

```
ALL NEW CODEPATHS:
  ┌─────────────────────────────────────────────────────────┐
  │ READER (reader.ts)                                      │
  │  scan(text) → TokenEvent[]                              │
  │  ├─ T1: known text fragments → correct tokens           │
  │  ├─ T2: empty text → []                                 │
  │  └─ T3: overlapping terms → longest match wins          │
  ├─────────────────────────────────────────────────────────┤
  │ CONTEXT LISTENER (context.ts)                           │
  │  group(tokens) → GroupEvent[]                            │
  │  ├─ T4: hp_cost + per_hit → modifier attached           │
  │  ├─ T5: 【X】：opens named state scope                   │
  │  ├─ T6: nested states (parent → children)               │
  │  ├─ T7: 各自 qualifier → children target                │
  │  ├─ T8: orphaned modifier → skipped + DIAGNOSTIC        │
  │  └─ T9: multiple per_hit → each to nearest primary      │
  ├─────────────────────────────────────────────────────────┤
  │ HANDLERS (handlers.ts)                                  │
  │  parse(groups) → EffectRow[]                             │
  │  ├─ T10: each handler: group → correct EffectRow        │
  │  └─ T11: unknown primary → null + DIAGNOSTIC            │
  ├─────────────────────────────────────────────────────────┤
  │ PIPELINE (reactive.ts + pipeline.ts)                    │
  │  ├─ T12: 28-book dual-run comparison (skill)            │
  │  ├─ T13: all affix dual-run comparison                  │
  │  └─ T14: XState emits TOKEN/GROUP/EFFECT events         │
  └─────────────────────────────────────────────────────────┘
```

Full test code examples are in `impl.reactive.md` §10.2–§10.6.

### Failure Mode Coverage

```
CODEPATH              | FAILURE MODE              | TEST? | HANDLED? | SILENT?
----------------------|---------------------------|-------|----------|--------
reader.scan           | Overlapping regex match    | T3    | Y        | No
reader.scan           | No matches in text         | T2    | Y        | No
context.group         | Orphaned modifier          | T8    | Y        | No (DIAG)
context.group         | Nested state mis-scoping   | T6    | Y        | No
context.group         | 各自 not propagated        | T7    | Y        | No
handlers.parse        | No handler for term        | T11   | Y        | No (DIAG)
pipeline (full)       | Output differs from old    | T12   | Y        | No
pipeline (affix)      | Affix output differs       | T13   | Y        | No
```

**0 critical gaps.** Every failure mode has TEST=Y, HANDLED=Y, SILENT=No.

---

## Section 4: Performance — 0 issues

Build-time parser, <1 second total for all 28 books. Performance is irrelevant. The reader's scan algorithm uses `Set<number>` for consumed positions — O(n) per character, perfectly fine for ~500-char texts.

---

## NOT in scope

| Item | Rationale |
|------|-----------|
| Parser-viz integration with XState events | Separate PR |
| Deletion of extract.ts, split.ts, states.ts | Deferred until dual-run confirms parity |
| Affix taxonomy reclassification | Not affected by parser internals |
| Simulator changes | Consumes EffectRows, unaffected |
| Grammar type removal from book-table.ts | Unused field, not harmful |

## What already exists

| Existing code | Reuse decision |
|---------------|---------------|
| Regex patterns in extract.ts (86 extractors) | **Reuse** — reader pattern table |
| tiers.ts (buildDataState, resolveFields) | **Keep unchanged** |
| emit.ts (YAML generation) | **Keep unchanged** |
| book-table.ts (school/grammar lookup) | **Keep** |
| md-table.ts (splitCell, readMainSkillTables) | **Keep unchanged** |
| parser.test.ts (28-book verification) | **Keep as regression baseline** |
| Snapshot files (books.json, affixes.json) | **Keep as regression baseline** |
| states.ts (buildStateRegistry) | **Subsumed** by context.ts |

## Diagrams

All in `impl.reactive.md`:
- §3.1: XState machine state diagram
- §4.3: Scan algorithm
- §5.2: Grouping algorithm
- §10.1: Test map

Inline diagram recommended for `context.ts` — grouping algorithm comments.

---

## Completion Summary

```
- Step 0: Scope Challenge — scope accepted as-is
- Architecture Review: 1 issue resolved (XState topology)
- Code Quality Review: 0 issues
- Test Review: diagram produced, 0 gaps (14 tests)
- Performance Review: 0 issues
- NOT in scope: written (5 items)
- What already exists: written (8 items)
- TODOS.md updates: 0 new items
- Failure modes: 0 critical gaps (8 modes mapped)
- Lake Score: 3/3 chose complete option
```
