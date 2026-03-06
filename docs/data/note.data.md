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

**Top-level logic (framework)**
- Source prose: `data/raw/*.md` (primary sources: `data/raw/about.md`, `data/raw/主书.md`). See: `docs/data/design.md` and `.claude/commands/extract.md` for extraction rationale and prompts.
- Extraction: an LLM extraction agent converts raw prose → `docs/data/normalized.data.md` (strict markdown tables) using `docs/data/keyword.map.md` as the language decoder. See `docs/data/usage.dev.md` and `docs/data/usage.parser.md`.
- Parsing: `app/parse.ts` (library: `lib/parse.ts`) converts `docs/data/normalized.data.md` → `data/yaml/effects.yaml` + `data/yaml/groups.yaml` and validates rows against Zod schemas (`lib/schemas/effect.ts`). Validation failures/warnings are surfaced and should block data commits.
- Registry generation: `app/generate.ts` (uses `lib/domain/registry.ts`) produces `docs/data/keyword.map.md` and `data/yaml/groups.yaml` (registry → documentation mapping).

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
2. If you add new keywords/affix names, update/generate the keyword map: `bun app/generate.ts`.
3. Regenerate `docs/data/normalized.data.md` (extraction): run the LLM extraction agent that converts `data/raw/*.md` → `docs/data/normalized.data.md` using `docs/data/keyword.map.md` as the decoding spec (see `.claude/commands/extract.md`). If you don't run the agent, update `docs/data/normalized.data.md` manually to reflect the new raw entries.
4. Parse and validate: `bun app/parse.ts docs/data/normalized.data.md data/yaml`.
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
