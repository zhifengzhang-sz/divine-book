---
initial date: 2026-03-22
dates of modification: [2026-03-22]
---

# Parser Redesign v3 — PEG Grammar with ohm-js

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)
**Supersedes:** `design.reactive.md` v2.0 (reader regex patterns)
**Preserves:** XState v5 pipeline machine, context listener grouping, handler dispatch

> The reactive three-stage pipeline (reader → context → handlers) has the right
> architecture but the wrong reader implementation. Flat regex patterns can't
> handle compositional Chinese text. This document proposes replacing the regex
> reader with a PEG grammar parser using ohm-js, while keeping the context
> listener and handler stages intact.

---

## §1 Problem Statement

### §1.1 What Works

The three-stage pipeline architecture is sound:
- **Context listener** groups related tokens by structural rules
- **Handlers** map groups to typed EffectRows without knowing about other handlers
- **XState machine** orchestrates the pipeline with observable events
- **Boundary splitting** at `【name】：` provides correct state scoping

### §1.2 What Doesn't Work

The **reader** uses flat regex patterns to tokenize Chinese text. This fails when:

1. **Compound tokens swallow modifiers.** A regex like `受到伤害时[，,]各有(\d+)%概率对攻击方添加.*?层【(.+?)】` matches the entire sentence as one token, losing the individual components (trigger, chance, target, action, state names).

2. **Conjunction inheritance.** `添加1层【噬心之咒】与【断魂之咒】` — the second state inherits the action verb and count from the first. Flat regex can either match the whole thing (losing per-state info) or match pieces (losing the relationship).

3. **Shared qualifiers.** `各自最多叠加5层` — scopes over the preceding conjunction. The `各自` distributes the stack limit to each item. Regex can capture the text but can't express the scoping.

4. **Cross-clause context.** Trigger/chance in clause 1 applies to actions in clause 2, separated by `，`. The reader's longest-match-first algorithm doesn't cross clause boundaries.

### §1.3 Root Cause

The root cause is that **Chinese game text is a domain-specific language with grammar**, not a bag of independent keywords. The text follows strict sentence patterns with composition rules (conjunctions, clauses, qualifiers, scope inheritance). Regex matches flat strings; a grammar matches structure.

### §1.4 Evidence from Experiments

ohm-js experiments (`experiments/ohm-explore/`) demonstrated:

```
Input:  受到伤害时，各有30%概率对攻击方添加1层【噬心之咒】与【断魂之咒】，各自最多叠加5层

ohm output:
  clause[0]: { type: "trigger", trigger: "受到伤害" }
  clause[1]: { type: "action", target: "攻击方", chance: 30, distributed: true,
               actions: [
                 { verb: "添加", count: 1, state: "噬心之咒" },
                 { verb: "inherit", count: "inherit", state: "断魂之咒" }
               ]}
  clause[2]: { type: "stack_limit", perChild: true, limit: 5 }
```

The grammar naturally expresses conjunction, inheritance, and qualifier scoping — the exact things the regex reader can't do.

---

## §2 Proposed Architecture

### §2.1 What Changes

```
BEFORE (current):
  text ──regex scan()──▶ TokenEvent[] ──group()──▶ GroupEvent[] ──parse()──▶ EffectRow[]
              ↑
    flat regex patterns
    can't handle composition

AFTER (proposed):
  text ──ohm parse()──▶ AST ──transform()──▶ EffectRow[]
              ↑
    PEG grammar
    handles composition natively
```

### §2.2 What Stays

- **XState v5 pipeline machine** — orchestrates stages, emits events for viz
- **Pipeline result type** — `PipelineResult` shape unchanged
- **Tier resolution** — `tiers.ts` post-processing unchanged
- **YAML emission** — `emit.ts` unchanged
- **EffectRow type** — output format unchanged
- **Parser-viz** — subscribes to XState events (grammar AST replaces tokens/groups)

### §2.3 What Goes Away

- **reader.ts** — replaced by ohm grammar
- **context.ts** — grouping logic subsumed by grammar structure
- **handlers.ts** — semantic actions defined on the grammar replace handler dispatch
- **states.ts** — state metadata extracted by grammar semantic actions
- **Boundary splitting** — `【name】：` handled as a grammar rule, not pre-processing

### §2.4 Why Grammar Replaces All Three Stages

In the regex pipeline, the three stages exist because regex can't express structure:
- Reader: "I see these words" (no structure)
- Context: "These words belong together" (add structure back)
- Handlers: "This group means this effect" (interpret structure)

