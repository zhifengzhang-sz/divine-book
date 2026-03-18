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

---
initial date: 2026-03-18
dates of modification: [2026-03-18]
---

# Combat Mechanics

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> This document is the authoritative combat mechanics reference for the 灵界 (spirit realm) PvP simulator. Every claim is tagged by epistemic status and traceable to a specific source file.
>
> **Tagging convention:**
> - **[FACT]** — directly from raw data files (see §1)
> - **[DERIVED]** — logically follows from facts + parser effect types
> - **[ASSUMPTION]** — reasonable inference, unverified
> - **[UNRESOLVED]** — insufficient evidence to determine

---

## §1 Sources of Truth

All claims in this document trace to these files. Anything not traceable to one of them is not in this document.

| # | File | Provides |
|:--|:-----|:---------|
| 1 | `data/raw/主书.md` | 28 skill books: main skills, main affixes, damage coefficients, named states, HP costs, hit counts |
| 2 | `data/raw/通用词缀.md` | 16 universal affixes: effect descriptions and values at 融合50重 |
| 3 | `data/raw/修为词缀.md` | 17 school affixes (4 剑修 + 4 法修 + 4 魔修 + 5 体修): stronger variants of universal affixes + school-unique mechanics |
| 4 | `data/raw/专属词缀.md` | 28 exclusive affixes: one per 功法書, complex compound effects |
| 5 | `data/raw/构造规则.md` | 灵書 construction rules: main/aux positions, affix slots, conflict rules, equipment |
| 6 | `data/属性/战斗属性.md` | 4 combat attributes: 气血, 攻击, 灵力, 守御 |
| 7 | `data/属性/进阶属性.md` | Advanced attributes: 暴击, 致命, 命中, 闪避, 会心, 会心附伤, 刚毅, 灵暴, 功法效果增强, etc. |
| 8 | `docs/parser/note.common.md` | Parser effect type inventory for universal affixes (16 types) |
| 9 | `docs/parser/note.school.md` | Parser effect type inventory for school affixes (17 types) |
| 10 | `docs/parser/note.exclusive.md` | Parser effect type inventory for exclusive affixes + generic pipeline |

---

## §2 Effect Type Taxonomy

This section inventories all effect types recognized by the parser. Each maps a Chinese source text pattern to a typed effect that the simulator can resolve. This is the bridge between raw data and the simulator.

### §2.1 Damage Modifiers

| Effect type | Chinese pattern | Representative affixes | What it does |
|:------------|:---------------|:----------------------|:-------------|
| `attack_bonus` | 提升x%攻击力的效果 | 摧山 (20%), 摧云折月 (300%) | Scales ATK coefficient for this cast |
| `flat_extra_damage` | 额外造成x%攻击力的伤害 | 斩岳 (2000%), 破灭天光 (2500%) | Adds flat %ATK damage on top of base |
| `damage_increase` | 伤害提升x% | Various | General damage multiplier |
| `skill_damage_increase` | 神通伤害加深x% | 灵威 (118%), 无极剑阵 (555%) | Skill-specific damage multiplier |
| `final_damage_bonus` | 最终伤害加深x% | 明王之路 (50%) | Final multiplicative layer |
| `per_hit_escalation` | 每造成1段伤害，剩余段数伤害提升x% | 破竹 (1%/cap 10%), 心火淬锋 (5%/cap 50%) | Ramp within multi-hit skill |
| `next_skill_buff` | 下一个施放的神通额外获得x%神通伤害加深 | 灵威 (118%), 天威煌煌 (88–128%) | Stores one-shot modifier for subsequent skill |
| `triple_bonus` | 提升x%攻击力、y%伤害、z%暴击伤害 | 破碎无双 (15/15/15) | Compound: ATK + damage + crit damage |
| `random_buff` | 任意1个加成：攻击/致命伤害/伤害x% | 福荫 (20%), 景星天佑 (55%) | Randomly selects one of three bonuses |
| `probability_multiplier` | 所有效果x%概率提升N倍 | 心逐神随 (×2/×3/×4) | Multiplies all effect values for this cast |
| `probability_to_certain` | 概率触发→必定触发，伤害提升x% | 天命有归 (50%) | Collapses probability to certainty |

### §2.2 Conditional Damage

| Effect type | Chinese pattern | Representative affixes | Condition |
|:------------|:---------------|:----------------------|:----------|
| `conditional_damage` | 敌方处于控制效果，伤害提升x% | 击瑕 (40%), 乘胜逐北 (100%) | Enemy under control effect |
| `execute_conditional` | 敌方气血值低于30%，伤害提升x% | 怒目 (20% + crit rate 30%), 溃魂击瑕 (100% + guaranteed crit) | Enemy HP below threshold |
| `per_self_lost_hp` | 自身每多损失1%最大气血值，伤害提升x% | 战意 (2.95%), 怒血战意 (2%) | Scales with own HP loss |
| `per_enemy_lost_hp` | 敌方每多损失1%最大气血值，伤害提升x% | 吞海 (0.4%), 贪狼吞星 (1%) | Scales with enemy HP loss |
| `min_lost_hp_threshold` | 已损气血值至少按已损x%计算，伤害提升y% | 意坠深渊 (11%/50%) | Floor on lost-HP-based damage |

### §2.3 Defense & Mitigation

