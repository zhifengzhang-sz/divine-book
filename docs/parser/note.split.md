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

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
flowchart TD
      A[parseBook] --> B[buildStateRegistry]
      A --> C[parseSkillEffects]
      A --> D[parsePrimaryAffix]

      C --> E{BOOK_PARSERS\nhas entry?}
      E -->|Yes: 天魔降临咒| F[parseTianMoJiangLin]
      E -->|No: 27 books| G[genericSkillParse]

      G --> H[Run SKILL_EXTRACTORS\nagainst joined text]
      H --> I[Filter by grammar\nG4/G5 → self_hp_cost]
      I --> J[enrichWithNamedStates]
      J --> J1[Match effects to\n「name」segments]
      J1 --> J2[Add parent/name/\ndispellable/per_hit_stack]

      J2 --> K[Parse child「name」lines]
      K --> K1[extractDot on\nchild definition text]
      K1 --> K2[Link parent from\nstate registry children]

      K2 --> L{Has tiers?}
      L -->|No| M[resolveFields with\nempty vars]
      M --> M1{数据为没有悟境?}
      M1 -->|Yes| M2[Add data_state:\nenlightenment=0]
      M1 -->|No| M3[Emit rows]

      L -->|Yes| N[For each tier]
      N --> N1{tier.locked?}
      N1 -->|Yes| N2[Emit base_attack\ndata_state: locked]
      N1 -->|No| N3[resolveFields\nwith tier.vars]
      N3 --> N4[Add data_state\nfrom buildDs]
      N4 --> N5[Emit all effects\nfor this tier]
      N5 --> N[Next tier]

      D --> O[Extract affix name\nfrom「name」]
      O --> P{AFFIX_PARSERS\nhas entry?}
      P -->|Yes: compound patterns| Q[Book-specific\naffix parser]
      Q --> R[EffectRows with\nparent or buff_name]
      P -->|No| S[genericAffixParse\nwith defaultParent: this]
      S --> S1[Run AFFIX_EXTRACTORS\nagainst stripped text]
      S1 --> S2[resolveFields\nwith tier.vars]
      S2 --> S3[Add parent: this\nexcept self_buff_extra]

      style F fill:#f9d,stroke:#333
      style G fill:#9df,stroke:#333
      style Q fill:#fd9,stroke:#333
      style S fill:#9fd,stroke:#333

```

>Note: 天魔降临咒 is the only book still using a hand-written skill parser. Its skill has a unique dual-target pattern (结魂锁链 acts as both self_buff and debuff simultaneously) that the extractors don't handle.

>See [note.exclusive.md](note.exclusive.md) for the full generic affix pipeline walkthrough and override inventory.