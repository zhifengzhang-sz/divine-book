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

# General Combat Theory

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Scope**: This document contains combat theory that is *independent* of the specific Divine Book release mechanism. It survives any future system redesign — whether the release model is fixed-sequential, priority-queue, or manual. All references use temporal-position language (e.g., "the culmination-phase release") rather than fixed slot numbers.

---

## Table of Contents

| Section | Content |
|---------|---------|
| **1. General Combat Model** | SDE formulation, exit problem, combat levers, affix classification, zone scarcity, orthogonal drift, temporal granularity |
| **2. Affix Design Rationale** | Design adequacy principle, anti-healing rationale, stochastic multiplier design, budget allocation |
| **3. Scenario-Specific Optimization** | Solo PvE/PvP, Team PvE/PvP, scenario-lever matrix |
| **4. General Affix Value Assessment** | Utility function V(a,t) generalized to temporal position |
| **5. Reinforcement Learning Perspective** | MDP formulation, theory as inductive bias |
| **Appendix B** | Correspondence to observed game mechanics (凡人修仙传) |

---

## 1. General Combat Model

The central challenge in Divine Book optimization is selection: with dozens of generic, cultivation-path, and specialized affixes available across dozens of skill books, how does one determine which combination maximizes combat effectiveness? Before we can compare individual affixes or evaluate configurations, we need a common framework that reduces all combat interactions to a shared language.

We formulate combat as a **stochastic dynamical system with absorbing barriers** — a class of problems with deep roots in probability theory. The classical analogue is the *gambler's ruin*: two players with finite resources engage in repeated exchanges, and the game ends when either player's resources reach zero (Feller, 1968). In our setting, the "resources" are hit points, the "exchanges" are skill casts, and the absorbing barrier at zero HP determines victory or defeat. This formulation connects combat optimization to the well-studied theory of **first exit times** for stochastic processes (Redner, 2001), where the central question is: given the dynamics of the system, what is the probability that the process exits through one boundary rather than another, and how can the drift be configured to favor a particular exit?

The Lanchester attrition model (Lanchester, 1916) provides the deterministic backbone of our dynamics — opposing forces deplete each other at rates proportional to their combat attributes. The DPS/HPS/DTPS decomposition familiar from MMO theorycrafting (World of Warcraft, Final Fantasy XIV) is a discrete-time specialization of this same framework. Our contribution is to layer stochasticity on top — accounting for probability-based triggers, random affix rolls, and conditional effects — and to reformulate the optimization objective not as "maximize DPS" but as **maximize the probability of favorable exit**.

### 1.1 State Space and Dynamics

Consider a combat engagement between two players, A and B. The state of the system at time $t$ is fully described by the pair $(HP_A(t), HP_B(t))$, which evolves in the domain $\Omega = (0, \infty)^2$. The boundary $\partial\Omega = \{HP_A = 0\} \cup \{HP_B = 0\}$ is absorbing: once either player's HP reaches zero, the engagement terminates.

The dynamics are governed by a pair of coupled stochastic differential equations:

$$dHP_A = \mu_A(t)\,dt + \sigma_A(t)\,dW_A$$
$$dHP_B = \mu_B(t)\,dt + \sigma_B(t)\,dW_B$$

where the drift terms $\mu$ capture the expected HP flow and the diffusion terms $\sigma$ capture the stochasticity inherent in combat mechanics. Expanding the drift for player A:

$$\mu_A(t) = -D_B(t) \cdot (1 - DR_A) + H_A(t) + S_A(t)$$

Each term maps to a distinct combat mechanic:

- $D_B(t) \cdot (1 - DR_A)$ is the net incoming damage. $D_B(t)$ is player B's raw damage output, which varies over time as skills are released. $DR_A$ is A's damage reduction rate. Unlike classical Lanchester models where attrition rates are constant, $D_B(t)$ is piecewise — it spikes during skill casts and drops to baseline between them.

- $H_A(t) = H_{base,A} \times (1 - H_{reduction})$ is the effective healing rate. The inclusion of a healing term distinguishes our model from pure-attrition Lanchester dynamics. Its presence reflects a fundamental design choice: combatants can recover HP during battle, which makes sustained engagements possible and the anti-healing parameter $H_{reduction}$ strategically meaningful (see §2.2).

- $S_A(t)$ is the rate of shield absorption, generated by the spirit attribute. Shields introduce piecewise behavior: while a shield holds, effective damage to HP is zero; once depleted, all damage flows through.

The diffusion terms $\sigma_A(t), \sigma_B(t)$ arise from probabilistic mechanics in the game. For instance, a stochastic multiplier affix that triggers at $\times 4$ with probability 0.11, $\times 3$ with probability 0.31, and $\times 2$ with probability 0.51 creates variance in per-skill damage output. These stochastic elements are not noise to be averaged away; they are structural features of the combat system that any rigorous model must account for.

### 1.2 The Exit Problem

With the state space and dynamics defined, we can now state the combat outcome in precise terms. Define the **first exit time**:

