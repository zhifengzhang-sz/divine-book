---
initial date: 2026-03-06
dates of modification: [2026-03-06]
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

# Binding Model

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Formalizes the platform/operator/contract model** — how 9 main skills (platforms) compose with 61 affixes (operators) through typed provides/requires contracts. Bridges the domain analysis cluster (affix taxonomy, graph, paths) to the construction methodology (objectives, functions, scoring).

---

## 1. Mental Model

A 灵書 (Divine Book) is constructed from **three skill books** occupying one main slot and two auxiliary slots. This creates a two-layer compositional system:

- **Platform (Layer 2)** — the main skill book. Defines the foundation: base attributes, skill mechanics, innate effects. There are 9 platforms (one per main skill).
- **Operators (Layer 1)** — the affixes. Each acts on the platform's attributes or on shared variables. There are 61 operators across three categories: 16 universal, 17 school, 28 exclusive.

The platform determines *what variables exist*. Operators *transform* those variables. The binding model specifies the contract between them.

---

## 2. Binding Interface

Each affix has a **Binding** — a typed contract declaring what it produces and what it needs.

```typescript
// lib/domain/types.ts
interface Binding {
  outputs: string[];                    // effect types produced (from effects.yaml)
  provides: TargetCategory[];           // target categories provided (derived from outputs)
  requires: TargetCategory[] | "free";  // target categories needed to function
}
```

| Field | Source | Description |
|:------|:-------|:------------|
| `outputs` | `effects.yaml` | The effect types this affix actually produces — e.g., `["debuff", "conditional_debuff"]` |
| `provides` | Derived | Target categories implied by outputs, via `EFFECT_PROVIDES` mapping — e.g., `[T.Debuff]` |
| `requires` | Hand-curated | What must exist externally for this affix to function — `"free"` if no dependency |

**Key invariant:** `provides` is *never* hand-curated. It is mechanically derived from `outputs` by `deriveProvides()` in `lib/domain/bindings.ts`. This ensures that what an affix claims to provide always matches what it actually outputs.

---

## 3. Target Categories

Ten categories classify what effects provide or need. Defined in `lib/domain/enums.ts`:

| ID | Category | Chinese | Notes |
|:---|:---------|:--------|:------|
| T1 | `damage` | 伤害 | Always free — inherent to any skill |
| T2 | `debuff` | 减益效果 | Harmful state on enemy |
| T3 | `buff` | 增益效果 | Beneficial state on self |
| T4 | `dot` | 持续伤害 | Periodic damage |
| T5 | `shield` | 护盾 | Damage absorption |
| T6 | `healing` | 治疗效果 | HP restoration |
| T7 | `state` | 所有状态 | Superset of T2–T6 |
| T8 | `probability` | 概率触发 | Probability-dependent effects |
| T9 | `lost_hp` | 已损气血 | HP loss as resource |
| T10 | `control` | 控制效果 | Hard control (stun, etc.) |

An affix with `requires: [T.Debuff]` needs *some other* affix (or the platform itself) to provide a debuff for it to function.

---

## 4. EFFECT_PROVIDES Mapping

The mapping from effect types to target categories lives in `lib/domain/bindings.ts`. Only "provider" effect types are listed — types that create something consumable. Pure amplifiers (`attack_bonus`, `damage_increase`) are absent because they don't provide new categories.

| Target Category | Provider Effect Types |
|:----------------|:---------------------|
| T2 Debuff | `debuff`, `conditional_debuff`, `counter_debuff`, `cross_slot_debuff`, `random_debuff` |
| T3 Buff | `self_buff`, `random_buff`, `counter_buff`, `next_skill_buff` |
| T4 DoT | `dot`, `extended_dot`, `shield_destroy_dot` |
| T5 Shield | `damage_to_shield` |
| T6 Healing | `lifesteal`, `conditional_heal_buff` |
| T8 Probability | `probability_multiplier` |
| T9 LostHp | `self_hp_cost`, `self_damage_taken_increase`, `min_lost_hp_threshold` |

---

## 5. Affix Categories

The 61 affixes are registered in `lib/domain/bindings.ts` with full `AffixBinding` records:

```typescript
// lib/domain/bindings.ts
interface AffixBinding extends Binding {
  affix: string;
  category: "universal" | "school" | "exclusive";
  school?: School;
  book?: string;  // exclusive affixes only — locked to one book
}
```

| Category | Count | Scope |
|:---------|:------|:------|
| Universal | 16 | Available to all books |
| School | 17 | Restricted to books of the same school (4 schools) |
| Exclusive | 28 | Locked to one specific book (one per book) |

**Free vs. constrained:** of 61 affixes, ~60% have `requires: "free"` — they function independently. The rest require specific target categories, creating the dependency graph modeled in `domain.graph.md`.

---

## 6. How Binding Connects to Construction

The binding model serves as the contract layer between domain analysis and construction:

```
domain.category.md    →  affix taxonomy (what each affix does)
  ↓ provides/requires
domain.graph.md       →  dependency network (who needs whom)
  ↓ graph projection
domain.path.md        →  qualified paths (legal affix chains)
  ↓ binding contracts
model.binding.md      →  THIS DOC (typed interface)
  ↓ platform + operators
chain.md              →  construction methodology (objectives → functions → scoring)
  ↓ scored combos
function.combos.md    →  combo tables (per-function results)
```

The binding's `requires` field determines which affix combinations are *legal* (satisfiable). The `outputs` and `provides` fields determine which combinations are *useful* (the operator actually contributes to the objective). Construction in `chain.md` uses both constraints.

---

## 7. Related Documentation

| Document | Role |
|:---------|:-----|
| [domain.category.md](domain.category.md) | Affix taxonomy — the 61 affixes with their provides/requires |
| [domain.graph.md](domain.graph.md) | Dependency network model built from bindings |
| [domain.path.md](domain.path.md) | Qualified paths derived from graph |
| [chain.md](chain.md) | Construction methodology consuming binding contracts |
| [function.combos.md](function.combos.md) | Scored combo results |

**Code:**
- `lib/domain/types.ts` — `Binding` interface
- `lib/domain/enums.ts` — `TargetCategory` enum
- `lib/domain/bindings.ts` — all 61 `AffixBinding` records, `EFFECT_PROVIDES`, `deriveProvides()`

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-06 | Initial binding model formalization |
