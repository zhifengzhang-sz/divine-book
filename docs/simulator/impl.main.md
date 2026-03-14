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

# Effect Simulations & Combinators

## Overview

Three layers:

1. **Contracts** (in `contract.main.md`) — intent schemas that cross the entity boundary
2. **Simulations** — per-effect-type functions that produce intents conforming to the contracts
3. **Combinators** — compose simulations into a book actor

Every simulation is a pure function:

```typescript
type Simulate = (config: EffectRow, owner: OwnerStats) => Intent[]
```

Effects come in two kinds:

- **Producers** — emit one or more intents
- **Modifiers** — transform a producer's output (no intent of their own)

## Owner Stats

What the entity SM provides to the book when it activates:

```typescript
interface OwnerStats {
  id: string;
  atk: number;          // base ATK
  effective_atk: number; // ATK × (1 + buff multipliers)
  hp: number;           // current HP
  max_hp: number;
  def: number;
  sp: number;
}
```

The book never reads opponent state. Anything that depends on opponent state is emitted as an **operator** — a formula the receiver evaluates.

---

## Producers

### `base_attack`

Core damage effect. Present in all 28 books.

```
Config:  { type: "base_attack", hits: 6, total: 20265 }
Owner:   { effective_atk: 1000 }

amount_per_hit = (total / 100) × effective_atk / hits
               = (20265 / 100) × 1000 / 6
               = 33,775

→ ATK_DAMAGE { amount_per_hit: 33775, hits: 6, dr_bypass: 0, source: owner.id }
```

Emits per-hit amounts (not a lump sum) because the receiver needs per-hit granularity for shield absorption, counter triggers, and per-hit debuff stacking.

### `self_hp_cost`

```
Config:  { type: "self_hp_cost", value: 20 }
Owner:   { hp: 800000 }

amount = (value / 100) × hp
       = 160000

→ HP_COST { amount: 160000 }
```

Based on **current** HP, not max. Self-effect — entity SM deducts before the book's other effects resolve.

### `self_buff`

```
Config:  { type: "self_buff", name: "仙佑", attack_bonus: 70, defense_bonus: 70, hp_bonus: 70, duration: 12 }

→ SELF_BUFF { id: "仙佑", atk_percent: 70, def_percent: 70, hp_percent: 70, duration: 12 }
```

Entity SM creates a temporary state. While active: `effective_atk = atk × (1 + 0.70)`.

### `shield`

```
Config:  { type: "shield", value: 12, source: "self_max_hp", duration: 8 }
Owner:   { max_hp: 1000000 }

amount = (value / 100) × max_hp
       = 120000

→ SHIELD { amount: 120000, duration: 8 }
```

### `self_heal`

```
Config:  { type: "self_heal", value: 20, source: "self_max_hp" }
Owner:   { max_hp: 1000000 }

amount = (value / 100) × max_hp
       = 200000

→ HEAL { amount: 200000 }
```

### `debuff`

```
Config:  { type: "debuff", name: "落星", target: "final_damage_reduction", value: -8,
           duration: 4, per_hit_stack: true, dispellable: false }

→ APPLY_DEBUFF { id: "落星", stat: "final_damage_reduction", value: -8,
                  duration: 4, per_hit_stack: true, dispellable: false }
```

Config maps directly to the contract. The receiver creates the state on itself.

### `dot`

```
Config:  { type: "dot", name: "贪妄业火", percent_current_hp: 3,
           tick_interval: 1, duration: 8, per_hit_stack: true }

→ APPLY_DOT { id: "贪妄业火", percent: 3, basis: "current",
               tick_interval: 1, duration: 8, per_hit_stack: true }
```

Receiver creates the DoT. Each tick: `damage = 3% × receiver.current_hp`. The attacker is not involved after sending.

### `percent_max_hp_damage`

Operator — the receiver evaluates against its own HP.

