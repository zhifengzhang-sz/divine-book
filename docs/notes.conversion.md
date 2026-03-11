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

# Markdown to PDF Conversion Notes

> **Scripted version:** Use `scripts/md-to-html.sh` and `scripts/html-to-pdf.sh` at the workspace root.
> The CSS now lives at `style/atom-one-dark.css`. The notes below explain *why* each flag exists.

## Step 1: Markdown → HTML (pandoc)

```bash
pandoc -s -f markdown -t html5 \
  --columns=1000 \
  --css=style/atom-one-dark.css \
  -o output.html \
  input.md
```

Key flags:
- `-s` — standalone HTML with `<head>` and `<body>`
- `--columns=1000` — **critical**: prevents pandoc from injecting `<colgroup>` inline `style="width: XX%"` into tables, which overrides our custom CSS. Without this, any markdown source line longer than the default 72 columns triggers pandoc's width calculation algorithm.
- `--css=style/atom-one-dark.css` — links the Atom One Dark theme CSS file (relative path from the HTML output location)

## Step 2: HTML → PDF (weasyprint)

```bash
weasyprint output.html output.pdf
```

weasyprint replaces the deprecated `wkhtmltopdf` (removed from Ubuntu 24.04+). It handles CSS natively, including dark backgrounds, CJK text, and table formatting.

Install: `pip install weasyprint`

## CSS File (style/atom-one-dark.css)

**Critical requirements**:
- `body { width: 100% !important; margin: 0 !important; }` — makes body fill entire page width with no margins
- `body { background-color: #282c34 !important; }` — Atom One Dark background
- All background colors and critical styles must use `!important` to override pandoc defaults
- For weasyprint, use `@page { margin: 0; size: A4; }` to control page margins and size

## Prerequisites

- `pandoc` (tested with 3.1.11)
- `weasyprint` (`pip install weasyprint`)
- CJK fonts installed (e.g. `Noto Serif CJK SC`, `Noto Sans CJK SC`)

## Why not markdown → PDF directly?

Pandoc's direct PDF engines (xelatex, typst) don't respect CSS styling, and tables with long content overflow the page. The HTML→PDF route preserves all CSS styling including dark backgrounds and table formatting.

## Migration from wkhtmltopdf

`wkhtmltopdf` was deprecated (archived project, depends on unmaintained QtWebKit) and removed from Ubuntu 24.04+. Key differences with weasyprint:

| wkhtmltopdf | weasyprint |
|---|---|
| `-T 0 -B 0 -L 0 -R 0` | `@page { margin: 0; }` in CSS |
| `--disable-smart-shrinking` | Not needed (no shrinking behavior) |
| `--encoding utf-8` | UTF-8 by default |
| `--enable-local-file-access` | Local files accessible by default |
| `--page-size A4` | `@page { size: A4; }` in CSS |
