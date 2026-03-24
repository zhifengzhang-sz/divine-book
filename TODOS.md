# TODOS

## Parser — Grammar Refactoring (impl.ohm.md)

Refactoring the grammar parser to use ohm idiomatically.
See `docs/parser/impl.ohm.md` for implementation details, `design.ohm.md` v1.2 for design.

### 1. Conjunction inheritance assertion
- **Priority:** P1
- **Effort:** S (CC: ~5 min)
- **Problem:** Semantic action for conjunction inheritance (添加1层【X】与【Y】) must assert inherited values (verb, count) are non-null.
- **Context:** Addressed by compound `counterDebuff` rule in impl.ohm.md §3.2. The grammar rule captures the conjunction natively — the assertion validates the grammar did its job.
- **Fix:** Add runtime assertion in the `counterDebuff` semantic action.

### 2. XState pipeline machine tests
- **Priority:** P1
- **Effort:** S (CC: ~10 min)
- **Problem:** Phase 5 of impl.ohm.md introduces the XState pipeline machine. Needs tests for: state transitions, per-effect event emission, parse error events, semantic exception handling.
- **Context:** impl.ohm.md §5.5 specifies 6 test cases.
- **Fix:** Add `pipeline.test.ts` with XState actor tests.

### 3. Parse error quality tests
- **Priority:** P2
- **Effort:** S (CC: ~10 min)
- **Problem:** design.ohm.md §9.6 specifies 5 parse error tests (invalid input → meaningful error with position). Not yet implemented.
- **Context:** ohm provides error position + expected alternatives natively. Tests verify they surface correctly through the XState PARSE_ERROR event.
- **Fix:** Add parse error test cases to `pipeline.test.ts`.

### Superseded by grammar rewrite

<details>
<summary>Items resolved by design.ohm.md (click to expand)</summary>

The following TODOs were regex-pipeline-specific problems. The grammar rewrite
replaces the regex pipeline entirely, eliminating these issues:

- ~~#1 Subsume states.ts into context listener~~ → states.ts replaced by post-parse pass (§7.5)
- ~~#2 Eliminate 2 BOOK_OVERRIDES~~ → InlineStateDef grammar rule handles 天魔降临咒/惊蜇化龙 (§7.4)
- ~~#3 Eliminate 10 exclusive compound parsers~~ → AffixDescription entry point handles all affixes (§7.2-7.3)
- ~~#4 Decompose delayed_burst compound~~ → grammar rule for DelayedBurst clause type (§3.2)
- ~~#5 Replace conditional_self_hp catch-all~~ → specific grammar rules replace catch-all regex (§3.2)

</details>

---

## Done

<details>
<summary>Completed items (click to expand)</summary>

- ~~Delete old imperative parser files~~ — extract.ts, split.ts, patterns.ts, verify.ts deleted
- ~~Decompose compound reader patterns~~ — 4 of 5 done (summon, echo_damage, per_hit_stack, next_skill_carry)
- ~~Fix self_buff_extra regex greediness~~ — narrowed to `[^【】]+`
- ~~Fix compound patterns spanning 【name】：boundaries~~ — dot_lost_hp allows optional `的`
- ~~Add reader pattern for conditional HP-scaling damage~~ — conditional_hp_scaling for 玉书天戈符
- ~~Fix 斩岳 base_attack vs flat_extra_damage collision~~ — lookbehind `(?<!额外)`
- ~~Fix 溃魂击瑕 execute_conditional losing guaranteed_crit~~ — added `必定暴击` variant
- ~~Integrate parser-viz with XState emit() events~~ — server + frontend + theme

</details>
