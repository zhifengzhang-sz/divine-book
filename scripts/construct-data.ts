/**
 * construct-data.ts — orchestrator that gathers all construction data
 * into a context.json file for build planning.
 *
 * Usage:
 *   bun scripts/construct-data.ts --character "剑九" --scenario "pvp vs stronger"
 *   bun scripts/construct-data.ts --character "剑九" --scenario "pvp vs stronger" --school Sword
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadBooksYaml,
  loadAffixesYaml,
  type BooksYaml,
  type AffixesYaml,
} from "../lib/sim/config";
import { getPlatformFunctions, FUNCTION_CATALOG } from "../lib/construct/function-catalog";
import { rankCombos, type ComboRank } from "../lib/construct/function-combos";
import { computeTimeSeriesVector } from "../lib/construct/book-vector";

// ── Arg parsing ───────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const character = getArg("character");
const scenario = getArg("scenario");
const school = getArg("school");

if (!character || !scenario) {
  console.error("Usage: bun scripts/construct-data.ts --character <name> --scenario <desc> [--school <school>]");
  process.exit(1);
}

// ── Types ─────────────────────────────────────────────────────────

interface EffectSummary {
  type: string;
  name?: string;
  value?: number;
  duration?: number;
  target: "enemy" | "self";
}

interface AffixSummary {
  name: string;
  effects: EffectSummary[];
}

interface PlatformEntry {
  school: string;
  dBase: number;
  hits: number;
  skillEffects: EffectSummary[];
  primaryAffix: AffixSummary | null;
  exclusiveAffix: AffixSummary | null;
  archetypes: string[];
  nativeFunctions: string[];
}

interface AffixPool {
  universal: string[];
  school: Record<string, string[]>;
  exclusive: Record<string, { name: string }>;
}

interface ContextOutput {
  meta: { character: string; scenario: string; school?: string; generatedAt: string };
  platforms: Record<string, PlatformEntry>;
  affixPool: AffixPool;
  functionRankings: Record<string, Record<string, ComboRank[]>>;
  timeSeriesVectors: Record<string, { factors: Record<string, number[]>; totalDuration: number; slotCoverage: number }>;
  constraints: {
    rules: { type: string; description: string }[];
    usedBooks: string[];
  };
}

// ── Effect summary mapping ────────────────────────────────────────

const DAMAGE_TYPES = [
  "base_attack",
  "flat_extra_damage",
  "percent_max_hp_damage",
  "percent_current_hp_damage",
  "dot",
  "dot_permanent_max_hp",
  "delayed_burst",
  "counter_damage",
  "self_lost_hp_damage",
  "per_debuff_stack_damage",
  "true_damage",
];

function toEffectSummary(e: Record<string, unknown>): EffectSummary {
  return {
    type: e.type as string,
    name: (e.state_name ?? e.name ?? undefined) as string | undefined,
    value: (e.total ?? e.value ?? e.percent ?? e.damage ?? undefined) as number | undefined,
    duration: (e.duration ?? undefined) as number | undefined,
    target: DAMAGE_TYPES.includes(e.type as string) ? "enemy" : "self",
  };
}

function toAffixSummary(affix: { name: string; effects: Record<string, unknown>[] }): AffixSummary {
  return {
    name: affix.name,
    effects: affix.effects.map(toEffectSummary),
  };
}

// ── Main ──────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dir, "..");

const booksYaml = loadBooksYaml(resolve(ROOT, "data/yaml/books.yaml"));
const affixesYaml = loadAffixesYaml(resolve(ROOT, "data/yaml/affixes.yaml"));

// 1. Build platform entries for each book
const platforms: Record<string, PlatformEntry> = {};

for (const [bookId, book] of Object.entries(booksYaml.books)) {
  const skillEffects = (book.skill ?? []).map((e) => toEffectSummary(e as Record<string, unknown>));

  // Extract dBase: sum of base_attack totals
  let dBase = 0;
  let hits = 0;
  for (const e of book.skill ?? []) {
    const rec = e as Record<string, unknown>;
    if (rec.type === "base_attack") {
      dBase += typeof rec.total === "number" ? rec.total : 0;
      if (typeof rec.hits === "number" && rec.hits > hits) hits = rec.hits;
    }
  }

  platforms[bookId] = {
    school: book.school,
    dBase,
    hits,
    skillEffects,
    primaryAffix: book.primary_affix
      ? toAffixSummary(book.primary_affix as { name: string; effects: Record<string, unknown>[] })
      : null,
    exclusiveAffix: book.exclusive_affix
      ? toAffixSummary(book.exclusive_affix as { name: string; effects: Record<string, unknown>[] })
      : null,
    archetypes: [],
    nativeFunctions: getPlatformFunctions(bookId),
  };
}

// If --school is provided, log which books are prioritized
if (school) {
  const prioritized = Object.entries(platforms).filter(([, p]) => p.school === school).map(([id]) => id);
  const cross = Object.entries(platforms).filter(([, p]) => p.school !== school).map(([id]) => id);
  console.log(`School filter: ${school}`);
  console.log(`  Prioritized (${prioritized.length}): ${prioritized.join(", ")}`);
  console.log(`  Cross-school (${cross.length}): ${cross.join(", ")}`);
}

// 2. Collect affix pool
const affixPool: AffixPool = {
  universal: Object.keys(affixesYaml.universal),
  school: {},
  exclusive: {},
};

for (const [schoolName, affixes] of Object.entries(affixesYaml.school)) {
  affixPool.school[schoolName] = Object.keys(affixes);
}

for (const [bookId, book] of Object.entries(booksYaml.books)) {
  if (book.exclusive_affix) {
    affixPool.exclusive[bookId] = { name: book.exclusive_affix.name };
  }
}

// 3. Generate function rankings
const functionRankings: Record<string, Record<string, ComboRank[]>> = {};

for (const [fnId, fn] of Object.entries(FUNCTION_CATALOG)) {
  const matchingPlatforms = fn.nativePlatforms.filter((p) => platforms[p]);
  if (matchingPlatforms.length === 0) continue;

  functionRankings[fnId] = {};
  for (const platformId of matchingPlatforms) {
    functionRankings[fnId][platformId] = rankCombos(fnId, platformId, booksYaml, affixesYaml, 5);
  }
}

// 4. Generate time-series vectors (strip events for compactness)
const timeSeriesVectors: Record<string, { factors: Record<string, number[]>; totalDuration: number; slotCoverage: number }> = {};

for (const bookId of Object.keys(platforms)) {
  const vec = computeTimeSeriesVector(bookId, booksYaml);
  timeSeriesVectors[bookId] = {
    factors: vec.factors,
    totalDuration: vec.totalDuration,
    slotCoverage: vec.slotCoverage,
  };
}

// 5. Constraints
const constraints = {
  rules: [
    { type: "no_duplicate_main_gongfa", description: "Same 功法 in 主位 across two 灵书 → later skill disabled" },
    { type: "no_duplicate_aux_gongfa", description: "Same 功法 in 辅位 across two 灵書 → later affix disabled" },
  ],
  usedBooks: [] as string[],
};

// 6. Assemble output
const output: ContextOutput = {
  meta: {
    character,
    scenario,
    ...(school ? { school } : {}),
    generatedAt: new Date().toISOString(),
  },
  platforms,
  affixPool,
  functionRankings,
  timeSeriesVectors,
  constraints,
};

// 7. Write to disk
const slug = `${character}-${scenario.toLowerCase().replace(/\s+/g, "-")}`;
const outDir = resolve(ROOT, "data/builds", slug);
mkdirSync(outDir, { recursive: true });

const outPath = resolve(outDir, "context.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

// Report
const platformCount = Object.keys(platforms).length;
const fnCount = Object.keys(functionRankings).length;
const vecCount = Object.keys(timeSeriesVectors).length;
const size = Buffer.byteLength(JSON.stringify(output, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(`  Platforms: ${platformCount}`);
console.log(`  Function rankings: ${fnCount} functions`);
console.log(`  Time-series vectors: ${vecCount} books`);
console.log(`  File size: ${(size / 1024).toFixed(1)} KB`);
