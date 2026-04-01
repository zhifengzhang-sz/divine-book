/**
 * Post-parse Zod validation — runs after YAML generation to catch
 * type mismatches, missing fields, and structural errors.
 *
 * Exit code 0 = all pass, 1 = failures found.
 */
import { parseEffect } from "../lib/parser/schema/effects.js";
import { readFileSync } from "fs";
import { parse } from "yaml";

const books = parse(readFileSync("data/yaml/books.yaml", "utf-8"));
const affixes = parse(readFileSync("data/yaml/affixes.yaml", "utf-8"));

let total = 0, pass = 0, fail = 0;

// Validate book effects
for (const [name, book] of Object.entries(books.books) as [string, any][]) {
  for (const section of ["skill", "primary_affix", "exclusive_affix"] as const) {
    const effects = section === "skill" ? book[section] : book[section]?.effects;
    if (!effects) continue;
    for (const [i, effect] of effects.entries()) {
      total++;
      try {
        parseEffect(effect);
        pass++;
      } catch (err: any) {
        fail++;
        console.error(`FAIL ${name} ${section}[${i}] ${effect.type}: ${err.message.slice(0, 120)}`);
      }
    }
  }
}

// Validate universal affixes
for (const [name, affix] of Object.entries((affixes.universal || {}) as Record<string, any>)) {
  for (const [i, effect] of (affix.effects || []).entries()) {
    total++;
    try {
      parseEffect(effect);
      pass++;
    } catch (err: any) {
      fail++;
      console.error(`FAIL universal/${name}[${i}] ${effect.type}: ${err.message.slice(0, 120)}`);
    }
  }
}

// Validate school affixes
for (const [school, map] of Object.entries((affixes.school || {}) as Record<string, any>)) {
  for (const [name, affix] of Object.entries(map as Record<string, any>)) {
    for (const [i, effect] of ((affix as any).effects || []).entries()) {
      total++;
      try {
        parseEffect(effect);
        pass++;
      } catch (err: any) {
        fail++;
        console.error(`FAIL ${school}/${name}[${i}] ${effect.type}: ${err.message.slice(0, 120)}`);
      }
    }
  }
}

console.log(`Zod validation: ${total} effects, ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
