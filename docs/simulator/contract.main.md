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

# Divine Book Actor Contracts

## Design Principle

Each entity state machine is sovereign over its own attributes (HP, ATK, DEF, SP). No external actor mutates these directly. Cross-entity communication happens through **intents** — the sender declares what it wants to do, the receiver evaluates and applies it to its own state.

## Architecture

```
Entity SM (player)                          Entity SM (opponent)
  ├── Book 1 (actor)                          ├── Book 1 (actor)
  ├── Book 2 (actor)                          ├── Book 2 (actor)
  ├── ...                                     ├── ...
  └── Book 6 (actor)                          └── Book 6 (actor)

  Entity SM manages tick, rotation.           Same.
  Book actor handles its own lifecycle.       Same.

           ←———— Event Bus (intents) ————→
```

The entity SM coordinates its books (tick, activation order). When a book activates, it produces effects. Self-targeting effects are applied internally. Opponent-targeting effects are sent as intents to the event bus. The receiving entity evaluates each intent against its own state and applies the mutation.

## Book Actor

A book is an actor inside the entity SM. It holds the main skill + primary affix data.

**Input**: owner stats (ATK, HP, max_HP, DEF, SP — provided by entity SM)

**Output**: a list of effects, each tagged as `self` or `opponent`

The book does not know about the opponent. It does not read opponent state. It does not send events directly — it returns effects to the entity SM, which routes them.

For conditionals that reference opponent state (e.g., "per % of enemy lost HP"), the book emits an **operator** — a formula the receiving side evaluates. The book never reads opponent attributes.

### Contract composition

A book's contract is the union of its effects' contracts. Each parsed effect type maps to exactly one contract. There is one generic book actor — it iterates its effect list and emits the corresponding contracts.

| Parsed effect type | Contract emitted | Target |
|---|---|---|
| `base_attack` | `ATK_DAMAGE` | opponent |
| `percent_max_hp_damage` | `HP_DAMAGE { basis: "max" }` | opponent |
| `percent_current_hp_damage` | `HP_DAMAGE { basis: "current" }` | opponent |
| `debuff` | `APPLY_DEBUFF` | opponent |
| `dot` | `APPLY_DOT` | opponent |
| `delayed_burst` | `DELAYED_BURST` | opponent |
| `counter_debuff` | `COUNTER_DEBUFF` (reactive) | opponent (on hit) |
| `buff_steal` | `BUFF_STEAL` | opponent |
| `periodic_dispel` | `DISPEL` | opponent |
| `shield_destroy_damage` | `SHIELD_DESTROY` | opponent |
| `cross_slot_debuff` | `APPLY_DEBUFF` (reactive) | opponent (on hit) |
| `attack_reduction` | `APPLY_DEBUFF { stat: "atk" }` | opponent |
| `crit_rate_reduction` | `APPLY_DEBUFF { stat: "crit_rate" }` | opponent |
| `crit_damage_reduction` | `APPLY_DEBUFF { stat: "crit_damage" }` | opponent |
| `extended_dot` | `APPLY_DOT` | opponent |
| `self_buff` | `SELF_BUFF` | self |
| `self_buff_extra` | `SELF_BUFF` (modifier) | self |
| `self_buff_extend` | `SELF_BUFF_EXTEND` | self |
| `self_hp_cost` | `HP_COST` | self |
| `self_heal` | `HEAL` | self |
| `shield` | `SHIELD` | self |
| `shield_strength` | `SHIELD` (modifier) | self |
| `self_cleanse` | `CLEANSE` | self |
| `counter_buff` | `COUNTER_STATE` | self |
| `summon` | `SUMMON` | self |
| `untargetable_state` | `UNTARGETABLE` | self |
| `lifesteal` | `LIFESTEAL` | self |
| `self_damage_taken_increase` | `SELF_DAMAGE_INCREASE` | self |
| `self_hp_floor` | `HP_FLOOR` | self |
| `crit_damage_bonus` | `CRIT_BONUS` | self |
| `per_hit_escalation` | modifies `ATK_DAMAGE` amount | — |
| `per_enemy_lost_hp` | `HP_DAMAGE { basis: "lost" }` or operator | opponent |
| `per_debuff_stack_damage` | operator on `ATK_DAMAGE` | opponent |
| `conditional_damage` | operator on `ATK_DAMAGE` | opponent |
| `self_lost_hp_damage` | modifies `ATK_DAMAGE` amount | — |
| `periodic_escalation` | modifies `ATK_DAMAGE` per tick | — |
| `counter_debuff_upgrade` | modifies `COUNTER_DEBUFF` chance | — |
| `delayed_burst_increase` | modifies `DELAYED_BURST` amount | — |

