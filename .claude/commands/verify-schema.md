# Agent: Verify Schema (keyword.map ↔ normalized.data)

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Schema verification agent.** Validates that `normalized.data` conforms to the type system defined in `keyword.map`. Checks effect type names, field names, unit consistency, and data_state vocabulary. Does not look at `about.md` — that is the coverage agent's job.

## Inputs

| File | Role |
|:---|:---|
| `docs/data/keyword.map.md` (or `.cn.md`) | Schema definition — effect types, fields, units, vocabularies |
| `docs/data/normalized.data.md` (or `.cn.md`) | Data to validate |

## Checks

### Check 1: Effect Type Existence

For every `effect_type` value in normalized.data tables:

- **PASS**: The effect_type exists in keyword.map (in any section §0–§13).
- **FAIL**: The effect_type is not defined in keyword.map.

Report: list of unknown effect_types with their location (book/affix name, row number).

### Check 2: Field Name Validity

For every row in normalized.data, parse the `fields` column into `key=value` pairs. For each key:

- **PASS**: The key appears in the "Fields → Units" column for that effect_type in keyword.map.
- **WARN**: The key is `parent`, `name`, or `condition` — these are structural fields valid for any effect_type.
- **FAIL**: The key is not defined for that effect_type and is not a structural field.

Report: list of invalid field names with their effect_type and location.

### Check 3: Data State Vocabulary

For every `data_state` value in normalized.data:

- **PASS**: The value matches one of the patterns defined in keyword.map's "Data State Vocabulary" section:
  - Empty (default for school)
  - `enlightenment={n}` where n is an integer
  - `max_fusion`
  - `fusion={n}` where n is an integer
  - `locked`
  - Compound: `[val1, val2]` where each val matches the above
- **FAIL**: The value does not match any defined pattern.

Report: list of invalid data_state values with their location.

### Check 4: Value Type Consistency

For each `key=value` pair, check that the value is plausible for the unit type defined in keyword.map:

| Unit | Expected value pattern |
|:---|:---|
| `%atk`, `%stat`, `%max_hp`, `%lost_hp`, `%current_hp` | Numeric (integer or decimal) |
| `seconds` | Numeric (integer or decimal) |
| `count` | Integer |
| `probability` | Numeric, typically 0–100 |
| `multiplier` | Numeric |
| `bool` | `true` or `false` |
| `string` | Non-empty text |

- **PASS**: Value matches expected pattern for its unit.
- **WARN**: Value is plausible but unusual (e.g., probability > 100).
- **FAIL**: Value type mismatch (e.g., text where numeric expected).

Report: list of type mismatches with their location.

### Check 5: Unused Effect Types (Advisory)

For each effect_type defined in keyword.map, check whether it appears at least once in normalized.data.

- **INFO**: effect_type defined but never used. This is expected for types that only appear in shared mechanics (excluded from normalized.data) or for types that no current book uses.

Report: list of unused effect_types (informational, not an error).

## Output Format

```
## Schema Verification Report

### Summary
- Total rows checked: N
- Effect types: N unique, N valid, N unknown
- Field names: N total, N valid, N invalid
- Data states: N total, N valid, N invalid
- Value types: N checked, N valid, N warnings, N failures

### Failures (must fix)
1. [FAIL] effect_type "xxx" not in keyword.map — location: `BookName` Main Skill, row 3
2. [FAIL] field "xxx" not valid for effect_type "yyy" — location: ...

### Warnings (review)
1. [WARN] probability value 120 exceeds 100 — location: ...

### Info
1. [INFO] effect_type "cooldown" defined in keyword.map §0 but unused (excluded: shared mechanics)
```

## Process

1. **Parse keyword.map** into a lookup structure:
   - `effect_types`: set of all defined effect_type names
   - `fields_for_type[effect_type]`: set of valid field names
   - `unit_for_field[effect_type][field]`: expected unit
   - `data_state_patterns`: set of valid patterns

2. **Parse normalized.data** tables:
   - Split by `|`, strip whitespace
   - Parse `key=value` pairs from fields column
   - Parse data_state column (handle `[]` array notation)

3. **Run checks 1–5** in order. Accumulate results.

4. **Output report** in the format above.
