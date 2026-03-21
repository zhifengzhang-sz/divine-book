---
initial date: 2026-03-21
dates of modification: [2026-03-21]
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

# Implementation Plan — Reactive Three-Stage Parser

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)
**Implements:** `design.reactive.md` v2.0
**Framework:** XState v5 (`^5.28.0`, already in package.json)

> This document is the concrete implementation spec. It maps every existing extractor to reader patterns and handlers, defines the XState machine structure, specifies the context listener's grouping rules, and provides the file layout, type definitions, and test strategy.

---

## §1 File Layout

```
lib/parser/
├── reader.ts          ← Stage 1: pattern table + scan function (~150 lines)
├── context.ts         ← Stage 2: grouping rules (~250 lines)
├── handlers.ts        ← Stage 3: group→effect handlers (~350 lines)
├── reactive.ts        ← XState v5 pipeline machine (~100 lines)
├── pipeline.ts        ← Public API: runPipeline() wrapper (rewrite, ~80 lines)
├── reactive.test.ts   ← Per-stage unit tests + dual-run migration test
│
│   (unchanged)
├── book-table.ts      ← School/grammar lookup (read-only, grammar no longer dispatches)
├── tiers.ts           ← buildDataState() + resolveFields() (unchanged)
├── emit.ts            ← YAML generation (unchanged)
├── md-table.ts        ← splitCell() + readMainSkillTables() (unchanged)
├── index.ts           ← parseMainSkills() orchestrator (minimal changes)
│
│   (kept during migration, deleted after)
├── extract.ts         ← 86 imperative extractors (unused by new pipeline)
├── split.ts           ← Grammar-based parser (unused by new pipeline)
├── states.ts          ← buildStateRegistry() (subsumed by context.ts)
├── patterns.ts        ← Display patterns for viz (replaced by reader.ts)
```

---

## §2 Type Definitions

### §2.1 TokenEvent (Stage 1 output)

```typescript
/** A single recognized Chinese term in the source text. */
export interface TokenEvent {
  /** Unique term identifier (e.g., "base_attack", "hp_cost", "per_hit") */
  term: string;
  /** Raw matched substring from the source text */
  raw: string;
  /** Extracted captures — variable refs or literal values */
  captures: Record<string, string>;
  /** Character offset in the source text (for modifier attachment) */
  position: number;
}
```

### §2.2 GroupEvent (Stage 2 output)

```typescript
/** A primary token with its attached modifiers and structural context. */
export interface GroupEvent {
  /** The primary token (damage, cost, buff, state definition, etc.) */
  primary: TokenEvent;
  /** Modifier tokens attached to this primary (per_hit, duration, etc.) */
  modifiers: TokenEvent[];
  /** Named state this group is inside, if any (e.g., "噬心之咒") */
  parentState?: string;
  /** Scope classification */
  scope: "skill" | "state_def" | "buff_stat" | "modifier";
}
```

### §2.3 GroupHandler (Stage 3 dispatch)

```typescript
/** Maps a group's primary term to an EffectRow. */
export interface GroupHandler {
  /** Which primary term(s) this handler processes */
  handles: string | string[];
  /** Map a group event to one or more effects. Returns null to skip. */
  parse: (group: GroupEvent, ctx: HandlerContext) => EffectRow | EffectRow[] | null;
}

/** Shared context available to all handlers. */
export interface HandlerContext {
  /** All groups in the current parse (for cross-group lookups) */
  allGroups: GroupEvent[];
  /** Book name (for special-case handlers) */
  bookName?: string;
}
```

### §2.4 XState Pipeline Types

```typescript
/** XState machine context */
export interface PipelineContext {
  text: string;
  sourceType: "skill" | "affix";
  bookName?: string;
  tokens: TokenEvent[];
  groups: GroupEvent[];
  effects: EffectRow[];
  diagnostics: DiagnosticEvent[];
}

/** XState emitted events — observable by parser-viz */
export type PipelineEmitted =
  | { type: "TOKEN"; token: TokenEvent }
  | { type: "GROUP"; group: GroupEvent }
  | { type: "EFFECT"; effect: EffectRow }
  | { type: "DIAGNOSTIC"; diagnostic: DiagnosticEvent };

export interface DiagnosticEvent {
  level: "warn" | "info";
  message: string;
  term?: string;
  position?: number;
}
```

---

## §3 XState v5 Pipeline Machine

### §3.1 Machine Structure

```typescript
import { setup, createActor, emit, assign } from "xstate";

export const pipelineMachine = setup({
  types: {
    context: {} as PipelineContext,
    input: {} as { text: string; sourceType: "skill" | "affix"; bookName?: string },
    events: {} as { type: "PARSE" },
    emitted: {} as PipelineEmitted,
  },
  actions: {
    readTokens: assign(({ context, emit }) => {
      const tokens = scan(context.text);
      for (const token of tokens) {
        emit({ type: "TOKEN", token });
      }
      return { tokens };
    }),
    buildGroups: assign(({ context, emit }) => {
      const groups = group(context.tokens, context.sourceType);
      for (const g of groups) {
        emit({ type: "GROUP", group: g });
      }
      return { groups };
    }),
    parseEffects: assign(({ context, emit }) => {
      const { effects, diagnostics } = parse(context.groups, {
        allGroups: context.groups,
        bookName: context.bookName,
      });
      for (const effect of effects) {
        emit({ type: "EFFECT", effect });
      }
      for (const d of diagnostics) {
        emit({ type: "DIAGNOSTIC", diagnostic: d });
      }
      return { effects, diagnostics };
    }),
  },
}).createMachine({
  id: "parser-pipeline",
  context: ({ input }) => ({
    text: input.text,
    sourceType: input.sourceType,
    bookName: input.bookName,
    tokens: [],
    groups: [],
    effects: [],
    diagnostics: [],
  }),
  initial: "idle",
  states: {
    idle: {
      on: { PARSE: "reading" },
    },
    reading: {
      entry: "readTokens",
      always: "grouping",
    },
    grouping: {
      entry: "buildGroups",
      always: "parsing",
    },
    parsing: {
      entry: "parseEffects",
      always: "done",
    },
    done: {
      type: "final",
    },
  },
});
```

### §3.2 Usage

```typescript
/** Run the pipeline synchronously and return results. */
export function runReactivePipeline(
  text: string,
  sourceType: "skill" | "affix",
  bookName?: string,
): PipelineContext {
  const actor = createActor(pipelineMachine, {
    input: { text, sourceType, bookName },
  });
  actor.start();
  actor.send({ type: "PARSE" });
  const snapshot = actor.getSnapshot();
  actor.stop();
  return snapshot.context;
}
```

---

## §4 Stage 1: Reader Pattern Table

### §4.1 Design Principles

