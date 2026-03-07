---
initial date: 2026-03-06
dates of modification: [2026-03-06]
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

# PVP Build — Slots 1–6

**Authors:** Z. Zhang

> PVP divine book set design for slots 1–6. Each slot is designed as part of a layered kill chain where cross-slot interactions amplify the whole rotation. The rotation forms a loop — slot 6 feeds back into cycle 2's slot 1.

---

## Design Philosophy

The 6-slot rotation is a **layered kill chain**: each slot builds on what the previous one established.

- **Slot 1**: Raw kill power — multiplicative resonance zone
- **Slot 2**: %maxHP finisher + pressure + M_skill zone
- **Slot 3**: Buff amplifier + enemy defense strip — transforms the battlefield for slots 4–6
- **Slot 4**: %maxHP shred + DoT (Damage over Time) synergy + cross-cycle keystone
- **Slot 5**: Berserker self-damage engine + true damage from debuff stacks (planned, locked)
- **Slot 6**: Escalating closer + 減免 bypass + cycle 2 setup (planned, locked)

Key insight: the strongest damage comes from **parallel attack lines** (会心 on 灵力, multiplicative zones on 气血) and **independent multiplicative zones** (M_synchro, M_skill, M_final). Stacking effects in the same additive zone has diminishing returns. Each slot targets a different line or zone.

**Validated in-game**: Multiplicative zones dominate even at minimal values. Slot 2's 【无极剣阵】 at 融合5重 悟0境 (nearly unprogressed) in the M_skill zone beats fully-upgraded affixes in additive zones. Target independent multiplicative zones first, stack within them later. This also means the single highest-value upgrade path is progressing books that feed multiplicative zones (e.g., `无極御剣诀` for M_skill).

---

## Damage Model

