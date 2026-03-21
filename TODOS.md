# TODOS

## Parser

### Delete old imperative parser files
- **Priority:** P2
- **Effort:** S (human: ~1 hour / CC: ~5 min)
- **Depends on:** Reactive pipeline implementation + dual-run test confirming parity
- **Context:** After the three-stage reactive pipeline (design.reactive.md) is implemented and the dual-run migration test confirms identical output for all 28 books + affixes, delete the old imperative parser files: `extract.ts` (~2500 lines), the imperative code paths in `split.ts`, and `states.ts` (subsumed by context listener). Keep `tiers.ts` and `emit.ts` (unchanged). Update `docs/parser/diagram.main.md` to reflect the new architecture.

### Integrate parser-viz with XState emit() events
- **Priority:** P3
- **Effort:** M (human: ~3 days / CC: ~20 min)
- **Depends on:** Reactive pipeline implementation
- **Context:** The parser-viz (`app/parser-viz/`) currently uses the imperative pipeline wrapper. After the reactive pipeline uses XState v5, the viz can subscribe to `emit()` events (TOKEN, GROUP, EFFECT, DIAGNOSTIC) for live pipeline debugging — showing tokens → groups → effects as they're produced. Uses the same Inspector API as the simulator viz.
