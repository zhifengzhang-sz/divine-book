---
initial date: 2026-03-23
parent: design.md
---




<style>
body { max-width: none !important; width: 95% !important; margin: 0 auto !important; padding: 20px 40px !important; background-color: #282c34 !important; color: #abb2bf !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important; line-height: 1.6 !important; }
h1, h2, h3, h4, h5, h6 { color: #ffffff !important; }
a { color: #61afef !important; }
code { background-color: #3e4451 !important; color: #e5c07b !important; padding: 2px 6px !important; border-radius: 3px !important; }
pre { background-color: #2c313a !important; border: 1px solid #4b5263 !important; border-radius: 6px !important; padding: 16px !important; overflow-x: auto !important; }
pre code { background-color: transparent !important; color: #abb2bf !important; padding: 0 !important; font-size: 13px !important; line-height: 1.5 !important; }
table { border-collapse: collapse !important; width: auto !important; margin: 16px 0 !important; }
table th, table td { border: 1px solid #4b5263 !important; padding: 8px 10px !important; }
table th { background: #3e4451 !important; color: #e5c07b !important; font-size: 14px !important; text-align: center !important; }
table td { background: #2c313a !important; font-size: 12px !important; }
blockquote { border-left: 3px solid #4b5263 !important; padding-left: 10px !important; color: #5c6370 !important; }
strong { color: #e5c07b !important; }
</style>

# Tutorial: How Semantics Work

Running example: **千锋聚灵剑** (continues from tutorial.ohm.md)

---

## §1 What Semantics Do

The grammar produces a parse tree. Semantics walk the tree and produce typed data.

```
Parse Tree                          Semantics                    Effect[]
─────────                           ─────────                    ────────
skillDescription                    →  collect children          →  [BaseAttack, PercentMaxHpDamage]
├── baseAttack                      →  { type: "base_attack",
│   ├── cnHitCount: "六段"          →     hits: 6,
│   └── varRef: "x"                 →     total: "x" }
├── damageWithCap                   →  { type: "percent_max_hp_damage",
│   ├── percentMaxHpDmg: varRef "y" →     value: "y",
│   └── capVsMonster: varRef "z"    →     cap_vs_monster: "z" }
```

Each grammar rule gets a **semantic action** — a function that receives the child nodes and returns `Effect[]`.

---

## §2 The Semantic File

`grammars/semantics/千锋聚灵剑.ts`:

```typescript
import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
  addExtractVar(s);  // register the extractVar attribute

  s.addOperation<Effect[]>("toEffects", {
    // one action per grammar rule
  });
}
```

Two things are registered:

1. **`extractVar`** — a shared attribute that extracts string values from varRef/stateName nodes
2. **`toEffects`** — the operation that produces `Effect[]` from each rule

---

## §3 Action by Action

### §3.1 `skillDescription` — collect effects from children

```
Grammar:  skillDescription = preamble baseAttack "，并" perHit damageWithCap
```

```typescript
skillDescription(_pre, baseAttack, _sep, _perHit, damageWithCap) {
  return [...baseAttack.toEffects(), ...damageWithCap.toEffects()];
}
```

**How it works:**
- The function receives 5 arguments — one per sequence element in the grammar rule
- `_pre` is the preamble node (we don't care about it — prefix with `_`)
- `_sep` is the `"，并"` literal (don't care)
- `_perHit` is the `perHit` node (don't care — it's a modifier, not an effect)
- `baseAttack.toEffects()` calls `toEffects` recursively on the baseAttack child
- `damageWithCap.toEffects()` calls it on the damageWithCap child
- We spread both into one array: `[...baseAttack effects, ...damageWithCap effects]`

**Output:** `[{ type: "base_attack", ... }, { type: "percent_max_hp_damage", ... }]`

### §3.2 `baseAttack` — extract hits and total

```
Grammar:  baseAttack = "造成" cnHitCount "共计" varRef "%" "攻击力的灵法伤害"
```

```typescript
baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
  return [{
    type: "base_attack",
    hits: parseCn(cnHit.sourceString.replace("段", "")),
    total: varRef.extractVar
  }];
}
```

**How it works:**
- 6 arguments for 6 sequence elements
- `cnHit.sourceString` → `"六段"` → strip `"段"` → `"六"` → `parseCn("六")` → `6`
- `varRef.extractVar` → `"x"` (the memoized attribute — see §4)
- Returns one effect: `{ type: "base_attack", hits: 6, total: "x" }`

### §3.3 `damageWithCap` — compound rule, two children

```
Grammar:  damageWithCap = percentMaxHpDmg "（" capVsMonster "）"
```

```typescript
damageWithCap(dmg, _lp, cap, _rp) {
  return [{
    type: "percent_max_hp_damage",
    value: dmg.extractVar,
    cap_vs_monster: cap.extractVar
  }];
}
```

**How it works:**
- `dmg` is the `percentMaxHpDmg` node — calling `dmg.extractVar` finds the varRef inside it
- `cap` is the `capVsMonster` node — same thing
- `_lp` and `_rp` are the Chinese parentheses (discarded)
- Returns: `{ type: "percent_max_hp_damage", value: "y", cap_vs_monster: "z" }`

This is the power of compound rules: the grammar fuses `percentMaxHpDmg` + `capVsMonster` into one `damageWithCap`. The semantic action produces one effect with both fields. No post-processing needed.

### §3.4 Helper rules — return empty

```typescript
preamble(_) { return []; }
cnHitCount(_cn, _d) { return []; }
perHit(_) { return []; }
_terminal() { return []; }
_iter(...children) { return children.flatMap((c) => c.toEffects()); }
```

Rules that don't produce effects return `[]`. The `_terminal` and `_iter` are defaults:
- `_terminal()` — handles literal strings like `"造成"`, `"，并"` → return nothing
- `_iter()` — handles `?`, `*`, `+` nodes → recursively call toEffects on each child

---

## §4 The `extractVar` Attribute

`extractVar` is registered by `shared.ts`. It's an **attribute** (not an operation):
- Called as a property: `node.extractVar` (no parentheses)
- **Memoized**: computed once per node, cached forever
- Cannot take arguments

```typescript
s.addAttribute("extractVar", {
  varRef_letters(_c) { return this.sourceString; },     // "x" → "x"
  varRef_decimal(_i, _d, _f) { return this.sourceString; }, // "3.5" → "3.5"
  varRef_integer(_d) { return this.sourceString; },      // "1500" → "1500"
  stateName(_o, c, _cl) { return c.sourceString; },     // "【罗天魔咒】" → "罗天魔咒"
  cnNumber(_d) { return String(parseCn(this.sourceString)); }, // "六" → "6"
  _nonterminal(...children) {
    // For compound rules like percentMaxHpDmg: find the varRef child
    for (const child of children) {
      try { const v = child.extractVar; if (/^[a-z]/.test(v)) return v; } catch {}
    }
    return this.sourceString;
  },
  _terminal() { return this.sourceString; },
  _iter(...children) { return children.length > 0 ? children.at(-1).extractVar : this.sourceString; },
});
```

**Why `_nonterminal`?** When `damageWithCap` calls `dmg.extractVar`, `dmg` is a `percentMaxHpDmg` node which has multiple children (`"造成目标"`, varRef, `"%"`, `"最大气血值的伤害"`). The `_nonterminal` handler scans those children to find the `varRef` and returns its value.

---

## §5 Effect Types — The Return Contract

Every semantic action returns `Effect[]` where `Effect` is a discriminated union:

```typescript
// From effect-types.ts
interface BaseAttack {
  type: "base_attack";
  hits: number;       // parsed from Chinese numeral (六 → 6)
  total: VarRef;      // string variable reference ("x")
}

interface PercentMaxHpDamage {
  type: "percent_max_hp_damage";
  value: VarRef;
  cap_vs_monster?: VarRef;
  per_hit?: boolean;
}
```

The `type` field discriminates: downstream code can switch on `effect.type` and TypeScript narrows the fields.

**VarRef convention:** Most numeric fields are strings like `"x"`, `"y"`, `"1500"`. They're not resolved to numbers yet — that happens in the tier resolution layer (see tutorial.io.md). Only values derived from grammar structure (like `hits` from `cnNumber`) are parsed to `number` immediately.

---

## §6 Wiring It Together

```typescript
import * as ohm from "ohm-js";
import { addSemantics } from "./semantics/千锋聚灵剑.js";

// 1. Load grammar
const grammars = ohm.grammars(baseOhm + "\n" + bookOhm);
const grammar = grammars["千锋聚灵剑"];

// 2. Create semantics
const sem = grammar.createSemantics();
addSemantics(sem);

// 3. Parse
const match = grammar.match(rawText, "skillDescription");

// 4. Extract
const effects = sem(match).toEffects();
// → [
//     { type: "base_attack", hits: 6, total: "x" },
//     { type: "percent_max_hp_damage", value: "y", cap_vs_monster: "z" }
//   ]
```

The grammar and semantics are created once per book. `grammar.match()` + `sem(match).toEffects()` runs per input text.

---

## §7 Testing Semantics

```typescript
it("skill → BaseAttack + PercentMaxHpDamage", () => {
  const match = grammar.match(rawText, "skillDescription");
  expect(match.succeeded()).toBe(true);

  const effects = sem(match).toEffects();
  expect(effects).toEqual([
    { type: "base_attack", hits: 6, total: "x" },
    { type: "percent_max_hp_damage", value: "y", cap_vs_monster: "z" },
  ]);
});
```

The test verifies both layers:
1. Grammar parses (`match.succeeded()`)
2. Semantics produce correct typed data (`effects` matches expected)

---

## §8 A More Complex Example: 大罗幻诀

大罗幻诀 has state blocks — the semantic shows how names propagate:

```typescript
// Grammar: childBlock = stateName "：" childBody
childBlock(stateName, _colon, childBody) {
  const effects = childBody.toEffects();
  for (const e of effects) e.name = stateName.extractVar;  // "噬心之咒"
  return effects;
}
```

The grammar parses `【噬心之咒】：每0.5秒额外造成目标y%当前气血值的伤害，持续4秒`. The semantic action:
1. Gets the state name via `stateName.extractVar` → `"噬心之咒"`
2. Gets the dot effect from `childBody.toEffects()` → `[{ type: "dot", tick_interval: "0.5", percent_current_hp: "y" }]`
3. Stamps the name onto it: `effect.name = "噬心之咒"`
4. Returns: `[{ type: "dot", name: "噬心之咒", tick_interval: "0.5", percent_current_hp: "y", duration: "4" }]`

No context parameter needed. The grammar structure carries the state name to the semantic action naturally.
