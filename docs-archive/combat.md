---
initial date: 2026-2-23
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
  border-left: 3px solid #4b5263;
  padding-left: 10px;
  color: #5c6370;
}

strong {
  color: #e5c07b;
}
</style>

# Divine Book Combat Theory

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> How damage works in the divine book system, why the model has 20 dimensions instead of 1, and what makes one affix configuration better than another.
>
> Chinese companion: [灵书战斗原理.md](灵书战斗原理.md) — same material, written for Chinese-speaking players with in-game examples.
>
> General theory (system-agnostic): [theory.combat.md](../docs/abstractions/theory.combat.md) — SDE formulation, exit problem, full derivations.
>


---

## 1. The Damage Formula: Multiplicative Zones

Divine Book damage is not a flat sum. It passes through a chain of **independent multiplicative zones** (乘区), each multiplying the result of the one before it:

$$D_{slot} = (D_{base} \times S_{coeff} + D_{flat}) \times (1 + M_{dmg}) \times (1 + M_{skill}) \times (1 + M_{final}) \times C_{mult}$$

| Symbol | Zone | What fills it | Model dim |
|--------|------|---------------|:---------:|
| $D_{base} \times S_{coeff}$ | Base × skill coefficient | Skill book's main attack (e.g. 20265% ATK) | 0 |
| $D_{flat}$ | Flat extra damage | 斩岳 (+2000% ATK), 破灭天光 (+2500% ATK) | 8 |
| $M_{dmg}$ | Damage increase (伤害加深) | 天命有归 (+50%), 击瑕 (+40%), 怒目 (+20%) | 3 |
| $M_{skill}$ | Skill damage increase (神通伤害加深) | 灵威 (+118%), 无极剑阵 (+555%), 天威煌煌 (+50%) | 4 |
| $M_{final}$ | Final damage deepening (最终伤害加深) | 明王之路 (+50%), 魔魂咒界 counter | 5 |
| $C_{mult}$ | Crit multiplier | 灵犀九重 (2.97×), 通明 (1.2×) | 6, 7 |

The formula also has **additive channels** that bypass the multiplicative chain entirely:

| Channel | Mechanic | Model dim |
|---------|----------|:---------:|
| %maxHP true damage | Flat % of target max HP per hit — ignores ATK | 9 |
| Lost HP scaling | Grows as target (or self) loses HP — execution mechanic | 10 |
| DoT | Continuous damage over time — separate timeline from burst | 11 |

### Why multiplicative zones matter

The zones are independent multipliers, not additive buckets. This has a profound consequence for affix value:

**Marginal return depends on zone crowding.** If a zone already has +200% from other sources, adding +50% more yields:

$$\frac{1 + 2.50}{1 + 2.00} = \frac{3.50}{3.00} = 1.167\times$$

But if a zone is *empty*, adding +50% yields:

$$\frac{1 + 0.50}{1 + 0.00} = 1.50\times$$

Same face value, but 1.50× vs 1.167× actual gain. **Scarce zones have higher marginal returns.**

This is the central principle of affix valuation: the affixes that occupy rare multiplicative zones are worth more than those in crowded zones, even if their face-value percentages are identical.

### Zone scarcity in practice

| Zone | Dim | Crowding | Key affixes | Marginal value |
|------|:---:|----------|-------------|:--------------:|
| 伤害加深 (dmg) | 3 | **Crowded** — many generic affixes contribute | 击瑕, 怒目, 天命有归, 破碎无双, ... | Low |
| 神通伤害加深 (skill) | 4 | **Scarce** — only a few affixes | 灵威 (+118%), 无极剑阵 (+555%), 天威煌煌 (+50%) | High |
| 最终伤害加深 (final) | 5 | **Very scarce** — applies last in chain | 明王之路 (+50%), 魔魂咒界 counter | Very high |
| Crit multiplier | 7 | Moderate — a few dedicated affixes | 灵犀九重 (2.97×/3.97×), 通明 (1.2×/1.5×) | High when crit is guaranteed |