```
Config:  { type: "percent_max_hp_damage", value: 27 }

→ HP_DAMAGE { percent: 27, basis: "max", source: owner.id }
```

Receiver computes: `27% × own max_hp`, then applies own DR.

### `percent_current_hp_damage`

```
Config:  { type: "percent_current_hp_damage", value: 1.5, per_prior_hit: true }

→ HP_DAMAGE { percent: 1.5, basis: "current", per_prior_hit: true, source: owner.id }
```

`per_prior_hit`: damage scales by how many prior hits the target received this combat. Receiver evaluates.

### `counter_buff`

Registers a reactive trigger on self. Does not emit a cross-entity intent immediately.

```
Config:  { type: "counter_buff", name: "极怒", duration: 4,
           reflect_received_damage: 50, reflect_percent_lost_hp: 15 }

→ COUNTER_STATE { id: "极怒", duration: 4,
    on_hit: {
      reflect_received_damage: 50,   // 50% of damage received → COUNTER_DAMAGE to attacker
      reflect_percent_lost_hp: 15,   // 15% of own lost HP → COUNTER_DAMAGE to attacker
    }
  }
```

When the entity is later hit, it evaluates the counter against its own state:

```
received 100000 damage, own lost_hp = 300000

counter_damage = (50/100) × 100000 + (15/100) × 300000
               = 50000 + 45000 = 95000

→ sends COUNTER_DAMAGE { amount: 95000 } to attacker
```

### `counter_debuff`

Registers a reactive that applies debuffs on the attacker when hit.

```
Config:  { type: "counter_debuff", name: "罗天魔咒", duration: 8, on_attacked_chance: 30 }

→ COUNTER_STATE { id: "罗天魔咒", duration: 8,
    on_hit: {
      chance: 30,
      apply_to_attacker: [
        APPLY_DOT { id: "噬心魔咒", percent: 7, basis: "current", ... },
        APPLY_DOT { id: "断魂之咒", percent: 7, basis: "lost", ... },
      ]
    }
  }
```

The child effects (噬心之咒, 断魂之咒) are separate effects in the parsed data linked via `parent`. The combinator collects them under the parent counter.

### `buff_steal`

```
Config:  { type: "buff_steal", count: 2 }

→ BUFF_STEAL { count: 2, source: owner.id }
```

Receiver removes up to 2 dispellable buffs from itself and sends them back as `RECEIVE_STOLEN_BUFF` events.

### `delayed_burst`

```
Config:  { type: "delayed_burst", name: "无相魔劫", duration: 12,
           damage_increase_during: 10, burst_base: 5000, burst_accumulated_pct: 10 }
Owner:   { effective_atk: 1000 }

burst_base_amount = (5000 / 100) × effective_atk = 50000

→ DELAYED_BURST { id: "无相魔劫", duration: 12,
                   damage_increase_during: 10,
                   burst_base_amount: 50000,
                   burst_accumulated_pct: 10 }
```

Receiver creates the state. During the 12s, incoming damage is increased by 10%. On expiry, receiver takes: `burst_base_amount + 10% of the bonus damage accumulated during the state`.

### `periodic_dispel`

```
Config:  { type: "periodic_dispel", count: 2 }

→ DISPEL { count: 2 }
```

### `shield_destroy_damage`

```
Config:  { type: "shield_destroy_damage", shields_per_hit: 1, percent_max_hp: 12,
           no_shield_double_cap: 4800, name: "寂灭剑心", duration: 4 }

→ SHIELD_DESTROY { count: 1, bonus_hp_damage: 12,
                    no_shield_double: true, duration: 4, source: owner.id }
```

### `self_cleanse`

```
Config:  { type: "self_cleanse", count: 2 }

→ CLEANSE { count: 2 }
```

Self-effect. Entity SM removes up to 2 debuffs from itself.

### `summon`

```
Config:  { type: "summon", inherit_percent: 54, duration: 16 }

→ SUMMON { inherit_percent: 54, duration: 16 }
```