| Effect type | Chinese pattern | Representative affixes | What it does |
|:------------|:---------------|:----------------------|:-------------|
| `damage_reduction_during_cast` | 施放期间提升自身x%伤害减免 | 金汤 (10%), 金刚护体 (55%) | Self DR during skill cast |
| `shield_value_increase` | 护盾值提升x% | 灵盾 (20%), 青云灵盾 (50%) | Multiplier on shield amounts |
| `damage_to_shield` | 造成伤害后获得伤害值x%的护盾 | 玄女护心 (50%, 8s) | Converts outgoing damage to self-shield |

### §2.4 Healing

| Effect type | Chinese pattern | Representative affixes | What it does |
|:------------|:---------------|:----------------------|:-------------|
| `healing_increase` | 所有治疗效果提升x% | 长生天则 (50%) | Multiplier on all healing from this skill |
| `healing_to_damage` | 治疗效果时额外造成治疗量x%的伤害 | 瑶光却邪 (50%) | Heal → damage echo |
| `lifesteal` | 造成伤害时吸血效果x% | 仙灵汲元 (55%) | Damage → self-heal |

### §2.5 Buff/Debuff & State Manipulation

| Effect type | Chinese pattern | Representative affixes | What it does |
|:------------|:---------------|:----------------------|:-------------|
| `buff_strength` | 增益效果强度提升x% | 清灵 (20%), 龙象护身 (300%) | Multiplier on buff values |
| `debuff_strength` | 减益效果强度提升x% | 咒书 (20%) | Multiplier on debuff values |
| `all_state_duration` | 所有状态效果持续时间延长x% | 业焰 (69%), 真言不灭 (55%) | Extends all state durations |
| `buff_duration` | 增益状态持续时间延长x% | 仙露护元 (300%) | Extends buff durations only |
| `random_debuff` | 任意1个减益效果 | 祸星无妄 (ATK -20% / crit rate -20% / crit dmg -50%) | Randomly selects one debuff |
| `debuff` | 治疗量降低x% / 攻击力降低x% / etc. | 天哀灵涸 (heal -80%), 天倾灵枯 (heal -31%) | Direct stat debuff |

### §2.6 DoT Modifiers

| Effect type | Chinese pattern | Representative affixes | What it does |
|:------------|:---------------|:----------------------|:-------------|
| `dot_extra_per_tick` | 持续伤害触发时，额外造成目标x%已损失气血值 | 鬼印 (2%) | Extra damage per DoT tick |
| `dot_damage_increase` | 持续伤害上升x% | 古魔之魂 (104%) | Multiplier on DoT damage |
| `dot_frequency_increase` | 持续伤害效果触发间隙缩短x% | 天魔真解 (50.5%) | Speeds up DoT tick rate |

### §2.7 Resonance (会心/破灵)

| Effect type | Chinese pattern | Representative affixes | What it does |
|:------------|:---------------|:----------------------|:-------------|
| `guaranteed_resonance` | 必定会心造成x倍伤害，y%概率提升至z倍 | 通明 (1.2×/25%/1.5×), 灵犀九重 (2.97×/25%/3.97×) | Guaranteed resonance with tiered multiplier |

---

## §3 Combat Attributes

**[FACT]** From `data/属性/战斗属性.md`, each character has four combat attributes:

| Attribute | Chinese | Raw definition |
|:----------|:--------|:---------------|
| HP | 气血 | 角色承受伤害的上限，若气血值归零，则角色进入濒危状态 |
| ATK | 攻击 | 角色造成伤害的能力，攻击越高造成的伤害越多 |
| SP | 灵力 | 角色受到伤害时，会消耗灵力值产生护盾抵挡伤害 |
| DEF | 守御 | 角色对敌方伤害的抵御能力，守御越高受到的伤害越少 |

**[FACT]** SP is purely defensive: "消耗灵力值产生护盾抵挡伤害" — consumed reactively when taking damage, producing shield. SP is not mana and is not consumed to cast skills. No raw data source mentions SP as a casting cost.

**[FACT]** From `data/属性/进阶属性.md`, advanced attributes include:

| Category | Attributes |
|:---------|:-----------|
| Crit (暴击) | 暴击 (crit chance), 致命 (lethal chance), 命中 (hit rate), 闪避 (dodge), 招架 (parry), 破招 (counter-parry) |
| HP recovery | 气血恢复 (HP regen/s), 神通吸血 (skill lifesteal — flat value per point) |
| SP recovery | 灵力恢复 (SP regen/s) |
| Resonance (破灵) | 会心 (resonance chance), 会心附伤 (resonance bonus damage — flat per point), 刚毅 (resonance resistance) |
| Spirit burst (灵暴) | 灵暴 (spirit burst chance — +50% damage), 灵暴附伤 (spirit burst bonus — flat per point) |
| Skill enhancement | 功法效果增强 (skill effect enhancement — scales damage, shield, regen), 功法附伤 (skill flat bonus), 功法抵御 (skill resistance) |

---

## §4 Skill Casting

### §4.1 HP Cost

**[FACT]** Some skills cost HP to cast, always expressed as a percentage of **current** HP. Examples from `data/raw/主书.md`:

| Skill | HP cost |
|:------|:--------|
| 惊蜇化龙 | x% current HP |
| 十方真魄 | 10% current HP |
| 疾风九变 | 10% current HP |
| 煞影千幻 | 20% current HP |
| 九重天凤诀 | 5% per hit (8 hits) |

