/**
 * XState v5 Pipeline Machine — Reactive Parser Orchestrator
 *
 * Three-stage state machine: reading → grouping → parsing → done.
 * Emits TOKEN, GROUP, EFFECT, and DIAGNOSTIC events for
 * observability (parser-viz, Inspector API).
 *
 * Architecture (impl.reactive.md §3):
 *
 *   pipelineMachine
 *   ┌──────────────────────────────────────────┐
 *   │  idle ──PARSE──▶ reading ──▶ grouping    │
 *   │                              ──▶ parsing │
 *   │                              ──▶ done    │
 *   │                                          │
 *   │  context: { tokens, groups, effects }    │
 *   │  emitted: TOKEN | GROUP | EFFECT | DIAG  │
 *   └──────────────────────────────────────────┘
 */

import { assign, createActor, emit, enqueueActions, setup } from "xstate";
import type { EffectRow } from "../data/types.js";
import { type GroupEvent, group } from "./context.js";
import {
	type DiagnosticEvent,
	type HandlerContext,
	parse,
} from "./handlers.js";
import { scan, type TokenEvent } from "./reader.js";

// ── Types ────────────────────────────────────────────────

export interface PipelineContext {
	text: string;
	sourceType: "skill" | "affix";
	bookName?: string;
	tokens: TokenEvent[];
	groups: GroupEvent[];
	effects: EffectRow[];
	diagnostics: DiagnosticEvent[];
}

export type PipelineEmitted =
	| { type: "TOKEN"; token: TokenEvent }
	| { type: "GROUP"; group: GroupEvent }
	| { type: "EFFECT"; effect: EffectRow }
	| { type: "DIAGNOSTIC"; diagnostic: DiagnosticEvent };

// ── Machine ──────────────────────────────────────────────

export const pipelineMachine = setup({
	types: {
		context: {} as PipelineContext,
		input: {} as {
			text: string;
			sourceType: "skill" | "affix";
			bookName?: string;
		},
		events: {} as { type: "PARSE" },
		emitted: {} as PipelineEmitted,
	},
	actions: {
		readTokens: enqueueActions(({ context, enqueue }) => {
			const tokens = scan(context.text);
			enqueue(assign({ tokens }));
			for (const token of tokens) {
				enqueue(emit({ type: "TOKEN" as const, token }));
			}
		}),
		buildGroups: enqueueActions(({ context, enqueue }) => {
			const groups = group(context.tokens, context.sourceType);
			enqueue(assign({ groups }));
			for (const g of groups) {
				enqueue(emit({ type: "GROUP" as const, group: g }));
			}
		}),
		parseEffects: enqueueActions(({ context, enqueue }) => {
			const ctx: HandlerContext = {
				allGroups: context.groups,
				bookName: context.bookName,
			};
			const { effects, diagnostics } = parse(context.groups, ctx);
			enqueue(assign({ effects, diagnostics }));
			for (const effect of effects) {
				enqueue(emit({ type: "EFFECT" as const, effect }));
			}
			for (const d of diagnostics) {
				enqueue(emit({ type: "DIAGNOSTIC" as const, diagnostic: d }));
			}
		}),
	},
}).createMachine({
	id: "parser-pipeline",
	context: ({ input }) => ({
		text: input.text,
		sourceType: input.sourceType,
		bookName: input.bookName,
		tokens: [],
		groups: [],
		effects: [],
		diagnostics: [],
	}),
	initial: "idle",
	states: {
		idle: {
			on: { PARSE: "reading" },
		},
		reading: {
			entry: "readTokens",
			always: "grouping",
		},
		grouping: {
			entry: "buildGroups",
			always: "parsing",
		},
		parsing: {
			entry: "parseEffects",
			always: "done",
		},
		done: {
			type: "final",
		},
	},
});

// ── Public API ───────────────────────────────────────────

/**
 * Run the reactive pipeline synchronously.
 * Creates an actor, sends PARSE, reads the final snapshot.
 */
export function runReactivePipeline(
	text: string,
	sourceType: "skill" | "affix",
	bookName?: string,
): PipelineContext {
	const actor = createActor(pipelineMachine, {
		input: { text, sourceType, bookName },
	});
	actor.start();
	actor.send({ type: "PARSE" });
	const snapshot = actor.getSnapshot();
	actor.stop();
	return snapshot.context;
}
