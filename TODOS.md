# TODOS

## Parser — Remaining Gaps

The reactive three-stage pipeline (reader → context → handlers) is implemented but only ~60% of books fully go through it. The rest bypass it via hardcoded overrides. These gaps need to be closed for the architecture to deliver its promise of "add a pattern, not a function."

### 1. Subsume states.ts into context listener
- **Priority:** P1
- **Effort:** M (CC: ~30 min)
- **Problem:** `buildStateRegistry()` in `states.ts` still runs as a separate pass in `pipeline.ts` and `exclusive.ts`. It extracts state metadata (duration, max_stacks, trigger, chance, dispellable, children, per_hit_stack) that the context listener doesn't produce. The reactive pipeline's boundary splitting handles scope assignment, but the full state registry still comes from old code.
- **Impact:** State metadata in YAML output depends on `states.ts`, not the reactive pipeline. If we delete `states.ts`, state metadata is lost.
- **Fix:** The context listener should extract state metadata from tokens within each `【name】：` segment — `duration`, `max_stacks`, `on_attacked`, `undispellable`, `per_hit_stack` are already reader tokens. The context listener should aggregate them into a `StateDef` per scope, replacing `buildStateRegistry()`.

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
