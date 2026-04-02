/**
 * @divine-book/lib — module facade for the divine book combat system.
 *
 * Sub-module re-exports for use by consuming projects:
 *   import { data, parser, sim, construct } from '@divine-book/lib';
 *
 * Or import sub-modules directly:
 *   import { loadBooksYaml } from '@divine-book/lib/data';
 *   import { playerMachine } from '@divine-book/lib/sim';
 */

export * as parser from "./parser/index.js";
export * as data from "./data/store.js";
export * as sim from "./sim/index.js";
export * as construct from "./construct/index.js";
export type * from "./data/types.js";
