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

# Handler Reference

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> Complete reference for every effect handler in the simulator. Each entry documents the raw Chinese text pattern, YAML data shape, game mechanic, implementation approach, and caveats. This is the spec that prevents shortcuts.

---

## HandlerResult Contract

Every handler is a pure function: `(effect: EffectRow, ctx: HandlerContext) → HandlerResult`.

```typescript
interface HandlerContext {
  sourcePlayer: Readonly<PlayerState>;
  targetPlayer: Readonly<PlayerState>;
  book: string;
  slot: number;
  rng: SeededRNGInterface;
  atk: number;
  hits: number;
}

interface HandlerResult {
  basePercent?: number;
  hitsOverride?: number;
  flatExtra?: number;
  zones?: { S_coeff?, M_dmg?, M_skill?, M_final?, M_synchro? };
  perHitEscalation?: (k: number) => { M_skill?, M_dmg? };
  perHitEffects?: (k: number) => IntentEvent[];
  forceSynchroMax?: boolean;
  spDamage?: number;
  intents?: IntentEvent[];
  listeners?: ListenerRegistration[];
}
```

Multiple handlers stack: zones are additive within each zone (except M_synchro which is multiplicative). Flat extras are additive. Intents and listeners concatenate.

---

## §1 Core Damage

### base_attack

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 造成x段共计y%攻击力的灵法伤害 |
| **Data** | `{ hits: number, total: number, data_state }` |
| **Result** | `{ basePercent: total, hitsOverride: hits }` |
| **Mechanic** | Sets the base damage percentage and hit count for the damage chain. `total` is the summed %ATK across all hits. |
| **Caveats** | Multiple base_attack entries with different `data_state` are tier-selected (only one applies). |

### percent_max_hp_damage

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 每段攻击造成目标y%最大气血值的伤害 |
| **Data** | `{ value: number, cap_vs_monster?: number, data_state }` |
| **Result** | `{ perHitEffects: () => [{ type: "PERCENT_MAX_HP_HIT", percent: value }] }` |
| **Mechanic** | Each hit deals additional damage equal to `value%` of target's maxHP. Subject to DR. Not true damage. |
| **Caveats** | Target resolves: `damage = (percent/100) × target.maxHp` → normal DR pipeline. |

### flat_extra_damage

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 额外造成x%攻击力的伤害 |
| **Data** | `{ value: number }` |
| **Result** | `{ flatExtra: (value/100) × atk }` |
| **Mechanic** | Adds `x% ATK` flat damage, distributed across hits. NOT multiplied by any zone. |
| **Caveats** | "攻击力" is the player's ATK attribute, not the skill's scaled coefficient. |
| **Examples** | 斩岳 (2000%), 破灭天光 (2500%) |

### self_lost_hp_damage

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 额外对目标造成自身z%已损失气血值的伤害 |
| **Data** | `{ value, per_hit?, self_heal?, parent?, tick_interval?, includes_hp_spent?, every_n_hits?, name?, next_skill_hits? }` |
| **Result** | Varies by form — flat extra, per-hit effects, or listeners |
| **Mechanic** | Deals damage based on own lost HP (`maxHp - hp`). Multiple forms: one-shot, per-hit, periodic. `self_heal: true` means "等额恢复" (heal equal to damage dealt). |
| **Examples** | 十方真魄 (16%, self_heal), 玄煞灵影诀 (11%), 九重天凤诀 (25%/hit) |

### percent_current_hp_damage

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 造成目标y%当前气血值的伤害 |
| **Data** | `{ value, per_prior_hit?, accumulation? }` |
| **Result** | `{ perHitEffects: () => [{ type: "HP_DAMAGE", percent, basis: "current" }] }` |
| **Mechanic** | Each hit deals `value%` of target's current HP. |
| **Examples** | 噬心之咒 (7%/0.5s), 贪妄业火 (3%/s) |

---

## §2 Damage Modifiers (Zones)

### damage_increase

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 伤害提升x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100 } }` |
| **Mechanic** | General damage multiplier. Additive with other M_dmg sources. |

### skill_damage_increase

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 神通伤害加深x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_skill: value/100 } }` |
| **Mechanic** | Skill-specific damage multiplier. Separate multiplicative zone from M_dmg. |
| **Examples** | 灵威 (118%), 无极剑阵 (555%) |

### attack_bonus

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 提升x%攻击力的效果 |
| **Data** | `{ value }` |
| **Result** | `{ zones: { S_coeff: value/100 } }` |
| **Mechanic** | ATK scaling for this cast only: `effectiveATK = ATK × (1 + S_coeff)`. Not a persistent stat buff. |
| **Examples** | 摧山 (20%), 摧云折月 (300%) |