> Full specification: [combat.md §2.1](model/combat.md#21-the-multiplicative-damage-chain)

### Two Combat Resources

Every character has two resources that must be depleted to kill them (see [战斗属性](../data/属性/战斗属性.md)):

| Resource | Role | Attacking stat |
|----------|------|----------------|
| 气血 (HP) | Primary health — zero = death | 攻击 (ATK) |
| 灵力 (spiritual power) | Consumed to generate 护盾 (shield) that blocks incoming damage | 会心 (resonance) |

These are **two parallel attack lines**. Most players focus on 气血 damage (ATK/damage multipliers). But 会心 attacks 灵力 — once 灵力 is drained, the opponent **cannot generate shields**, so all subsequent 气血 damage lands unmitigated. This makes 会心 extremely valuable: it removes the opponent's defense layer.

### 气血 Damage — Multiplicative Zones

A skill cast's damage to 气血 passes through a chain of **independent multiplicative zones**:

$$D_{skill} = \underbrace{(D_{base} \times S_{coeff} + D_{flat})}_{\text{base}} \times \underbrace{(1 + M_{dmg})}_{\text{damage zone}} \times \underbrace{(1 + M_{skill})}_{\text{skill zone}} \times \underbrace{(1 + M_{final})}_{\text{final zone}} \times \underbrace{M_{synchro}}_{\text{synchrony}}$$

| Zone | Symbol | What feeds it | Crowding |
|------|--------|---------------|----------|
| Base damage | $D_{base}$ | ATK%, skill coefficient | Always present |
| Damage zone | $M_{dmg}$ | 伤害加成, conditional damage | **Crowded** — many affixes contribute |
| Skill zone | $M_{skill}$ | 神通伤害加成 | **Scarce** — few sources (e.g., 【无极剣阵】+555%) |
| Final zone | $M_{final}$ | 最終伤害加成 | **Very scarce** — 1–2 sources |
| Synchrony | $M_{synchro}$ | 心逐 (e.g., 【心逐神随】 x2/x3/x4) | **Independent** — outer wrapper on ALL effects |

**Why zones matter**: Effects within the same zone add together (diminishing returns). Effects in different zones **multiply** each other. A +100% in an empty zone doubles total damage. A +100% in a zone already at +500% adds only ~17%.

### 灵力 Damage — Resonance (会心)

会心 is a **separate attack line** targeting 灵力, not a multiplier on 气血 damage:

| Source | Effect |
|--------|--------|
| 【灵犀九重】 | Guaranteed 会心 at 2.97x, 25% chance → 3.97x |
| 【心逐神随】 | Multiplies ALL effects (including 会心): x2/x3/x4 |

With both: 3.97 × 4 = **15.88x 灵力 damage** — drains the opponent's shield generation for the entire rotation.

### Orthogonal Channels

Three additional damage channels bypass both the 气血 chain and 守御 (DEF):

| Channel | Example | Why orthogonal |
|---------|---------|----------------|
| %maxHP | `千锋聚灵剣` 27%/hit | Scales with target HP, not ATK |
| Lost-HP | 【追神真诀】 %已損失気血 | Grows as target HP decreases |
| True damage | 【索心真诀】 2.1% maxHP/debuff stack | Bypasses all defense |

---

## Affix Selection Framework

Priority order when choosing affixes for any slot:

**Tier 1 — 灵力 attack (会心/resonance)** (separate attack line, highest strategic value)
- Drains opponent's 灵力 → destroys shield generation → all subsequent 气血 damage unmitigated
- Sources: 【灵犀九重】 (guaranteed 2.97x/3.97x), amplified by 【心逐神随】

**Tier 2 — Multiplicative zones on 气血** (diminishing returns only within the same zone)
1. **M_skill** (神通伤害) — scarce, few sources (e.g., 【无极剣阵】+555%)
2. **M_final** (最終伤害) — very scarce, 1–2 sources
3. **M_synchro** (心逐) — independent outer wrapper on ALL effects (气血 and 灵力)

An affix in an **unfilled** multiplicative zone is worth more than a stronger affix in a zone already covered by another slot. Never double up zones across slots if you can avoid it.

**Tier 2 — %maxHP / true damage** (bypasses normal damage chain)
- Flat %maxHP per hit, %lost HP scaling, true damage
- These ignore most defensive multipliers — value is HP-pool-dependent, not ATK-dependent

**Tier 3 — Effect multipliers** (amplify existing effects)
- 増益 strength (【龙象護身】), duration extension (【仙露護元】), probability-to-certain (【心逐神随】)
- Value depends on what they amplify — worthless alone, devastating on the right platform

**Tier 4 — Additive damage** (D_base, D_flat, ATK%, S_coeff)
- Large numbers but additive with each other — diminishing returns when stacked
- Only prioritize when multiplicative zones are filled

**Tier 5 — Utility / pressure** (DoT, debuffs, CC, survivability)
- 噬心-style dispel traps, antiheal, untargetable states
- Don't win fights alone but create dilemmas that multiplicative damage exploits

**Cross-slot rule**: Persistent effects (buffs, DoT, 分身) that outlast their slot's cast window generate value across multiple slots. Prefer these over same-duration-only effects when the platform supports them.

**Upgrade priority**: Progress books that feed multiplicative zones first. A low-fusion book in M_skill (e.g., `无極御剣诀` at 融合5重 悟0境) outperforms fully-upgraded additive affixes. Every fusion level on a multiplicative-zone book is worth more than the same level on an additive-zone book.

---

## Slot 1 — Alpha Strike

**`春黎剑阵` (main) + `解体化形`/【心逐神随】 + 【灵犀九重】 (修为)**

| Component | Effect |
|-----------|--------|
| `春黎剑阵` | 22305% ATK, 5 hits + 分身 (54% stats, 16s) |
| 【幻象剑灵】 (主词缀) | 分身 damage +200%, damage taken reduced to 120% |
| 【心逐神随】 | All effects: 60% chance x4, 80% chance x3, 100% chance x2 |
| 【灵犀九重】 | Guaranteed resonance (会心) at 2.97x, 25% chance -> 3.97x |

**Design**: Slot 1 attacks on **two parallel lines**:

1. **气血 line** — 22305% ATK damage, amplified by 【心逐神随】 (M_synchro x2/x3/x4)
2. **灵力 line** — 【灵犀九重】 guarantees 会心 at 2.97x (25% → 3.97x), amplified by 【心逐神随】 → up to **15.88x 灵力 damage**

Line 2 drains the opponent's 灵力, destroying their ability to generate 护盾. Once shields are gone, slots 2–6 hit 气血 with **no shield protection**. The 分身 persists for 16s and continues dealing 200% boosted damage through subsequent slots.

This is the kill shot. Most opponents fall here — and those who survive have no shields left.

---

## Slot 2 — %maxHP Finisher + M_skill Zone

**`皓月剑诀` (main) + `春黎剑阵`/【玄心剑魄】 + `无极御剑诀`/【无极剑阵】**

| Component | Effect |
|-----------|--------|
| `皓月剑诀` | 22305% ATK, 10 hits + 寂灭剑心: destroy 1 shield per hit + 12% maxHP per hit; double damage on unshielded targets |
| 【碎魂剑意】 (主词缀) | 寂灭剑心 deals DoT: shields destroyed x 600% ATK every 0.5s |
| 【玄心剑魄】 | Applies 噬心: 550% ATK/sec DoT for 8s; if dispelled -> 3300% ATK burst + 2s stun |
| 【无极剑阵】 | +555% 神通伤害, but enemy gets +350% 神通伤害减免 against this skill |

**Design**: Synergy with slot 1's persistent 分身.

1. **Finisher** — 12% maxHP per hit (10 hits = up to 120% maxHP on unshielded targets) punishes whatever HP survived slot 1. The %maxHP damage is HP-based, not ATK-based — likely unaffected by 【无极剑阵】's 350% 减免
2. **M_skill zone** — +555% 神通伤害 is a massive multiplier on `皓月`'s 22305% ATK hits. Even with the 350% 减免, the net gain is significant
3. **Pressure** — 噬心 creates a dispel dilemma: leave it and take 550%/sec, dispel it and eat 3300% burst + stun
4. **Slot 1 continues** — `春黎`'s 分身 (16s duration) keeps attacking independently during slot 2. The 分身's damage is unaffected by 【无极剑阵】's penalty (scoped to "本神通" only), so you get both the 分身 damage AND 皓月's boosted damage simultaneously

---

## Slot 3 — Battlefield Transformation

**`甲元仙符` (main) + `周天星元`/【奇能诡道】 + `浩然星灵诀`/【龙象护身】**

| Component | Effect |
|-----------|--------|
| `甲元仙符` | 21090% ATK damage + 仙佑 buff: +70% ATK/DEF/HP, 12s |
| 【天光虹露】 (主词缀) | 仙佑 additionally grants +190% healing bonus |
| 【奇能诡道】 | Part 1: debuffs get 20% chance +1 stack. Part 2 (requires 悟境): when this book applies 伤害加深类 増益, triggers 逆転阴阳 on enemy — reduces their 伤害减免 by 0.6x the triggering buff's value |
| 【龙象护身】 | 増益 effect strength +300% (融合52重) |

**Interaction chain**:

1. 仙佑 (+70% ATK/DEF/HP) amplified by 【龙象护身】 -> **+280% ATK/DEF/HP** for 12s
2. 【天光虹露】 healing bonus (+190%) amplified -> **+760% healing bonus**
3. 【奇能诡道】 Part 1: any debuffs this book applies get 20% chance +1 stack

**Design**: This slot doesn't need to kill. It transforms the battlefield state:

- Team gets nearly 4x stats (280% ATK/DEF/HP) for 12s — benefits slots 4–6
- Healing is massively amplified
- The 21090% ATK damage is secondary — the value is what it enables

**【奇能诡道】 role**:
- **Part 1** (20% extra debuff stack): debuff stack generator for slot 5's 【索心真诀】, which deals 2.1% maxHP true damage per debuff stack
- **Part 2** (逆転阴阳): does NOT trigger in cycle 1 — no 伤害加深 source yet. **Triggers in cycle 2+**: slot 4's 【惊神剣光】 accumulates 神通加成 (a 伤害加深類 増益) that persists across cycles. When cycle 2's slot 3 fires, it carries this buff → 【奇能诡道】 detects 伤害加深類 増益 → 逆転阴阳 triggers → 【龙象護身】 amplifies the 神通加成 by 300% → enemy 減免 stripped at scale. Cycle 1 is setup; cycle 2+ is the full chain.

---

## Slot 4 — %maxHP Shred + DoT

**`千锋聚灵剑` (main) + `皓月剑诀`/【追神真诀】 + `十方真魄`/【破釜沉舟】**

| Component | Effect |
|-----------|--------|
| `千锋聚灵剑` | 20265% ATK, 6 hits + 27% maxHP per hit |
| 【惊神剑光】 (主词缀) | Each hit boosts the next by +42.5% 神通加成 (escalating damage) |
| 【追神真诀】 | DoT triggers deal +26.5% of target's lost HP; at 悟10: +50% maxHP damage, +300% damage |
| 【破釜沉舟】 | +380% 神通伤害, but self takes +50% damage during cast (融合54重) |

**Design**: Raw %maxHP damage amplified by two independent multipliers.

1. **%maxHP shred** — `千锋聚灵剑` deals 27% maxHP per hit x 6 hits = up to 162% maxHP. 【追神真诀】 at 悟10 boosts this by +50% -> up to 243% maxHP equivalent. Against any target, this is lethal
2. **Damage amplifier** — 【破釜沉舟】's +380% applies to the entire skill — both ATK% and %maxHP hits. This is a single-affix multiplier that doesn't cancel itself (unlike 【无极剑阵】+【神威冲云】)
3. **Escalation** — 【惊神剑光】 ramps +42.5% per hit, so the 6th hit is massively boosted on top of everything else
4. **Self-damage tradeoff** — +50% damage taken during cast is acceptable: slot 3's 仙佑 provides +280% DEF/HP as a cushion, and the fight should be nearly over by slot 4
5. **DoT finish** — 【追神真诀】 triggers on DoT ticks, dealing %已损失気血. After slots 1–3, the enemy is low HP, so each tick is devastating
6. **Cross-cycle carry** — Observed in-game: slot 4 significantly boosts cycle 2+. 【惊神剣光】's stacking 神通加成 (+42.5% per hit × 6 hits = +255%) persists beyond cast. This buff is 伤害加深類 — it amplifies cycle 2's slot 1 damage (feeds into 【心逐神随】 x4 and 【灵犀九重】 3.97x) AND triggers 【奇能诡道】's 逆転阴阳 on cycle 2's slot 3. `千锋聚灵剣` is not just a damage slot — it's the keystone that enables the full chain in cycle 2+

---

## Slot Summary

| Slot | Platform | Aux-1 | Aux-2 | Role |
|------|----------|-------|-------|------|
| 1 | `春黎剑阵` | `解体化形`/【心逐神随】 | 【灵犀九重】 | Alpha strike (15.88x 灵力 damage) |
| 2 | `皓月剑诀` | `春黎剑阵`/【玄心剑魄】 | `无极御剑诀`/【无极剑阵】 | %maxHP finisher + M_skill zone |
| 3 | `甲元仙符` | `周天星元`/【奇能诡道】 | `浩然星灵诀`/【龙象护身】 | +280% ATK/DEF/HP team buff |
| 4 | `千锋聚灵剑` | `皓月剑诀`/【追神真诀】 | `十方真魄`/【破釜沉舟】 | %maxHP shred + 380% amplifier |
| 5 | `玄煞灵影诀` | `惊蛰化龙`/【索心真诀】 | 【摧云折月】 | Berserker + true damage from debuff stacks |
| 6 | `念剣诀` | `通天剣诀`/【神威冲云】 | 【灵威】 | Closer + 減免 bypass + cycle 2 setup |

**Status**: Slots 1–4 active and tested. Slots 5–6 planned (locked, not yet unlocked).

## Slot 5 — Berserker / Self-Damage Engine (planned, slot locked)

> Slots 5–6 are not yet unlocked. Designs below are theoretical — to be validated in-game when available.

**`玄煞灵影诀` (main) + `惊蛰化龙`/【索心真诀】 + 【摧云折月】 (修為)**

| Component | Effect |
|-----------|--------|
| `玄煞灵影诀` | 18255% ATK, 4 hits + 【怒意滔天】: permanent self-drain (4%HP/sec) + deals 11% lost HP/sec to enemy |
| 【星猿之怒】 (主词缀) | Every 4 ticks of 【怒意滔天】, bonus 12% lost HP damage |
| 【索心真诀】 | Per debuff stack on enemy → 2.1% maxHP true damage (max 21% at 10 stacks); at 悟境: +50% self lost HP damage, +75% damage |
| 【摧云折月】 | +300% ATK (修為, 融合50重) |

**Design**: Self-damage feedback loop that accelerates as the fight continues.

1. **Self-drain engine** — 【怒意滔天】 is **permanent** (战斗状态内永久生效): drains 4%HP/sec, deals 11% lost HP/sec to enemy. The more HP you lose, the harder it hits. Carries through slot 6 and all future cycles
2. **ATK amplification** — 【摧云折月】's +300% ATK amplifies both the 18255% burst and 【怒意滔天】's persistent output. 【索心真诀】 at 悟境: +50% self lost HP damage → directly amplifies 怒意滔天's output
3. **True damage payoff** — 【索心真诀】 converts debuff stacks into true damage (2.1% maxHP per stack, bypasses all defense). By slot 5, enemy has accumulated debuffs from 【玄心剣魄】's 噬心 (slot 2), 【奇能诡道】's extra stacks (slot 3), and other sources. 10 stacks = 21% maxHP true damage per hit
4. **Cross-slot synergy** — Slot 3's 【奇能诡道】 Part 1 (20% extra debuff stacks) directly feeds 【索心真诀】's true damage. Slot 3's 仙佑 +280% DEF/HP cushions the self-damage. Slot 4's 【惊神剣光】 stacking may still be active
5. **Burst + sustain** — 18255% ATK burst on cast, then 【怒意滔天】 continues dealing permanent DoT

---

## Slot 6 — Closer + Cycle Loop (planned, slot locked)

> Slots 5–6 are not yet unlocked. Design below is theoretical — to be validated in-game when available.

**`念剣诀` (main) + `通天剣诀`/【神威冲云】 + 【灵威】 (通用)**

| Component | Effect |
|-----------|--------|
| `念剣诀` | 22305% ATK, 8 hits, 1.4x escalation per 2 hits, 4s untargetable |
| 【雷阵剣影】 (主词缀) | After skill ends, 雷阵 persists 6.5s, dealing damage every 0.5s |
| 【神威冲云】 | Ignore ALL enemy 伤害減免 + 36% damage |
| 【灵威】 | After firing, next slot gets +118% 神通伤害加深 |

**Design**: Final slot that closes the kill and loops into cycle 2.

1. **減免 bypass** — 【神威冲云】 ignores ALL enemy 減免. Whatever defense the enemy rebuilt or retained is irrelevant. The full 22305% ATK + 1.4x escalation lands unmitigated
2. **Escalation** — 1.4x per 2 hits across 8 hits means back-loaded damage. The 8th hit is massively amplified, and with 減免 bypassed, nothing absorbs it
3. **Untargetable** — 4s invulnerability at end of rotation provides survivability into cycle 2
4. **Persistent DoT** — 【雷阵剣影】 continues dealing damage for 6.5s into cycle 2 start
5. **Cycle loop** — 【灵威】 gives the next slot +118% 神通伤害加深. "下一个施放的神通" from slot 6 wraps to **cycle 2 slot 1**. Cycle 2's `春黎` fires with +118% 伤害加深 → amplified by 【心逐神随】 x4 and 【灵犀九重】 3.97x. The rotation is a self-reinforcing loop

**Cycle 2 slot 1 receives from prior slots**:
- +118% 伤害加深 from slot 6's 【灵威】
- +255% 神通加成 from slot 4's 【惊神剣光】 (persistent)
- 【怒意滔天】 permanent DoT still running from slot 5
- All fed into 【心逐神随】 x4 and 【灵犀九重】 3.97x

---

## Rejected Alternatives

### Slot 2: 【天威煌煌】 instead of 【无极剑阵】

Earlier design used `新-青元剑诀`/【天威煌煌】 in slot 2's aux-2 to set up slot 3's 逆転阴阳 chain:

- 【天威煌煌】 gives slot 3 +50% 神通伤害加深 (増益)
- 【龙象护身】 amplifies to 200%
- 【奇能诡道】 triggers 逆転阴阳: enemy loses 0.6 × 200% = 120% 伤害减免
- Slot 4+ benefits from stripped enemy defense

**Why rejected**: 【无极剑阵】's +555% M_skill on `皓月` synergizes better with slot 1's persistent 分身. The %maxHP hits may bypass the 350% 减免 penalty. In-game testing confirmed slot 2 with 【无极剑阵】 performs better than the 【天威煌煌】 setup chain.

**Trade-off**: Losing 【天威煌煌】 means 【奇能诡道】's Part 2 (逆転阴阳) has no trigger. Slot 3 becomes a pure buff bot. The 逆転阴阳 chain could be re-enabled if a future slot provides 伤害加深 to slot 3 (e.g., 【灵威】 or 【天威煌煌】 on an earlier slot).

### Slot 2: 【仙露護元】 or 【心火淬锋】 instead of 【无极剣阵】

Considered replacing 【无极剣阵】 with:
- **【仙露護元】** (`念剣诀` exclusive): extends 寂灭剣心 from 4s to 16s, giving 32 DoT ticks across slots 3–5. No downside. Sustained cross-slot value.
- **【心火淬锋】** (修為): +5% per hit, max +50%. Strong on `皓月`'s 10 hits — back-loads damage onto later hits that carry %maxHP.

**Why rejected**: In-game testing shows 【无极剣阵】 still wins on slot 2, even with `无極御剣诀` at 融合5重 and 悟0境 (no enlightenment, far below max values). The M_skill zone multiplier is that valuable on `皓月`. This book is extremely hard to obtain — yet even at minimal progression it outperforms alternatives. Upgrading fusion/enlightenment will strengthen slot 2 massively with no other changes needed. 【仙露護元】 and 【心火淬锋】 remain viable fallbacks if 【无極剣阵】 is needed elsewhere.

### Slot 4: 【无极剣阵】 + 【神威冲云】

Considered pairing 【无极剑阵】 (+555% M_skill, +350% enemy 減免) with 【神威冲云】 (ignore all 減免, +36% damage) to cancel the penalty.

**Why rejected**: Two aux slots used where one cancels the other's downside. Net from two slots: +555% M_skill + 36% damage. `千锋聚灵剑` + 【追神真诀】 + 【破釜沉舟】 provides more total value — %maxHP shred, +380% amplifier, +300% damage, and cross-cycle stacking from 【惊神剑光】. Each affix contributes independently.

### Slot 4: `念剣诀` + 【追神真诀】 + TBD

Considered `念剣诀` (22305% ATK, 8 hits, 1.4x escalation, 4s untargetable) with 【雷阵剣影】 extended DoT (6.5s) triggering 【追神真诀】's %HP damage per tick.

**Why rejected**: `千锋聚灵剑` with 【破釜沉舟】 provides stronger burst through %maxHP shred + 380% amplifier. Also, in-game observation shows `千锋`'s slot 4 significantly boosts slot 1 in cycle 2+ (likely 【惊神剣光】's stacking 神通加成 carrying across cycles). `念剣诀` does not produce this cross-cycle benefit. However, `念剣诀` was not tested in-game — the skill books required may not be upgraded enough to produce the expected result. Worth revisiting if book levels improve.

## Open Questions

1. **【无极剣阵】 vs %maxHP**: Does `皓月`'s %maxHP damage bypass 【无极剣阵】's 350% 神通伤害減免? If yes, the penalty is largely irrelevant for slot 2.
2. **【奇能诡道】 trigger**: Without 【天威煌煌】 on slot 2, 逆転阴阳 has no 伤害加深 source. Consider whether a future slot adjustment (e.g., 【灵威】 on another slot) can provide the trigger.
3. **Cross-cycle carry**: Slot 4's 【惊神剣光】 stacking 神通加成 persists beyond cast (observed in-game). This is 伤害加深類 — triggers 逆転阴阳 on cycle 2's slot 3 and amplifies cycle 2's slot 1. Mechanism confirmed by observation; exact buff values at current fusion level TBD.
4. **【灵威】 cycle wrap**: Does slot 6's 【灵威】 ("下一个施放的神通") wrap to cycle 2 slot 1? If yes, cycle 2 slot 1 gets +118% 伤害加深 on top of 【惊神剣光】's carry — needs in-game verification when slot 6 is unlocked.
5. **Slot 5–6 validation**: Both slots are locked. All designs are theoretical and need in-game testing when unlocked.