With a grammar, the parser directly produces structured output:
- Grammar rules: "This is a trigger clause followed by a chance-action clause" (structure is primary)
- Semantic actions: "This trigger clause means type=trigger, trigger=受到伤害" (interpret directly)

The context listener was compensating for the reader's inability to express structure. With a grammar, that compensation is unnecessary.

---

## §3 Grammar Design

### §3.1 Top-Level Structure

Every skill description follows this pattern:
```
Preamble ，EffectClause ，EffectClause ，...
```

Some effects create named states:
```
...并为自身添加【name】：StateDefinition
```

State definitions follow the same clause structure but within a state scope.

```
SkillDescription {
  Description = Preamble? EffectList TierData?
  EffectList  = EffectClause (clauseSep EffectClause)*
  clauseSep   = "，" | "并" | "；" | "。" | "同时"

  // After 【name】：the remainder is a state definition
  // Split at this boundary before parsing (same as current approach)
}
```

### §3.2 Effect Clause Types

From surveying all 28 books, the effect clauses fall into ~15 categories:

| Category | Example | Count |
|----------|---------|-------|
| Base attack | 造成X段共Y%攻击力的灵法伤害 | 28 (every book) |
| HP cost | 消耗自身X%当前气血值 | 7 |
| Per-hit damage | 每段攻击额外对目标造成自身Y%已损失气血值的伤害 | 5 |
| Shield | 添加X%最大气血值的护盾 | 2 |
| Self heal | 恢复共X%最大气血值 | 2 |
| Debuff | 降低X%最终伤害减免 | 3 |
| State creation | 为自身添加【name】 | 12 |
| Counter (on attacked) | 受到伤害时，恢复Y%气血值 | 3 |
| DoT | 每X秒造成Y%当前气血值的伤害 | 4 |
| Buff steal | 偷取目标X个增益状态 | 1 |
| Summon | 创建持续X秒的分身，继承Y%属性 | 1 |
| Untargetable | X秒内不可被选中 | 1 |
| Crit bonus | 暴击伤害提高X% | 1 |
| Self damage taken | 释放后自身X秒内受到伤害提高Y% | 1 |
| Conditional | 若净化...接下来N个神通命中时 | 1 |
| Escalation | 每造成N次伤害，伤害提升Y倍 | 1 |
| Skill cooldown | 使其下一个未释放的神通进入X秒冷却 | 1 |
| Echo damage | 受到伤害时额外受到一次攻击 | 1 |
| Delayed burst | 【name】持续X秒...时间结束时造成伤害 | 1 |

### §3.3 Composition Patterns

The grammar must handle these composition patterns:

**Conjunction with inheritance:**
```
Action "与" ShortRef
  → ShortRef inherits verb and count from Action
Example: 添加1层【噬心之咒】与【断魂之咒】
```

**Shared qualifier:**
```
ActionList "，" Qualifier
  → Qualifier scopes over the ActionList
Example: ...添加1层【X】与【Y】，各自最多叠加5层
```

**Clause-level context propagation:**
```
TriggerClause "，" ChanceClause TargetAction
  → trigger and chance apply to the action
Example: 受到伤害时，各有30%概率对攻击方添加...
```

**Monster cap (parenthetical):**
```
DamageClause "（" MonsterCap "）"
  → cap_vs_monster modifies the damage
Example: 造成Y%最大气血值的伤害（对怪物不超过Z%攻击力）
```

**Stat list with conjunction:**
```
"提升" StatMod ("与" StatType)*
  → later stats inherit the value and verb
Example: 提升自身w%的攻击力与暴击率
```

### §3.4 State Definition Grammar

After `【name】：`, the text describes the state's effects:

```
StateDefinition = StateDef TierData?
StateDef        = EffectList StateModifiers?
StateModifiers  = (Duration | MaxStacks | Permanent)*
```

State definitions reuse the same `EffectList` grammar — they contain the same
effect clause types (damage, DoT, buffs, etc.) but scoped to a named state.

### §3.5 Variable References

Values like `x`, `y`, `z` are variable references resolved by tier data:
```
VarRef = letter+    -- variable reference (resolved later)
       | number     -- literal value
```

The grammar captures variable references as strings. Tier resolution happens
after parsing, same as current approach (`tiers.ts`).

---

## §4 Semantic Actions

ohm-js separates grammar from semantics. The grammar defines structure;
semantic actions define meaning.

### §4.1 Output Format

Semantic actions produce `EffectRow[]` — the same output as the current handler stage.
This means everything downstream (tier resolution, YAML emission, simulator) is unchanged.

