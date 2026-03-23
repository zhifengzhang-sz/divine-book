---
initial date: 2026-03-23
parent: design.md
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

# Semantics Implementation — 33 Extractor Files

---

## §1 Structure

Each semantic file exports one function:

```typescript
export function addSemantics(s: ohm.Semantics): void {
  addExtractVar(s);  // shared attribute
  s.addOperation<Effect[]>("toEffects", {
    // one action per grammar rule → returns Effect[]
  });
}
```

Two operations are registered:
- **`extractVar`** — attribute (memoized, no args). Returns the string value of a `varRef`, `stateName`, or `cnNumber` node. Shared across all 33 files via `shared.ts`.
- **`toEffects`** — operation. Returns `Effect[]` for each grammar rule. Per-book.

### §1.1 shared.ts

```typescript
export function parseCn(s: string): number    // "六" → 6, "十" → 10
export function addExtractVar(s: ohm.Semantics): void  // register extractVar attribute
```

`addExtractVar` handles all vocabulary nodes:

| Node type | extractVar returns |
|-----------|-------------------|
| `varRef_letters` | `this.sourceString` → `"x"`, `"y"` |
| `varRef_decimal` | `this.sourceString` → `"0.5"`, `"3.5"` |
| `varRef_integer` | `this.sourceString` → `"1500"`, `"10"` |
| `stateName` | inner chars → `"罗天魔咒"` (without 【】) |
| `cnNumber` | `parseCn(this.sourceString)` → `"6"` |
| `_nonterminal` | scan children for varRef child |
| `_terminal` | `this.sourceString` |
| `_iter` | last child's extractVar |

---

## §2 Effect Types Contract

`effect-types.ts` defines:

```typescript
type VarRef = string;
export type Effect = BaseAttack | PercentMaxHpDamage | ... ;  // discriminated union
```

Every semantic action's return is typed as `Effect[]`. The `type` field discriminates:

```typescript
interface BaseAttack { type: "base_attack"; hits: number; total: VarRef; }
interface SelfHpCost { type: "self_hp_cost"; value: VarRef; tick_interval?: number; per_hit?: boolean; }
```

### §2.1 VarRef Convention

Most numeric fields are `VarRef` (string), not `number`. Values like `"x"`, `"y"`, `"1500"` stay as strings — they're resolved to concrete numbers later by tier lookup. Only values derived from grammar structure (like `hits` from `cnNumber`) are parsed to `number`.

### §2.2 When to use `number` vs `VarRef`

| Field | Type | Why |
|-------|------|-----|
| `hits` | `number` | Parsed from Chinese numeral in text (`六` → 6). Fixed per book, not tiered. |
| `total` | `VarRef` | Variable reference `"x"` resolved by tier lookup. |
| `per_hit` | `boolean` | Structural: grammar rule presence means per-hit. |
| `tick_interval` | `number` or `VarRef` | Literal `1` when text says "每秒", `VarRef` when text says "每0.5秒". |

---

## §3 Semantic Action Patterns

### §3.1 Simple effect — one rule, one effect

```typescript
// Grammar: baseAttack = "造成" cnHitCount "共" varRef "%" "攻击力的灵法伤害"
baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
  return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
}
```

### §3.2 Compound effect — one rule, merged fields

```typescript
// Grammar: damageWithCap = percentMaxHpDmg "（" capVsMonster "）"
damageWithCap(dmg, _lp, cap, _rp) {
  return [{ type: "percent_max_hp_damage", value: dmg.extractVar, cap_vs_monster: cap.extractVar }];
}
```

The grammar fuses `percentMaxHpDmg` + `capVsMonster` into one rule. The semantic action produces one effect with both fields. No post-processing needed.

### §3.3 State block — name propagation

```typescript
// Grammar: childBlock = stateName "：" childBody
childBlock(stateName, _colon, childBody) {
  const effects = childBody.toEffects() as Effect[];
  for (const e of effects) e.name = stateName.extractVar;
  return effects;
}
```

State name flows from the block header to child effects. No context parameter needed — the grammar structure carries it.

