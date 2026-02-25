---
initial date: 2026-2-23
dates of modification: [2026-2-23]
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


# 灵书 (Divine Book)
**Authors:** Z. Zhang

>The divine book system is from the game 《凡人修仙传人界篇手游》. The data is collected from the game without modification and stored in [about.md](../data/raw/about.md).

## Data
### Raw data
The [about.md](../data/raw/about.md) is the single source of true. This file is updated periodically as we acquire more data from the game.

### Normalized data

#### Keywords
Variant expressions in [about.md](../data/raw/about.md) (e.g. "大幅提升攻击力104%", "使攻击力提升104%") are normalized to stable patterns defined in [关键词组](./关键词组.md).

**衍生文档**
- 效果类型：[effect.types.md](./effect.types.md) + [effect.ts](../lib/schemas/effect.ts)（69种类型）
- 验证实例：[effects.yaml](../data/yaml/effects.yaml)

### Pipeline
The practical problems for the raw data [about.md](../data/raw/about.md) is that
1. volatile wording
2. frequent updating


To solve the problems, we need a data pipeline 
Pipeline role: [about.md](../data/raw/about.md) (volatile wording) → [关键词组.md](./关键词组.md) and [灵书数据全览.md](./灵书数据全览.md) (stable patterns) → `effects.yaml` (structured data)


## Combat theory
[combat.md](./combat.md):

> This document feeds into [domain.md](domain.md) §6 (model parameter provenance) and [design.md](design.md) (vector pipeline architecture).