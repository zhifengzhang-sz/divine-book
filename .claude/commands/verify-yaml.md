# Agent: Verify YAML Against Raw Data

**Purpose:** Full audit of `data/yaml/books.yaml` and `data/yaml/affixes.yaml` against the raw Chinese source in `data/raw/`. Checks accuracy, structural correctness, and coverage.

## Inputs

| File | Role |
|:---|:---|
| `data/raw/主书.md` | Ground truth — 28 books (skill + primary affix prose + tier data) |
| `data/raw/专属词缀.md` | Ground truth — exclusive affix prose + tier data |
| `data/raw/通用词缀.md` | Ground truth — 16 universal affixes |
| `data/raw/修为词缀.md` | Ground truth — 17 school affixes (4 schools) |
| `data/yaml/books.yaml` | Parser output to verify |
| `data/yaml/affixes.yaml` | Parser output to verify |
| `lib/parser/schema/effects.ts` | Canonical effect type definitions |

## Three Verification Dimensions

### 1. Accuracy

For each effect in the YAML, check numeric values against the raw text:

- **Variable values**: `x`, `y`, `z`, `w` at each tier must match the tier line (e.g., `悟0境：x=1500, y=11`)
- **Literal numbers**: "六段" = 6 hits, "8秒" = 8 seconds, "持续12秒" = duration 12
- **Chinese numerals**: 一=1, 二=2, 三=3, 四=4, 五=5, 六=6, 七=7, 八=8, 九=9, 十=10
- **Tier resolution**: For effects with `data_state`, verify resolved values match the corresponding tier line

### 2. Structural Correctness

For each effect in the YAML, verify the effect type and field names correctly represent the Chinese text:

- "造成N段共x%攻击力的伤害" → `base_attack` with `hits` and `total`
- "V%最大气血值的伤害" → `percent_max_hp_damage` with `value`
- "治疗量降低x%" → `heal_reduction`, NOT `damage_increase`
- "偷取N个增益" → `buff_steal`, NOT `debuff`
- "伤害减免" → `damage_reduction`, NOT `damage_increase`
- Field names should match the semantic meaning of the Chinese text

Cross-reference effect types against `lib/parser/schema/effects.ts` — every type string in the YAML must exist in the schema.

### 3. Coverage

Compare every clause/sentence in the raw text against the YAML effects:

- **Missing effects**: Text describes a mechanic but no YAML effect captures it
- **Phantom effects**: YAML has an effect the text doesn't describe
- **Clause splitting**: One sentence describes two things — are both captured?
- **Duration/max_stacks**: Stated in text but missing from YAML fields

Count distinct mechanical clauses in raw text vs number of effects in YAML for each section (skill, primary affix, exclusive affix).

## Process

1. **Run Zod validation first** as a quick structural check:
```bash
bun -e "
import { parseEffect } from './lib/parser/schema/effects.js';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
const books = parse(readFileSync('data/yaml/books.yaml','utf-8'));
const affixes = parse(readFileSync('data/yaml/affixes.yaml','utf-8'));
let total=0, pass=0, fail=0;
for (const [n,b] of Object.entries(books.books)) {
  for (const s of ['skill','primary_affix','exclusive_affix']) {
    const effs = s==='skill' ? b[s] : b[s]?.effects;
    if (!effs) continue;
    for (const [i,e] of effs.entries()) {
      total++;
      try { parseEffect(e); pass++; }
      catch(err) { fail++; console.log('FAIL', n, s+'['+i+']', e.type, err.message.slice(0,80)); }
    }
  }
}
for (const [n,a] of Object.entries(affixes.universal||{}))
  for (const [i,e] of (a.effects||[]).entries()) {
    total++;
    try { parseEffect(e); pass++; }
    catch(err) { fail++; console.log('FAIL universal/'+n, i, e.type); }
  }
for (const [school,m] of Object.entries(affixes.school||{}))
  for (const [n,a] of Object.entries(m))
    for (const [i,e] of (a.effects||[]).entries()) {
      total++;
      try { parseEffect(e); pass++; }
      catch(err) { fail++; console.log('FAIL', school+'/'+n, i, e.type); }
    }
console.log('Zod:', total, 'total,', pass, 'pass,', fail, 'fail');
"
```

2. **For each of the 28 books**, read the raw text from `data/raw/主书.md` and `data/raw/专属词缀.md`, then compare against `data/yaml/books.yaml`:

   - Parse the raw markdown table to extract: book name, skill text, affix text, tier lines
   - For the YAML, find the matching book entry
   - Compare clause by clause

3. **For affixes**, read `data/raw/通用词缀.md` and `data/raw/修为词缀.md`, compare against `data/yaml/affixes.yaml`

4. **Parallelize**: Split books into 3 batches (1-10, 11-20, 21-28) and run verification in parallel agents.

## Output Format

Per book:
```
### 书名
SKILL: N clauses in text, M effects in YAML
  - effect_type: field=value ✓/✗ (expected vs actual if wrong)
  - [MISSING] "clause from raw text not captured as any effect"
  - [PHANTOM] "effect in YAML not described in raw text"
  - [WRONG TYPE] "text says X, parsed as Y"
  - [WRONG VALUE] field: expected=A actual=B
  - [MISSING FIELD] duration/max_stacks/etc stated in text but absent

PRIMARY AFFIX: N clauses, M effects
  - ...

EXCLUSIVE AFFIX: N clauses, M effects
  - ...

STATUS: CLEAN / N issues
```

Final summary:
```
## Verification Summary
- Zod validation: N/N pass
- Books verified: 28/28
- Clean: N books
- Issues: N total across M books

### Critical (coverage gaps)
- ...

### High (structural/accuracy)
- ...

### Medium (missing fields)
- ...
```

## When to Run

- After modifying any grammar (.ohm) or semantic (.ts) file
- After modifying `lib/parser/schema/effects.ts`
- After regenerating YAML with `bun run parse`
- Before committing parser changes