### §3.4 Structural accumulation — skill description

```typescript
// Grammar: skillDescription = preamble baseAttack "，并" stateAdd "：" stateBody
skillDescription(_pre, baseAttack, _sep, stateAdd, _colon, stateBody) {
  return [
    ...baseAttack.toEffects(),
    { type: "state_add", state: stateAdd.extractVar },
    ...stateBody.toEffects(),
  ];
}
```

The `skillDescription` action concatenates effects from each clause. The grammar defines the structure; the semantic action collects the effects.

### §3.5 Helper rules — return empty

```typescript
preamble(_) { return []; }
cnHitCount(_cn, _d) { return []; }
_terminal() { return []; }
_iter(...children) { return children.flatMap((c) => c.toEffects()); }
```

Helper rules (preamble, separators, Chinese numbers used only for `parseCn`) return `[]`. The `_iter` fallback flattens children — used for `?`, `*`, `+` iteration nodes.

---

## §4 Effect Type Catalog — Full List

### §4.1 Damage

| Type | Fields | Produced by |
|------|--------|------------|
| `base_attack` | `hits: number, total: VarRef` | All 28 books |
| `percent_max_hp_damage` | `value, cap_vs_monster?, per_hit?, trigger?` | 千锋聚灵剑, 皓月剑诀, 玉书天戈符, 天轮魔经 |
| `percent_current_hp_damage` | `value, accumulation?, per_prior_hit?` | 无极御剑诀 |
| `self_lost_hp_damage` | `value, self_heal?, per_hit?, tick_interval?, every_n_hits?, next_skill_hits?` | 惊蜇化龙, 十方真魄, 煞影千幻, 九重天凤诀, 天煞破虚诀, 玄煞灵影诀 |
| `shield_destroy_damage` | `shields_per_hit, percent_max_hp, cap_vs_monster?` | 皓月剑诀 |
| `no_shield_double_damage` | `cap_vs_monster?` | 皓月剑诀 |
| `echo_damage` | `value, ignore_damage_bonus?, duration?` | 星元化岳 |
| `heal_echo_damage` | `ratio: number` | 周天星元 |
| `per_debuff_stack_damage` | `value, max, per_n_stacks?, parent?, per_stack?` | 解体化形, 天魔降临咒, 天轮魔经 |
| `periodic_escalation` | `hits, multiplier, max` | 念剑诀 |
| `delayed_burst` | `name, duration?, increase, burst_damage, burst_atk_damage` | 无相魔劫咒 |
| `conditional_damage` | `value, damage_base?, per_hit?, condition?` | 九天真雷诀, 通天剑诀 |
| `flat_extra_damage` | `value` | 斩岳, 破灭天光 affixes |

### §4.2 Cost

| Type | Fields | Produced by |
|------|--------|------------|
| `self_hp_cost` | `value, tick_interval?, per_hit?` | 惊蜇化龙, 十方真魄, 煞影千幻, 疾风九变, 天煞破虚诀, 九重天凤诀, 玄煞灵影诀 |

### §4.3 DoT

| Type | Fields | Produced by |
|------|--------|------------|
| `dot` | `tick_interval, percent_current_hp?, percent_lost_hp?, damage_per_tick?, name?, duration?, trigger_stack?, source_state?` | 大罗幻诀, 梵圣真魔咒, 春黎剑阵 |

### §4.4 Healing / Shield

| Type | Fields | Produced by |
|------|--------|------------|
| `self_heal` | `value?, per_tick?, total?, tick_interval?` | 周天星元 |
| `shield` | `value, duration?, source?, trigger?` | 煞影千幻, 周天星元(天书灵盾) |

### §4.5 Buff

| Type | Fields | Produced by |
|------|--------|------------|
| `self_buff` | `name?, attack_bonus?, damage_increase?, skill_damage_increase?, final_damage_bonus?, damage_reduction?, crit_rate?, healing_bonus?, defense_bonus?, hp_bonus?, duration?` | 浩然星灵诀, 元磁神光, 甲元仙符, 十方真魄, 九重天凤诀, 惊蜇化龙, 天魔降临咒, 天刹真魔 |

