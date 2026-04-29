# Divine Book Editor Plugin

## Contract

Exported from `@divine-book/lib/plugin` (`lib/ui/plugin.tsx`):

```ts
export const divineBookPlugin = {
  id: "divine-book",
  name: "灵書",
  icon: "📖",
  description: "Skill books, affixes, and 通玄 data editor",
  Editor: DivineBookEditor,
};
```

### Data types

Defined in `lib/ui/editor/types.ts`, exported through `plugin.tsx`:

```ts
interface EditorData {
  version: number;
  books: Record<string, RawBookData>;
  affixes: {
    universal: Record<string, RawAffixData>;
    school: Record<string, Record<string, RawAffixData>>;
  };
}

interface RawBookData {
  school: string;
  skill: { text: string; effects: object[] };
  primaryAffix?: { name: string; text: string; effects: object[] };
  exclusiveAffix?: { name: string; text: string; effects: object[] };
  xuan?: { text: string; effects: object[] };
}

interface RawAffixData {
  text: string;
  effects: object[];
}
```

### Editor component props

```ts
// Required — provided by platform or standalone dev server
data: EditorData;
onUpdate: (data: EditorData) => void;

// Optional — platform save UX integration
dirty?: boolean;
saveStatus?: "idle" | "saving" | "saved";
onSave?: () => void;
```

### Server API requirements

The plugin's `TextBlock` component calls `/api/parse` for live parsing. The host (platform or dev server) must implement:

| Route | Method | Request body | Response |
|-------|--------|-------------|----------|
| `/api/parse` | POST | `{ grammarName, text, entryPoint }` | `{ effects, error? }` |

Data persistence routes (`/api/data`, `/api/save`, `/api/gen-yaml`) are host responsibilities — the plugin does not call them directly.

### Package exports

```json
{
  "name": "@divine-book/lib",
  "exports": {
    "./plugin": "./ui/plugin.tsx"
  }
}
```

## Internal structure

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
flowchart TD
    subgraph plugin["lib/ui/plugin.tsx"]
        P[divineBookPlugin]
    end

    subgraph editor["lib/ui/editor/"]
        Types["types.ts<br/><i>EditorData, RawBookData, RawAffixData</i>"]
        Shell["EditorShell.tsx<br/><i>mode tabs, selectors, save button</i>"]
        Book["BookEditor.tsx<br/><i>skill + primary/exclusive affix + xuan</i>"]
        Affix["AffixEditor.tsx<br/><i>single affix text + effects</i>"]
        TB["TextBlock.tsx<br/><i>textarea + auto-parse (two-pane)</i>"]
        EP["EffectsPreview.tsx<br/><i>renders parsed effect objects</i>"]
        Theme["theme.ts + rpg.css<br/><i>color tokens, RPG component styles</i>"]
    end

    P --> Shell
    Types -.-> Shell
    Types -.-> Book
    Types -.-> Affix
    Shell --> Book
    Shell --> Affix
    Book --> TB
    Affix --> TB
    TB --> EP
    TB -- "POST /api/parse" --> API["Host API"]
    Theme -.-> Shell
    Theme -.-> TB
    Theme -.-> Affix
    Theme -.-> EP
```

## Data flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3e44514D', 'primaryTextColor': '#abb2bf', 'primaryBorderColor': '#4b5263', 'lineColor': '#61afef', 'secondaryColor': '#2c313a4D', 'secondaryTextColor': '#abb2bf', 'secondaryBorderColor': '#4b5263', 'tertiaryColor': '#282c344D', 'mainBkg': '#3e44514D', 'nodeBorder': '#4b5263', 'clusterBkg': '#2c313a4D', 'clusterBorder': '#4b5263', 'titleColor': '#e5c07b', 'edgeLabelBackground': '#282c34', 'textColor': '#abb2bf', 'background': '#282c34'}}}%%
sequenceDiagram
    participant Host as Host (platform or dev server)
    participant Shell as EditorShell
    participant Book as BookEditor / AffixEditor
    participant TB as TextBlock
    participant API as /api/parse

    Host->>Shell: data, onUpdate
    Shell->>Book: book/affix data, onUpdate
    Book->>TB: text, effects, onTextChange, onEffectsUpdate

    Note over TB: user edits text
    TB->>TB: 500ms debounce
    TB->>API: POST { grammarName, text, entryPoint }
    API-->>TB: { effects }
    TB->>Book: onEffectsUpdate(effects)
    Book->>Shell: onUpdate(updatedBook)
    Shell->>Host: onUpdate(updatedEditorData)
```

## Standalone dev server

`app/editor/` wraps the plugin for independent development:

- `src/App.tsx` — loads data via `fetch("/api/data")`, tracks dirty/save state, renders `EditorShell`
- `src/{BookEditor,AffixEditor,TextBlock,EffectsPreview,theme}.tsx` — re-export from `lib/ui/editor/`
- `serve.ts` — Bun server: implements `/api/parse`, `/api/data`, `/api/save`, `/api/gen-yaml` + static file serving

Run with `bun run editor` (port 3002).
