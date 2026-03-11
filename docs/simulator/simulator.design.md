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

# Combat Simulator Design

**Date:** 2026-03-10
**Status:** Draft — review before implementation

---

## 1. Purpose

The time-series factor model answers "what does this book produce?" — factor curves over time. The simulator answers "who wins?" — resolve two book sets against each other, tracking HP until one reaches zero.

### What it replaces
Nothing. The factor model remains the analytical backbone. The simulator **consumes** factor model data (baselines, temporal events, modifiers) and adds:
- Two-entity state tracking (HP, buffs, debuffs, shields)
- Hit-level damage resolution (the actual damage formula)
- Trigger sequencing (reactive effects, cross-skill carry)
- Win/loss outcome

### Non-goals (v1)
- AI opponent strategy (fixed slot order, no adaptation)
- Animation timing or real-time playback
- Gear/stat optimization (attributes are input parameters)

---

## 2. Combat Model

### 2.1 Damage Formula

Each hit resolves through the multiplicative chain:

```
Hit_damage = D_base × (1 + M_dmg) × (1 + M_skill) × (1 + M_final) × crit_mult
           + D_flat
           + D_ortho

Effective_damage = Hit_damage × (1 - DR_target) + D_true

DR_target = base_DR × (1 - DR_reduction_debuffs)
crit_mult = is_crit ? (1 + M_crit) : 1.0
```

Where each M_* zone is the **sum** of all active effects feeding that zone (additive within zone, multiplicative across zones).

### 2.2 Entity State

```typescript
interface EntityState {
  // Base stats (from gear — input parameter)
  base_hp: number;
  base_atk: number;
  base_sp: number;
  base_def: number;

  // Runtime
  current_hp: number;
  max_hp: number;             // base_hp × (1 + hp_bonus)
  shields: Shield[];          // active shield instances
  buffs: ActiveState[];       // active buff instances
  debuffs: ActiveState[];     // active debuff instances on this entity

  // Tracking
  hp_lost: number;            // max_hp - current_hp (for %lost_hp effects)
  total_damage_dealt: number;
  total_damage_taken: number;
  total_healing: number;
}

interface ActiveState {
  id: string;                 // e.g. "仙佑", "命損", "噬心"
  source_slot: number;
  stacks: number;
  remaining_duration: number; // seconds
  tick_interval?: number;     // for DoTs / periodic effects
  values: Record<string, number>; // stat bonuses, damage values, etc.
  undispellable?: boolean;
}

interface Shield {
  id: string;
  value: number;              // remaining shield HP
  remaining_duration: number;
}
```

### 2.3 Time Structure

```
Slot 1          Slot 2          Slot 3          ...  Slot 6
|---T_cast---|  |---T_cast---|  |---T_cast---|       |---T_cast---|
|<-- T_gap (≈6s) -->|<-- T_gap -->|
```

Each slot activation:
1. **Pre-cast**: tick all active states (DoTs deal damage, buffs/debuffs expire, shields decay)
2. **Cast phase**: resolve the skill's hits (T_cast ≈ 1-3s depending on hit count)
3. **Post-cast**: apply state-creating effects (new buffs, debuffs, DoTs)
4. **Inter-slot gap**: tick remaining time until next slot

Between slots, both entities' states tick simultaneously (simplified — not modeling who attacks "first" within a tick).

---

## 3. Architecture

### 3.1 Core Loop

```typescript
interface SimConfig {
  player_a: {
    bookset: BookSetConfig;     // 6 books (reuse builds/*.json format)
    stats: BaseStats;           // gear-derived base attributes
  };
  player_b: {
    bookset: BookSetConfig;
    stats: BaseStats;
  };
  T_gap: number;               // default 6
  max_time: number;            // timeout (default 60s = ~10 slots)
}

function simulate(config: SimConfig): SimResult {
  const a = initEntity(config.player_a);
  const b = initEntity(config.player_b);

  // Pre-compute: build slot models for both sides
  const a_slots = config.player_a.bookset.books.map(book => buildSlotModel(book));
  const b_slots = config.player_b.bookset.books.map(book => buildSlotModel(book));

  let t = 0;
  for (let slot = 0; slot < 6; slot++) {
    // Both activate simultaneously
    resolveSlot(a, b, a_slots[slot], t);
    resolveSlot(b, a, b_slots[slot], t);

    // Tick through inter-slot gap
    tickDuration(a, b, T_gap, t);
    t += T_gap;

    if (a.current_hp <= 0 || b.current_hp <= 0) break;
  }

  return buildResult(a, b, t);
}
```

### 3.2 Slot Resolution (the core complexity)