### final_damage_bonus

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 最终伤害加深x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_final: value/100 } }` |
| **Mechanic** | Final multiplicative layer, applied last before M_synchro. |
| **Examples** | 明王之路 (50%) |

### crit_damage_bonus

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 暴击伤害提高y% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100 } }` |
| **Mechanic** | Crit damage bonus. Mapped to M_dmg zone since crit system is not fully modeled. |

### triple_bonus

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 提升x%攻击力、y%伤害、z%暴击伤害 |
| **Data** | `{ attack_bonus, damage_increase, crit_damage_increase }` |
| **Result** | `{ zones: { S_coeff: attack/100, M_dmg: (damage + crit)/100 } }` |
| **Mechanic** | Compound bonus: ATK + damage + crit damage simultaneously. |
| **Examples** | 破碎无双 (15/15/15) |

### random_buff

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 任意1个加成：攻击/致命伤害/伤害x% |
| **Data** | `{ attack, crit_damage, damage }` |
| **Result** | `{ zones: { [randomStat]: value } }` — one of three selected via RNG |
| **Mechanic** | Randomly picks one of three bonuses using `ctx.rng`. |
| **Examples** | 福荫 (20%), 景星天佑 (55%) |

---

## §3 Damage Escalation

### per_hit_escalation

| | |
|:--|:--|
| **File** | `escalation.ts` |
| **Chinese** | 每段攻击造成伤害后，下一段提升x%神通加成 / 每造成1段伤害，剩余段数伤害提升y% |
| **Data** | `{ value, stat: "skill_bonus" \| "damage" \| "remaining_hits", max? }` |
| **Result** | `{ perHitEscalation: (k) => { M_skill or M_dmg: min(k × value/100, max/100) } }` |
| **Mechanic** | Progressive damage ramp within multi-hit skill. Hit k gets `k × value%` bonus. |
| **Examples** | 惊神剑光 (42.5% skill), 心火淬锋 (5%/cap50%), 破竹 (1%/cap10%) |

### periodic_escalation

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 每造成N次伤害时，伤害提升x倍 |
| **Data** | `{ every_n_hits, multiplier, max_stacks }` |
| **Result** | `{ perHitEscalation: (k) => { M_skill: stacks × (mult - 1) } }` |
| **Mechanic** | Every N hits, stacking multiplier. 念剑诀: every 2 hits → 1.4× stacking up to 10 times. |
| **Caveats** | Stacks cap at `max_stacks`. Each stack adds `(multiplier - 1)` to M_skill zone. |

---

## §4 Conditional Damage

### conditional_damage

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 敌方处于控制效果，伤害提升x% / 敌方当前气血值每损失x% |
| **Data** | `{ condition, value, per_step?, max_triggers?, escalated_value?, parent? }` |
| **Result** | `{ flatExtra: (value/100) × atk }` (when condition met) |
| **Mechanic** | Conditional bonus damage. Evaluates target's state. Conditions: `target_controlled`, `target_hp_below`, `per_enemy_lost_hp_percent`. |
| **Examples** | 击瑕 (40%), 乘胜逐北 (100%), 焚心剑芒 (5%→10%) |

### execute_conditional

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 敌方气血值低于30%，伤害提升x% |
| **Data** | `{ hp_threshold, damage_increase, crit_rate_increase }` |
| **Result** | `{ zones: { M_dmg: damage_increase/100 } }` |
| **Mechanic** | Execute-phase bonus when target HP below threshold. |
| **Caveats** | Currently always-active simplification — should check target HP at resolution time. |
| **Examples** | 怒目 (20% + crit 30%), 溃魂击瑕 (100% + guaranteed crit) |

### per_self_lost_hp

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 自身每多损失1%最大气血值，伤害提升x% |
| **Data** | `{ per_percent }` |
| **Result** | `{ zones: { M_dmg: lostHpPercent × per_percent/100 } }` |
| **Mechanic** | Scales with own lost HP percentage. Reads `sourcePlayer.hp` and `sourcePlayer.maxHp`. |
| **Examples** | 战意 (2.95%), 怒血战意 (2%) |

### per_enemy_lost_hp

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 敌方每多损失1%最大气血值，伤害提升x% |
| **Data** | `{ per_percent, value, parent? }` |
| **Result** | `{ zones: { M_dmg: bonus/100 } }` |
| **Mechanic** | Scales with enemy lost HP. Reads `targetPlayer.hp` and `targetPlayer.maxHp`. |
| **Examples** | 吞海 (0.4%), 贪狼吞星 (1%) |

### min_lost_hp_threshold

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 已损气血值至少按已损x%计算，伤害提升y% |
| **Data** | `{ min_percent, damage_increase }` |
| **Result** | `{ zones: { M_dmg: damage_increase/100 } }` |
| **Mechanic** | Floor on lost-HP-based damage calculations plus flat bonus. |
| **Examples** | 意坠深渊 (11%/50%) |