**[ASSUMPTION]** HP self-cost bypasses shield — it reduces HP directly, since the source text says "消耗自身x%当前气血值" (consume own HP).

### §4.2 Trigger Schedule

**[FACT]** The 人界 cast interval is 25 seconds per 功法書 (attested in all four school descriptions in `主书.md`). This does **not** apply to 灵書 in 灵界.

**[ASSUMPTION]** In 灵界 PvP, each of the 6 equipped 灵書 is triggered sequentially, approximately 6 seconds apart:

| Time (s) | Event |
|:---------|:------|
| ~0 | Slot 1 triggers |
| ~6 | Slot 2 triggers |
| ~12 | Slot 3 triggers |
| ~18 | Slot 4 triggers |
| ~24 | Slot 5 triggers |
| ~30 | Slot 6 triggers |

The trigger initiates the slot's effects but does not constrain their duration — effects persist according to their own lifecycles, independently of subsequent triggers. The overlap of concurrently active effects from multiple slots is what produces combat dynamics.

> **Configuration note.** The trigger gap $T_{gap}$ is a simulator parameter (default ~6s), not a hard-coded constant.

---

## §5 The Damage Chain

When a skill is cast, its damage is computed through a multiplicative chain of zones. The game uses distinct Chinese terms for different modifier categories; we treat each distinct term as a separate multiplicative zone.

### §5.1 Base Damage

**[FACT]** Each skill specifies base damage as a percentage of ATK (攻击力), distributed across a fixed number of hits. For example, 千锋聚灵剑 at 悟10/融51 deals 20265% ATK across 6 hits.

### §5.2 Multiplicative Zones

**[DERIVED]** The game's distinct modifier terms correspond to separate multiplicative zones. Within each zone, contributions from multiple sources are **additive**; across zones, they **multiply**.

$$D_{skill} = D_{base} \times (1 + S_{coeff}) \times (1 + M_{dmg}) \times (1 + M_{skill}) \times (1 + M_{final}) \times M_{synchro}$$
$$D_{flat} = \frac{x}{100} \times ATK$$
$$D_{total} = D_{skill} + D_{flat}$$

| Zone | Game term | Parser effect type | Representative sources |
|:-----|:----------|:-------------------|:----------------------|
| $S_{coeff}$ | 攻击力提升 | `attack_bonus` | 摧山 (+20%), 摧云折月 (+300%) |
| $M_{dmg}$ | 伤害提升 / 伤害加深 | `damage_increase`, `conditional_damage` | 击瑕, 战意, 吞海, etc. |
| $M_{skill}$ | 神通伤害加深 | `skill_damage_increase`, `next_skill_buff` | 灵威 (+118%), 无极剑阵 (+555%) |
| $M_{final}$ | 最终伤害加深 | `final_damage_bonus` | 明王之路 (+50%) |
| $M_{synchro}$ | 所有效果概率提升 | `probability_multiplier` | 心逐神随 (×2/×3/×4) |
| $D_{flat}$ | 额外造成x%攻击力的伤害 | `flat_extra_damage` | 斩岳 (+2000% ATK), 破灭天光 (+2500% ATK) |

**[FACT]** The distinct game terms are attested in `data/raw/`:
- "提升x%攻击力的效果" — ATK scaling (摧山, 摧云折月)
- "伤害提升x%" — damage increase (various conditionals)
- "神通伤害加深x%" — skill damage multiplier (灵威, 天威煌煌, 无极剑阵)
- "最终伤害加深x%" — final damage multiplier (明王之路)

**[DERIVED]** $D_{flat}$ is a separate additive term: $x\% \times ATK$ (the player's 攻击力 attribute), not scaled by any zone. The Chinese text "额外造成x%攻击力的伤害" parses as: 额外 (extra) + x%攻击力 (x% of the player's ATK) + 伤害 (damage, subject to normal damage resolution). The 攻击力 here is the player attribute, not the skill's scaled coefficient. Derived from analysis of 斩岳; other `flat_extra_damage` sources use identical phrasing.

> **Validation note.** The simulator targets **relative performance ranking** of book sets, not reproduction of exact damage numbers. If the model preserves ordinal rankings (set A outperforms set B in simulation ↔ in game), it is adequate.

### §5.3 Per-Hit Escalation

**[FACT]** Certain effects ramp damage progressively within a multi-hit skill:

| Affix | Mechanic | Values |
|:------|:---------|:-------|
| 惊神剑光 (千锋聚灵剑 main) | Each hit → next hit gains +x% to skill modifier | +25% (悟3), +42.5% (悟10) |
| 心火淬锋 (剑修 school) | Per hit, remaining hits +x%, capped at y% | +5%/hit, cap 50% |
| 破竹 (universal) | Per hit, remaining hits +x%, capped at y% | +1%/hit, cap 10% |

**[ASSUMPTION]** Escalation contributes to the relevant zone on a per-hit basis, resets between casts, and stacks additively across sources within the same zone.

### §5.4 Orthogonal Damage Channels

**[FACT]** Several damage sources bypass the standard multiplicative chain and contribute through separate formulas:

