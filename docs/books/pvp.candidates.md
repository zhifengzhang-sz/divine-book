---
initial date: 2026-3-9
dates of modification: [2026-3-9]
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

# PvP Book Set Candidates

> Systematic candidate enumeration across 5 themes. Each theme defines 6 slots with platform + function assignments. Per-slot analysis identifies the dominant affix pattern, then set-level enumeration produces valid 6-slot combinations respecting cross-slot affix uniqueness.

**Tool:** `bun app/build-candidates.ts`
**Source:** `lib/domain/build-candidates.ts`

---

## Architecture

Two-layer candidate enumeration:

1. **Per-slot analysis** — For each (platform, function) pair, rank all valid combos by `comboDistance`. Detect the dominance pattern:
   - **LOCKED**: both affixes are essential (co-dominant in top 20) — 1 combo
   - **FLEXIBLE**: one affix dominates — fixed affix + ranked alternatives for the other position

2. **Set-level enumeration** — Cartesian product of per-slot candidate lists, filtered by cross-slot affix uniqueness (no affix used in more than one slot). Output: a list of valid book sets, ranked by total score.

> **Note on scoring.** The `comboDistance` score measures how much two operator affixes shift the factor vector from the platform baseline, filtered to function-relevant dimensions. It does **not** simulate combat — all candidates are provisional until validated by a combat simulator.

---

## Key Pattern: 玄心剑魄 Dominance

Across all themes, **玄心剑魄** dominates all `F_burst` and `F_hp_exploit` slots (appears in 19/20 top combos). This is because 玄心剑魄 contributes `base_attack` (+3850), the single largest factor contribution of any operator affix.

Since a 6-slot set needs 12 unique affixes, only **one slot** gets 玄心剑魄. The other slots fall back to combos without it. The set-level DFS resolves which slot gets the best allocation.

The per-slot alternatives list answers: "if this slot gets 玄心剑魄, which affix goes in the other position?"

---

## Theme 1: All Attack (α=1.0)

All 6 slots maximize damage output.

### Per-Slot Analysis

| Slot | Platform | Function | Pattern | Fixed | Top Alternatives |
|:-----|:---------|:---------|:--------|:------|:-----------------|
| S1 | 春黎剑阵 | F_burst | FLEXIBLE | 玄心剑魄 (pos 2) | 破灭天光, 斩岳, 追神真诀, 无极剑阵, 破釜沉舟 |
| S2 | 皓月剑诀 | F_burst | FLEXIBLE | 玄心剑魄 (pos 2) | 破灭天光, 斩岳, 追神真诀, 无极剑阵, 破釜沉舟 |
| S3 | 念剑诀 | F_burst | FLEXIBLE | 玄心剑魄 (pos 2) | 破灭天光, 斩岳, 追神真诀, 无极剑阵, 破釜沉舟 |
| S4 | 千锋聚灵剑 | F_burst | FLEXIBLE | 玄心剑魄 (pos 2) | 破灭天光, 斩岳, 追神真诀, 无极剑阵, 破釜沉舟 |
| S5 | 玄煞灵影诀 | F_hp_exploit | FLEXIBLE | 玄心剑魄 (pos 1) | 破釜沉舟, 灵犀九重, 景星天佑, 明王之路, 天命有归 |
| S6 | 大罗幻诀 | F_burst | FLEXIBLE | 玄心剑魄 (pos 2) | 破灭天光, 斩岳, 追神真诀, 索心真诀, 无极剑阵 |

All 6 slots share the same fixed affix. Score gap: best combo (破灭天光+玄心剑魄 = 4590) vs best without 玄心剑魄 (斩岳+破灭天光 = 4500) = **2% drop**.

### Candidate Sets

| # | S1 春黎 | S2 皓月 | S3 念剑 | S4 千锋 | S5 玄煞 | S6 大罗 | Total |
|:--|:--------|:--------|:--------|:--------|:--------|:--------|------:|
| 1 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 灵威+破釜沉舟 | 通明+灵犀九重 | 景星天佑+心逐神随 | 追神真诀+无相魔威 | 8146 |
| 2 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 灵威+破釜沉舟 | 通明+灵犀九重 | 景星天佑+心逐神随 | 追神真诀+引灵摘魂 | 8145 |
| 3 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 灵威+破釜沉舟 | 通明+灵犀九重 | 明王之路+心逐神随 | 追神真诀+无相魔威 | 8145 |

**Observations:**
- S1 always gets 玄心剑魄 (highest-value slot with summon clone)
- S2 falls back to 斩岳+无极剑阵 — the best combo without 玄心剑魄 or 破灭天光
- S3–S6 use increasingly generic affixes as the top ones are consumed
- Candidates differ only in S5–S6 choices — the first 4 slots are locked in