### per_debuff_stack_damage

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 目标每有N层减益效果，伤害提升x% |
| **Data** | `{ per_n_stacks, value, max?, max_stacks?, parent? }` |
| **Result** | `{ flatExtra: (bonusPercent/100) × atk }` |
| **Mechanic** | Counts debuff stacks on target, multiplies by per-stack bonus. |
| **Examples** | 引灵摘魂 (104%), 解体化形 (50%/debuff, max 10) |

### per_debuff_stack_true_damage

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 目标每有1层减益状态，额外造成目标x%最大气血值的真实伤害 |
| **Data** | `{ per_stack, max }` |
| **Result** | `{ intents: [{ type: "HP_DAMAGE", percent: bonus, basis: "max" }] }` |
| **Mechanic** | True damage (bypasses DR). Counts debuffs, capped at `max%`. |
| **Examples** | 索心真诀 (2.1%/stack, max 21%) |

### per_buff_stack_damage

| | |
|:--|:--|
| **File** | `damage.ts` |
| **Chinese** | 自身每N层增益状态，提升y%伤害 |
| **Data** | `{ per_n_stacks, value, max }` |
| **Result** | `{ flatExtra: (bonus/100) × atk }` |
| **Mechanic** | Counts own buff stacks, scales damage. |
| **Examples** | 真极穿空 (5 stacks → 5.5%, max 27.5%) |

---

## §5 Synchro Multiplier

### probability_multiplier

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 所有效果x%概率提升4倍，y%概率提升3倍，z%概率提升2倍 |
| **Data** | `{ chance_4x, chance_3x, chance_2x }` |
| **Result** | `{ zones: { M_synchro: pickedMultiplier } }` |
| **Mechanic** | Rolled once per cast via `ctx.rng`. Cumulative probability tiers. Multiplies everything. |
| **Examples** | 心逐神随 (×2/×3/×4) |

### probability_to_certain

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 概率触发→必定触发，伤害提升x% |
| **Data** | `{ damage_increase }` |
| **Result** | `{ forceSynchroMax: true, zones: { M_dmg: damage_increase/100 } }` |
| **Mechanic** | Collapses probability_multiplier to certainty (4×). Also grants flat damage bonus. |
| **Caveats** | `forceSynchroMax` flag in damage chain: if M_synchro > 1, set to 4. |
| **Examples** | 天命有归 (50%) |

---

## §6 Resonance

### guaranteed_resonance

| | |
|:--|:--|
| **File** | `resonance.ts` |
| **Chinese** | 必定会心造成x倍伤害，y%概率提升至z倍 |
| **Data** | `{ base_multiplier, chance, upgraded_multiplier }` |
| **Result** | `{ spDamage: mult × atk }` |
| **Mechanic** | Separate SP attack line. Rolls `rng.chance(chance/100)` for upgraded multiplier. Not in HP damage chain. |
| **Examples** | 通明 (1.2×/25%/1.5×), 灵犀九重 (2.97×/25%/3.97×) |

---

## §7 Buff / Self Buff

### self_buff

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 提升自身x%的攻击力与伤害减免 / 添加增益状态 |
| **Data** | `{ attack_bonus?, defense_bonus?, damage_reduction?, final_damage_bonus?, skill_damage_increase?, crit_rate?, duration, name?, max_stacks? }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state }] }` |
| **Mechanic** | Creates a persistent self buff with given stat effects and duration. Stacks up to max_stacks. |
| **Examples** | 怒灵降世 (+20% ATK/DR, 4s), 蛮神 (+2.5% ATK/crit per stack, 4s), 仙佑 (+70% ATK/DEF/maxHP, 12s) |

### self_buff_extra

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | Additional stat bonuses to an existing named buff |
| **Data** | `{ buff_name, attack_bonus?, defense_bonus?, final_damage_bonus?, skill_damage_increase?, duration?, max_stacks? }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state }] }` |
| **Mechanic** | Extends or modifies an existing named buff with additional stat effects. |

### conditional_buff

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 在神通悟境的条件下... |
| **Data** | `{ condition, percent_max_hp_increase?, damage_increase?, name?, duration? }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state }] }` |
| **Mechanic** | Conditional buff applied when a specific condition is met (e.g., enlightenment_10). |

### counter_buff

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 被攻击时反射/恢复 |
| **Data** | `{ name, heal_on_damage_taken?, reflect_received_damage?, duration? }` |
| **Result** | `{ intents: [APPLY_STATE], listeners: [on_attacked handler] }` |
| **Mechanic** | Creates a named state + listener that fires on_attacked to reflect damage or heal. |
| **Examples** | 极怒 (reflect 50% + 15% lost HP), 不灭魔体 (heal y% of damage taken) |