This is why `明王之路` (+50% final deepening) routinely outperforms nominally larger damage bonuses — it operates in the scarcest zone at the end of the multiplication chain.

---

## 2. Hit Count and the Time Axis

Every skill has a **hit count** (段数) that determines two things:

1. **Cast duration** — each hit takes 1 second (1段 = 1s), so a 6-hit skill takes 6 seconds
2. **Per-hit effect triggers** — effects like per-hit escalation and %maxHP damage fire once per hit

This means a skill's damage is not instantaneous — it unfolds over time. A 10-hit skill (皓月剑诀) has a fundamentally different temporal profile than a 5-hit skill (春黎剑阵), even if their total damage coefficients are similar.

### Per-hit escalation

Some affixes grow stronger with each hit:

- 【惊神剑光】: +42.5% skill bonus per hit → on a 6-hit skill, the 6th hit has +212.5%
- 【心火淬锋】: +5% per hit, max 50% → on a 10-hit skill, hits 1–10 average +25%
- 【破竹】: +1% per hit, max 10% → modest but universal

Escalation affixes are **back-loaded** — weak on hit 1, strong on the final hit. They reward high hit counts (dim 1) and create a temporal shape that the time-series captures.

### Why hit count is a dimension

Hit count (dim 1) is not damage itself, but it controls:
- How many times per-hit effects fire (dims 9, 12)
- Cast duration, which determines how long buffs/debuffs need to last to cover the full cast
- Whether escalation mechanics have time to ramp up

A 10-hit skill with 12% maxHP per hit deals 120% maxHP total; the same effect on a 5-hit skill deals 60%. The hit count doubles the output of that entire damage channel.

---

## 3. Damage Channels Outside the Formula

Not all damage flows through the multiplicative chain. Three channels operate independently:

### %maxHP true damage (dim 9)

Deals a flat percentage of the target's maximum HP per hit, regardless of the attacker's ATK stat. Particularly effective against high-HP targets (bosses in PvE).

- 千锋聚灵剑: 27% maxHP per hit × 6 hits = 162% maxHP total (capped at 5400% ATK vs monsters)
- 皓月剑诀: 12% maxHP per hit × 10 hits = 120% maxHP total
- 索心真诀: 2.1% maxHP per debuff layer — scales with debuff stacking

### Lost HP scaling (dim 10)

Damage that grows as the target (or self) loses HP — an **execution mechanic** that accelerates kills once the target is wounded.

- 追神真诀: 26.5% of target's lost HP per DoT tick — enormous against wounded targets
- 吞海: 0.4% damage per 1% target lost HP — rewards sustained attrition
- 战意: 0.5% damage per 1% self lost HP — glass cannon mechanic

### DoT (dim 11)

Damage over time operates on its own timeline — it ticks continuously regardless of skill casts, making it a sustained damage channel orthogonal to burst.

- 玄心剑魄: 550% ATK/s for 8s = 4400% ATK total as DoT
- Modified by: 古魔之魂 (+104% DoT damage), 天魔真解 (+50.5% tick frequency)

DoT is the dominant damage source in PvE (long fights where sustained drift matters) but secondary in PvP (short fights where burst decides outcomes).

---

## 4. Probability and Variance

Two affixes create a **variance–drift tradeoff** that exemplifies strategic decision-making:

### The stochastic multiplier: 【心逐神随】

| Outcome | ×4 | ×3 | ×2 | ×1 |
|---|---|---|---|---|
| Probability | 11% | 31% | 51% | 7% |

$$E[X] = 0.11 \times 4 + 0.31 \times 3 + 0.51 \times 2 + 0.07 \times 1 = 2.46$$

This affix introduces **variance** — on average it multiplies by 2.46×, but any given cast might be 1× or 4×. In short PvP fights, you're gambling on a spike. In long PvE fights, variance washes out and you converge to the expected value.

### The deterministic trigger: 【天命有归】

"All probability-based triggers are guaranteed to activate, +50% damage."

This converts the stochastic ×2.46 into a deterministic ×4.00, then multiplies by 1.50:

