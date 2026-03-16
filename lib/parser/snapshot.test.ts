/**
 * Snapshot tests — verify parser output matches saved snapshots.
 *
 * If a parser change alters output, these tests fail, forcing explicit review.
 * To update snapshots: `bun lib/parser/snapshots/generate.ts`
 */

import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CommonAffixResult } from "./common-affixes.js";
import { parseCommonAffixes } from "./common-affixes.js";
import type { BookData } from "./emit.js";
import { parseMainSkills } from "./index.js";

const SNAPSHOT_DIR = resolve(import.meta.dir, "snapshots");
const root = resolve(import.meta.dir, "../..");

describe("snapshot tests", () => {
	if (
		!existsSync(resolve(SNAPSHOT_DIR, "books.json")) ||
		!existsSync(resolve(SNAPSHOT_DIR, "affixes.json"))
	) {
		it.skip("snapshots not generated — run: bun lib/parser/snapshots/generate.ts", () => {});
		return;
	}

	const booksSnapshot: Record<string, BookData> = JSON.parse(
		readFileSync(resolve(SNAPSHOT_DIR, "books.json"), "utf-8"),
	);
	const affixesSnapshot: {
		universal: CommonAffixResult["universal"];
		school: CommonAffixResult["school"];
	} = JSON.parse(readFileSync(resolve(SNAPSHOT_DIR, "affixes.json"), "utf-8"));

	// Parse fresh from source
	const mainMd = readFileSync(resolve(root, "data/raw/主书.md"), "utf-8");
	const exclusiveMd = readFileSync(
		resolve(root, "data/raw/专属词缀.md"),
		"utf-8",
	);
	const result = parseMainSkills(mainMd, exclusiveMd);

	describe("books", () => {
		it("has the expected number of books", () => {
			expect(Object.keys(result.books).length).toBe(
				Object.keys(booksSnapshot).length,
			);
		});

		for (const [name, expected] of Object.entries(booksSnapshot)) {
			it(`book: ${name}`, () => {
				expect(result.books[name]).toEqual(expected);
			});
		}
	});

	describe("affixes", () => {
		const universalMd = readFileSync(
			resolve(root, "data/raw/通用词缀.md"),
			"utf-8",
		);
		const schoolMd = readFileSync(
			resolve(root, "data/raw/修为词缀.md"),
			"utf-8",
		);
		const affixes = parseCommonAffixes(universalMd, schoolMd);

		it("universal affixes match snapshot", () => {
			expect(affixes.universal).toEqual(affixesSnapshot.universal);
		});

		for (const [school, expected] of Object.entries(affixesSnapshot.school)) {
			it(`school affixes: ${school}`, () => {
				expect((affixes.school as Record<string, unknown>)[school]).toEqual(
					expected,
				);
			});
		}
	});
});