Self-effect. Entity SM creates a clone actor that copies `54%` of owner stats.

### `untargetable_state`

```
Config:  { type: "untargetable_state", duration: 4 }

→ UNTARGETABLE { duration: 4 }
```

Self-effect. Entity SM drops incoming intents for 4 seconds.

### `lifesteal`

```
Config:  { type: "lifesteal", value: 82 }

→ LIFESTEAL { percent: 82 }
```

Self-effect. After ATK_DAMAGE is computed, entity SM heals `82%` of the raw damage dealt.

---

## Modifiers

Modifiers don't emit intents. They transform a producer's output. Each modifier specifies which producer it targets.

### `per_hit_escalation` → modifies `ATK_DAMAGE`

```
Config:  { type: "per_hit_escalation", value: 42.5, stat: "skill_bonus" }

Transform(ATK_DAMAGE):
  hit 0: amount × 1.0
  hit 1: amount × (1 + 0.425)
  hit 2: amount × (1 + 0.850)
  hit N: amount × (1 + N × 0.425)
```

Changes uniform per-hit damage into escalating per-hit damage.

### `self_lost_hp_damage` → modifies `ATK_DAMAGE`

```
Config:  { type: "self_lost_hp_damage", value: 10 }
Owner:   { hp: 700000, max_hp: 1000000 }

Transform(ATK_DAMAGE):
  extra = (value / 100) × (max_hp - hp)
        = (10 / 100) × 300000 = 30000
  ATK_DAMAGE.amount_per_hit += extra / hits
```

Adds flat damage from own lost HP. Self-resolved — book knows owner stats.

### `shield_strength` → modifies `SHIELD`

```
Config:  { type: "shield_strength", value: 21.5 }
Owner:   { max_hp: 1000000 }

Transform(SHIELD):
  SHIELD.amount = (21.5 / 100) × max_hp = 215000
```

Replaces shield amount. The raw text "提升至" means "raised to", not "add".

### `self_buff_extra` → modifies `SELF_BUFF`

```
Config:  { type: "self_buff_extra", buff_name: "仙佑", healing_bonus: 190 }

Transform(SELF_BUFF where id == "仙佑"):
  SELF_BUFF.healing_percent = 190
```

Adds a field to an existing self-buff.

### `self_buff_extend` → modifies `SELF_BUFF`

```
Config:  { type: "self_buff_extend", value: 3.5 }

Transform(SELF_BUFF):
  SELF_BUFF.duration += 3.5
```

### `counter_debuff_upgrade` → modifies `COUNTER_STATE`

```
Config:  { type: "counter_debuff_upgrade", on_attacked_chance: 60 }

Transform(COUNTER_STATE):
  COUNTER_STATE.on_hit.chance = 60   (was 30)
```

### `delayed_burst_increase` → modifies `DELAYED_BURST`

```
Config:  { type: "delayed_burst_increase", value: 65 }

Transform(DELAYED_BURST):
  DELAYED_BURST.burst_base_amount *= (1 + 0.65)
```

### `conditional_damage` → modifies `ATK_DAMAGE`

```
Config:  { type: "conditional_damage", value: 50, condition: "target_hp_below_30" }

Transform(ATK_DAMAGE):
  Wraps in an operator: { condition: "target_hp_below_30", bonus_percent: 50 }
  Receiver evaluates: if own hp < 30% max_hp → ATK_DAMAGE.amount × 1.5
```

### `per_enemy_lost_hp` → modifies `ATK_DAMAGE`

```
Config:  { type: "per_enemy_lost_hp", per_percent: 0.4 }

Transform(ATK_DAMAGE):
  Attaches operator: { per_enemy_lost_hp: 0.4 }
  Receiver evaluates: bonus = lost_hp% × 0.4% → ATK_DAMAGE.amount × (1 + bonus/100)
```

### `per_debuff_stack_damage` → modifies `ATK_DAMAGE`

