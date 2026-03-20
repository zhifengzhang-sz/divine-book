---
initial date: 2026-03-20
dates of modification: [2026-03-20]
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

# Architectural Gaps — Design Document

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> This document specifies the design for the 5 remaining architectural simplifications in the simulator. Each gap describes the current shortcut, the correct behavior from raw data, the proposed implementation, and the exact changes required.

---

## §1 Gap Inventory

| # | Feature | Current shortcut | Correct behavior | Affected books |
|:--|:--------|:----------------|:-----------------|:---------------|
| 1 | **Summon** | `M_dmg` zone bonus | Spawn summon actor with inherited stats; attacks when main casts | 春黎剑阵 (分身) |
| 2 | **Untargetable** | 100% DR buff | Skip HIT resolution entirely — no damage, no SP drain, no on_attacked triggers | 念剑诀 (4s 不可被选中) |
| 3 | **Periodic cleanse** | Immediate one-shot cleanse | Per-second RNG roll with cooldown and max-trigger cap | 十方真魄 (星猿弃天) |
| 4 | **Shield tracking** | Estimate shield as 10% maxHP; no lifecycle | Track shield instances with expiry; emit SHIELD_EXPIRE on depletion | 九重天凤诀 (玉石俱焚) |
| 5 | **Shield destroy** | Flat %maxHP per hit; estimate shields destroyed | Track enemy shield count; actually destroy shields; count for 碎魂剑意 DoT | 皓月剑诀 (寂灭剑心) |

---

## §2 Gap 1 — Summon Actor (春黎剑阵 分身)

### §2.1 Raw Data

From `data/raw/主书.md`:

> 春黎剑阵：剑化万千，破空位移向前，对范围内目标造成五段共计x%攻击力的灵法伤害，**并创建一个持续存在16秒的分身，继承自身y%的属性**。主角释放神通后分身会攻击敌方，**分身受到的伤害为自身的z%**
> 悟10境，融合83重： x=22305, y=54, z=400

From primary affix `幻象剑灵`:

> 分身受到伤害降低至自身的x%，造成的伤害增加y%
> 融合重数>=50: x=120, y=200

### §2.2 Current Shortcut

```typescript
// summon: simplified as M_dmg zone bonus
register("summon", (effect) => ({
  zones: { M_dmg: (effect.inherit_stats ?? 50) / 100 },
}));
// summon_buff: simplified as M_dmg zone bonus
register("summon_buff", (effect) => ({
  zones: { M_dmg: (effect.damage_increase ?? 0) / 100 },
}));
```

