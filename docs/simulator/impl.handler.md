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

# Effect Handler Specification

**Date:** 2026-03-16

> Each handler is a pure function inside the book actor. It reads an EffectRow from the YAML data and produces a HandlerResult (zone contributions + intent events). The book actor collects all results, computes the damage chain, and sends the final intents.

---

## Handler Result

A handler returns a `HandlerResult` — it does not send intents. The book actor collects all results and produces the final intents.

| Field | Type | Purpose |
|:------|:-----|:--------|
| `basePercent` | number | Base damage % (from base_attack) |
| `hitsOverride` | number | Number of hits |
| `flatExtra` | number | D_flat: absolute flat damage added to chain |
| `zones.S_coeff` | number | ATK scaling: `effectiveATK = ATK × (1 + S_coeff)` |
| `zones.M_dmg` | number | Damage zone (additive within zone) |
| `zones.M_skill` | number | Skill zone (additive within zone) |
| `zones.M_final` | number | Final zone (additive within zone) |
| `zones.M_synchro` | number | Synchrony multiplier (multiplicative) |
| `perHitEscalation` | function | `(hitIndex) → { M_skill?, M_dmg? }` — per-hit zone bonus |
| `perHitEffects` | function | `(hitIndex) → Intent[]` — sub-intents per hit |
| `spDamage` | number | Resonance 灵力 damage (absolute) |
| `intents` | Intent[] | Non-damage intents (APPLY_STATE, HEAL, etc.) |
| `listeners` | ListenerRegistration[] | Reactive subscriptions to named state events |

Multiple handlers stack: zones are additive (except M_synchro which is multiplicative). Multiple `perHitEscalation` functions stack additively per zone.

---

## Phase 1 Handlers

### base_attack

**Source:** "造成x段共计y%攻击力的灵法伤害"
**Data:** `{ hits, total }`
**Result:** `{ basePercent: total, hitsOverride: hits }`

### percent_max_hp_damage

**Source:** "每段攻击造成目标y%最大气血值的伤害" — "伤害" not "真实伤害"
**Data:** `{ value, cap_vs_monster? }`
**Result:** `{ perHitEffects: () => [PERCENT_MAX_HP_HIT { percent: value }] }`

Target resolves: `damage = percent/100 × target.maxHp` → applies DR. Source does not know target's maxHp.

### flat_extra_damage

**Source:** "额外造成2000%攻击力的伤害" (斩岳)
**Data:** `{ value }`
**Result:** `{ flatExtra: (value/100) × ATK }`

### damage_increase

**Source:** "伤害提升x%" (通天剑诀: 36%)
**Data:** `{ value }`
**Result:** `{ zones: { M_dmg: value/100 } }`

### skill_damage_increase

**Source:** "神通伤害加深x%" (无极剑阵: 555%)
**Data:** `{ value }`
**Result:** `{ zones: { M_skill: value/100 } }`

### attack_bonus

**Source:** "提升x%攻击力的效果" (摧山: 20%, 摧云折月: 300%)
**Data:** `{ value }`
**Result:** `{ zones: { S_coeff: value/100 } }`

Cast-scoped zone, not a persistent state. `effectiveATK = ATK × (1 + S_coeff)`.

### per_hit_escalation

**Source:** "每段攻击造成伤害后，下一段提升x%神通加成" (惊神剑光: 42.5%) / "每造成1段伤害，剩余段数伤害提升y%" (心火淬锋: 5%, max 50%)
**Data:** `{ value, stat, max? }`
**Result:** `{ perHitEscalation: (k) => { M_skill or M_dmg: min(k × value/100, max/100) } }`

| stat | Zone |
|:-----|:-----|
| `skill_bonus` | M_skill |
| `damage`, `remaining_hits` | M_dmg |

Multiple sources stack additively per zone.

### guaranteed_resonance

**Source:** "必定会心造成x倍伤害，并有y%概率将之提升至z倍" (通明: 1.2/25%/1.5, 灵犀九重: 2.97/25%/3.97)
**Data:** `{ base_multiplier, chance, upgraded_multiplier }`
**Result:** `{ spDamage: mult × ATK }` where `mult = rng.chance(chance/100) ? upgraded : base`

Separate 灵力 attack line. Not in the 气血 damage chain.

### probability_multiplier

**Source:** "所有效果x%概率提升4倍，y%概率提升3倍，z%概率提升2倍" (心逐神随)
**Data:** `{ chance_4x, chance_3x, chance_2x }` — cumulative probabilities
**Result:** `{ zones: { M_synchro: picked_multiplier } }`

