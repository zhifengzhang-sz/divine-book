#!/usr/bin/env bun
/**
 * Book Vector CLI — per-second factor time series for a single book.
 *
 * Usage:
 *   bun app/book-vector.ts --book 春黎剑阵          # text summary
 *   bun app/book-vector.ts --book 春黎剑阵 --json   # JSON output
 *   bun app/book-vector.ts --list                    # list all book IDs
 */

import { loadBooksYaml } from "../lib/sim/config";
import { computeTimeSeriesVector } from "../lib/construct/book-vector";

// ── Parse args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}
const hasFlag = (name: string) => args.includes(`--${name}`);

const booksYaml = loadBooksYaml();

// ── --list ──────────────────────────────────────────────────────────

if (hasFlag("list")) {
  const ids = Object.keys(booksYaml.books);
  console.log(`Books (${ids.length}):`);
  for (const id of ids) {
    console.log(`  ${id}`);
  }
  process.exit(0);
}

// ── --book ──────────────────────────────────────────────────────────

const bookId = getArg("book");
if (!bookId) {
  console.error("Usage: bun app/book-vector.ts --book <bookId> [--json]");
  console.error("       bun app/book-vector.ts --list");
  process.exit(1);
}

const vector = computeTimeSeriesVector(bookId, booksYaml);

if (hasFlag("json")) {
  console.log(JSON.stringify(vector, null, 2));
  process.exit(0);
}

// ── Text summary ────────────────────────────────────────────────────

console.log(`Book: ${vector.bookId}`);
console.log(`Total duration: ${vector.totalDuration}s`);
console.log(`Slot coverage: ${vector.slotCoverage} slots (6s each)`);
console.log(`Events: ${vector.events.length}`);
console.log();

for (const [factor, values] of Object.entries(vector.factors)) {
  const activeSeconds = values.filter((v) => v !== 0).length;
  const peak = Math.max(...values);
  console.log(`  ${factor}: active=${activeSeconds}s, peak=${peak}`);
}