### damage_reduction_during_cast

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 施放期间提升自身x%伤害减免 |
| **Data** | `{ value }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state: { effects: [{ stat: "damage_reduction", value }] } }] }` |
| **Mechanic** | Temporary DR buff for cast duration. |
| **Examples** | 金汤 (10%), 金刚护体 (55%) |

### self_damage_taken_increase

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 施放期间自身受到的伤害也提升y% |
| **Data** | `{ value, duration }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state: { effects: [{ stat: "damage_reduction", value: -value }] } }] }` |
| **Mechanic** | Self-debuff that increases incoming damage. Modeled as negative DR. |
| **Examples** | 破釜沉舟 (50%), 通天剑诀 (50%) |

### next_skill_buff

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 下一个施放的神通额外获得x%神通伤害加深 |
| **Data** | `{ value, stat }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state }] }` |
| **Mechanic** | One-shot modifier stored for subsequent skill. Consumed on next cast. |
| **Examples** | 灵威 (118%), 天威煌煌 (88–128%) |

### self_buff_extend

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 延长x秒持续时间 |
| **Data** | `{ value, buff_name }` |
| **Result** | `{ zones: { M_dmg: seconds/10 } }` |
| **Mechanic** | Extends a named buff's duration. Currently approximated as M_dmg zone. |
| **Caveats** | Simplified — should modify the named state's remainingDuration directly. |

---

## §8 Debuff

### debuff

| | |
|:--|:--|
| **File** | `debuff.ts` |
| **Chinese** | 治疗量降低x% / 攻击力降低x% / 神通伤害减免 |
| **Data** | `{ target (stat name), value, duration, dispellable?, name?, max_stacks? }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state: { kind: "debuff", ... } }] }` |
| **Mechanic** | Applies a debuff to opponent. `target` is the stat being modified, not the recipient. |
| **Caveats** | `value` is typically negative for reductions. |
| **Examples** | 天哀灵涸 (heal -80%), 追命剑阵 (skill dmg -30%) |

### counter_debuff

| | |
|:--|:--|
| **File** | `debuff.ts` |
| **Chinese** | 被攻击时有x%概率对攻击方施加debuff |
| **Data** | `{ name, duration, on_attacked_chance, parent? }` |
| **Result** | `{ listeners: [{ parent, trigger: "on_attacked", handler }] }` |
| **Mechanic** | Reactive debuff — rolls RNG on each incoming hit, applies debuff to attacker. |
| **Examples** | 罗天魔咒 (30→60% chance to apply 噬心之咒 + 断魂之咒) |

### conditional_debuff

| | |
|:--|:--|
| **File** | `debuff.ts` |
| **Chinese** | 降低敌方x%的... |
| **Data** | `{ name, multiplier?, target?, value?, duration?, condition? }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state }] }` |
| **Mechanic** | Debuff applied conditionally or with specific multiplier effects. |

### enemy_skill_damage_reduction

| | |
|:--|:--|
| **File** | `debuff.ts` |
| **Chinese** | 使敌方的神通伤害降低x% |
| **Data** | `{ value }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state: { stat: "skill_damage_reduction", value } }] }` |
| **Mechanic** | Reduces opponent's outgoing skill damage. |
| **Examples** | 追命剑阵 (30%) |

### attack_reduction / crit_rate_reduction / crit_damage_reduction / lethal_rate_reduction

| | |
|:--|:--|
| **File** | `debuff.ts` |
| **Chinese** | 降低目标x%攻击力/暴击率/暴击伤害/致命率 |
| **Data** | `{ value, parent }` |
| **Result** | `{ listeners: [{ parent, trigger: "on_attacked", handler → APPLY_STATE }] }` |
| **Mechanic** | Reactive stat debuffs from named state like 天人五衰. Fire on_attacked. |

### random_debuff

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 任意1个减益效果 |
| **Data** | `{ attack, crit_rate, crit_damage }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state }] }` — one of three via RNG |
| **Mechanic** | Randomly picks one of three debuffs using `ctx.rng`. |
| **Examples** | 祸星无妄 (ATK -20% / crit rate -20% / crit dmg -50%) |

---

## §9 DoT (Damage over Time)

### dot

| | |
|:--|:--|
| **File** | `dot.ts` |
| **Chinese** | 每秒受到x%攻击力的伤害 |
| **Data** | `{ name, duration, tick_interval, damage_per_tick, data_state }` |
| **Result** | `{ intents: [{ type: "APPLY_DOT", name, damagePerTick: (damage_per_tick/100) × ATK, tickInterval, duration, source }] }` |
| **Mechanic** | Creates a per-tick DoT state on target. `damage_per_tick` is in %ATK, converted to absolute at source. |
| **Examples** | 噬心 (550%/s for 8s), 贪妄业火 (3%/s current HP), 瞋痴业火 (8%/s lost HP) |