$$4.00 \times 1.50 = 6.00\times$$

The pair implements a strategic choice: use 心逐神随 alone (high variance, one affix slot) or invest both slots for 6.00× guaranteed output (zero variance, two slots). In the model, this is dim 13 (`prob_mult`): E[X] = 2.46 for the multiplier alone, or 6.00 when combined with the deterministic trigger.

---

## 5. Five Combat Levers

All combat contribution — not just damage — decomposes into five **levers** that determine win probability. Different scenarios weight these levers differently, which is why a PvP-optimal configuration differs from a PvE-optimal one.

| Lever | What it does | Key affixes | Dominant scenario |
|-------|-------------|-------------|-------------------|
| **Damage output** | Kill the target through the damage formula | 摧云折月, 破竹, 惊神剑光, 灵犀九重 | All (baseline) |
| **Burst amplification** | Maximize a single skill's damage via scarce zones | 灵威 (+118% skill), 明王之路 (+50% final) | PvP — short fights decided by burst |
| **Survivability** | Stay alive through DR, shields, self-heal | 金刚护体 (55% DR), 青云灵盾, 仙灵汲元 | Solo PvE — no healer available |
| **Anti-healing** | Suppress enemy recovery (net equivalent to more damage) | 天哀灵涸 (-31%, undispellable), 天倾灵枯 (-31%→-51%), 无相魔威 | PvP — negates opponent's sustain |
| **Buff/debuff control** | Amplify allied effects or weaken enemy defenses | 龙象护身 (+104% buff), 心魔惑言 (+100% debuff layers), 命損 (-100% DR) | Team PvP/PvE — shared effects scale with team size |

### Scenario priorities

| Lever | Solo PvE | Solo PvP | Team PvE | Team PvP |
|-------|----------|----------|----------|----------|
| DoT / sustained | **Core** | Low | High | Low |
| Burst | Low | **Core** | Medium | **Core** |
| Anti-healing | Irrelevant | **Core** | Irrelevant | **Critical** |
| Self-sustain | **Core** | High | Low | Low |
| Team debuffs | N/A | N/A | **Core** | High |
| CC exploitation | N/A | Medium | Low | **Core** |

**Why anti-healing is irrelevant in PvE:** Bosses have no healing ($H = 0$). Anti-heal modifies a zero term.

**Why burst beats DoT in PvP:** Both players are fragile relative to each other's output. Fights are short — DoT doesn't have time to accumulate, but a single burst skill amplified through scarce zones can decide the outcome.

**Why team debuffs scale super-linearly:** A shared debuff that gives +50% damage applies to *all* teammates' damage. In a team of 4, that's 4× the total drift modification of a +100% self-buff. The larger the team, the more valuable shared effects become.

---

## 6. Temporal Effects and Slot Ordering

A divine book set releases 6 skills in sequence, one per slot, spaced 6 seconds apart (configurable). Effects have a **scope** that determines whether they affect only the current slot or persist to affect later ones:

| Scope | Chinese | Behavior | Model dims |
|-------|---------|----------|:----------:|
| This skill only | 本神通 | Fires and disappears within the cast | 0–17 |
| Cross-slot | 跨槽 / 下一神通 | Persists for `duration` seconds, affecting subsequent slots | 18–19 |

### Why slot order matters

A buff that lasts 12 seconds covers floor(12/6) = 2 subsequent slots. If placed in slot 1, it amplifies slots 2 and 3. If placed in slot 5, it amplifies only slot 6 (and the excess duration is wasted).

This creates a **temporal ordering principle**: buffs and debuffs should be released early, and burst damage skills should be released after the buffs are active. This is the Buff Temporal Precedence principle — early amplifiers multiply everything that follows; late amplifiers multiply nothing.

### Slot roles

From the reference configuration (叶钦 combo 2):