| Channel | Game text pattern | Examples |
|:--------|:-----------------|:--------|
| %maxHP | 造成目标y%最大气血值的伤害 | 千锋聚灵剑 (27%/hit), 镇杀 (10%/2 stacks), 魔念生息 (1.6%/s) |
| Lost-HP (own) | 造成自身z%已损失气血值的伤害 | 十方真魄 (16%), 玄煞灵影诀 (11%), 九重天凤诀 (25%/hit) |
| Lost-HP (enemy current) | 造成目标y%当前气血值的伤害 | 噬心之咒 (7%/0.5s), 贪妄业火 (3%/s) |
| Lost-HP (enemy lost) | 造成目标y%已损失气血值的伤害 | 断魂之咒 (7%/0.5s), 瞋痴业火 (8%/s) |
| True damage | 真实伤害 | 索心真诀 (2.1% maxHP per debuff stack, cap 21%) |
| Reflected damage | 反射伤害 | 疾风九变 极怒 (50% damage taken + 15% lost HP /s) |

**[FACT]** True damage (真实伤害) bypasses all damage reduction. Source: 索心真诀 explicitly uses the term 真实伤害.

**[DERIVED]** Regular %maxHP and lost-HP damage is subject to standard damage resolution (DR, shield), since none of these sources use the 真实伤害 qualifier.

### §5.5 Crit (暴击)

**[FACT]** The crit system is attested in `data/属性/进阶属性.md`:
- 暴击 — "提高角色造成伤害时触发暴击伤害的概率"
- 致命 — "提升攻击时造成致命伤害的概率"

**[FACT]** Crit-related effects in affixes:
- 怒目: "暴击率提升y%" (y=30 at 融合50重) — conditional crit rate boost
- 破碎无双: "z%的暴击伤害" (z=15) — crit damage increase
- 溃魂击瑕: "必定暴击" — guaranteed crit when enemy HP < 30%
- 天人五衰 (天刹真魔 main): reduces target's 暴击率, 暴击伤害 by x% (x=50)
- 祸星无妄: random debuff options include 暴击率降低x% and 暴击伤害降低y%

**[ASSUMPTION]** Crit multiplier formula: $D_{crit} = D \times (1 + \text{critDmgBonus})$ when triggered. Base crit multiplier is unknown; a common convention is 1.5× or 2×.

### §5.6 Resonance (会心/破灵)

**[FACT]** Resonance is a distinct system from crit, attested in `data/属性/进阶属性.md`:
- 会心 — "提高角色造成伤害时触发破灵的概率"
- 会心附伤 — "自身攻击触发破灵时额外附加的伤害，每1点额外附加1点伤害"
- 刚毅 — "降低角色受到伤害时触发破灵的概率"

**[FACT]** Resonance affixes:
- 通明 (universal): "必定会心造成x倍伤害，y%概率提升至z倍" (1.2×/25%/1.5×)
- 灵犀九重 (剑修 school): same mechanic, stronger values (2.97×/25%/3.97×)

**[DERIVED]** Resonance (会心) and crit (暴击) are independent systems:
- Crit uses 暴击率 and 暴击伤害 — both in 进阶属性.md and many affixes
- Resonance uses 会心 and 会心附伤 — separate section in 进阶属性.md
- 通明/灵犀九重 produce guaranteed resonance with a multiplier, distinct from crit chance/damage

**[UNRESOLVED]** Whether resonance specifically targets SP (灵力) or simply produces bonus damage. The 进阶属性.md definition says only "触发破灵" with flat bonus damage; no mention of SP draining. However, strategically draining SP would remove the defender's ability to generate shield, which aligns with the SP/shield defensive model.

### §5.7 Spirit Burst (灵暴)

**[FACT]** From `data/属性/进阶属性.md`:
- 灵暴 — "提高角色造成伤害时触发灵暴的概率，触发灵暴时额外造成50%伤害"
- 灵暴附伤 — "自身攻击触发灵暴时额外附加的伤害，每1点额外附加1点伤害"

**[DERIVED]** Spirit burst is a third chance-based damage amplifier alongside crit and resonance, with a fixed 50% bonus plus flat additional damage.

---

## §6 Damage Resolution

When damage reaches the target, it is resolved against the target's defensive state.

### §6.1 Damage Reduction (守御)

**[FACT]** From `data/属性/战斗属性.md`: "守御：角色对敌方伤害的抵御能力，守御越高受到的伤害越少。" The raw data specifies only that higher DEF means less damage taken. **No formula is specified.**

**[ASSUMPTION]** Two candidate models:

**Model A — Divisive (diminishing returns):**
$$D_{reduced} = D_{incoming} \times \frac{K}{K + \text{DEF}}$$

Higher DEF yields asymptotically diminishing reduction. Never reaches 100%.

**Model B — Subtractive (flat reduction):**
$$D_{reduced} = \max(1,\; D_{incoming} - \text{DEF})$$

DEF subtracts directly from damage with a floor of 1.

Both are plausible. The choice is a simulator parameter. Neither can be tagged [FACT].

### §6.2 Damage Mitigation Layers

**[FACT]** Three distinct Chinese terms for damage reduction appear in raw data:

1. **守御** — base combat attribute (§6.1)
2. **伤害减免** — percentage reduction during cast (金汤: 10%, 金刚护体: 55%)
3. **最终伤害减免** — final damage reduction (落星/煞影千幻: 降低u%最终伤害减免; 魔骨明心: 降低敌方y%最终伤害减免; 命损/魔魂咒界: 最终伤害减免减低x%)

**[DERIVED]** These three terms likely represent separate reduction layers that compose (either multiplicatively or additively). The simulator should treat them as distinct.