Rolled once per cast. Multiplies everything.

### debuff

**Source:** Various. "治疗量降低31%" (灵涸), "神通伤害减免" (新-青元剑诀)
**Data:** `{ target (stat), value, duration, dispellable?, name?, max_stacks? }`
**Result:** `{ intents: [APPLY_STATE { kind: "debuff", effects: [{ stat: target, value }], ... }] }`

Opponent-targeted. The `target` field is the stat being modified (e.g., "healing_received"), not the recipient.

### self_buff

**Source:** "提升自身20%的攻击力与伤害减免" (怒灵降世)
**Data:** `{ attack_bonus?, defense_bonus?, ..., duration, name? }`
**Result:** `{ intents: [APPLY_STATE { kind: "buff", effects: [...], duration, ... }] }`

Self-targeted. Persistent (has duration). Affects future casts' effective stats.

### dot

**Source:** "每秒受到550%攻击力的伤害" (噬心)
**Data:** `{ name, duration, tick_interval, damage_per_tick }`
**Result:** `{ intents: [APPLY_DOT { damagePerTick: (damage_per_tick/100) × ATK, ... }] }`

`damage_per_tick` is in %ATK. Converted to absolute at source-side.

### shield_strength

**Source:** Various. Check the `source` field for the basis.
**Data:** `{ value, duration?, source? }`
**Result:** `{ intents: [SHIELD { value: computed, duration }] }`

If `source === "self_max_hp"`: `value = (v/100) × sourcePlayer.maxHp`.
Otherwise: `value = (v/100) × ATK`.

### lifesteal

**Source:** "获得x%的吸血效果" (仙灵汲元: 55%)
**Data:** `{ value }`
**Result:** computed after damage chain — `{ intents: [HEAL { value: (v/100) × totalHitDamage }] }`

The book actor knows the total HIT damage it produced. Lifesteal heal = `percent/100 × sum(all HIT.damage)`. Self-targeted HEAL. No feedback from target needed.

### self_hp_cost

**Source:** "消耗自身x%当前气血值" (十方真魄: 10%)
**Data:** `{ value, per_hit?, tick_interval?, duration? }`
**Result:** `{ intents: [HP_COST { percent: value, basis: "current" }] }`

Basic form: one-time cost on cast. `per_hit` and periodic forms are Phase 2.

### self_heal

**Source:** "恢复20%攻击力的气血" (instant) / "每秒恢复x%攻击力的气血" (per_tick, 灵鹤)
**Data:** Instant: `{ value }`. Per-tick: `{ per_tick, total, tick_interval, name }`

Instant: `{ intents: [HEAL { value: (v/100) × ATK }] }`
Per-tick: `{ intents: [APPLY_STATE { named, trigger: per_tick }], listeners: [{ parent: name, trigger: per_tick, handler: () => [HEAL { value: (per_tick/100) × ATK }] }] }`

### heal_echo_damage

**Source:** "恢复时额外对目标造成等额伤害" (周天星元)
**Data:** `{ ratio }` — "等额" = ratio 1.0 (100%)
**Result:** `{ listeners: [subscribe to HEAL events → produce HIT { damage: healAmount × ratio } to opponent] }`

Reactive: listens for healing events from the same cast, echoes as damage. The listener produces HIT intents sent to the opponent.

### damage_reduction_during_cast

**Source:** "施放期间提升自身x%的伤害减免" (金汤: 10%)
**Data:** `{ value }`
**Result:** `{ intents: [APPLY_STATE { kind: "buff", effects: [{ stat: "damage_reduction", value }], duration: cast_duration }] }`

---

## Damage Chain Formula

The book actor collects all HandlerResults and computes:

```
For hit k (0-indexed):
  baseDmg = (basePercent / hits / 100) × ATK × (1 + S_coeff) + flatExtra / hits
  damage = baseDmg
         × (1 + M_dmg + escalation_M_dmg(k))
         × (1 + M_skill + escalation_M_skill(k))
         × (1 + M_final)
         × M_synchro
```

One HIT intent per hit, with `damage` pre-computed and `perHitEffects` attached.

After all HITs are computed, if lifesteal is present:
```
totalDamage = sum(all HIT.damage)
lifestealHeal = (lifestealPercent / 100) × totalDamage
→ self-targeted HEAL { value: lifestealHeal }
```
