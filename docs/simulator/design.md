---
initial date: 2026-03-16
dates of modification: [2026-03-16, 2026-03-17, 2026-03-18]
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

# Combat Simulator — Design Specification

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Detailed design spec.** This document specifies the concrete data structures, event types, formulas, and configuration of the combat simulator. It is implementation-agnostic — no XState, no TypeScript types. For principles, see [design.reactive.md](design.reactive.md). For XState v5 mapping, see [impl.md](impl.md).

---

## 1. Two Combat Resources

Characters have two resource pools:

| Resource | Chinese | Role | Attacked by |
|:---------|:--------|:-----|:------------|
| HP | 气血 | Primary health. Zero = death. | 攻击 (ATK) |
| SP | 灵力 | Consumed to generate 护盾 (shield) on taking damage. | 会心 (resonance) |

**Shield generation** (reactive, on taking damage):

1. `spConsumed = min(sp, mitigatedDamage / sp_shield_ratio)`
2. `shield = spConsumed × sp_shield_ratio`
3. `sp -= spConsumed`
4. `hpDamage = mitigatedDamage - shield`

When SP reaches zero, no shield is generated. All post-DR damage hits HP directly.

**SP recovery:** `sp += spRegen × dt` per second, capped at maxSp.

---

## 2. Player State

Player state contains **only combat attributes**. No scheduling, slots, or book data.

| Field | Type | Description |
|:------|:-----|:------------|
| hp | number | Current 气血 |
| maxHp | number | Maximum 气血 |
| sp | number | Current 灵力 |
| maxSp | number | Maximum 灵力 |
| spRegen | number | 灵力 recovery per second |
| shield | number | Current 护盾 HP |
| atk | number | Current effective 攻击 (base + buff modifiers) |
| baseAtk | number | Unmodified base 攻击 |
| def | number | Current effective 守御 |
| baseDef | number | Unmodified base 守御 |
| states | StateInstance[] | All active buffs, debuffs, and named states |
| alive | boolean | false when hp ≤ 0 |

### 2.1 State Instances

All active effects on a player — buffs, debuffs, named states — in a single collection.

| Field | Type | Description |
|:------|:-----|:------------|
| name | string | Display name (natural key) |
| kind | "buff" \| "debuff" \| "named" | Classification |
| source | string | Book that created it |
| target | "self" \| "opponent" | Who this state lives on |
| effects | StateEffect[] | Stat modifiers: `{ stat, value }` per stack |
| remainingDuration | number | Seconds until expiry (Infinity = permanent) |
| stacks / maxStacks | number | Stack count and cap |
| dispellable | boolean | Can be removed by dispel/cleanse |
| trigger | string? | "on_cast", "on_attacked", "per_tick" |
| parent | string? | Parent state name (child expires with parent) |

### 2.2 Effective Stats

Derived from base stats + all active state effects:

```
effectiveAtk = baseAtk × (1 + sum(attack_bonus effects) / 100)
effectiveDef = baseDef × (1 + sum(defense_bonus effects) / 100)
effectiveDR  = effectiveDef / (effectiveDef + dr_constant) + sum(damage_reduction effects) / 100
healingMult  = 1 + sum(healing_received effects) / 100
```

Recomputed whenever a state is added, removed, stacked, or expired.

---

## 3. Event Types

### 3.1 Intent Events (book actor → opponent player)

Intent events carry what the source wants to do. Computed from source state only.

| Event | Key fields | Resolution |
|:------|:-----------|:-----------|
| HIT | damage, spDamage, hitIndex, perHitEffects | DR → SP shield → shield absorb → HP → resonance SP → per-hit effects → triggers |
| PERCENT_MAX_HP_HIT | percent | `damage = percent% × target.maxHp` → DR → shield → HP |
| HP_DAMAGE | percent, basis | `damage = percent% × basis(maxHp\|hp\|lostHp)` → HP (bypasses DR) |
| APPLY_STATE | state: StateInstance | Add to states[], recalc stats, schedule expiry/ticks |
| APPLY_DOT | name, damagePerTick, tickInterval, duration | Add debuff state, schedule periodic damage |
| HEAL | value (absolute) | `hp += value × healingMult`, capped at maxHp |
| SHIELD | value, duration | `shield += value` |
| HP_COST | percent, basis | `hp -= percent% × basis` (self-damage, bypasses DR/shield) |
| LIFESTEAL | value (absolute) | `hp += value × healingMult` (self-targeted HEAL) |
| DISPEL | count | Remove N dispellable buffs |
| BUFF_STEAL | count | Remove N buffs from target, send to source as APPLY_STATE |
| SELF_CLEANSE | count? | Remove debuffs from self |
| HP_FLOOR | minPercent | `hp = max(hp, minPercent% × maxHp)` after self-damage |
| DELAYED_BURST | damage, delay | Schedule future damage |