### dot_damage_increase

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 持续伤害上升x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100 } }` |
| **Mechanic** | Multiplier on DoT damage. Currently mapped to M_dmg zone. |
| **Caveats** | Should ideally multiply DoT's damagePerTick directly, not the main damage chain. |
| **Examples** | 古魔之魂 (104%) |

### dot_frequency_increase

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 持续伤害效果触发间隙缩短x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100 } }` |
| **Mechanic** | Reduces DoT tick interval. Currently approximated as M_dmg zone. |
| **Caveats** | Should ideally modify DoT's tickInterval: `newInterval = interval × (1 - value/100)`. |
| **Examples** | 天魔真解 (50.5%) |

### dot_extra_per_tick

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 持续伤害触发时，额外造成目标x%已损失气血值 |
| **Data** | `{ value }` |
| **Result** | `{ flatExtra: (value/100) × atk }` |
| **Mechanic** | Extra damage per DoT tick based on target's lost HP. Currently approximated as flat extra. |
| **Caveats** | Should be a listener on DoT tick events, reading target's actual lost HP. |
| **Examples** | 鬼印 (2%), 追神真诀 (26.5%) |

### extended_dot

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 额外持续存在x秒 |
| **Data** | `{ extra_seconds, tick_interval, parent }` |
| **Result** | `{ zones: { M_dmg: seconds/10 } }` |
| **Mechanic** | Extends DoT duration. Currently approximated as M_dmg zone. |
| **Caveats** | Should modify the DoT state's remainingDuration directly. |
| **Examples** | 雷阵剑影 (6.5s extra, 0.5s/tick) |

---

## §10 Shield

### shield_strength

| | |
|:--|:--|
| **File** | `shield.ts` |
| **Chinese** | 护盾值 |
| **Data** | `{ value, duration?, source? }` |
| **Result** | `{ intents: [{ type: "SHIELD", value: computed, duration }] }` |
| **Mechanic** | Grants shield. If `source === "self_max_hp"`: `value = (v/100) × maxHp`. Otherwise: `value = (v/100) × ATK`. |

### shield (from skill)

| | |
|:--|:--|
| **File** | `shield.ts` |
| **Chinese** | 为自身添加护盾 |
| **Data** | `{ value, duration, source, parent?, trigger? }` |
| **Result** | `{ intents: [{ type: "SHIELD", value, duration }] }` or `{ listeners: [...] }` for per-tick shields |
| **Mechanic** | Direct shield from skill. `trigger: "per_tick"` creates periodic shield via listener. |
| **Examples** | 煞影千幻 (12% maxHP, 8s), 天书灵盾 (3.5-4.4% maxHP/tick, 16s) |

### shield_value_increase

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 护盾值提升x% |
| **Data** | `{ value }` |
| **Result** | `{}` (no-op) |
| **Mechanic** | Should multiply shield amounts. Currently unimplemented. |
| **Caveats** | **TODO**: multiply SHIELD intent values by `(1 + value/100)`. |
| **Examples** | 灵盾 (20%), 青云灵盾 (50%) |

### damage_to_shield

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 造成伤害后获得伤害值x%的护盾 |
| **Data** | `{ value, duration }` |
| **Result** | `{ intents: [{ type: "SHIELD", value: (value/100) × atk, duration }] }` |
| **Mechanic** | Converts outgoing damage to self-shield. |
| **Caveats** | Currently uses ATK as approximation. Should use actual damage dealt post-resolution. |
| **Examples** | 玄女护心 (50%, 8s) |

---

## §11 Shield Destroy (Gap 5)

### shield_destroy_damage

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 每段伤害命中时湮灭敌方1个护盾，并额外造成y%敌方最大气血值的伤害 |
| **Data** | `{ shields_per_hit, percent_max_hp, cap_vs_monster? }` |
| **Result** | `{ perHitEffects: () => [PERCENT_MAX_HP_HIT] }` |
| **Mechanic** | Per hit: destroy one enemy shield + deal %maxHP bonus damage. |
| **Caveats** | **SIMPLIFIED**: doesn't actually destroy shields. See design.gaps.md §6. |
| **Examples** | 皓月剑诀 (1 shield/hit, 12% maxHP) |

### no_shield_double_damage

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 对无盾目标造成双倍伤害 |
| **Data** | `{ no_shield_double }` |
| **Result** | `{ zones: { M_dmg: 1.0 } }` |
| **Mechanic** | Doubles damage if target has no shield. |
| **Caveats** | **SIMPLIFIED**: always applies M_dmg: 1.0 instead of checking target shield state. |

### shield_destroy_dot

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 每0.5秒对目标造成湮灭护盾的总个数×600%攻击力的伤害 |
| **Data** | `{ tick_interval, per_shield_damage, no_shield_assumed?, parent }` |
| **Result** | `{ listeners: [{ parent, trigger: "per_tick", handler }] }` |
| **Mechanic** | Periodic damage scaling with total shields destroyed. Listener reads accumulated count. |
| **Caveats** | **SIMPLIFIED**: uses hardcoded `no_shield_assumed` count instead of tracking actual shield destruction. See design.gaps.md §6. |
| **Examples** | 碎魂剑意 (0.5s interval, 600% ATK × count) |

