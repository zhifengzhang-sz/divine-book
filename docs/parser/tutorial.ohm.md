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

# Tutorial: How the .ohm Grammar Works

Running example: **千锋聚灵剑** (simplest book — 2 effects, no state blocks)

---

## §1 The Raw Text

From `data/raw/主书.md`, the skill column for 千锋聚灵剑 (after stripping backticks and tier lines):

```
剑破天地，对范围内目标造成六段共计x%攻击力的灵法伤害，并每段攻击造成目标y%最大气血值的伤害（对怪物伤害不超过自身z%攻击力）
```

A human reads this as:
1. Preamble flavor text: "剑破天地，对范围内目标"
2. Base attack: "造成六段共计x%攻击力的灵法伤害" (6 hits, x% total)
3. Per-hit damage with cap: "每段攻击造成目标y%最大气血值的伤害（对怪物伤害不超过自身z%攻击力）"

The grammar teaches the computer to read it the same way.

---

## §2 The Grammar File

`grammars-v1/books/千锋聚灵剑.ohm`:

```
千锋聚灵剑 <: Base {
  skillDescription = preamble baseAttack "，并" perHit damageWithCap
  preamble = (~"造成" any)*

  baseAttack = "造成" cnHitCount "共计" varRef "%" "攻击力的灵法伤害"
  cnHitCount = cnNumber "段"

  perHit = "每段攻击"

  damageWithCap = percentMaxHpDmg "（" capVsMonster "）"
  percentMaxHpDmg = "造成目标" varRef "%" "最大气血值的伤害"
  capVsMonster = "对怪物伤害不超过自身" varRef "%" "攻击力"

  primaryAffix = ...
  exclusiveAffix = ...
}
```

### §2.1 Reading the Grammar

**`千锋聚灵剑 <: Base`** — this grammar inherits from Base.ohm, which provides `varRef`, `stateName`, `cnNumber`, `gapTo`.

**`skillDescription = preamble baseAttack "，并" perHit damageWithCap`**

This is the top-level rule. It says: the skill text is a sequence of:
1. `preamble` — skip junk until the real content starts
2. `baseAttack` — the main damage clause
3. `"，并"` — a literal Chinese comma + "并" (and)
4. `perHit` — "每段攻击" (per hit)
5. `damageWithCap` — the max HP damage with monster cap

**`preamble = (~"造成" any)*`**

"Match any character, as long as it's NOT `造成`." This skips "剑破天地，对范围内目标" and stops right before "造成六段共计...".

**`baseAttack = "造成" cnHitCount "共计" varRef "%" "攻击力的灵法伤害"`**

Match this exact sequence:
- `"造成"` — literal
- `cnHitCount` — another rule (defined below)
- `"共计"` — literal
- `varRef` — inherited from Base (matches `x`, `1500`, `3.5`, etc.)
- `"%"` — literal
- `"攻击力的灵法伤害"` — literal

**`cnHitCount = cnNumber "段"`**

A Chinese number followed by "段" (hits). `cnNumber` is from Base — matches `六` (6).

**`damageWithCap = percentMaxHpDmg "（" capVsMonster "）"`**

This is a **compound rule**: the percent HP damage and the monster cap are fused into one grammar rule because they always appear together in 千锋聚灵剑's text. The `（` and `）` are Chinese parentheses that wrap the cap.

### §2.2 How PEG Parsing Works

ohm-js uses PEG (Parsing Expression Grammar). Key behaviors:

1. **Sequence**: `A B C` — match A, then B, then C, in order.
2. **Literal**: `"造成"` — match this exact string.
3. **Reference**: `varRef` — jump to the rule named `varRef` and match it.
4. **Negation**: `~"造成"` — succeed only if `"造成"` does NOT match here.
5. **Repetition**: `(~"造成" any)*` — repeat zero or more times: match any char that isn't `"造成"`.

There's no backtracking ambiguity because each book has exactly one `skillDescription` rule that matches its text precisely. No alternations to get wrong.

---

## §3 The Parse Tree

When `grammar.match(text, "skillDescription")` succeeds, ohm produces a **parse tree** (CST — Concrete Syntax Tree):

