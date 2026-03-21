# Imperative Parser — Problem Analysis

**Date:** 2026-03-21
**Purpose:** Concrete evidence for each failure mode documented in `design.reactive.md` §1.2, verified against the actual codebase and data.

---

## 1. The Deconfliction Tax

The imperative parser in `lib/parser/extract.ts` uses **86 independent extractor functions**, each scanning the full text. To prevent them from producing duplicate or conflicting results, the codebase has accumulated four layers of deconfliction:

| Layer | Mechanism | Count | Lines of code |
|-------|-----------|-------|---------------|
| Negative guards | `.test(text)` early returns | 36 guard lines | ~100 |
| Grammar gates | `grammars: ["G4"]` on extractor defs | 1 gate | — |
| Ordering | `order: 0/1/10/20/21/25/30` tiers | 7 tiers across 86 extractors | — |
| Cross-extractor knowledge | One extractor checks another's pattern | 10+ pairs | ~60 |

These four layers exist solely to prevent the same text from being extracted twice. They are not part of the parsing logic — they are **meta-logic about the parser itself**.

---

## 2. Failure Mode Evidence

### 2.1 Competing Extractors (HP Cost Family)

Three extractors match variations of `消耗...气血值`:

| Extractor | Pattern | Produces |
|-----------|---------|----------|
| `extractSelfHpCost` | `消耗(?:自身)?X%(?:的)?当前气血值` | `self_hp_cost` |
| `extractSelfHpCostPerHit` | `每段攻击(?:会)?消耗自身X%当前气血值` | `self_hp_cost { per_hit: true }` |
| `extractSelfHpCostDot` | `自身每秒损失X%当前气血值` | `self_hp_cost_dot` |

**Real collision — 九重天凤诀:**

```
Text: 每段攻击会消耗自身z%当前气血值
```

Without the guard in `extractSelfHpCost` (`!/每段攻击.*消耗/`), BOTH `extractSelfHpCost` and `extractSelfHpCostPerHit` would fire, producing a duplicate `self_hp_cost` alongside the correct `self_hp_cost { per_hit: true }`.

The same pattern repeats for lost-HP damage:
- `extractSelfLostHpDamage` guards against `extractSelfLostHpDamagePerHit`
- Guard: `!/每段攻击(?:额外)?对目标造成自身\w+%已损/`

**Root cause:** Each extractor scans the full text independently. The "per-hit" modifier `每段攻击` is a structural context cue, but extractors can only see it via negative lookahead on the raw text string. Adding a new HP cost variant (e.g., per-tick) would require updating ALL existing HP cost extractors with new guards.

### 2.2 Grammar Gates

`extractSelfBuffSkillDamageIncrease` is gated to `grammars: ["G4"]`:

```typescript
// SKILL_EXTRACTORS entry
{ name: "self_buff_skill_damage_increase",
  fn: extractSelfBuffSkillDamageIncrease,
  order: 25,
  grammars: ["G4"] }
```

**Problem chain:**
1. The extractor matches `提升自身z%神通伤害加深，持续d秒`
2. Without the G4 gate, it fires on books where this text is inside a `【name】：` state definition — producing a duplicate alongside `extractSelfBuff`
3. With the G4 gate, any non-G4 book with a standalone skill damage increase is missed
4. The grammar system (G2/G3/G4/G5/G6) is itself a deconfliction mechanism — it exists only because extractors can't distinguish structural context

**Evidence — 天煞破虚诀 (G3):** This book has `消耗y%当前气血值` but is grammar G3. The `self_hp_cost` extractor doesn't have a grammar gate (it was removed after a bug), but the _reason_ gates existed at all is that extractors have no structural awareness.

### 2.3 Negative Lookahead Cascade

`extractDamageIncrease` has **8 negative guards** to avoid colliding with specialized variants:

```typescript
function extractDamageIncrease(text: string): ExtractedEffect | null {
    // Guard 1: skip if conditional on control state
    if (/控制(?:状态|效果)/.test(text)) return null;
    // Guard 2: skip if per-debuff-stack
    if (/减益.*?状态.*?伤害提升/.test(text)) return null;
    // Guard 3: skip if per-stack
    if (/每\d+层/.test(text)) return null;
    // Guard 4: skip if enlightenment bonus
    if (/悟境等级加/.test(text)) return null;
    // Guard 5: skip if DoT-related
    if (/持续伤害|已损|气血|伤害加深/.test(text)) return null;
    // Guard 6: skip if delayed burst
    if (/状态结束时的伤害提升/.test(text)) return null;
    // Guard 7: skip if escalation/random/probability
    if (/段数伤害|任意1个加成|概率触发/.test(text)) return null;
    // ... finally, try to match
}
```

Each guard was added in response to a specific bug: `extractDamageIncrease` matching text that belongs to a more specialized extractor. Every future extractor that matches `伤害提升X%` in any context will require yet another guard here.

This is `O(n²)` maintenance: n extractors × n potential collisions.

### 2.4 Ordering Dependencies

SKILL_EXTRACTORS uses 7 ordering tiers:

```
order: 0  — self_hp_cost (must run before per-hit variants)
order: 1  — untargetable
order: 10 — base_attack
order: 20 — all damage variants, shields, debuffs, summons, dots, heals
order: 21 — no_shield_double_damage (must run AFTER shield_destroy_damage)
order: 25 — self_buff, skill_cooldown, conditional_damage_cleanse
order: 30 — per_enemy_lost_hp
```

