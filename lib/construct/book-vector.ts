/**
 * Book Vector — per-second factor time series for a single book.
 *
 * Given a book ID, collects all effects (skill + primary affix + exclusive affix),
 * maps each to a TemporalEvent, then samples per-second factor values.
 *
 * Implements time-series model §3.1–3.4 at the single-book level.
 */

import type { BooksYaml } from "../data/store.js";
import type { EffectWithMeta } from "../data/types";

// ── Public types ───────────────────────────────────────────────────

export interface TemporalEvent {
  tStart: number;
  duration: number; // Infinity for permanent
  factor: string; // effect type
  value: number; // primary numeric value while active
  sourceType: string; // original effect type
}

export interface TimeSeriesVector {
  bookId: string;
  factors: Record<string, number[]>; // factor name → per-second values
  totalDuration: number; // max finite duration across all events
  slotCoverage: number; // ceil(totalDuration / 6)
  events: TemporalEvent[]; // raw events for debugging
}

// ── Value extraction ───────────────────────────────────────────────

/** Known numeric field names in order of preference */
const VALUE_FIELDS = [
  "value",
  "total",
  "damage",
  "percent",
  "damage_per_tick",
  "inherit_stats",
  "multiplier",
  "hits",
  "interval",
  "stun_duration",
  "damage_buff",
  "damage_taken_reduction_to",
  "shields_per_hit",
  "percent_max_hp",
  "cap_vs_monster",
] as const;

/**
 * Best-effort extraction of the primary numeric value from an effect.
 * Scans known field names, returns the first numeric value found.
 * Falls back to 1 as a presence indicator.
 */
function extractValue(effect: EffectWithMeta): number {
  const rec = effect as Record<string, unknown>;
  for (const field of VALUE_FIELDS) {
    const v = rec[field];
    if (typeof v === "number") return v;
  }
  return 1;
}

// ── Duration extraction ────────────────────────────────────────────

function extractDuration(effect: EffectWithMeta): number {
  const rec = effect as Record<string, unknown>;
  if (typeof rec.duration === "number") return rec.duration;
  return Infinity;
}

// ── Core computation ───────────────────────────────────────────────

export function computeTimeSeriesVector(
  bookId: string,
  booksYaml: BooksYaml,
): TimeSeriesVector {
  const book = booksYaml.books[bookId];
  if (!book) {
    throw new Error(`Book "${bookId}" not found in books.yaml`);
  }

  // 1. Collect all effects
  const allEffects: EffectWithMeta[] = [
    ...(book.skill ?? []),
    ...(book.primary_affix?.effects ?? []),
    ...(book.exclusive_affix?.effects ?? []),
  ];

  // 2. Create temporal events
  const events: TemporalEvent[] = allEffects.map((effect) => ({
    tStart: 0,
    duration: extractDuration(effect),
    factor: effect.type,
    value: extractValue(effect),
    sourceType: effect.type,
  }));

  // 3. Determine total duration
  const finiteDurations = events
    .map((e) => e.duration)
    .filter((d) => Number.isFinite(d));
  let totalDuration = finiteDurations.length > 0 ? Math.max(...finiteDurations) : 0;
  if (totalDuration === 0) totalDuration = 1;

  // 4. Sample per-second values
  const factors: Record<string, number[]> = {};

  for (const event of events) {
    if (!factors[event.factor]) {
      factors[event.factor] = new Array(totalDuration).fill(0);
    }
  }

  for (let t = 0; t < totalDuration; t++) {
    for (const event of events) {
      if (t >= event.tStart && t < event.tStart + event.duration) {
        factors[event.factor][t] += event.value;
      }
    }
  }

  // 5. Slot coverage
  const slotCoverage = Math.ceil(totalDuration / 6);

  return {
    bookId,
    factors,
    totalDuration,
    slotCoverage,
    events,
  };
}
