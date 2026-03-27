/**
 * Handler types — pure functions that translate Effect → HandlerResult.
 *
 * Handlers do not produce events directly. They return zone contributions
 * and intent event declarations. The book function (book.ts) collects
 * these and builds the actual events.
 */

import type { EffectWithMeta } from "../../parser/schema/effects.js";
import type {
	IntentEvent,
	ListenerRegistration,
	PlayerState,
	SeededRNGInterface,
} from "../types.js";

export interface HandlerContext {
	sourcePlayer: Readonly<PlayerState>;
	targetPlayer: Readonly<PlayerState>;
	book: string;
	slot: number;
	rng: SeededRNGInterface;
	atk: number;
	hits: number;
}

export interface HandlerResult {
	/** Which handler produced this result (set by resolve(), not by handlers) */
	handlerType?: string;
	/** Base damage percent from base_attack (e.g., 20265) */
	basePercent?: number;
	/** Number of hits — overrides ctx.hits if set */
	hitsOverride?: number;
	/** Flat extra damage (e.g., 斩岳: 2000% ATK) */
	flatExtra?: number;
	/** Multiplicative zone contributions */
	zones?: {
		S_coeff?: number;
		M_dmg?: number;
		M_skill?: number;
		M_final?: number;
		M_synchro?: number;
	};
	/** Per-hit escalation function: hitIndex → zone bonuses for that hit */
	perHitEscalation?: (hitIndex: number) => { M_skill?: number; M_dmg?: number };
	/** Per-hit effects: hitIndex → additional events per hit (e.g., %maxHP damage) */
	perHitEffects?: (hitIndex: number) => IntentEvent[];
	/** Force M_synchro to max (probability_to_certain makes rolls guaranteed) */
	forceSynchroMax?: boolean;
	/** Resonance 灵力 damage (total across all hits) */
	spDamage?: number;
	/** Non-damage intent events (buffs, debuffs, heal, shield, etc.) */
	intents?: IntentEvent[];
	/** Reactive listener registrations (for effects that subscribe to events) */
	listeners?: ListenerRegistration[];
}

export type Handler = (effect: EffectWithMeta, ctx: HandlerContext) => HandlerResult;

/**
 * Narrow schema types for sim handlers: replaces `string | number` → `number`.
 * Schema interfaces use `V = string | number` because they span both unresolved
 * (variable names) and resolved (numeric) phases. Handlers always receive
 * resolved data, so all V fields are numbers at runtime.
 *
 * Literal string types (e.g., `"self_max_hp"`) are preserved — only the
 * `string | number` union (V) is narrowed to `number`.
 */
export type Resolved<T> = {
	[K in keyof T]: [string | number] extends [T[K]]
		? [T[K]] extends [string | number]
			? number
			: T[K]
		: T[K];
};