### on_shield_expire

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 当护盾消失时，对敌方额外造成护盾值x%的伤害 |
| **Data** | `{ damage_percent_of_shield }` |
| **Result** | `{ intents: [{ type: "HIT", damage: pct × estimatedShield }] }` |
| **Mechanic** | Fires damage when a skill-generated shield expires or is consumed. |
| **Caveats** | **SIMPLIFIED**: fires immediately with hardcoded 10% maxHP shield estimate. See design.gaps.md §5. |
| **Examples** | 玉石俱焚 (100% of shield value) |

---

## §12 Healing

### self_heal

| | |
|:--|:--|
| **File** | `healing.ts` |
| **Chinese** | 恢复x%攻击力的气血 (instant) / 每秒恢复x%攻击力的气血 (per_tick) |
| **Data** | Instant: `{ value }`. Per-tick: `{ per_tick, total, tick_interval, name }` |
| **Result** | Instant: `{ intents: [HEAL] }`. Per-tick: `{ intents: [APPLY_STATE], listeners: [...] }` |
| **Mechanic** | Instant heal or periodic heal via named state with per_tick listener. |
| **Examples** | 灵鹤 (per-tick heal, 20s) |

### lifesteal

| | |
|:--|:--|
| **File** | `healing.ts` |
| **Chinese** | 获得x%的吸血效果 |
| **Data** | `{ value }` |
| **Result** | `{ intents: [{ type: "LIFESTEAL", percent: value, damageDealt: 0 }] }` |
| **Mechanic** | Book actor computes total HIT damage, then: `heal = (percent/100) × totalDamage`. Self-targeted. |
| **Caveats** | `damageDealt` is set to 0 here and filled in by the book actor after damage chain computation. |
| **Examples** | 仙灵汲元 (55%) |

### heal_echo_damage

| | |
|:--|:--|
| **File** | `healing.ts` |
| **Chinese** | 恢复时额外对目标造成等额伤害 |
| **Data** | `{ ratio }` |
| **Result** | `{ listeners: [{ parent: "__heal__", trigger: "per_tick", handler → HIT }] }` |
| **Mechanic** | Reactive: listens for HEAL events, echoes as damage to opponent. `ratio` typically 1.0. |
| **Examples** | 周天星元 (等额 = 100%), 瑶光却邪 (50%) |

### healing_increase

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 所有治疗效果提升x% |
| **Data** | `{ value }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state: { stat: "healing_bonus", value } }] }` |
| **Mechanic** | Persistent buff that multiplies all incoming healing. |
| **Examples** | 长生天则 (50%) |

