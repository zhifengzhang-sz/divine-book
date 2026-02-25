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

# 灵书 — Domain Model & Model Parameters

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

> What skill books, spirit books, affixes, and sets are in the game, and how their mechanics decompose into the 20 model dimensions used by the vector pipeline.
>
> **Required reading before:** [灵书系统机制.md](./灵书系统机制.md) - section 1.1 灵书合成：一本灵书的诞生 and section 1.2 冲突规则：装配的艺术. For raw infomation, [about.md](../data/raw/about.md) — sections "灵书创造规则", "灵书养成规则", "词缀", and "灵书创造".
>
> **This document feeds into:**
> - [model.md](model.md) — structured parameters per affix (the raw data tables)
> - [embedding.md](embedding.md) — the 20D vector space definition and time-series math
> - [design.md](design.md) — architecture decisions built on this domain model

---

## 1. Two Kinds of Skill Book

| | Skill Book (功法书) | Spirit Book (灵书) |
|---|---|---|
| Realm | Mortal world (人界) | Spirit world (灵界) |
| Count | 28 fixed (4 schools × 7) | Player-crafted |
| Composition | Standalone | Assembled from 3 skill books |

The 28 skill books are the **atoms** of the system. Spirit books are **molecules** — composites that inherit properties from their constituent skill books.

> The game has more than 28 books in the Mortal world; more will be documented as data is collected. The current 28-book dataset is sufficient for testing the theory and constructing effective builds.

---

## 2. Anatomy of a Skill Book

Each of the 28 skill books has four components:

```
┌─────────────────────────────────┐
│  千锋聚灵剑 (Thousand Peaks)     │
│                                 │
│  Main Skill (主技能)             │  ← damage, hit count, special mechanics
│    6 hits, 20265% ATK total     │
│    + 27% max HP per hit         │
│                                 │
│  Main Affix (主词缀)             │  ← 1 deterministic affix
│    【惊神剑光】per-hit escalation │
│                                 │
│  Specialized Affix (专属词缀)    │  ← 1 unique affix
│    【天哀灵涸】healing debuff    │
│                                 │
│  Shared Pool Access              │  ← all 通用词缀 + school 修为词缀
│    咒书, 清灵, 业焰, ...         │
│    摧云折月, 灵犀九重, ...       │
└─────────────────────────────────┘
```

These four component types are exactly what `effects.yaml` models:

| Component | effects.yaml field | Determinism |
|-----------|-------------------|:-----------:|
| Main skill | `skill_extra` | Fixed per book |
| Main affix | `primary_affix_effects` | Fixed per book |
| Specialized affix | `exclusive_affix_effects` | Fixed per book |
| Shared pool | `universal_affixes` + `school_affixes` | Shared across books |

---

## 3. Spirit Book Assembly

A spirit book is assembled from **3 skill books**: one **primary** (主位), two **auxiliary** (辅助位).

```
Spirit Book = Primary (主) + Auxiliary₁ + Auxiliary₂

What each position contributes:
  Primary  → main skill + main affix        (deterministic)
  Aux₁     → one sub-affix from its pool    (random or chosen)
  Aux₂     → one sub-affix from its pool    (random or chosen)
```

The sub-affix from each auxiliary is drawn from that book's accessible pool: its specialized affix, its school's cultivation-path affixes, and all generic affixes. The sub-affix's **numeric values scale with the auxiliary book's fusion level** (融合等级) — the auxiliary book acts as a stat stick for the affix it provides.

### Specification notation

```
BookA (主) + BookB (affix-tag) + BookC (affix-tag)
```

| Tag | Meaning |
|-----|---------|
| `(主)` | Primary position — provides skill + main affix |
| `(专属)` | Use this book's specialized affix |
| `(【name】)` | Use the named shared affix (cultivation-path or generic) |

**Example:** `春黎剑阵 (主) + 解体化形 (专属) + 甲元仙符 (【天命有归】)`

