---
initial date: 2026-03-20
dates of modification: [2026-03-20]
---

<style>
body {
  max-width: none !important;
  width: 95% !important;
  margin: 0 auto !important;
  padding: 20px 40px !important;
  background-color: #282c34 !important;
  color: #abb2bf !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
  line-height: 1.6 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

h1, h2, h3, h4, h5, h6 {
  color: #ffffff !important;
}

a {
  color: #61afef !important;
}

code {
  background-color: #3e4451 !important;
  color: #e5c07b !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
}

pre {
  background-color: #2c313a !important;
  border: 1px solid #4b5263 !important;
  border-radius: 6px !important;
  padding: 16px !important;
  overflow-x: auto !important;
}

pre code {
  background-color: transparent !important;
  color: #abb2bf !important;
  padding: 0 !important;
  border-radius: 0 !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
}

table {
  border-collapse: collapse !important;
  width: auto !important;
  margin: 16px 0 !important;
  table-layout: auto !important;
  display: table !important;
}

table th,
table td {
  border: 1px solid #4b5263 !important;
  padding: 8px 10px !important;
  word-wrap: break-word !important;
}

table th:first-child,
table td:first-child {
  min-width: 60px !important;
}

table th {
  background: #3e4451 !important;
  color: #e5c07b !important;
  font-size: 14px !important;
  text-align: center !important;
}

table td {
  background: #2c313a !important;
  font-size: 12px !important;
  text-align: left !important;
}

blockquote {
  border-left: 3px solid #4b5263 !important;
  padding-left: 10px !important;
  color: #5c6370 !important;
  background-color: #2c313a !important;
}

strong {
  color: #e5c07b !important;
}
</style>

# Parser Redesign — Reactive Event-Sourcing Architecture

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> This document proposes replacing the imperative extractor-based parser with a reactive event-sourcing architecture. The reader emits pattern events; listeners produce structured effects. Same paradigm as the simulator's XState event model.

---

## §1 Problem Statement

### §1.1 Current Architecture

The parser has two layers that both conflate pattern recognition with effect production:

```
Raw Chinese text
  ↓
SKILL_EXTRACTORS[] / AFFIX_EXTRACTORS[]     ← 86 imperative functions
  ↓  (each scans the FULL text, each decides independently)
ExtractedEffect[]
  ↓
Tier resolution + dedup
  ↓
EffectRow[]  →  YAML
```

Each extractor is an imperative function that:
1. Receives the **full text** as a string
2. Runs its own regex against it
3. Decides independently whether to match
4. Returns a typed effect or null

### §1.2 Failure Modes

This design produces five categories of bugs, all observed in production:

**1. Competing extractors** — Multiple extractors match the same text pattern.
- `extractSelfHpCost` vs `extractSelfHpCostPerHit` vs `extractSelfHpCostDot` all match `消耗...气血值`
- Fix required: grammar gates, ordering, negative lookaheads

**2. Grammar gates** — Extractors restricted to specific book grammars to prevent false matches.
- `self_hp_cost` gated to G4/G5 → missed 天煞破虚诀 (G3 book with HP cost)
- Removing the gate → 九重天凤诀 gets duplicate extraction

**3. Negative lookaheads** — Extractors check for absence of patterns to avoid collision.
- `extractSelfHpCost` must check `!/每段攻击.*消耗/` to avoid colliding with per-hit variant
- Each new edge case adds another lookahead, compounding fragility

**4. Ordering dependencies** — Extractor evaluation order affects which matches survive dedup.
- `order: 0` for HP cost, `order: 10` for base_attack, `order: 20` for per-hit variants
- Reordering breaks extraction — implicit contract between extractors

**5. Context blindness** — Each extractor sees only the flat text, not its position relative to other recognized patterns.
- `extractSelfBuffStats` maps both `伤害加深` and `神通伤害加深` to `skill_damage_increase`
- The extractor cannot distinguish because it lacks context about which term variant was matched

### §1.3 Root Cause

The root cause is **conflating pattern recognition with effect production** in a single imperative function. Each extractor must:
- Know what pattern to match (recognition)
- Know what effect to produce (production)
- Know what OTHER extractors might also match (deconfliction)

The third responsibility is the source of all bugs. It requires every extractor to have global knowledge of every other extractor — an impossible maintenance burden.

---

## §2 Proposed Architecture

### §2.1 Overview

Separate recognition from production using an event-sourcing model:

```
Raw Chinese text
  ↓
Scanner (reader)                     ← one component, scans once
  ↓ emits
PatternEvent[]                       ← what was recognized, with context
  ↓ dispatched to
Listeners (handlers)                 ← one per mechanic concept
  ↓ produce
EffectRow[]  →  YAML
```

Three distinct components with single responsibilities:

| Component | Responsibility | Knows about |
|:----------|:--------------|:------------|
| **Scanner** | Tokenize Chinese text into pattern events | Chinese patterns only |
| **PatternEvent** | Carry recognized pattern + positional context | Nothing (data) |
| **Listener** | Produce typed effects from pattern events | One mechanic concept |

### §2.2 Scanner

The scanner reads the text once and emits events for every recognized Chinese pattern. It does NOT know about effect types — it only knows Chinese game terminology.

```typescript
interface PatternEvent {
  /** What Chinese pattern was recognized */
  pattern: PatternType;
  /** Raw matched text */
  raw: string;
  /** Extracted captures (variable refs or literal values) */
  captures: Record<string, string>;
  /** Position in the text */
  position: number;
  /** Full text line this pattern appeared in */
  line: string;
  /** Named state context: is this inside a 【name】：definition? */
  parentState?: string;
  /** Preceding patterns on the same line (for context) */
  preceding: PatternType[];
}
```

Pattern types correspond to Chinese game terms, NOT effect types:

```typescript
type PatternType =
  // Damage
  | "ATTACK"              // 造成x段共计y%攻击力的灵法伤害
  | "PERCENT_MAX_HP"      // 造成目标y%最大气血值的伤害
  | "PERCENT_CURRENT_HP"  // 造成目标y%当前气血值的伤害
  | "PERCENT_LOST_HP"     // 造成自身/目标y%已损失气血值的伤害
  | "FLAT_EXTRA_DAMAGE"   // 额外造成x%攻击力的伤害
  // Cost
  | "HP_COST"             // 消耗(自身)x%当前气血值
  // Buff/Debuff
  | "STAT_INCREASE"       // 提升y%攻击力/伤害加深/神通伤害加深/...
  | "STAT_DECREASE"       // 降低x%治疗量/攻击力/...
  | "NAMED_STATE"         // 添加【name】：...
  // Healing
  | "HEAL"                // 恢复x%攻击力的气血
  | "LIFESTEAL"           // 吸血效果x%
  // Shield
  | "SHIELD"              // 为自身添加x%最大气血值的护盾
  | "SHIELD_DESTROY"      // 湮灭敌方1个护盾
  // Modifiers
  | "DURATION"            // 持续x秒
  | "PER_HIT"             // 每段攻击
  | "PER_TICK"            // 每秒/每0.5秒
  | "PER_STACK"           // 每叠加N层
  | "MAX_STACKS"          // 最多叠加x层
  | "CHANCE"              // x%概率
  | "ON_ATTACKED"         // 受到伤害时/攻击时
  | "ON_DISPEL"           // 若被驱散
  | "UNDISPELLABLE"       // 无法被驱散
  | "PERMANENT"           // 战斗状态内永久生效
  // Conditionals
  | "CONDITION"           // 敌方处于控制效果/气血值低于x%/...
  | "SELF_HEAL_ECHO"      // 等额恢复自身气血
  ;
```

Key property: **pattern types are about Chinese terms, not game mechanics.** The scanner's job is linguistic, not semantic.

### §2.3 PatternEvent Context

The critical difference from the current architecture: each event carries **positional context** — what came before it, what named state it's inside, where in the line it appeared.

This eliminates the need for negative lookaheads. Instead of:

```typescript
// Current: extractSelfHpCost must exclude per-hit patterns
if (/每段攻击.*消耗/.test(text)) return null;
```

The listener receives:

```typescript
// Reactive: HP_COST event has preceding context
event = {
  pattern: "HP_COST",
  captures: { value: "z" },
  preceding: ["PER_HIT"],   // ← 每段攻击 was recognized before this
}
// Listener checks context, not the raw text
if (event.preceding.includes("PER_HIT")) {
  return { type: "self_hp_cost", value: captures.value, per_hit: true };
} else {
  return { type: "self_hp_cost", value: captures.value };
}
```

### §2.4 Listeners

Each listener handles **one mechanic concept**. It receives pattern events and produces EffectRows.

```typescript
interface Listener {
  /** Which pattern(s) this listener responds to */
  on: PatternType | PatternType[];
  /** Produce effects from the pattern event + accumulated context */
  handle: (event: PatternEvent, ctx: ListenerContext) => EffectRow | null;
}

interface ListenerContext {
  /** All events emitted so far (for cross-referencing) */
  events: PatternEvent[];
  /** Current tier variables */
  tierVars: Record<string, number>;
  /** Named states recognized in this text */
  states: Record<string, StateDef>;
  /** Book name */
  book: string;
}
```

Example listeners:

```typescript
// ONE listener for all HP cost variants
const hpCostListener: Listener = {
  on: "HP_COST",
  handle: (event, ctx) => {
    const fields: Record<string, unknown> = {
      value: event.captures.value,
    };
    // Context-based variant detection
    if (event.preceding.includes("PER_HIT")) {
      fields.per_hit = true;
    }
    if (event.preceding.includes("PER_TICK")) {
      fields.tick_interval = 1; // or from captures
    }
    return { type: "self_hp_cost", ...fields } as EffectRow;
  },
};

// ONE listener for all damage modifier variants
const statIncreaseListener: Listener = {
  on: "STAT_INCREASE",
  handle: (event, ctx) => {
    const raw = event.raw;
    // The scanner already captured the TERM — listener just maps it
    if (/神通伤害加深/.test(raw)) {
      return { type: "self_buff", skill_damage_increase: event.captures.value } as EffectRow;
    }
    if (/伤害加深/.test(raw)) {
      return { type: "self_buff", damage_increase: event.captures.value } as EffectRow;
    }
    if (/攻击力/.test(raw)) {
      return { type: "self_buff", attack_bonus: event.captures.value } as EffectRow;
    }
    // ... etc
    return null;
  },
};
```

### §2.5 Composition via Event Stream

Compound effects (e.g., 大罗幻诀's counter-debuff with child DoTs) emerge naturally from the event stream. The scanner emits:

```
NAMED_STATE { name: "罗天魔咒", parentState: null }
ON_ATTACKED { }
CHANCE { value: "30" }
NAMED_STATE { name: "噬心之咒", parentState: "罗天魔咒" }
PER_TICK { interval: "0.5" }
PERCENT_CURRENT_HP { value: "y" }
DURATION { value: "4" }
NAMED_STATE { name: "断魂之咒", parentState: "罗天魔咒" }
PER_TICK { interval: "0.5" }
PERCENT_LOST_HP { value: "y" }
DURATION { value: "4" }
MAX_STACKS { value: "5", qualifier: "各自" }
```

The `MAX_STACKS` event carries `qualifier: "各自"` — the listener for max_stacks can use this to assign stacking to the children, not the parent. No regex hack needed.

---

## §3 Migration Path

### §3.1 Parallel Architecture

The reactive parser can be built alongside the existing one. Both produce `EffectRow[]` — the output format doesn't change. This enables:

1. Build scanner + listeners for one mechanic at a time
2. Compare output against existing extractors
3. Switch over per-mechanic, not all-at-once
4. Delete old extractors only after reactive equivalents are verified

### §3.2 Migration Order

Start with mechanics that have the most extractor variants (highest bug surface):

| Phase | Mechanic | Current extractors to replace | Events |
|:------|:---------|:------------------------------|:-------|
| 1 | HP cost | `extractSelfHpCost`, `extractSelfHpCostPerHit`, `extractSelfHpCostDot` | `HP_COST`, `PER_HIT`, `PER_TICK` |
| 2 | Self buff stats | `extractSelfBuffStats`, `extractSelfBuff`, `extractSelfBuffSkillDamageIncrease` | `STAT_INCREASE`, `NAMED_STATE`, `DURATION` |
| 3 | DoT | `extractDot`, `extractDotPermanentMaxHp`, `extractDotPerNStacks`, `extractAtkDot` | `PER_TICK`, `PERCENT_*`, `DURATION` |
| 4 | Damage modifiers | `extractDamageIncrease`, `extractSkillDamageIncrease`, `extractConditionalDamage*` | `STAT_INCREASE`, `CONDITION` |
| 5 | Remaining | All other extractors | Remaining events |

### §3.3 Scanner Implementation Strategy

The scanner can be built incrementally:

```typescript
function scan(text: string): PatternEvent[] {
  const events: PatternEvent[] = [];
  const lines = splitIntoLines(text);

  for (const line of lines) {
    const preceding: PatternType[] = [];

    // Try each pattern against the remaining text in the line
    // Patterns are ordered by position in the line, not by priority
    for (const match of matchAllPatterns(line)) {
      events.push({
        pattern: match.type,
        raw: match.raw,
        captures: match.captures,
        position: match.index,
        line,
        parentState: detectParentState(line, match.index),
        preceding: [...preceding],
      });
      preceding.push(match.type);
    }
  }

  return events;
}
```

The `matchAllPatterns` function applies a **pattern table** (declarative) — not individual extractor functions:

```typescript
const PATTERNS: { type: PatternType; regex: RegExp; captures: string[] }[] = [
  { type: "HP_COST",         regex: /消耗(?:自身)?(\w+)%(?:的)?当前气血值/,    captures: ["value"] },
  { type: "PER_HIT",         regex: /每段攻击/,                                captures: [] },
  { type: "PER_TICK",        regex: /每(\d+(?:\.\d+)?)秒/,                     captures: ["interval"] },
  { type: "ATTACK",          regex: /造成(\w+)段共(?:计)?(\w+)%攻击力/,         captures: ["hits", "total"] },
  { type: "STAT_INCREASE",   regex: /提升(?:自身)?(\w+)%(?:的)?(.*?)(?=[，,。])/,captures: ["value", "stat"] },
  { type: "NAMED_STATE",     regex: /【(.+?)】[：:]/,                           captures: ["name"] },
  { type: "DURATION",        regex: /持续(\w+)秒/,                             captures: ["value"] },
  { type: "MAX_STACKS",      regex: /(各自)?最多叠加(\w+)层/,                   captures: ["qualifier", "value"] },
  { type: "CHANCE",          regex: /(\w+)%(?:的)?概率/,                        captures: ["value"] },
  { type: "ON_ATTACKED",     regex: /受到(?:伤害|攻击)时/,                      captures: [] },
  // ... etc
];
```

### §3.4 What Doesn't Change

- **EffectRow type** — output format stays the same
- **Tier resolution** — `buildDataState` + per-tier expansion stays the same
- **YAML generation** — `formatBooksYaml` stays the same
- **Simulator handlers** — consume EffectRows, unaffected by parser internals
- **Custom compound parsers** (EXCLUSIVE_PARSER_TABLE) — can migrate last or remain as listeners

---

## §4 Comparison

| Aspect | Current (imperative) | Proposed (reactive) |
|:-------|:--------------------|:-------------------|
| Pattern recognition | 86 independent functions | 1 scanner with pattern table |
| Effect production | Same 86 functions | ~30 listeners (one per concept) |
| Deconfliction | Grammar gates + order + lookaheads | Positional context on events |
| Adding a new pattern | Write function, find correct order/grammar, add lookaheads to neighbors | Add pattern to table, write listener |
| Debugging | Which of 86 extractors matched? In what order? | Print event stream, see exact match sequence |
| Testing | Test each extractor in isolation (misses interactions) | Test event stream for a text, test listener for an event |
| Variant handling | Separate extractors per variant | One listener checks context |

### §4.1 Quantitative Reduction

Current: **86 extractor functions** across 2500 lines in `extract.ts`.

Proposed:
- **~40 pattern entries** in the scanner table (declarative data, ~100 lines)
- **~30 listeners** (one per mechanic concept, ~500 lines)
- Total: **~600 lines** replacing ~2500 lines

The reduction comes from eliminating:
- Duplicate extractors for variants of the same mechanic
- Deconfliction logic (grammar gates, ordering, lookaheads)
- Redundant regex parsing (each extractor re-scans the full text)

---

## §5 Architectural Alignment

The reactive parser mirrors the simulator's XState architecture:

| Simulator | Parser |
|:----------|:-------|
| Book actor casts → emits intent events | Scanner reads text → emits pattern events |
| Player machine receives intents → resolves state changes | Listeners receive patterns → produce effects |
| Handlers are pure: event in → state change out | Listeners are pure: pattern event in → EffectRow out |
| No handler knows about other handlers | No listener knows about other listeners |
| Context available via `PlayerState` | Context available via `PatternEvent.preceding` |

Same event-driven, single-responsibility model across both layers.

---

## §6 Open Questions

1. **Pattern overlap** — Two patterns can match the same text span (e.g., `提升y%伤害加深` matches both `STAT_INCREASE` and a potential `DAMAGE_MODIFIER`). The scanner needs a resolution strategy: longest match? most specific? positional?

2. **Cross-line context** — Some mechanics span multiple lines (e.g., 大罗幻诀's 罗天魔咒 definition spans 3 lines). The scanner needs a line-grouping strategy.

3. **Tier variable resolution** — Currently tier variables (x, y, z) are resolved in `genericSkillParse`. In the reactive model, listeners produce EffectRows with variable references, and a separate resolution step substitutes tier values. This is cleaner but needs explicit design.

4. **Exclusive affix compound parsers** — The 6 custom parsers in `EXCLUSIVE_PARSER_TABLE` handle compound effects that the generic pipeline can't. In the reactive model, these become listeners that respond to sequences of events. The event stream for compound effects may need a "transaction" concept (group events that belong to the same compound).

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-20 | Initial design proposal |
