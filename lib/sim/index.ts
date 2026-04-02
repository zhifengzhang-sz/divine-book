/**
 * Simulator public API — re-exports from sim subsystem.
 */

export {
	selectTiers,
	validatePlayerConfig,
	loadConfig,
	ConfigValidationError,
	loadBooksYaml,
	loadAffixesYaml,
} from "./config.js";
export type { BooksYaml, AffixesYaml } from "./config.js";
export { SimulationClock } from "./clock.js";
export { playerMachine } from "./player.js";
export { SeededRNG } from "./rng.js";
export type {
	PlayerState,
	StateChangeEvent,
	ArenaConfig,
	PlayerConfig,
	ProgressionConfig,
} from "./types.js";
export { hasHandler, registeredTypes } from "./handlers/index.js";