$$\tau = \inf\{t > 0 : (HP_A(t), HP_B(t)) \notin \Omega\}$$

This is the first moment at which either player's HP reaches zero. The combat outcome is then determined by *which* boundary the process exits through:

$$\text{Player A wins} \iff HP_B(\tau) \leq 0 \quad \text{and} \quad HP_A(\tau) > 0$$

The optimization problem for Divine Book configuration is therefore:

$$\max_{\theta \in \Theta} \; P_\theta(HP_B(\tau) \leq 0)$$

where $\theta$ represents the affix configuration (the choice of 6 divine books, each composed of 3 skill books with specific assignments), and $\Theta$ is the feasible set defined by conflict constraints. In words: **choose the configuration that maximizes the probability that the opponent's HP exits first.**

This formulation has several advantages over the naive "maximize total DPS" objective. First, it naturally accounts for the trade-off between offense and defense — a configuration that deals enormous damage but leaves the player vulnerable to being killed first is correctly penalized. Second, it captures the value of anti-healing and crowd control, which do not increase one's own DPS but tilt the exit probability by slowing the opponent's recovery or creating windows of zero incoming damage. Third, it provides a unified framework for evaluating configurations across different scenarios (PvE, PvP, solo, team), since the same exit-probability objective applies in each case — only the dynamics change.

The connection to the gambler's ruin is instructive. In the symmetric random walk on $\{0, 1, \ldots, N\}$ with absorbing barriers at 0 and $N$, the probability of reaching $N$ before 0 starting from position $k$ is exactly $k/N$. When a drift bias $p > 1/2$ is introduced, this probability increases exponentially. In our setting, affixes function as **drift modifiers**: each affix shifts the expected HP flow in favor of one player, and the cumulative effect of a well-chosen configuration is analogous to introducing a favorable bias in the random walk.

### 1.3 Combat Attributes as Model Parameters

The four **combat attributes** — formally defined as Layer 2 (Combat) attributes in `attributes.md` §6.4 — each map to a specific parameter or initial condition in the dynamical system. This mapping is formalized as Definition 6.7.1 (Attribute-SDE Mapping) in the attribute system model:

| Combat Attribute | SDE Parameter | Role in Dynamics | Attribute Pipeline Source |
|-----------|--------------|-------------------|--------------------------|
| HP (气血) | $HP(0)$ | Initial condition — distance to absorbing barrier | Base attributes (体魄) → Convert (Def 2.5.1) → HP |
| Attack (攻击) | $D_{enemy}$ | Opponent's drift coefficient toward $HP=0$ | Base attributes (气劲, 剑意, 法相, 魔息, 体罡) → Convert → ATK |
| Spirit (灵力) | $S$ | Shield absorption rate — temporarily halts drift | Direct combat attribute |
| Defense (守御) | $DR$ | Damage reduction — scales down drift magnitude | Base attributes (筋骨) → Convert → DEF |

Each combat attribute arrives at its final value through the **operator composition pipeline** (`attributes.md`, Def 3.2.1):

$$
A_{\text{final}} = (A_{\text{base}} + \sum \Delta_a) \times (1 + \sum \Delta_r) \times \prod M
$$

where $\Delta_a$, $\Delta_r$, and $M$ are aggregated Delta.Absolute, Delta.Relative, and Multiplier operators (respectively) from the **Operator Ledger** (`attributes.md`, Def 4.2.1) — the single source of truth tracking every active operator instance and its provenance. Divine Book affixes are one of many sources that contribute to this ledger; equipment, Spirit Beasts, and cultivation bonuses contribute others.

An important asymmetry is visible in this mapping. Attack is the only attribute that influences the *opponent's* dynamics, while the other three — HP, Spirit, and Defense — affect only one's *own* trajectory. In the language of the exit problem, Attack pushes the opponent toward their absorbing barrier, while the defensive attributes pull oneself away from one's own barrier. The game's affix catalog reflects this asymmetry: there are far more affixes that amplify $D_{enemy}$ than affixes that improve survivability, because the design space for "ways to push the opponent toward zero" is richer than "ways to pull yourself away from zero."

### 1.4 Combat Levers and Controllability

From the dynamical system, we identify five **combat levers** — parameters that affix selection can modulate to influence the exit probability. The concept of controllability here follows the control-theoretic sense: a lever is highly controllable if many independent affix choices can modulate it, and moderately controllable if only a few specific affixes or external conditions affect it.

| Lever | Model Term | Effect on Exit Probability | Affix Controllability |
|-------|-----------|---------------------------|----------------------|
| Damage output (DPS) | $D_{enemy}$ | Increases opponent's drift toward $HP=0$ | **High** — the majority of affixes enhance this |
| Healing (HPS) | $H_{base}$ | Reduces own drift toward $HP=0$ | Moderate — limited affixes |
| Anti-healing | $H_{reduction}$ | Increases opponent's drift toward $HP=0$ (indirectly) | **High** — dedicated affixes |
| Damage reduction (DR) | $1 - DR$ | Reduces own drift toward $HP=0$ | Moderate |
| Crowd control (CC) | Sets $D_{enemy} = 0$ temporarily | Creates windows where own drift is purely positive | Moderate — enables conditional affixes |

