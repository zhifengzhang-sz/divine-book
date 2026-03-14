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

# Combat Simulator: Configuration

**Date:** 2026-03-11

---

## Config File Format

Config files live in `config/` and use JSON. A combat config specifies both sides
(player and opponent) with their entity attributes and divine book sets.

```json
{
  "t_gap": 6,
  "formulas": { "dr_constant": 7.5e7, "sp_shield_ratio": 1.0 },
  "player": {
    "entity": { "hp": 6.6e16, "atk": 3.5184e15, "sp": 3.3309e15, "def": 7.078e10 },
    "books": [
      { "slot": 1, "platform": "甲元仙符", "op1": "真极穿空", "op2": "龙象护身" }
    ]
  },
  "opponent": {
    "entity": { "scale": 1.0 },
    "books": [ ... ]
  }
}
```

---

## Entity Attributes

The game defines 4 fundamental combat attributes (data/属性/战斗属性.md):

| Field | Chinese | Description |
|:------|:--------|:------------|
| `hp`  | 气血 | Health pool. Entity dies when HP reaches 0. |
| `atk` | 攻击 | Base attack. Skill damage scales as `(D_base / 100) × atk`. |
| `sp`  | 灵力 | Spirit power. Consumed on damage taken to generate shields. |
| `def` | 守御 | Defense. Converted to damage reduction (DR) via formula. |

### Opponent entity: absolute or scaled

The opponent entity can be specified two ways:

**Absolute** — provide all 4 values directly:
```json
"entity": { "hp": 6.6e16, "atk": 3.5184e15, "sp": 3.3309e15, "def": 7.078e10 }
```

**Scaled** — multiply all player values by a factor:
```json
"entity": { "scale": 1.0 }
```

`scale: 1.0` = mirror match. `scale: 0.8` = opponent has 80% of player stats.

Individual attributes can also be overridden alongside scale:
```json
"entity": { "scale": 1.2, "hp": 8.0e16 }
```
This scales atk/sp/def by 1.2× but uses the explicit HP value.

---

## Derived Formulas

The game does not publish its internal formulas. The simulator uses parametric
approximations that can be calibrated when real data is available.

### 守御 → Damage Reduction (DR)

```
DR = def / (def + K)
```

- `K` is the `dr_constant` in the config (`formulas.dr_constant`)
- Default: `K = 7.5e7` (yields ~99.9% DR for 守御 = 707.8亿)
- Range: DR is always in `[0, 1]`

**Calibration:** If you observe your in-game DR% with known 守御, solve for K:
```
K = def × (1 - DR) / DR
```

Example: if 守御 = 7.078e10 gives DR = 25%, then K = 7.078e10 × 0.75 / 0.25 = 2.1234e11.

State effects that modify DR (e.g., 命損 -100% DR) are additive deltas on the
computed DR value, clamped to `[0, 1]`.

### 灵力 → Shield

```
shield_pool = sp × R
```

- `R` is the `sp_shield_ratio` in the config (`formulas.sp_shield_ratio`)
- Default: `R = 1.0` (1 point of 灵力 = 1 HP of shield)
- Shield is consumed before DR is applied (damage hits shield first, remainder goes through DR)
- Shield regenerates per activation from remaining 灵力 pool (灵力 is finite per combat)

**Implemented:** Shield from 灵力 is spawned as a built-in state effect at combat
start. Each entity receives a shield with HP = `sp × sp_shield_ratio`. The shield
is consumed before DR is applied — damage hits shield first, then DR reduces the
remainder.

---

## Divine Book Spec

Each book entry follows the game's divine book construction:

```
`A`(主) + `B`(专属/【affix1】) + `C`(专属/【affix2】)
```

- **A** = main position skill book → determines the platform (skill, hit_count)
- **B** = aux-1 skill book → contributes one affix (exclusive or school/universal)
- **C** = aux-2 skill book → contributes one affix

In the config, we use the resolved affix names directly:

```json
{ "slot": 1, "platform": "甲元仙符", "op1": "真极穿空", "op2": "龙象护身" }
```

- `platform`: the main skill book name (determines skill mechanics)
- `op1`, `op2`: the affix names (not the source book names)

Affix data is looked up from `data/yaml/effects.yaml` by name. The source book
is not needed at runtime — affix values at max fusion are already in the YAML.

### Fewer than 6 books

A book set can have 1–6 entries. The simulator adapts: `max_rounds = max(player_slots, opponent_slots)`. Rounds where one side has no slot are no-ops for that side.

---

## t_gap

Time in seconds between slot activations. Default: `6`.

This drives the arena clock: after each round's slots fire, all active state effects
receive a `TICK { dt: t_gap }` event to decrement their remaining duration.
