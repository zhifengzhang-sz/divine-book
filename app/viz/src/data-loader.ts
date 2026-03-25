/**
 * Fetches books + affixes data from the server's YAML-backed API.
 * Cached after first load — call loadGameData() from any component.
 */

import type { AffixesYaml, BooksYaml } from "../../../lib/sim/config.js";

export interface GameData {
	books: BooksYaml;
	affixes: AffixesYaml;
}

let cached: GameData | null = null;
let pending: Promise<GameData> | null = null;

export async function loadGameData(): Promise<GameData> {
	if (cached) return cached;
	if (pending) return pending;

	pending = (async () => {
		const [booksRes, affixesRes] = await Promise.all([
			fetch("/api/books"),
			fetch("/api/affixes"),
		]);
		const books = (await booksRes.json()) as BooksYaml;
		const affixes = (await affixesRes.json()) as AffixesYaml;
		cached = { books, affixes };
		return cached;
	})();

	return pending;
}