### §6.3 SP → Shield Generation

**[FACT]** From `data/属性/战斗属性.md`: "灵力：角色受到伤害时，会消耗灵力值产生护盾抵挡伤害。"

SP is consumed when taking damage to produce shield that absorbs that damage.

**[UNRESOLVED]** Two models for SP-generated shield:

**Model A — Instantaneous:** SP consumed per hit produces shield that absorbs damage from the current hit only. Does not persist.

**Model B — Persistent:** SP consumed produces a shield pool that persists across hits until depleted or expired.

The raw data says only "消耗灵力值产生护盾抵挡伤害" — no specification of persistence. Both models are plausible.

**[FACT]** When SP is depleted, no further SP-based shield can be generated. SP regenerates at a rate determined by 灵力恢复 (进阶属性.md).

### §6.4 Absorption Order

**[ASSUMPTION]** After damage reduction:

1. **Shield** (from SP + skill-generated shields) absorbs first
2. **HP** absorbs the remainder
3. If HP ≤ 0, the character enters 濒危状态 (death)

### §6.5 Skill-Generated Shield

**[FACT]** Beyond the reactive SP → shield mechanism, some skills and affixes generate shield directly:

| Source | Shield formula | Duration |
|:-------|:--------------|:---------|
| 煞影千幻 | x% of own maxHP (12%, raised to 21.5% by 星猿援护) | 8s |
| 玄女护心 (魔修 school) | x% of damage dealt (50%) | 8s |
| 天书灵盾 (周天星元 main) | x% of own maxHP per heal tick (3.5–4.4%) | 16s |
| 灵盾 (universal) | shield values +20% | — |
| 青云灵盾 (体修 school) | shield values +50% | — |

**[ASSUMPTION]** Skill-generated shields stack additively with SP-generated shield.

### §6.6 Shield Special Mechanics

**[FACT]** From `data/raw/`:
- 玉石俱焚 (九重天凤诀 exclusive): "当本神通所添加的护盾消失时，会对敌方额外造成护盾值x%的伤害" (x=100)
- 皓月剑诀 寂灭剑心: per hit, destroys one enemy shield + bonus %maxHP damage
- 碎魂剑意 (皓月剑诀 main): periodic damage scaling with total shields destroyed ("湮灭护盾的总个数 × 600% ATK")

### §6.7 Ignore Damage Reduction (无视伤害减免)

**[FACT]** From `data/raw/专属词缀.md`, 神威冲云 (通天剑诀 exclusive): "使本神通无视敌方所有伤害减免效果，并提升x%伤害" (x=36 at 融合50重).

**[DERIVED]** This bypasses all 伤害减免-type mitigation (both 伤害减免 and 最终伤害减免), but the interaction with base 守御 is unclear. The text says "伤害减免效果" specifically, not "守御".

> Note: The old document referenced 无视防御 (pierce) — this term does not appear in any raw data file. Only 无视伤害减免 (ignore damage reduction) is attested.

---

## §7 Effects and States

### §7.1 Buff/Debuff Lifecycle

**[ASSUMPTION]** Runtime rules for buffs and debuffs:
- **Stacking**: same-type effects refresh duration and increment the stack counter (up to a maximum). They do not create duplicate entries.
- **Effective value**: $\text{base value} \times \text{stacks}$
- **Duration**: decrements per second. At zero, the effect expires and is removed.
- **Reactive expiry**: expiration may trigger further effects (e.g., 玉石俱焚 on shield expiry, 无相魔劫 burst on expiry).

**[FACT]** Some states are explicitly permanent: 结魂锁链 ("战斗状态内永久生效"), 不灭魔体 ("战斗状态内永久生效"), 怒意滔天 ("战斗状态内永久生效").

**[FACT]** Some states are explicitly undispellable: 天哀灵涸/灵涸 ("无法被驱散"), 落星 (not explicitly marked but described as "不可驱散").

### §7.2 Named States

**[FACT]** Named states from `data/raw/主书.md` — persistent entities with their own lifecycles:

| State | Source | Duration | Behavior |
|:------|:-------|:---------|:---------|
| 寂灭剑心 | 皓月剑诀 | 4s | Per hit: destroy enemy shield + bonus %maxHP damage; double damage vs unshielded |
| 分身 | 春黎剑阵 | 16s | Inherits y% of own stats; attacks when main casts; takes z% incoming damage |
| 灵鹤 | 周天星元 | 20s | Per second: heal self/allies z% maxHP; with 天书灵盾 → also shield |
| 仙佑 | 甲元仙符 | 12s | +y% ATK, DEF, maxHP |
| 天鹤之佑 | 浩然星灵诀 | 20s | +y% 最终伤害加成 |
| 天狼之啸 | 元磁神光 | 12s | +y% 伤害加深 per stack, max z stacks |
| 天龙印 | 星元化岳 | 8s | Each target hit → extra attack at y% of original damage (不受伤害加成影响) |
| 结魂锁链 | 天魔降临咒 | Permanent | Self incoming damage -y%; enemy incoming damage +z%; scales with debuff count |
| 不灭魔体 | 天刹真魔 | Permanent | On being hit: self-heal = y% of damage taken (不受治疗加成影响) |
| 罗天魔咒 | 大罗幻诀 | 8s | On being hit: 30→60% chance to apply 噬心之咒 + 断魂之咒 to attacker |
| 怒意滔天 | 玄煞灵影诀 | Permanent | Per second: drain own HP + deal lost-HP-based damage |
| 怒灵降世 | 十方真魄 | 4s | +w% ATK and 伤害减免 |
| 极怒 | 疾风九变 | 4s | Per second: reflect 50% damage taken + 15% lost HP as damage |
| 蛮神 | 九重天凤诀 | 4s | +w% ATK and 暴击率 per stack |
| 破虚 | 天煞破虚诀 | — | Next skill's 8 hits: each hit +z% own lost HP as damage |
| 无相魔劫 | 无相魔劫咒 | 12s | Enemy damage taken +10%; on expiry: burst = 10% of accumulated bonus + 5000% ATK |

