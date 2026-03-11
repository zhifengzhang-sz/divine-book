# Affix Taxonomy: 7 Behavioral Categories

The affix system is a set of declarative modifiers that hook into specific moments of the combat loop. Each affix resolves to mutations on the 4 combat attributes (HP, ATK, SP, DEF).

## 1. Passive Multipliers

Modify skill output unconditionally — always active when the affix is equipped.

| Affix | Effect |
|-------|--------|
| 咒书 | Debuff strength +x% |
| 清灵 | Buff strength +x% |
| 业焰 | All state duration +x% |
| 灵盾 / 青云灵盾 | Shield value +x% |
| 摧山 / 摧云折月 | ATK% effect +x% |
| 通明 / 灵犀九重 | Guaranteed 会心, multiplied damage |
| 破碎无双 | ATK% +15%, damage +15%, crit damage +15% |
| 古魔之魂 | DoT damage +x% |
| 天魔真解 | DoT tick interval -x% |
| 龙象护身 | Buff strength +x% |
| 长生天则 | Healing +x% |
| 明王之路 | Final damage bonus +x% |
| 仙露护元 | Buff duration +x% |
| 真言不灭 | All state duration +x% |

## 2. Conditional Multipliers

Check combat state at trigger time — damage scales with HP%, control states, or debuff count.

| Affix | Condition | Effect |
|-------|-----------|--------|
| 击瑕 / 乘胜逐北 | Enemy in control state | Damage +x% |
| 怒目 | Enemy HP <30% | Damage +x%, crit rate +y% |
| 溃魂击瑕 | Enemy HP <30% | Damage +x%, guaranteed crit |
| 战意 / 怒血战意 | Per 1% own lost HP | Damage +x% |
| 吞海 / 贪狼吞星 | Per 1% enemy lost HP | Damage +x% |
| 天灵怒威 | Own HP >20%, per 3% excess | Damage +y% |
| 意坠深渊 | Lost HP calculation | Floor at x%, damage +y% |
| 引灵摘魂 | Enemy has debuff | Damage +x% |
| 天命有归 | Probability effects | Become guaranteed, damage +x% |
| 焚心剑芒 | Per 5% enemy lost HP | Damage +y% |
| 破釜沉舟 | On cast | Damage +x%, self takes +y% damage |
| 神威冲云 | Always | Ignore enemy damage reduction, damage +x% |
| 无极剑阵 | Always | Skill damage +x%, but enemy gets +y% skill DR |

## 3. Flat Damage Additions

Add extra damage instances — on cast or per hit segment.

| Affix | Trigger | Effect |
|-------|---------|--------|
| 斩岳 / 破灭天光 | On hit | Extra x% ATK damage |
| 破竹 / 心火淬锋 | Per hit segment | Escalation: +x% per segment, cap y% |
| 天鹤祈瑞 | On cast | Per x% final damage bonus → +y% ATK damage |
| 九雷真解 | On buff/debuff/shield application | Thunder strike = x% skill damage |

## 4. State-Creating Effects

Create new named states, DoTs, debuffs, or shields on cast.

| Affix | Created State | Duration |
|-------|---------------|----------|
| 玄心剑魄 | 【噬心】DoT on enemy; dispel triggers burst + stun | 8–18s |
| 天哀灵涸 | 【灵涸】healing reduction, undispellable | 8s |
| 天倾灵枯 | 【灵枯】healing reduction; amplified below 30% HP | 20s |
| 无相魔威 | 【魔劫】heal reduction + damage amp; conditional bonus | 8s |
| 祸星无妄 | Random debuff: ATK / crit rate / crit damage down | — |
| 玄女护心 | Shield = x% of damage dealt | 8s |
| 奇能诡道 | Extra debuff stack; 【逆转阴阳】on damage-buff | — |
| 心魔惑言 | Extra debuff stacks; per 5 stacks → damage +y% | — |
| 真极穿空 | Extra buff stacks; per 5 stacks → damage +y% | — |
| 仙灵汲元 | Lifesteal = x% of damage dealt | — |
| 景星天佑 / 福荫 | Random one of: ATK / lethal / damage +x% | — |
| 索心真诀 | Per debuff stack → x% max HP true damage; lost HP bonus | — |