---

## Theme 2: Attack + Buff (α=0.8)

5 attack slots + 1 buff slot (甲元仙符).

### Per-Slot Analysis

| Slot | Platform | Function | Pattern | Fixed | Top Alternatives |
|:-----|:---------|:---------|:--------|:------|:-----------------|
| S1 | 春黎剑阵 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, 追神真诀, 无极剑阵, 破釜沉舟 |
| S2 | 皓月剑诀 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, 追神真诀, 无极剑阵, 破釜沉舟 |
| S3 | 甲元仙符 | F_buff | **LOCKED** | — | **景星天佑 + 无极剑阵** (560.4) |
| S4 | 千锋聚灵剑 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, 追神真诀, 无极剑阵, 破釜沉舟 |
| S5 | 玄煞灵影诀 | F_hp_exploit | FLEXIBLE | 玄心剑魄 | 破釜沉舟, 灵犀九重, 景星天佑, 明王之路, 天命有归 |
| S6 | 念剑诀 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, 追神真诀, 无极剑阵, 破釜沉舟 |

甲元仙符 (F_buff) is **LOCKED** — 景星天佑+无极剑阵 co-dominate the top combos. This consumes 景星天佑 and 无极剑阵, reducing set-level options.

### Candidate Sets

| # | S1 春黎 | S2 皓月 | S3 甲元 | S4 千锋 | S5 玄煞 | S6 念剑 | Total |
|:--|:--------|:--------|:--------|:--------|:--------|:--------|------:|
| 1 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 景星天佑+破釜沉舟 | 灵威+心逐神随 | 通明+灵犀九重 | 追神真诀+无相魔威 | 8057 |
| 2 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 景星天佑+破釜沉舟 | 通明+灵犀九重 | 明王之路+心逐神随 | 追神真诀+无相魔威 | 8035 |
| 3 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 景星天佑+破釜沉舟 | 通明+灵犀九重 | 天命有归+心逐神随 | 追神真诀+无相魔威 | 8035 |

**Observations:**
- S3 (甲元仙符) locks 景星天佑+无极剑阵 for buff — note S3 gets 景星天佑+破釜沉舟 instead (无极剑阵 taken by S2)
- Total score ~100 lower than all-attack due to the buff slot's lower contribution

---

## Theme 3: Attack + Buff + Suppression (α=0.6)

Same structure as attack_buff — the suppression functions (F_antiheal, F_truedmg, F_dr_remove) are secondary objectives on attack slots and don't change the per-slot ranking (scored by primary function).

### Candidate Sets

Identical to Theme 2. The suppression functions affect which _effects_ the book carries but don't change the factor-distance scoring. A combat simulator would differentiate these.

---

## Theme 4: Attack + Buff + Survive (α=0.4)

Replaces one attack slot with 十方真魄 (F_survive).

### Per-Slot Analysis

| Slot | Platform | Function | Pattern | Fixed | Top Alternatives |
|:-----|:---------|:---------|:--------|:------|:-----------------|
| S1 | 春黎剑阵 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, ... |
| S2 | 皓月剑诀 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, ... |
| S3 | 甲元仙符 | F_buff | LOCKED | — | 景星天佑 + 无极剑阵 |
| S4 | **十方真魄** | **F_survive** | **FLEXIBLE** | **金刚护体** | **无极剑阵, 玄女护心, 金汤, 清灵, 业焰** |
| S5 | 玄煞灵影诀 | F_hp_exploit | FLEXIBLE | 玄心剑魄 | 破釜沉舟, 灵犀九重, ... |
| S6 | 念剑诀 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, ... |

十方真魄 (F_survive) is the only slot with a **different fixed affix**: 金刚护体 (damage reduction). Its alternatives are DR/survival affixes — completely different pool from the F_burst slots.

### Candidate Sets

| # | S1 春黎 | S2 皓月 | S3 甲元 | S4 十方 | S5 玄煞 | S6 念剑 | Total |
|:--|:--------|:--------|:--------|:--------|:--------|:--------|------:|
| 1 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 景星天佑+破釜沉舟 | 金刚护体+玄女护心 | 灵犀九重+心逐神随 | 追神真诀+无相魔威 | 7879 |
| 2 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 景星天佑+破釜沉舟 | 金刚护体+玄女护心 | 灵犀九重+心逐神随 | 溃魂击瑕+追神真诀 | 7874 |
| 3 | 破灭天光+玄心剑魄 | 斩岳+无极剑阵 | 景星天佑+破釜沉舟 | 金刚护体+玄女护心 | 通明+灵犀九重 | 追神真诀+无相魔威 | 7853 |