```typescript
const semantics = grammar.createSemantics().addOperation<EffectRow[]>("toEffects", {
  Description(preamble, effectList, tierData) {
    return effectList.toEffects();
  },
  EffectList(first, seps, rest) {
    return [first.toEffects(), ...rest.children.flatMap(c => c.toEffects())];
  },
  BaseAttack(prefix, zc, hitCount, tp, varRef, pct, atk, lf, dmg) {
    return [{
      type: "base_attack",
      hits: hitCount.children[0]?.toEffects() ?? 1,
      total: varRef.toEffects(),
    }];
  },
  // ... one semantic action per grammar rule
});
```

### §4.2 State Registry

The grammar also produces `StateRegistry` as a separate semantic operation:

```typescript
semantics.addOperation<StateRegistry>("toStates", {
  StateCreation(bing, wei, target, verb, count, ceng, stateName) {
    return {
      [stateName.toStates()]: {
        target: target.sourceString.includes("敌方") ? "opponent" : "self",
        // duration, max_stacks, etc. come from the state definition segment
      }
    };
  },
});
```

---

## §5 Migration Path

### §5.1 Parallel Development

The ohm grammar parser can be built alongside the current regex reader.
Both produce `EffectRow[]`. The migration steps:

1. Write the grammar in a `.ohm` file
2. Write semantic actions that produce `EffectRow[]`
3. Run both parsers on all 28 books, compare output
4. Fix grammar rules until output matches
5. Switch the pipeline to use the grammar parser
6. Delete regex reader, context listener, handlers

### §5.2 Incremental Grammar Development

Start with the most common patterns (base_attack, hp_cost, state_creation)
and add complexity:

| Phase | Patterns | Books covered |
|-------|----------|---------------|
| 1 | base_attack, hp_cost, self_lost_hp_damage | ~10 |
| 2 | state_creation, duration, max_stacks | ~18 |
| 3 | DoT, counter, debuff, shield | ~24 |
| 4 | summon, escalation, conditional, delayed_burst | 28 |

### §5.3 Validation

Use `verify-reactive.ts` (adapted) to compare grammar output against:
1. Current reactive parser output
2. Imperative baseline (`data/yaml/imperative-baseline/`)

---

## §6 Risk Assessment

| Risk | Mitigation |
|------|------------|
| ohm grammar can't handle a specific text structure | Grammar is extensible — add a rule. If truly unparseable, keep as book-specific override (2 books max) |
| Performance: grammar parsing slower than regex | Unlikely for 28 books. If needed, cache parsed results |
| Learning curve for ohm-js | Grammar syntax is simple. Experiments prove feasibility. ohm has good docs + online editor |
| Grammar maintenance burden | Grammar IS the specification — maintaining it IS maintaining the parser. Unlike regex where the "spec" is scattered across 130 patterns |
| State definition parsing | Pre-split at `【name】：` boundaries (keep current approach), then parse each segment. Grammar handles the segment structure |

---

## §7 Key Design Decisions

### §7.1 Pre-split at `【name】：` or handle in grammar?

**Decision: Pre-split, then parse each segment.**

The `【name】：` boundary creates a scope hierarchy (parent state → child states).
Handling this in a PEG grammar is possible but adds complexity for recursive
state definitions. Pre-splitting is simpler and already works.

The grammar parses each segment independently. Segment metadata (state name,
target from preText) is attached post-parse.

### §7.2 One grammar or multiple?

**Decision: One grammar with alternatives.**

All effect clauses share vocabulary (numbers, state names, damage types).
A single grammar with `EffectClause = BaseAttack | HpCost | DoT | ...` is
cleaner than separate grammars per effect type.

### §7.3 Do affixes use the same grammar?

**Decision: Yes.**

Affix text uses the same Chinese patterns as skill text. The grammar handles
both. The difference is pre-processing (strip `【affix name】：` prefix for affixes)
and post-processing (tier resolution, parent assignment), not the grammar.

---

## §8 Comparison

| Aspect | Regex reader | ohm grammar |
|--------|-------------|-------------|
| Composition (与, 并) | Compound regex or lost | Grammar rules |
| Qualifier scoping (各自) | Ad-hoc context propagation | Grammar structure |
| Cross-clause context | Cannot | Grammar rules + semantic actions |
| Parse errors | Silent (no match → empty) | Loud (position + expected alternatives) |
| New pattern | Add regex + handler + skip terms + modifier list | Add grammar rule + semantic action |
| Debugging | Print tokens → groups → effects | Parse tree visualization (ohm editor) |
| Specification | Scattered across reader.ts, context.ts, handlers.ts | One `.ohm` file |
| Lines of code | ~2000 (reader + context + handlers) | ~300 (grammar) + ~400 (semantic actions) |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-22 | Initial design proposal |
