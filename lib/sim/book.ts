/**
 * Book function — implements design §5.3.
 *
 * Pure function. Translates BookData + affix effects into:
 * 1. Direct events (from effects with parent="this" or no parent)
 * 2. Listener registrations (from effects with parent="<state_name>")
 */

import type { BookData, EffectRow } from "../data/types.js";
import { selectTiers } from "./config.js";
import { buildHitEvents } from "./damage-chain.js";
import { resolve } from "./handlers/index.js";
import type { HandlerContext, HandlerResult } from "./handlers/types.js";
import type { IntentEvent, ListenerRegistration } from "./types.js";

export interface BookResult {
	/** Immediate events: HIT[], APPLY_STATE, HEAL, etc. */
	directEvents: IntentEvent[];
	/** Reactive affix listener registrations */
	listeners: ListenerRegistration[];
	/** Errors from missing or failing handlers */
	errors: string[];
}

/**
 * Process a book for a single cast.
 *
 * @param bookData - The platform book from books.yaml
 * @param affixEffects - Resolved aux affix effects (from affixes.yaml / exclusive)
 * @param ctx - Handler context (player state, RNG, etc.)
 * @param progression - For tier selection
 */
export function processBook(
	bookData: BookData,
	affixEffects: EffectRow[],
	ctx: HandlerContext,
	progression: { enlightenment: number; fusion: number },
): BookResult {
	// Gather effects per-source, apply tier selection within each source,
	// then merge. Tier dedup is only meaningful within a single source —
	// effects of the same type from different sources must NOT be deduped.
	const sources: EffectRow[][] = [];
	if (bookData.skill) sources.push(bookData.skill);
	if (bookData.primary_affix) sources.push(bookData.primary_affix.effects);
	if (bookData.exclusive_affix) sources.push(bookData.exclusive_affix.effects);
	if (affixEffects.length > 0) sources.push(affixEffects);

	const allTiered: EffectRow[] = [];
	for (const source of sources) {
		allTiered.push(...selectTiers(source, progression));
	}

	// Separate direct vs reactive by parent field
	const directTiered: EffectRow[] = [];
	const reactiveRaw: EffectRow[] = [];
	for (const effect of allTiered) {
		const parent = effect.parent as string | undefined;
		if (!parent || parent === "this") {
			directTiered.push(effect);
		} else {
			reactiveRaw.push(effect);
		}
	}

	// Run direct effects through handlers — collect errors instead of throwing
	const handlerResults: HandlerResult[] = [];
	const errors: string[] = [];
	for (const effect of directTiered) {
		const { result, error } = resolve(effect, ctx);
		if (error) {
			errors.push(error);
		}
		// Fill in source book name on any state intents
		if (result.intents) {
			for (const intent of result.intents) {
				if (intent.type === "APPLY_STATE") {
					intent.state.source = ctx.book;
				}
				if (intent.type === "APPLY_DOT") {
					intent.source = ctx.book;
				}
			}
		}
		handlerResults.push(result);
	}

	// Build HIT events from accumulated handler results
	const hitEvents = buildHitEvents(handlerResults, ctx.atk);

	// Collect non-damage intent events
	const otherEvents = handlerResults.flatMap((r) => r.intents ?? []);

	// Collect listener registrations from direct-effect handlers
	// (e.g., self_heal per_tick, heal_echo_damage)
	const listeners: ListenerRegistration[] = [];
	for (const r of handlerResults) {
		if (r.listeners) listeners.push(...r.listeners);
	}

	// Build listener registrations for reactive effects (parent != "this")
	// Already tier-selected per-source above
	for (const effect of reactiveRaw) {
		const reg = buildListenerRegistration(effect, ctx.book);
		if (reg) listeners.push(reg);
	}

	return {
		directEvents: [...hitEvents, ...otherEvents],
		listeners,
		errors,
	};
}

/**
 * Build a listener registration from a reactive effect.
 */
function buildListenerRegistration(
	effect: EffectRow,
	book: string,
): ListenerRegistration | null {
	const parent = effect.parent as string;
	if (!parent || parent === "this") return null;

	const trigger = (effect.trigger as string) ?? "on_apply";

	return {
		parent,
		trigger: trigger as ListenerRegistration["trigger"],
		handler: (listenerCtx) => {
			// When the listener fires, process this effect through its handler
			const { result } = resolve(effect, {
				sourcePlayer: listenerCtx.sourcePlayer,
				targetPlayer: listenerCtx.sourcePlayer, // reactive effects are self-context
				book,
				slot: 0,
				rng: listenerCtx.rng,
				atk: listenerCtx.sourcePlayer.atk,
				hits: 0,
			});
			if (!result) return [];
			const events = result.intents ?? [];
			// Fill source
			for (const ev of events) {
				if (ev.type === "APPLY_STATE") ev.state.source = book;
				if (ev.type === "APPLY_DOT") ev.source = book;
			}
			return events;
		},
	};
}