### §4.6 Debuff

| Type | Fields | Produced by |
|------|--------|------------|
| `debuff` | `name?, target?, value?, duration?, ignore_damage_bonus?, sequenced?, trigger?` | 煞影千幻, 新青元剑诀, 天魔降临咒, 天刹真魔, 无相魔劫咒 |

### §4.7 Complex

| Type | Fields | Produced by |
|------|--------|------------|
| `buff_steal` | `value` | 天轮魔经 |
| `untargetable` | `value` | 念剑诀 |
| `counter_debuff` | `trigger, chance, count, name, states` | 大罗幻诀 |
| `counter_buff` | `trigger?, heal_on_damage_taken?, no_healing_bonus?, reflect_received_damage?, reflect_percent_lost_hp?` | 天刹真魔, 疾风九变 |
| `summon` | `value, duration?, trigger?, damage_taken_multiplier?` | 春黎剑阵 |
| `crit_dmg_bonus` | `value` | 通天剑诀 |
| `self_damage_taken_increase` | `duration?, value` | 通天剑诀, 十方真魄 |
| `self_cleanse` | `count` | 九天真雷诀 |

### §4.8 State

| Type | Fields | Produced by |
|------|--------|------------|
| `state_ref` | `state: string` | 浩然星灵诀, 元磁神光, 周天星元, 甲元仙符, 皓月剑诀, 天煞破虚诀, 无相魔劫咒 |
| `state_add` | `state, count?, undispellable?, per_hit?, inherited?` | 大罗幻诀, 天刹真魔, 十方真魄, 玄煞灵影诀, 疾风九变, 煞影千幻, 九重天凤诀, 天魔降临咒, 梵圣真魔咒 |

### §4.9 Affix Effects

