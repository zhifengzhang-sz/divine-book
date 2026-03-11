---
initial date: 2026-2-27
dates of modification: [2026-2-27]
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

# PvP Chain Construction

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Book set construction from effect chains, not books.** This document derives PvP builds entirely from the chain catalog ([domain.path.md](../data/domain.path.md)). The process works in effect space first, then maps results back to skill books and 灵書. If the catalog is complete, this process should converge to a qualified build without consulting any existing build.

---

## The Pipeline

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
graph LR
    A["Scenario<br/>win condition"] --> B["Functions<br/>F1, F2, ..."]
    B --> C["Chains<br/>from catalog"]
    C --> D["Affix set<br/>+ conflicts"]
    D --> E["Skill books<br/>reverse map"]
    E --> F["灵書<br/>construction"]
    F --> G["Slot<br/>assignment"]
```

| Step | Input | Output | Space |
|:-----|:------|:-------|:------|
| 1. Scenario analysis | Matchup conditions | Win condition + planning horizon | Physical |
| 2. Function decomposition | Win condition | Required functions (F1, F2, ...) | Abstract |
| 3. Chain selection | Functions + [domain.path.md](../data/domain.path.md) | Candidate chains per function | Effect |
| 4. Conflict resolution | Candidate chains + uniqueness constraint | Non-conflicting chain set | Effect |
| 5. Reverse map | Chain set → affixes → skill books | Skill book assignments | Book |
| 6. Construction | Skill books + scope rules | 灵書 (3 books each) | Physical |
| 7. Slot assignment | 灵書 set + temporal constraints | Ordered 6-slot build | Physical |

> **Scope rule.** All affixes use "本神通" (this skill) — they affect only the 灵書 they are on. Two types of chains exist:
> - **Same-灵書 chains**: amplifiers that multiply the main skill's output. These affixes MUST be on the same 灵書 as the source they amplify (e.g., `probability_multiplier`, `guaranteed_resonance`, `buff_strength`, `buff_duration`).
> - **Cross-灵書 chains**: effects that persist as states on players. These work from ANY slot — buffs remain on self, debuffs remain on enemy (e.g., `cross_slot_debuff` 命損, `debuff` 灵涸, `self_buff` 仙佑).

This distinction is critical: same-灵書 chains constrain construction (what goes together), while cross-灵書 chains constrain slot ordering (what fires when).

---

## 1. Against Stronger Opponent

### 1.1 Scenario → Win Condition

**Matchup:** opponent has higher base stats, more HP, 50%+ DR. Self HP drops faster.

**Win condition:** deal lethal total damage within ~1.2 cycles (~43s). This requires both survival (reach the kill window) and concentrated damage (break through high DR + high HP).

**Planning horizon:** $T_{horizon} \approx 43\text{s}$, $T_{gap} = 6\text{s}$, ~50% own HP lost by slot 5.

### 1.2 Win Condition → Functions

| Function | What it does | Why required |
|:---------|:-------------|:-------------|
| **F1** Burst | Maximize single-灵書 damage output | Front-loaded damage; fires twice in 1.2 cycles |
| **F2** DR removal | Bypass opponent's 50%+ DR | Without this, all damage halved or worse |
| **F3** Self-buff | +ATK/DEF/HP, long duration | Extend survival + amplify all subsequent damage |
| **F4** HP exploitation | Convert own HP loss → damage | Asymmetry exploit: losing HP faster is a resource |
| **F5** Anti-heal | Suppress opponent healing | Prevent recovery of accumulated damage |
| **F6** Survival | CC cleanse + damage reduction | Avoid stunlock death against stronger opponent |

Six functions → six 灵書. Each function maps to one or more chains in the catalog.

### 1.3 Functions → Chains (Effect Space)

#### F1 Burst → Crit multiplication

X1 (`probability_multiplier`) is a monopoly node — 【心逐神随】 on `解体化形`, no substitute. It occupies one aux slot. The question is: **what to pair with it** on the same 灵書.

Scan the [X1 pairing table](../data/domain.path.md#x1-probability_multiplier) for the highest combo:

| # | Combo (X1 + aux 2) | Combined | Condition |
|:--|:-------------------|:---------|:----------|
| 1 | 【心逐神随】 + 【灵犀九重】 | **×10.95** | None — unconditional |
| 2 | 【心逐神随】 + 【无相魔威】 | ×6.97 / **×10.37** | Anti-heal stacking on target |
| 3 | 【心逐神随】 + 【引灵摘魂】 | **×6.94** | Target has debuffs |
| 4 | 【心逐神随】 + 【天命有归】 | **×6.00** | None — deterministic |
| 5 | 【心逐神随】 + 【摧云折月】 | ×5.27 / **×4.17** | ATK zone crowded under 仙佑 |
| 6 | 【心逐神随】 + 【明王之路】 | **×5.10** | None — final zone (empty, high quality) |

**#1 dominates unconditionally.** 【灵犀九重】 is a crit source in an empty zone — fully multiplicative with X1. The gap to #2 is ×10.95 vs ×6.94 (unconditional comparison) = +58%. The combo is forced.

**F1 chain set:**
- X1: `解体化形`(【心逐神随】) — monopoly, no alternative
- O4: `any 剑修 book`(【灵犀九重】) — strongest crit, same-灵書

**F1 main book requirement:** high base damage (O1). From the catalog, `春黎剑阵` (22,305% ATK, 5 hits) + 分身 (16s, +200% damage) provides the highest burst base with forward value for other 灵書.

> **F1 灵書 α:** `春黎剑阵`(main) + `解体化形`(【心逐神随】) + `any 剑修 book`(【灵犀九重】)
> Chain: X1 + O4 + O1. Same-灵書. Expected multiplier: ×10.95 at 悟2.

#### F2 DR removal → Cross-slot debuff

Scan for DR penetration:

| Chain | Path | Effect | Source |
|:------|:-----|:-------|:-------|
| D4 `cross_slot_debuff` | −100% final DR, 8s | **Removes ALL opponent DR** | 【命損】(monopoly: `大罗幻诀` primary only) |
| X3 `ignore_damage_reduction` | Bypass DR entirely | All damage ignores DR | 【神威冲云】(monopoly: `通天剑诀` only) |

D4 is cross-灵書 (命損 persists as debuff on enemy) — it enables damage from OTHER 灵書. X3 is same-灵書 (bypasses DR for this skill only). For the "against stronger" scenario, D4 is superior: it enables the kill event (F4) on a different 灵書.

**F2 chain set:**
- D4: `大罗幻诀`(main + primary 魔魂咒界) — monopoly, no alternative
- B9 `counter_debuff`: 罗天魔咒 (30% per enemy attack) — feeds F4's true damage via debuff accumulation
- Amplifier: `天轮魔经`(【心魔惑言】) — debuff stacking ×2 (same-灵書, amplifies 大罗幻诀's debuff application)

> **F2 灵書 β:** `大罗幻诀`(main) + `天轮魔经`(【心魔惑言】) + aux 2 TBD
> Chain: D4 + B9 + debuff amplification. 命損 is cross-灵書; debuff stacking is same-灵書.

#### F3 Self-buff → Maximum duration coverage

Scan S1 (self-buff) chains for the strongest + longest buff:

| Chain # | From S1 catalog | Effect |
|:--------|:----------------|:-------|
| S1 #1 | `甲元仙符`(main: 仙佑) | Source: +70% ATK/DEF/HP, 12s |
| S1 #4 | + `浩然星灵诀`(【龙象护身】) | buff_strength +104% → +142.8% |
| S1 #5 | + `念剑诀`(【仙露护元】) | buff_duration +300% → 12s→48s |
| **S1 #7** | **Full chain** | **+142.8% ATK/DEF/HP for 48s** |

All three amplifiers are same-灵書 (they multiply 本神通's buff). The full chain requires all three books on one 灵書.

**Duration is critical.** 48s covers $t = 12\text{s}$ to $t = 60\text{s}$ — the entire planning horizon beyond the initial burst. Without 【仙露护元】, the buff lasts 12s (2 slots only). The chain catalog makes this clear: S1 #7 is the only chain that achieves full-horizon coverage.

> **F3 灵書 γ:** `甲元仙符`(main) + `浩然星灵诀`(【龙象护身】) + `念剑诀`(【仙露护元】)
> Chain: S1 #7. Same-灵書. +142.8% ATK/DEF/HP for 48s.

#### F4 HP exploitation → Self-HP conversion + true damage

The "against stronger" asymmetry: HP loss is faster. Scan for HP-loss-to-damage conversion:

| Chain | Path | Effect | Source |
|:------|:-----|:-------|:-------|
| B7 #1 | `per_self_lost_hp` | +2%/1% HP lost → +100% at 50% lost | 【怒血战意】(`玄煞灵影诀` exclusive) |
| B7 #2 | `per_self_lost_hp` (weak) | +0.5%/1% HP lost | 【战意】(universal) |
| O14 #1–5 | `per_debuff_stack_true_damage` | 2.1%maxHP/stack, max 21% | 【索心真诀】(`惊蛰化龙` exclusive) |

B7 #1 is 4× stronger than #2. O14 provides true damage (bypasses ALL defenses) — orthogonal to every other damage channel. Both are same-灵書 amplifiers.

**Critical cross-chain synergy:** F2 (大罗幻诀) accumulates debuff stacks on the enemy via counter_debuff + stacking ×2. F4's O14 (索心真诀) converts those stacks into true damage. This is a **cross-灵書 feed**: F2's debuffs persist on the enemy, then F4's 灵書 reads the stack count. The chain catalog surfaces this connection: B9 (counter_debuff) → O14 (per_debuff_stack_true_damage).

**F4 main book requirement:** high base damage with %maxHP (to maximize the ×2.0 multiplier from 【怒血战意】). From O1/O2: `千锋聚灵剑` (20,265% ATK + 27%maxHP×6 = 162%maxHP, built-in per-hit escalation +42.5%).

> **F4 灵書 δ:** `千锋聚灵剑`(main) + `玄煞灵影诀`(【怒血战意】) + `惊蛰化龙`(【索心真诀】)
> Chain: B7 #1 + O14. Same-灵書. At 50% HP lost: +100% all damage + 29.4%maxHP true damage.

**Where are the HP enablers?** The unified enabler category (§VIII in domain.path.md) lists three enablers that feed the HP exploitation chain:

| Enabler | Resource created | In this build? | Why not? |
|:--------|:----------------|:---------------|:---------|
| E2 【意坠深渊】 | HP loss floor (11%) | No | Against stronger opponent, HP loss far exceeds 11% by Slot 5 — floor is redundant |
| E4 `self_hp_cost` | Direct HP loss (−10%) | Partially — ζ's main (`十方真魄`) costs HP | But ζ fires at $t = 30\text{s}$, AFTER δ at $t = 24\text{s}$ — doesn't feed δ in cycle 1 |
| E5 【破釜沉舟】 | Accelerated HP loss (+50% dmg taken) | No | Against stronger opponent, +50% incoming damage is suicidal — the opponent already provides the resource |

**The opponent is the enabler.** In the "against stronger" scenario, the opponent's higher damage output creates the HP-loss resource for free. All three HP enablers (E2/E4/E5) are redundant — the scenario itself provides what they would create. This is why δ uses both aux slots for exploit chains (B7 + O14) rather than spending one on an enabler.

> **Scenario-dependent enabler relevance.** Against equal or weaker opponents, HP loss is slower. E4/E5 become necessary to CREATE the resource that 【怒血战意】 exploits. E2's floor guarantee becomes relevant when HP loss is uncertain. The enabler framework predicts that builds for different scenarios will differ in enabler selection, even if they share the same exploit chains.

#### F5 Anti-heal → Undispellable healing reduction

Scan D5 (anti-heal) chains:

| Source | Effect | Duration | Undispellable? |
|:-------|:-------|:---------|:---------------|
| `千锋聚灵剑`(【天哀灵涸】) | −31% healing | 8s | **Yes** |
| `甲元仙符`(【天倾灵枯】) | −31%/−51% | 20s | No |
| `无相魔劫咒`(【无相魔威】) | −40.8% + damage | 8s | No |

Against a stronger opponent with likely dispel capability: **undispellable is decisive.** 【天哀灵涸】 is a cross-灵書 effect (debuff persists on enemy).

`千锋聚灵剑` is already main in 灵書 δ. It can appear as aux elsewhere — cross-type reuse is legal (main in one slot, aux in another). As aux, it carries its exclusive affix 【天哀灵涸】.

> **F5:** `千锋聚灵剑`(【天哀灵涸】) as aux on F6's 灵書.
> Chain: D5. Cross-灵書 (debuff persists on enemy). Cross-type reuse with 灵書 δ.

#### F6 Survival → CC cleanse

Scan V4 (cleanse) and V1 (damage reduction):

| Chain | Path | Effect | Source |
|:------|:-----|:-------|:-------|
| V4 | `periodic_cleanse` | 30%/s cleanse, max 1/25s | `十方真魄`(primary 星猿弃天) — monopoly |
| V1 | `self_damage_reduction_during_cast` | +55% DR | 【金刚护体】(体修) |

CC cleanse (V4) is critical — stunlock against a stronger opponent means death. `十方真魄` as main provides cleanse + self-buff (+20% ATK/DR, 7.5s).

For aux: F5 assigns `千锋聚灵剑`(【天哀灵涸】). The remaining aux can carry a same-灵書 amplifier for `十方真魄`'s 10 hits:

| Chain | Amplifier | Effect on 10 hits |
|:------|:----------|:------------------|
| A8 `per_hit_escalation` | 【心火淬锋】(剑修) | +5%/hit, max 50%, avg +22.5% |
| A2 `damage_increase` | 【意坠深渊】(体修) | +50% flat (at low HP) |

Both are viable. 【心火淬锋】 is in its own multiplier zone ($C_5$), compounding with other sources. `通天剑诀` carries this affix and is otherwise unassigned.

> **F6 灵書 ζ:** `十方真魄`(main) + `通天剑诀`(【心火淬锋】) + `千锋聚灵剑`(【天哀灵涸】)
> Chain: V4 + A8 + D5. Same-灵書 (per-hit) + cross-灵書 (anti-heal).

### 1.4 Conflict Resolution

Check uniqueness across all 6 灵書:

| 灵書 | Main | Aux 1 | Aux 2 |
|:-----|:-----|:------|:------|
| α (Burst) | `春黎剑阵` | `解体化形` | `any 剑修 book` |
| β (DR removal) | `大罗幻诀` | `天轮魔经` | TBD |
| γ (Self-buff) | `甲元仙符` | `浩然星灵诀` | `念剑诀` |
| δ (HP exploit) | `千锋聚灵剑` | `玄煞灵影诀` | `惊蛰化龙` |
| ε (?) | — | — | — |
| ζ (Survival) | `十方真魄` | `通天剑诀` | `千锋聚灵剑` |

**Problem:** 5 灵書 constructed, but only 5 functions assigned. We have 6 slots, so we need one more 灵書.

**The missing 灵書.** F1–F6 produce 5 灵書 + F5 folded into F6 as aux. The 6th 灵書 needs a function. What does the scenario need that isn't yet covered?

Scan the catalog for high-value unassigned chains:

| Candidate | Chain | What it adds |
|:----------|:------|:-------------|
| `皓月剑诀`(main) | O2 + O5 | 10-hit %maxHP + DoT (exploit-type damage) |
| `念剑诀`(main) | V2 + A9 | Untargetable + periodic escalation |
| `无相魔劫咒`(main) | O7 + A6 | Delayed burst + anti-heal damage |

**Answer: Exploit.** A second high-damage 灵書 increases total output. `皓月剑诀` has the strongest exploit structure: 10 hits, 22,305% ATK, +12%maxHP/hit, shield-destroy DoT. Fired after α (burst), it benefits from α's 分身 (+200% damage, 16s).

Aux candidates for 灵書 ε:
- `春黎剑阵`(【玄心剑魄】) — O5: DoT 550%/tick + on_dispel 3300%. Cross-type reuse with α (legal).
- `无极御剑诀`(【无极剑阵】) — A3: +555% skill damage. Same-灵書 amplifier.

> **灵書 ε (Exploit):** `皓月剑诀`(main) + `春黎剑阵`(【玄心剑魄】) + `无极御剑诀`(【无极剑阵】)
> Chain: O2 + O5 + A3. 10-hit %HP + DoT trap + skill damage amplification.

**β aux 2 resolution.** 灵書 β still needs a 3rd book. Remaining high-value options:

| Candidate | Chain | Effect |
|:----------|:------|:-------|
| `皓月剑诀`(【追神真诀】) | O5 #7 + A7 | dot_extra +26.5%; at enlightenment=10: +300% damage |
| `any skill book`(【业焰】) | X2 | 命損 8s→13.5s (covers 2 slots) |
| `周天星元`(【奇能诡道】) | B9 #4 | +20% extra debuff stack chance |

【追神真诀】 at max enlightenment provides +300% total damage to 大罗幻诀's output — an enormous same-灵書 amplifier. Cross-type reuse with ε (legal). The dot_extra component amplifies any DoT on this skill.

> **灵書 β (final):** `大罗幻诀`(main) + `天轮魔经`(【心魔惑言】) + `皓月剑诀`(【追神真诀】)

**Uniqueness check:**

| Skill book | Appears as | 灵書 | Conflict? |
|:-----------|:----------|:-----|:----------|
| `春黎剑阵` | Main (α), Aux (ε) | α, ε | Cross-type ✓ |
| `皓月剑诀` | Main (ε), Aux (β) | ε, β | Cross-type ✓ |
| `千锋聚灵剑` | Main (δ), Aux (ζ) | δ, ζ | Cross-type ✓ |
| `解体化形` | Aux (α) | α | ✓ |
| `天轮魔经` | Aux (β) | β | ✓ |
| `浩然星灵诀` | Aux (γ) | γ | ✓ |
| `念剑诀` | Aux (γ) | γ | ✓ |
| `甲元仙符` | Main (γ) | γ | ✓ |
| `大罗幻诀` | Main (β) | β | ✓ |
| `玄煞灵影诀` | Aux (δ) | δ | ✓ |
| `惊蛰化龙` | Aux (δ) | δ | ✓ |
| `十方真魄` | Main (ζ) | ζ | ✓ |
| `通天剑诀` | Aux (ζ) | ζ | ✓ |
| `无极御剑诀` | Aux (ε) | ε | ✓ |
| `any 剑修 book` | Aux (α) | α | Pending — see below |

**Affix uniqueness:** each affix appears on exactly one 灵書. No affix duplication. ✓

**α's 剑修 book.** 【灵犀九重】 requires a Sword school book as carrier. Available 剑修 books not yet assigned: `新-青元剑诀`, `无極御剑诀` (already on ε). So α's aux 2 = `新-青元剑诀`(【灵犀九重】). This book's exclusive affix (【天威煌煌】) is not selected — only the school affix 【灵犀九重】 is used.

**15 distinct skill books used.** All core conflicts and secondary conflicts resolved. ✓

### 1.5 Complete 灵書 Set

| 灵書 | Function | Main | Aux 1 | Aux 2 | Chains |
|:-----|:---------|:-----|:------|:------|:-------|
| α | Burst | `春黎剑阵` | `解体化形`(【心逐神随】) | `新-青元剑诀`(【灵犀九重】) | X1 + O4 |
| β | DR removal | `大罗幻诀` | `天轮魔经`(【心魔惑言】) | `皓月剑诀`(【追神真诀】) | D4 + B9 + A7 |
| γ | Self-buff | `甲元仙符` | `浩然星灵诀`(【龙象护身】) | `念剑诀`(【仙露护元】) | S1 #7 |
| δ | HP exploit | `千锋聚灵剑` | `玄煞灵影诀`(【怒血战意】) | `惊蛰化龙`(【索心真诀】) | B7 + O14 |
| ε | Exploit | `皓月剑诀` | `春黎剑阵`(【玄心剑魄】) | `无极御剑诀`(【无极剑阵】) | O2 + O5 + A3 |
| ζ | Survival | `十方真魄` | `通天剑诀`(【心火淬锋】) | `千锋聚灵剑`(【天哀灵涸】) | V4 + A8 + D5 |

### 1.6 Slot Assignment (Temporal Optimization)

Construction produces 6 灵書. Slot assignment is a temporal optimization: which order maximizes total output over the planning horizon?

**Constraints from chain types:**

| Effect | Type | Temporal constraint |
|:-------|:-----|:-------------------|
| 分身 (α) | Cross-灵書 state | 16s duration → covers next 2 灵書 if α fires early |
| 仙佑 +142.8% (γ) | Cross-灵書 state | 48s duration → covers everything after γ |
| 命損 −100% DR (β) | Cross-灵書 state | 8s duration → covers ~1 灵書 after β |
| 天哀灵涸 −31% (ζ) | Cross-灵書 state | 8s duration → covers endgame |
| Counter debuffs (β) | Cross-灵書 state | Accumulate over β's 8s → δ reads the stacks |

**Ordering derivation:**

1. **α (Burst) → Slot 1.** Highest damage skill fires first → gets earliest cycle 2 re-cast ($t = 36\text{s}$). 分身 covers slots 2–3.

2. **ε (Exploit) → Slot 2.** Second highest damage. Benefits from α's 分身 (+200%, 16s covers $t = 0$–$16\text{s}$).

3. **γ (Self-buff) → Slot 3.** Fires at $t = 12\text{s}$. Buff covers $t = 12$–$60\text{s}$ → slots 4–6 and all of cycle 2 (including α re-cast at $t = 36\text{s}$ with +142.8% ATK).

4. **β (DR removal) → Slot 4.** 命損 (8s) must immediately precede δ. Fires at $t = 18\text{s}$ → covers slot 5 with ~2s overlap.

5. **δ (HP exploit) → Slot 5.** Fires at $t = 24\text{s}$. By now, ~50% own HP lost → 【怒血战意】 +100%. Under 命損 (−100% DR) + 仙佑 (+142.8% ATK). Counter debuffs from β have accumulated → 【索心真诀】 reads stacks.

6. **ζ (Survival) → Slot 6.** Endgame: CC cleanse + anti-heal. Fires at $t = 30\text{s}$.

### 1.7 Result

| Slot | 灵書 | Specification | Chains |
|:-----|:-----|:-------------|:-------|
| 1 | α | `春黎剑阵`(main) + `解体化形`(【心逐神随】) + `新-青元剑诀`(【灵犀九重】) | X1 + O4 |
| 2 | ε | `皓月剑诀`(main) + `春黎剑阵`(【玄心剑魄】) + `无极御剑诀`(【无极剑阵】) | O2 + O5 + A3 |
| 3 | γ | `甲元仙符`(main) + `浩然星灵诀`(【龙象护身】) + `念剑诀`(【仙露护元】) | S1 #7 |
| 4 | β | `大罗幻诀`(main) + `天轮魔经`(【心魔惑言】) + `皓月剑诀`(【追神真诀】) | D4 + B9 + A7 |
| 5 | δ | `千锋聚灵剑`(main) + `玄煞灵影诀`(【怒血战意】) + `惊蛰化龙`(【索心真诀】) | B7 + O14 |
| 6 | ζ | `十方真魄`(main) + `通天剑诀`(【心火淬锋】) + `千锋聚灵剑`(【天哀灵涸】) | V4 + A8 + D5 |

**Cross-灵書 temporal map:**

| Effect | Source | Fires at | Duration | Covers |
|:-------|:-------|:---------|:---------|:-------|
| 分身 +200% | Slot 1 (α) | $t = 0\text{s}$ | 16s | Slots 2–3 |
| 噬心 DoT + dispel trap | Slot 2 (ε) | $t = 6\text{s}$ | 8s | Slot 3 |
| 仙佑 +142.8% ATK/DEF/HP | Slot 3 (γ) | $t = 12\text{s}$ | **48s** | **Slots 4–6, cycle 2 all** |
| 命損 −100% DR | Slot 4 (β) | $t = 18\text{s}$ | 8s | Slot 5 (~2s) |
| Counter debuffs | Slot 4 (β) | $t = 18\text{s}$ | 8s | Stacks read by Slot 5 |
| 天哀灵涸 −31% healing | Slot 6 (ζ) | $t = 30\text{s}$ | 8s | Endgame |
| α re-cast (buffed) | Slot 1 | $t = 36\text{s}$ | — | Under +142.8% ATK |
| γ re-cast (refreshes buff) | Slot 3 | $t = 48\text{s}$ | 48s | Buff indefinite |

### 1.8 Convergence

This build matches [pvp.md §1](./pvp.md#11-result) exactly — same 6 灵書, same slot ordering, same 15 skill books. The chain-first approach converges to the same result as the book-first approach.

Why convergence? The "against stronger" scenario's constraints are tight:
- F1 is forced by the X1 monopoly (【心逐神随】 is the only `probability_multiplier`)
- F2 is forced by the D4 monopoly (命損 is the only −100% DR)
- F3 is forced by S1 #7 being the only 48s buff chain
- F4's B7 #1 is 4× stronger than the alternative (【怒血战意】 vs 【战意】)
- F5's undispellable property uniquely belongs to 【天哀灵涸】
- F6's cleanse uniquely belongs to `十方真魄`

When monopoly nodes dominate, there is essentially one path through the graph. The chain-first approach makes this structural inevitability visible.

### 1.9 What the Chain Approach Reveals

The book-first approach (pvp.md) required 6 × 3 = 18 candidate evaluations, each comparing 5–9 options. The chain-first approach required:

1. **6 function scans** of the catalog → identified 6 chain sets
2. **1 conflict resolution pass** → uniqueness check
3. **1 reverse map** → skill books
4. **1 temporal optimization** → slot ordering

More importantly, the chain-first approach exposes **why** this build is the way it is:

| Structural feature | Chain explanation |
|:-------------------|:-----------------|
| 解体化形 on burst | X1 is a monopoly node → forced |
| 大罗幻诀 on suppress, not burst | D4 is cross-灵書 (debuff persists); X1 is same-灵書 → D4 doesn't need to be on the damage 灵書 |
| 甲元仙符 + 浩然星灵诀 + 念剑诀 together | S1 #7's three amplifiers are all same-灵書 → forced co-location |
| 千锋聚灵剑 as F4 main, not F1 | B7's multiplier (×2.0 at 50% HP) requires high base → %maxHP structure matches; at Slot 1 timing, no HP lost yet → B7 has zero value |
| 命損 immediately before HP exploit | D4 is cross-灵書 with 8s duration → covers exactly 1 subsequent slot |
| Burst in Slot 1 | Cycle 2 re-cast at $t = 36\text{s}$ under 仙佑 (+142.8%) — cross-灵書 state enables temporal stacking |

The chain approach also shows where **flexibility** exists: β's aux 2 (【追神真诀】 vs 【业焰】 vs 【奇能诡道】) is the only soft decision — all others are forced by monopoly nodes or extreme dominance.

**Zero enablers selected.** The build uses no enablers from §VIII (E1–E5). This is not an oversight — it's structural:
- E1 (【天命有归】): 【灵犀九重】 dominates it in the X1 pairing table at 悟2
- E2 (【意坠深渊】): HP loss floor redundant — opponent provides HP loss beyond 11%
- E3 (【天人合一】): build assumes max enlightenment — no tier to unlock
- E4/E5 (`self_hp_cost` / 【破釜沉舟】): opponent provides the HP-loss resource for free

Enablers are redundant when the scenario or the investment level already provides the resource they create. This is the enabler framework's prediction: **enablers become relevant in scenarios where the resource is scarce** (low enlightenment, equal opponent, uncertain HP loss).

---

## 2. Toward Other Scenarios

The pipeline is scenario-agnostic. Different matchup conditions produce different functions, which select different chains:

| Scenario | Changed function | Chain shift | Enabler shift |
|:---------|:----------------|:------------|:-------------|
| **Initial immunity** | F2 fires before damage slots are useful → F3 moves earlier, F1 moves later | Slot ordering changes; 灵書 set may remain the same | Same — enablers still redundant |
| **Mutual immunity (equal power)** | F4 (HP exploitation) needs enablers — HP loss is slower | B7 still core but needs E4/E5 to create the resource | **E4/E5 enter the build** — self-HP-cost and accelerated loss become necessary |
| **Against weaker** | F2 (DR removal) less critical | D4 may yield slot to additional damage or buff stacking | Same or E4/E5 for HP exploitation |
| **Low enlightenment** | F1 loses ×10.95 (悟2); 【灵犀九重】 drops to $E = 6.21$ at 悟0 | E1 (【天命有归】) becomes competitive at ×6.00 deterministic vs ×6.21 stochastic | **E1/E3 enter the build** — certainty and enlightenment become valuable |

Each scenario re-enters the pipeline at Step 1, producing a potentially different chain set and therefore different 灵書 construction.

> **Open question.** Do scenarios with weaker constraints (e.g., mutual immunity where F4 is optional) produce multiple viable builds, or does the graph still converge to one? The presence of monopoly nodes suggests convergence, but the freed-up affix slots might create genuinely different alternatives. This requires running the pipeline for each scenario.

> **Enabler prediction.** The unified enabler category (E1–E5) predicts which scenarios produce different builds. When the scenario provides a resource for free (HP loss from stronger opponent, max enlightenment), the corresponding enabler is redundant and the aux slot goes to a source or amplifier instead. When the resource is scarce, the enabler enters the build and displaces a weaker source/amplifier. The enablers are the **variable** part of the build; monopoly-forced chains are the **fixed** part.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-27 | Initial: pipeline definition + Scenario 1 (Against Stronger Opponent) chain construction |
| 1.1 | 2026-02-27 | F1 section: replaced individual affix comparison with combo evaluation from X1 pairing table |
| 1.2 | 2026-02-27 | Enabler analysis: F4 explains why E2/E4/E5 are absent (opponent provides resource). Zero-enabler finding in §1.9. Enabler prediction in §2 scenario table. |
