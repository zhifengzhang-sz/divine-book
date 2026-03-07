# style/ — Shared Style Templates

## Creating a New Markdown File

1. **Paste the IDE preview header.** Copy the contents of `md-header.html` and paste it at the very top of your new `.md` file (before the `#` title). This gives you Atom One Dark styling when previewing in VS Code / Cursor.

2. **Style mermaid diagrams.** Paste the contents of `mermaid-theme.txt` as the **first line** inside each mermaid code block:

   ````markdown
   ```mermaid
   %%{init: {'theme': 'base', 'themeVariables': {…}}}%%
   flowchart LR
       A --> B
   ```
   ````

   Mermaid does not support global theme configuration in static markdown — each diagram needs its own `%%{init:…}%%` line.

## Generating PDFs

Use the wrapper scripts at the workspace root:

```bash
scripts/md-to-html.sh path/to/file.md        # → file.html
scripts/html-to-pdf.sh path/to/file.html      # → file.pdf
```

The HTML step uses `atom-one-dark.css` (the PDF variant with `width: 100%` and zero margins). Override the style directory with `FFF_STYLE_DIR`.

## Files

| File | Purpose |
|------|---------|
| `md-header.html` | `<style>` block for IDE preview (95% width, centered) |
| `mermaid-theme.txt` | `%%{init:…}%%` one-liner for mermaid diagrams |
| `atom-one-dark.css` | Atom One Dark CSS for PDF conversion (100% width, zero margins) |
| `header.tex` | LaTeX table packages (unused, preserved) |
| `custom.css` | Light-theme CSS (legacy) |
