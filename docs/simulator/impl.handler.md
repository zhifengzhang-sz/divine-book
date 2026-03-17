# Effect Handler Audit

**Date:** 2026-03-16

> For each handler: source text → combat model zone → intent event → what I'm confident about and what I'm not.

---

## Confident (verified against source + combat model)

### base_attack
- **Source:** "造成x段共计y%攻击力的灵法伤害"
- **Data:** `{ hits, total, data_state }`
- **Role:** Provides `basePercent` and `hits` for the damage chain
- **Formula:** `perHitDamage = (total / hits / 100) × ATK`
- **Zone:** D_base in combat.md §2.1
- **Status:** Correct.

### damage_increase
- **Source:** "伤害提升x%" (e.g., 通天剑诀 exclusive: 提升36%伤害)
- **Data:** `{ value }`
- **Role:** Additive contribution to M_dmg zone
- **Formula:** `M_dmg += value / 100`
- **Zone:** M_dmg in combat.md §2.1
- **Status:** Correct.

### skill_damage_increase
- **Source:** "神通伤害加深x%" (e.g., 无极剑阵: 555%神通伤害)
- **Data:** `{ value }`
- **Role:** Additive contribution to M_skill zone
- **Formula:** `M_skill += value / 100`
- **Zone:** M_skill in combat.md §2.1
- **Status:** Correct.

### attack_bonus
- **Source:** "提升x%攻击力的效果" (e.g., 摧山: 20%, 摧云折月: 300%)
- **Data:** `{ value }`
- **Role:** ATK scaling in the damage chain (cast-scoped, not persistent)
- **Formula:** `S_coeff += value / 100` → `effectiveATK = ATK × (1 + S_coeff)`
- **Zone:** S_coeff in combat.md §2.1
- **Status:** Correct (fixed from state mutation).

### per_hit_escalation
- **Source:** "每段攻击造成伤害后，下一段提升x%神通加成" (惊神剑光) / "每造成1段伤害，剩余段数伤害提升y%" (破竹/心火淬锋)
- **Data:** `{ value, stat: "skill_bonus" | "damage" | "remaining_hits", max? }`
- **Role:** Per-hit zone bonus. stat=skill_bonus → M_skill, stat=damage/remaining_hits → M_dmg
- **Formula:** hitIndex × value/100, capped at max/100 if max present
- **Stacking:** Multiple sources stack additively per zone (fixed)
- **Status:** Correct (fixed from last-one-wins).

