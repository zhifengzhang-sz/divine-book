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
}
h1, h2, h3, h4, h5, h6 { color: #ffffff !important; }
a { color: #61afef !important; }
code { background-color: #3e4451 !important; color: #e5c07b !important; padding: 2px 6px !important; border-radius: 3px !important; }
pre { background-color: #2c313a !important; border: 1px solid #4b5263 !important; border-radius: 6px !important; padding: 16px !important; overflow-x: auto !important; }
pre code { background-color: transparent !important; color: #abb2bf !important; padding: 0 !important; }
table { border-collapse: collapse !important; width: auto !important; margin: 16px 0 !important; }
table th, table td { border: 1px solid #4b5263 !important; padding: 8px 10px !important; }
table th { background: #3e4451 !important; color: #e5c07b !important; text-align: center !important; }
table td { background: #2c313a !important; text-align: left !important; }
blockquote { border-left: 3px solid #4b5263 !important; padding-left: 10px !important; color: #5c6370 !important; }
strong { color: #e5c07b !important; }
</style>

# Combat Simulator Platform Architecture

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Design specification.** This document defines the platform architecture — the n+1 state machine model, inter-machine protocols, and intra-machine contracts. It is implementation-agnostic at the detail level but assumes XState v5 as the state machine runtime.

---

## 1. The n+1 Model

A player in combat has **n+1 state machines**:

| Machine | Count | Role |
|---------|-------|------|
| **AttributeMachine** | 1 per player | Owns fundamental state (HP, SP, Shield, ATK, DEF, buffs/debuffs). Resolves incoming intents. Emits state-change events. Reaches absorbing boundary (DEATH) when HP ≤ 0. |
| **ModuleMachine** | n per player | Each combat module (divine book, instrument, future types) is an autonomous actor with its own state chart, effect system, and lifecycle. Produces intent events. |

```
Player A                                    Player B
┌──────────────────────────────────┐       ┌──────────────────────────────────┐
│ AttributeMachine_A               │       │ AttributeMachine_B               │
│ HP, SP, Shield, ATK, DEF, States │       │ HP, SP, Shield, ATK, DEF, States │
│ Resolves intents → emits events  │       │ Resolves intents → emits events  │
│                                  │       │                                  │
│ ┌──────────┐ ┌──────────┐       │       │ ┌──────────┐ ┌──────────┐       │
│ │ Module₁  │ │ Module₂  │  ...  │       │ │ Module₁  │ │ Module₂  │  ...  │
│ │ (book)   │ │ (法宝)   │       │       │ │ (book)   │ │ (法宝)   │       │
│ └──────────┘ └──────────┘       │       │ └──────────┘ └──────────┘       │
└──────────────────────────────────┘       └──────────────────────────────────┘
```

The AttributeMachine is **not** an orchestrator. It does not tell modules when to fire. It is a **reactive state container** — it receives intents and resolves them. Modules decide their own timing.

---

## 2. Inter-Machine Relationships

There are exactly **four** communication channels between machines. No others exist.

### 2.1 Channel: Module → own AttributeMachine (self-targeting)

**Direction:** Module sends IntentEvent to its owner's AttributeMachine.

**Purpose:** Self-buffs, self-heals, HP costs, shield generation.

**Examples:**
- Divine book casts → `APPLY_STATE { target: "self", kind: "buff", effects: [{ stat: "attack_bonus", value: 70 }] }`
- Instrument 芭蕉扇 风卷 → `APPLY_STATE { target: "self", kind: "permanent", effects: [{ stat: "attack_bonus", value: c }, { stat: "hp_bonus", value: c }] }`

**Mechanism:** `sendTo(ownerRef, intentEvent)`

**Data carried:**

| Intent | Key fields | Resolution |
|--------|-----------|------------|
| APPLY_STATE | state: StateInstance | Add/stack state, recalc stats |
| HEAL | value: number | `hp += value × healingMult` |
| SHIELD | value, duration | Add shield instance |
| HP_COST | percent, basis | `hp -= percent% × basis` |
| SELF_CLEANSE | count? | Remove debuffs |
| HP_FLOOR | minPercent | Floor HP at percent |

### 2.2 Channel: Module → opponent AttributeMachine (opponent-targeting)

**Direction:** Module sends IntentEvent to the opponent player's AttributeMachine.

**Purpose:** Damage, debuffs, dispels — everything that hurts or debilitates the opponent.

**Examples:**
- Divine book → `HIT { damage: 65789, spDamage: 0, hitIndex: 0, handlerTypes: ["base_attack"] }`
- Instrument 芭蕉扇 焚天 → `HIT { damage: copiedTotal/g, hitIndex: k, trueDamage: true }` × g hits
- Instrument 芭蕉扇 煽风 → `APPLY_STATE { kind: "debuff", name: "stun", effects: [{ stat: "cast_suppressed", value: 1 }] }`

**Mechanism:** `sendTo(opponentRef, intentEvent)`

**Data carried:**

| Intent | Key fields | Resolution |
|--------|-----------|------------|
| HIT | damage, spDamage, hitIndex, perHitEffects?, handlerTypes?, trueDamage? | DR → SP shield → skill shield → HP → resonance → per-hit → triggers |
| APPLY_STATE | state: StateInstance | Add/stack debuff on opponent |
| APPLY_DOT | name, damagePerTick, tickInterval, duration | Periodic damage |
| DISPEL | count | Remove N dispellable buffs |
| BUFF_STEAL | count | Remove N buffs, send as APPLY_STATE to self |
| DELAYED_BURST | damage, delay | Schedule future damage |

### 2.3 Channel: AttributeMachine → subscribers (state-change broadcast)

**Direction:** AttributeMachine emits StateChangeEvents. Any machine can subscribe.

**Purpose:** Observable combat state. Modules listen for reactive behavior. Viz listens for display.

**Who subscribes:**
- **Viz/CLI** — displays the event stream (useReplay, event log, charts)
- **Reactive modules** — instruments that react to damage dealt, casts completed, states applied
- **Same-player modules** — modules that need to know when a buff was applied or a cast ended

**Examples:**
- 混铁叉 listens for CAST_END on its own player → fires 魔焰 random hits
- 芭蕉扇 listens for HP_CHANGE on opponent (caused by ANY source) → accumulates copied damage during 煽风 window
- Viz listens for all events → replay + charts

**Mechanism:** XState `emit()` on AttributeMachine, subscribers use `actor.on("*", callback)` or `actor.on("HP_CHANGE", callback)`

**Events emitted:**

| Event | When | Key fields |
|-------|------|-----------|
| CAST_START | Module begins a cast | player, slot, module, t |
| CAST_END | Module's cast fully resolved | player, slot, module, t |
| HP_CHANGE | HP mutated | player, prev, next, cause, source?, t |
| SP_CHANGE | SP mutated | player, prev, next, cause, t |
| SHIELD_CHANGE | Shield mutated | player, prev, next, cause, source?, t |
| STAT_CHANGE | Effective stat recalculated | player, stat, prev, next, t |
| STATE_APPLY | New state added | player, state, source?, t |
| STATE_EXPIRE | State duration reached zero | player, name, t |
| STATE_TICK | Periodic interval of active state | player, name, t |
| STATE_TRIGGERED | Reactive condition fired | player, name, trigger, t |
| STATE_REMOVE | State dispelled/cleansed/stolen | player, name, cause, t |
| DEATH | hp ≤ 0 | player, t |

### 2.4 Channel: AttributeMachine → Modules (triggers + readable state)

**Direction:** AttributeMachine sends trigger events to its owned modules. Modules can also read AttributeMachine state snapshot.

**Purpose:** Tell modules when to act. Provide readable player state.

**Trigger events:**

| Trigger | When | Who handles |
|---------|------|------------|
| COMBAT_START | Combat begins | All modules — initialize, apply permanent effects |
| CAST_SLOT { slot } | Player's cast schedule fires | The module in that slot — execute cast |
| CHECK_DEATH | After each time step | AttributeMachine internal (not forwarded to modules) |
| COMBAT_END | Combat is over | All modules — cleanup |

**Readable state:** Modules call `ownerRef.getSnapshot().context.state` to read:

```typescript
interface ReadablePlayerState {
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  atk: number;       // effective (base + buff modifiers)
  baseAtk: number;
  def: number;
  baseDef: number;
  shield: number;
  states: StateInstance[];  // active buffs/debuffs
  alive: boolean;
}
```

Modules READ this. They never WRITE to it directly. All mutations go through IntentEvents.

---

## 3. Inter-Machine Protocol Summary

```
                    ┌─────────────────────────────────┐
                    │    AttributeMachine_A            │
                    │                                  │
    ┌───────────────┤  2.1  Module → self (intents)    │
    │               │  2.4a Triggers → modules         │
    │               │  2.4b Readable state → modules   │
    │               │  2.3  Emits → subscribers        │
    │               └───────────┬─────────────────────┘
    │                           │
    │  2.2 Module_A → opponent  │  2.3 Events emitted
    │       (intents)           │       (broadcast)
    │                           │
    │                           ▼
    │               ┌─────────────────────────────────┐
    └──────────────►│    AttributeMachine_B            │
                    │                                  │
                    │  Resolves A's intents            │
                    │  Emits B's state-change events   │
                    └─────────────────────────────────┘

  Channel 2.1: Module → own AttributeMachine     (sendTo ownerRef)
  Channel 2.2: Module → opponent AttributeMachine (sendTo opponentRef)
  Channel 2.3: AttributeMachine → all subscribers (emit)
  Channel 2.4: AttributeMachine → owned modules   (sendTo moduleRef + snapshot)
```

---

## 4. Intra-Machine Contracts

### 4.1 AttributeMachine (the +1)

**Responsibility:** Own and mutate player combat state. Resolve intents. Emit events. Provide readable state.

**Does NOT:**
- Know about damage chains, multiplicative zones, or effect combination
- Know which module type produced an intent
- Decide when modules fire
- Manage module lifecycles (modules are autonomous actors)

**State chart:**

```
  ┌──────────────────────────────────────────────────┐
  │ alive                                             │
  │                                                   │
  │  entry/ spawn module actors from equipment slots   │
  │         send COMBAT_START to each module           │
  │                                                   │
  │  on CAST_SLOT { slot }                            │
  │    → forward to moduleRefs[slot]                  │
  │    → emit CAST_START                              │
  │                                                   │
  │  on HIT { damage, ... }                           │
  │    → resolveHit(): DR → SP shield → shield        │
  │      → HP → resonance → per-hit → triggers        │
  │    → emit HP_CHANGE, SP_CHANGE, SHIELD_CHANGE     │
  │                                                   │
  │  on APPLY_STATE { state }                         │
  │    → add/stack state, recalc stats                │
  │    → emit STATE_APPLY, STAT_CHANGE                │
  │    → schedule STATE_EXPIRE, STATE_TICK            │
  │                                                   │
  │  on HEAL, SHIELD, HP_COST, DISPEL, ...            │
  │    → resolve against state                        │
  │    → emit corresponding events                    │
  │                                                   │
  │  on MODULE_RESULT { slot, hits, intents, errors } │
  │    → schedule hit delivery (1s apart)             │
  │    → route intents to self/opponent               │
  │    → emit CAST_END after last hit                 │
  │                                                   │
  │  on CHECK_DEATH                                   │
  │    → if hp ≤ 0: transition to dead                │
  │                                                   │
  │  guard: cast_suppressed state active              │
  │    → CAST_SLOT is blocked (stun mechanic)         │
  │                                                   │
  └──────────────┬───────────────────────────────────┘
                 │ hp ≤ 0
                 ▼
  ┌──────────────────────┐
  │ dead (final)          │
  │ entry/ emit DEATH     │
  │ All events ignored    │
  └──────────────────────┘
```

**Context:**

```typescript
interface AttributeMachineContext {
  label: string;                          // "A" or "B"
  state: PlayerState;                     // mutable combat state
  formulas: FormulasConfig;               // DR constant, SP shield ratio
  equipment: EquipmentSlot[];             // module slot configs
  moduleRefs: Record<number, AnyActorRef>;// spawned module actors
  listeners: ListenerRegistration[];      // reactive affix listeners
  clock: SimulationClock;
  rng: SeededRNG;
  maxChainDepth: number;
  chainDepth: number;
  opponentRef?: AnyActorRef;             // opponent's AttributeMachine
}
```

### 4.2 ModuleMachine (generic contract)

Every module machine, regardless of type, follows this contract:

**Input:**

```typescript
interface ModuleMachineInput {
  slot: EquipmentSlot;          // which slot this module occupies
  moduleData: unknown;          // type-specific data (book data, instrument data)
  ownerRef: AnyActorRef;        // ref to own AttributeMachine
  opponentRef: AnyActorRef;     // ref to opponent's AttributeMachine
  clock: SimulationClock;
  rng: SeededRNG;
}
```

**Events received (from AttributeMachine or platform):**

| Event | Response |
|-------|----------|
| COMBAT_START | Initialize module. Apply permanent effects. Start autonomous timers. |
| CAST_SLOT { slot } | Execute the module's cast sequence (if slot matches). |
| COMBAT_END | Cleanup. Stop timers. |

**Events produced (sent to AttributeMachines):**

All IntentEvents from §2.1 and §2.2. The module decides which go to `ownerRef` (self-targeting) and which go to `opponentRef` (opponent-targeting).

**Result event (sent to own AttributeMachine):**

```typescript
// Module reports its cast result — AttributeMachine schedules delivery
interface ModuleResultEvent {
  type: "MODULE_RESULT";
  slot: number;
  moduleName: string;
  hits: HitEvent[];             // damage chain output
  intents: IntentEvent[];       // non-damage intents (buffs, debuffs, etc.)
  listeners: ListenerRegistration[];
  errors: string[];
}
```

**Subscribing to events:** Modules can subscribe to either AttributeMachine's emitted events for reactive behavior:

```typescript
// In module machine setup:
ownerRef.on("CAST_END", (ev) => { ... });       // react to own casts
opponentRef.on("HP_CHANGE", (ev) => { ... });   // react to opponent damage
```

### 4.3 DivineBookModule (concrete)

**State chart:**

```
  idle ──CAST_SLOT──► casting ──done──► idle

  casting/
    1. gatherEffects(): selectTiers from skill + primary_affix + exclusive_affix + aux
    2. Separate direct vs reactive effects
    3. For each direct effect: resolve(effect, ctx) → HandlerResult
    4. buildHitEvents(results) → HIT[]
    5. Collect non-damage intents
    6. Build listener registrations for reactive effects
    7. sendTo(ownerRef, MODULE_RESULT { hits, intents, listeners })
```

**Effect system (internal):**
- Schemas: `BaseAttack`, `Debuff`, `SelfBuff`, `Dot`, `Lifesteal`, ... (from `lib/parser/schema/effects.ts`)
- Handlers: `register<BaseAttack>("base_attack", ...)` etc. (79 typed handlers)
- Damage chain: `buildHitEvents()` — zone accumulation → per-hit HIT events

**Data shape:**

```typescript
interface DivineBookData {
  skill: EffectWithMeta[];
  primary_affix?: { name: string; effects: EffectWithMeta[] };
  exclusive_affix?: { name: string; effects: EffectWithMeta[] };
}
```

### 4.4 InstrumentModule (concrete — 芭蕉扇)

**State chart:**

```
  idle ──COMBAT_START──► activated

  activated/ {
    entry/
      resolve tier by star_rank (一星..十星) → variables {a, b, c, d, e, f, g}
      sendTo(ownerRef, APPLY_STATE { 扇动乾坤: buff stats +a%, +b% })
      sendTo(ownerRef, APPLY_STATE { 风卷: self ATK+c%, HP+c%, permanent })
      sendTo(opponentRef, APPLY_STATE { 风卷: opponent HP-c%, SP-c%, permanent })

    ┌─── 煽风cycle ───────────────────────────────────┐
    │                                                  │
    │  waiting ──after(d×1000ms)──► 煽风               │
    │                                                  │
    │  煽风/                                            │
    │    entry/                                        │
    │      sendTo(opponentRef, APPLY_STATE { stun e秒 })│
    │      start copying = true                        │
    │      copiedDamage = 0                            │
    │      subscribe opponentRef.on("HP_CHANGE")       │
    │        → copiedDamage += abs(prev - next) × f%   │
    │                                                  │
    │  煽风 ──after(e×1000ms)──► 焚天                   │
    │                                                  │
    │  焚天/                                            │
    │    entry/                                        │
    │      stop copying                                │
    │      perHit = copiedDamage / g                   │
    │      for k in 0..g:                              │
    │        sendTo(opponentRef, HIT {                  │
    │          damage: perHit,                         │
    │          trueDamage: true,    // bypasses DR      │
    │          hitIndex: k                             │
    │        })                                        │
    │                                                  │
    │  焚天 ──done──► waiting                           │
    │                                                  │
    └──────────────────────────────────────────────────┘
  }

  activated ──COMBAT_END──► idle
```

**Effect system (internal):**
- Schemas: `WindSweep`, `FanWind`, `BurnSky`, ... (instrument-specific)
- Handlers: instrument-specific effect resolution
- No damage chain (instruments produce HIT events directly, not through zones)

**Data shape:**

```typescript
interface InstrumentData {
  name: string;                    // "芭蕉扇"
  category: string;                // "法宝"
  abilities: InstrumentAbility[];  // named states (扇动乾坤, 风卷残云)
  tiers: Record<string, Record<string, number>>;  // "一星" → {a:10, b:2, ...}
}

interface InstrumentAbility {
  name: string;        // "风卷残云"
  effects: InstrumentEffect[];
}
```

### 4.5 InstrumentModule (concrete — 混铁叉)

**State chart:**

```
  idle ──COMBAT_START──► active

  active/
    entry/
      resolve tier by star_rank → variables {a, b, c, d}
      sendTo(ownerRef, APPLY_STATE { 狂牛贯日: buff stats +b% })
      subscribe ownerRef.on("CAST_END") → fire 魔焰

    on CAST_END from ownerRef:
      hits = rand(1, 9)
      lastCastDamage = (read from CAST_END event or accumulate)
      perHit = lastCastDamage × a% / hits
      for k in 0..hits:
        sendTo(opponentRef, HIT { damage: perHit, hitIndex: k })

  active ──COMBAT_END──► idle
```

**Key difference from 芭蕉扇:** 混铁叉 is **reactive** (fires after divine book casts). 芭蕉扇 is **autonomous** (fires on its own d-second timer). Both are valid ModuleMachine patterns — the contract supports both.

---

## 5. New Concepts Required

These are capabilities the AttributeMachine does not currently have but needs for the platform:

### 5.1 Cast Suppression (Stun)

**Origin:** 芭蕉扇 煽风 — "震慑目标，使其无法主动攻击，持续e秒"

**Implementation:** A new state effect `cast_suppressed`. When present, AttributeMachine's CAST_SLOT handler checks for this guard and skips the cast (or queues it).

```typescript
// In AttributeMachine, CAST_SLOT handler:
if (ctx.state.states.some(s => s.effects.some(e => e.stat === "cast_suppressed"))) {
  // Skip this cast — stun is active
  emit({ type: "CAST_SUPPRESSED", player, slot, t });
  return;
}
```

### 5.2 True Damage

**Origin:** 芭蕉扇 焚天 — "该伤害为真实伤害"

**Implementation:** `HitEvent.trueDamage?: boolean`. When true, AttributeMachine skips DR and shield absorption — damage goes directly to HP.

### 5.3 CAST_END Event

**Origin:** Currently implicit. Needed for 混铁叉 to react to divine book cast completion.

**Implementation:** AttributeMachine emits CAST_END after the last hit from a MODULE_RESULT is delivered. This requires tracking scheduled hits per module and emitting after the last one fires.

### 5.4 Damage Subscription Window

**Origin:** 芭蕉扇 煽风 — "复制自身造成的伤害值"

**Implementation:** The instrument module subscribes to the opponent's AttributeMachine HP_CHANGE events during the 煽风 window. No changes to AttributeMachine needed — it already emits HP_CHANGE. The module subscribes/unsubscribes as it enters/exits the 煽风 state.

---

## 6. What Does NOT Change

| Component | Why unchanged |
|-----------|--------------|
| IntentEvent types (HIT, APPLY_STATE, HEAL...) | Universal combat language. True damage is an optional field, not a new type. |
| StateChangeEvent emission protocol | AttributeMachine already emits these. Modules just subscribe. |
| Hit resolution logic (DR, SP shield, shield absorb, HP) | Module-agnostic. Only addition: trueDamage bypass. |
| State lifecycle (add, stack, expire, tick, remove) | Module-agnostic. |
| DamageChain (buildHitEvents) | Optional shared utility. Modules can produce HIT directly. |
| SimulationClock | Module-agnostic scheduling. |
| SeededRNG | Module-agnostic randomness. |
| Viz (event stream, useReplay, charts) | Consumes StateChangeEvents regardless of source. |

---

## 7. Module Registration Protocol

```typescript
/** Each module type self-registers when imported */
interface ModuleDefinition {
  /** Unique type identifier: "divine_book", "instrument", ... */
  type: string;

  /** Create the XState machine for this module type */
  createMachine(input: ModuleMachineInput): AnyStateMachine;

  /** Module-specific config validation */
  validate(slots: EquipmentSlot[], gameData: GameData): string[];
}

// Registry
const moduleRegistry = new Map<string, ModuleDefinition>();

// Usage in AttributeMachine alive.entry:
for (const slot of context.equipment) {
  const def = moduleRegistry.get(slot.type);
  const machine = def.createMachine({ slot, ownerRef: self, opponentRef, clock, rng });
  const ref = spawn(machine);
  context.moduleRefs[slot.slot] = ref;
  sendTo(ref, { type: "COMBAT_START" });
}
```

---

## 8. Equipment Configuration

```typescript
interface EquipmentSlot {
  slot: number;
  type: string;                   // discriminant: "divine_book" | "instrument"
  platform: string;               // "千锋聚灵剑" | "芭蕉扇"
  progression: DivineBookProgression | InstrumentProgression;
  auxiliaries?: AuxConfig[];       // aux affixes (divine books only)
}

interface DivineBookProgression {
  type: "divine_book";
  enlightenment: number;          // 悟境 0-12
  fusion: number;                 // 融合重数 0-52+
}

interface InstrumentProgression {
  type: "instrument";
  star_rank: number;              // 一星=1 .. 十星=10
  stage: number;                  // 品阶 1-50
}

interface PlayerConfig {
  entity: { hp: number; atk: number; sp: number; def: number; spRegen: number };
  formulas: FormulasConfig;
  equipment: EquipmentSlot[];     // replaces books: BookSlot[]
}
```

---

## 9. Directory Structure

```
lib/sim/
├── core/
│   ├── player.ts              # AttributeMachine
│   ├── clock.ts               # SimulationClock
│   ├── rng.ts                 # SeededRNG
│   ├── types.ts               # IntentEvent, StateChangeEvent, EquipmentSlot
│   └── damage-chain.ts        # Shared utility (optional for modules)
│
├── modules/
│   ├── registry.ts            # moduleRegistry, registerModule()
│   ├── types.ts               # ModuleDefinition, ModuleMachineInput, ModuleTrigger
│   │
│   ├── divine-book/
│   │   ├── machine.ts         # DivineBook XState machine (idle → casting → idle)
│   │   ├── process.ts         # gatherEffects (was processBook)
│   │   ├── schemas/           # BaseAttack, Debuff, SelfBuff, ... (effect types)
│   │   ├── handlers/          # Handler registry + all handlers
│   │   └── index.ts           # registerModule("divine_book", ...)
│   │
│   ├── instrument/
│   │   ├── machines/
│   │   │   ├── 芭蕉扇.ts      # Autonomous: 风卷 → 煽风 → 焚天 cycle
│   │   │   └── 混铁叉.ts      # Reactive: fires after divine book casts
│   │   ├── schemas/           # WindSweep, FanWind, BurnSky, ...
│   │   ├── handlers/          # Instrument-specific handlers
│   │   └── index.ts           # registerModule("instrument", ...)
│   │
│   └── {future-module}/       # Same structure
│
├── config.ts                  # loadGameData(), validateConfig()
└── index.ts                   # Re-exports
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-26 | Initial platform design: C4 diagrams, module interface, migration strategy |
| 2.0 | 2026-03-26 | **n+1 model.** Renamed PlayerMachine → AttributeMachine. Full inter/intra protocol specification. Cast suppression, true damage, CAST_END, damage subscription window. Instrument state charts for 芭蕉扇 and 混铁叉. |
