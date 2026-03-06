#!/usr/bin/env bun
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";

const ROOT = resolve(".");
const RAW_DIR = join(ROOT, "data/raw");
const NORMALIZED = join(ROOT, "docs/data/normalized.data.md");
const KEYWORD_MAP = join(ROOT, "docs/data/keyword.map.md");
const DATA_YAML = join(ROOT, "data/yaml/effects.yaml");

function extractBacktickTokens(path: string) {
  const txt = readFileSync(path, "utf8");
  const re = /`([^`]+)`/g;
  const set = new Set<string>();
  let m;
  while ((m = re.exec(txt))) set.add(m[1]);
  return [...set].sort();
}

function extractTableFirstColumnBooks(path: string) {
  const txt = readFileSync(path, "utf8");
  const lines = txt.split(/\r?\n/);
  const set = new Set<string>();
  for (const L of lines) {
    const m = L.match(/^\|\s*`([^`]+)`/);
    if (m) set.add(m[1]);
  }
  return [...set].sort();
}

function extractNormalizedHeadings(path: string) {
  const txt = readFileSync(path, "utf8");
  return (txt.match(/^###\s+`([^`]+)`/gm) || []).map((line) => line.replace(/^###\s+`/, "").replace(/`$/, "")).sort();
}

function extractEffectTypesFromNormalized(path: string) {
  const txt = readFileSync(path, "utf8");
  const lines = txt.split(/\r?\n/);
  const set = new Set<string>();
  for (const L of lines) {
    // table rows: | effect_type | fields | data_state |
    if (/^\|/.test(L) && !/^\|:?-{3}/.test(L)) {
      const cols = L.split("|").map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 1) set.add(cols[0]);
    }
  }
  return [...set].sort();
}

function fileSha(path: string) {
  try {
    const out = spawnSync("sha256sum", [path], { encoding: "utf8" });
    if (out.status === 0) return out.stdout.split(" ")[0];
  } catch (e) {}
  return null;
}

function runParser() {
  const tmp = join(ROOT, "tmp-verify-output");
  try { spawnSync("rm", ["-rf", tmp]); } catch(e){}
  spawnSync("mkdir", ["-p", tmp]);
  const out = spawnSync("bun", ["app/parse.ts", NORMALIZED, tmp], { encoding: "utf8" });
  return { code: out.status, stdout: out.stdout || "", stderr: out.stderr || "", tmp };
}

function main() {
  const rawFiles = readdirSync(RAW_DIR).filter((f) => f.endsWith('.md')).map((f) => join(RAW_DIR, f));
  const rawTokens = new Set<string>();
  const rawTableBooks = new Set<string>();
  for (const f of rawFiles) {
    for (const t of extractBacktickTokens(f)) rawTokens.add(t);
    for (const b of extractTableFirstColumnBooks(f)) rawTableBooks.add(b);
  }

  const rawTokensArr = [...rawTokens].sort();
  const rawTableBooksArr = [...rawTableBooks].sort();
  const normalizedHeadings = extractNormalizedHeadings(NORMALIZED);
  const normalizedEffectTypes = extractEffectTypesFromNormalized(NORMALIZED);
  const keywordMap = readFileSync(KEYWORD_MAP, "utf8");

  // coverage checks
  const rawTokensMissingInKeyword = rawTokensArr.filter((t) => !keywordMap.includes(t));
  const effectTypesMissingInKeyword = normalizedEffectTypes.filter((t) => !keywordMap.includes(t));

  // book presence
  const missingBooks = rawTableBooksArr.filter((b) => !normalizedHeadings.includes(b));

  // run parser and compare outputs
  const parser = runParser();
  const effectsShaCurrent = fileSha(DATA_YAML);
  const effectsShaTmp = fileSha(join(parser.tmp, "effects.yaml"));
  const groupsShaCurrent = fileSha(join(ROOT, "data/yaml/groups.yaml"));
  const groupsShaTmp = fileSha(join(parser.tmp, "groups.yaml"));

  const report = {
    rawFiles: rawFiles.map((p) => p.replace(ROOT + '/', '')),
    rawTableBooks: rawTableBooksArr,
    normalizedHeadingsCount: normalizedHeadings.length,
    normalizedHeadingsSample: normalizedHeadings.slice(0, 10),
    missingBooks,
    rawTokensCount: rawTokensArr.length,
    rawTokensMissingInKeywordCount: rawTokensMissingInKeyword.length,
    rawTokensMissingSample: rawTokensMissingInKeyword.slice(0, 50),
    normalizedEffectTypesCount: normalizedEffectTypes.length,
    effectTypesMissingInKeywordCount: effectTypesMissingInKeyword.length,
    effectTypesMissingSample: effectTypesMissingInKeyword.slice(0, 50),
    parser: { code: parser.code, stdout: parser.stdout, stderr: parser.stderr },
    effectsYamlSha: { current: effectsShaCurrent, tmp: effectsShaTmp },
    groupsYamlSha: { current: groupsShaCurrent, tmp: groupsShaTmp },
  };

  const outPath = join(ROOT, "tmp-verify-output", "verify-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ summary: {
    rawTableBooks: rawTableBooksArr.length,
    missingBooks: missingBooks.length,
    rawTokens: rawTokensArr.length,
    rawTokensMissingInKeyword: rawTokensMissingInKeyword.length,
    normalizedEffectTypes: normalizedEffectTypes.length,
    effectTypesMissingInKeyword: effectTypesMissingInKeyword.length,
    parserExit: parser.code,
    effectsYamlSame: effectsShaCurrent && effectsShaCurrent === effectsShaTmp,
    groupsYamlSame: groupsShaCurrent && groupsShaCurrent === groupsShaTmp,
  } }, null, 2));
  console.log(`Full report written to ${outPath}`);
}

main();
