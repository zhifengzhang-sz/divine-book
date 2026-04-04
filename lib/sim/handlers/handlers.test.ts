import { describe, expect, test } from "bun:test";
import type { EffectWithMeta } from "../../parser/schema/effects.js";
import { SeededRNG } from "../rng.js";
import type { PlayerState } from "../types.js";
import { resolve as resolveRaw } from "./index.js";
import type { HandlerContext, HandlerResult } from "./types.js";

/** Unwrap resolve result — tests expect the HandlerResult directly */
function resolve(effect: EffectWithMeta, ctx: HandlerContext): HandlerResult {
	const { result, error } = resolveRaw(effect, ctx);
	if (error) throw new Error(error);
	return result;
}

function makeCtx(overrides?: Partial<HandlerContext>): HandlerContext {
	const defaultPlayer: PlayerState = {
		hp: 1e8,
		maxHp: 1e8,
		sp: 5000,
		maxSp: 5000,
		spRegen: 100,
		shield: 0,
		shields: [],
		destroyedShieldsTotal: 0,
		atk: 1000,
		baseAtk: 1000,
		def: 9e5,
		baseDef: 9e5,
		states: [],
		alive: true,
	};
	return {
		sourcePlayer: defaultPlayer,
		targetPlayer: defaultPlayer,
		book: "test_book",
		slot: 1,
		rng: new SeededRNG(42),
		atk: 1000,
		hits: 6,
		...overrides,
	};
}

describe("base_attack", () => {
	test("returns basePercent and hits", () => {
		const effect: EffectWithMeta = { type: "base_attack", hits: 6, total: 20265 };
		const result = resolve(effect, makeCtx());
		expect(result).not.toBeNull();
		expect(result?.basePercent).toBe(20265);
		expect(result?.hitsOverride).toBe(6);
	});
});

describe("percent_max_hp_damage", () => {
	test("returns perHitEffects with PERCENT_MAX_HP_HIT (target resolves)", () => {
		const effect: EffectWithMeta = { type: "percent_max_hp_damage", value: 27 };
		const result = resolve(effect, makeCtx());
		expect(result?.perHitEffects).toBeDefined();
		const events = result?.perHitEffects?.(0);
		expect(events).toHaveLength(1);
		expect(events?.[0]).toMatchObject({
			type: "PERCENT_MAX_HP_HIT",
			percent: 27,
		});
	});
});

describe("flat_extra_damage", () => {
	test("returns flatExtra scaled by ATK", () => {
		const effect: EffectWithMeta = { type: "flat_extra_damage", value: 2000 };
		const result = resolve(effect, makeCtx({ atk: 1000 }));
		// 2000% / 100 * 1000 = 20000
		expect(result?.flatExtra).toBe(20000);
	});
});

describe("debuff", () => {
	test("produces APPLY_STATE with debuff kind", () => {
		const effect: EffectWithMeta = {
			type: "debuff",
			target: "healing_received",
			value: -80,
			duration: 8,
			dispellable: false,
			name: "灵涸",
		};
		const result = resolve(effect, makeCtx());
		expect(result?.intents).toHaveLength(1);
		const intent = result?.intents?.[0];
		expect(intent?.type).toBe("APPLY_STATE");
		if (intent?.type === "APPLY_STATE") {
			expect(intent.state.kind).toBe("debuff");
			expect(intent.state.name).toBe("灵涸");
			expect(intent.state.effects[0].stat).toBe("healing_received");
			expect(intent.state.effects[0].value).toBe(-80);
			expect(intent.state.dispellable).toBe(false);
		}
	});
});

describe("self_buff", () => {
	test("produces APPLY_STATE with buff kind", () => {
		const effect: EffectWithMeta = {
			type: "self_buff",
			attack_buff: 70,
			defense_bonus: 70,
			duration: 12,
			name: "仙佑",
		};
		const result = resolve(effect, makeCtx());
		expect(result?.intents).toHaveLength(1);
		const intent = result?.intents?.[0];
		if (intent?.type === "APPLY_STATE") {
			expect(intent.state.kind).toBe("buff");
			expect(intent.state.name).toBe("仙佑");
			expect(intent.state.effects).toHaveLength(2);
			expect(intent.state.remainingDuration).toBe(12);
		}
	});
});

describe("dot", () => {
	test("produces APPLY_DOT", () => {
		const effect: EffectWithMeta = {
			type: "dot",
			name: "噬心",
			duration: 8,
			tick_interval: 1,
			damage_per_tick: 550,
		};
		const result = resolve(effect, makeCtx());
		expect(result?.intents).toHaveLength(1);
		const intent = result?.intents?.[0];
		expect(intent?.type).toBe("APPLY_DOT");
		if (intent?.type === "APPLY_DOT") {
			expect(intent.name).toBe("噬心");
			// 550% ATK = (550/100) * 1000(atk) = 5500
			expect(intent.damagePerTick).toBe(5500);
			expect(intent.tickInterval).toBe(1);
		}
	});
});

describe("shield_strength", () => {
	test("produces SHIELD scaled by ATK", () => {
		const effect: EffectWithMeta = { type: "shield_strength", value: 50 };
		const result = resolve(effect, makeCtx({ atk: 1000 }));
		expect(result?.intents).toHaveLength(1);
		const intent = result?.intents?.[0];
		if (intent?.type === "SHIELD") {
			expect(intent.value).toBe(500); // 50% / 100 * 1000
		}
	});
});