| Type | Key producers |
|------|-------------|
| `per_hit_escalation` | 千锋聚灵剑(primary), 破竹, 心火淬锋 |
| `guaranteed_resonance` | 通明, 灵犀九重 |
| `triple_bonus` | 破碎无双 |
| `attack_bonus` | 摧山, 摧云折月, 元磁神光(primary), 解体化形(primary) |
| `damage_increase` | 通天剑诀(exclusive), 玉书天戈符(exclusive), 惊蜇化龙(exclusive), 十方真魄(exclusive) |
| `next_skill_buff` | 灵威, 天威煌煌 |
| `shield_value_increase` | 灵盾, 青云灵盾 |
| `all_state_duration` | 业焰, 真言不灭 |
| `damage_reduction_during_cast` | 金汤, 金刚护体 |
| `per_self_lost_hp` | 战意, 怒血战意, 玄煞灵影诀(exclusive) |
| `per_enemy_lost_hp` | 吞海, 贪狼吞星 |
| `conditional_damage_controlled` | 击瑕, 乘胜逐北 |
| `execute_conditional` | 怒目(with crit_rate), 溃魂击瑕(with guaranteed_crit) |
| `random_buff` | 福荫, 景星天佑 |
| `flat_extra_damage` | 斩岳, 破灭天光 |
| `dot_extra_per_tick` | 鬼印, 皓月剑诀(exclusive) |
| `buff_strength` | 清灵, 龙象护身 |
| `debuff_strength` | 咒书 |
| `healing_increase` | 长生天则 |
| `final_dmg_bonus` | 明王之路 |
| `probability_to_certain` | 天命有归 |
| `healing_to_damage` | 瑶光却邪 |
| `damage_to_shield` | 玄女护心 |
| `random_debuff` | 祸星无妄 |
| `min_lost_hp_threshold` | 意坠深渊 |
| `lifesteal` | 星元化岳(both affixes), 仙灵汲元 |
| `lifesteal_with_parent` | 疾风九变(primary) |
| `summon_buff` | 春黎剑阵(primary) |
| `shield_destroy_dot` | 皓月剑诀(primary) |
| `extended_dot` | 念剑诀(primary) |
| `buff_duration` | 念剑诀(exclusive) |
| `debuff_skill_dmg` | 新青元剑诀(primary: 追命剑阵) |
| `self_buff_extend` | 十方真魄(primary) |
| `periodic_cleanse` | 十方真魄(primary) |
| `shield_strength` | 煞影千幻(primary) |
| `self_hp_floor` | 九重天凤诀(primary) |
| `periodic_dispel` | 九重天凤诀(primary), 天煞破虚诀(exclusive) |
| `on_shield_expire` | 九重天凤诀(exclusive) |
| `on_dispel` | 春黎剑阵(exclusive) |
| `on_buff_debuff_shield` | 九天真雷诀(exclusive) |
| `dot_permanent_max_hp` | 天魔降临咒(primary) |
| `per_debuff_damage_upgrade` | 天魔降临咒(primary) |
| `conditional_damage_debuff` | 天魔降临咒(exclusive), 引灵摘魂 |
| `per_stolen_buff_debuff` | 天轮魔经(primary) |
| `debuff_stack_increase` | 天轮魔经(exclusive), 心魔惑言 |
| `self_buff_extra` | 天刹真魔(primary) |
| `counter_debuff_upgrade` | 大罗幻诀(primary) |
| `cross_slot_debuff` | 大罗幻诀(primary), 周天星元(exclusive) |
| `dot_damage_increase` | 大罗幻诀(exclusive), 古魔之魂 |
| `dot_frequency_increase` | 梵圣真魔咒(exclusive), 天魔真解 |
| `delayed_burst_increase` | 无相魔劫咒(primary) |
| `probability_multiplier` | 解体化形(exclusive), 心逐神随 |
| `percent_max_hp_affix` | 惊蜇化龙(primary) |
| `per_debuff_true_damage` | 惊蜇化龙(exclusive), 索心真诀 |
| `debuff_stack_chance` | 周天星元(exclusive) |
| `heal_reduction` | 千锋聚灵剑(exclusive), 甲元仙符(exclusive) |
| `conditional_hp_scaling` | 浩然星灵诀(primary), 玉书天戈符(primary) |
| `per_buff_stack_damage` | 元磁神光(exclusive), 真极穿空 |
| `buff_stack_increase` | 元磁神光(exclusive), 真极穿空 |
| `enlightenment_bonus` | 玉书天戈符(exclusive) |
| `ignore_damage_reduction` | 通天剑诀(exclusive), 神威冲云 |
| `skill_damage_increase_affix` | 无极御剑诀(exclusive), 无极剑阵 |

---

## §5 Consistency Verification

For each effect type that appears in multiple producers, verify field consistency:

| Effect type | Producers | Fields consistent? |
|-------------|----------|-------------------|
| `base_attack` | 28 books | ✓ All return `{ hits, total }` |
| `damage_increase` | 4 exclusive affixes | ✓ All return `{ value }` |
| `attack_bonus` | 摧山, 摧云折月, 2 primaries | ✓ All return `{ value }`, some add `per_debuff_stack`, `timing` |
| `guaranteed_resonance` | 通明, 灵犀九重 | ✓ Both return `{ base_multiplier, chance, upgraded_multiplier }` |
| `per_hit_escalation` | 千锋(primary), 破竹, 心火淬锋 | ✓ All return `{ value }` or `{ hits, per_hit, max }` — **two shapes** |
| `conditional_damage_controlled` | 击瑕, 乘胜逐北 | ✓ Both return `{ value }` |
| `per_self_lost_hp` | 战意, 怒血战意 | ✓ Both return `{ value }` |
| `per_enemy_lost_hp` | 吞海, 贪狼吞星 | ✓ Both return `{ per_percent, value }` |
| `shield_value_increase` | 灵盾, 青云灵盾 | ✓ Both return `{ value }` |
| `flat_extra_damage` | 斩岳, 破灭天光 | ✓ Both return `{ value }` |

> **Note:** `per_hit_escalation` has two shapes — simple `{ value }` (千锋聚灵剑 primary: "下一段提升x%") vs detailed `{ hits, per_hit, max }` (破竹: "每造成1段伤害，剩余提升x%，最多y%"). Consider splitting into two types or unifying with optional fields.
