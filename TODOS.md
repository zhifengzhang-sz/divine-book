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

## Parser — YAML Verification Findings (2026-03-25)

Discovered by raw-data-to-YAML verification audit. All are pre-existing grammar/semantic issues, not caused by the Zod schema refactor.

### 4. CRITICAL: 惊蜇化龙 exclusive affix 【索心真诀】 missing entirely
- **Priority:** P0
- **Effort:** M (CC: ~20 min)
- **Problem:** The entire exclusive affix is absent from YAML. Two clauses with 4 variables (x=2.1, y=21, z=50, w=75) are unparsed: per-debuff-stack true damage + enlightenment-conditional self_lost_hp boost.
- **Context:** The grammar/semantic for 惊蜇化龙 exclusive affix either doesn't exist or fails to parse. The `exclusive.ts` compound parser table may be missing this entry.
- **Fix:** Add grammar rule or compound parser for 惊蜇化龙 exclusive affix. Add `per_debuff_stack_true_damage` and `self_lost_hp_damage` effects.

### 5. HIGH: 大罗幻诀 missing counter_debuff for 断魂之咒
- **Priority:** P1
- **Effort:** S (CC: ~10 min)
- **Problem:** Raw text says both 噬心之咒 AND 断魂之咒 trigger on_attacked with 30% chance. YAML only has counter_debuff for 噬心之咒. The 断魂之咒 dot exists but lacks its own trigger.
- **Context:** Grammar `counterDebuff` rule may only capture the first state name in the conjunction.
- **Fix:** Grammar should emit two counter_debuff effects (one per curse) from the conjunction "【噬心之咒】与【断魂之咒】".

### 6. HIGH: 天刹真魔 primary affix 【天人五衰】 incomplete
- **Priority:** P1
- **Effort:** M (CC: ~15 min)
- **Problem:** Only `crit_rate: 50` captured. Missing: `crit_damage: 50`, `attack: 23`, `final_damage_reduction: 23`. Also missing "每3秒轮流" (rotate every 3s) mechanic.
- **Context:** The raw text describes 5 rotating stat reductions applied every 3 seconds. The grammar only extracts the first stat.
- **Fix:** Update grammar/semantic to capture all 5 stats and the rotation interval. May need a new `rotating_debuff` effect type or extend `self_buff_extra`.

### 7. HIGH: 皓月剑诀 primary affix shield_destroy_dot value is string
- **Priority:** P1
- **Effort:** S (CC: ~10 min)
- **Problem:** `value` field is raw string "攻击力的伤害" instead of numeric 600. The "no shield = count as 2" fallback clause is also missing.
- **Context:** Grammar doesn't extract the 600% multiplier from "湮灭护盾的总个数*600%攻击力的伤害".
- **Fix:** Update grammar to parse the multiplier. Add `no_shield_count` field for the fallback.

### 8. MEDIUM: Missing duration fields across multiple books
- **Priority:** P2
- **Effort:** M (CC: ~20 min)
- **Problem:** Duration values stated in raw text are dropped by the parser for several effects:
  - 甲元仙符 `self_buff` (仙佑): missing `duration: 12`
  - 惊蜇化龙 `self_buff`: missing `duration: 4`
  - 疾风九变 `counter_buff` (极怒): missing `duration: 4`
  - 煞影千幻 `shield`: missing `duration: 8`
  - 梵圣真魔咒 `dot` (贪妄业火): missing `duration: 8`
  - 大罗幻诀 `state_add` (罗天魔咒): missing `duration: 8`
- **Context:** The grammar rules for these effects don't capture the "持续N秒" suffix or the duration is on the state definition rather than the effect.
- **Fix:** Add optional duration capture to the relevant grammar rules.

### 9. MEDIUM: 大罗幻诀 counter_debuff missing max_stacks
- **Priority:** P2
- **Effort:** S (CC: ~5 min)
- **Problem:** Raw text says "各自最多叠加5层" but counter_debuff has no max_stacks field.
- **Fix:** Add max_stacks capture to the counter_debuff grammar rule.

### 10. LOW: 浩然星灵诀 conditional_hp_scaling type name misleading
- **Priority:** P3
- **Effort:** S (CC: ~5 min)
- **Problem:** Effect type is `conditional_hp_scaling` but the condition is "每拥有x%最终伤害加深" (per x% final damage bonus), not HP-based.
- **Fix:** Consider renaming to `conditional_stat_scaling` or adding a `basis` field. Low priority since the handler already knows the mechanic.

### 11. LOW: 九天真雷诀 conditional_damage missing next-skill count
- **Priority:** P3
- **Effort:** S (CC: ~5 min)
- **Problem:** Raw text says "接下来的三个神通命中时" (next 3 skill hits) but no field captures the "3" limit.
- **Fix:** Add `next_skill_count` field to conditional_damage.

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