```
Config:  { type: "per_debuff_stack_damage", value: 50, max_stacks: 10 }

Transform(ATK_DAMAGE):
  Attaches operator: { per_debuff_stack: 50, max_stacks: 10 }
  Receiver evaluates: bonus = min(debuff_count, 10) × 50% → ATK_DAMAGE.amount × (1 + bonus/100)
```

### `periodic_escalation` → modifies `ATK_DAMAGE`

```
Config:  { type: "periodic_escalation", value: 1.4, every_n_hits: 2, max: 10 }

Transform(ATK_DAMAGE):
  Every 2 hits, remaining damage is multiplied by 1.4×. Compounds up to 10 times.
```

### `crit_damage_bonus` → modifies `ATK_DAMAGE`

```
Config:  { type: "crit_damage_bonus", value: 100 }

Transform(ATK_DAMAGE):
  ATK_DAMAGE.crit_bonus += 100
```

Self-resolved. Applied before emission.

### `self_damage_taken_increase` → self modifier

```
Config:  { type: "self_damage_taken_increase", value: 50, duration: 8 }

→ SELF_DAMAGE_INCREASE { percent: 50, duration: 8 }
```

Self-effect. Entity SM increases its own incoming damage for 8s. This is a producer that emits a self-intent, despite being a "modifier" in game terms.

---

## Combinator

The book simulation runs two passes over its effect list:

```
function simulate_book(effects: EffectRow[], owner: OwnerStats): Intent[] {
  // Pass 1: run producers
  const intents: Intent[] = []
  for (const e of effects) {
    if (isProducer(e.type)) {
      intents.push(...simulate(e, owner))
    }
  }

  // Pass 2: apply modifiers
  for (const e of effects) {
    if (isModifier(e.type)) {
      applyModifier(e, intents, owner)
    }
  }

  return intents
}
```

### Modifier targeting

Each modifier knows which producer it transforms:

| Modifier | Targets | Match by |
|---|---|---|
| `per_hit_escalation` | `ATK_DAMAGE` | type |
| `self_lost_hp_damage` | `ATK_DAMAGE` | type |
| `conditional_damage` | `ATK_DAMAGE` | type |
| `per_enemy_lost_hp` | `ATK_DAMAGE` | type |
| `per_debuff_stack_damage` | `ATK_DAMAGE` | type |
| `periodic_escalation` | `ATK_DAMAGE` | type |
| `crit_damage_bonus` | `ATK_DAMAGE` | type |
| `shield_strength` | `SHIELD` | type |
| `self_buff_extra` | `SELF_BUFF` | type + `buff_name` matches `id` |
| `self_buff_extend` | `SELF_BUFF` | type |
| `counter_debuff_upgrade` | `COUNTER_STATE` | type |
| `delayed_burst_increase` | `DELAYED_BURST` | type |

### Parent-child assembly

Some effects have `parent` fields linking them to a counter state. The combinator groups children under their parent:

```yaml
# Parsed effects (大罗幻诀):
- type: counter_debuff        # producer → COUNTER_STATE
  name: 罗天魔咒
- type: dot                    # producer → APPLY_DOT
  name: 噬心魔咒
  parent: 罗天魔咒             # ← linked to counter
- type: dot
  name: 断魂之咒
  parent: 罗天魔咒             # ← linked to counter
```

The combinator collects children by `parent` and nests them under the counter's `on_hit.apply_to_attacker` list. These DoTs are not sent immediately — they are sent reactively when the counter triggers.

### Worked example: 煞影千幻

Parser output:

```yaml
skill:
  - type: self_hp_cost          # producer
    value: 20
  - type: base_attack           # producer
    hits: 3, total: 1500
  - type: self_lost_hp_damage   # modifier → ATK_DAMAGE
    value: 10
  - type: shield                # producer
    value: 12, duration: 8
  - type: debuff                # producer
    name: 落星, value: -8, duration: 4
primary_affix:
  - type: shield_strength       # modifier → SHIELD
    value: 21.5
```