1. **One Chinese term = one pattern.** No abstract categories. `神通伤害加深` and `伤害加深` are separate entries.
2. **Longest match first.** Patterns sorted by expected match length descending. When a pattern matches, its range is consumed — subsequent patterns cannot match overlapping text.
3. **Left-to-right scan.** Tokens are emitted in source text order (by `position`).
4. **Captures are variable refs.** `(\w+)` captures variable names or literal numbers. Resolution to concrete values happens in post-processing (tiers.ts), not here.

### §4.2 Complete Pattern Table

Each row maps to one reader pattern entry. The `term` column is the token's identity. The `regex` column is the Chinese pattern. The `captures` column lists named capture groups.

**Source column** indicates which imperative extractors this pattern replaces. Multiple extractors may collapse to one pattern + modifier combination.

#### Damage patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 1 | `base_attack` | `/造成(?:(?:一\|二\|三\|四\|五\|六\|七\|八\|九\|十)+段)?(?:共(?:计)?)?(\w+)%攻击力的(?:灵法)?伤害/` | `total` | `extractBaseAttackWithVars` |
| 2 | `hits_count` | `/造成((?:一\|二\|三\|四\|五\|六\|七\|八\|九\|十)+)段/` | `hits_cn` | (part of `extractBaseAttackWithVars`) |
| 3 | `percent_max_hp_damage` | `/(?:每段(?:攻击\|伤害))?(?:造成\|附加)(?:目标)?(\w+)%(?:自身)?最大气血值的伤害/` | `value` | `extractPercentHpDamage` |
| 4 | `cap_vs_monster` | `/对怪物(?:伤害)?(?:最多\|不超过)(?:造成)?(?:自身)?(\w+)%攻击力(?:的伤害)?/` | `value` | (part of `extractPercentHpDamage`) |
| 5 | `percent_current_hp_damage` | `/额外附加(\w+)%(?:目标)?当前气血值的伤害/` | `value` | `extractPercentCurrentHpDamage` |
| 6 | `self_lost_hp_damage` | `/(?:额外)?对(?:其\|目标)?造成自身(\w+)%已损(?:失)?气血值的伤害/` | `value` | `extractSelfLostHpDamage` |
| 7 | `shield_destroy_damage` | `/湮灭敌方(\w+)个护盾[，,](?:并)?(?:额外)?造成(\w+)%敌方最大气血值的伤害/` | `shields`, `value` | `extractShieldDestroyDamage` |
| 8 | `no_shield_double_damage` | `/对无盾目标造成双倍伤害/` | — | `extractNoShieldDoubleDamage` |
| 9 | `flat_extra_damage` | `/额外造成(\w+)%攻击力的伤害/` | `value` | `extractFlatExtraDamage` |
| 10 | `echo_damage` | `/(?:每次)?受到(?:的)?伤害时[，,].*?额外受到.*?伤害(?:值)?为当次伤害的(\w+)%.*?持续(\w+)秒/` | `value`, `duration` | `extractEchoDamage` |

#### Cost patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 11 | `hp_cost` | `/消耗(?:自身)?(\w+)%(?:的)?当前气血值/` | `value` | `extractSelfHpCost` + `extractSelfHpCostPerHit` |
| 12 | `hp_cost_dot` | `/自身每秒损失(\w+)%(?:的)?当前气血值/` | `value` | `extractSelfHpCostDot` |

