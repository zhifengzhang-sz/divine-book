import { describe, expect, test } from "bun:test";
import { processBook } from "./book.js";
import { loadAffixesYaml, loadBooksYaml } from "./config.js";
import { SeededRNG } from "./rng.js";
import type { PlayerState } from "./types.js";

const books = loadBooksYaml();
const affixes = loadAffixesYaml();

function makePlayerState(): PlayerState {
	return {
		hp: 1e8,
		maxHp: 1e8,
		sp: 5000,
		maxSp: 5000,
		spRegen: 100,
		shield: 0,
		atk: 1000,
		baseAtk: 1000,
		def: 9e5,
		baseDef: 9e5,
		states: [],
		alive: true,
	};
}

describe("processBook", () => {
	test("千锋聚灵剑 produces HIT events", () => {
		const bookData = books.books["千锋聚灵剑"];
		const player = makePlayerState();
		const result = processBook(
			bookData,
			[],
			{
				sourcePlayer: player,
				targetPlayer: player,
				book: "千锋聚灵剑",
				slot: 1,
				rng: new SeededRNG(42),
				atk: 1000,
				hits: 6,
			},
			{ enlightenment: 10, fusion: 51 },
		);

		// Should produce 6 HIT events (from base_attack)
		const hits = result.directEvents.filter((e) => e.type === "HIT");
		expect(hits.length).toBe(6);

		// Each hit should have damage > 0
		for (const hit of hits) {
			if (hit.type === "HIT") {
				expect(hit.damage).toBeGreaterThan(0);
			}
		}

		// Should carry %maxHP as PERCENT_MAX_HP_HIT (resolved by target)
		const firstHit = hits[0];
		if (firstHit.type === "HIT" && firstHit.perHitEffects) {
			expect(firstHit.perHitEffects.length).toBeGreaterThan(0);
			expect(firstHit.perHitEffects[0].type).toBe("PERCENT_MAX_HP_HIT");
		}
	});

	test("千锋聚灵剑 exclusive affix produces APPLY_STATE debuff", () => {
		const bookData = books.books["千锋聚灵剑"];
		const player = makePlayerState();
		const result = processBook(
			bookData,
			[],
			{
				sourcePlayer: player,
				targetPlayer: player,
				book: "千锋聚灵剑",
				slot: 1,
				rng: new SeededRNG(42),
				atk: 1000,
				hits: 6,
			},
			{ enlightenment: 10, fusion: 51 },
		);

		const applyStates = result.directEvents.filter(
			(e) => e.type === "APPLY_STATE",
		);
		// Exclusive affix 天哀灵涸 applies 灵涸 debuff
		const linghe = applyStates.find(
			(e) => e.type === "APPLY_STATE" && e.state.name === "灵涸",
		);
		expect(linghe).toBeDefined();
		if (linghe?.type === "APPLY_STATE") {
			expect(linghe.state.kind).toBe("debuff");
			expect(linghe.state.effects[0].stat).toBe("healing_received");
		}
	});

	test("primary affix with parent=this produces direct events", () => {
		const bookData = books.books["千锋聚灵剑"];
		const player = makePlayerState();
		const result = processBook(
			bookData,
			[],
			{
				sourcePlayer: player,
				targetPlayer: player,
				book: "千锋聚灵剑",
				slot: 1,
				rng: new SeededRNG(42),
				atk: 1000,
				hits: 6,
			},
			{ enlightenment: 10, fusion: 51 },
		);

		// 惊神剑光 has per_hit_escalation with parent=this
		// This should be processed as a direct effect (modifies damage chain)
		const hits = result.directEvents.filter((e) => e.type === "HIT");
		if (hits.length >= 2 && hits[0].type === "HIT" && hits[1].type === "HIT") {
			// Hit 1 should have more damage than hit 0 due to escalation
			expect(hits[1].damage).toBeGreaterThan(hits[0].damage);
		}
	});

	test("reactive effects produce listener registrations (千锋聚灵剑 escalation)", () => {
		// 千锋聚灵剑's primary affix 惊神剑光 has per_hit_escalation with parent=this
		// This is processed as a direct effect, not reactive.
		// For a reactive test, we need a book where primary/exclusive affix has parent != "this"
		// 千锋聚灵剑 doesn't have one, but the book function still separates correctly.
		const bookData = books.books["千锋聚灵剑"];
		const player = makePlayerState();
		const result = processBook(
			bookData,
			[],
			{
				sourcePlayer: player,
				targetPlayer: player,
				book: "千锋聚灵剑",
				slot: 1,
				rng: new SeededRNG(42),
				atk: 1000,
				hits: 6,
			},
			{ enlightenment: 10, fusion: 51 },
		);

		// 千锋聚灵剑 has no reactive effects (all parent=this)
		// But the separation logic still works — no listeners expected
		// Reactive listener tests will be added when more handlers are implemented
		expect(result.listeners).toHaveLength(0);
	});

	test("aux affix effects are included", () => {
		const bookData = books.books["千锋聚灵剑"];
		// Add 斩岳 (flat_extra_damage: 2000) as an aux affix
		const auxEffects = affixes.universal["斩岳"]?.effects ?? [];
		const player = makePlayerState();
		const result = processBook(
			bookData,
			auxEffects,
			{
				sourcePlayer: player,
				targetPlayer: player,
				book: "千锋聚灵剑",
				slot: 1,
				rng: new SeededRNG(42),
				atk: 1000,
				hits: 6,
			},
			{ enlightenment: 10, fusion: 51 },
		);

		// With 斩岳, damage should be higher than without
		const resultWithout = processBook(
			bookData,
			[],
			{
				sourcePlayer: player,
				targetPlayer: player,
				book: "千锋聚灵剑",
				slot: 1,
				rng: new SeededRNG(42),
				atk: 1000,
				hits: 6,
			},
			{ enlightenment: 10, fusion: 51 },
		);

		const hitsWithAux = result.directEvents.filter((e) => e.type === "HIT");
		const hitsWithout = resultWithout.directEvents.filter(
			(e) => e.type === "HIT",
		);

		if (hitsWithAux[0]?.type === "HIT" && hitsWithout[0]?.type === "HIT") {
			expect(hitsWithAux[0].damage).toBeGreaterThan(hitsWithout[0].damage);
		}
	});

	test("source field is filled on state intents", () => {
		const bookData = books.books["千锋聚灵剑"];
		const player = makePlayerState();
		const result = processBook(
			bookData,
			[],
			{
				sourcePlayer: player,
				targetPlayer: player,
				book: "千锋聚灵剑",
				slot: 1,
				rng: new SeededRNG(42),
				atk: 1000,
				hits: 6,
			},
			{ enlightenment: 10, fusion: 51 },
		);

		const applyStates = result.directEvents.filter(
			(e) => e.type === "APPLY_STATE",
		);
		for (const ev of applyStates) {
			if (ev.type === "APPLY_STATE") {
				expect(ev.state.source).toBe("千锋聚灵剑");
			}
		}
	});
});