```typescript
function resolveSlot(
  attacker: EntityState,
  defender: EntityState,
  slot: SlotModel,
  t: number
): void {
  // 1. Collect all active modifiers at time t
  const mods = collectActiveModifiers(attacker, defender);

  // 2. Apply passive multipliers (taxonomy cat 1)
  //    Already folded into slot's factor values

  // 3. Evaluate conditional multipliers (taxonomy cat 2)
  const conditionals = evaluateConditionals(slot.conditionals, attacker, defender);

  // 4. Build factor vector for this activation
  const factors = buildActivationFactors(slot.baseline, mods, conditionals);

  // 5. Resolve hits
  for (let hit = 0; hit < slot.hit_count; hit++) {
    // Per-hit escalation (taxonomy cat 3)
    const escalation = computeEscalation(slot.escalation, hit);

    // Damage formula
    const damage = resolveDamage(factors, escalation, attacker, defender);

    // Apply damage (shields absorb first)
    applyDamage(defender, damage);

    // Per-hit triggers (reactive cat 6 — defender fires back)
    fireReactiveTriggers(defender, attacker, damage);

    if (defender.current_hp <= 0) return;
  }

  // 6. Post-cast: state creation (taxonomy cat 4)
  applyStateEffects(slot.state_effects, attacker, defender);

  // 7. Cross-skill setup (taxonomy cat 5)
  applyCrossSkillEffects(slot.cross_skill, attacker);

  // 8. Summon resolution
  if (slot.summon) {
    resolveSummon(slot.summon, attacker, defender, factors);
  }
}
```

### 3.3 SlotModel (pre-computed from book data)

```typescript
interface SlotModel {
  platform: string;
  hit_count: number;

  // Factor baseline (from time-series model)
  baseline: Record<string, number>;   // permanent factors
  temporals: TemporalEvent[];         // duration-gated factors

  // Taxonomy cat 1: passive multipliers (folded into baseline)
  // Taxonomy cat 2: conditional checks
  conditionals: ConditionalEffect[];
  // Taxonomy cat 3: per-hit escalation
  escalation: EscalationDef | null;
  // Taxonomy cat 4: state creation
  state_effects: StateEffect[];
  // Taxonomy cat 5: cross-skill carry
  cross_skill: CrossSkillEffect[];
  // Taxonomy cat 6: reactive triggers (registered on entity)
  reactive_triggers: ReactiveTrigger[];
  // Taxonomy cat 7: state-referencing (resolved at activation time)
  state_refs: StateReference[];

  // Summon
  summon: SummonDef | null;
}
```

### 3.4 Bridge from Factor Model

The simulator reuses `lib/model/time-series.ts` data:

| Time-series output | Simulator input |
|:---|:---|
| `permanent` factors | `SlotModel.baseline` |
| `TemporalEvent[]` | `SlotModel.temporals` (for cross-slot coverage) |
| `SummonEnvelope` | `SlotModel.summon` |
| modifier values | Folded into `baseline` via `resolveModifiers()` |

**New data needed** (not in time-series model):
- `hit_count` per platform (from `data/yaml/model.yaml`)
- Conditional effect definitions (from `exec` layer on EffectTypeDef)
- State effect definitions (buff/debuff/DoT creation params)
- Reactive trigger registrations

---

## 4. Data Requirements

### 4.1 Platform Combat Data (needed in model.yaml or platforms.ts)

Each platform needs:

```yaml
春黎剑阵:
  hit_count: 10
  hit_interval: 0.3        # seconds between hits
  cast_duration: 3.0        # total cast time
  damage_type: skill        # skill | dot | true
  base_pct_per_hit: 2230.5  # D_base / hit_count
  pct_max_hp_per_hit: 0     # for 皓月: 12%
  named_states_created:
    - id: "分身"
      type: summon
      duration: 16
      multiplier: 1.62
```

### 4.2 Affix Exec Data (extend effects.yaml or model.yaml)

Each affix effect needs its `exec` spec resolved to simulator-consumable form:

```yaml
玄心剑魄:
  exec:
    trigger: on_cast
    target: opponent
    creates:
      - id: "噬心"
        type: dot
        damage: 550          # %atk per tick
        tick_interval: 1.0
        duration: 8
        on_dispel:
          damage: 3300
          stun: 2.0
```

### 4.3 Base Stats (input parameter)

```typescript
interface BaseStats {
  hp: number;      // e.g. 500_000
  atk: number;     // e.g. 50_000
  sp: number;      // e.g. 30_000
  def: number;     // e.g. 0.30 (30% base DR)
  crit_rate: number;   // e.g. 0.25
  crit_damage: number; // e.g. 1.50 (150% crit multiplier)
}
```

These come from gear and are **not** modeled by the book system. They're input parameters to the simulator.

---

## 5. Implementation Plan

### Phase 1: Skeleton + Damage Formula
- `lib/simulator/types.ts` — all interfaces above
- `lib/simulator/entity.ts` — EntityState init, damage application, shield absorption
- `lib/simulator/damage.ts` — the damage formula (multiplicative chain)
- `lib/simulator/sim.ts` — core loop (slots × hits), no states/triggers yet
- Test: two naked entities hitting each other, verify HP math

### Phase 2: State Machine
- `lib/simulator/states.ts` — buff/debuff/DoT/shield lifecycle (apply, tick, expire, dispel)
- `lib/simulator/ticks.ts` — inter-slot time progression, DoT damage, duration decay
- Integrate states into the slot resolution loop
- Test: 仙佑 buff applied in slot 1 modifies slot 2 damage; 噬心 DoT ticks between slots

