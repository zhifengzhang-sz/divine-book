---
initial date: 2026-2-25
dates of modification: [2026-2-25]
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

# Reinforcement Learning Perspective on Combat

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> **Layer 1 — Learning.** This document formulates combat optimization as a reinforcement learning problem. The dynamical system defined in [theory.combat.md](theory.combat.md) provides the environment; this document defines the MDP, shows how the combat theory serves as an inductive bias that makes learning feasible, and decomposes the optimal policy by time scale.

---

## Table of Contents

| Section | Content |
|:--------|:--------|
| **1. MDP Formulation** | State, action, transition, reward, discount |
| **2. Theory as Inductive Bias** | How the combat theory constrains the hypothesis space |
| **3. Policy Decomposition** | Three-level decomposition by decision time scale |

---

## 1. MDP Formulation

The dynamical system of [theory.combat.md](theory.combat.md) — the SDE with absorbing barriers, the five drift factors, the exit problem — defines the environment. A natural question is whether optimal configurations can be *learned* rather than derived. We formulate this as a Markov Decision Process:

$$\text{MDP} = \langle \mathcal{S}, \mathcal{A}, \mathcal{P}, \mathcal{R}, \gamma \rangle$$

| Symbol | Definition |
|:-------|:-----------|
| $\mathcal{S}$ | $(HP_{self}, HP_{enemy}, \mathbf{ActiveStates}, \mathbf{Cooldowns})$ |
| $\mathcal{A}$ | $\{Release_1, \ldots, Release_k, Wait\}$ |
| $\mathcal{P}$ | $P(s' \mid s, a)$ — governed by the dynamics of [theory.combat.md §1.1](theory.combat.md#11-state-space-and-dynamics) |
| $\mathcal{R}$ | $-\Delta HP_{enemy} + \alpha \cdot \Delta HP_{self}$ |
| $\gamma$ | Engagement-duration dependent |

The state space includes not just the HP pair from the continuous SDE but also the discrete state of active buffs, debuffs, shields, and cooldowns. The transition function $\mathcal{P}$ is governed by the dynamics defined in the combat theory — skill activations produce discrete damage events that drive the continuous HP process.

The reward function combines offensive progress ($-\Delta HP_{enemy}$, negative because we want opponent HP to decrease) with defensive consideration ($\alpha \cdot \Delta HP_{self}$, where $\alpha$ weights self-preservation). This directly reflects the exit-probability objective: configurations that deal damage while preserving HP are rewarded more than those that trade HP recklessly.

---

## 2. Theory as Inductive Bias

The combat theory (Sutton & Barto, 2018) serves as an **inductive bias** that constrains the hypothesis space so that learning becomes feasible even with limited data:

$$|\Pi_{\text{unconstrained}}| \approx 10^{15} \xrightarrow{\text{Theory constraints}} |\Pi_{\text{constrained}}| \approx 10^{7}$$

Three classes of structural constraints from the dynamics eliminate infeasible regions *a priori*:

**Temporal precedence.** The drift properties ([theory.combat.md §3.3](theory.combat.md#33-structural-properties-of-the-drift)) establish that multiplicative amplifiers have higher value when they precede the damage events they amplify. This eliminates all configurations where burst precedes buffs — a large fraction of the naive search space.

**Diminishing returns from same-factor stacking.** The multiplicative decomposition property means that redundant contributions to a single zone yield diminishing marginal returns. This constrains the search toward configurations that distribute effects across independent zones rather than concentrating them.

**Scenario-factor priorities as reward shaping** (Ng et al., 1999)**.** The scenario-factor matrix ([theory.combat.scenario.md §6](theory.combat.scenario.md#6-scenario-factor-matrix)) provides prior knowledge about which factors matter in each context. In PvE, anti-healing modifies a zero term; in PvP, burst dominates sustained damage. These priors shape the reward function so that learning converges faster — the agent does not need to rediscover from scratch that anti-healing is useless against enemies with no healing.

Together, these constraints reduce the effective policy space by approximately 8 orders of magnitude, making learning tractable where exhaustive search is not.

---

## 3. Policy Decomposition

The optimal policy decomposes by time scale into three sub-policies, each operating at a different decision frequency:

$$\pi^* = \pi_{config}^* \circ \pi_{program}^* \circ \pi_{realtime}^*$$

| Sub-policy | Decision | Time scale | Constraint source |
|:-----------|:---------|:-----------|:------------------|
| $\pi_{config}^*$ | Select skill/affix configuration | Pre-combat | [theory.combat.scenario.md](theory.combat.scenario.md) scenario-factor mapping |
| $\pi_{program}^*$ | Program release conditions (slot ordering, trigger rules) | Pre-combat | [theory.combat.md §3.3](theory.combat.md#33-structural-properties-of-the-drift) temporal precedence, diminishing returns |
| $\pi_{realtime}^*$ | Override and adaptation during combat | Real-time | State dynamics — react to opponent actions |

The decomposition separates concerns:

- **$\pi_{config}^*$** is a combinatorial optimization over the configuration space $\Theta$. The combat theory handles the *what* — which configurations are feasible and which factors they address. The scenario-factor matrix provides the objective weights.

- **$\pi_{program}^*$** determines the *when* — given a configuration, what is the optimal release sequence? Temporal precedence (buffs before burst) and duration coverage (how many subsequent skills a buff reaches) constrain this sub-policy.

- **$\pi_{realtime}^*$** handles adaptation — overriding the programmed sequence when the opponent's behavior creates opportunities (e.g., opponent is crowd-controlled → burst now) or threats (e.g., own HP critical → prioritize survival). This sub-policy is the only one that requires online learning; the other two can be optimized offline.

The combat theory handles $\pi_{config}^*$ and $\pi_{program}^*$ through structural analysis. RL handles $\pi_{realtime}^*$ — optimal decisions given the opponent's behavior and the current state trajectory.

---

## References

- **Sutton, R.S. & Barto, A.G.** (2018). *Reinforcement Learning: An Introduction*, 2nd ed. MIT Press.

- **Ng, A.Y., Harada, D. & Russell, S.** (1999). Policy invariance under reward transformations: Theory and application to reward shaping. *ICML*.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-25 | Extracted from theory.combat.md §4; expanded MDP formulation, inductive bias constraints, and policy decomposition |
