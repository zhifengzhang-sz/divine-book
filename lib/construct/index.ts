/**
 * Construction system public API — build optimization algorithms.
 */

export { computeTimeSeriesVector } from "./book-vector.js";
export type { TemporalEvent, TimeSeriesVector } from "./book-vector.js";
export { listCatalog, rankCombos } from "./function-combos.js";
export type { ComboRank } from "./function-combos.js";
export {
	getPlatformFunctions,
	FUNCTION_CATALOG,
	getAuxAffixesForFunction,
} from "./function-catalog.js";
export type { FunctionDef } from "./function-catalog.js";
export { collectAllAffixes, isValidPair } from "./constraints.js";
export type { AffixEntry } from "./constraints.js";