> **Key insight:** `extractSelfHpCost` and `extractSelfHpCostPerHit` collapse to a single `hp_cost` pattern. The `per_hit` modifier is a separate token (#30) that the context listener attaches. No negative lookahead needed.

#### Stat modifier patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 13 | `skill_dmg_increase` | `/(\w+)%(?:的)?神通伤害加深/` | `value` | `extractSelfBuffStats` (partial) |
| 14 | `damage_increase` | `/(?<!神通)(\w+)%(?:的)?伤害加深/` | `value` | `extractSelfBuffStats` (partial) |
| 15 | `attack_bonus` | `/(?:提升\|提高)(?:自身)?(\w+)%(?:的)?攻击力/` | `value` | `extractSelfBuffStats` (partial) |
| 16 | `damage_reduction` | `/(\w+)%(?:的)?伤害减免/` | `value` | `extractSelfBuffStats` (partial) |
| 17 | `final_dmg_bonus` | `/(\w+)%(?:的)?最终伤害(?:加成\|加深)/` | `value` | `extractSelfBuffStats` (partial) |
| 18 | `crit_rate` | `/(\w+)%(?:的)?暴击率/` | `value` | `extractSelfBuffStats` (partial) |
| 19 | `crit_dmg_bonus` | `/(?:使本神通)?暴击伤害提[升高](\w+)%/` | `value` | `extractCritDamageBonus` |
| 20 | `healing_bonus` | `/(\w+)%(?:的)?治疗加成/` | `value` | `extractSelfBuffStats` (partial) |
| 21 | `defense_bonus` | `/(\w+)%(?:的)?守御(?:加成)?/` | `value` | `extractSelfBuffStats` (partial) |
| 22 | `hp_bonus` | `/(\w+)%(?:的)?最大气血值/` | `value` | `extractSelfBuffStats` (partial) |

> **Key insight:** `extractSelfBuffStats` (one function returning a multi-field object) decomposes into 10 separate reader patterns. Each Chinese stat term is its own token. The handler reassembles them from the group's modifiers.

#### DoT patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 23 | `dot_current_hp` | `/每(\w+(?:\.\w+)?)秒(?:额外)?造成(?:目标)?(\w+)%当前气血值的伤害/` | `interval`, `value` | `extractDot` (current HP variant) |
| 24 | `dot_lost_hp` | `/每(\w+(?:\.\w+)?)秒(?:额外)?造成(?:目标)?(\w+)%已损(?:失)?气血值的伤害/` | `interval`, `value` | `extractDot` (lost HP variant) |
| 25 | `dot_max_hp` | `/每秒(?:对目标)?(?:受到)?(\w+)%(?:最大)?气血值的伤害/` | `value` | `extractDot` (max HP variant) + `extractDotPermanentMaxHp` |
| 26 | `dot_atk` | `/每秒受到(\w+)%攻击力的伤害/` | `value` | `extractAtkDot` |
| 27 | `self_lost_hp_damage_dot` | `/每秒对目标造成(?:自身)?(\w+)%已损(?:失)?气血值(?:和期间消耗气血)?的伤害/` | `value` | `extractSelfLostHpDamageDot` |

#### Structure / modifier patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 28 | `named_state` | `/【(.+?)】(?:状态)?[：:]/` | `name` | `buildStateRegistry` (state definitions) |
| 29 | `state_ref` | `/(?:获得\|添加\|进入\|施加).*?【(.+?)】/` | `name` | `buildStateRegistry` (state references) |
| 30 | `per_hit` | `/每段攻击/` | — | (modifier) |
| 31 | `duration` | `/持续(?:存在)?(\w+(?:\.\w+)?)秒/` | `value` | (modifier) |
| 32 | `max_stacks` | `/(各自)?最多叠加(\w+)层/` | `qualifier`, `value` | (modifier) |
| 33 | `chance` | `/(?:各?有)?(\w+)%(?:的)?概率/` | `value` | (modifier) |
| 34 | `on_attacked` | `/受到(?:伤害\|攻击)时/` | — | (modifier) |
| 35 | `undispellable` | `/(?:无法被驱散\|不可驱散)/` | — | (modifier) |
| 36 | `permanent` | `/战斗状态内永久生效/` | — | (modifier) |
| 37 | `per_tick` | `/每(\d+(?:\.\d+)?)秒/` | `interval` | (modifier) |
| 38 | `per_hit_stack` | `/每段攻击.*?添加.*?层/` | — | (modifier) |

#### Healing / Shield patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 39 | `self_heal` | `/(?:为自身)?恢复(?:共)?(\w+)%(?:的)?(?:最大)?气血值/` | `value` | `extractSelfHeal` |
| 40 | `per_tick_heal` | `/每秒恢复(?:自身)?(?:和友方)?(\w+)%(?:的)?(?:最大)?气血值/` | `per_tick`, `total` | `extractPerTickHeal` |
| 41 | `heal_echo_damage` | `/附加(?:临摹)?期间(?:所)?恢复气血值的等额伤害/` | — | `extractHealEchoDamage` |
| 42 | `shield` | `/(?:添加\|获得)(?:自身)?(\w+)%最大气血值的护盾/` | `value` | `extractShield` |
| 43 | `lifesteal` | `/(?:恢复.*?(?:造成(?:的)?)?(?:伤害\|本次伤害)(\w+)%(?:的)?气血值\|获得(\w+)%(?:的)?吸血效果)/` | `value` | `extractLifesteal` |
| 44 | `shield_destroy` | `/湮灭(?:敌方)?(\w+)个护盾/` | `count` | (part of shield_destroy patterns) |

#### Debuff patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 45 | `debuff_final_dr` | `/降低(\w+)%(?:的)?最终伤害减免/` | `value` | `extractDebuff` (final DR variant) |
| 46 | `debuff_skill_dmg` | `/使敌方的?神通伤害降低(\w+)%/` | `value` | `extractDebuff` (skill dmg variant) |
| 47 | `debuff_attack` | `/攻击力降低(\w+)%/` | `value` | `extractDebuff` (attack variant) |
| 48 | `heal_reduction` | `/治疗量降低(\w+)%/` | `value` | `extractHealReductionDebuff` |

#### Complex skill patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 49 | `summon` | `/持续(?:存在)?(\w+)秒的分身[，,]继承自身(\w+)%的属性/` | `duration`, `inherit` | `extractSummon` |
| 50 | `self_damage_taken_increase` | `/(?:释放后)?(?:自身)?(\d+)秒内受到(?:的)?伤害(?:提[升高])(\w+)%/` | `duration`, `value` | `extractSelfDamageTakenIncrease` |
| 51 | `periodic_escalation` | `/每造成(\d+)次伤害时[，,].*?伤害提升(\w+)倍[，,].*?至多.*?加成(\d+)次/` | `every_n`, `multiplier`, `max` | `extractPeriodicEscalation` |
| 52 | `buff_steal` | `/偷取目标(\w+)个增益状态/` | `count` | `extractBuffSteal` |
| 53 | `per_debuff_stack_damage` | `/每(?:具有)?(?:一个)?减益状态(?:效果)?[，,].*?伤害(?:提升\|增加)(\w+)%[，,]最多计算(\d+)个/` | `value`, `max` | `extractPerDebuffStackDamage` |
| 54 | `counter_debuff` | `/受到(?:伤害\|攻击)时[，,]各有(\d+)%概率对攻击方添加.*?层【(.+?)】/` | `chance`, `name` | `extractCounterDebuff` |
| 55 | `counter_buff_heal` | `/受到伤害时[，,](?:自身)?恢复该次伤害(?:损失气血值的)?(\w+)%的?气血值/` | `value` | `extractCounterBuff` (heal variant) |
| 56 | `counter_buff_reflect` | `/(?:每秒)?对目标.*?反射.*?自身所?受到(?:的)?伤害(?:值)?的(\w+)%与自身(\w+)%已损(?:失)?气血值的伤害/` | `reflect_dmg`, `reflect_hp` | `extractCounterBuff` (reflect variant) |
| 57 | `untargetable` | `/(\d+)秒内不可被选中/` | `duration` | `extractUntargetable` |
| 58 | `self_cleanse` | `/驱散自身(\w+)个负面状态/` | `count` | `extractSelfCleanse` |
| 59 | `delayed_burst` | `/【(.+?)】[，,]持续(\d+)秒.*?伤害增加(\d+)%.*?造成(\d+)%.*?伤害\+(\d+)%攻击力的伤害/` | `name`, `dur`, `increase`, `accum`, `base` | `extractDelayedBurst` |
| 60 | `conditional_damage_cleanse` | `/若净化.*?每段攻击附加(\w+)%自身最大气血值的伤害/` | `value` | `extractConditionalDamageFromCleanse` |
| 61 | `skill_cooldown` | `/下一个未释放的神通进入(\d+)秒冷却/` | `duration` | `extractSkillCooldownDebuff` |
| 62 | `next_skill_carry` | `/接下来(?:神通的)?(\d+)段攻击[，,]每段攻击附加(?:自身)?(\w+)%已损(?:失)?气血值的伤害/` | `hits`, `value` | `extractNextSkillCarry` |
| 63 | `per_enemy_lost_hp` | `/敌方(?:(?:当前)?气血值)?每(?:多)?损失(\w+)%(?:最大(?:值)?气血值)?.*?伤害(?:提升\|增加)(\w+)%/` | `per_percent`, `value` | `extractPerEnemyLostHp` |
| 64 | `self_equal_heal` | `/等额恢复自身气血/` | — | (part of `extractSelfLostHpDamage`) |
| 65 | `cross_skill_accumulation` | `/此前.*?每被神通.*?攻击命中/` | — | (part of `extractPercentCurrentHpDamage`) |

#### Affix-specific patterns

| # | term | regex | captures | replaces |
|:--|:-----|:------|:---------|:---------|
| 66 | `ignore_damage_reduction` | `/无视敌方所有伤害减免效果/` | — | `extractIgnoreDamageReduction` |
| 67 | `per_self_lost_hp` | `/每多损失1%最大气血值.*?伤害提升(\w+)%/` | `value` | `extractPerSelfLostHp` |
| 68 | `per_debuff_true_damage` | `/每有1层.*?减益.*?状态.*?造成(?:目标)?(\w+)%最大气血值.*?真实伤害.*?最多(?:造成)?(\w+)%/` | `per_stack`, `max` | `extractPerDebuffStackTrueDamage` |
| 69 | `dot_extra_per_tick` | `/持续伤害触发时.*?额外造成(?:目标)?(\w+)%已损(?:失)?气血/` | `value` | `extractDotExtraPerTick` |
| 70 | `dot_damage_increase` | `/持续伤害(?:上升\|提升)(\w+)%/` | `value` | `extractDotDamageIncrease` |
| 71 | `dot_frequency_increase` | `/持续伤害.*?触发间隙缩短(\w+)%/` | `value` | `extractDotFrequencyIncrease` |
| 72 | `conditional_damage_controlled` | `/(?:敌方)?处于.*?控制(?:状态\|效果).*?伤害提升(\w+)%/` | `value` | `extractConditionalDamageAffix` |
| 73 | `conditional_damage_debuff` | `/(?:攻击)?带有.*?减益.*?状态.*?伤害提升(\w+)%/` | `value` | `extractConditionalDamageAffix` |
| 74 | `damage_increase_affix` | `/(?:神通)?(?:造成的)?伤害提升(\w+)%/` | `value` | `extractDamageIncrease` |
| 75 | `self_damage_during_cast` | `/施放期间自身受到的伤害.*?提升(\w+)%/` | `value` | `extractSelfDamageTakenDuringCast` |
| 76 | `all_state_duration` | `/所有状态.*?持续时间延长(\w+)%/` | `value` | `extractAllStateDuration` |
| 77 | `buff_duration` | `/增益.*?(?:状态)?持续时间延长(\w+)%/` | `value` | `extractBuffDuration` |
| 78 | `buff_strength` | `/增益.*?效果强度提升(\w+)%/` | `value` | `extractBuffStrength` |
| 79 | `buff_stack_increase` | `/增益.*?状态层数增加(\w+)%/` | `value` | `extractBuffStackIncrease` |
| 80 | `debuff_stack_increase` | `/减益.*?状态层数增加(\w+)%/` | `value` | `extractDebuffStackIncrease` |
| 81 | `next_skill_buff` | `/下一个施放的神通(?:释放时)?额外获得(\w+)%.*?神通伤害加深/` | `value` | `extractNextSkillBuff` |
| 82 | `skill_damage_increase` | `/提升(\w+)%.*?神通伤害(?!加深\|减免)/` | `value` | `extractSkillDamageIncrease` |
| 83 | `enemy_skill_dmg_reduction` | `/目标对本神通提升(\w+)%.*?神通伤害减免/` | `value` | `extractEnemySkillDamageReduction` |
| 84 | `on_shield_expire` | `/护盾.*?消失时.*?造成护盾值(\w+)%的伤害/` | `value` | `extractOnShieldExpire` |
| 85 | `on_buff_debuff_shield` | `/每次施加.*?(?:增益\|减益).*?(?:护盾).*?造成.*?(\w+)%.*?灵法伤害/` | `value` | `extractOnBuffDebuffShieldTrigger` |
| 86 | `probability_multiplier` | `/(\w+)%概率提升4倍.*?(\w+)%概率提升3倍.*?(\w+)%概率提升2倍/` | `c4x`, `c3x`, `c2x` | `extractProbabilityMultiplier` |
| 87 | `enlightenment_bonus` | `/悟境等级加(\d+)/` | `value` | `extractEnlightenmentBonus` |
| 88 | `debuff_stack_chance` | `/有(\w+)%概率额外多附加1层/` | `value` | `extractDebuffStackChance` |
| 89 | `on_dispel` | `/若被驱散.*?受到(\w+)%攻击力的伤害/` | `damage` | `extractOnDispel` |
| 90 | `periodic_dispel_with_damage` | `/每秒.*?驱散.*?(\d+)个.*?增益.*?持续(\d+)秒.*?造成.*?(\w+)%.*?灵法伤害/` | `count`, `duration`, `damage` | `extractPeriodicDispelWithDamage` |
| 91 | `per_buff_stack_damage` | `/每(\d+)层增益状态.*?提升(\w+)%伤害.*?最大.*?(\w+)%/` | `per_n`, `value`, `max` | `extractPerBuffStackDamage` |
| 92 | `per_debuff_stack_damage_affix` | `/每(?:有)?(\d+)层减益状态.*?伤害提升(\w+)%.*?最大.*?(\w+)%/` | `per_n`, `value`, `max` | `extractPerDebuffStackDamageAffix` |
| 93 | `per_hit_escalation` | `/(?:每段攻击.*?下一段提升(\w+)%神通加成\|每造成1段伤害.*?剩余.*?伤害提升(\w+)%.*?最多提升(\w+)%)/` | `value`, `max` | `extractPerHitEscalation` |
| 94 | `lifesteal_with_parent` | `/恢复【(.+?)】造成(?:的)?伤害(\w+)%(?:的)?气血值/` | `parent`, `value` | `extractLifestealWithParent` |
| 95 | `shield_strength` | `/护盾提升至(?:自身)?(\w+)%最大气血值/` | `value` | `extractShieldStrength` |
| 96 | `self_buff_extra` | `/【(.+?)】(?:状态)?(?:额外\|下)?(?:使自身获得\|提升(?:自身)?)/` | `buff_name` | `extractSelfBuffExtra` |
| 97 | `summon_buff` | `/分身受到(?:的)?伤害降低至(?:自身的)?(\w+)%[，,]\s*造成的伤害增加(\w+)%/` | `dr`, `dmg` | `extractSummonBuff` |
| 98 | `extended_dot` | `/额外持续(?:存在)?(\w+)秒[，,]每(\w+(?:\.\w+)?)秒造成一次伤害/` | `extra_sec`, `interval` | `extractExtendedDot` |
| 99 | `shield_destroy_dot` | `/【(.+?)】每(\w+(?:\.\w+)?)秒对目标造成.*?湮灭护盾.*?(\d+)%攻击力的伤害/` | `parent`, `interval`, `damage` | `extractShieldDestroyDot` |
| 100 | `per_stolen_buff_debuff` | `/每偷取.*?增益状态.*?附加.*?层【(.+?)】.*?攻击力降低(\w+)%[，,]持续(\w+)秒/` | `name`, `value`, `duration` | `extractPerStolenBuffDebuff` |
| 101 | `attack_bonus_per_debuff` | `/减益状态.*?(?:最高)?层数.*?攻击力.*?每层.*?(\w+)%.*?最多.*?(\d+)层/` | `value`, `max` | `extractAttackBonusPerDebuff` |
| 102 | `percent_max_hp_affix` | `/叠加.*?层.*?造成(?:目标)?(\w+)%最大气血值(?:的)?伤害/` | `value` | `extractPercentMaxHpDamageAffix` |
| 103 | `self_buff_extend` | `/延长(\w+)秒【(.+?)】持续时间/` | `value`, `buff_name` | `extractSelfBuffExtend` |
| 104 | `periodic_cleanse` | `/(?:每秒有)?(\w+)%概率驱散自身.*?(?:控制状态\|负面状态)[，,](\d+)秒内最多触发(\d+)次/` | `chance`, `cooldown`, `max` | `extractPeriodicCleanse` |
| 105 | `delayed_burst_increase` | `/【(.+?)】状态结束时的伤害提升(\d+)%/` | `parent`, `value` | `extractDelayedBurstIncrease` |
| 106 | `self_lost_hp_every_n` | `/每造成(\d+)次伤害[，,]额外.*?(\w+)%自身已损(?:失)?气血值/` | `every_n`, `value` | `extractSelfLostHpDamageEveryN` |
| 107 | `periodic_dispel_affix` | `/(?:造成伤害前)?(?:优先)?驱散目标([\w一二两三四五六七八九十]+)个增益/` | `count` | `extractPeriodicDispelAffix` |
| 108 | `self_hp_floor` | `/气血不会降至(\w+)%以下/` | `value` | `extractSelfHpFloor` |
| 109 | `dot_permanent_max_hp` | `/处于【(.+?)】下[，,]每秒受到(\w+)%最大气血值的伤害/` | `parent`, `value` | `extractDotPermanentMaxHp` |
| 110 | `per_debuff_damage_upgrade` | `/【(.+?)】.*?伤害.*?上限(?:提升至\|增加至)(\w+)%/` | `parent`, `value` | `extractPerDebuffStackDamageUpgrade` |
| 111 | `counter_debuff_upgrade` | `/【(.+?)】状态下.*?概率提升至(\d+)%/` | `parent`, `value` | `extractCounterDebuffUpgrade` |
| 112 | `cross_slot_debuff` | `/受到攻击时[，,].*?附加【(.+?)】[：:].*?(?:最终伤害减免)?(?:减低\|降低)(\w+)%[，,]持续(\w+)秒/` | `name`, `value`, `duration` | `extractCrossSlotDebuff` |
| 113 | `dot_per_n_stacks` | `/每获得.*?([\d一二两三四五])个【(.+?)】.*?附加.*?持续(\w+)秒的【(.+?)】.*?每秒造成(?:目标)?(\w+)%已损(?:失)?气血值/` | `n`, `parent`, `duration`, `name`, `value` | `extractDotPerNStacks` |
| 114 | `debuff_strength` | `/减益.*?效果强度提升(\w+)%/` | `value` | `extractDebuffStrength` |
| 115 | `damage_reduction_during_cast` | `/施放期间提升自身(\w+)%(?:的)?伤害减免/` | `value` | `extractDamageReductionDuringCast` |
| 116 | `execute_conditional` | `/敌方气血值低于(\d+)%.*?伤害提升(\w+)%/` | `threshold`, `value` | `extractExecuteConditional` |
| 117 | `random_buff` | `/任意1个加成[：:].*?攻击提升(\w+)%/` | `value` | `extractRandomBuff` |
| 118 | `random_debuff` | `/任意1个.*?减益.*?效果[：:].*?攻击降低(\w+)%.*?暴击率降低(\w+)%/` | `attack`, `crit` | `extractRandomDebuff` |
| 119 | `guaranteed_resonance` | `/必定.*?会心.*?造成(\w+)倍伤害/` | `multiplier` | `extractGuaranteedResonance` |
| 120 | `triple_bonus` | `/提升(\w+)%攻击力的效果.*?(\w+)%的伤害.*?(\w+)%的暴击伤害/` | `atk`, `dmg`, `crit` | `extractTripleBonus` |
| 121 | `attack_bonus_affix` | `/提升(\w+)%攻击力的效果/` | `value` | `extractAttackBonusAffix` |
| 122 | `probability_to_certain` | `/概率触发.*?效果提升为必定触发/` | — | `extractProbabilityToCertain` |
| 123 | `min_lost_hp_threshold` | `/已损(?:气血值)?.*?至少按已损(\w+)%计算/` | `value` | `extractMinLostHpThreshold` |
| 124 | `hp_cost_avoid_chance` | `/(\w+)%(?:的)?概率不消耗气血值/` | `value` | `extractHpCostAvoidChance` |
| 125 | `shield_on_heal` | `/恢复气血时.*?添加.*?(\w+)%(?:自身)?最大气血值的护盾/` | `value` | `extractShieldOnHeal` |
| 126 | `healing_increase` | `/治疗效果提升(\w+)%/` | `value` | `extractHealingIncrease` |
| 127 | `healing_to_damage` | `/造成治疗效果时.*?额外造成治疗量(\w+)%的伤害/` | `value` | `extractHealingToDamage` |
| 128 | `damage_to_shield` | `/造成伤害后.*?获得.*?伤害值的(\w+)%(?:的)?护盾.*?持续(\d+)秒/` | `value`, `duration` | `extractDamageToShield` |
| 129 | `shield_value_increase` | `/护盾值提升(\w+)%/` | `value` | `extractShieldValueIncrease` |
| 130 | `conditional_damage_hp` | `/(?:自身\|敌方).*?(?:每\|低于\|高于).*?伤害.*?(\w+)%/` | `value` | `extractConditionalDamage` (partial) |

**Total: ~130 pattern entries** (more than the design doc's ~40 estimate because many extractors contain multiple regex variants that decompose into separate entries).

### §4.3 Scan Algorithm

```typescript
export function scan(text: string): TokenEvent[] {
  // Sort patterns by regex source length descending (longest match first)
  const sorted = [...READER_PATTERNS].sort(
    (a, b) => b.regex.source.length - a.regex.source.length
  );

  const tokens: TokenEvent[] = [];
  const consumed = new Set<number>(); // consumed character positions

  for (const pattern of sorted) {
    const re = new RegExp(pattern.regex, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      // Skip if any character in this match range is already consumed
      const start = match.index;
      const end = start + match[0].length;
      let overlap = false;
      for (let i = start; i < end; i++) {
        if (consumed.has(i)) { overlap = true; break; }
      }
      if (overlap) continue;

      // Mark range as consumed
      for (let i = start; i < end; i++) consumed.add(i);

      // Build captures
      const captures: Record<string, string> = {};
      for (let i = 0; i < pattern.captureNames.length; i++) {
        if (match[i + 1] !== undefined) {
          captures[pattern.captureNames[i]] = match[i + 1];
        }
      }

      tokens.push({
        term: pattern.term,
        raw: match[0],
        captures,
        position: start,
      });
    }
  }

  // Sort by position (left-to-right in source text)
  tokens.sort((a, b) => a.position - b.position);
  return tokens;
}
```

---

## §5 Stage 2: Context Listener — Grouping Rules

### §5.1 Token Classification

Tokens are classified by role:

| Role | Terms |
|:-----|:------|
| **Primary** | `base_attack`, `hp_cost`, `hp_cost_dot`, `percent_max_hp_damage`, `percent_current_hp_damage`, `self_lost_hp_damage`, `self_lost_hp_damage_dot`, `shield_destroy_damage`, `shield`, `self_heal`, `per_tick_heal`, `summon`, `debuff_*`, `counter_debuff`, `counter_buff_*`, `delayed_burst`, `echo_damage`, `dot_*`, `lifesteal*`, `self_buff_extra`, `self_buff_extend`, all affix-specific terms |
| **Modifier** | `per_hit`, `per_tick`, `duration`, `max_stacks`, `chance`, `on_attacked`, `undispellable`, `permanent`, `per_hit_stack`, `cap_vs_monster`, `self_equal_heal`, `cross_skill_accumulation`, `no_shield_double_damage` |
| **Structure** | `named_state`, `state_ref` |
| **Stat** | `attack_bonus`, `damage_increase`, `skill_dmg_increase`, `damage_reduction`, `final_dmg_bonus`, `crit_rate`, `crit_dmg_bonus`, `healing_bonus`, `defense_bonus`, `hp_bonus` |

### §5.2 Grouping Algorithm

```typescript
export function group(tokens: TokenEvent[], sourceType: "skill" | "affix"): GroupEvent[] {
  const groups: GroupEvent[] = [];
  let currentState: string | undefined;  // current 【name】：scope
  let stateStack: string[] = [];         // for nested states

  // Pass 1: Identify state scopes
  // Tokens between 【name】：and the next 【name】：or EOF belong to that state's scope

  // Pass 2: Attach modifiers to nearest preceding primary
  // Modifier tokens attach to the most recent primary token (by position)

  // Pass 3: Group stat tokens under their enclosing state_ref or named_state
  // Multiple stat tokens within the same state definition form a single buff group

  return groups;
}
```

### §5.3 Grouping Rules (detailed)

**Rule 1 — Named state scoping:**
When a `named_state` token is encountered (`【name】：`), all subsequent tokens until the next `named_state` or end-of-line belong to that state's scope. The context listener tracks `currentState` and assigns `parentState` to each group.

**Rule 2 — Modifier attachment:**
Modifier tokens (`per_hit`, `duration`, `max_stacks`, `chance`, `on_attacked`, `undispellable`, `permanent`, `per_hit_stack`, `cap_vs_monster`) attach to the **nearest preceding primary token** by text position. If no primary token precedes the modifier, it's an orphan → emit DIAGNOSTIC and skip.

**Rule 3 — Stat aggregation:**
When multiple stat tokens (`attack_bonus`, `damage_reduction`, etc.) appear within the same state definition scope, they form a single `self_buff` group. The primary is the `state_ref` token, and the stats are modifiers.

**Rule 4 — Qualifier propagation:**
When `max_stacks` has `qualifier: "各自"`, the stack limit applies to child states (within `named_state` scopes), not the parent. The context listener marks the group with `target: "children"`.

**Rule 5 — Affix prefix stripping:**
For `sourceType: "affix"`, the first `named_state` token is the affix name — not a state definition. Skip it and use the remaining tokens for grouping.

---

## §6 Stage 3: Handler Registry

### §6.1 Handler Dispatch

```typescript
const HANDLER_MAP = new Map<string, GroupHandler>();

function registerHandler(handler: GroupHandler) {
  const terms = Array.isArray(handler.handles) ? handler.handles : [handler.handles];
  for (const term of terms) {
    HANDLER_MAP.set(term, handler);
  }
}

export function parse(
  groups: GroupEvent[],
  ctx: HandlerContext,
): { effects: EffectRow[]; diagnostics: DiagnosticEvent[] } {
  const effects: EffectRow[] = [];
  const diagnostics: DiagnosticEvent[] = [];

  for (const group of groups) {
    const handler = HANDLER_MAP.get(group.primary.term);
    if (!handler) {
      diagnostics.push({
        level: "warn",
        message: `No handler for term: ${group.primary.term}`,
        term: group.primary.term,
        position: group.primary.position,
      });
      continue;
    }

    const result = handler.parse(group, ctx);
    if (result === null) continue;
    if (Array.isArray(result)) {
      effects.push(...result);
    } else {
      effects.push(result);
    }
  }

  return { effects, diagnostics };
}
```

### §6.2 Handler Examples

```typescript
// HP cost: base + per_hit modifier
registerHandler({
  handles: "hp_cost",
  parse: (group) => {
    const fields: Record<string, unknown> = {
      value: group.primary.captures.value,
    };
    if (group.modifiers.some(m => m.term === "per_hit")) {
      fields.per_hit = true;
    }
    return { type: "self_hp_cost", ...fields } as EffectRow;
  },
});

// Base attack: combine hits_count + base_attack tokens
registerHandler({
  handles: "base_attack",
  parse: (group, ctx) => {
    const hitsGroup = ctx.allGroups.find(g => g.primary.term === "hits_count");
    const hits = hitsGroup
      ? parseCnNumber(hitsGroup.primary.captures.hits_cn)
      : 1;
    return {
      type: "base_attack",
      hits,
      total: group.primary.captures.total,
    } as EffectRow;
  },
});
```

---

## §7 Book-Specific Overrides

Two books require special handling outside the generic pipeline:

### §7.1 天魔降临咒

Emits a 6-effect cycling compound pattern. Cannot be expressed through the generic pipeline because the cycling stat reductions are implicit in the source text.

```typescript
const BOOK_OVERRIDES: Record<string, (text: string, tiers: TierSpec[]) => EffectRow[]> = {
  天魔降临咒: (text, tiers) => {
    // ... existing parseTianMoJiangLin logic
  },
  惊蜇化龙: (text, tiers) => {
    // ... existing parseJingZheHuaLong logic (variable collision x=1500)
  },
};
```

These bypass the pipeline entirely — `runReactivePipeline()` checks for overrides first.

---

## §8 Post-Processing (unchanged)

After Stage 3 produces `EffectRow[]` with variable references:

1. **Tier resolution** — `resolveFields(effect.fields, tier.vars)` from `tiers.ts`
2. **Data state** — `buildDataState(tier)` from `tiers.ts`
3. **Base tier synthesis** — `ensureBaseTier()` (moved from `split.ts` to `pipeline.ts`)

This logic is identical to the current system. No changes needed.

---

## §9 Pipeline Integration

### §9.1 pipeline.ts (rewrite)

```typescript
export function runPipeline(
  sourceType: SourceType,
  text: string,
  bookName?: string,
): PipelineResult {
  // 1. Check book-specific overrides
  if (bookName && BOOK_OVERRIDES[bookName]) {
    return runBookOverride(bookName, text);
  }

  // 2. Pre-process
  const cell = splitCell(text.replace(/\n/g, "<br>"));
  const cleanText = sourceType === "affix"
    ? cell.description.join("，").replace(/^【.+?】[：:]/, "")
    : cell.description.join("，");

  // 3. Run XState pipeline
  const result = runReactivePipeline(cleanText, sourceType, bookName);

  // 4. Post-process: tier resolution
  const effects = expandTiers(result.effects, cell.tiers);

  return {
    tokens: result.tokens,
    groups: result.groups,
    effects,
    tiers: cell.tiers,
    states: buildStatesFromGroups(result.groups), // derive StateRegistry from groups
    errors: result.diagnostics.filter(d => d.level === "warn").map(d => d.message),
  };
}
```

### §9.2 index.ts (minimal changes)

Replace `parseBook()` call with `runPipeline()`. The output format (`ParsedBook`) stays the same.

---

## §10 Test Strategy

### §10.1 Test Map

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

### §10.2 Dual-Run Migration Test (T12, T13)

Runs both old (imperative) and new (reactive) pipelines on identical input and asserts identical `EffectRow[]` output. This is the ultimate regression gate — if it passes, the migration is safe.

```typescript
describe("reactive pipeline parity — skills", () => {
  const entries = readMainSkillTables(markdown);

  for (const entry of entries) {
    it(`${entry.name}: reactive output matches imperative`, () => {
      const meta = BOOK_TABLE[entry.name];
      const skillCell = splitCell(entry.skillText);
      const affixCell = splitCell(entry.affixText);
      const imperative = parseBook(entry.name, entry.school, meta.grammar, skillCell, affixCell);

      const reactive = runPipeline("skill", entry.skillText, entry.name);
      expect(reactive.effects).toEqual(imperative.skill);
    });
  }
});

describe("reactive pipeline parity — exclusive affixes", () => {
  const exclusiveEntries = readExclusiveAffixTable(exclusiveMarkdown);

  for (const entry of exclusiveEntries) {
    it(`${entry.bookName} exclusive: reactive matches imperative`, () => {
      const states = buildStateRegistry(splitCell(/* skill text */).description);
      const imperative = parseExclusiveAffix(entry, states);

      const reactive = runPipeline("affix", entry.rawText, entry.bookName);
      expect(reactive.effects).toEqual(imperative.effects);
    });
  }
});
```

### §10.3 Reader Unit Tests (T1–T3)

```typescript
describe("reader.scan", () => {
  // T1: Known text fragments
  it("recognizes base_attack pattern", () => {
    const tokens = scan("造成六段共计x%攻击力的灵法伤害");
    expect(tokens).toContainEqual(
      expect.objectContaining({ term: "base_attack", captures: { total: "x" } })
    );
    expect(tokens).toContainEqual(
      expect.objectContaining({ term: "hits_count", captures: { hits_cn: "六" } })
    );
  });

  it("recognizes hp_cost without per_hit", () => {
    const tokens = scan("消耗自身y%当前气血值");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].term).toBe("hp_cost");
  });

  it("recognizes hp_cost with per_hit as separate tokens", () => {
    const tokens = scan("每段攻击会消耗自身z%当前气血值");
    const terms = tokens.map(t => t.term);
    expect(terms).toContain("per_hit");
    expect(terms).toContain("hp_cost");
  });

  it("recognizes 神通伤害加深 separately from 伤害加深", () => {
    const tokens1 = scan("提升20%的神通伤害加深");
    expect(tokens1[0].term).toBe("skill_dmg_increase");

    const tokens2 = scan("提升20%的伤害加深");
    expect(tokens2[0].term).toBe("damage_increase");
  });

  it("recognizes dot with current HP", () => {
    const tokens = scan("每0.5秒额外造成目标y%当前气血值的伤害");
    expect(tokens).toContainEqual(
      expect.objectContaining({
        term: "dot_current_hp",
        captures: { interval: "0.5", value: "y" },
      })
    );
  });

  // T2: Empty input
  it("returns empty array for empty text", () => {
    expect(scan("")).toEqual([]);
  });

  it("returns empty array for text with no matches", () => {
    expect(scan("这是一段没有匹配的文本")).toEqual([]);
  });

  // T3: Overlapping terms — longest match wins
  it("longest match wins for overlapping patterns", () => {
    // "神通伤害加深" should match as skill_dmg_increase, NOT as damage_increase
    const tokens = scan("10%的神通伤害加深");
    expect(tokens.some(t => t.term === "skill_dmg_increase")).toBe(true);
    expect(tokens.some(t => t.term === "damage_increase")).toBe(false);
  });
});
```

### §10.4 Context Listener Unit Tests (T4–T9)

```typescript
describe("context.group", () => {
  // T4: Modifier attachment
  it("attaches per_hit to nearest preceding primary", () => {
    const tokens: TokenEvent[] = [
      { term: "hp_cost", raw: "消耗自身z%当前气血值", captures: { value: "z" }, position: 10 },
      { term: "per_hit", raw: "每段攻击", captures: {}, position: 0 },
    ];
    // per_hit at position 0 precedes hp_cost at position 10
    // Modifier attachment: per_hit attaches to the NEXT primary (hp_cost)
    // Actually: modifier attaches to nearest primary by adjacency
    const groups = group(tokens, "skill");
    const hpGroup = groups.find(g => g.primary.term === "hp_cost");
    expect(hpGroup?.modifiers.some(m => m.term === "per_hit")).toBe(true);
  });

  // T5: Named state scoping
  it("assigns parentState from named_state scope", () => {
    const tokens: TokenEvent[] = [
      { term: "named_state", raw: "【噬心之咒】：", captures: { name: "噬心之咒" }, position: 0 },
      { term: "dot_current_hp", raw: "y%当前气血值的伤害", captures: { interval: "0.5", value: "y" }, position: 20 },
      { term: "duration", raw: "持续4秒", captures: { value: "4" }, position: 40 },
    ];
    const groups = group(tokens, "skill");
    const dotGroup = groups.find(g => g.primary.term === "dot_current_hp");
    expect(dotGroup?.parentState).toBe("噬心之咒");
    expect(dotGroup?.modifiers.some(m => m.term === "duration")).toBe(true);
  });

  // T6: Nested states (大罗幻诀 pattern)
  it("handles parent-child state nesting", () => {
    const tokens: TokenEvent[] = [
      { term: "named_state", raw: "【罗天魔咒】：", captures: { name: "罗天魔咒" }, position: 0 },
      { term: "on_attacked", raw: "受到伤害时", captures: {}, position: 20 },
      { term: "named_state", raw: "【噬心之咒】：", captures: { name: "噬心之咒" }, position: 40 },
      { term: "dot_current_hp", raw: "y%当前", captures: { interval: "0.5", value: "y" }, position: 60 },
      { term: "named_state", raw: "【断魂之咒】：", captures: { name: "断魂之咒" }, position: 80 },
      { term: "dot_lost_hp", raw: "y%已损", captures: { interval: "0.5", value: "y" }, position: 100 },
    ];
    const groups = group(tokens, "skill");
    const dot1 = groups.find(g => g.primary.term === "dot_current_hp");
    const dot2 = groups.find(g => g.primary.term === "dot_lost_hp");
    expect(dot1?.parentState).toBe("噬心之咒");
    expect(dot2?.parentState).toBe("断魂之咒");
  });

  // T7: 各自 qualifier
  it("propagates 各自 qualifier to children target", () => {
    const tokens: TokenEvent[] = [
      { term: "max_stacks", raw: "各自最多叠加5层", captures: { qualifier: "各自", value: "5" }, position: 0 },
    ];
    const groups = group(tokens, "skill");
    const stackGroup = groups.find(g => g.primary.term === "max_stacks");
    expect(stackGroup?.primary.captures.qualifier).toBe("各自");
  });

  // T8: Orphaned modifier
  it("skips orphaned modifier and emits diagnostic", () => {
    const tokens: TokenEvent[] = [
      { term: "per_hit", raw: "每段攻击", captures: {}, position: 0 },
      // No primary follows
    ];
    const groups = group(tokens, "skill");
    expect(groups).toHaveLength(0); // orphan skipped
  });

  // T9: Multiple per_hit tokens — 九重天凤诀 pattern
  it("attaches each per_hit to its nearest primary", () => {
    const tokens: TokenEvent[] = [
      { term: "base_attack", raw: "x%攻击力", captures: { total: "x" }, position: 0 },
      { term: "self_lost_hp_damage", raw: "y%已损", captures: { value: "y" }, position: 20 },
      { term: "per_hit", raw: "每段攻击", captures: {}, position: 15 },
      { term: "hp_cost", raw: "消耗z%", captures: { value: "z" }, position: 40 },
      { term: "per_hit", raw: "每段攻击", captures: {}, position: 35 },
    ];
    const groups = group(tokens, "skill");
    const lostHp = groups.find(g => g.primary.term === "self_lost_hp_damage");
    const hpCost = groups.find(g => g.primary.term === "hp_cost");
    expect(lostHp?.modifiers.some(m => m.term === "per_hit")).toBe(true);
    expect(hpCost?.modifiers.some(m => m.term === "per_hit")).toBe(true);
  });
});
```

### §10.5 Handler Unit Tests (T10–T11)

```typescript
describe("handlers.parse", () => {
  // T10: Handler produces correct EffectRow
  it("hp_cost handler: base case", () => {
    const groups: GroupEvent[] = [{
      primary: { term: "hp_cost", raw: "", captures: { value: "y" }, position: 0 },
      modifiers: [],
      scope: "skill",
    }];
    const { effects } = parse(groups, { allGroups: groups });
    expect(effects[0]).toEqual({ type: "self_hp_cost", value: "y" });
  });

  it("hp_cost handler: with per_hit modifier", () => {
    const groups: GroupEvent[] = [{
      primary: { term: "hp_cost", raw: "", captures: { value: "z" }, position: 10 },
      modifiers: [
        { term: "per_hit", raw: "每段攻击", captures: {}, position: 0 },
      ],
      scope: "skill",
    }];
    const { effects } = parse(groups, { allGroups: groups });
    expect(effects[0]).toEqual({ type: "self_hp_cost", value: "z", per_hit: true });
  });

  it("dot handler: current HP variant with duration", () => {
    const groups: GroupEvent[] = [{
      primary: { term: "dot_current_hp", raw: "", captures: { interval: "0.5", value: "y" }, position: 0 },
      modifiers: [
        { term: "duration", raw: "持续4秒", captures: { value: "4" }, position: 20 },
      ],
      parentState: "噬心之咒",
      scope: "state_def",
    }];
    const { effects } = parse(groups, { allGroups: groups });
    expect(effects[0]).toMatchObject({
      type: "dot",
      tick_interval: "0.5",
      percent_current_hp: "y",
      duration: "4",
      name: "噬心之咒",
    });
  });

  // T11: Unknown primary → diagnostic
  it("unknown primary term emits diagnostic", () => {
    const groups: GroupEvent[] = [{
      primary: { term: "unknown_term", raw: "", captures: {}, position: 0 },
      modifiers: [],
      scope: "skill",
    }];
    const { effects, diagnostics } = parse(groups, { allGroups: groups });
    expect(effects).toHaveLength(0);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].level).toBe("warn");
    expect(diagnostics[0].term).toBe("unknown_term");
  });
});
```

### §10.6 XState Event Emission Test (T14)

```typescript
describe("pipelineMachine events", () => {
  it("emits TOKEN, GROUP, and EFFECT events in sequence", () => {
    const emitted: PipelineEmitted[] = [];
    const actor = createActor(pipelineMachine, {
      input: { text: "消耗自身y%当前气血值", sourceType: "skill" as const },
    });
    actor.on("*", (ev) => emitted.push(ev as PipelineEmitted));
    actor.start();
    actor.send({ type: "PARSE" });
    actor.stop();

    const tokenEvents = emitted.filter(e => e.type === "TOKEN");
    const groupEvents = emitted.filter(e => e.type === "GROUP");
    const effectEvents = emitted.filter(e => e.type === "EFFECT");

    expect(tokenEvents.length).toBeGreaterThan(0);
    expect(groupEvents.length).toBeGreaterThan(0);
    expect(effectEvents.length).toBeGreaterThan(0);
  });
});
```

### §10.7 Regression Baseline

Existing snapshot tests (`books.json`, `affixes.json`) remain unchanged. They test the full pipeline end-to-end and serve as the permanent regression gate after the old parser is deleted.

---

## §11 Migration Checklist

- [ ] Implement `reader.ts` with complete pattern table
- [ ] Implement `context.ts` with 5 grouping rules
- [ ] Implement `handlers.ts` with ~25 handler registrations
- [ ] Implement `reactive.ts` with XState v5 pipeline machine
- [ ] Rewrite `pipeline.ts` to use reactive pipeline
- [ ] Add dual-run migration test in `reactive.test.ts`
- [ ] Run `bun run check` — all 28 books must match
- [ ] Add per-stage unit tests
- [ ] Update `index.ts` to use new pipeline
- [ ] Verify exclusive affixes also produce identical output

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-21 | Initial implementation plan |