**Problem:** A summon is not a damage modifier — it is an independent entity that:
1. Persists for 16s (across multiple slot casts)
2. Attacks separately when the main character casts
3. Has its own stats (ATK = 54% of owner's ATK)
4. Takes damage independently (at 400% → reduced to 120% by affix)

### §2.3 Design

**Approach: Model the summon as damage echoes via listeners, not a full actor.**

Spawning a separate XState actor for the summon would require routing incoming damage between main and summon, duplicating the entire HIT resolution path, and managing two HP pools. This complexity is disproportionate for ranking purposes.

Instead, model the summon's offensive contribution as a **listener that echoes each outgoing HIT at reduced power** while the summon is alive:

1. The `summon` handler produces an `APPLY_STATE` intent creating a named state `分身` on self with duration 16s.
2. The `summon` handler also produces a **listener** registered on `on_cast` that, while the `分身` state exists, produces echo HIT events to the opponent at `inherit_stats%` of each original HIT's damage.
3. The `summon_buff` handler modifies the echo multiplier: `damage_increase` scales the echo damage upward.

**Summon echo formula:**

```
echoMultiplier = (inherit_stats / 100) × (1 + damage_increase / 100)
echoDamage = originalHitDamage × echoMultiplier
```

For 春黎剑阵 at max fusion with 幻象剑灵:
```
echoMultiplier = 0.54 × (1 + 2.00) = 1.62
```

Each time the owner casts a skill (any slot), if the `分身` state is active, the summon echoes the cast's total damage at this multiplier as a single HIT event to the opponent.

**Defensive side (damage taken):** The summon's damage absorption is modeled as **additional incoming damage to the owner**. When the owner is hit while `分身` is active, extra damage = `damage × (damage_taken_multiplier / 100)`. The `summon_buff` `damage_taken_reduction_to` field modifies this to `damage × (damage_taken_reduction_to / 100)`.

However, for a ranking simulator focused on comparing book sets, the **offensive echo is far more impactful** than the defensive penalty. We implement the echo and leave the defensive side as a future enhancement.

### §2.4 Implementation

**Handler changes (`misc.ts`):**

```typescript
register("summon", (effect) => {
  const duration = effect.duration as number;
  const inheritStats = (effect.inherit_stats as number) ?? 50;
  return {
    intents: [{
      type: "APPLY_STATE",
      state: {
        name: "分身",
        kind: "buff",
        source: "",
        target: "self",
        effects: [{ stat: "summon_echo", value: inheritStats }],
        remainingDuration: duration,
        stacks: 1,
        maxStacks: 1,
        dispellable: true,
      },
    }],
  };
});

register("summon_buff", (effect) => {
  const damageIncrease = (effect.damage_increase as number) ?? 0;
  return {
    intents: [{
      type: "APPLY_STATE",
      state: {
        name: "分身_buff",
        kind: "buff",
        source: "",
        target: "self",
        effects: [{ stat: "summon_damage_increase", value: damageIncrease }],
        remainingDuration: Number.POSITIVE_INFINITY,
        stacks: 1,
        maxStacks: 1,
        dispellable: false,
        parent: "分身",
      },
    }],
  };
});
```

**Player machine changes (`player.ts`):**

In the `BOOK_CAST_HITS` handler, after scheduling HIT delivery, check if the player has an active `分身` state. If so, compute echo damage:

```typescript
// After scheduling original HITs to opponent:
const summonState = ctx.state.states.find(s => s.name === "分身");
if (summonState && ctx.opponentRef) {
  const inheritPct = sumStatEffects([summonState], "summon_echo");
  const dmgIncrease = sumStatEffects(ctx.state.states, "summon_damage_increase");
  const echoMult = (inheritPct / 100) * (1 + dmgIncrease / 100);
  const totalDmg = hits.reduce((sum, h) => sum + h.damage, 0);
  const echoDmg = totalDmg * echoMult;
  // Schedule a single echo HIT after all original hits
  enqueue(sendTo(self, {
    type: "DELIVER_HIT",
    hit: { type: "HIT", hitIndex: -1, damage: echoDmg, spDamage: 0 },
  }, { delay: hits.length * 1000 + 500 }));
}
```

### §2.5 Validation

After implementation, 春黎剑阵 should produce ~162% additional damage via summon echo (at inherit_stats=54, damage_increase=200), compared to the current ~54% M_dmg bonus. This will significantly increase the book's simulated damage output, which better matches its in-game reputation as a top-tier damage book.

---

## §3 Gap 2 — Untargetable State (念剑诀)

### §3.1 Raw Data

From `data/raw/主书.md`:

> 念剑诀：剑影无形，人剑合一，自身化为轰雷剑意，方寸之间位移数次，**在4秒内不可被选中**。

From YAML:
```yaml
- type: untargetable_state
  duration: 4
```

### §3.2 Current Shortcut

```typescript
register("untargetable_state", (effect) => ({
  intents: [{
    type: "APPLY_STATE",
    state: {
      name: "untargetable",
      kind: "buff",
      effects: [{ stat: "damage_reduction", value: 100 }],
      remainingDuration: effect.duration ?? 4,
      ...
    },
  }],
}));
```

**Problem:** 100% DR still:
- Consumes SP (SP → shield calculation runs before DR)
- Triggers `on_attacked` listeners on the player
- Processes per-hit effects (PERCENT_MAX_HP_HIT)
- Reduces resonance SP damage
- Fires shield absorption logic

"不可被选中" means the player cannot be targeted at all — hits should not even reach resolution.

### §3.3 Design

**Approach: Check for `untargetable` state at the top of `resolveHit` and bail out.**

The player machine's HIT handler checks for an `untargetable` named state on the player. If present, the hit is completely discarded — no DR, no SP, no shield, no HP change, no on_attacked triggers.

This is simpler and more correct than 100% DR because it prevents all side effects.

### §3.4 Implementation

**Handler changes (`misc.ts`):**

The handler stays the same (applies a named state), but use kind `"named"` instead of `"buff"` and remove the `damage_reduction` effect since the immunity is enforced at the resolution level:

```typescript
register("untargetable_state", (effect) => ({
  intents: [{
    type: "APPLY_STATE",
    state: {
      name: "untargetable",
      kind: "named",
      source: "",
      target: "self",
      effects: [],  // No stat effects — enforced in resolveHit
      remainingDuration: (effect.duration as number) ?? 4,
      stacks: 1,
      maxStacks: 1,
      dispellable: false,
    },
  }],
}));
```

**Player machine changes (`player.ts`):**

At the top of `resolveHit`, add:

```typescript
function resolveHit(ctx, hit, enqueue, self) {
  // Untargetable: discard hit entirely
  if (ctx.state.states.some(s => s.name === "untargetable")) return;
  // ... rest of existing logic
}
```

### §3.5 Validation

During 念剑诀's 4s untargetable window, the player should take exactly 0 damage from all sources, have 0 SP drain, and trigger no on_attacked effects. After the state expires, hits resolve normally.

---

## §4 Gap 3 — Periodic Cleanse (十方真魄 星猿弃天)

### §4.1 Raw Data

From `data/raw/主书.md`:

> 十方真魄 主词缀【星猿弃天】：延长x秒【怒灵降世】持续时间，并且每秒有y%概率驱散自身所有`控制状态`，25秒内最多触发1次驱散状态
> x=3.5, y=30

From YAML:
```yaml
- type: periodic_cleanse
  chance: 30
  interval: 1
  cooldown: 25
  max_triggers: 1
  parent: this
```

### §4.2 Current Shortcut

```typescript
register("periodic_cleanse", () => ({
  intents: [{ type: "SELF_CLEANSE", count: 1 }],
}));
```

**Problem:** Fires once immediately instead of rolling 30% per second over the duration.

### §4.3 Design

**Approach: Register a `per_tick` listener that rolls RNG and tracks trigger count.**

The periodic cleanse creates a named state with `per_tick` trigger, and a listener that:
1. Rolls `rng.chance(chance/100)` each tick
2. If successful and `triggerCount < max_triggers`, emits `SELF_CLEANSE` and increments the counter
3. Uses closure state to track the trigger count and cooldown

The named state's parent is the primary state being extended (怒灵降世), so it lives and dies with that parent.

### §4.4 Implementation

**Handler changes (`misc.ts`):**

```typescript
register("periodic_cleanse", (effect) => {
  const chance = (effect.chance as number) ?? 30;
  const interval = (effect.interval as number) ?? 1;
  const maxTriggers = (effect.max_triggers as number) ?? 1;
  const parent = (effect.parent as string) ?? "periodic_cleanse";

  let triggerCount = 0;

  return {
    intents: [{
      type: "APPLY_STATE",
      state: {
        name: "periodic_cleanse",
        kind: "buff",
        source: "",
        target: "self",
        effects: [],
        remainingDuration: Number.POSITIVE_INFINITY,
        stacks: 1,
        maxStacks: 1,
        dispellable: false,
        trigger: "per_tick",
        tickInterval: interval,
        parent,
      },
    }],
    listeners: [{
      parent: "periodic_cleanse",
      trigger: "per_tick" as const,
      handler: (ctx) => {
        if (triggerCount >= maxTriggers) return [];
        if (!ctx.rng.chance(chance / 100)) return [];
        triggerCount++;
        return [{ type: "SELF_CLEANSE" as const, count: Infinity }];
        // count: Infinity = cleanse ALL control states
      },
    }],
  };
});
```

**Note:** `count: Infinity` for cleansing all control states, matching "驱散自身所有控制状态". The player's SELF_CLEANSE handler needs to support `count: Infinity` to remove all control-type debuffs.

### §4.5 Validation

Over a 25-second window at 30% per tick, the expected number of successful rolls is `25 × 0.30 = 7.5`, but capped at 1 trigger. So the cleanse fires at most once, on average by second 3-4. This is faithful to the original mechanic.

---

## §5 Gap 4 — Shield Tracking (九重天凤诀 玉石俱焚)

### §5.1 Raw Data

From `data/raw/专属词缀.md`:

> 九重天凤诀【玉石俱焚】：当本神通所添加的`护盾`消失时，会对敌方额外造成护盾值x%的伤害
> 融合50重：x=100

This requires knowing:
1. Which shields were added by this specific skill
2. The exact value of each shield when it expires
3. Distinguishing between skill-added shields and SP-generated shields

### §5.2 Current Shortcut

```typescript
register("on_shield_expire", (effect, ctx) => {
  const pct = (effect.damage_percent_of_shield as number) ?? 100;
  const estimatedShield = ctx.sourcePlayer.maxHp * 0.1;
  return {
    intents: [{
      type: "HIT", hitIndex: -1,
      damage: (pct / 100) * estimatedShield, spDamage: 0,
    }],
  };
});
```

**Problem:** Fires immediately at cast time with a hardcoded 10% maxHP estimate instead of waiting for the shield to actually expire.

### §5.3 Design

**Approach: Track named shield instances in PlayerState.**

Currently `PlayerState.shield` is a single number. We need to:

1. **Add a `shields` array** to PlayerState that tracks individual shield instances:

```typescript
interface ShieldInstance {
  name: string;       // e.g., "蛮神_shield" (from skill), or "sp_shield" (SP-generated)
  source: string;     // book name
  value: number;      // current remaining absorption
  maxValue: number;   // original value when applied
  expiresAt?: number; // simulation time when it expires (undefined = permanent)
}
```

2. **Modify SHIELD intent resolution** to push a new ShieldInstance and schedule an expiry event.

3. **Modify HIT resolution** to absorb damage from shields in order (oldest first), depleting individual shield instances. When a shield's value reaches 0, it is removed and a `SHIELD_EXPIRE` state-change event is emitted.

4. **Add `on_shield_expire` listener support:** The `on_shield_expire` handler registers a listener that fires when any shield from the same book expires, dealing `(expired shield value) × pct` as damage to the opponent.

### §5.4 Implementation

**Type changes (`types.ts`):**

```typescript
export interface ShieldInstance {
  name: string;
  source: string;
  value: number;
  maxValue: number;
  remainingDuration: number; // Infinity = permanent
}

// Extend PlayerState:
interface PlayerState {
  // ... existing fields ...
  shields: ShieldInstance[];  // NEW — tracked shield instances
  // shield: number;          // KEEP for backwards compat (= sum of shields[].value)
}
```

**Intent changes (`types.ts`):**

Extend `ShieldEvent` to carry a name and source:

```typescript
export interface ShieldEvent {
  type: "SHIELD";
  value: number;
  duration: number;
  name?: string;     // NEW — shield identity
  source?: string;   // NEW — book that created it
}
```

**Player machine changes (`player.ts`):**

- `SHIELD` handler: push to `shields[]`, schedule `SHIELD_EXPIRE_INTERNAL` at duration end.
- `resolveHit` step 3 (skill-generated shield absorb): iterate `shields[]` oldest-first, decrement each shield's value, remove depleted shields and emit `SHIELD_EXPIRE` events.
- New `SHIELD_EXPIRE_INTERNAL` event handler: remove shields by name when they time out (even if not fully depleted).

**Handler changes (`misc.ts`):**

```typescript
register("on_shield_expire", (effect) => {
  const pct = (effect.damage_percent_of_shield as number) ?? 100;
  return {
    listeners: [{
      parent: "__shield__",
      trigger: "on_expire" as const,
      handler: (ctx) => {
        // ctx will include shieldValue from the expiry event
        const shieldValue = (ctx as any).shieldValue ?? 0;
        return [{
          type: "HIT" as const,
          hitIndex: -1,
          damage: (pct / 100) * shieldValue,
          spDamage: 0,
        }];
      },
    }],
  };
});
```

### §5.5 Backwards Compatibility

The `shield: number` field on PlayerState is kept as the sum of all `shields[].value` entries, updated after every modification. Existing code that reads `ctx.state.shield` continues to work. The `shields[]` array is the source of truth.

### §5.6 Validation

For 九重天凤诀: if the skill generates a shield of value S (from 蛮神 buff), then when that shield is consumed or expires, 玉石俱焚 should deal S × 100% damage to the opponent. This replaces the hardcoded 10% maxHP estimate.

---

## §6 Gap 5 — Shield Destroy (皓月剑诀 寂灭剑心)

### §6.1 Raw Data

From `data/raw/主书.md`:

> 皓月剑诀：对范围内目标造成十段共计x%攻击力的灵法伤害，神通释放时自身获得增益状态【寂灭剑心】：**每段伤害命中时湮灭敌方1个护盾**，并额外造成y%敌方最大气血值的伤害；**对无盾目标造成双倍伤害**
> x=22305, y=12

From primary affix `碎魂剑意`:

> 【碎魂剑意】：【寂灭剑心】每0.5秒对目标造成`湮灭护盾`的总个数×600%攻击力的伤害（若触发湮灭护盾效果时敌方无护盾加持，则计算湮灭2个护盾）

### §6.2 Current Shortcut

```typescript
// shield_destroy_damage: just %maxHP per hit, no shield destruction
register("shield_destroy_damage", (effect) => ({
  perHitEffects: () => [{
    type: "PERCENT_MAX_HP_HIT",
    percent: (effect.percent_max_hp as number) ?? 12,
  }],
}));

// shield_destroy_dot: estimates shields destroyed = no_shield_assumed
register("shield_destroy_dot", (effect) => ({
  listeners: [{
    parent, trigger: "per_tick",
    handler: (ctx) => {
      const damage = (perShield / 100) * ctx.sourcePlayer.atk * noShieldCount;
      return [{ type: "HIT", ... }];
    },
  }],
}));
```

**Problem:**
- `shield_destroy_damage`: doesn't actually destroy shields; just does flat %maxHP
- `shield_destroy_dot`: uses a hardcoded `noShieldCount` instead of tracking actual shield destruction count
- `no_shield_double_damage`: hardcoded `M_dmg: 1.0` instead of checking target's shield state

### §6.3 Design

**Dependencies:** This gap requires Gap 4 (shield tracking) to be implemented first, since we need `shields[]` on the target to count and destroy.

**Approach:**

1. **`shield_destroy_damage`**: Returns a per-hit effect that:
   - Checks target's `shields[]` array
   - Removes one shield instance (newest first, representing "湮灭")
   - Increments a `destroyedShields` counter on the source player
   - Deals `percent_max_hp%` of target's maxHP as additional damage

2. **`no_shield_double_damage`**: Returns a per-hit effect that checks target's `shields[]`:
   - If `shields.length === 0`: applies `M_dmg: 1.0` (double damage)
   - If `shields.length > 0`: no bonus

3. **`shield_destroy_dot` (碎魂剑意)**: Listener on `per_tick` that reads the accumulated `destroyedShields` count and deals `count × per_shield_damage% ATK` damage.

**New intent type:** `SHIELD_DESTROY`

```typescript
export interface ShieldDestroyEvent {
  type: "SHIELD_DESTROY";
  count: number;  // number of shields to destroy
}
```

The player machine resolves `SHIELD_DESTROY` by:
1. Removing `count` shield instances from `shields[]` (newest first)
2. Emitting `SHIELD_CHANGE` events
3. Incrementing a `destroyedShieldsTotal` counter in player state (for 碎魂剑意 to read)

### §6.4 Implementation

**Type changes (`types.ts`):**

Add `SHIELD_DESTROY` to `IntentEvent` union:

```typescript
export interface ShieldDestroyEvent {
  type: "SHIELD_DESTROY";
  count: number;
}
```

Add to `PlayerState`:

```typescript
interface PlayerState {
  // ... existing ...
  destroyedShieldsTotal: number;  // accumulated count for 碎魂剑意
}
```

**Handler changes (`misc.ts`):**

```typescript
register("shield_destroy_damage", (effect) => ({
  perHitEffects: () => [
    { type: "SHIELD_DESTROY", count: (effect.shields_per_hit as number) ?? 1 },
    { type: "PERCENT_MAX_HP_HIT", percent: (effect.percent_max_hp as number) ?? 12 },
  ],
}));

register("no_shield_double_damage", () => ({
  perHitEffects: (hitIndex: number) => [],
  // Actual check happens in resolveHit: if target has no shields, double damage
  // Modeled via a conditional M_dmg zone applied per-hit in resolveHit
}));
```

Actually, `no_shield_double_damage` is better modeled as a **conditional per-hit effect** that checks target state at resolution time. Since handlers run at the source (book actor) without access to target state, this needs to be resolved at the player level.

**Better approach:** Have `shield_destroy_damage` and `no_shield_double_damage` return special intent types that the target player resolves:

```typescript
register("shield_destroy_damage", (effect) => ({
  perHitEffects: () => [{
    type: "SHIELD_DESTROY" as const,
    count: (effect.shields_per_hit as number) ?? 1,
    bonusPercentMaxHp: (effect.percent_max_hp as number) ?? 12,
  }],
}));

register("no_shield_double_damage", () => ({
  perHitEffects: () => [{
    type: "NO_SHIELD_DOUBLE" as const,
  }],
}));
```

In `resolveHit`, after normal damage resolution, process these per-hit effects:
- `SHIELD_DESTROY`: remove shields from target, increment counter, deal bonus %maxHP
- `NO_SHIELD_DOUBLE`: if `target.shields.length === 0`, apply the hit's damage again (double it)

For `shield_destroy_dot`:

```typescript
register("shield_destroy_dot", (effect, _ctx) => {
  const parent = (effect.parent as string) ?? "shield_destroy_dot";
  const perShield = (effect.per_shield_damage as number) ?? 600;
  const noShieldAssumed = (effect.no_shield_assumed as number) ?? 2;
  return {
    listeners: [{
      parent,
      trigger: "per_tick" as const,
      handler: (listenerCtx) => {
        // Read actual destroyed shield count from source player state
        const count = listenerCtx.sourcePlayer.destroyedShieldsTotal || 0;
        // If no shields were destroyed and target has no shield, count as noShieldAssumed
        const effectiveCount = count > 0 ? count : noShieldAssumed;
        const damage = (perShield / 100) * listenerCtx.sourcePlayer.atk * effectiveCount;
        return [{
          type: "HIT" as const,
          hitIndex: -1,
          damage,
          spDamage: 0,
        }];
      },
    }],
  };
});
```

### §6.5 Validation

For 皓月剑诀 with 10 hits:
- Each hit destroys 1 shield and deals 12% target maxHP
- If target has no shields, each hit deals double damage
- 碎魂剑意 ticks every 0.5s, dealing `destroyedCount × 600% ATK` per tick
- Over 4 seconds (8 ticks), with 10 shields destroyed: `10 × 6.0 × ATK × 8 = 480 ATK` additional damage

---

## §7 Implementation Order

These gaps have dependencies:

```
Gap 4 (shield tracking) ← Gap 5 (shield destroy) depends on it
                         ← Gap 4's on_shield_expire depends on it

Gap 1 (summon)     — independent
Gap 2 (untargetable) — independent
Gap 3 (periodic cleanse) — independent
```

**Recommended order:**

1. **Gap 2 — Untargetable** (smallest change, isolated)
2. **Gap 3 — Periodic cleanse** (medium, self-contained)
3. **Gap 4 — Shield tracking** (foundational for gap 5)
4. **Gap 5 — Shield destroy** (depends on gap 4)
5. **Gap 1 — Summon** (largest change, but independent)

Each gap should be implemented and tested independently before moving to the next.

---

## §8 Type System Changes Summary

### New types added to `types.ts`:

```typescript
// Shield instance tracking
interface ShieldInstance {
  name: string;
  source: string;
  value: number;
  maxValue: number;
  remainingDuration: number;
}

// New intent event
interface ShieldDestroyEvent {
  type: "SHIELD_DESTROY";
  count: number;
  bonusPercentMaxHp?: number;
}

// New per-hit effect
interface NoShieldDoubleEvent {
  type: "NO_SHIELD_DOUBLE";
}
```

### Modified types:

```typescript
// PlayerState additions:
interface PlayerState {
  shields: ShieldInstance[];
  destroyedShieldsTotal: number;
}

// ShieldEvent additions:
interface ShieldEvent {
  name?: string;
  source?: string;
}

// IntentEvent union additions:
type IntentEvent = ... | ShieldDestroyEvent;
```

### New PlayerMachineEvent:

```typescript
| { type: "SHIELD_EXPIRE_INTERNAL"; name: string }
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-20 | Initial design for all 5 gaps |