Owner: `{ effective_atk: 50000, hp: 800000, max_hp: 1000000 }`

**Pass 1** (producers):

```
self_hp_cost  → HP_COST { amount: 160000 }
base_attack   → ATK_DAMAGE { amount_per_hit: 250000, hits: 3 }
shield        → SHIELD { amount: 120000, duration: 8 }
debuff        → APPLY_DEBUFF { id: "落星", stat: "final_damage_reduction",
                                value: -8, duration: 4, per_hit_stack: true }
```

**Pass 2** (modifiers):

```
self_lost_hp_damage modifies ATK_DAMAGE:
  extra = 10% × (1000000 - 800000) = 20000
  ATK_DAMAGE.amount_per_hit += 20000 / 3 = 6667
  → ATK_DAMAGE { amount_per_hit: 256667, hits: 3 }

shield_strength modifies SHIELD:
  → SHIELD { amount: 215000, duration: 8 }
```

**Final intents**:

```
Self:
  HP_COST { amount: 160000 }
  SHIELD { amount: 215000, duration: 8 }

Opponent:
  ATK_DAMAGE { amount_per_hit: 256667, hits: 3, dr_bypass: 0 }
  APPLY_DEBUFF { id: "落星", stat: "final_damage_reduction",
                  value: -8, duration: 4, per_hit_stack: true, dispellable: false }
```

Entity SM routes: apply self-intents to own state, send opponent-intents to event bus.

### Worked example: 大罗幻诀

Parser output:

```yaml
skill:
  - type: base_attack
    hits: 5, total: 20265
  - type: counter_debuff
    name: 罗天魔咒, duration: 8, on_attacked_chance: 30
  - type: dot
    name: 噬心魔咒, parent: 罗天魔咒
    percent_current_hp: 7, tick_interval: 0.5, duration: 4, max_stacks: 5
  - type: dot
    name: 断魂之咒, parent: 罗天魔咒
    percent_lost_hp: 7, tick_interval: 0.5, duration: 4, max_stacks: 5
primary_affix:
  - type: counter_debuff_upgrade
    on_attacked_chance: 60
  - type: cross_slot_debuff
    name: 命損, target: final_damage_reduction, value: -100, duration: 8, trigger: on_attacked
```

Owner: `{ effective_atk: 50000 }`

**Pass 1** (producers):

```
base_attack      → ATK_DAMAGE { amount_per_hit: 202650, hits: 5 }
counter_debuff   → COUNTER_STATE { id: "罗天魔咒", duration: 8,
                     on_hit: { chance: 30, apply_to_attacker: [] } }
dot (噬心魔咒)   → parent=罗天魔咒 → nested under COUNTER_STATE.on_hit
dot (断魂之咒)   → parent=罗天魔咒 → nested under COUNTER_STATE.on_hit
cross_slot_debuff → COUNTER_STATE.on_hit gains 命損 debuff
```

**Pass 2** (modifiers):

```
counter_debuff_upgrade modifies COUNTER_STATE:
  on_hit.chance = 60
```

**Final intents**:

```
Self:
  COUNTER_STATE { id: "罗天魔咒", duration: 8,
    on_hit: {
      chance: 60,
      apply_to_attacker: [
        APPLY_DOT { id: "噬心魔咒", percent: 7, basis: "current",
                     tick_interval: 0.5, duration: 4, max_stacks: 5 },
        APPLY_DOT { id: "断魂之咒", percent: 7, basis: "lost",
                     tick_interval: 0.5, duration: 4, max_stacks: 5 },
        APPLY_DEBUFF { id: "命損", stat: "final_damage_reduction",
                        value: -100, duration: 8 },
      ]
    }
  }

Opponent:
  ATK_DAMAGE { amount_per_hit: 202650, hits: 5 }
```