The controllability distinction is operationally significant for optimization. Levers with high controllability offer a larger search space — more affix choices mean more potential for discovering superior configurations. Levers with moderate controllability are bottlenecked by skill design or cultivation-path selection; their optimization is more about satisfying constraints than exploring alternatives.

### 1.5 The Affix Classification Principle

With the dynamical system and exit problem established, we can now state the principle that underlies all subsequent analysis:

**Every affix in the game acts on one or more parameters of the HP flow dynamics, and therefore influences the exit probability.** This is not a simplifying assumption but a logical consequence of the formulation. Since the only thing that determines victory or defeat is which HP process hits zero first, any game mechanic that does not eventually influence this race is, by definition, irrelevant to the outcome. Conversely, any mechanic that matters must do so by modifying the drift $\mu$, the diffusion $\sigma$, or the initial conditions $HP(0)$ of one or both players.

This principle allows us to classify affixes into three categories by their primary effect on the dynamics. Each category maps to a subset of the formal **OperatorKinds** defined in `attributes.md` (Def 3.1.2):

**Category I — Drift amplifiers (offensive).** These affixes increase the magnitude of the opponent's negative drift, pushing $HP_{enemy}$ toward the absorbing barrier faster. In the formal attribute model, they are primarily **Multiplier operators**, often with **conditional wrappers** (`condition != bottom`), targeting the Attack attribute or its derivatives. This is the largest category, reflecting the game's emphasis on damage diversity. It includes direct multipliers, DoT enhancers that increase the *frequency* of negative drift, %HP-based damage that scales with proximity to the barrier, penetration effects that reduce the opponent's $DR$, and conditional burst that creates high-variance spikes.

**Category II — Drift reducers (defensive).** These affixes reduce one's own negative drift, pulling $HP_{self}$ away from the absorbing barrier. In the formal model, they are **Delta operators** (Absolute and Relative) targeting HP, Defense, or Shield attributes. A smaller but essential category for sustained engagements: lifesteal, heal-on-damage, shield mechanics, and direct damage reduction.

**Category III — Drift modifiers (amplifiers and enablers).** These affixes do not directly change drift values but alter the coefficients that other affixes contribute. In the formal model, they are **Multiplier operators** targeting *other operators' magnitudes* rather than base attributes — operating at a meta-level within the operator composition pipeline. Anti-healing reduces the positive $H$ term in the opponent's equation. Buff amplifiers scale the magnitude of Category I operators. Debuff manipulators create the state conditions that trigger other affixes' conditional operators.

This three-way classification has a direct temporal implication. Category III affixes (drift modifiers) are *multiplicative* — they scale the output of everything that follows them in the release sequence. A buff that doubles damage output is worthless if released after all damage skills have already fired, but it doubles the drift contribution of every subsequent skill. This temporal dependency is the core insight behind the phase role model (`book.theory.md`, §2) and is formally proved as the Buff Temporal Precedence theorem (`book.theory.md`, §3).

### 1.6 Multiplicative Zone Scarcity (Diminishing Marginal Returns)

The drift term $D_{enemy}$ in §1.1 is not a single multiplier — it is a product of independent **multiplicative zones**, each amplifying the result of the one before it. When multiple affixes contribute to the *same* zone, the marginal return of each additional contribution diminishes:

$$\frac{1 + (x + \delta)}{1 + x} \to 1 \quad \text{as } x \to \infty$$

But adding $\delta$ to an *empty* zone yields the full marginal return $1 + \delta$. The same face-value bonus produces vastly different actual gains depending on zone crowding. For example, a +50% bonus in a zone already at +200% yields $3.50/3.00 = 1.167\times$, while the same +50% in an empty zone yields $1.50\times$.

**Abstract principle:** Scarce multiplicative parameters have higher marginal value than crowded ones. This has direct consequences for the Design Budget Allocation (§2.4) — the budget should ensure each zone has at least some affixes, but over-allocating to one zone wastes design space. An optimal catalog distributes affix effects across independent zones rather than concentrating them in a single zone with diminishing returns.

### 1.7 Orthogonal Drift Sources

The drift $\mu_B(t)$ decomposes into two families:

1. **Formula-mediated drift** — damage that passes through the multiplicative zone chain (§1.6): $D_{base} \times \prod_i (1 + M_i)$. All zone-based amplification operates on this channel.

2. **Orthogonal drift** — damage that bypasses the multiplicative formula entirely. These channels are *additive* to the formula-mediated damage and independent of the attacker's ATK parameter:
   - **%maxHP damage**: a flat percentage of the target's maximum HP per hit — scales with the target's health pool, not the attacker's stats
   - **Lost-HP scaling**: damage that grows as the target (or attacker) loses HP — an execution mechanic that accelerates kills near the absorbing barrier
   - **DoT (Damage over Time)**: continuous damage on its own timeline, independent of skill cast events