- Skill: 春黎剑阵's skill (summon clone, 5 hits, 22305% ATK)
- Main affix: 【幻象剑灵】(summon buff — deterministic from 春黎剑阵)
- Sub-affix: 【心逐神随】(probability multiplier — 解体化形's specialized affix)
- Sub-affix: 【天命有归】(probability → certain + 50% damage — 法修 school affix, scaled by 甲元仙符's fusion level)

---

## 4. Spirit Book Sets and Conflict Rules

A **set** = 6 spirit books equipped for combat, released in sequence (slot 1 → 6).

Two conflict rules constrain set construction:

1. **Core conflict** — if two spirit books share the same primary skill book, the later one **cannot cast** (skill disabled entirely).
2. **Sub-affix conflict** — if two spirit books share the same auxiliary book as affix source, the later one's conflicting affix is **nullified** (skill still castable, affix void).

A well-constructed set has **unique primary books** and **unique affix source books** across all six slots.

---

## 5. What Effects Are

Every affix (main, specialized, or shared) produces **effects** — concrete mechanical changes during combat. These are the atoms of the model.

An effect has:
- A **type** (from the vocabulary in `effect.types.md`) — what mechanical thing it does
- **Numeric parameters** — how much, how long, how often
- A **scope** — whether it affects only the current skill (本神通) or persists to affect later slots (跨槽/下一神通)
- Optional **conditions** — when it activates (e.g. "target HP < 30%")

**Example:** The affix 【天哀灵涸】from 千锋聚灵剑 produces:

```yaml
- type: debuff
  name: 灵涸
  target: healing_received
  value: -31              # reduce target healing by 31%
  duration: 8             # lasts 8 seconds
  dispellable: false      # cannot be cleansed
```

The full inventory of effect types — 52 types in two sections (instant and temporal) — is defined in [effect.types.md](effect.types.md). The typed effects for all 28 books and all shared affixes are stored in `data/effects.yaml`.

---

## 6. From Effects to Model Dimensions

The 52 effect types are too granular for comparison — many types are rare or mechanically similar. The model collapses them into **20 combat-meaningful dimensions**, each representing a distinct axis of combat contribution.

> For the full combat theory — the damage formula, multiplicative zones, combat levers, and scenario-specific priorities — see [combat.md](combat.md) (English) / [灵书战斗原理.md](灵书战斗原理.md) (Chinese). What follows summarizes how that theory maps to the 20 model dimensions.

### The damage formula and its multiplicative zones

Skill damage is **not** a flat sum. It flows through independent **multiplicative zones** (乘区), each multiplying the result of the previous:

```
最终伤害 ≈ (基础攻击力 × 技能系数 + 固定伤害)
          × (1 + 伤害加深%)        ← dim 3: dmg_mod
          × (1 + 神通伤害加深%)    ← dim 4: skill_dmg_mod
          × (1 + 最终伤害加深%)    ← dim 5: final_dmg_mod
          × 会心倍率              ← dims 6–7: crit
          + HP伤害 + DoT          ← dims 9–11: separate channels
```

**Why dims 3, 4, 5 are separate dimensions, not one:** Because they are *independent multipliers*. Adding +50% to 伤害加深 (dim 3) when it already has +200% from other sources gives `300/250 = 1.20×` gain. But adding +50% to 最终伤害加深 (dim 5) when that zone is empty gives `1.50/1.00 = 1.50×` gain — for the same face value. The scarcer the zone, the higher the marginal return. This is why 【明王之路】(+50% final deepening) is far more valuable than a generic +50% damage increase — it occupies a nearly empty zone.

The same logic applies to 神通伤害加深 (dim 4). Only a handful of affixes contribute here — 【灵威】(+118%), 【无极剑阵】(+555%), 【天威煌煌】(+50%) — making it a high-value zone for the same reason.

### Five combat levers

Beyond the damage formula, all combat contribution can be decomposed into five **levers** (see [灵书战斗原理.md](灵书战斗原理.md) §2 for full analysis):

| Lever | What it does | Model dims |
|-------|-------------|------------|
| **Damage output** | Raw killing power through the damage formula | 0–13 |
| **Burst amplification** | Multiplicatively scale skill damage via independent zones | 4, 5, 7, 12, 13 |
| **Survivability** | Reduce incoming damage, shield, self-heal | 17 |
| **Anti-healing** | Suppress enemy recovery (equivalent to dealing more net damage) | 16 (negative), 19 |
| **Buff/debuff control** | Amplify allied effects or weaken enemy defenses | 14, 15, 18, 19 |

Different scenarios weight these levers differently:
- **PvE**: sustained damage (dim 11 DoT) + survivability (dim 17) dominate; anti-heal irrelevant
- **PvP**: burst (dims 4, 5) + anti-heal (dim 16, 19) dominate; survivability secondary
- **Team**: debuff amplification (dim 15, 19) provides super-linear returns across teammates

### The 20 dimensions

Each dimension captures one axis of the combat theory above.

**Damage formula factors (dims 0–7)** — each maps to one multiplicative zone:

| dim | id | Zone in formula | Why it matters |
|-----|-----|------|------|
| 0 | `base_damage` | Base × skill coefficient | Foundation: 20265% ATK means little alone, but everything multiplies this |
| 1 | `hit_count` | Controls cast duration (1段 = 1s) | More hits = more per-hit effects fire; also determines time-series length |
| 2 | `atk_mod` | ATK% multiplier | Scales base damage: 摧云折月 (+55%), 摧山 (+20%) |
| 3 | `dmg_mod` | 伤害加深% zone | Crowded zone — many affixes contribute, so marginal returns diminish |
| 4 | `skill_dmg_mod` | 神通伤害加深% zone | Scarce zone — high marginal return; 【灵威】+118%, 【无极剑阵】+555% |
| 5 | `final_dmg_mod` | 最终伤害加深% zone | Scarcest zone — applies last, so +50% here > +50% in any other zone |
| 6 | `crit_rate_mod` | Crit chance | Binary gate: 通明 and 灵犀九重 guarantee crits |
| 7 | `crit_dmg_mod` | Crit multiplier | 灵犀九重 (2.97×/3.97×) — enormous when crit is guaranteed |

**Damage channels outside the formula (dims 8–13)** — these add damage that bypasses or supplements the main formula:

| dim | id | Mechanic | Why it's separate |
|-----|-----|------|------|
| 8 | `extra_flat_dmg` | Flat %ATK added after formula | 斩岳 (+2000%), 破灭天光 (+2500%) — not multiplied by zones |
| 9 | `hp_pct_dmg` | %maxHP true damage per hit | Ignores ATK entirely; 千锋聚灵剑 (27%/hit) shreds high-HP targets |
| 10 | `lost_hp_pct_dmg` | Scales with how hurt the target is | Execution mechanic: 追神真诀 (26.5%), 吞海 (0.4%/1% lost) — stronger as fight progresses |
| 11 | `dot_power` | Total DoT output over duration | Sustained channel: 玄心剑魄 (550%/s × 8s = 4400% total). Dominant in PvE |
| 12 | `per_hit_esc` | Each hit grows stronger | 惊神剑光 (+42.5%/hit) — back-loaded damage; rewards high hit counts (dim 1) |
| 13 | `prob_mult` | E[random multiplier] | 心逐神随 E[X] = 2.46; 天命有归 converts random to certain (E[X] → max) |

**Combat levers beyond damage (dims 14–19)** — shape the combat without directly dealing damage:

| dim | id | Lever | How it works |
|-----|-----|------|------|
| 14 | `buff_amp` | Buff power | Multiplies allied effects: 龙象护身 (+104% buff strength), 仙露护元 (+300% duration) |
| 15 | `debuff_amp` | Debuff power | Multiplies hostile effects: 心魔惑言 (+100% debuff layers), 咒书 (+20%) |
| 16 | `heal_net` | Net healing | Positive: lifesteal (仙灵汲元 55%), heal boost (长生天则 +50%). Negative: anti-heal (天哀灵涸 -31%) |
| 17 | `survivability` | Damage mitigation | 金刚护体 (DR 55%), 青云灵盾 (shield 50%), self-heal (十方真魄) |
| 18 | `temporal_buff` | Cross-slot buff | Duration outlasts current cast → amplifies later slots. 甲元仙符 ATK+70% for 12s = covers 2 subsequent slots |
| 19 | `temporal_debuff` | Cross-slot debuff | Applied to enemy, persists → weakens their defense for later slots. 天倾灵枯 heal-31% for 20s = 3 slots |

### Why dims 18–19 are separate from 14–15

The **scope** field in each effect determines this:

| Scope | Chinese | Duration | Contributes to |
|-------|---------|----------|----------------|
| This skill only | 本神通 | None (instant) | Dims 0–17 |
| Persists across slots | 下一神通 / 跨槽 | > 6s | Dims 18–19 |

A +100% damage buff that lasts only during the current cast contributes to dim 3. The same buff lasting 12 seconds contributes to dim 18 — because it amplifies the *next two* skills, making it multiplicatively more valuable by its positional reach. Temporal effects are the foundation of slot ordering strategy: buffs early, burst late (see [combat.md](combat.md) §6 on temporal ordering).

### Mapping rules

The mapping from 52 effect types to 20 dimensions is defined in [embedding.md](embedding.md) §2 and implemented in `lib/embedding/model-vector.ts`. The rules are:

- **Direct mapping** — most effect types map 1:1 to a dimension (e.g. `atk_increase` → dim 2)
- **Merging** — mechanically similar types sum into one dimension (e.g. `skill_damage_increase` + `skill_damage_deepen` both → dim 4)
- **Composite dimensions** — dims 14–17 aggregate multiple related types (e.g. `buff_strength` + `buff_layer_increase` + `buff_duration_extend` → dim 14)
- **Temporal dimensions** — dims 18–19 multiply value by slot coverage: a 12-second buff from slot 2 covers floor(12/6) = 2 subsequent slots

---

## 7. From Model to About.md

The relationship between documents:

```
about.md (game text in Chinese — "六段共计20265%攻击力")
  ↓ extraction (keyword.map.md patterns)
effects.yaml (typed objects — { type: base_attack, hits: 6, total: 20265 })
  ↓ model-vector.ts mapping rules (this doc §6, embedding.md §2)
model dimensions (dim 0 = 20265, dim 1 = 6)
  ↓ time expansion (design.md §Time Model)
time-series (20D × T matrix — how the 20 dims evolve during a cast)
```

[model.md](model.md) presents the intermediate step: the extracted parameters in human-readable tables, organized by affix category. Each row in model.md corresponds to one or more effect objects in effects.yaml, which in turn maps to specific model dimensions via the rules in §6.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-23 | Initial: domain model, anatomy, assembly, conflict rules, effects, 20D parameters grounded in combat theory (乘区, levers, scenarios) |