### Example: 煞影千幻

Parser produces:

```yaml
skill:
  - type: self_hp_cost          # → HP_COST (self)
    value: 20
  - type: base_attack           # → ATK_DAMAGE (opponent)
    hits: 3
    total: 1500
  - type: self_lost_hp_damage   # → modifies ATK_DAMAGE amount
    value: 10
  - type: shield                # → SHIELD (self)
    value: 12
    duration: 8
  - type: debuff                # → APPLY_DEBUFF (opponent)
    name: 落星
    value: -8
    duration: 4
primary_affix:
  - type: shield_strength       # → modifies SHIELD amount
    value: 21.5
```

Book contract = `HP_COST` + `ATK_DAMAGE` + `SHIELD` + `APPLY_DEBUFF`

No per-book implementation needed. The generic book actor walks the effect list, maps each to its contract, and emits them.

---

## Intents: Entity → Opponent Entity (via event bus)

These are the contracts for cross-entity communication. The sender declares intent; the receiver evaluates against its own state and applies the result.

### 1. ATK_DAMAGE

Direct damage computed from attacker's ATK and skill factors.

```typescript
{
  type: "ATK_DAMAGE",
  amount: number,       // already computed: skill% × effective_atk
  dr_bypass: number,    // fraction of target's DR to ignore (0.0–1.0)
  hits: number,         // number of hits (for per-hit effects on receiver)
  source: string,       // attacker entity id (for counter targeting)
}
```

The attacker fully resolves ATK, skill multipliers, crit, buffs, and sends the final number. The receiver applies its own DR, shields, and counters.

**Used by**: all 28 books (from `base_attack`)

### 2. HP_DAMAGE

Damage based on the **target's own HP**. Sent as an operator — the target evaluates.

```typescript
{
  type: "HP_DAMAGE",
  percent: number,      // e.g., 27 = 27% of basis
  basis: "max" | "current" | "lost",
  source: string,
}
```

The receiver computes: `percent% × own [max_hp | current_hp | lost_hp]` and applies damage to itself (after its own DR).

**Used by**: 千锋聚灵剑 (`max`, 27%), 无极御剑诀 (`current`, 1.5%), 天魔降临咒 (`max`, 1.6%), 天轮魔经 (`max`, 3%), 玉书天戈符 (`max`, 21%), 惊蜇化龙 (`max`, 10%)

### 3. APPLY_DEBUFF

Apply a named state on the target that modifies its stats.

```typescript
{
  type: "APPLY_DEBUFF",
  id: string,           // state name (e.g., "落星", "追命剑阵")
  stat: string,         // which stat/derived to modify
  value: number,        // modifier value (negative = reduction)
  duration: number | "permanent",
  stacks?: number,      // initial stacks
  max_stacks?: number,
  per_hit_stack?: boolean,
  dispellable?: boolean,
}
```

The receiver creates a temporary modifier on itself. The receiver owns the state lifecycle (ticking, expiry, dispel).

**Used by**: 新-青元剑诀 (神通封印, 追命剑阵), 煞影千幻 (落星), 星元化岳 (天龙印), 天魔降临咒 (结魂锁链), 天轮魔经 (惧意), 天刹真魔 (天人五衰), 大罗幻诀 (命損)

### 4. APPLY_DOT

Apply a periodic damage state on the target. The target ticks and damages itself.