The counter state is a self-effect. When the entity later receives a HIT, it rolls 60% chance, and if successful sends the three APPLY_DOT/APPLY_DEBUFF intents to the attacker via the event bus.

---

## Open Questions

These must be resolved before implementation.

### 1. Operator vs snapshot for opponent-dependent conditionals

Three modifiers need opponent state to compute the damage bonus:

| Modifier | Reads | Books |
|---|---|---|
| `per_enemy_lost_hp` | opponent lost HP % | 通天剑诀 |
| `per_debuff_stack_damage` | opponent debuff count | 天魔降临咒, 解体化形 |
| `conditional_damage` | opponent HP below threshold | 玉书天戈符, 九天真雷诀 |

**Option A — Operator**: the book attaches a formula to the ATK_DAMAGE intent. The receiver evaluates the formula against its own state and scales the damage. Clean separation, but the receiver does more work and the sender doesn't know the final damage (matters for lifesteal).

**Option B — Snapshot**: the arena provides an opponent snapshot at round start (simultaneous resolution). The book pre-computes the bonus. Simpler computation, but the book now has a dependency on opponent state.

**Interaction with lifesteal**: 疾风九变 has `lifesteal: 82`. If the damage amount isn't known until the receiver evaluates operators, the sender can't compute the lifesteal heal. Options:
- Lifesteal is also an operator: "heal attacker by 82% of effective damage dealt". Receiver sends a HEAL_BACK event after applying damage.
- Accept that lifesteal is approximate: compute it on pre-operator damage.

### 2. Self-effect ordering within a book activation

Some effects depend on the result of others within the same activation:

- `self_hp_cost` reduces own HP → `self_lost_hp_damage` reads own lost HP for bonus damage
- `base_attack` produces damage → `lifesteal` heals based on that damage
- `self_hp_cost` reduces HP → `shield` amount might depend on current vs max HP

The two-pass combinator (producers then modifiers) doesn't enforce ordering among producers. Should the combinator define a fixed execution order?

Proposed order:
1. `HP_COST` (self-damage first — increases lost HP for subsequent calculations)
2. `ATK_DAMAGE` + modifiers (damage computation, including `self_lost_hp_damage`)
3. `HP_DAMAGE` (opponent-HP-based damage)
4. `APPLY_DEBUFF`, `APPLY_DOT`, `DELAYED_BURST` (state intents)
5. `SHIELD`, `SELF_BUFF`, `COUNTER_STATE` (self-state)
6. `HEAL`, `LIFESTEAL` (healing last — depends on damage dealt)
7. `DISPEL`, `BUFF_STEAL`, `CLEANSE` (state removal)

### 3. Relationship to existing simulator code

The current `lib/simulator/` has arena, entity, state-effect machines (119 passing tests). The new design changes the architecture fundamentally — entity becomes the primary actor, books become child actors, arena becomes a clock.

Options:
- **Rebuild**: start fresh in a new directory, keep old code until new one is proven
- **Refactor**: incrementally reshape existing code to match new design
- **Parallel**: build the effect simulations and combinator as pure functions first (testable without actors), then wire into actors later

### 4. ~~How does the receiver apply multiple intents from one activation?~~ RESOLVED

**Assumption**: all intents from one activation are simultaneous. When debuff and damage arrive together, the debuff is active and the damage is calculated against the debuffed state.

### 5. DoT ticking — who manages the clock?

When an APPLY_DOT is received, the receiver creates a state on itself. That state needs to tick (deal damage every N seconds). Who sends the tick?

- **Entity SM self-ticks**: the entity manages all its own state durations and ticks DoTs against itself. Clean sovereignty — no external actor manages the entity's states.
- **Arena sends TICK**: the arena (clock) sends periodic TICK events, entities tick their states in response.

Self-ticking is cleaner for sovereignty but means the entity needs its own timer. Arena-ticking is simpler but reintroduces external control over entity state.
