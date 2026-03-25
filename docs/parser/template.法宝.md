---
initial date: 2026-03-24
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

# 法宝 Markdown Template

---

## Template

```markdown
---
title: <name>
category: 法宝
tool: <classification>
full-rank: <max quality and rank>
---

## 基础属性

<flavor text>

### <ability 1 name>

- <stat/effect line with variables>
- <stat/effect line with variables>

### <ability 2 name>

- <effect description with variables>
- <effect description with variables>

### Tiers

<star>星：<var>=<value>, <var>=<value>, ...
<star>星：<var>=<value>, <var>=<value>, ...

## 活动

### <activity 1 name>

- <activity effect with variables>

### Tiers

<star>星：<var>=<value>, ...

## 定义

1. <term>：<definition>
2. <term>：<definition>
```

---

## Example: 芭蕉扇

```markdown
---
title: 芭蕉扇
category: 法宝
tool: 古-先天-芭蕉扇
full-rank: 品质：十星，品阶：五十阶
---

## 基础属性

（用力一扇将群猴扇飞）我送你们这些畜生上西天！

### 扇动乾坤

- `铁扇之力`+a%
- `天资加成`+b%
- `神识加成`+b%（神识属性解锁时，解锁神识加成效果）
- 全体`仙侣``战斗力`属性+b%

### 风卷残云

- 进入战斗后召唤芭蕉扇施放`风卷`：提升自身`最大攻击`和`最大气血`各c%，并降低目标`最大气血`和`最大灵力`各c%，持续至战斗结束，该效果无法被清除或免疫
- 每d秒芭蕉扇施放一次`煽风`，震慑目标，使其无法主动攻击，持续e秒
- `煽风`持续期间f%`复制`自身造成的`伤害`值
- `煽风`结束后施放`焚天`，将`复制伤害`值转化为g段`伤害`并再次`攻击`目标，该`伤害`为`真实伤害`

### Tiers

一星：a=10, b=2, c=10, d=22, e=6, f=100, g=10
五星：a=18, b=4, c=55, d=22, e=6, f=100, g=30
十星：a=28, b=6, c=55, d=22, e=6, f=100, g=30

## 活动

### 丹道问鼎/社团丹道

- 活动持续期间，前h次使用，获得5倍收益，可受其他增益加成

### 云梦试剑（烈焰焚风）

- 活动持续期间，每次`挑战`成功时，i%添加1层`烈焰`，每层`烈焰`提升10%`连击次数`概率，最多叠加5层
- 叠加五层后，消耗所有层数，额外获得（芭蕉扇星级）*500+（已激活法相种数）*500+1000 的`个人榜单积分`，并获得1层`焚风`
- 积攒10层`焚风`后，召唤芭蕉扇煽风，随机`狙击`已上榜j名`玩家`
- 首次触发`焚风`，随机获得`灵石`3888/5888/8888/18888枚

### 灵宠竟武/社团灵宠（五星起）

- 活动持续期间，前h次使用，获得5倍收益，可受其他增幅加成

### 洗灵证武/社团洗灵（十星起）

- 活动持续期间，前h次使用，获得5倍收益，可受其他增幅加成

### Tiers

一星：h=20, i=10, j=20
五星：h=40, i=30, j=60
十星：h=65, i=55, j=110

## 定义

1. `连击次数`：每次`挑战`后，可额外`挑战`1次，可受其他增幅加成（`连击`无法叠加`烈焰`）
2. `烈焰焚风`：`云梦试剑`活动神通，通过`挑战`成功叠加`烈焰`层数，满5层后获得`焚风`并狙击上榜玩家
```

---

## Example: 混铁叉

```markdown
---
title: 混铁叉
category: 法宝
tool: 古-先天-混铁叉
full-rank: 品质：五星，品阶：五十阶
---

## 基础属性

啊？拿我的叉子烤鸡翅膀？

### 噬魂魔叉

- 进入战斗后，召唤`魔叉`施放九道`魔焰`攻击敌方，每次施放神通后，`魔焰`随机攻击1-9次，伤害为神通伤害的a%

### 狂牛贯日

- `牛魔王之力`+b%
- `仙侣`装配后，`法宝总战力`+c%
- `仙侣`装配后，`炼体总战力`+d%

### Tiers

一星：a=50, b=10, c=4, d=5
二星：a=90, b=15, c=6, d=8
三星：a=90, b=20, c=8, d=11
四星：a=90, b=25, c=10, d=14
五星：a=90, b=30, c=12, d=17

## 活动

### 魔道入侵（魔叉锁魂）

- 活动持续期间，使用`魔叉`施展`魔气`助阵收索：每次使用`探查符`探查到`仙品`以上怪物时，e%概率额外叠加1层`魔气`，每次叠加`魔气`，额外获得f`个人榜单积分`，叠加10层`魔气`后，立即探查到g只`仙品``怪物`

### Tiers

一星：e=10, f=1000, g=10
二星：e=15, f=2000, g=15
三星：e=20, f=3000, g=20
四星：e=25, f=4000, g=25
五星：e=30, f=5000, g=30

## 定义

1. `魔焰`：`混铁叉`召唤的攻击效果，随机攻击1-9次
2. `魔气`：`魔道入侵`活动中的叠加层数，叠加10层可触发额外效果
```

---

## Design Principles

1. **Effect text appears once** — with variable references (a, b, c...) instead of concrete numbers
2. **Tier lines at end of each section** — `N星：var=value, var=value`
3. **Same `tiers.ts` resolves variables** — the existing pipeline works directly
4. **One grammar for all 法宝** — the document structure is standardized
5. **Activities are separate from combat** — `## 活动` section with its own tiers
6. **Definitions capture game jargon** — `## 定义` section for terms specific to this instrument
7. **Abilities that unlock at higher stars** — noted with `（N星起）` in the ability name

## Structure

### Document layout

```
## 基础属性
  flavor text
  ### <named state 1>     ← state name from heading, effects from body
    - effect lines
  ### <named state 2>
    - effect lines
  ### Tiers               ← reserved heading, not a state
    N星：var=value, ...

## 定义                    ← keyword definitions used in effect text
  1. `keyword`：definition
```

### Named states

Each `### ` heading under `## 基础属性` defines a **named state** of the instrument.
The heading text IS the state name. The `- ` lines under it are the effects of that state.

For 混铁叉: two named states — `噬魂魔叉` (combat summon) and `狂牛贯日` (stat buffs).

### Definitions

The `## 定义` section defines **keywords** — game-specific terms used in the effect text.
These are essential for understanding what `魔焰`, `煽风`, `焚天` mean in the effect descriptions.
The parser captures them as structured data alongside the effects.

### Grammar rule mapping

```
法宝.ohm:
  document = flavorText namedState+ tiersBlock definitionBlock?

  namedState = "### " stateHeading "\n" ws effectLine+
  stateHeading = ~"Tiers" (~"\n" any)+      ← heading text is the state name
  effectLine = "- " effectText "\n" ws

  tiersBlock = "### Tiers\n" ws tierLine+
  tierLine = tierLabel "：" varAssignment ("," varAssignment)*

  definitionBlock = "## 定义\n" ws definitionEntry+
  definitionEntry = N. `keyword`：definition text
```

One grammar for ALL instruments. The grammar matches the template structure.
Semantics extract: state names, effect text per state, tier values, keyword definitions.
