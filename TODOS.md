# TODOS

## Parser — Remaining Gaps

The reactive three-stage pipeline (reader → context → handlers) is implemented but only ~60% of books fully go through it. The rest bypass it via hardcoded overrides. These gaps need to be closed for the architecture to deliver its promise of "add a pattern, not a function."

### 1. Subsume states.ts into context listener
- **Priority:** P1
- **Effort:** M (CC: ~60 min)
- **Status:** IN PROGRESS — `buildStatesFromTokens()` added to context.ts, wired into reactive.ts and pipeline.ts. But comparison against old `buildStateRegistry()` shows 10 differences across 5 books.
- **Problem:** The new state builder doesn't match the old one. Specific issues:
  1. **皓月剑诀 寂灭剑心**: `max_stacks=1` missing — text uses `上限1層` but reader only has `最多叠加X层` pattern, not `上限X层`. Need new reader pattern.
  2. **元磁神光 天狼之啸**: `max_stacks=3` incorrectly assigned — an unscoped `max_stacks` token (from `最多叠加z层` where z is a variable) is being picked up. Should not be a literal 3.
  3. **周天星元 灵鹤**: `duration=0` instead of `20` — `持续存在20秒` is in the main segment (before `【灵鹤】：`), not in the 灵鹤 scope. The boundary splitter puts it in the pre-text. Old parser found it by searching all lines mentioning the state name.
  4. **天刹真魔 不灭魔体**: `trigger=on_attacked` missing — `受到伤害时` is consumed by `counter_buff_heal` compound regex. No separate `on_attacked` token produced.
  5. **大罗幻诀 罗天魔咒**: `trigger=on_attacked` and `chance=30` missing — these are encoded in the `counter_debuff` token captures, not as separate `on_attacked`/`chance` tokens. State builder needs to read compound token captures.
  6. **大罗幻诀 噬心之咒**: `chance=30` incorrectly assigned — the `chance` token is in `罗天魔咒` scope, not `噬心之咒`.
  7. **大罗幻诀 断魂之咒**: `target=self` should be `opponent` — child states defined within a parent inherit the parent's target context. The boundary splitter's `preText` for child states is empty.
  8. **大罗幻诀 断魂之咒**: `trigger=on_attacked` missing — same as #5, inherited from parent.
  9. **无相魔劫咒 无相魔劫**: state entirely missing — `delayed_burst` compound pattern swallows `【无相魔劫】`, so no boundary split happens. No `state_ref` token either.
  10. **皓月剑诀 寂灭剑心**: `上限1層` needs reader pattern (same as #1).
- **Root causes:**
  - A. Reader missing `上限X层` pattern (#1)
  - B. Compound tokens swallowing structural info (#4, #5, #8, #9)
  - C. State builder not inheriting parent state properties for children (#7, #8)
  - D. Duration/max_stacks in pre-boundary text not captured (#3)
  - E. Unscoped tokens incorrectly assigned to states (#2, #6)

### 2. Eliminate 2 book-specific skill overrides in pipeline.ts
- **Priority:** P1
- **Effort:** M (CC: ~30 min)
- **Problem:** 天魔降临咒 and 惊蜇化龙 have hardcoded parsers in `BOOK_OVERRIDES` (pipeline.ts) that bypass the reactive pipeline entirely. These produce correct output but violate the three-stage design.
- **Books affected:**
  - 天魔降临咒: cycling compound (base_attack + self_buff + debuff + per_debuff_stack_damage). Source text uses unusual structure with inline variable references.
  - 惊蜇化龙: variable collision (x=1500 used for both HP cost % and attack total). Source data error, not a parser design issue.
- **Fix:** For 天魔降临咒, add reader patterns for the unique text structures. For 惊蜇化龙, the variable collision is a source data problem — may need to keep as override or add a variable disambiguation rule.

### 3. Eliminate 10 exclusive affix compound parsers in exclusive.ts
- **Priority:** P1
- **Effort:** L (CC: ~60 min)
- **Problem:** 10 books have custom compound parsers in `EXCLUSIVE_PARSER_TABLE` that bypass the reactive pipeline. These are handcoded functions that emit multi-effect arrays with tier resolution.
- **Books affected:** 春黎剑阵, 皓月剑诀, 周天星元, 天刹真魔, 无相魔劫咒, 通天剑诀, and others.
- **Why they bypass:** Their affix text describes compound effects (e.g., dot + on_dispel, conditional_buff + conditional_debuff) that the generic reader patterns don't decompose correctly. Some also have multi-tier variables that need manual tier expansion.
- **Fix:** For each compound parser, identify which reader patterns are missing or too narrow, add them, and verify the generic pipeline produces the same output. Then remove the compound parser.

### 4. Decompose delayed_burst compound pattern
- **Priority:** P2
- **Effort:** S (CC: ~15 min)
- **Problem:** `delayed_burst` reader pattern swallows `持续12秒` (duration) into a compound regex that spans the entire 无相魔劫咒 clause. Only 1 book affected.
- **Verification:** `bun lib/parser/verify-reactive.ts` shows 1 warning for this.
- **Fix:** Decompose into `delayed_burst_name` (【name】) + condition parts + let `duration` match separately. Complex because the formula (`造成X%期间提升的伤害+Y%攻击力的伤害`) spans multiple clauses.

### 5. Replace conditional_self_hp catch-all regex
- **Priority:** P2
- **Effort:** S (CC: ~15 min)
- **Problem:** `conditional_self_hp` pattern `/(?:自身|敌方).*?(?:每|低于|高于).*?伤害.*?(\w+)%/` is very broad. It matches many things that should be handled by more specific patterns (e.g., `execute_conditional` for HP threshold + crit, `per_enemy_lost_hp` for per-% scaling). It could produce false matches on new source text.
- **Fix:** Either narrow the regex to only match patterns not covered by other reader entries, or decompose into specific condition patterns (hp_above, hp_below, per_hp_lost) and remove the catch-all.

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