The ordering is an implicit contract:
- `self_hp_cost` at order 0 must run before `self_hp_cost_per_hit` at order 20, so the negative guard in `self_hp_cost` can prevent double-matching
- `no_shield_double_damage` at order 21 must run after `shield_destroy_damage` at order 20

Reordering any extractor risks breaking extraction for books that depend on the current evaluation sequence. The ordering is not documented — it's encoded in the array position and `order` field.

### 2.5 Context Blindness

`extractSelfBuffStats` maps Chinese stat terms to effect fields:

```typescript
// Pattern 6: 神通伤害加深
const sdi = text.match(/(\w+)%(?:的)?神通伤害加深/);
if (sdi) stats.skill_damage_increase = sdi[1];

// Pattern 7: 伤害加深 (fallback if 神通 not matched)
const di = text.match(/(\w+)%(?:的)?伤害加深/);
if (di && !stats.skill_damage_increase) stats.damage_increase = di[1];
```

**Problem:** `神通伤害加深` contains `伤害加深` as a substring. The fallback pattern 7 must check `!stats.skill_damage_increase` to avoid double-counting. This works only because pattern 6 runs first within the same function — a local ordering dependency.

But across extractors, the same problem exists: `extractSelfBuff` calls `extractSelfBuffStats` internally. If another extractor also tries to parse stat modifiers from the same text, it has no way to know what `extractSelfBuff` already captured.

**Evidence — 惊蜇化龙 (G4):**

```
Text: 提升自身z%神通伤害加深，持续4秒
```

This is parsed by `extractSelfBuffSkillDamageIncrease` (gated to G4), NOT by `extractSelfBuff`. If the grammar gate is removed, both fire. If the grammar is wrong, neither fires correctly. The extractor has no way to ask "is this text already inside a named state?" — it only sees the flat string.

---

## 3. Cross-Extractor Knowledge Graph

Each arrow means "extractor A checks for extractor B's pattern to avoid collision":

```
extractSelfHpCost ──guards against──→ extractSelfHpCostPerHit
extractSelfLostHpDamage ──guards against──→ extractSelfLostHpDamagePerHit
extractDebuff ──guards against──→ extractPerStolenBuffDebuff
extractPercentHpDamage ──guards against──→ extractConditionalDamageFromCleanse
extractLifesteal ──guards against──→ extractLifestealWithParent
extractSelfBuffSkillDmgIncrease ──guards against──→ extractSelfBuff
extractDamageIncrease ──guards against──→ extractConditionalDamageAffix
                      ──guards against──→ extractPerBuffStackDamage
                      ──guards against──→ extractPerDebuffStackDamageAffix
                      ──guards against──→ extractEnlightenmentBonus
                      ──guards against──→ extractDotDamageIncrease
                      ──guards against──→ extractDelayedBurstIncrease
extractBuffDuration ──guards against──→ extractAllStateDuration
extractPerSelfLostHp ──guards against──→ extractPerEnemyLostHp
extractAttackBonusAffix ──guards against──→ extractTripleBonus
extractSelfBuffExtra ──guards against──→ extractPerDebuffStackDamageUpgrade
```

Every edge in this graph is a maintenance liability: changing one extractor can break another. `extractDamageIncrease` has 7 outgoing edges — it must know about 7 other extractors to function correctly.

---

## 4. Why Reactive Event-Sourcing Eliminates These Problems

In the reactive architecture from `design.reactive.md`:

**No competing extractors.** The reader emits one token per Chinese term. `消耗自身z%当前气血值` emits one `hp_cost { value: z }` token. `每段攻击` emits one `per_hit` token. They don't compete because they match different surface text.

**No grammar gates.** The context listener groups tokens by structure. Whether `hp_cost` is standalone or preceded by `per_hit` is determined by token adjacency, not by which grammar type the book belongs to.

**No negative lookaheads.** `extractSelfHpCost` doesn't need to check for `每段攻击` because it never sees `每段攻击` — that's a separate token. The context listener attaches `per_hit` as a modifier to `hp_cost`. The handler just checks `group.modifiers`.

**No ordering dependencies.** Tokens are emitted by position in the text. Groups are formed by structural rules. Handlers are dispatched by primary term. No implicit evaluation order.

**No context blindness.** `伤害加深` and `神通伤害加深` are different reader terms with different tokens. The parser handler for `damage_increase` never sees `skill_dmg_increase` tokens — they're dispatched to different handlers.

The deconfliction graph collapses to zero edges: no extractor knows about any other extractor.

---

## 5. Quantitative Summary

| Metric | Current imperative | Reactive (design target) |
|--------|-------------------|-------------------------|
| Extractor/pattern functions | 86 | ~40 pattern table entries |
| Deconfliction guards | 36 lines | 0 |
| Grammar gates | 1 (was more) | 0 |
| Ordering tiers | 7 | 0 (position-based) |
| Cross-extractor dependencies | 15+ edges | 0 |
| Total parser lines | ~2900 | ~600 |
| Adding a new pattern | Write function + find order + add guards to N existing functions | Add 1 row to pattern table + 1 handler |
