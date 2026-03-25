---
initial date: 2026-03-23
parent: design.md
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

# Tutorial: How the IO Wrapper Works

Running example: **千锋聚灵剑** — following the data from raw markdown to YAML output

---

## §1 The Full Pipeline

```
data/raw/主书.md                     ← raw Chinese prose in markdown tables
    │
    ▼
  md-table.ts                        ← reads markdown, splits by book
    │
    ├── name: "千锋聚灵剑"
    ├── school: "剑修"
    ├── skillText: "剑破天地，...（对怪物伤害不超过自身z%攻击力）\n悟0境：x=1500, y=11, z=2200"
    └── affixText: "本神通每段攻击造成伤害后，下一段提升x%神通加成\n悟3境：x=25"
    │
    ▼
  splitCell()                        ← separates description from tier lines
    │
    ├── description: "剑破天地，...（对怪物伤害不超过自身z%攻击力）"
    └── tiers: ["悟0境：x=1500, y=11, z=2200"]
    │
    ▼
  grammar.match() + sem.toEffects()  ← translator + extractor (tutorials 1 & 2)
    │
    └── effects: [
          { type: "base_attack", hits: 6, total: "x" },
          { type: "percent_max_hp_damage", value: "y", cap_vs_monster: "z" }
        ]
    │
    ▼
  tiers.ts                           ← resolve variables with tier values
    │
    └── resolved: [
          { type: "base_attack", hits: 6, total: 1500, data_state: ["enlightenment=0"] },
          { type: "percent_max_hp_damage", value: 11, cap_vs_monster: 2200, data_state: ["enlightenment=0"] }
        ]
    │
    ▼
  emit.ts                            ← format as YAML
    │
    └── YAML output
```

The grammar + semantics (tutorials 1 & 2) handle the middle step. The IO layer handles everything around it: reading markdown, splitting cells, resolving tiers, emitting YAML.

---

## §2 Step 1: Reading the Markdown — `md-table.ts`

The raw data lives in `data/raw/主书.md` — a markdown file with tables per school:

```markdown
| 功法书 | 功能 | 主词缀 |
|-------|------|-------|
| `千锋聚灵剑` | 剑破天地，...z%攻击力）<br>悟0境：x=1500, y=11, z=2200 | 【惊神剑光】：...x%神通加成<br>悟3境：x=25 |
```

`md-table.ts` parses this into:

```typescript
interface RawBookEntry {
  name: string;       // "千锋聚灵剑"
  school: string;     // "剑修"
  skillText: string;  // full cell content (description + tier lines, <br> joined)
  affixText: string;  // primary affix cell content
}
```

It reads each school section (`#### 剑修`, `#### 法修`, etc.) and extracts the table rows. The `SCHOOL_MAP` translates Chinese school names to English identifiers.

---

## §3 Step 2: Splitting Cells — `splitCell()`

Each table cell contains the description AND tier data, separated by `<br>`:

```
剑破天地，对范围内目标造成六段共计x%攻击力的灵法伤害，并每段攻击造成目标y%最大气血值的伤害（对怪物伤害不超过自身z%攻击力）<br>悟0境：x=1500, y=11, z=2200<br>悟1境，融合20重：x=11265, y=15, z=3000
```

`splitCell()` splits on `<br>` and separates:

```typescript
interface SplitCell {
  description: string;   // "剑破天地，...z%攻击力）"
  tierLines: string[];   // ["悟0境：x=1500, y=11, z=2200", "悟1境，融合20重：x=11265, y=15, z=3000"]
}
```

The `description` goes to the grammar. The `tierLines` go to tier resolution.

Backticks are stripped from the description (the raw data uses `` `增益` `` for emphasis).

---

## §4 Step 3: Grammar + Semantics

This is where the translator and extractor from tutorials 1 & 2 do their work:

```typescript
// Load the book's grammar and semantics
const grammar = grammars["千锋聚灵剑"];
const sem = grammar.createSemantics();
addSemantics(sem);

// Parse skill description
const match = grammar.match(description, "skillDescription");
const skillEffects = sem(match).toEffects();
// → [{ type: "base_attack", hits: 6, total: "x" },
//    { type: "percent_max_hp_damage", value: "y", cap_vs_monster: "z" }]

// Parse primary affix
const affixMatch = grammar.match(affixDescription, "primaryAffix");
const affixEffects = sem(affixMatch).toEffects();
// → [{ type: "per_hit_escalation", value: "x" }]

// Parse exclusive affix (from 专属词缀.md)
const exclMatch = grammar.match(exclusiveDescription, "exclusiveAffix");
const exclEffects = sem(exclMatch).toEffects();
// → [{ type: "heal_reduction", value: "x", state: "灵涸", duration: "8", undispellable: true }]
```

At this point, effects have **string variable references** (`"x"`, `"y"`, `"z"`) — not numbers.

---

## §5 Step 4: Tier Resolution — `tiers.ts`