### healing_to_damage

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 治疗效果时额外造成治疗量x%的伤害 |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100 } }` |
| **Mechanic** | Converts healing to damage echo. Currently approximated as M_dmg zone. |
| **Examples** | 瑶光却邪 (50%) |

### conditional_heal_buff

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 条件触发的回复 |
| **Data** | `{ condition, value, duration }` |
| **Result** | `{ intents: [{ type: "HEAL", value }] }` |
| **Mechanic** | Heal triggered by condition. |

---

## §13 HP Cost

### self_hp_cost

| | |
|:--|:--|
| **File** | `cost.ts` |
| **Chinese** | 消耗自身x%当前气血值 |
| **Data** | `{ value, per_hit?, tick_interval?, duration? }` |
| **Result** | `{ intents: [{ type: "HP_COST", percent: value, basis: "current" }] }` |
| **Mechanic** | HP self-cost. Bypasses shield. `per_hit` and periodic forms exist but only basic form implemented. |
| **Examples** | 十方真魄 (10%), 疾风九变 (10%), 九重天凤诀 (5% per hit) |

### hp_cost_avoid_chance

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | x%概率不消耗气血 |
| **Data** | `{ value, parent }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state: { stat: "damage_reduction", value: chance } }] }` |
| **Mechanic** | Chance to avoid HP cost. Currently modeled as DR buff. |
| **Caveats** | Should roll RNG per HP_COST event instead of applying flat DR. |
| **Examples** | 星猿援护 (30%) |

---

## §14 State Manipulation

### buff_steal

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 驱散目标增益效果 |
| **Data** | `{ count }` |
| **Result** | `{ intents: [{ type: "BUFF_STEAL", count }] }` |
| **Mechanic** | Removes buffs from opponent and applies them to self. |

### self_cleanse

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 驱散自身减益/控制状态 |
| **Data** | `{ count }` |
| **Result** | `{ intents: [{ type: "SELF_CLEANSE", count }] }` |
| **Mechanic** | Removes debuffs from self. |

### self_hp_floor

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 气血不会降至x%以下 |
| **Data** | `{ value, parent? }` |
| **Result** | `{ intents: [{ type: "HP_FLOOR", minPercent: value }] }` |
| **Mechanic** | Sets minimum HP percentage. |
| **Examples** | 星猿永生 (10%) |

### periodic_dispel

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 每秒驱散敌方x个增益状态 |
| **Data** | `{ count?, interval?, duration?, parent? }` |
| **Result** | `{ intents: [{ type: "DISPEL", count }] }` |
| **Mechanic** | Removes buffs from opponent. Currently fires once. |
| **Caveats** | Should be periodic (per-tick listener). |
| **Examples** | 星猿永生 (2 buffs), 天煞破虚 (1 buff/s for 10s) |

### on_dispel

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 若被驱散，立即受到y%攻击力的伤害 |
| **Data** | `{ damage, stun?, parent }` |
| **Result** | `{ listeners: [{ parent, trigger: "on_expire", handler → HIT }] }` |
| **Mechanic** | Burst damage when a parent state is dispelled (via on_expire listener). |
| **Examples** | 玄心剑魄/噬心 (3300% ATK + 2s stun on dispel) |

### on_buff_debuff_shield_trigger

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 每次施加状态时造成额外伤害 |
| **Data** | `{ damage_percent }` |
| **Result** | `{ perHitEffects: () => [{ type: "HP_DAMAGE", percent, basis: "max" }] }` |
| **Mechanic** | Deals %maxHP damage when any state is applied. Modeled as per-hit effect. |

---

## §15 Delayed & Burst

### delayed_burst

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 持续x秒后爆发y%攻击力的伤害 |
| **Data** | `{ duration, burst_base }` |
| **Result** | `{ intents: [{ type: "DELAYED_BURST", damage: (burst_base/100) × ATK, delay: duration }] }` |
| **Mechanic** | Scheduled burst damage after a delay. |
| **Examples** | 无相魔劫 (12s, 5000% ATK) |

### delayed_burst_increase

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 延时爆发伤害增加x%攻击力 |
| **Data** | `{ value, parent }` |
| **Result** | `{ flatExtra: (value/100) × atk }` |
| **Mechanic** | Adds to the delayed burst damage. |

---

## §16 Summon (Gap 1)

### summon

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 创建一个持续存在x秒的分身，继承自身y%的属性 |
| **Data** | `{ duration, inherit_stats, damage_taken_multiplier, trigger }` |
| **Result** | `{ zones: { M_dmg: inherit_stats/100 } }` |
| **Mechanic** | Summons a pet/entity that inherits stats and attacks when main casts. |
| **Caveats** | **SIMPLIFIED**: modeled as M_dmg zone bonus. See design.gaps.md §2 for proper design (damage echo via listeners). |
| **Examples** | 春黎剑阵 分身 (16s, 54% stats, 400% damage taken) |

### summon_buff

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 分身造成的伤害增加y% |
| **Data** | `{ damage_taken_reduction_to, damage_increase, parent }` |
| **Result** | `{ zones: { M_dmg: damage_increase/100 } }` |
| **Mechanic** | Buffs the summoned entity's damage output. |
| **Caveats** | **SIMPLIFIED**: modeled as M_dmg zone bonus. Should modify summon echo multiplier. |
| **Examples** | 幻象剑灵 (damage +200%, damage_taken reduced to 120%) |

---

## §17 Untargetable (Gap 2)

### untargetable_state

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 在x秒内不可被选中 |
| **Data** | `{ duration }` |
| **Result** | `{ intents: [{ type: "APPLY_STATE", state: { name: "untargetable", DR: 100% } }] }` |
| **Mechanic** | Makes player untargetable for the duration. No hits connect. |
| **Caveats** | **SIMPLIFIED**: modeled as 100% DR buff. See design.gaps.md §3 for proper design (skip resolveHit entirely). |
| **Examples** | 念剑诀 (4s untargetable) |

---

## §18 Periodic Cleanse (Gap 3)

### periodic_cleanse

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 每秒有y%概率驱散自身所有控制状态，25秒内最多触发1次 |
| **Data** | `{ chance, interval, cooldown, max_triggers, parent }` |
| **Result** | `{ intents: [{ type: "SELF_CLEANSE", count: 1 }] }` |
| **Mechanic** | Per-second RNG roll to cleanse all control debuffs. Capped at max_triggers within cooldown window. |
| **Caveats** | **SIMPLIFIED**: fires one immediate cleanse. See design.gaps.md §4 for proper design (per-tick listener with RNG). |
| **Examples** | 星猿弃天 (30%/s, max 1 per 25s) |

---

## §19 Second-Order Modifiers

### buff_strength

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 增益效果强度提升x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100 } }` |
| **Mechanic** | Should multiply all buff values from this skill. Currently approximated as M_dmg. |
| **Caveats** | Should multiply APPLY_STATE effect values by `(1 + value/100)` before intent emission. |
| **Examples** | 清灵 (20%), 龙象护身 (300%) |