### percent_max_hp_damage
- **Source:** "每段攻击造成目标y%最大气血值的伤害" — "伤害" not "真实伤害"
- **Data:** `{ value, cap_vs_monster? }`
- **Role:** Per-hit damage based on TARGET's maxHp. Goes through DR (normal damage).
- **Event:** `PERCENT_MAX_HP_HIT { percent }` — target resolves against own maxHp
- **Resolution:** `rawDamage = percent/100 × target.maxHp` → apply DR → shield → HP
- **Status:** Correct (fixed: was bypassing DR, was using source's maxHp).

### guaranteed_resonance
- **Source:** "必定会心造成x倍伤害，并有y%概率将之提升至z倍" (通明: 1.2/25%/1.5, 灵犀九重: 2.97/25%/3.97)
- **Data:** `{ base_multiplier, chance, upgraded_multiplier }`
- **Role:** 会心 — separate attack line targeting 灵力 (SP damage)
- **Formula:** `mult = rng.chance(chance/100) ? upgraded : base` → `spDamage = mult × ATK`
- **Zone:** Not in the 气血 damage chain — parallel 灵力 attack line
- **Status:** Correct. RNG determines which multiplier.

### probability_multiplier
- **Source:** "本神通所有效果x%概率提升4倍，y%概率提升3倍，z%概率提升2倍" (心逐神随)
- **Data:** `{ chance_4x, chance_3x, chance_2x }`
- **Role:** M_synchro zone — outer multiplier on ALL effects
- **Formula:** cumulative probability tiers → `M_synchro = picked multiplier`
- **Zone:** M_synchro in combat.md §2.1
- **Note:** chance_Nx is cumulative (chance_4x=60 means 60% for 4x, then 80%-60%=20% for 3x, etc.)
- **Status:** Correct.

### flat_extra_damage
- **Source:** "额外造成2000%攻击力的伤害" (斩岳)
- **Data:** `{ value }`
- **Role:** D_flat in the damage chain
- **Formula:** `flatExtra = (value / 100) × ATK`
- **Zone:** D_flat in combat.md §2.1: `(D_base × S_coeff + D_flat) × zones`
- **Status:** Correct.

### self_hp_cost
- **Source:** "消耗自身x%当前气血值" (十方真魄: 10%, 疾风九变: 10%)
- **Data:** `{ value, per_hit?, tick_interval?, duration? }`
- **Role:** Self-damage, bypasses DR and shields
- **Event:** `HP_COST { percent, basis: "current" }`
- **Note:** Some have `per_hit: true` (per hit, not per cast) — **not handled yet**. Some have `tick_interval` + `duration` (periodic cost like 怒意滔天) — **not handled yet**.
- **Status:** Basic form correct for single-cast cost. Per-hit and periodic forms TODO.

---

## Partially correct (concept right, implementation incomplete)

### debuff
- **Source:** Various. E.g., "治疗量降低31%" (灵涸), "神通伤害减免" (新-青元剑诀)
- **Data:** `{ target (stat name), value, duration, dispellable?, name?, max_stacks? }`
- **Role:** Applies debuff state on opponent
- **Event:** `APPLY_STATE { state with kind="debuff" }`
- **Issue:** The `target` field is the stat being modified (e.g., "healing_received"), not who receives it. The naming is confusing. The player machine needs to correctly apply the stat modifier.
- **Status:** Structurally correct. Stat application in player machine needs verification.

### self_buff
- **Source:** E.g., "提升自身20%的攻击力与伤害减免" (怒灵降世, 十方真魄)
- **Data:** `{ attack_bonus?, defense_bonus?, final_damage_bonus?, skill_damage_increase?, damage_reduction?, duration, name? }`
- **Role:** Persistent buff on self (has duration, affects future casts)
- **Event:** `APPLY_STATE { state with kind="buff" }`
- **Distinction from attack_bonus:** `self_buff` has duration and name → persistent state. `attack_bonus` (aux affix) has no duration → cast-scoped zone.
- **Issue:** Some stats in self_buff (like `skill_damage_increase`) would affect the damage chain of FUTURE casts. The current player machine recalculates `atk` and `def` from states, but not `M_skill` or `M_final`. These need to be read from active buff states when computing the damage chain.
- **Status:** Partially correct. ATK/DEF buffs work. Other stat buffs (skill_damage_increase, final_damage_bonus) don't feed into the damage chain yet.

### damage_reduction_during_cast
- **Source:** "施放期间提升自身x%的伤害减免" (金汤: 10%, 金刚护体: 55%)
- **Data:** `{ value }`
- **Role:** Temporary DR buff during cast
- **Event:** `APPLY_STATE { stat: "damage_reduction", duration: 0 }`
- **Issue:** `duration: 0` means it should last for the cast duration. But what defines "cast duration"? For a single-slot sim, it covers the hit interleaving period. For multi-slot, it needs to expire after the cast ends. Currently the state never expires (duration=0 is treated as instant, not "until cast ends").
- **Status:** Concept correct. Duration/expiry mechanism incomplete.

---

## Not confident (need your input)

### dot
- **Source:** "每x秒额外造成y%攻击力的伤害" (噬心: 550%/1s)
- **Data:** `{ name, duration, tick_interval, damage_per_tick }`
- **Question:** Is `damage_per_tick` in %ATK? So actual tick damage = `(damage_per_tick / 100) × ATK`? Or is it absolute? Does DoT damage go through DR?
- **Status:** Structurally creates APPLY_DOT. Damage resolution NOT implemented (no tick scheduling in single-slot sim).

### shield (from shield_strength or shield handler)
- **Source:** Various. E.g., 天书灵盾: "value: 4.4, source: self_max_hp"
- **Data:** `{ value, duration?, source? }`
- **Question:** The `source` field says "self_max_hp" — does this mean shield value = `value% × self.maxHp`? Or `value% × ATK`? Current handler computes `(value/100) × ATK` which is likely wrong if source=self_max_hp.
- **Status:** Wrong formula. Need to read the `source` field.

### lifesteal
- **Source:** "获得x%的吸血效果" (仙灵汲元: 55%, 星猿复灵: 82%)
- **Data:** `{ value, parent? }`
- **Role:** Heal for value% of damage dealt
- **Question:** What counts as "damage dealt"? Total damage in the cast? Per-hit? Before or after DR? The current implementation puts `damageDealt: 0` placeholder that never gets filled.
- **Status:** Not working. The feedback loop (damage dealt → heal amount) isn't wired.

### self_heal
- **Source:** 周天星元: instant "恢复20%攻击力的气血" + per_tick "每秒恢复x%攻击力的气血"
- **Data:** Instant: `{ value }`, Per-tick: `{ per_tick, total, tick_interval, name }`
- **Question:** Is `value` and `per_tick` in %ATK? So heal = `(value/100) × ATK`?
- **Status:** Instant form probably correct. Per-tick form creates named state + listener but tick scheduling isn't implemented in single-slot sim.

### heal_echo_damage
- **Source:** 周天星元: "恢复时额外对目标造成等额伤害"
- **Data:** `{ ratio }`
- **Role:** When this book heals, echo ratio × heal amount as damage to opponent
- **Question:** Is this "等额" = 1:1 ratio of heal to damage? Does the damage go through DR?
- **Status:** `__heal__` convention is a hack. Needs proper reactive wiring — subscribe to HP_CHANGE events where cause=heal, emit HIT to opponent.
