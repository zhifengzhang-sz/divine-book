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

> This document proposes replacing the imperative extractor-based parser with a three-stage reactive pipeline: Reader (linguistic) → Context Listener (structural) → Parser (semantic). Each stage has one job. Same event-driven paradigm as the simulator's XState model.

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

Three-stage pipeline where each stage has exactly one job:

```
Raw Chinese text
  ↓
Stage 1: Reader (linguistic)         ← scans text, emits flat token events
  ↓
TokenEvent[]                         ← "I see these Chinese terms"
  ↓
Stage 2: Context Listener (structural) ← groups related tokens by context
  ↓
GroupEvent[]                         ← "These tokens belong together"
  ↓
Stage 3: Parser (semantic)           ← maps groups to typed effects
  ↓
EffectRow[]  →  YAML
```

| Stage | Responsibility | Knows about | Does NOT know about |
|:------|:--------------|:------------|:-------------------|
| **Reader** | Recognize Chinese terms, emit tokens | Chinese regex patterns | Effect types, grouping |
| **Context Listener** | Group related tokens by structural context | Token adjacency, named states, modifiers | Effect types, field names |
| **Parser** | Map groups to typed effects | Effect type taxonomy, field schemas | Chinese text, regex |

### §2.2 Stage 1: Reader

The reader scans text and emits one token per recognized Chinese term. Each token matches exactly one Chinese term — no abstract categories.

```typescript
interface TokenEvent {
  /** The Chinese term recognized (specific, not abstract) */
  term: string;
  /** Raw matched text */
  raw: string;
  /** Extracted captures (variable refs or literal values) */
  captures: Record<string, string>;
  /** Position in the source text */
  position: number;
  /** Line number in the source */
  line: number;
}
```

The reader's pattern table maps Chinese terms to token events. Each regex matches one specific term — no overlap, no disambiguation needed:

```typescript
const READER_PATTERNS = [
  // Damage
  { term: "base_attack",         regex: /造成(\w+)段共(?:计)?(\w+)%攻击力/,           captures: ["hits", "total"] },
  { term: "percent_max_hp",      regex: /造成(?:目标)?(\w+)%最大气血值的伤害/,          captures: ["value"] },
  { term: "percent_current_hp",  regex: /造成(?:目标)?(\w+)%当前气血值的伤害/,          captures: ["value"] },
  { term: "percent_lost_hp",     regex: /造成(?:自身|目标)?(\w+)%已损(?:失)?气血值的伤害/, captures: ["value"] },
  { term: "flat_extra_damage",   regex: /额外造成(\w+)%攻击力的伤害/,                   captures: ["value"] },

  // Cost
  { term: "hp_cost",             regex: /消耗(?:自身)?(\w+)%(?:的)?当前气血值/,         captures: ["value"] },

  // Stat modifiers (each Chinese term = distinct token, no abstract STAT_INCREASE)
  { term: "atk_increase",        regex: /提升(?:自身)?(\w+)%(?:的)?攻击力/,             captures: ["value"] },
  { term: "damage_increase",     regex: /(?<!神通)伤害(?:提升|加深)(\w+)%/,             captures: ["value"] },
  { term: "skill_dmg_increase",  regex: /神通伤害加深(\w+)%/,                          captures: ["value"] },
  { term: "dr_increase",         regex: /(\w+)%(?:的)?伤害减免/,                       captures: ["value"] },
  { term: "final_dmg_increase",  regex: /(\w+)%(?:的)?最终伤害(?:加成|加深)/,           captures: ["value"] },
  { term: "heal_reduction",      regex: /治疗量降低(\w+)%/,                            captures: ["value"] },

  // Structure
  { term: "named_state",         regex: /【(.+?)】[：:]/,                              captures: ["name"] },
  { term: "duration",            regex: /持续(\w+)秒/,                                captures: ["value"] },
  { term: "per_hit",             regex: /每段攻击/,                                    captures: [] },
  { term: "per_tick",            regex: /每(\d+(?:\.\d+)?)秒/,                         captures: ["interval"] },
  { term: "max_stacks",          regex: /(各自)?最多叠加(\w+)层/,                       captures: ["qualifier", "value"] },
  { term: "chance",              regex: /(\w+)%(?:的)?概率/,                            captures: ["value"] },
  { term: "on_attacked",         regex: /受到(?:伤害|攻击)时/,                          captures: [] },
  { term: "on_dispel",           regex: /若被驱散/,                                    captures: [] },
  { term: "undispellable",       regex: /无法被驱散/,                                  captures: [] },
  { term: "permanent",           regex: /战斗状态内永久生效/,                            captures: [] },

  // Healing / Shield
  { term: "heal",                regex: /恢复(?:自身)?(\w+)%攻击力的气血/,              captures: ["value"] },
  { term: "lifesteal",           regex: /吸血效果(\w+)%/,                              captures: ["value"] },
  { term: "shield",              regex: /(\w+)%(?:最大气血值)?的?护盾/,                 captures: ["value"] },
  { term: "shield_destroy",      regex: /湮灭(?:敌方)?(\w+)个护盾/,                    captures: ["count"] },

  // ... etc
];
```