```typescript
{
  type: "APPLY_DOT",
  id: string,           // state name (e.g., "贪妄业火")
  percent: number,      // damage per tick as % of basis
  basis: "max" | "current" | "lost",
  tick_interval: number, // seconds between ticks
  duration: number | "permanent",
  stacks?: number,
  max_stacks?: number,
  per_hit_stack?: boolean,
}
```

The receiver creates the DoT state on itself. Each tick, the receiver computes `percent% × own [basis]` and reduces its own HP. The attacker is not involved after sending.

**Used by**: 天魔降临咒 (1.6% max/s), 大罗幻诀 (噬心魔咒 7% current, 断魂之咒 7% lost), 梵圣真魔咒 (贪妄业火 3% current, 瞋痴业火 8% lost)

### 5. DELAYED_BURST

Apply a state that accumulates damage and detonates on expiry.

```typescript
{
  type: "DELAYED_BURST",
  id: string,           // "无相魔劫"
  duration: number,
  damage_increase_during: number, // % increase to incoming damage while active
  burst_base: number,            // base ATK% on detonation
  burst_accumulated_pct: number, // % of accumulated bonus damage added to burst
  source_atk: number,           // attacker's effective_atk (for burst calculation)
}
```

The receiver tracks accumulated damage during the state, then applies burst on expiry.

**Used by**: 无相魔劫咒

### 6. DISPEL

Remove buff states from the target.

```typescript
{
  type: "DISPEL",
  count: number,        // how many buffs to remove
}
```

The receiver removes up to `count` dispellable buffs from itself.

**Used by**: 九重天凤诀 (periodic_dispel, 2)

### 7. BUFF_STEAL

Take buff states from the target. The stolen buffs are returned to the sender.

```typescript
{
  type: "BUFF_STEAL",
  count: number,
  source: string,       // who to send the stolen buffs to
}
```

The receiver removes up to `count` buffs from itself and sends them back to `source` as `RECEIVE_STOLEN_BUFF` events.

**Used by**: 天轮魔经 (steal 2)

### 8. SHIELD_DESTROY

Destroy a shield on the target, with bonus effects.

```typescript
{
  type: "SHIELD_DESTROY",
  count: number,         // shields to destroy per hit
  bonus_hp_damage: number, // % max HP damage per destroyed shield
  no_shield_double: boolean, // double damage if target has no shield
  source: string,
}
```

The receiver evaluates: if it has shields, remove them and take bonus damage. If no shields and `no_shield_double`, take double bonus damage.

**Used by**: 皓月剑诀 (寂灭剑心)

---

## Intents: Entity → Attacker Entity (reactive)

These fire when the entity receives damage. The receiver sends intents back to the attacker.

### 9. COUNTER_DAMAGE

Reflect damage back to the attacker.

```typescript
{
  type: "COUNTER_DAMAGE",
  amount: number,       // computed from receiver's state
  source: string,       // receiver's entity id
}
```

The original attacker receives this and applies it to itself (with its own DR).

**Used by**: 疾风九变 (极怒: reflect 50% received + 15% own lost HP)

### 10. COUNTER_DEBUFF

Apply a debuff on the attacker as a reaction to being hit.

```typescript
{
  type: "COUNTER_DEBUFF",
  id: string,
  effects: ApplyDebuff | ApplyDot,  // what to apply on the attacker
  chance: number,       // probability (0–100)
}
```

The receiver rolls chance. If successful, sends the debuff intent to the attacker. The attacker receives it as an APPLY_DEBUFF or APPLY_DOT and applies to itself.

**Used by**: 大罗幻诀 (罗天魔咒: 60% chance → 噬心之咒 + 断魂之咒 DoTs on attacker), 天刹真魔 (不灭魔体: 100% → 天人五衰 debuff on attacker)

### 11. COUNTER_HEAL

Heal self when hit (not sent to attacker — stays internal, listed for completeness).

```typescript
{
  type: "COUNTER_HEAL",
  percent_of_damage: number,
  ignore_healing_bonus: boolean,
}
```

