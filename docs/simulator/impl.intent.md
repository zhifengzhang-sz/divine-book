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

# Intent Event Specification

**Date:** 2026-03-16

> Each intent event is the boundary between source and target. The source fills the fields from its own state. The target resolves the fields against its own state. Neither side reads the other's state.

---

## Principle

An intent event carries **what the source wants to do**. It does NOT carry computed results that depend on the target. If an effect depends on the target's state (like %maxHP damage depending on target's maxHp), the intent carries the **formula parameters** (the percentage), and the target computes the final value.

---

## HIT

The primary damage event. One per hit in the damage chain.

```
HIT {
  hitIndex:       number    // which hit in the sequence (0-indexed)
  damage:         number    // pre-computed 气血 damage (absolute, before target's DR)
  spDamage:       number    // 灵力 damage from resonance (absolute, before target's DR?)
  perHitEffects:  Intent[]  // additional effects per hit (e.g., PERCENT_MAX_HP_HIT)
}
```

**Source fills:**
- `damage`: computed from `(basePercent / hits / 100) × sourceATK × S_coeff × zones`. All source-side: ATK, zones from the book's damage chain. This is the raw damage BEFORE the target's DR.
- `spDamage`: from `guaranteed_resonance` handler. `mult × sourceATK`. Source-side only.
- `perHitEffects`: sub-intents that fire per hit (e.g., %maxHP damage).
- `hitIndex`: position in the hit sequence.

**Target resolves:**
1. Compute DR: `baseDR = targetDEF / (targetDEF + K)` + buff-based DR
2. `mitigatedDamage = damage × (1 - totalDR)`
3. Generate shield from SP: `shieldGen = min(targetSP, mitigated) × sp_shield_ratio`
4. Absorb with shield: `absorbed = min(mitigated, shield)`
5. `hp -= mitigated - absorbed`
6. `sp -= spDamage` (resonance — **question: does spDamage go through DR?**)
7. Process `perHitEffects` — each is another intent resolved by the target
8. Fire `on_attacked` triggers

**Open question:** Does `spDamage` (resonance/灵力 damage) go through DR or bypass it? The game says 会心 targets 灵力 — it may have its own mitigation formula separate from 守御-based DR.

---

## PERCENT_MAX_HP_HIT

Damage based on the target's max HP. Carried as a sub-intent inside HIT's `perHitEffects`.

```
PERCENT_MAX_HP_HIT {
  percent:  number   // percentage of target's maxHp (e.g., 27)
}
```

**Source fills:**
- `percent`: from the book data's `value` field. Source-side only. Source does NOT know target's maxHp.

**Target resolves:**
1. `rawDamage = (percent / 100) × target.maxHp` — uses TARGET's own maxHp
2. Apply DR: `mitigated = rawDamage × (1 - totalDR)` — it's "伤害" not "真实伤害"
3. Shield absorption → HP reduction (same as HIT resolution)

---

## HP_DAMAGE

Direct HP damage that bypasses DR and shields. For "真实伤害" (true damage) only.

```
HP_DAMAGE {
  percent:  number                       // percentage of basis
  basis:    "max" | "current" | "lost"   // which HP value to use
}
```

**Source fills:**
- `percent`: from the effect data.
- `basis`: which reference HP to use.

**Target resolves:**
1. Determine basis: `maxHp` | `current hp` | `maxHp - current hp`
2. `damage = (percent / 100) × basis`
3. `hp -= damage` — NO DR, NO shield absorption

**When to use:** Only for effects explicitly described as "真实伤害" (true damage) in the source text. Most damage is "伤害" and should use HIT or PERCENT_MAX_HP_HIT instead.

---

## APPLY_STATE

Applies a buff, debuff, or named state on the target.

```
APPLY_STATE {
  state: StateInstance {
    name:              string
    kind:              "buff" | "debuff" | "named"
    source:            string     // book that created it
    target:            "self" | "opponent"
    effects:           StateEffect[]  // stat modifiers
    remainingDuration: number     // seconds (Infinity = permanent)
    stacks:            number
    maxStacks:         number
    dispellable:       boolean
    trigger?:          "on_cast" | "on_attacked" | "per_tick"
    parent?:           string     // parent state name
  }
}
```

