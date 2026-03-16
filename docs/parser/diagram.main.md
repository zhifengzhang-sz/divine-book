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

# Main Skill Parser — Class Diagrams

## 1. Component Overview

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
graph LR
    A["data/raw/主書.md"] --> B["MD Table Reader\nmd-table.ts"]
    B -- "RawBookEntry[]" --> C["Split Engine\nsplit.ts"]
    D["Book Lookup\nbook-table.ts"] -- "Grammar" --> C
    E["State Extractor\nstates.ts"] --> C
    F["Regex Extractors\nextract.ts"] --> C
    G["Tier Resolver\ntiers.ts"] --> C
    C -- "ParsedBook" --> H["Emitter\nemit.ts"]
    H -- "BookData" --> I["Orchestrator\nindex.ts"]
```

---

## 2. MD Table Reader — `md-table.ts`

Reads raw markdown tables from 主書.md, splits cells into description lines and tier data.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
classDiagram
    class RawBookEntry {
        +name: string
        +school: string
        +skillText: string
        +affixText: string
    }

    class SplitCell {
        +description: string[]
        +tiers: TierLine[]
    }

    class TierLine {
        +raw: string
        +enlightenment?: number
        +fusion?: number
        +locked?: boolean
        +vars: Record~string, number~
    }

    SplitCell *-- TierLine : tiers[]
    RawBookEntry ..> SplitCell : splitCell()
```

---

## 3. Book Lookup — `book-table.ts`

Static mapping of 28 books to grammar types. Hand-maintained.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
classDiagram
    class BOOK_TABLE {
        <<const>>
        +Record~string, BookMeta~
        28 entries
    }

    class BookMeta {
        +grammar: Grammar
        +school: string
    }

    class Grammar {
        <<enumeration>>
        G2 base_attack + effects
        G3 base_attack + named state
        G4 hp_cost + base_attack + effects
        G5 hp_cost + base_attack + named state
        G6 base_attack + cleanse + carry
    }

    BOOK_TABLE *-- BookMeta
    BookMeta *-- Grammar
```

---

## 4. State Extractor — `states.ts`

Scans description text for `【name】` patterns, builds per-book state registry. 16 of 28 books have named states.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
classDiagram
    class StateRegistry {
        <<type alias>>
        Record~string, StateDef~
    }

    class StateDef {
        +target: self | opponent | both
        +duration: number | permanent
        +max_stacks?: number
        +trigger?: on_cast | on_attacked | per_tick
        +chance?: number
        +dispellable?: boolean
        +children?: string[]
        +per_hit_stack?: boolean
    }

    StateRegistry *-- StateDef
```

---

## 5. Regex Extractors — `extract.ts`

99 pattern-matching functions (30 skill + 69 affix). Each takes Chinese text, returns a typed effect or null.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
classDiagram
    class ExtractedEffect {
        +type: string
        +fields: Record~string, string | number~
        +meta?: Record~string, unknown~
    }

    class NamedStateInfo {
        +name: string
        +target: self | opponent | both
        +trigger: on_cast | on_attacked | per_tick
        +duration?: number | permanent
        +maxStacks?: number
        +chance?: number
        +children?: string[]
        +descriptionText: string
    }

    class Extractors {
        <<extract.ts>>
        +extractBaseAttackWithVars(text)$ ExtractedEffect
        +extractPercentHpDamage(text)$ ExtractedEffect
        +extractSelfHpCost(text)$ ExtractedEffect
        +extractDot(text)$ ExtractedEffect
        +extractSummon(text)$ ExtractedEffect
        +extractCounterBuff(text)$ ExtractedEffect
        +extractShield(text)$ ExtractedEffect
        +extractDebuff(text)$ ExtractedEffect
        +extractNamedState(text)$ NamedStateInfo
        ... 90 more
    }

    Extractors ..> ExtractedEffect : produces
    Extractors ..> NamedStateInfo : produces
```

---

## 6. Tier Resolver — `tiers.ts`

Substitutes tier variables (`x=1500, y=11`) into extracted fields, attaches `data_state`.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
classDiagram
    class TierSpec {
        +enlightenment?: number
        +fusion?: number
        +locked?: boolean
        +vars: Record~string, number~
    }

    class TierResolver {
        <<tiers.ts>>
        +buildDataState(tier)$ string | string[]
        +substituteVars(template, vars)$ string
        +resolveFields(fields, vars)$ Record
        +expandTiers(fields, type, tiers)$ Record[]
    }

    TierResolver ..> TierSpec : reads
```

---

## 7. Split Engine + Emitter — `split.ts` / `emit.ts`

Per-book parsers produce `ParsedBook`, emitter converts to `BookData` for downstream consumption. Output types (`EffectRow`, `BookData`, `AffixSection`, `StateDef`) are defined in `lib/data/types.ts` and re-exported by `emit.ts` and `states.ts`.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
classDiagram
    class ParsedBook {
        <<split.ts>>
        +school: string
        +states?: StateRegistry
        +skill: EffectRow[]
        +primaryAffix?: name + effects
    }

    class EffectRow {
        <<lib/data/types.ts>>
        +type: string
        +[k]: unknown
    }

    class BookData {
        <<lib/data/types.ts>>
        +school: string
        +states?: Record~string, StateDef~
        +skill?: EffectRow[]
        +primary_affix?: AffixSection
        +exclusive_affix?: AffixSection
    }

    class StateDef {
        <<lib/data/types.ts>>
        +target: self | opponent | both
        +duration: number | permanent
        +max_stacks?: number
        +trigger?: on_cast | on_attacked | per_tick
        +chance?: number
        +dispellable?: boolean
        +children?: string[]
        +per_hit_stack?: boolean
    }

    class AffixSection {
        <<lib/data/types.ts>>
        +name: string
        +effects: EffectRow[]
    }

    class ParseResult {
        <<index.ts>>
        +books: Record~string, BookData~
        +warnings: string[]
        +errors: string[]
    }

    ParsedBook *-- EffectRow : skill[]
    ParsedBook ..> BookData : emitBooks()
    BookData *-- StateDef : states
    BookData *-- AffixSection
    BookData *-- EffectRow
    ParseResult *-- BookData : books
```