## 5. Cross-Skill Effects

Carry state between consecutive skill casts — affect the *next* skill, not the current one.

| Affix | Mechanism |
|-------|-----------|
| 灵威 / 天威煌煌 | Next skill gets +x% skill damage bonus |
| 破虚 state (天煞破虚诀 platform) | Next skill's 8 hits each get +z% lost HP damage |
| 惊神剑光 (千锋聚灵剑 primary) | Per hit segment → next segment gets +x% skill bonus |

## 6. Reactive Triggers

Fire during the opponent's action — on being attacked or per-second ticks.

| Affix | Trigger | Effect |
|-------|---------|--------|
| 天狼之啸 (元磁神光 platform) | On being attacked | Stack 【天狼之啸】: +y% damage, max z stacks |
| 天狼战意 (元磁神光 primary) | Per stack of 天狼之啸 | +x% ATK |
| 罗天魔咒 (大罗幻诀 platform) | On being attacked | 30/60% chance: add 噬心/断魂 DoTs to attacker |
| 魔妄吞天 (天刹真魔 primary) | On being attacked | Debuff attacker: 天人五衰 (rotating stat reduction) |
| 天煞破虚 (天煞破虚诀 primary) | Per second | Dispel 1 enemy buff; if none, double damage |
| 星猿复灵 (疾风九变 primary) | On 极怒 damage dealt | Heal = x% of damage |
| 不灭魔体 (天刹真魔 platform) | On taking damage | Heal = y% of HP lost |
| 魔骨明心 (天刹真魔 exclusive) | On hit, enemy has debuff | Self healing +x%; reduce enemy final DR |

## 7. State-Referencing Mechanics

Affix behavior depends on a named state created by the platform — the `parent=` cross-reference.

| Affix | References | Behavior |
|-------|-----------|----------|
| 碎魂剑意 | 【寂灭剑心】 | Every 0.5s, damage = shields_destroyed × 600% ATK |
| 星猿之怒 | 【怒意滔天】 | Every 4th tick → bonus lost-HP damage |
| 魔念生息 | 【结魂锁链】 | While active: enemy takes x% max HP/s; raise damage cap |
| 天鹤祈瑞 | 【天鹤之佑】 | Convert final damage bonus % → ATK% damage |
| 天狼战意 | 【天狼之啸】 | Per stack → +x% ATK |
| 魔意震慑 | 【偷取增益】 | Per stolen buff → add 【惧意】ATK reduction |
| 幻象剑灵 (春黎剑阵 primary) | 分身 (clone) | Clone damage taken -x%, damage dealt +y% |
| 魔魂咒界 | 【罗天魔咒】 | Raise proc chance to 60%; add 【命损】on attack |
| 雷阵剑影 | 雷阵 (thunder field) | Field persists +x seconds after skill ends |
| 魔神降世 | Enemy debuff stacks | Per stack → +x% ATK, max 30 stacks |
| 星猿弃天 | 【怒灵降世】 | Extend duration +x seconds; chance to cleanse control |
| 星猿援护 | Shield from platform | Shield value increased; y% chance no HP cost |
| 星猿永生 | 【蛮神】 | Dispel 2 enemy buffs before damage; HP floor at x% |
| 星猿幻杀 | 【镇杀】 | Per hit → add stack; every 2 stacks → x% max HP damage |

---

## Simulator Implications

The combat loop must support all 7 trigger points:

1. **Skill resolution**: passive multipliers (1) and conditional multipliers (2) modify damage before it's dealt
2. **Per-hit processing**: flat additions (3) and escalation apply per damage segment
3. **Post-cast effects**: state creation (4) and cross-skill setup (5) fire after resolution
4. **Opponent's turn**: reactive triggers (6) fire when the entity is attacked
5. **State ticks**: state-referencing mechanics (7) fire on per-second or per-event basis tied to named states

All effects ultimately resolve to mutations on the 4 combat attributes: HP, ATK, SP, DEF.