**Used by**: 天刹真魔 (不灭魔体: heal 8% of damage taken)

---

## Self-Effects (internal to entity SM, never cross boundary)

These are produced by the book but applied by the entity SM to itself. They do not go on the event bus.

| Effect | What it does | Example |
|---|---|---|
| `HP_COST` | reduce own current HP by % | 煞影千幻 (20%), 十方真魄 (10%) |
| `SELF_BUFF` | temporarily modify own ATK/DEF/HP | 甲元仙符 (仙佑: +70% ATK/DEF/HP) |
| `SHIELD` | add HP buffer with duration | 煞影千幻 (21.5% max HP, 8s) |
| `HEAL` | restore own HP | 周天星元 (20% max HP) |
| `CLEANSE` | remove own debuffs | 九天真雷诀 (2), 十方真魄 (periodic) |
| `COUNTER_STATE` | register reactive trigger | 大罗幻诀 (罗天魔咒), 疾风九变 (极怒) |
| `SUMMON` | create clone actor | 春黎剑阵 (54% stats, 16s) |
| `UNTARGETABLE` | ignore incoming intents | 念剑诀 (4s) |
| `SELF_BUFF_EXTEND` | extend existing buff duration | 十方真魄 (怒灵降世 +3.5s) |
| `CRIT_BONUS` | modify own crit damage | 通天剑诀 (+100%) |
| `LIFESTEAL` | heal based on own damage dealt | 疾风九变, 星元化岳 |
| `HP_FLOOR` | HP cannot drop below % | 九重天凤诀 (10%) |
| `SELF_DAMAGE_INCREASE` | increase own incoming damage | 通天剑诀 (+50%, 8s) |

---

## Conditionals (modify outgoing intents before sending)

These are evaluated by the book before producing the damage number. Some need opponent state.

| Conditional | What it reads | Resolution |
|---|---|---|
| `per_hit_escalation` | hit index (self) | Self-resolved: book knows its own hit sequence |
| `self_lost_hp_damage` | own lost HP (self) | Self-resolved: entity SM provides own stats |
| `per_enemy_lost_hp` | opponent lost HP % | **Operator**: emit `HP_DAMAGE { basis: "lost" }` instead of pre-computing |
| `per_debuff_stack` | opponent debuff count | **Operator**: emit intent with `per_debuff_stack` modifier, receiver evaluates |
| `conditional_damage` | opponent HP below threshold | **Operator**: emit intent with `condition: { hp_below: 30 }`, receiver evaluates |
| `crit_damage_bonus` | self state | Self-resolved |

> **Open question**: for `per_enemy_lost_hp` and `per_debuff_stack`, the operator approach means the receiver evaluates the condition and scales the damage. This is clean (no cross-reads) but means the receiver does more work. Alternative: the entity SM provides an opponent snapshot at round start (simultaneous resolution), and the book pre-computes. Decision deferred — both approaches produce the same result for PvP.

---

## Event Bus Routing

For PvP (1v1), routing is trivial — opponent intents go to the one opponent. For gvg, the entity SM selects a target before sending.

The arena actor is just a clock:
- sends `TICK { dt }` to all entity SMs
- receives `ENTITY_DIED { id }` from entities
- determines match outcome

---

## Summary: what crosses the boundary

```
Entity A                                    Entity B
  Book activates
  → computes ATK_DAMAGE (self-resolved)
  → emits HP_DAMAGE operator
  → emits APPLY_DEBUFF intent
  → emits APPLY_DOT intent

  Entity A sends to bus ──────────────→ Entity B receives
                                          → evaluates ATK_DAMAGE (own DR, shields)
                                          → evaluates HP_DAMAGE (own HP state)
                                          → creates debuff state on self
                                          → creates DoT state on self
                                          → if counter active: sends COUNTER back

  Entity A receives ←──────────────── COUNTER_DAMAGE / COUNTER_DEBUFF
    → applies to self
```

Each entity only mutates its own state. Intents declare what the sender wants to happen. The receiver decides what actually happens.