### 3.2 State-Change Events (player → subscribers)

Emitted when player state mutates. Observable by all subscribers.

| Event | When |
|:------|:-----|
| HP_CHANGE | HP mutated (damage, healing, cost) |
| SP_CHANGE | SP mutated (shield gen, resonance, regen) |
| SHIELD_CHANGE | Shield mutated (gen, absorb, expire) |
| STAT_CHANGE | Effective stat recalculated |
| STATE_APPLY | New state added |
| STATE_EXPIRE | State duration reached zero |
| STATE_TICK | Periodic interval of active state |
| STATE_TRIGGERED | Reactive condition (on_attacked, on_cast) |
| STATE_REMOVE | State dispelled/cleansed/stolen |
| CAST_START / CAST_END | Book cast began/ended |
| DEATH | hp ≤ 0, checked via CHECK_DEATH after each time step (absorbing boundary) |

---

## 4. Named States and Reactive Affixes

Named states are event emitters. During their lifetime they emit STATE_APPLY, STATE_TICK, STATE_TRIGGERED, STATE_EXPIRE.

Affix effects subscribe via the `parent` field:

- `parent: "this"` — direct: fires on cast
- `parent: "<state_name>"` — reactive: fires when the named state emits. The `trigger` field specifies which event (per_tick, on_attacked, on_cast, or on_apply/on_expire by default)

The book actor registers reactive listeners on its player's state machine. When a named state emits, listeners react by producing new intent events.

---

## 5. Damage Chain

The book actor computes the damage chain from all its effects:

$$D_{hit}(k) = \frac{D_{base}}{n} \times (1 + S_{coeff}) \times (1 + M_{dmg} + \Delta M_{dmg}(k)) \times (1 + M_{skill} + \Delta M_{skill}(k)) \times (1 + M_{final}) \times M_{synchro}$$
$$D_{flat,hit} = \frac{D_{flat}}{n}$$
$$D_{total,hit}(k) = D_{hit}(k) + D_{flat,hit}$$