### §7.3 Attribute Mutations

Effects mutate player attributes through several pathways:

**Direct stat modification** — modifies a base attribute for the duration:

| Mutation | Example |
|:---------|:--------|
| ATK buff | 仙佑: +70%, 天狼战意: +7% per stack, 蛮神: +2.5% per stack |
| DEF buff | 仙佑: +70% |
| maxHP buff | 仙佑: +70% |
| Damage reduction (伤害减免) | 金汤: +10%, 金刚护体: +55%, 怒灵降世: +20% |
| Damage reduction debuff (最终伤害减免) | 落星: -8%, 命损: -46→100%, 魔骨明心: -20%/hit |
| Healing bonus | 天光虹露: +70–190%, 魔骨明心: +90% |
| ATK debuff | 惧意 (天轮魔经): -14% per stack, 天人五衰: -23% |

**Damage chain modifiers** — contribute to a multiplicative zone for a single cast:

| Modifier | Zone | Example |
|:---------|:-----|:--------|
| `attack_bonus` | $S_{coeff}$ | 摧山 (+20%), 摧云折月 (+300%), 魔神降世 (+13%/debuff stack) |
| `flat_extra_damage` | $D_{flat}$ | 斩岳 (+2000% ATK), 破灭天光 (+2500% ATK) |
| `damage_increase` | $M_{dmg}$ | Various conditional bonuses |
| `skill_damage_increase` | $M_{skill}$ | 灵威 (+118%), 无极剑阵 (+555%), 天威煌煌 (+88–128%) |
| `final_damage_bonus` | $M_{final}$ | 明王之路 (+50%) |

**Conditional modifiers** — evaluated against game state at cast time:

| Condition | Effect | Sources |
|:----------|:-------|:--------|
| Enemy HP < 30% | +damage, +crit | 怒目, 溃魂击瑕, 焚心剑芒 |
| Enemy has debuffs | +damage | 引灵摘魂 (+104%), 解体化形 (+50%/debuff, max 10) |
| Per 1% own HP lost | +damage | 战意 (2.95%), 怒血战意 (2%) |
| Per 1% enemy HP lost | +damage | 吞海 (0.4%), 贪狼吞星 (1%), 焚心剑芒 (5%→10%) |
| Enemy under control | +damage | 击瑕 (40%), 乘胜逐北 (100%) |
| Own HP above threshold | +damage | 天灵怒威 (above 20%, +3% per 3% extra HP) |

### §7.4 Second-Order Modifiers

**[DERIVED]** These amplify other effects before they are computed:

| Modifier | Target | Examples |
|:---------|:-------|:--------|
| `buff_strength` | All buff values from this skill | 清灵 (+20%), 龙象护身 (+300%) |
| `debuff_strength` | All debuff values from this skill | 咒书 (+20%), 心魔惑言 (+100% layer count) |
| `all_state_duration` | All state durations from this skill | 业焰 (+69%), 真言不灭 (+55%) |
| `buff_duration` | Buff durations only | 仙露护元 (+300%) |
| `shield_value_increase` | Shield amounts from this skill | 灵盾 (+20%), 青云灵盾 (+50%) |
| `healing_increase` | All healing from this skill | 长生天则 (+50%) |
| `dot_damage_increase` | DoT damage per tick | 古魔之魂 (+104%) |
| `dot_frequency_increase` | DoT tick interval | 天魔真解 (-50.5%) |
| `probability_multiplier` | All effect values from this cast | 心逐神随 (×2/×3/×4) |

**[DERIVED]** Second-order modifiers apply to input values before those values enter the damage chain or state application.

**[FACT]** 天命有归 (法修 school): "使本神通的概率触发效果提升为必定触发" — converts all probability-based triggers to certainty. When paired with 心逐神随, this collapses the stochastic roll to the maximum tier (×4), yielding a deterministic ×4 multiplier.

---

## §8 Healing

### §8.1 Healing Sources

**[FACT]** Healing sources from `data/raw/`:

| Source | Mechanic | Formula |
|:-------|:---------|:--------|
| 灵鹤 (周天星元) | Periodic heal | z% maxHP per second for 20s |
| 十方真魄 | Lost-HP echo | "等额恢复自身气血" — heal = lost-HP damage dealt |
| 星猿复灵 (疾风九变 exclusive) | Damage echo | heal = 82% of 极怒 damage |
| 天龙轮转 (星元化岳 main) | Damage echo | heal = 75% of damage dealt |
| 仙灵汲元 (星元化岳 exclusive) | Lifesteal | heal = 55% of skill damage |
| 不灭魔体 (天刹真魔) | On-hit self-heal | heal = y% of damage taken (不受治疗加成影响) |
| 气血恢复 (进阶属性) | Passive regen | per second, flat value |