### Phase 3: Triggers
- `lib/simulator/triggers.ts` — the 7 taxonomy categories as trigger handlers
- Conditional evaluation (HP%, debuff count, control state)
- Per-hit escalation
- Reactive triggers (on_attacked)
- Cross-skill carry (灵威 next-skill bonus)
- Test: 心逐神随 ×4 + 天命有归 certain produces ×6 multiplier

### Phase 4: Data Integration
- Extend `model.yaml` with hit_count, cast_duration per platform
- Write `buildSlotModel()` that bridges time-series → SlotModel
- Wire up `app/simulate.ts` CLI:
  ```
  bun app/simulate.ts --a builds/burst.json --b builds/tank.json --stats-a 500000,50000 --stats-b 600000,40000
  ```

### Phase 5: Validation & Output
- Compare simulator total damage vs time-series ∫ total (should be proportional)
- Output: per-slot damage breakdown, HP timeline, state timeline
- Chart: HP curves for both entities over time (reuse Chart.js pattern)

---

## 6. Key Design Decisions

### 6.1 Simultaneous vs Sequential Slot Resolution

**Decision: Simultaneous.** Both players activate their slot at the same time. This avoids first-mover advantage and matches the game's observed behavior.

**Implication:** Within a slot, A's hits land on B's pre-slot state, and B's hits land on A's pre-slot state. State changes (new debuffs, HP loss) from this slot only affect the *next* slot.

**Exception:** Reactive triggers (cat 6) fire *during* the opponent's hit resolution — these are genuinely interleaved. Model as: A hits B → B's reactive fires → next A hit → B's reactive fires → ...

### 6.2 Deterministic vs Stochastic

**Decision: Deterministic (expected value).** Replace probabilities with expected values.

- Crit: multiply by `crit_rate × crit_damage + (1 - crit_rate) × 1.0` → single EV
- 心逐神随 without 天命有归: use E = 2.46 (weighted average of ×2/×3/×4)
- 心逐神随 with 天命有归: use 4.00 (certain)
- 罗天魔咒 30%/60%: use probability × effect value

**Rationale:** Stochastic simulation requires thousands of runs for stable results. EV mode gives instant, reproducible answers. Can add Monte Carlo mode later if variance analysis matters.

### 6.3 Summon Model

**Decision: Summon = extra damage instance per hit, NOT a separate entity.**

The clone copies the skill's base damage and applies a multiplier (×1.62 for 春黎). It does NOT trigger affix effects. Model as:

```
total_hit_damage = hit_damage + (summon_active ? hit_D_base × summon_multiplier : 0)
```

This avoids a second entity state machine for the clone.

### 6.4 State Duration Tracking

**Decision: Continuous time, evaluated at slot boundaries.**

States have `remaining_duration` in seconds. Between slots, advance time by `T_gap` and decrement all durations. States with `remaining_duration ≤ 0` are removed. DoTs fire `floor(T_gap / tick_interval)` times during the gap.

No sub-second resolution needed — the important question is "is this buff still active when the next slot fires?"

### 6.5 Scope of v1

**In scope:**
- All 10 platforms with their hit structures
- Taxonomy cats 1-4 (passive, conditional, flat, state-creating)
- Summon resolution
- Cross-slot temporal coverage
- Base stats as input

**Deferred to v2:**
- Cat 5 cross-skill carry (灵威, 破虚) — small impact, complex sequencing
- Cat 6 reactive triggers (罗天魔咒, 天狼之啸) — requires interleaved resolution
- Cat 7 state-referencing (碎魂剑意, 星猿之怒) — requires named state value tracking
- Monte Carlo mode
- Multi-rotation (slots 7+ cycling back)

---

## 7. File Layout

```
lib/simulator/
  types.ts          # EntityState, SlotModel, SimConfig, SimResult
  entity.ts         # init, applyDamage, applyHealing, applyShield
  damage.ts         # resolveDamage (the multiplicative chain)
  states.ts         # ActiveState lifecycle: apply, tick, expire, dispel
  conditionals.ts   # evaluate conditional multipliers (cat 2)
  sim.ts            # simulate() — the core loop
  bridge.ts         # buildSlotModel() — time-series → SlotModel
app/
  simulate.ts       # CLI entry point
```

---

## 8. Open Questions

| # | Question | Impact | Resolution path |
|:--|:---------|:-------|:----------------|
| 1 | What are the actual base stats for a typical endgame player? | Needed to produce meaningful HP numbers | Ask user / reference game data |
| 2 | Is DR additive or multiplicative with multiple sources? | Changes damage formula significantly | Test in-game or reference 构造规则.pdf |
| 3 | Do shields absorb before or after DR? | Shield effective HP calculation | Test in-game |
| 4 | Does 会心 (crit) apply to DoT ticks? | DoT damage ceiling | Test in-game |
| 5 | Inter-slot gap: exactly 6s or variable? | Temporal coverage boundaries | Measure in-game |
| 6 | Summon: does clone benefit from buffs on caster? | Summon damage model | Test in-game |

---

## Document History

| Version | Date | Changes |
|:--------|:-----|:--------|
| 0.1 | 2026-03-10 | Initial design draft |
