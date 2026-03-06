# Data Pipeline — notes

Purpose: short reference for the pipeline framework, data generation commands, and verification tools.

---
initial date: 2026-03-06
dates of modification: [2026-03-06]
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

# Data Pipeline — notes

Purpose: short reference for the pipeline framework, data generation commands, and verification tools. This note is a compact companion to the full docs referenced below.

**Top-level concepts & relationships**

- **Source**: `data/raw/*.md` — human-authored Chinese prose (authoritative content).
- **Keywords**: `docs/data/keyword.map.cn.md` (primary CN spec) and `docs/data/keyword.map.md` (EN). These map Chinese patterns → canonical effect types and field names; they are generated from the TypeScript `Registry` (`bun app/generate.ts`) and may be edited by authors to improve extraction.
- **Normalized data**: `docs/data/normalized.data.cn.md` and `docs/data/normalized.data.md` — strict markdown tables (one row per effect × data_state). Produced by the extraction step that decodes Source using Keywords; reviewable and editable by humans if necessary.
- **Structured data (YAML)**: `data/yaml/effects.yaml` and `data/yaml/groups.yaml` — parser output from Normalized; validated by Zod schemas and consumed by downstream code and analysis.

Relationships (logical):
- `Keywords` are the decoding specification used to interpret `Source`.
- `Normalized = Extract(Source, Keywords)` — the extractor must run after `docs/data/keyword.map.cn.md` is up-to-date.
- `Structured = Parse(Normalized)` — the parser validates rows and emits the canonical YAML.
- Change flows:
  - Registry changes → regenerate `Keywords` (`bun app/generate.ts`) → re-run extraction or update `Normalized` → re-parse.
  - Source changes → re-run extraction (using current `Keywords`) → re-parse.

Practical rules:
- Ensure `docs/data/keyword.map.cn.md` is current before extraction.
- Treat `Source` and `Registry` as primary authoring inputs; `Keywords` bridge code and content.
- Prefer running the extractor; edit `Normalized` manually only when necessary.


**How to generate data (commands)**
- Regenerate registry-derived artifacts (keyword map, groups):
```
bun app/generate.ts
```
- Parse normalized data into YAML (validation):
```
bun app/parse.ts docs/data/normalized.data.md data/yaml
```
- Notes: parser prints validation warnings and exits non-zero on failures — see `docs/data/usage.parser.md` for policies.

**Verification: tools & usage (how-to)**
- Programmatic verification script:
	- `scripts/verify-pipeline.ts` — runs the parser, computes output checksums, and checks coverage:
		1) raw table book names present in `docs/data/normalized.data.md`
		2) backtick token coverage vs `docs/data/keyword.map.md`
		3) normalized effect-type coverage vs `keyword.map`
	- Output: `tmp-verify-output/verify-report.json` (machine-readable summary).
- Convenience workflow (generate → parse → tests → verify):
```
bash scripts/run-verify.sh
```
- CI: `.github/workflows/verify.yml` runs the convenience script on PRs/branches.

**Recommended short workflow when adding books**
1. Edit `data/raw/主书.md` (add table rows for new books or adjust parameters).
2. If you changed the TypeScript registry (affix/effect definitions) or made a persistent vocabulary change, run the generator to update the keyword maps: `bun app/generate.ts` — this writes `docs/data/keyword.map.md` and `docs/data/keyword.map.cn.md`.
3. Run the extraction agent (or update normalized files manually): the extractor reads `data/raw/*.md` and `docs/data/keyword.map.cn.md` (CN spec) and writes `docs/data/normalized.data.cn.md` and `docs/data/normalized.data.md`. The extractor must be run after the CN keyword map is current.
4. Parse and validate: `bun app/parse.ts docs/data/normalized.data.md data/yaml`.
5. Run verification: `bun scripts/verify-pipeline.ts` or `bash scripts/run-verify.sh`.
6. Inspect `tmp-verify-output/verify-report.json` for:
5. Run verification: `bun scripts/verify-pipeline.ts` or `bash scripts/run-verify.sh`.
6. Inspect `tmp-verify-output/verify-report.json` for:
	 - `missingBooks` (raw vs normalized)
	 - `rawTokensMissingInKeyword` (tokens to add to `keyword.map.md`)
	 - `effectTypesMissingInKeyword` (effect types not covered by keyword map)
	 - parser exit code and SHA diffs for `effects.yaml` / `groups.yaml`.

**Bottom notes & conventions**
- Keep `docs/data/keyword.map.md` as the authoritative parsing specification — add Chinese patterns there before running extraction to improve deterministic extraction.
- Validation rule: zero warnings/errors required before committing changes to `lib/` or `data/yaml` (see `docs/data/usage.parser.md`).

**Authors:** Z. Zhang