Orthogonal sources are valuable precisely because they are independent of the attacker's ATK parameter. Against high-defense targets that suppress formula-mediated drift, orthogonal channels maintain their full contribution. **Abstract principle:** the existence of orthogonal drift sources means that the Design Adequacy Principle (§2.1) must cover *both* formula-mediated and orthogonal channels. A catalog that provides only formula-mediated amplifiers leaves the orthogonal channels uncontrollable, forfeiting an entire axis of strategic optimization — particularly valuable against well-defended opponents.

### 1.8 Temporal Granularity of the Drift Function

The drift $D_B(t)$ is not smooth — it is a sum of discrete per-hit damage events. A skill with $n$ hits over duration $T$ generates $n$ discrete drift impulses, each of which passes through the multiplicative zone chain independently and can be modified by per-hit effects (escalation, %maxHP per hit, per-hit triggers).

The temporal granularity — hits per unit time — is a controllable parameter that interacts multiplicatively with per-hit effect magnitudes. A skill with 10 hits and a per-hit %maxHP effect generates twice the total %maxHP damage of a 5-hit skill with the same per-hit rate, even if their base damage coefficients are identical.

**Abstract principle:** hit count creates a design space orthogonal to per-hit damage amount. It determines (a) how many times per-hit effects fire, (b) the cast duration, which constrains how long buffs/debuffs must last to provide full coverage, and (c) whether escalation mechanics (effects that grow with each successive hit) have sufficient hits to ramp up. The affix catalog should include effects that reward high hit counts (escalation, per-hit triggers) alongside effects that reward high per-hit damage (burst multipliers), giving players a meaningful choice between temporal granularity strategies.

---

## 2. Affix Design Rationale: From Model to Catalog

§1 established the dynamical system and identified five combat levers. This section works in the opposite direction: given the model, we derive *what kinds of affixes the system needs* and *how design effort should be distributed* across them. The combat model is not merely a descriptive framework — it is a **prescriptive tool** that constrains which affixes are worth creating and how they should be balanced.

The reasoning follows a design adequacy principle: for each combat lever identified in §1.4, the affix catalog must contain at least one affix family that modulates it. If a lever has no corresponding affixes, it is uncontrollable by the player and therefore cannot contribute to strategic depth. Conversely, the *number* of affixes allocated to each lever should reflect its strategic importance — measured by the marginal effect on exit probability across scenarios.

### 2.1 The Design Adequacy Principle

The core design rule:

> For every combat lever with non-trivial effect on the exit probability, the affix catalog must provide at least one affix family that modulates it. The number and diversity of affixes allocated to a lever should be proportional to its controllability target (§1.4).

The contrapositive serves as a design constraint: if we choose *not* to create affixes for a parameter, we are declaring that parameter non-controllable — the player has no agency over it, and it serves as a fixed environmental factor rather than a strategic lever.

### 2.2 Anti-Healing: Why the Healing Lever Requires Dedicated Affixes

The healing term $H$ in the combat model (§1.1) creates a restoring force that pulls $HP$ away from the absorbing barrier. Without player-controllable suppression of $H$, PvP engagements against healing-heavy opponents can become unwinnable — the opponent's positive drift exceeds the player's damage output regardless of configuration.

This analysis motivates three specific design choices for anti-heal affixes:

First, **dedicated anti-heal affixes must exist**. Without them, the $H_{reduction}$ lever is uncontrollable, and the healing parameter becomes a binary win condition: either the player out-damages healing or they don't, with no configuration choice affecting the outcome.

Second, **at least one anti-heal affix should be undispellable**. Because dispel mechanics exist as a general-purpose counter to debuffs, a dispellable-only anti-heal can be negated by a single dispel, reducing the lever's reliability to near-zero. An undispellable variant ensures the lever remains available even against dispel-equipped opponents.

Third, **conditional intensification near the absorbing barrier** adds strategic depth. The healing rate $H$ has disproportionate impact when $HP$ is close to the exit boundary — a small healing tick that is irrelevant at full HP can prevent lethal damage at low HP. An anti-heal affix that intensifies at low target HP (e.g., healing reduction increasing from 31% to 51% below 30% HP) precisely targets this high-impact regime.

### 2.3 Stochastic Multipliers: Designing the Variance-Drift Tradeoff

The combat model's diffusion term $\sigma$ (§1.1) captures damage variance. A well-designed affix catalog should provide tools to *control* this variance — allowing players to choose between high-variance (gambling on spike damage) and high-drift (consistent output) strategies.

This motivates the **stochastic multiplier** affix pattern: an affix whose damage amplification is drawn from a discrete random variable. A canonical design:

| Outcome $x$ | ×4 | ×3 | ×2 | ×1 |
|---|---|---|---|---|
| $P(X = x)$ | 0.11 | 0.31 | 0.51 | 0.07 |

$$E[X] = 0.11 \times 4 + 0.31 \times 3 + 0.51 \times 2 + 0.07 \times 1 = 2.46$$