Where:
- $D_{base}$ = `base_attack.total` (% ATK)
- $n$ = number of hits
- $S_{coeff}$ = ATK scaling from `attack_bonus` (cast-scoped)
- $D_{flat}$ = flat extra damage from `flat_extra_damage`: $x/100 \times ATK$ (player's 攻击力 attribute, not scaled by zones)
- $M_{dmg}$, $M_{skill}$, $M_{final}$ = additive zones from `damage_increase`, `skill_damage_increase`, etc.
- $\Delta M_{dmg}(k)$, $\Delta M_{skill}(k)$ = per-hit escalation (from `per_hit_escalation`, stacking across sources)
- $M_{synchro}$ = multiplicative synchrony from `probability_multiplier`

One HIT intent per hit, with `damage = D_{total,hit}(k) / 100 × ATK` (absolute value). $D_{flat}$ is additive — it is not multiplied by zones. See [combat.mechanic.md §5.2](combat.mechanic.md) for derivation.

Resonance (SP damage) is separate: `spDamage = resonanceMult × ATK`, distributed across hits.

---

## 6. Hit Resolution

When a HIT intent arrives at the player state machine:

$$\text{mitigated} = \text{damage} \times (1 - DR)$$
$$DR = \frac{DEF}{DEF + K} + \sum \text{damage\_reduction effects} / 100$$

Then:
1. SP → shield: $\text{spConsumed} = \min(SP, \text{mitigated} / \text{sp\_shield\_ratio})$, $\text{shield} = \text{spConsumed} \times \text{sp\_shield\_ratio}$, $SP \mathrel{-}= \text{spConsumed}$
2. HP reduction: $HP \mathrel{-}= \text{mitigated} - \text{shield}$
3. Resonance: $SP \mathrel{-}= \text{spDamage}$
4. Per-hit effects (e.g., PERCENT_MAX_HP_HIT → computed from target's own maxHp → DR → SP shield → HP)
5. on_attacked triggers → may produce new intents

Death is **deferred**: HP may reach 0 during hit resolution, but the player continues processing events for the current time step. Both players at the same time must complete their casts before either dies. Death is checked via `CHECK_DEATH` after each time step (see §7.1).

---

## 7. Time Model

The virtual clock is a priority queue of timed events. No game loop.

### 7.1 Cast Schedule (PvP)

| Time (s) | Event |
|:---------|:------|
| 0, 6, 12, 18, 24, 30 | Both players cast their slot (1 through 6) |

Within each cast, hits are spread ~1s apart via XState's delayed `sendTo`. Both players' hits at the same time step resolve before either can die.

**Death checking:** After each second of clock time, both players receive `CHECK_DEATH`. If HP ≤ 0, the player transitions to the `dead` final state. This ensures simultaneous casts resolve fairly — neither player has a first-mover advantage.

### 7.2 Timed Events

Scheduled on the clock when effects are applied:
- HIT delivery at `t + hitIndex × 1000ms` (per-hit delay within a cast)
- STATE_EXPIRE at `t + duration`
- STATE_TICK at `t + tickInterval`, `t + 2×tickInterval`, ...
- SP_REGEN every second
- DELAYED_BURST at `t + delay`
- CHECK_DEATH every second (from arena)

---

## 8. Configuration

### 8.1 Player Configuration

| Field | Description |
|:------|:------------|
| entity.hp, atk, sp, def, spRegen | Base combat attributes |
| formulas.dr_constant | DR formula: K in `DEF / (DEF + K)` |
| formulas.sp_shield_ratio | SP → shield conversion rate |
| progression.enlightenment | 悟境 (0-10), selects effect tiers |
| progression.fusion | 融合重数, selects effect tiers |
| books[1..6] | Six book slot configurations |

### 8.2 Book Slot

| Field | Description |
|:------|:------------|
| slot | Position (1-6) |
| platform | Main book name |
| op1, op2 | Aux affix names |

### 8.3 Validation

Before simulation:
1. All books and affixes exist in YAML data
2. Each book has usable tiers at the player's progression
3. No duplicate platforms (核心冲突)
4. All effects in all configured books have handlers

Invalid = reject with descriptive error. No silent degradation.

### 8.4 Tier Selection

Effects have `data_state` requirements (`enlightenment=N`, `fusion=M`, or `locked`). The simulator selects the highest tier per effect type **within each source** (skill, primary affix, exclusive affix, each aux affix independently). Effects of the same type from different sources are independent — never deduped across sources.

---

## 9. Monte Carlo

For win rate estimation: run N fights with seeds `baseSeed + 1` through `baseSeed + N`. Same seed = same fight. Aggregate wins, compute confidence interval.

RNG affects: `probability_multiplier` tier selection, `chance`-based triggers, `guaranteed_resonance` upgrade roll.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-16 | Initial design spec |
| 2.0 | 2026-03-16 | Added SP system (§2), per-hit resolution (§7), hit interleaving (§8.2), reactive affixes (§3.4) |
| 3.0 | 2026-03-16 | %maxHP goes through DR. PERCENT_MAX_HP_HIT carries percentage, target resolves. attack_bonus is S_coeff zone. Tier selection per-source. |
| 4.0 | 2026-03-17 | **Full rewrite.** Two-level architecture: player state machine + book actor. Removed imperative patterns (pendingHits, arena routing). Intent events sent directly by book actor. Aligned with rewritten design.reactive.md. Damage chain formula with LaTeX. Document history added. |
| 4.1 | 2026-03-18 | D_flat moved out of base damage — additive after zone multiplication, not inside. Aligned with combat.mechanic.md §5.2 derivation. |
| 4.2 | 2026-03-18 | SP→shield formula rewritten (consumable pool model). Death deferred via CHECK_DEATH per time step. Hits spread ~1s apart via delayed sendTo. DELIVER_HIT event added. |