**Source fills:**
- All fields from the book data + handler output.
- `source`: set to the book name by the book function.
- `effects`: each `{ stat, value }` — the stat name and modifier value.
- `target`: "self" for buffs, "opponent" for debuffs.

**Target resolves:**
1. If state with same `name` exists and `stacks < maxStacks`: increment stacks
2. Otherwise: add to `states[]`
3. Recalculate effective stats (ATK, DEF, DR, etc.) from all active state effects
4. Schedule expiry on clock if `remainingDuration` is finite
5. Schedule ticks if `trigger === "per_tick"`
6. Fire `on_apply` listeners (reactive affix subscriptions)
7. Emit `STATE_APPLY` state-change event

**Stat names used in effects:**

| stat | Player field affected | Formula |
|:-----|:---------------------|:--------|
| `attack_bonus` | atk | `atk = baseAtk × (1 + sum/100)` |
| `defense_bonus` | def | `def = baseDef × (1 + sum/100)` |
| `damage_reduction` | DR | `totalDR = baseDR + sum/100` |
| `healing_received` | heal multiplier | `healMult = 1 + sum/100` |
| `skill_damage` | opponent M_skill penalty | reduces opponent's M_skill zone |
| `healing_bonus` | heal multiplier | `healMult = 1 + sum/100` |
| `final_damage_bonus` | M_final | feeds into future casts' damage chain |
| `skill_damage_increase` | M_skill | feeds into future casts' damage chain |

**Open question:** Stats like `skill_damage_increase` and `final_damage_bonus` on persistent buffs (e.g., 仙佑) — these modify the damage chain of FUTURE casts. The current player machine only recalculates ATK/DEF from states. It should also read M_skill, M_final, etc. from active buff states when computing the damage chain. This is not implemented yet.

---

## APPLY_DOT

Applies a periodic damage effect on the target.

```
APPLY_DOT {
  name:          string   // DoT state name (e.g., "噬心")
  damagePerTick: number   // damage per tick (in %ATK? or absolute? — needs verification)
  tickInterval:  number   // seconds between ticks
  duration:      number   // total duration in seconds
  source:        string   // book that created it
}
```

**Source fills:**
- `damagePerTick`: from book data. **Open question**: Is this in %ATK (needs `× sourceATK / 100`) or absolute?
- `tickInterval`, `duration`, `source`: from book data.

**Target resolves:**
1. Create a debuff state with `trigger: "per_tick"`
2. Schedule tick events on the clock at `tickInterval` intervals
3. On each tick: compute tick damage → apply as HIT? HP_DAMAGE? → emit HP_CHANGE
4. After `duration`: expire the state

**Open question:** Does DoT damage go through DR? Is `damagePerTick` in %ATK?

---

## HEAL

Heal the player.

```
HEAL {
  value:  number   // absolute heal amount (already computed from source ATK)
}
```

**Source fills:**
- `value`: computed by the handler. E.g., `self_heal` instant: `(effectValue / 100) × sourceATK`.

**Target resolves:**
1. Apply healing modifier: `effective = value × max(1 + healingReceivedSum/100, 0)`
2. `hp = min(hp + effective, maxHp)`
3. Emit `HP_CHANGE` state-change event

---

## SHIELD

Add shield HP.

```
SHIELD {
  value:     number   // shield HP amount
  duration:  number   // seconds until shield expires (0 = until consumed)
}
```

**Source fills:**
- `value`: computed by handler. **Open question**: From what source? `(effectValue / 100) × ATK`? Or `(effectValue / 100) × maxHp`? Depends on the `source` field in the book data.

**Target resolves:**
1. `shield += value`
2. If `duration > 0`: schedule shield expiry
3. Emit `SHIELD_CHANGE` state-change event

---

## HP_COST

Self-damage. Bypasses DR and shields.

```
HP_COST {
  percent:  number                // percentage of basis
  basis:    "current" | "max"     // which HP value
}
```

**Source fills:**
- `percent`: from effect data.
- `basis`: "current" for most (消耗x%当前气血值).

**Target resolves (self):**
1. `cost = (percent / 100) × (basis === "current" ? hp : maxHp)`
2. `hp = max(hp - cost, 0)` — bypasses DR and shields
3. If `hp <= 0`: DEATH
4. Emit `HP_CHANGE` state-change event

---

## LIFESTEAL

Heal based on damage dealt. Must be resolved AFTER damage is known.

