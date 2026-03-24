---
initial date: 2026-03-24
parent: design.md
---

# Parser Workflow — From Raw Data to Simulator

---

## §1 Generate YAML

Two commands produce the two YAML files the simulator consumes:

```bash
# Books: skill effects + primary affixes + exclusive affixes (28 books)
bun app/parse-main-skills.ts -o data/yaml/books.yaml

# Affixes: common (16) + school (17) affixes
bun app/parse-affixes.ts -o data/yaml/affixes.yaml
```

Both read from `data/raw/` and write to `data/yaml/`. The simulator loads these at runtime.

---

## §2 Pipeline: books.yaml

```
data/raw/主书.md ──→ md-table.ts ──→ 28 RawBookEntry
data/raw/专属词缀.md ──→ exclusiveMap (book → raw text)
                                │
              for each book:    │
              ┌─────────────────┘
              │
              ▼
     splitCell(skillText) ──→ description + tier lines
              │
              ├─ description ──→ grammar.match(name, "skillDescription") ──→ semantics ──→ Effect[]
              ├─ description ──→ grammar.match(name, "primaryAffix") ──→ semantics ──→ Effect[]
              └─ exclusiveText ──→ grammar.match(name, "exclusiveAffix") ──→ semantics ──→ Effect[]
              │
              ▼
     resolveTiers(effects, tierLines) ──→ resolved Effect[] with data_state
              │
              ▼
     emit.ts ──→ books.yaml
```

**Text cleaning** (before grammar match):
- Strip backticks (raw data uses `` `增益` `` for emphasis)
- Strip `【name】：` prefix from affix text
- Strip editorial notes: `（最高不超过N级）`, `（N层达到最大...）`, `（数据为没有悟境的情况）`
- Unescape `\*` → `*`
- Book name dash: `新-青元剑诀` → lookup as `新青元剑诀`

**Tier resolution**:
- Each tier line like `悟0境：x=1500, y=11` defines variable values
- Effects with string vars (`total: "x"`) get resolved (`total: 1500`)
- Each resolved effect gets `data_state: "enlightenment=0"` or `data_state: ["enlightenment=10", "fusion=51"]`

---

## §3 Pipeline: affixes.yaml

```
data/raw/通用词缀.md ──→ 16 AffixEntry
data/raw/修为词缀.md ──→ 17 AffixEntry (4 schools)
              │
              ▼
     splitCell(rawText) ──→ description + tier lines
              │
              ├─ universal: grammar.match("通用词缀", "affixDescription") ──→ semantics ──→ Effect[]
              └─ school: grammar.match("修为词缀_剑修", "affixDescription") ──→ semantics ──→ Effect[]
              │
              ▼
     resolveTiers ──→ affixes.yaml
```

School name mapping: `Sword→剑修, Spell→法修, Demon→魔修, Body→体修`

---

## §4 Verify

After regeneration, verify the YAML:

```bash
# Check books.yaml
bun -e "
const yaml=require('yaml');
const fs=require('fs');
const d=yaml.parse(fs.readFileSync('data/yaml/books.yaml','utf-8'));
const books=Object.keys(d.books);
console.log(books.length, 'books');
for(const [n,b] of Object.entries(d.books)){
  const sk=(b as any).skill?.length??0;
  const pa=(b as any).primary_affix?.effects?.length??0;
  const ea=(b as any).exclusive_affix?.effects?.length??0;
  if(sk===0) console.log('  WARNING: no skill effects for', n);
}
"

# Check affixes.yaml
bun -e "
const yaml=require('yaml');
const fs=require('fs');
const d=yaml.parse(fs.readFileSync('data/yaml/affixes.yaml','utf-8'));
console.log(Object.keys(d.universal).length, 'universal affixes');
let s=0;
for(const v of Object.values(d.school)) s+=Object.keys(v as any).length;
console.log(s, 'school affixes');
"
```

---

## §5 Run Simulator

The simulator reads both YAML files:

```typescript
// lib/sim/config.ts
loadBooksYaml("data/yaml/books.yaml")     // → BooksYaml
loadAffixesYaml("data/yaml/affixes.yaml") // → AffixesYaml
```

---

## §6 Full Rebuild

When raw data changes:

```bash
# 1. Regenerate YAML
bun app/parse-main-skills.ts -o data/yaml/books.yaml
bun app/parse-affixes.ts -o data/yaml/affixes.yaml

# 2. Verify
bun test lib/parser/grammars/   # 122 grammar + semantic tests
bun run check                   # typecheck + lint

# 3. Run simulator tests
bun test lib/sim/
```

---

## §7 When to Update Grammars

If a book's raw text changes in `data/raw/主书.md`:
1. Update the book's `.ohm` file in `grammars-v1/books/`
2. Update the book's semantic `.ts` file in `grammars/semantics/`
3. Run `bun test lib/parser/grammars/` to verify parsing
4. Regenerate YAML

If a new book is added:
1. Write a new `.ohm` grammar file
2. Write a new semantic `.ts` file
3. Add test data to `proto.test.ts`
4. Regenerate YAML