### §8.2 Healing Resolution

**[ASSUMPTION]** Healing formula:
$$\text{effectiveHeal} = \text{baseHeal} \times (1 + \text{healingBonus}) \times (1 - \text{healingReduction})$$
$$\text{HP} = \min(\text{HP} + \text{effectiveHeal},\; \text{maxHP})$$

**[FACT]** 不灭魔体 explicitly bypasses healing bonus: "该效果不受治疗加成影响".

### §8.3 Anti-Healing

**[FACT]** Anti-healing debuffs from `data/raw/`:

| Source | Effect | Duration |
|:-------|:-------|:---------|
| 天哀灵涸 (千锋聚灵剑 exclusive) | 治疗量降低x% (x=80 at 悟12/融52), undispellable | 8s |
| 天倾灵枯 (甲元仙符 exclusive) | 治疗量降低x% (x=31); 降低y% if target HP < 30% (y=51) | 20s |
| 无相魔威 (无相魔劫咒 exclusive) | 治疗量降低x% (x=40.8) | 8s |

### §8.4 Lifesteal Timing

**[DERIVED]** Lifesteal (仙灵汲元: "造成伤害时...吸血效果") uses source-side phrasing ("造成伤害时"), suggesting it applies to **pre-mitigation** damage. However, this is a weak signal.

**[UNRESOLVED]** Whether lifesteal applies to pre-mitigation or post-mitigation damage. The phrasing "造成伤害时" could mean either "when you deal damage" (pre-mitigation) or "when damage is inflicted" (post-mitigation).

### §8.5 Heal-to-Damage Conversion

**[FACT]** 瑶光却邪 (魔修 school): "当本神通造成治疗效果时，会对敌方额外造成治疗量x%的伤害" (x=50).

**[ASSUMPTION]** Heal-to-damage echo fires after healing resolves, producing a new damage event against the opponent that enters standard damage resolution.

---

## §9 DoT (Damage over Time)

### §9.1 Attested DoTs

**[FACT]** DoT effects from `data/raw/`:

| DoT | Source | Damage | Tick rate | Duration |
|:----|:-------|:-------|:----------|:---------|
| 噬心 | 玄心剑魄 (春黎剑阵 exclusive) | 550–3000% ATK/s | 1s | 8–18s |
| 噬心之咒 | 大罗幻诀 | y% target current HP | 0.5s | 4s |
| 断魂之咒 | 大罗幻诀 | y% target lost HP | 0.5s | 4s |
| 贪妄业火 | 梵圣真魔咒 | 3% target current HP | 1s | 8s |
| 瞋痴业火 | 魔心焚尽 (梵圣真魔咒 main) | 8% target lost HP | 1s | 8s |
| 魔念生息 | 天魔降临咒 main | 1.6% target maxHP | 1s | Permanent (tied to 结魂锁链) |
| 怒意滔天 | 玄煞灵影诀 | z% own lost HP + HP drained | 1s | Permanent |

### §9.2 DoT Modifiers

**[FACT]** From `data/raw/`:
- 古魔之魂 (大罗幻诀 exclusive): DoT damage +104%
- 天魔真解 (梵圣真魔咒 exclusive): tick interval -50.5% (nearly doubles tick rate)
- 鬼印 (universal): each DoT tick additionally deals +2% target lost HP

### §9.3 DoT Special Mechanics

**[FACT]** 噬心 (玄心剑魄) has a dispel penalty: "若被驱散，立即受到y%攻击力的伤害，并眩晕z秒" (y=3300–18000% ATK, z=2–3s). Removing 噬心 early triggers massive burst damage and a stun.

**[ASSUMPTION]** DoT ticks resolve independently of skill casts. Each tick produces a damage event that enters the standard damage resolution pipeline.

---

## §10 Dispel and State Manipulation

**[FACT]** State manipulation effects from `data/raw/`:

| Effect | Source | Mechanic |
|:-------|:-------|:---------|
| Self-purge | 九天真雷诀 | On cast: dispel 2 own debuffs; excess capacity → per-hit bonus %maxHP damage |
| Self-purge | 星猿弃天 (十方真魄 exclusive) | During 怒灵降世: y% chance/s to purge all own control states (25s CD) |
| Enemy buff steal | 天轮魔经 | Steal 2 enemy buffs + deal z% maxHP damage per theft |
| Enemy buff dispel | 九重天凤诀 星猿永生 | Before damage: dispel 2 enemy buffs |
| Enemy buff dispel (periodic) | 天煞破虚 (天煞破虚诀 exclusive) | Per second for 10s: dispel 1 enemy buff + deal x% skill damage per dispel; double damage if no buff to dispel |
| Skill cooldown | 新-青元剑诀 | Force enemy's next uncast skill into 8s cooldown |
| Skill damage reduction | 追命剑阵 (新-青元剑诀 main) | Enemy 神通伤害降低x% for 16s (x=30) |

**[ASSUMPTION]** When multiple dispel or state-manipulation events fire concurrently, the outcome depends on event processing order at runtime.

---

## §11 Book System

### §11.1 功法書 (Skill Books)

**[FACT]** The 28 entries in `data/raw/主书.md` are 功法書. Each belongs to one of four schools (剑修: 7, 法修: 7, 魔修: 7, 体修: 7) and carries:
- A main skill (主技能) — the skill's damage and effects
- A main affix (主词缀) — deterministic when in main position
- An exclusive affix (专属词缀) — unique to this 功法書
- School affixes (修为词缀) — shared across all 功法書 of the same school
- Universal affixes (通用词缀) — shared across all 功法書