describe("lifesteal", () => {
	test("produces LIFESTEAL with percent", () => {
		const effect: EffectWithMeta = { type: "lifesteal", value: 75 };
		const result = resolve(effect, makeCtx());
		expect(result?.intents).toHaveLength(1);
		expect(result?.intents?.[0]).toMatchObject({
			type: "LIFESTEAL",
			percent: 75,
		});
	});
});

describe("self_heal (instant)", () => {
	test("produces HEAL scaled by ATK", () => {
		const effect: EffectWithMeta = { type: "self_heal", value: 20 };
		const result = resolve(effect, makeCtx({ atk: 1000 }));
		expect(result?.intents).toHaveLength(1);
		expect(result?.intents?.[0]).toMatchObject({
			type: "HEAL",
			value: 200, // 20% / 100 * 1000
		});
	});
});

describe("self_heal (per_tick)", () => {
	test("produces APPLY_STATE + listener registration", () => {
		const effect: EffectWithMeta = {
			type: "self_heal",
			per_tick: 12.5,
			total: 250,
			tick_interval: 1,
			name: "灵鹤",
		};
		const result = resolve(effect, makeCtx({ atk: 1000 }));
		// APPLY_STATE for the named state
		expect(result?.intents).toHaveLength(1);
		expect(result?.intents?.[0]).toMatchObject({
			type: "APPLY_STATE",
		});
		if (result?.intents?.[0]?.type === "APPLY_STATE") {
			expect(result.intents[0].state.name).toBe("灵鹤");
			expect(result.intents[0].state.trigger).toBe("per_tick");
		}
		// Listener for per_tick healing
		expect(result?.listeners).toHaveLength(1);
		expect(result?.listeners?.[0].parent).toBe("灵鹤");
		expect(result?.listeners?.[0].trigger).toBe("per_tick");
	});
});

describe("heal_echo_damage", () => {
	test("produces listener registration", () => {
		const effect: EffectWithMeta = { type: "heal_echo_damage", ratio: 1 };
		const result = resolve(effect, makeCtx());
		expect(result?.listeners).toHaveLength(1);
		expect(result?.listeners?.[0].parent).toBe("__heal__");
	});
});

describe("self_hp_cost", () => {
	test("produces HP_COST", () => {
		const effect: EffectWithMeta = { type: "self_hp_cost", value: 10 };
		const result = resolve(effect, makeCtx());
		expect(result?.intents).toHaveLength(1);
		expect(result?.intents?.[0]).toMatchObject({
			type: "HP_COST",
			percent: 10,
			basis: "current",
		});
	});
});

describe("per_hit_escalation", () => {
	test("skill_bonus produces M_skill per hit", () => {
		const effect = {
			type: "per_hit_escalation",
			value: 42.5,
			stat: "skill_bonus",
		} as unknown as EffectWithMeta;
		const result = resolve(effect, makeCtx());
		expect(result?.perHitEscalation).toBeDefined();
		expect(result?.perHitEscalation?.(0)).toEqual({ M_skill: 0 });
		expect(result?.perHitEscalation?.(1)).toEqual({ M_skill: 0.425 });
		expect(result?.perHitEscalation?.(5)).toEqual({ M_skill: 2.125 });
	});

	test("damage with max cap", () => {
		const effect = {
			type: "per_hit_escalation",
			value: 5,
			stat: "damage",
			max: 50,
		} as unknown as EffectWithMeta;
		const result = resolve(effect, makeCtx());
		expect(result?.perHitEscalation?.(0)).toEqual({ M_dmg: 0 });
		expect(result?.perHitEscalation?.(5)).toEqual({ M_dmg: 0.25 });
		expect(result?.perHitEscalation?.(20)).toEqual({ M_dmg: 0.5 }); // capped
	});
});

describe("guaranteed_crit", () => {
	test("produces spDamage", () => {
		const effect: EffectWithMeta = {
			type: "guaranteed_crit",
			base_multiplier: 1.2,
			chance: 25,
			upgraded_multiplier: 1.5,
		};
		const result = resolve(effect, makeCtx({ atk: 1000 }));
		expect(result?.spDamage).toBeDefined();
		// Should be either 1200 or 1500
		expect(result?.spDamage).toBeGreaterThanOrEqual(1200);
		expect(result?.spDamage).toBeLessThanOrEqual(1500);
	});
});

describe("probability_multiplier", () => {
	test("produces M_synchro zone", () => {
		const effect: EffectWithMeta = {
			type: "probability_multiplier",
			chance_4x: 60,
			chance_3x: 80,
			chance_2x: 100,
		};
		const result = resolve(effect, makeCtx());
		expect(result?.zones?.M_synchro).toBeDefined();
		const mult = result?.zones?.M_synchro as number;
		expect([1, 2, 3, 4]).toContain(mult);
	});
});

describe("damage_buff", () => {
	test("produces M_dmg zone", () => {
		const effect: EffectWithMeta = { type: "damage_buff", value: 36 };
		const result = resolve(effect, makeCtx());
		expect(result?.zones?.M_dmg).toBe(0.36);
	});
});

describe("skill_damage_buff", () => {
	test("produces M_skill zone", () => {
		const effect = { type: "skill_damage_buff", value: 555 } as unknown as EffectWithMeta;
		const result = resolve(effect, makeCtx());
		expect(result?.zones?.M_skill).toBe(5.55);
	});
});

describe("unknown type", () => {
	test("throws MissingHandlerError", () => {
		const effect = { type: "totally_unknown_effect" } as unknown as EffectWithMeta;
		expect(() => resolve(effect, makeCtx())).toThrow(
			"No handler for effect type",
		);
	});
});