**Observations:**
- S4 (十方真魄) locked at 金刚护体+玄女护心 — no affix conflict with attack slots
- Total ~270 lower than all-attack — the survive slot contributes less to factor-distance
- The survive slot's real value (not dying) is invisible to the scoring model

---

## Theme 5: All Defense (α=0.0)

3 defense slots + 3 attack slots.

### Per-Slot Analysis

| Slot | Platform | Function | Pattern | Fixed | Top Alternatives |
|:-----|:---------|:---------|:--------|:------|:-----------------|
| S1 | 甲元仙符 | F_buff | LOCKED | — | 景星天佑 + 无极剑阵 |
| S2 | 十方真魄 | F_survive | FLEXIBLE | 金刚护体 | 无极剑阵, 玄女护心, 金汤, 清灵, 业焰 |
| S3 | 疾风九变 | F_counter | **LOCKED** | — | **清灵 + 玄心剑魄** (3850.0) |
| S4 | 春黎剑阵 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, ... |
| S5 | 玄煞灵影诀 | F_hp_exploit | FLEXIBLE | 玄心剑魄 | 破釜沉舟, 灵犀九重, ... |
| S6 | 皓月剑诀 | F_burst | FLEXIBLE | 玄心剑魄 | 破灭天光, 斩岳, ... |

疾风九变 (F_counter) is **LOCKED** at 清灵+玄心剑魄. This consumes 玄心剑魄 for a defense slot, so the attack slots must fall back.

### Candidate Sets

| # | S1 甲元 | S2 十方 | S3 疾风 | S4 春黎 | S5 玄煞 | S6 皓月 | Total |
|:--|:--------|:--------|:--------|:--------|:--------|:--------|------:|
| 1 | 景星天佑+无极剑阵 | 金刚护体+玄女护心 | 清灵+玄心剑魄 | 斩岳+破灭天光 | 灵威+破釜沉舟 | 追神真诀+无相魔威 | 9895 |
| 2 | 景星天佑+无极剑阵 | 金刚护体+玄女护心 | 清灵+玄心剑魄 | 斩岳+破灭天光 | 灵威+破釜沉舟 | 溃魂击瑕+追神真诀 | 9890 |
| 3 | 景星天佑+无极剑阵 | 金刚护体+玄女护心 | 清灵+玄心剑魄 | 斩岳+破灭天光 | 灵威+破釜沉舟 | 追神真诀+心逐神随 | 9882 |

**Observations:**
- Highest total score (9895) because 疾风九变's locked combo has 玄心剑魄 (3850) baked in
- S4 gets 斩岳+破灭天光 (4500) — the best F_burst combo without 玄心剑魄
- Defense slots create less affix contention since they use different affix pools

---

## Cross-Theme Patterns

| Pattern | Observation |
|:--------|:-----------|
| 玄心剑魄 monopoly | Fixed in all F_burst and F_hp_exploit slots. Only 1 slot gets it per set. |
| Score cliff | Best combo (4590) vs 6th-best (3858) = 16% drop. But without 玄心剑魄, best is 4500 (2% drop). The cliff is between with/without 玄心剑魄, not between alternatives. |
| F_burst uniformity | All F_burst slots produce identical rankings (platform-independent scoring). Differentiation comes only from set-level allocation. |
| Defense diversity | F_buff, F_survive, F_counter use different affix pools — less cross-slot conflict. |
| Candidate convergence | Top candidates differ only in the last 2–3 slots. The first 2–3 slots converge to the same allocation. |

## Limitations

1. **No combat simulation.** Scores are factor-distance from baseline, not combat outcomes. A simulator is needed to evaluate which candidate actually wins fights.
2. **Platform-independent F_burst scoring.** The model doesn't differentiate 春黎剑阵 vs 皓月剑诀 for F_burst — same affixes score identically. Platform-specific effects (summon, exclusive affix) are not reflected in the per-slot ranking.
3. **Secondary functions ignored.** Theme slots list secondary functions (F_exploit, F_dot, F_antiheal) but scoring uses only the primary function. The secondary functions are qualitative constraints, not scoring inputs.
4. **No synergy modeling.** Cross-slot interactions (e.g., one slot's buff amplifying another slot's damage) are invisible to the per-slot analysis.

---

## Tool Usage

```bash
# List available themes
bun app/build-candidates.ts --list

# Analyze a single slot
bun app/build-candidates.ts --slot 春黎剑阵 --fn F_burst

# Run one theme (top 5 candidates, 10 alternatives per slot)
bun app/build-candidates.ts --theme all_attack --top 5 --alt 10

# Run all themes
bun app/build-candidates.ts --all --top 5

# JSON output for programmatic use
bun app/build-candidates.ts --theme all_attack --json
```