### debuff_strength

| | |
|:--|:--|
| **File** | `misc.ts` |
| **Chinese** | 减益效果强度提升x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100 } }` |
| **Mechanic** | Should multiply all debuff values from this skill. Currently approximated as M_dmg. |
| **Examples** | 咒书 (20%) |

### all_state_duration

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 所有状态效果持续时间延长x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100/3 } }` |
| **Mechanic** | Should multiply all state durations by `(1 + value/100)`. Currently approximated as small M_dmg. |
| **Examples** | 业焰 (69%), 真言不灭 (55%) |

### buff_duration

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 增益状态持续时间延长x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100/3 } }` |
| **Mechanic** | Should multiply buff durations by `(1 + value/100)`. Currently approximated as small M_dmg. |
| **Examples** | 仙露护元 (300%) |

### buff_stack_increase

| | |
|:--|:--|
| **File** | `buff.ts` |
| **Chinese** | 增益状态层数增加x% |
| **Data** | `{ value }` |
| **Result** | `{ zones: { M_dmg: value/100/3 } }` |
| **Mechanic** | Increases buff stack counts. Currently approximated as small M_dmg. |
| **Examples** | 真极穿空 (100%) |

### ignore_damage_reduction

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 无视敌方所有伤害减免效果 |
| **Data** | `{}` |
| **Result** | `{ zones: { M_final: 0.9 } }` |
| **Mechanic** | Bypasses all 伤害减免 effects. Currently approximated as M_final bonus. |
| **Caveats** | Should set a flag that skips DR-related stat effects during resolution. |
| **Examples** | 神威冲云 (+ 36% damage) |

### enlightenment_bonus

| | |
|:--|:--|
| **File** | `multiplier.ts` |
| **Chinese** | 在神通悟境的条件下 |
| **Data** | `{ value, damage_increase }` |
| **Result** | `{ zones: { M_dmg: damage_increase/100 } }` |
| **Mechanic** | Bonus damage at enlightenment threshold. |

---

## §20 Cross-slot & Reactive

### cross_slot_debuff

| | |
|:--|:--|
| **File** | `debuff.ts` |
| **Chinese** | 跨神通的反应性debuff |
| **Data** | `{ target, value, duration, name, trigger, parent }` |
| **Result** | `{ listeners: [{ parent, trigger: "on_attacked", handler → APPLY_STATE }] }` |
| **Mechanic** | Applies debuff from one slot when another slot's state triggers on_attacked. |

### counter_debuff_upgrade

| | |
|:--|:--|
| **File** | `debuff.ts` |
| **Chinese** | 升级counter_debuff的触发概率 |
| **Data** | `{ on_attacked_chance, parent }` |
| **Result** | `{ listeners: [{ parent, trigger: "on_attacked", handler }] }` |
| **Mechanic** | Increases the trigger chance of an existing counter_debuff. |

### debuff_stack_chance / debuff_stack_increase

| | |
|:--|:--|
| **File** | `debuff.ts` |
| **Chinese** | debuff叠加概率/层数增加 |
| **Data** | `{ value }` |
| **Result** | `{}` (no-op) |
| **Mechanic** | Currently unimplemented. Should modify debuff stacking behavior. |

---

## Summary Statistics

| Category | Handlers | File |
|:---------|:---------|:-----|
| Core damage | 11 | damage.ts |
| Damage modifiers (zones) | 7 | multiplier.ts, misc.ts |
| Escalation | 2 | escalation.ts, multiplier.ts |
| Conditional damage | 7 | damage.ts, misc.ts |
| Synchro | 2 | multiplier.ts, misc.ts |
| Resonance | 1 | resonance.ts |
| Buff/self buff | 9 | buff.ts |
| Debuff | 10 | debuff.ts, misc.ts |
| DoT | 4 | dot.ts, multiplier.ts |
| Shield | 4 | shield.ts, misc.ts |
| Shield destroy | 4 | misc.ts |
| Healing | 5 | healing.ts, misc.ts |
| HP cost | 2 | cost.ts, misc.ts |
| State manipulation | 6 | misc.ts |
| Delayed/burst | 2 | misc.ts |
| Summon | 2 | misc.ts |
| Untargetable | 1 | misc.ts |
| Periodic cleanse | 1 | misc.ts |
| Second-order | 8 | multiplier.ts, buff.ts, misc.ts |
| Cross-slot/reactive | 3 | debuff.ts |
| **Total** | **~86** | |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-20 | Initial reference — all 86 handlers documented with raw text, data shape, mechanic, and caveats |