| Slot | Role | Function | Temporal logic |
|------|------|---------|----------------|
| 1 | PREP-BUFF | Stack buffs to amplify later slots | Temporal effects in dims 18–19 start propagating |
| 2 | PREP-MULT | Establish damage multipliers | Cross-slot debuffs weaken enemy for slot 3 |
| 3 | VITAL | Main damage output | Benefits from all accumulated buffs/debuffs |
| 4 | ASSIST-A | Supplementary damage / exploit debuffs | Uses remaining cross-slot effects |
| 5 | ASSIST-B | DoT / sustained damage | DoT ticks cover remaining cycle |
| 6 | FINISH | Delayed burst / self-preservation | Cleanup; delayed mechanics resolve |

### Cross-slot propagation formula

The state of slot $k$ combines its own effects with received cross-slot effects:

$$s_k = v^{self}_k + v^{received}_k$$

where

$$v^{received}_k = \sum_{j < k} \sum_{a \in slot_j} v^{temporal}_a \cdot \mathbb{1}[d_a > (k-j) \times T_{gap}]$$

A temporal effect from slot $j$ reaches slot $k$ only if its duration $d_a$ exceeds $(k-j) \times 6$ seconds. This is why dims 18 (temporal buff) and 19 (temporal debuff) measure `value × slot coverage` — the product of the effect's strength and how many subsequent slots it reaches.

### Concrete example

