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

# Combat Simulator — Configuration & Usage

**Status:** Implemented — `app/simulate.ts`
**Updated:** 2026-03-14

---

## CLI Usage

```bash
# List available books
bun app/simulate.ts --list

# Run a combat
bun app/simulate.ts --book-a 通天剑诀 --book-b 新-青元剑诀

# With custom stats
bun app/simulate.ts --book-a 通天剑诀 --book-b 新-青元剑诀 --hp 5000000 --atk 50000

# Verbose output (every round with events)
bun app/simulate.ts --book-a 煞影千幻 --book-b 疾风九变 --hp 5000000 --verbose

# Custom round limit
bun app/simulate.ts --book-a 大罗幻诀 --book-b 天魔降临咒 --rounds 50
```

### CLI Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--book-a` | string | required | Name of book A (as in effects.yaml) |
| `--book-b` | string | required | Name of book B |
| `--hp` | number | 1,000,000 | Starting HP for both entities |
| `--atk` | number | 50,000 | Base ATK for both entities |
| `--def` | number | 10,000 | Base DEF for both entities |
| `--rounds` | number | 100 | Maximum rounds before timeout |
| `--verbose` | flag | false | Show every round with event details |
| `--list` | flag | false | List all available books and exit |

---

## Programmatic Usage

```typescript
import { loadBooks, simulate } from "../lib/simulator/index.js";

const books = loadBooks("data/raw/主书.md");

const result = simulate(books, "通天剑诀", "新-青元剑诀", {
  hp: 5_000_000,
  atk: 50_000,
});

console.log(result.winner);    // "通天剑诀"
console.log(result.rounds);    // 2
console.log(result.a_final_hp); // 2375000
```

---

## CombatConfig

```typescript
interface CombatConfig {
  hp: number;            // starting HP for both entities
  atk: number;           // base ATK for both entities
  def: number;           // base DEF for both entities
  sp: number;            // base SP (灵力) — not yet used for shields
  max_rounds: number;    // timeout
  round_duration: number; // seconds per round (for future use)
  tick_interval: number;  // seconds per state tick (0.5 default)
}
```

### Defaults

```typescript
const DEFAULT_COMBAT_CONFIG = {
  hp: 1_000_000,
  atk: 50_000,
  def: 10_000,
  sp: 5_000,
  max_rounds: 100,
  round_duration: 1,
  tick_interval: 0.5,
};
```

---

## Entity Attributes

The game defines 4 fundamental combat attributes:

| Field | Chinese | Description |
|:------|:--------|:------------|
| `hp`  | 气血 | Health pool. Entity dies when HP reaches 0. |
| `atk` | 攻击 | Base attack. Skill damage scales as `(D_base / 100) × atk`. |
| `sp`  | 灵力 | Spirit power. Not yet used (future: SP → shield at combat start). |
| `def` | 守御 | Defense. Not yet converted to DR formula (future: `DR = def / (def + K)`). |

### Current Simplifications

- **Both entities share the same stats.** There is no `player` / `opponent` split or `scale` factor yet.
- **DEF is not converted to DR.** The entity's `effective_dr` comes entirely from buff/debuff states, not from the `def` attribute.
- **SP does not create initial shields.** The `sp` attribute is stored but unused.
- **Only main book (platform + primary affix + exclusive affix) is simulated.** No multi-book rotation, no aux affixes.

### Future: Asymmetric Stats

When asymmetric stats are needed, the config can be extended to:

```typescript
{
  entity_a: { hp: 6.6e16, atk: 3.5e15, sp: 3.3e15, def: 7e10 },
  entity_b: { scale: 1.0 },  // or explicit values
  formulas: { dr_constant: 7.5e7, sp_shield_ratio: 1.0 },
}
```

---

## Output Format

### Summary mode (default)

Shows every 10th round + last 5 rounds:

```
⚔  通天剑诀  vs  新-青元剑诀
   HP: 5,000,000  ATK: 50,000  DEF: 10,000
─────────────────────────────────────────────
 Round          A HP          B HP       A dmg       B dmg
     1     3,875,000     3,071,098   1,928,903   1,125,000
     2     2,375,000             0   3,071,098   1,500,000

─────────────────────────────────────────────
Result: 通天剑诀 wins
Rounds: 2
通天剑诀 final HP: 2,375,000
新-青元剑诀 final HP: 0
```

### Verbose mode (`--verbose`)

Shows every round with event details:

```
Round 1:
  通天剑诀 HP: 3,875,000 (dealt 1,928,903)
  新-青元剑诀 HP: 3,071,098 (dealt 1,125,000)
    通天剑诀 self-damage increase +50% for 8s
    新-青元剑诀 takes 1928903 ATK damage (6 hits)
    通天剑诀 takes 1125000 ATK damage (6 hits)
    通天剑诀 debuffed: 神通封印 (next_skill_cooldown 8)
    通天剑诀 debuffed: 追命剑阵 (skill_damage -30)
```

---

## Scope: Main Book vs Main Book

The current simulator handles **single main book vs single main book**:

- Each entity has one book (platform + primary affix + exclusive affix)
- The same book activates every round
- No multi-book rotation, no aux affix contributions

### Future: Full 6-Book Set

To support full book sets, the config would extend to:

```json
{
  "books_a": [
    { "slot": 1, "platform": "甲元仙符", "op1": "真极穿空", "op2": "龙象护身" },
    { "slot": 2, "platform": "煞影千幻", "op1": "星猿援护", "op2": "心逐神随" }
  ],
  "books_b": [...]
}
```

The arena would cycle through slots per round, and aux affixes would contribute universal/school modifiers.