The right-skewed distribution is intentional: it creates an expected multiplier of ×2.46 while preserving a thin tail at ×4.00 that rewards repeated attempts in long engagements (PvE) and creates dramatic moments in short engagements (PvP).

The complementary **deterministic-trigger** affix ("all probability-based triggers are guaranteed to activate, +50% damage") converts variance into pure drift: the stochastic ×2.46 collapses to a deterministic ×4.00, yielding a combined $4.00 \times 1.50 = 6.00$. This affix pair implements the variance-drift tradeoff as a *player choice*: use the stochastic multiplier alone (high-variance, moderate expected value) or invest in the combination (high-drift, zero variance, but occupying two affix slots).

In the language of the dynamical system, the stochastic multiplier operates on $\sigma$ (increasing variance), while the deterministic trigger converts that $\sigma$ contribution into $\mu$ (pure drift). This is the canonical example of how affix pairs can reshape the dynamics from a gambler's strategy to a systematic advantage.

### 2.4 Design Budget Allocation

The combat levers (§1.4) have different controllability requirements, which prescribes how design effort should be distributed across the affix catalog:

| Effect Category | Design Budget | Model Parameter | Rationale |
|----------------|:---:|-----------------|--------------------|
| Damage amplification / burst | Highest | $D_{enemy}$ drift | Core lever; highest controllability target; most player-facing differentiation |
| Buff amplification | High | Category III coefficients | Universal value across all scenarios; enables multiplicative scaling |
| DoT / sustained damage | High | $D_{enemy}$ drift (sustained) | Essential for PvE; provides alternative to burst-only damage profile |
| Sustain / survival | High | $H$, $S$, $DR$ | Required for solo viability; absent in team settings (handled by healers) |
| Anti-healing | Medium | $H_{reduction}$ | Critical in PvP but irrelevant in PvE; fewer affixes needed but each must be impactful |
| Debuff manipulation | Medium | Category III enablers | Enables team synergy; moderate diversity needed |
| CC exploitation | Low | Conditional drift spike | Narrow trigger window; one high-impact affix sufficient (e.g., ×2.00 on CC'd targets) |

This budget reflects the model's structure: the DPS lever ($D_{enemy}$) receives the most design attention because it has the highest controllability target and the broadest applicability across scenarios. The anti-healing lever receives fewer but more impactful affixes because it is decisive in PvP but irrelevant in PvE — a large affix family would waste design space. CC exploitation receives a single high-multiplier affix because the lever is powerful but narrow — multiple CC affixes would be redundant given that CC windows are short and infrequent.

---

## 3. Scenario-Specific Optimization: Deriving Priorities from the Dynamics

The dynamical system formulated in §1 is general — it describes any two-entity combat engagement. But the *parameters* of the system change dramatically across gameplay scenarios, and these changes have direct consequences for which affixes and configurations are optimal. In this section we derive the optimization priorities for each of the four canonical scenarios by examining how the scenario's constraints reshape the HP flow dynamics and, consequently, which combat levers (§1.4) offer the greatest marginal return.

The key insight is that the same exit-probability objective $\max_\theta P_\theta(HP_B(\tau) \leq 0)$ applies in every scenario — what changes is the structure of the dynamics governing the race to zero. A lever that is decisive in one scenario may be irrelevant in another, not because the model changes, but because the parameter regime changes.

### 3.1 Solo PvE: Sustained Attrition Against an Absorbing Barrier Far Away

In solo PvE, the player faces a single high-HP opponent (a boss) with no healing capability ($H_B = 0$) and no teammates to share the burden. The boss's absorbing barrier at $HP_B = 0$ is far from the initial state — typical boss HP pools are orders of magnitude larger than a player's damage output per skill cycle. The player's own barrier, by contrast, is comparatively close.

These asymmetries reshape the optimization landscape in three ways.

First, the large ratio $HP_B(0) / D_A$ means that the engagement duration $\tau$ is long. Over long time horizons, the law of large numbers dominates: variance in per-hit damage washes out, and the *expected* drift becomes the binding quantity. This favors sustained damage sources — particularly DoT effects, which contribute negative drift to $HP_B$ continuously rather than in discrete bursts separated by cooldown intervals.

Second, since $H_B = 0$, the anti-healing lever has no target. Anti-heal affixes are structurally useless: they modify a term that is already zero.

Third, the absence of teammates means that $H_A$ depends entirely on self-sustain affixes. Over a long engagement, even a small imbalance between incoming damage and self-healing accumulates — the player's HP performs a random walk with a slight negative drift, and without correction this drift will eventually reach the absorbing barrier.

**Priority vector**: DoT $>$ self-sustain $>$ execute $\gg$ burst $\gg$ anti-healing (irrelevant).

### 3.2 Solo PvP: Symmetric Dynamics with Healing Recovery

Solo PvP inverts several of the PvE assumptions. The opponent is another player with comparable HP, active healing ($H_B > 0$), and unpredictable behavior. Both absorbing barriers are roughly equidistant from the initial state, making the engagement symmetric in structure.

The most consequential difference is the presence of the healing term $H_B$. If $H_B$ is large enough relative to $D_A \cdot (1 - DR_B)$, the opponent's drift can become *positive* — meaning the player is dealing damage slower than the opponent recovers, and the engagement becomes unwinnable regardless of configuration. Anti-healing affixes directly address this by reducing $H_B$:

$$H_{B,\text{effective}} = H_B \times (1 - r)$$

where $r$ is the healing reduction rate. The "equivalent DPS" of anti-healing scales with the opponent's healing rate, making anti-healing more valuable against better-geared opponents — precisely the regime where optimization matters most.

The second major factor is engagement duration. PvP engagements are shorter than PvE by design: both players are fragile relative to each other's damage output. This time pressure favors burst over sustained damage.

**Priority vector**: anti-healing $>$ burst $>$ self-sustain $>$ DoT $>$ execute.

### 3.3 Team PvE: Superlinear Returns from Shared Dynamics

When teammates are present, the combat dynamics shift from a single pair of coupled equations to a multi-agent system where each player contributes to the *shared* drift on $HP_B$. This introduces a fundamental asymmetry between individual-benefit affixes and team-benefit affixes.

A team debuff that applies +50% damage amplification to the boss increases damage from *all* team members, while a self-buff of +100% only increases the caster's output. When team members have roughly equal gear, the team debuff provides $N/2$ times the total drift modification of the self-buff (where $N$ is team size).

This superlinear scaling — where shared effects grow with team size — is the defining optimization principle of team PvE. The team setting also relaxes the self-sustain constraint: with dedicated healers maintaining positive drift on each player's HP, defensive affixes become redundant.

**Priority vector**: team debuffs $>$ buff amplification $>$ DoT $>$ burst $\gg$ self-sustain (handled by healers).

### 3.4 Team PvP: Focus Fire and the Lanchester Advantage

Team PvP combines healing-present dynamics with multi-agent structure, but introduces **target selection**. The team can distribute damage or concentrate it on a single target (focus fire).

Under focus fire, all attackers target one opponent, producing drift of $-(N \cdot D_{avg}) + H_B$, which achieves kills far faster than distributed fire. Once the first opponent falls, the engagement becomes $N$ vs $N-1$ — a permanent asymmetry that compounds through subsequent kills. This is the Lanchester concentration principle: concentrating fire produces *superlinear* returns because it eliminates opponents faster than they can contribute damage.

The healing term $H_B$ is the key obstacle to focus fire. Anti-healing must precede burst in the team's coordinated release sequence to ensure concentrated damage translates into rapid kills.

**Priority vector**: anti-healing $>$ CC coordination $>$ burst (focus fire) $>$ team debuffs $>$ self-sustain.

### 3.5 Summary: Scenario-Lever Matrix

| Lever | Solo PvE | Solo PvP | Team PvE | Team PvP |
|-------|----------|----------|----------|----------|
| DoT / sustained | **Core** | Low | High | Low |
| Burst | Low | **Core** | Medium | **Core** |
| Anti-healing | Irrelevant | **Core** | Irrelevant | **Critical** |
| Self-sustain | **Core** | High | Low | Low |
| Team debuffs | N/A | N/A | **Core** | High |
| CC exploitation | N/A | Medium | Low | **Core** |

This matrix is not an ad hoc classification — each entry follows from the scenario's parameter regime and the dynamical system model. The optimizer (`book.theory.md`, §1) uses these priorities as objective weights.

---

## 4. General Affix Value Assessment

To compare affixes across different temporal positions and contexts, we define a **utility function** that decomposes value into three independent factors. This decomposition separates the intrinsic power of an affix from the positional and synergistic effects that depend on the surrounding configuration.

### 4.1 Utility Function

$$V(a, t) = \text{BaseValue}(a) \times \text{PositionMod}(a, t) \times \text{SynergyMod}(a, \text{Context})$$

where $a$ is the affix, $t$ is the **temporal release position** (the point in the combat timeline at which this affix is released, determined by the release mechanism), and $\text{Context}$ encodes the state established by all previously released skills.

- $\text{BaseValue}(a)$ captures the intrinsic multiplier of the affix in isolation.
- $\text{PositionMod}(a, t)$ adjusts for the temporal role of the release — a buff affix is worth more when released early than late.
- $\text{SynergyMod}(a, \text{Context})$ captures interactions with the existing state — for example, a debuff-exploitation affix has zero synergy value if no prior release has applied a debuff.

### 4.2 Temporal Position Modifiers

The positional modifier reflects how well an affix's category aligns with the temporal phase of its release. In a system with programmable release timing (see `book.system.md`, §2), the player controls the temporal position of each skill. The modifiers below are parameterized by **phase** rather than fixed slot number:

| Affix category | Foundation phase | Culmination phase | Deployment phase | Adaptation phase |
|----------------|:---:|:---:|:---:|:---:|
| Buff / amplifier | 1.5× | 0.5× | 0.3× | 0.2× |
| Burst / damage | 0.5× | 1.5× | 0.8× | 1.0× |
| DoT / sustained | 0.8× | 1.0× | 1.2× | 1.0× |
| Debuff / setup | 1.2× | 0.8× | 1.0× | 0.5× |

A buff affix in the Foundation phase (1.5×) is significantly more valuable than the same affix in the Adaptation phase (0.2×) because the Buff Temporal Precedence theorem (`book.theory.md`, §3) guarantees that early buffs amplify all subsequent damage, while late buffs amplify nothing.

**Duration coverage.** For buff and debuff affixes, the PositionMod should incorporate a **coverage factor** that accounts for how many subsequent releases fall within the effect's duration window. A cross-slot effect with magnitude $m$ and duration $d$ seconds, released with a gap of $T$ seconds between slots, covers $\lfloor d / T \rfloor$ subsequent releases. The effective value is $m \times \lfloor d / T \rfloor$, not $m$ alone. This means PositionMod for temporal effects is highest in the Foundation phase (where the most subsequent releases remain) and decays toward zero in the Adaptation phase (where few or no releases follow).

**Key difference from the legacy system**: In a fixed-sequential release system, the temporal position of each slot is predetermined and immutable — PositionMod is a function of slot number alone. In the redesigned priority-queue system, temporal position is a *player decision*: the trigger conditions and priority weights programmed before combat determine *when* each skill releases, and therefore which phase it occupies. This makes PositionMod an optimization variable rather than a constant, substantially expanding the strategy space.

### 4.3 Base Value Formulas

| Affix category | Formula |
|----------------|---------|
| Damage amplification | $\text{dmg\%} \times E[\text{trigger count}]$ |
| Buff amplification | $\text{buff\%} \times \text{number of benefiting skills remaining}$ |
| Probability multiplier | $E[X] = \sum_i p_i \times m_i$ |
| Conditional damage | $\text{dmg\%} \times P(\text{condition met at release time})$ |
| Duration-dependent | $\text{effect rate} \times \min(\text{duration}, \text{remaining combat time})$ |

### 4.4 Context-Dependent Synergy

The SynergyMod captures multiplicative interactions between affixes released at different times:

$$\text{SynergyMod}(a, \text{Context}) = \prod_{c \in \text{Context}} \text{Interaction}(a, c)$$

where $\text{Interaction}(a, c) \geq 1$ if affix $a$ synergizes with state $c$ (e.g., debuff-exploitation + existing debuff), and $\text{Interaction}(a, c) = 1$ if they are independent. Negative interactions ($< 1$) arise from conflict mechanics or diminishing returns.

This formulation generalizes naturally across any release mechanism: whether the context was established by fixed-sequence slots, priority-queue triggers, or manual player action, the SynergyMod computation is identical — it depends only on *what state exists*, not on *how it was established*.

---

## 5. Reinforcement Learning Perspective

The preceding sections developed a hand-crafted theory for Divine Book optimization: a dynamical system model (§1), empirical validation (§2), scenario analysis (§3), and quantitative tools (§4). A natural question is whether this theory can be *learned* rather than derived — and if so, what role the hand-crafted theory plays in the learning process.

We argue that the theoretical framework developed in §1–§4 serves as an **inductive bias** for reinforcement learning (Sutton & Barto, 2018): it does not replace learning, but it constrains the hypothesis space so that learning becomes feasible even with limited data.

### 5.1 MDP Formulation

The combat system can be modeled as a Markov Decision Process:

$$\text{MDP} = \langle \mathcal{S}, \mathcal{A}, \mathcal{P}, \mathcal{R}, \gamma \rangle$$

| Symbol | Definition | Game Mapping |
|--------|-----------|--------------|
| $\mathcal{S}$ | State space | $(HP_{self}, HP_{enemy}, \mathbf{Buffs}, \mathbf{Debuffs}, \mathbf{Cooldowns}, \mathbf{Triggers})$ |
| $\mathcal{A}$ | Action space | $\{Release_1, \ldots, Release_6, Reprogram_k, Wait\}$ |
| $\mathcal{P}$ | Transition probability | $P(s' \mid s, a)$ — governed by the dynamics of §1.1 |
| $\mathcal{R}$ | Reward function | $-\Delta HP_{enemy} + \alpha \cdot \Delta HP_{self}$ |
| $\gamma$ | Discount factor | Engagement-duration dependent |

The state space includes the **trigger state** of each slot — whether its programmed condition is currently satisfied — which distinguishes this formulation from the legacy fixed-sequence MDP. The action space includes a **reprogram** action (modifying one trigger mid-combat), reflecting the reactive adaptation mechanic (`book.system.md`, §6).

### 5.2 Theory as Inductive Bias

The theoretical framework compresses the search space by orders of magnitude:

$$|\Pi_{\text{unconstrained}}| \approx 10^{15} \xrightarrow{\text{Theory constraints}} |\Pi_{\text{constrained}}| \approx 10^{7}$$

The configuration correctness theorems (`book.theory.md`, §3) eliminate entire regions of the policy space *a priori*: the Buff Temporal Precedence theorem rules out any program that releases burst before buffs; the Resonance Tradeoff Bound constrains shared-source configurations. The scenario-lever matrix (§3.5) further constrains the reward shaping by specifying which combat levers matter in each scenario.

### 5.3 Policy Decomposition

The optimal policy decomposes into three independent sub-policies, each operating at a different time scale:

$$\pi^* = \pi_{config}^* \circ \pi_{program}^* \circ \pi_{realtime}^*$$

| Sub-policy | Decision | Constraint source |
|------------|----------|-------------------|
| $\pi_{config}^*$ | Select the 6 divine book configurations | §3 scenario-lever mapping |
| $\pi_{program}^*$ | Program trigger conditions and priority weights | `book.theory.md` §3 correctness theorems |
| $\pi_{realtime}^*$ | Manual override and reprogramming decisions | Real-time combat state dynamics |

The **core insight** is that the theoretical framework functions as RL's inductive bias — it provides the structural constraints that make efficient learning possible. The hand-crafted theory handles the *what* (which configurations are feasible) and the *why* (which levers matter), while RL handles the *when* (optimal real-time decisions that depend on the opponent's behavior). The addition of the $\pi_{program}^*$ sub-policy — absent from the legacy system — creates a new learning domain: discovering which trigger programs are optimal against different opponent archetypes. This is the strategic depth enabled by the priority-queue release mechanism.

---

## References

### Theoretical Foundations

- **Lanchester, F.W.** (1916). *Aircraft in Warfare: The Dawn of the Fourth Arm*. Constable. — Original formulation of the Lanchester attrition model.

- **Feller, W.** (1968). *An Introduction to Probability Theory and Its Applications*, Vol. 1, 3rd ed. Wiley. — The gambler's ruin problem provides the discrete analogue of our exit problem formulation.

- **Redner, S.** (2001). *A Guide to First-Passage Processes*. Cambridge University Press. — Comprehensive treatment of first exit times for diffusion processes with absorbing boundaries.

- **Isaacs, R.** (1965). *Differential Games*. Wiley. — The formulation of combat as a two-player differential game.

- **Kress, M.** (2009). Stochastic Lanchester models. In *Encyclopedia of Optimization*. Springer.

- **Burkard, R.E., Dell'Amico, M., & Martello, S.** (2009). *Assignment Problems*. SIAM. — NP-hardness of sequential assignment with position-dependent payoffs.

- **Sutton, R.S. & Barto, A.G.** (2018). *Reinforcement Learning: An Introduction*, 2nd ed. MIT Press.

- **Ng, A.Y., Harada, D., & Russell, S.** (1999). Policy invariance under reward transformations: Theory and application to reward shaping. *ICML*.

### Game Design and Theorycrafting

- **World of Warcraft theorycrafting community** — DPS/HPS/DTPS framework as discrete-time Lanchester specialization.

- **Final Fantasy XIV theorycrafting community** — "damage per second" optimization methodology.

- **Path of Exile build optimization** — Combinatorial optimization structurally similar to Divine Book slot assignment.

---

## Appendix B: Correspondence to Observed Game Mechanics

The following table maps abstract concepts from this document to specific observations from the reference game (《凡人修仙传》— A Mortal's Journey to Immortality), with cross-references to the game-specific analysis in the embedding pipeline. This grounds the theory in empirical observation without making the body of the document game-specific.

| Abstract concept (gcg) | Game observation | Embedding reference |
|------------------------|------------------|:-------------------:|
| Independent drift amplifiers (§1.6) | Multiplicative zones: 伤害加深, 神通伤害加深, 最终伤害加深 — each multiplies independently | combat.md §1 |
| Five combat levers (§1.4) | Damage, Burst, Survivability, Anti-heal, Buff/debuff control | combat.md §5 |
| Buff Temporal Precedence (§4.2) | Buffs in early slots amplify all later damage; 12s buff covers floor(12/6)=2 slots | combat.md §6 |
| Scenario-lever matrix (§3.5) | PvE: DoT + sustain; PvP: burst + anti-heal; Team: shared debuffs | combat.md §5 |
| Variance-drift tradeoff (§2.3) | 心逐神随 E[X]=2.46 → 天命有归 deterministic 4.00×1.50=6.00× | combat.md §4 |
| Diminishing marginal returns (§1.6) | Scarce zones (神通伤害加深, 最終伤害加深) have higher marginal value than crowded 伤害加深 | combat.md §1 |
| Orthogonal drift sources (§1.7) | %maxHP true damage, lost-HP scaling, DoT — all bypass the ATK-based formula | combat.md §3 |
| Temporal granularity (§1.8) | Hit count (段数) determines per-hit trigger frequency; 10-hit vs 5-hit skills | combat.md §2 |
| Duration coverage (§4.2) | Cross-slot effect value = magnitude × floor(duration / gap) | combat.md §6 |

The game-specific analysis is developed in [凡非凡/灵书/embedding/docs/combat.md](../../凡非凡/灵书/embedding/docs/combat.md). The empirical verification of theory predictions against game data lives in [凡非凡/灵书/verification/](../../凡非凡/灵书/verification/).