**魔魂咒界** (大罗幻诀's main affix) — counter-triggered: when hit during the cast, 60% chance to apply 命損 (final DR -100%) for 8 seconds.

- Duration 8s / gap 6s = 1.33 → covers 1 full subsequent slot
- Dim 19 contribution: 100 × 1 = 100
- Strategic placement: in slot 2, so the -100% DR amplifies slot 3 (the VITAL burst slot)

Without the temporal model, this affix would look like "debuff, -100%" — a large number with no context. With the temporal model, it becomes "a cross-slot debuff that enables the main burst slot to deal effectively double damage." The *where* matters as much as the *what*.

---

## 7. From Combat Theory to Model Dimensions

The 20 model dimensions are not arbitrary. Each one captures a distinct axis of the combat theory:

| Theory concept | Model dims | Section |
|----------------|:----------:|---------|
| Multiplicative zone factors | 0, 2–5, 6–7 | §1 |
| Hit count / cast duration | 1 | §2 |
| Additive damage channels | 8–11 | §3 |
| Per-hit escalation | 12 | §2 |
| Probability mechanics | 13 | §4 |
| Buff/debuff amplification | 14–15 | §5 |
| Healing / survivability | 16–17 | §5 |
| Cross-slot temporal effects | 18–19 | §6 |

The mapping from 52 effect types → 20 dimensions is the **compression step**: it discards the granularity of individual effect types and preserves only the combat-meaningful axes. Two affixes that achieve the same combat outcome through different effect types will have similar model vectors — which is exactly what enables similarity search and clustering.

For the complete type → dimension mapping table, see [embedding.md](embedding.md) §2. For concrete game examples per dimension, see [domain.md](domain.md) §6.

---

## 8. From Game Observation to General Theory

This document analyzes the combat mechanics of one specific game — 《凡人修仙传》(A Mortal's Journey to Immortality). But the purpose is not to build a model that works *only* for this game. The purpose is to demonstrate that this game's mechanics follow **general combat theory** — theory that is independent of any particular game's implementation.

### The intellectual arc

The reasoning proceeds in three stages:

1. **Observe the game** — extract mechanics from game text (about.md), document the damage formula, identify multiplicative zones, catalog affixes and their effects. This is what §1–§7 of this document do.

2. **Apply general theory** — formulate combat as a stochastic dynamical system with absorbing barriers (the exit problem). Show that the game's multiplicative zones, combat levers, scenario priorities, and temporal ordering all emerge naturally from the general theory's predictions. If the game's observed mechanics are consistent with the theory, the theory is validated as an abstraction.

3. **Formalize the abstraction** — the validated general theory becomes the formal model in [gcg](../../../gcg/), where it is extended to cover system design (priority-queue release, crafting, operator composition) and used as the foundation for building new games.

### Correspondence between this game and the general theory

The general theory is developed in [gcg/spirit-books/book.combat.md](../../../gcg/spirit-books/book.combat.md) — a system-agnostic formulation using SDE dynamics, the Lanchester attrition model, and first-exit-time analysis. The following correspondences validate the theory against this game's observed mechanics:

| This game (concrete) | General theory (abstract) | gcg reference |
|----------------------|--------------------------|:-------------:|
| Multiplicative zones (伤害加深, 神通伤害加深, 最终伤害加深) | Independent drift amplifiers in the SDE | book.combat.md §1.1 |
| Five combat levers (damage, burst, survivability, anti-heal, buff/debuff) | Five parameters that modulate exit probability | book.combat.md §1.4 |
| Zone scarcity (scarce zones have higher marginal return) | Multiplicative zone scarcity — diminishing marginal returns | book.combat.md §1.6 |
| %maxHP, lost-HP scaling, DoT bypass the ATK-based formula | Orthogonal drift sources — independent of formula-mediated drift | book.combat.md §1.7 |
| Hit count (段数) determines per-hit trigger frequency | Temporal granularity of the drift function | book.combat.md §1.8 |
| Temporal ordering (buffs early, burst late) | Buff Temporal Precedence theorem | book.combat.md §4.2 |
| Cross-slot effect value = magnitude × floor(duration / gap) | Duration coverage factor in PositionMod | book.combat.md §4.2 |
| Scenario priorities (PvE: DoT + sustain; PvP: burst + anti-heal) | Scenario-lever matrix derived from dynamics | book.combat.md §3.5 |
| Stochastic multiplier (心逐神随 × 天命有归) | Variance-drift tradeoff as player choice | book.combat.md §2.3 |

The general theory predicts design patterns (§2 of the gcg doc) — e.g. that anti-healing affixes *must* exist, that at least one should be undispellable, that stochastic multipliers should have right-skewed distributions. The game's actual affix catalog matches these predictions, which strengthens confidence that the theory captures real structural invariants rather than post-hoc rationalizations.

### Pre-study trail

The path from game observation to general theory was not direct. Early Chinese translations of the gcg theory docs are archived in `archive/` (`book.combat.md`, `book.system.md`) — they served as an initial bridge between game-specific observations and abstract formulation but contain no verification evidence themselves.

The optimization theory (correctness theorems, Buff Temporal Precedence, Resonance Tradeoff Bound) lives in gcg: [gcg/spirit-books/book.theory.md](../../../gcg/spirit-books/book.theory.md). The theory–game alignment assessment lives in [`verification/`](../../verification/) — checking each gcg abstraction against the normalized affix data.

These are not abandoned artifacts. They are the **pre-study stage** — the work that established whether the general theory was viable before committing to it as the project's theoretical foundation. This agenda remains part of the project: as more game data is collected and more mechanics are documented, the correspondence table above will grow, and discrepancies (if any) will guide refinements to the theory.

### The complete chain

```
Game text (about.md)
  → Game-specific combat analysis (this document, §1–§7)
    → General theory validation (this section, §8)
      → System-agnostic abstraction (gcg/spirit-books/book.combat.md)
        → Formal system design (gcg/spirit-books/book.system.md)
          → Novel game implementation (gcg — the "novel cradle" that proves the abstraction)
```

The 20 model dimensions (§7) sit at the junction: they are derived from the game-specific analysis (§1–§6) but correspond to the general theory's parameters (drift amplifiers, combat levers, temporal modifiers). The vector pipeline quantifies these dimensions, enabling computational comparison of affix configurations — which is the practical payoff of grounding the model in validated theory rather than ad-hoc feature engineering.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-23 | Initial: damage formula, multiplicative zones, hit count, damage channels, probability, combat levers, scenario matrix, temporal effects, slot ordering, bridge to model dimensions |
| 1.1 | 2026-02-23 | §8: intellectual arc (game observation → general theory → gcg abstraction), correspondence table, pre-study trail, complete chain |
| 1.2 | 2026-02-23 | §8: updated correspondence table to match gcg §1.6–1.8 + §4.2 additions; added orthogonal drift, temporal granularity, duration coverage rows |