Tier lines define concrete values for each variable at each enlightenment/fusion level:

```
悟0境：x=1500, y=11, z=2200
悟1境，融合20重：x=11265, y=15, z=3000
悟3境，融合32重：x=14865, y=19, z=3800
悟10境，融合51重：x=20265, y=27, z=5400
```

`tiers.ts` parses each line into:

```typescript
interface TierSpec {
  enlightenment?: number;  // 0, 1, 3, 10
  fusion?: number;         // undefined, 20, 32, 51
  locked?: boolean;        // some tiers are "此功能未解锁"
  vars: Record<string, number>;  // { x: 1500, y: 11, z: 2200 }
}
```

Then for each tier, it clones the effects and substitutes variables:

```typescript
// Input effect:  { type: "base_attack", hits: 6, total: "x" }
// Tier vars:     { x: 1500, y: 11, z: 2200 }
// Output effect: { type: "base_attack", hits: 6, total: 1500,
//                  data_state: ["enlightenment=0"] }
```

The `data_state` field tracks which tier this resolved effect came from.

**Key rule:** `hits: 6` stays as-is (it's already a number — parsed from Chinese numeral by the grammar). Only string fields that match a tier variable get substituted.

---

## §6 Step 5: YAML Emission — `emit.ts`

After tier resolution, effects have concrete numbers. `emit.ts` formats them:

```typescript
function emitBooks(books: ParsedBook[]): Record<string, BookData>
function cleanEffects(effects: EffectRow[]): EffectRow[]  // strip internal fields
function formatYaml(data: object): string
```

The output is the `BookData` format consumed by the combat simulator:

```typescript
interface BookData {
  school: string;
  skill_text?: string;
  effects: EffectRow[];    // resolved skill effects (per tier)
  states?: Record<string, StateDef>;
  primary_affix?: { name: string; effects: EffectRow[] };
  exclusive_affix?: { name: string; effects: EffectRow[] };
}
```

---

## §7 Step 6: Orchestrator — `index.ts`

`index.ts` wires everything together. The new flow (to be implemented):

```typescript
// 1. Read raw data
const books = readMarkdownTable("data/raw/主书.md");
const commonAffixes = readCommonAffixes("data/raw/通用词缀.md");
const schoolAffixes = readSchoolAffixes("data/raw/修为词缀.md");
const exclusiveAffixes = readExclusiveAffixes("data/raw/专属词缀.md");

// 2. For each book
for (const book of books) {
  const { description, tierLines } = splitCell(book.skillText);

  // Load this book's grammar + semantics
  const grammar = grammars[book.name];
  const sem = grammar.createSemantics();
  addBookSemantics(book.name, sem);

  // Parse skill
  const skillEffects = sem(grammar.match(description, "skillDescription")).toEffects();

  // Parse primary affix (if exists)
  const affixEffects = book.affixText
    ? sem(grammar.match(splitCell(book.affixText).description, "primaryAffix")).toEffects()
    : [];

  // Parse exclusive affix
  const exclText = exclusiveAffixes[book.name];
  const exclEffects = exclText
    ? sem(grammar.match(exclText, "exclusiveAffix")).toEffects()
    : [];

  // Resolve tiers
  const resolvedSkill = resolveTiers(skillEffects, tierLines);
  const resolvedAffix = resolveTiers(affixEffects, affixTierLines);

  // Collect
  parsedBook = { school, skill: resolvedSkill, primaryAffix: resolvedAffix, ... };
}

// 3. Parse shared affixes (common + school)
for (const affix of commonAffixes) {
  const grammar = grammars["通用词缀"];
  const sem = grammar.createSemantics();
  addCommonAffixSemantics(sem);
  const effects = sem(grammar.match(affix.text, "affixDescription")).toEffects();
  // resolve tiers, collect
}

// 4. Emit YAML
const output = emitBooks(allParsedBooks);
writeFileSync("data/yaml/books.yaml", formatYaml(output));
```

---

## §8 What's Shared, What's Per-Book

| Component | Shared or per-book? | Why? |
|-----------|-------------------|------|
| `md-table.ts` | Shared | All books come from the same markdown format |
| `splitCell()` | Shared | All cells use `<br>` to separate description from tiers |
| `tiers.ts` | Shared | All tiers follow `悟N境：x=V, y=V` format |
| `emit.ts` | Shared | All books emit the same YAML format |
| Grammar (`.ohm`) | **Per-book** | Each book has unique sentence structure |
| Semantics (`.ts`) | **Per-book** | Each book's rules map to different effects |
| `Base.ohm` | Shared | Universal vocabulary (`varRef`, `stateName`, `cnNumber`) |
| `shared.ts` | Shared | `extractVar` attribute is identical everywhere |
| `effect-types.ts` | Shared | All books produce the same typed union |

The per-book boundary is the grammar + semantics. Everything before (reading markdown) and after (resolving tiers, emitting YAML) is shared infrastructure.