```
skillDescription
├── preamble: "剑破天地，对范围内目标"
├── baseAttack
│   ├── "造成"
│   ├── cnHitCount
│   │   ├── cnNumber: "六"
│   │   └── "段"
│   ├── "共计"
│   ├── varRef: "x"
│   ├── "%"
│   └── "攻击力的灵法伤害"
├── "，并"
├── perHit: "每段攻击"
└── damageWithCap
    ├── percentMaxHpDmg
    │   ├── "造成目标"
    │   ├── varRef: "y"
    │   ├── "%"
    │   └── "最大气血值的伤害"
    ├── "（"
    ├── capVsMonster
    │   ├── "对怪物伤害不超过自身"
    │   ├── varRef: "z"
    │   ├── "%"
    │   └── "攻击力"
    └── "）"
```

Every node in the tree corresponds to a grammar rule or literal. The semantics walk this tree to produce effects.

---

## §4 Inheritance from Base.ohm

`千锋聚灵剑 <: Base` means it inherits all rules from Base.ohm:

```
Base {
  varRef
    = lower+              -- "x", "y", "abc"
    | digits "." digits   -- "0.5", "3.5"
    | digits              -- "1500", "10"

  stateName = "【" stateNameChars "】"
  cnNumber = cnDigit+
  cnDigit = "一" | "二" | ... | "十" | "两"
  gapTo<target> = (~target any)*
}
```

When `baseAttack` references `varRef`, ohm looks up the `varRef` rule from Base. When `cnHitCount` references `cnNumber`, same thing.

The book grammar only defines rules specific to this book's text structure. The vocabulary is shared.

---

## §5 Testing a Grammar

```typescript
import { readFileSync } from "node:fs";
import * as ohm from "ohm-js";

// 1. Load .ohm files from disk as plain text
const baseOhm = readFileSync("lib/parser/grammars-v1/Base.ohm", "utf-8");
const bookOhm = readFileSync("lib/parser/grammars-v1/books/千锋聚灵剑.ohm", "utf-8");

// 2. Compile both into grammar objects (Base must come first for inheritance)
const grammars = ohm.grammars(baseOhm + "\n" + bookOhm);
const grammar = grammars["千锋聚灵剑"];

// 3. Match raw text against the skillDescription entry point
const raw = "剑破天地，对范围内目标造成六段共计x%攻击力的灵法伤害，" +
            "并每段攻击造成目标y%最大气血值的伤害（对怪物伤害不超过自身z%攻击力）";

const match = grammar.match(raw, "skillDescription");
console.log(match.succeeded());  // true
```

**How it works:**
- `.ohm` files are plain text — `readFileSync` loads them as strings
- `ohm.grammars()` takes a single string containing one or more grammar definitions
- Base.ohm must come before the book grammar because `千锋聚灵剑 <: Base` references it
- `grammars["千锋聚灵剑"]` retrieves the compiled grammar by name
- `grammar.match(text, "skillDescription")` parses starting from the `skillDescription` rule

If the text doesn't match, `match.failed()` is true and `match.shortMessage` tells you where and what was expected:

```
Line 1, col 42: expected "共计"
```

This is the grammar's job: **parse or fail with a precise error**. It doesn't know about effect types — that's the semantic's job (see tutorial.semantics.md).

---

## §6 Contrast: Why Not One Grammar?

A monolithic grammar would need:

```
baseAttack
  = ("对目标" | "对其")? "造成" cnHitCount? ("共计" | "共")? varRef "%" "攻击力的" "灵法"? "伤害"
```

This matches 千锋聚灵剑 but also matches **anything that looks vaguely like a base attack**. It would also match "对目标造成x%攻击力的伤害" from 元磁神光 (which drops "灵法"). Every optional makes the rule less precise.

千锋聚灵剑's grammar says exactly: `"造成" cnHitCount "共计" varRef "%" "攻击力的灵法伤害"`. No optionals. No ambiguity. If the text changes, the grammar fails loudly.

---

## §7 Adding a New Book

To add a new book:

1. Read the raw text from `data/raw/主书.md`
2. Identify the structure: what clauses, what separators, what state blocks
3. Write a `.ohm` file in `grammars-v1/books/` that matches the exact text
4. Test it: `grammar.match(rawText, "skillDescription")` must succeed
5. Write the semantic file (see tutorial.semantics.md)

The grammar is a **precise spec** of what the book says. Not a flexible matcher — a translator for one specific text.