### §11.2 Progression Axes

**[FACT]** Each 功法書 has three progression axes:

| Axis | Chinese | Effect |
|:-----|:--------|:-------|
| Stage | 阶数 | Scales main skill damage |
| Realm | 悟境 | Unlocks and scales main affix; some exclusive affixes require specific 悟境 |
| Merge | 融合 | Scales affix values; milestone bonuses at 融合6重 (化境: +1000% ATK) and 融合11重 (+2000% ATK) |

**[FACT]** Per-fusion 悟境 bonus: 剑修/魔修/体修 = 320% ATK, 法修 = 280% ATK.

### §11.3 灵書 (Divine Books)

**[FACT]** A 灵書 is constructed from 3 功法書: 1 in the main position (主位) and 2 in auxiliary positions (辅助位).

| Position | Contribution |
|:---------|:-------------|
| Main (主位) | Main skill + main affix (deterministic). Scaling from 升阶 + 融合. Must be 悟境 unlocked. |
| Aux 1 (辅助位) | One random affix from this 功法書's affix pool. Scaling from 融合. |
| Aux 2 (辅助位) | One random affix from this 功法書's affix pool. Scaling from 融合. |

**[FACT]** Aux affix probability by rarity: 专属 < 修为 < 通用 (exclusive is rarest).

### §11.4 Equipment and Conflicts

**[FACT]** A character equips 6 灵書 in ordered slots (1–6).

**[FACT]** From `构造规则.md`:

| Conflict type | Condition | Consequence |
|:--------------|:----------|:------------|
| 核心冲突 | Same 功法書 as main in two 灵書 | Higher-numbered slot entirely disabled |
| 副词缀冲突 | Same 功法書 as affix source in two 灵書 | Higher-numbered slot loses that affix (skill still fires) |

---

## §12 Progression Scaling

**[FACT]** Shared fusion milestones (all schools):
- 化境 (融合6重): +1000% ATK damage
- 融合11重: +2000% ATK damage

**[FACT]** Observed in-game progression values:

| Book | 悟境 | 融合 | Base damage |
|:-----|:-----|:-----|:------------|
| 千锋聚灵剑 | 悟10 | 51 | 20265% ATK (6 hits) |
| 春黎剑阵 | 悟10 | 83 | 22305% ATK (5 hits) |
| 皓月剑诀 | 悟10 | 57 | 22305% ATK (10 hits) |
| 念剑诀 | 悟10 | 50 | 22305% ATK (8 hits) |
| 通天剑诀 | 悟0 | — | 1500% ATK (6 hits) |
| 甲元仙符 | 悟8 | 51 | 21090% ATK (1 hit) |

**[DERIVED]** The simulator uses observed values directly from `data/raw/` at the player's progression level. No interpolation formula is required until one can be empirically derived.

---

## §13 Open Questions

| # | Topic | Status | Notes |
|:--|:------|:-------|:------|
| 1 | **DR formula** | **[ASSUMPTION]** | Two candidate models (§6.1). Neither verified. Simulator parameter. |
| 2 | **SP → Shield ratio and persistence** | **[ASSUMPTION]** | Raw data says "消耗灵力值产生护盾" but doesn't specify the conversion ratio. At ratio=1, SP=5M absorbs only 3.5% of incoming damage — making 灵力 useless. Since 灵力 ≈ 攻击力 in game, ratio must be much higher. Working assumption: ratio=10 (1 SP → 10 shield). Instantaneous per-hit model (§6.3). |
| 3 | **Lifesteal basis** | **[UNRESOLVED]** | Pre- vs post-mitigation (§8.4). Source phrasing ambiguous. |
| 4 | **Resonance → SP drain** | **[UNRESOLVED]** | Whether 会心/破灵 specifically drains SP or just deals bonus damage (§5.6). |
| 5 | **Crit base multiplier** | **[UNRESOLVED]** | Raw data says "暴击伤害" exists as a stat but doesn't specify the base multiplier. |
| 6 | **Zone model accuracy** | **[DERIVED]** | Model derived from distinct game terms. Targets relative ranking, not absolute accuracy. |
| 7 | **Shield stacking** | **[ASSUMPTION]** | Shields from multiple sources stack additively. |
| 8 | ~~**$D_{flat}$ placement**~~ | **[DERIVED]** | Resolved: additive after zones, x% of player ATK. See §5.2. |
| 9 | **Dispel ordering** | **[ASSUMPTION]** | Multiple concurrent dispels — order emerges from event execution. |
| 10 | **不受伤害加成影响** | **[FACT]** | 星元化岳 天龙印 echo is explicitly excluded from damage bonuses. Needs separate handling. |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-18 | **Full rewrite.** Grounded in raw data with [FACT]/[DERIVED]/[ASSUMPTION]/[UNRESOLVED] tags. Added §1 Sources of Truth, §2 Effect Type Taxonomy. Removed fabricated mechanics (SP-gates-casting, pierce/无视防御). Fixed S_coeff formula to (1+S_coeff). Honest DR/SP-shield models. Added crit (§5.5), resonance (§5.6), spirit burst (§5.7). D_flat placement resolved as additive after zones. |