Key property: each Chinese term has a unique surface form. The reader matches them left-to-right through the text and emits every match. No ordering logic, no deconfliction — the Chinese language already disambiguates.

### §2.3 Stage 2: Context Listener

The context listener receives the flat token stream and groups related tokens by structural context. It knows about text structure (what's a modifier of what) but NOT about game mechanics.

```typescript
interface GroupEvent {
  /** The primary token in this group */
  primary: TokenEvent;
  /** Modifier tokens that belong to this primary */
  modifiers: TokenEvent[];
  /** Named state this group is inside (if any) */
  parentState?: string;
  /** Scope: is this a skill effect, buff stat, state definition? */
  scope: "skill" | "state_def" | "buff_stat" | "modifier";
}
```

Grouping rules are structural, not semantic:

1. **Named state scoping** — Tokens after `【name】：` until the next `【name】：` or line break belong to that state's definition.

2. **Modifier attachment** — Modifier tokens (`per_hit`, `per_tick`, `duration`, `max_stacks`, `chance`, `on_attacked`, `undispellable`, `permanent`) attach to the nearest preceding primary token (a damage, cost, heal, buff, or state token).

3. **Qualifier propagation** — `各自` on `max_stacks` marks it as applying to children of the current state, not the state itself.

Example — 大罗幻诀's text produces this token stream:

```
Tokens:
  base_attack { hits: "x", total: "x" }
  named_state { name: "罗天魔咒" }
  on_attacked { }
  chance { value: "30" }
  named_state { name: "噬心之咒" }          ← child state def
  per_tick { interval: "0.5" }
  percent_current_hp { value: "y" }
  duration { value: "4" }
  named_state { name: "断魂之咒" }          ← child state def
  per_tick { interval: "0.5" }
  percent_lost_hp { value: "y" }
  duration { value: "4" }
  max_stacks { qualifier: "各自", value: "5" }

Context listener groups:
  GROUP 1: { primary: base_attack, modifiers: [], scope: "skill" }
  GROUP 2: { primary: named_state(罗天魔咒), modifiers: [on_attacked, chance(30)], scope: "state_def" }
  GROUP 3: { primary: percent_current_hp(y), modifiers: [per_tick(0.5), duration(4)],
             parentState: "噬心之咒", scope: "state_def" }
  GROUP 4: { primary: percent_lost_hp(y), modifiers: [per_tick(0.5), duration(4)],
             parentState: "断魂之咒", scope: "state_def" }
  GROUP 5: { primary: max_stacks(5), modifiers: [], scope: "modifier",
             qualifier: "各自" → applies to children }
```

Another example — 九重天凤诀's HP cost:

```
Tokens:
  base_attack { hits: "x", total: "x" }
  per_hit { }
  percent_lost_hp { value: "y" }
  per_hit { }                                ← second per_hit
  hp_cost { value: "z" }
  per_hit { }                                ← third per_hit, modifies hp_cost
  named_state { name: "蛮神" }

Context listener groups:
  GROUP 1: { primary: base_attack, modifiers: [], scope: "skill" }
  GROUP 2: { primary: percent_lost_hp(y), modifiers: [per_hit], scope: "skill" }
  GROUP 3: { primary: hp_cost(z), modifiers: [per_hit], scope: "skill" }
  GROUP 4: { primary: named_state(蛮神), modifiers: [...], scope: "state_def" }
```

The context listener knows that `per_hit` modifies the nearest preceding primary. It doesn't know what `per_hit` + `hp_cost` means as a game mechanic — that's the parser's job.

### §2.4 Stage 3: Parser

The parser receives group events and maps them to typed `EffectRow[]`. It knows the effect type taxonomy but never touches Chinese text or regex.

```typescript
interface GroupHandler {
  /** Which primary term(s) this handler processes */
  handles: string | string[];
  /** Map a group event to an effect */
  parse: (group: GroupEvent) => EffectRow | null;
}
```

Example handlers:

```typescript
const hpCostHandler: GroupHandler = {
  handles: "hp_cost",
  parse: (group) => {
    const fields: Record<string, unknown> = {
      value: group.primary.captures.value,
    };
    if (group.modifiers.some(m => m.term === "per_hit")) {
      fields.per_hit = true;
    }
    if (group.modifiers.some(m => m.term === "per_tick")) {
      const tick = group.modifiers.find(m => m.term === "per_tick");
      fields.tick_interval = tick?.captures.interval ?? 1;
    }
    return { type: "self_hp_cost", ...fields } as EffectRow;
  },
};

const maxStacksHandler: GroupHandler = {
  handles: "max_stacks",
  parse: (group) => {
    // "各自" qualifier → applies to children, not current state
    // The parser returns metadata that the state builder uses
    return {
      type: "__max_stacks__",
      value: group.primary.captures.value,
      target: group.primary.captures.qualifier === "各自" ? "children" : "self",
    } as EffectRow;
  },
};
```

### §2.5 Why Three Stages

Two stages (reader → parser) fails because the parser would need to re-derive context from the flat token stream — reimplementing the grouping logic inside every handler.

Four stages would over-separate — the context listener's grouping rules are simple enough that adding another stage (e.g., separate modifier-attachment from state-scoping) would add indirection without reducing complexity.

Three stages is the natural decomposition:
- **Linguistic** (reader) — what Chinese terms are present?
- **Structural** (context listener) — which terms modify which?
- **Semantic** (parser) — what game effects do these produce?

---

## §3 Migration Path

### §3.1 Parallel Architecture

The three-stage pipeline can be built alongside the existing extractors. Both produce `EffectRow[]` — the output format doesn't change. This enables:

1. Build reader + context listener + parser handlers for one mechanic at a time
2. Compare output against existing extractors for the same books
3. Switch over per-mechanic, not all-at-once
4. Delete old extractors only after reactive equivalents are verified

### §3.2 Migration Order

Start with mechanics that have the most extractor variants (highest bug surface):

| Phase | Mechanic | Current extractors to replace | Reader terms | Grouping rule |
|:------|:---------|:------------------------------|:-------------|:-------------|
| 1 | HP cost | `extractSelfHpCost`, `extractSelfHpCostPerHit`, `extractSelfHpCostDot` | `hp_cost`, `per_hit`, `per_tick` | Modifier attachment |
| 2 | Stat buffs | `extractSelfBuffStats`, `extractSelfBuff`, `extractSelfBuffSkillDamageIncrease` | `atk_increase`, `damage_increase`, `skill_dmg_increase`, `dr_increase`, `named_state`, `duration` | Named state scoping |
| 3 | DoT | `extractDot`, `extractDotPermanentMaxHp`, `extractDotPerNStacks`, `extractAtkDot` | `percent_*_hp`, `per_tick`, `duration` | Named state scoping + modifier attachment |
| 4 | Damage modifiers | `extractDamageIncrease`, `extractSkillDamageIncrease`, `extractConditionalDamage*` | `damage_increase`, `skill_dmg_increase`, condition terms | Modifier attachment |
| 5 | Remaining | All other extractors | Remaining terms | — |

### §3.3 What Doesn't Change

- **EffectRow type** — output format stays the same
- **Tier resolution** — `buildDataState` + per-tier expansion stays the same (becomes a post-processing step after Stage 3)
- **YAML generation** — `formatBooksYaml` stays the same
- **Simulator handlers** — consume EffectRows, unaffected by parser internals

### §3.4 What Goes Away

- **Grammar types** (G2/G3/G4/G5/G6) — the context listener handles structure uniformly
- **SKILL_EXTRACTORS / AFFIX_EXTRACTORS** arrays — replaced by reader pattern table
- **Ordering / grammar gates / negative lookaheads** — replaced by grouping rules
- **EXCLUSIVE_PARSER_TABLE** — compound effects are just groups with multiple primaries
- **`extract.ts`** (2500 lines) — replaced by `reader.ts` (~100 lines) + `context.ts` (~200 lines) + `handlers.ts` (~300 lines)

---

## §4 Comparison

| Aspect | Current (imperative) | Proposed (three-stage) |
|:-------|:--------------------|:----------------------|
| Pattern recognition | 86 independent functions | Reader: ~40 pattern table entries |
| Context resolution | Implicit (grammar gates, ordering) | Context listener: explicit grouping rules |
| Effect production | Same 86 functions | Parser: ~25 group handlers |
| Deconfliction | Grammar gates + order + lookaheads | Not needed — grouping is unambiguous |
| Adding a new pattern | Write function, find order/grammar, add lookaheads | Add term to reader table, add handler |
| Debugging | Which of 86 extractors matched? In what order? | Print tokens → groups → effects at each stage |
| Testing | Test extractors in isolation (misses interactions) | Test each stage independently: tokens for a text, groups for tokens, effects for groups |
| Variant handling | Separate extractors per variant | One handler checks group modifiers |

### §4.1 Quantitative Reduction

Current: **86 extractor functions** across 2500 lines in `extract.ts`, plus grammar logic in `split.ts` (~250 lines), plus compound parsers in `exclusive.ts` (~150 lines). Total: **~2900 lines**.

Proposed:
- **Reader**: ~40 pattern entries (declarative data, ~100 lines)
- **Context listener**: grouping rules (~200 lines)
- **Parser handlers**: ~25 handlers (~300 lines)
- Total: **~600 lines** replacing ~2900 lines

The 5× reduction comes from eliminating:
- Duplicate extractors for variants of the same mechanic
- Deconfliction logic (grammar gates, ordering, lookaheads)
- Redundant regex parsing (each extractor re-scans the full text)
- Grammar type system (G2/G3/G4/G5/G6)

---

## §5 Architectural Alignment

The three-stage parser mirrors the simulator's architecture:

| Simulator | Parser |
|:----------|:-------|
| Book actor processes effects → emits intent events | Reader scans text → emits token events |
| Player machine receives intents with context | Context listener groups tokens with context |
| Handlers resolve intents → state changes | Parser handlers resolve groups → EffectRows |
| No handler knows about other handlers | No parser handler knows about other handlers |
| Context available via `PlayerState` | Context available via `GroupEvent.modifiers` |

Same event-driven, single-responsibility model across both layers.

---

## §6 Resolved Questions

### §6.1 Pattern Overlap (Resolved)

**Resolution: match Chinese terms at the right granularity.**

The abstract `STAT_INCREASE` pattern was too coarse — it matched multiple Chinese terms (攻击力, 伤害加深, 神通伤害加深) and forced the listener to re-parse. The fix: each Chinese term gets its own reader pattern entry. No overlap because the terms have unique surface forms:

- `神通伤害加深` — unique prefix `神通`
- `伤害加深` — no `神通` prefix
- `最终伤害加深` — unique prefix `最终`
- `攻击力` — completely different term

The reader matches the full term, not a partial abstraction. No disambiguation strategy needed.

### §6.2 Cross-Line Context (Resolved)

**Resolution: the context listener handles this via named state scoping.**

When the reader encounters `【name】：` it opens a scope. All subsequent tokens on the same line (and continuation lines until the next `【name】：` or line break) belong to that scope. The context listener tracks the open scope and assigns `parentState` to each group.

This is exactly what `splitCell` + `buildStateRegistry` do today — the context listener subsumes both.

### §6.3 Tier Variable Resolution

**Resolution: separate post-processing step after Stage 3.**

The parser produces EffectRows with variable references (e.g., `value: "y"`). A tier resolution step then expands per tier:

```
Parser output:     { type: "self_hp_cost", value: "y" }
Tier resolution:   tier 0 (y=2) → { type: "self_hp_cost", value: 2, data_state: ... }
                   tier 1 (y=7) → { type: "self_hp_cost", value: 7, data_state: ... }
```

This is cleaner than the current approach where child DoT variables were eagerly resolved using the last tier's values (the bug that caused 大罗幻诀's DoT to use y=7 for both tiers).

### §6.4 Compound Effects

**Resolution: compound effects are just groups with multiple primaries.**

The context listener can produce multi-primary groups when it recognizes compound patterns (e.g., 玄心剑魄's `dot + on_dispel`). The parser handler for compound groups produces multiple EffectRows from a single group.

No special `EXCLUSIVE_PARSER_TABLE` needed — compound effects are handled by the same pipeline as simple effects, just with richer groups.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-20 | Initial design proposal (two-stage: scanner → listeners) |
| 2.0 | 2026-03-20 | **Redesigned to three-stage pipeline**: Reader → Context Listener → Parser. Resolved all open questions. Reader patterns match Chinese terms at full granularity (no abstract categories). Context listener groups tokens by structure. Parser maps groups to effects. |
