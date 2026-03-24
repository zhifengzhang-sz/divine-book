/**
 * Main Skills Parser — Orchestrator
 *
 * TODO: Rewire to use per-book grammar system.
 * See docs/parser/impl.io.md §3 for the rewiring plan.
 *
 * Old pipeline (deleted): reader → context → handlers → post-processing
 * New pipeline: per-book grammar (.ohm) → semantics (.ts) → Effect[]
 */

export type ParseResult = {};

export function parseAll(): ParseResult {
	throw new Error(
		"Not yet rewired to per-book grammar system. See docs/parser/impl.io.md",
	);
}