```
LIFESTEAL {
  percent:      number   // percentage of damage dealt to heal
  damageDealt:  number   // actual damage dealt (filled at resolution time)
}
```

**Source fills:**
- `percent`: from effect data (e.g., 55% from 仙灵汲元).
- `damageDealt`: **0 at emission time**. The source doesn't know how much damage will be dealt (depends on target's DR).

**Target resolves:**
- **This is problematic.** The source emits LIFESTEAL but doesn't know damageDealt. The target knows how much damage was dealt (it resolved the HIT). But LIFESTEAL heals the SOURCE, not the target.
- **Resolution should be:** After the target resolves all HIT events and knows total damage taken, the TARGET sends back a "damage report" that the source uses to compute lifesteal. OR: the source estimates damage and heals optimistically. OR: lifesteal is computed by the target and sent back as a HEAL event to the source.

**Status:** Not working. The feedback loop isn't designed. This needs architectural discussion.

---

## DISPEL

Remove buff states from the target.

```
DISPEL {
  count:  number   // how many buffs to remove
}
```

**Source fills:**
- `count`: from effect data.

**Target resolves:**
1. Remove `count` buff states (oldest? random? highest priority?)
2. Recalculate effective stats
3. Emit `STATE_REMOVE` for each removed state

**Open question:** Which buffs are removed first? Oldest? Random?

---

## BUFF_STEAL

Move buff states from the target to the source.

```
BUFF_STEAL {
  count:  number   // how many buffs to steal
}
```

**Source fills:**
- `count`: from effect data.

**Target resolves:**
- **Problematic:** Stealing requires moving states from target to source. The target can remove the states, but how does it send them to the source? Needs cross-player communication back.

**Status:** Not designed. Needs the target to emit stolen states back to the source.

---

## DELAYED_BURST

Accumulate damage over time, release as burst after delay.

```
DELAYED_BURST {
  damage:  number   // accumulated damage to release
  delay:   number   // seconds until detonation
}
```

**Source fills:**
- `damage`, `delay`: from effect data.

**Target resolves:**
1. Schedule a future HP_DAMAGE or HIT event on the clock after `delay` seconds
2. When it fires: resolve the accumulated damage

**Open question:** Does the burst damage go through DR? Is the accumulated damage computed at emission time or at detonation time?

---

## SELF_CLEANSE

Remove debuff states from self.

```
SELF_CLEANSE {
  count?:  number   // how many debuffs to remove (undefined = all)
}
```

**Source fills:**
- `count`: from effect data.

**Target resolves (self):**
1. Remove `count` debuff states (or all if count undefined)
2. Recalculate effective stats
3. Emit `STATE_REMOVE` for each removed state

---

## HP_FLOOR

Set a minimum HP threshold. Prevents self-damage from killing.

```
HP_FLOOR {
  minPercent:  number   // minimum HP as % of maxHp
}
```

**Source fills:**
- `minPercent`: from effect data.

**Target resolves (self):**
1. Set a floor: `hp = max(hp, (minPercent/100) × maxHp)` after any self-damage
2. This prevents HP_COST from killing the player

---

## Summary: Source vs Target Responsibility

| Intent | Source computes | Target computes |
|:-------|:---------------|:---------------|
| HIT | damage (from ATK + zones), spDamage | DR, shield gen, shield absorb, HP reduction |
| PERCENT_MAX_HP_HIT | percent | rawDamage (from own maxHp), DR, shield, HP |
| HP_DAMAGE | percent, basis | damage (from own HP), HP reduction (no DR) |
| APPLY_STATE | all state fields | stacking, stat recalc, expiry scheduling |
| APPLY_DOT | damagePerTick, interval, duration | tick scheduling, tick damage resolution |
| HEAL | absolute value (from source ATK) | healing modifier, HP increase |
| SHIELD | absolute value | shield addition, expiry |
| HP_COST | percent, basis | HP reduction (self, no DR) |
| LIFESTEAL | percent | **broken: needs damage feedback** |
| DISPEL | count | which buffs to remove |
| BUFF_STEAL | count | **broken: needs cross-player state transfer** |
| DELAYED_BURST | damage, delay | scheduling, detonation |
| SELF_CLEANSE | count | which debuffs to remove |
| HP_FLOOR | minPercent | clamp HP after self-damage |
