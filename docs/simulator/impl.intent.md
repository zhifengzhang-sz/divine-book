<style>
body { max-width: none !important; width: 95% !important; margin: 0 auto !important; padding: 20px 40px !important; background-color: #282c34 !important; color: #abb2bf !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important; line-height: 1.6 !important; }
h1, h2, h3, h4, h5, h6 { color: #ffffff !important; }
code { background-color: #3e4451 !important; color: #e5c07b !important; padding: 2px 6px !important; border-radius: 3px !important; }
pre { background-color: #2c313a !important; border: 1px solid #4b5263 !important; border-radius: 6px !important; padding: 16px !important; }
pre code { background-color: transparent !important; color: #abb2bf !important; padding: 0 !important; }
table { border-collapse: collapse !important; width: auto !important; margin: 16px 0 !important; }
table th, table td { border: 1px solid #4b5263 !important; padding: 8px 10px !important; }
table th { background: #3e4451 !important; color: #e5c07b !important; text-align: center !important; }
table td { background: #2c313a !important; font-size: 12px !important; }
strong { color: #e5c07b !important; }
</style>

# Intent Event Specification

**Date:** 2026-03-16

> Each intent event is sent by a **book actor** to the **opponent's player state machine**. The book fills the fields from the source's state. The player resolves the fields against its own state. Neither side reads the other's state.

---

## HIT

Primary damage event. One per hit in the damage chain.

| Field | Filled by book (source) | Resolved by player (target) |
|:------|:----------------------|:---------------------------|
| `damage` | `(basePercent/hits/100) × ATK × (1+S_coeff) × zones` | `mitigated = damage × (1 - DR)` → shield → HP |
| `spDamage` | `resonanceMult × ATK` (from guaranteed_resonance) | `sp -= spDamage` |
| `hitIndex` | Position in hit sequence (0-indexed) | Logging/tracing |
| `perHitEffects` | Sub-intents per hit (e.g., PERCENT_MAX_HP_HIT) | Resolve each as a separate intent |

---

## PERCENT_MAX_HP_HIT

Damage based on target's max HP. Carried inside HIT's `perHitEffects`.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `percent` | From effect data (e.g., 27) | `rawDamage = percent/100 × own maxHp` → apply DR → shield → HP |

Source carries the percentage. Target computes the damage from its own maxHp. This is "伤害" (normal damage), not "真实伤害" (true damage) — it goes through DR.

---

## APPLY_STATE

Applies a buff, debuff, or named state.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `state.name` | From effect data | Key for stacking, parent-child |
| `state.kind` | "buff", "debuff", or "named" | Classification |
| `state.source` | Book name | Tracing |
| `state.effects[]` | `{ stat, value }` pairs | Recalculate effective stats |
| `state.remainingDuration` | From effect data (seconds) | Schedule expiry on clock |
| `state.stacks/maxStacks` | From effect data | Stacking logic |
| `state.dispellable` | From effect data | Whether DISPEL can remove it |
| `state.trigger` | "on_cast", "on_attacked", "per_tick" | Schedule tick events, fire on triggers |
| `state.parent` | Parent state name | Expire when parent expires |

---

## APPLY_DOT

Periodic damage over time.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `name` | From effect data (e.g., "噬心") | State identity |
| `damagePerTick` | `(value/100) × ATK` — computed from source ATK | Each tick: resolve as HIT (goes through DR) |
| `tickInterval` | From effect data (seconds) | Schedule ticks on clock |
| `duration` | From effect data (seconds) | Schedule expiry |
| `source` | Book name | Tracing |

`damagePerTick` is in %ATK — the source text says "550%攻击力的伤害". The book computes the absolute value from source ATK.

---

## HEAL

Heal the player. Self-targeted — sent to own player.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `value` | `(effectValue/100) × ATK` — absolute heal amount | `effective = value × max(1 + healingReceived/100, 0)` → `hp = min(hp + effective, maxHp)` |

---

## SHIELD

Add shield HP. Self-targeted.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `value` | Depends on `source` field: `self_max_hp` → `(v/100) × maxHp`, otherwise `(v/100) × ATK` | `shield += value` |
| `duration` | From effect data (0 = until consumed) | Schedule expiry if > 0 |

---

## HP_COST

Self-damage. Bypasses DR and shields. Self-targeted.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `percent` | From effect data | `cost = percent/100 × basis` |
| `basis` | "current" or "max" | `hp -= cost` (no DR, no shield) |

---

## LIFESTEAL

Heal based on damage dealt. Self-targeted. Computed entirely by the book.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `value` | `lifestealPercent/100 × totalHitDamage` — book knows the total damage in its HIT intents | `hp = min(hp + value, maxHp)` (apply healing modifier) |

The book computes `totalHitDamage` as the sum of all HIT.damage values it produced. This is source-side damage (before target DR). The lifesteal heal is based on what the source dealt, not what the target received. No feedback needed.

---

## DISPEL

Remove buff states from target.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `count` | From effect data | Remove `count` dispellable buff states |

---

## BUFF_STEAL

Remove buffs from target, apply them to source.

| Field | Filled by book | Resolved by player (target) |
|:------|:--------------|:---------------------------|
| `count` | From effect data | Remove `count` buffs → send them back to source player as APPLY_STATE events |

Target removes the buffs and sends APPLY_STATE intents back to the source's player state machine. Two-step: target removes, then sends.

---

## SELF_CLEANSE

Remove debuff states from self. Self-targeted.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `count` | From effect data (undefined = all) | Remove `count` debuff states |

---

## HP_FLOOR

Set minimum HP threshold. Self-targeted. Prevents self-damage from killing.

| Field | Filled by book | Resolved by player |
|:------|:--------------|:-------------------|
| `minPercent` | From effect data | After any HP_COST: `hp = max(hp, minPercent/100 × maxHp)` |

---

## DELAYED_BURST

Accumulate damage, release after delay.

| Field | Filled by book | Resolved by player (target) |
|:------|:--------------|:---------------------------|
| `damage` | From effect data + source ATK | Schedule: after `delay` seconds, resolve as HIT |
| `delay` | From effect data (seconds) | Schedule on clock |
