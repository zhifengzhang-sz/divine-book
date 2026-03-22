# TODOS

## Parser

### ~~Delete old imperative parser files~~ DONE
- Deleted: `extract.ts`, `split.ts`, `patterns.ts`, `verify.ts`, `app/verify-parser.ts`
- Moved `ParsedBook` type to `data/types.ts`
- Updated `common-affixes.ts` and `exclusive.ts` to use reactive `runPipeline`
- Fixed backtick stripping in reader (source markdown uses backticks for emphasis)
- `states.ts` kept — still used by pipeline.ts and exclusive.ts for state extraction

### ~~Decompose compound reader patterns into atomic tokens~~ DONE
- 4 of 5 decomposed: `summon`, `echo_damage`, `per_hit_stack` → `per_hit` + `stack_add`, `next_skill_carry` → `next_skill_scope` + `per_hit` + `self_lost_hp_damage`
- `delayed_burst` kept as compound (unique to 无相魔劫咒, complex formula spanning multiple clauses)
- Verification: 1 warning remaining (delayed_burst only)

### ~~Fix self_buff_extra regex greediness~~ DONE
- Fixed: narrowed regex to `【([^【】]+)】(?:状态)?(?:额外|下)/`, stops before stat patterns.
- 元磁神光 and 天魔降临咒 affixes now produce correct effects.

### ~~Fix compound patterns spanning 【name】：boundaries~~ DONE
- Fixed: `dot_lost_hp` regex now allows optional `的` before `伤害` (`已损气血值伤害` and `已损气血值的伤害` both match).
- 梵圣真魔咒 affix now produces `dot` with scope `瞋痴业火`.

### ~~Add reader pattern for conditional HP-scaling damage~~ DONE
- Added `conditional_hp_scaling` pattern for 玉书天戈符.

### ~~Fix 斩岳 base_attack vs flat_extra_damage collision~~ DONE
- Fixed: added `(?<!额外)` lookbehind to `base_attack` regex.

### ~~Fix 溃魂击瑕 execute_conditional losing guaranteed_crit~~ DONE
- Fixed: added `必定暴击` variant to `execute_conditional` regex + `guaranteed_crit` field in handler.

### ~~Integrate parser-viz with XState emit() events~~ DONE
- Server: `/api/parse` now also runs XState machine and returns `xstate` field with emitted events
- Frontend: collapsible XState Events Panel shows TOKEN → GROUP → EFFECT events with scopes and captures
- Theme: added accent, keyword, string, warn, mono colors
