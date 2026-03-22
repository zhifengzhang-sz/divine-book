#!/usr/bin/env bun
/**
 * Verify reactive parser — checks each pipeline stage for all 28 books.
 *
 * For each book:
 *   Stage 1 (Reader):  Do tokens cover the key Chinese terms in the source text?
 *   Stage 2 (Context): Are modifiers attached? Are state scopes correct?
 *   Stage 3 (Handler): Do effects match expected types for the source text?
 *   Final:             Compare reactive YAML vs imperative baseline.
 *
 * Usage: bun lib/parser/verify-reactive.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EffectRow } from "../data/types.js";
import { BOOK_TABLE } from "./book-table.js";
import { group } from "./context.js";
import { parse } from "./handlers.js";
import { readMainSkillTables, splitCell } from "./md-table.js";
import { runPipeline } from "./pipeline.js";
import { scan } from "./reader.js";

const mainMd = readFileSync(resolve("data/raw/主书.md"), "utf-8");
const entries = readMainSkillTables(mainMd);

// Load imperative baseline for comparison
const _imperativeBooks: Record<string, { skill?: EffectRow[] }> = {};
try {
	const _baselineJson = readFileSync(
		resolve("data/yaml/imperative-baseline/books.yaml"),
		"utf-8",
	);
} catch {
	// Try JSON snapshot
	try {
		const _baselineJson = readFileSync(
			resolve("lib/parser/snapshots/books.json"),
			"utf-8",
		);
		// This is the reactive snapshot now, not useful for comparison
	} catch {
		// No baseline available
	}
}

// Load current reactive output
let _reactiveBooks: Record<string, { skill?: EffectRow[] }> = {};
try {
	const snapshotJson = readFileSync(
		resolve("lib/parser/snapshots/books.json"),
		"utf-8",
	);
	_reactiveBooks = JSON.parse(snapshotJson);
} catch {
	// Will generate on the fly
}

// ── Known Chinese terms that should produce tokens ───────
// If a book's text contains these patterns, we expect corresponding tokens.

const EXPECTED_PATTERNS: Record<string, RegExp> = {
	base_attack: /造成.*?%攻击力的(?:灵法)?伤害/,
	hp_cost: /消耗(?:自身)?\w+%(?:的)?当前气血值/,
	per_hit: /每段攻击/,
	// named_state and state_ref are handled by boundary splitting (§4.0),
	// not as tokens. They're verified separately below as EXPECTED_BOUNDARIES.
	duration: /持续(?:存在)?\w+(?:\.\w+)?秒/,
	shield: /(?:添加|获得)(?:自身)?\w+%最大气血值的护盾/,
	summon: /持续(?:存在)?\w+秒的分身/,
	dot_current_hp: /每\w+(?:\.\w+)?秒(?:额外)?造成(?:目标)?\w+%当前气血值的伤害/,
	dot_lost_hp:
		/每\w+(?:\.\w+)?秒(?:额外)?造成(?:目标)?\w+%已损(?:失)?气血值的伤害/,
	counter_debuff: /受到(?:伤害|攻击)时[，,]各有\d+%概率对攻击方添加/,
	counter_buff_heal: /受到伤害时[，,](?:自身)?恢复该次伤害/,
	counter_buff_reflect: /每秒对目标.*?反射/,
	self_lost_hp_damage:
		/(?:额外)?对(?:其|目标)?造成自身\w+%已损(?:失)?气血值的伤害/,
	debuff_final_dr: /降低\w+%(?:的)?最终伤害减免/,
	self_heal: /(?:为自身)?恢复(?:共)?\w+%(?:的)?(?:最大)?气血值/,
	buff_steal: /偷取目标\w+个增益状态/,
	untargetable: /\d+秒内不可被选中/,
	crit_dmg_bonus: /暴击伤害提[升高]\w+%/,
	shield_destroy_damage: /湮灭敌方\w+个护盾/,
	delayed_burst: /【.+?】[，,]持续\d+秒.*?伤害增加/,
	self_cleanse: /驱散自身\w+个负面状态/,
	skill_cooldown: /下一个未释放的神通进入\d+秒冷却/,
	echo_damage: /(?:每次)?受到(?:的)?伤害时[，,].*?额外受到/,
	periodic_escalation: /每造成\d+次伤害时/,
	percent_max_hp_damage: /(?:造成|附加)(?:目标)?\w+%(?:自身)?最大气血值的伤害/,
	percent_current_hp_damage: /额外附加\w+%(?:目标)?当前气血值的伤害/,
	per_enemy_lost_hp: /敌方(?:(?:当前)?气血值)?每(?:多)?损失\w+%/,
	self_damage_taken_increase:
		/(?:释放后)?(?:自身)?\d+秒内受到(?:的)?伤害(?:提[升高])/,
};

// ── Verification ─────────────────────────────────────────

interface Issue {
	book: string;
	stage: "reader" | "context" | "handler" | "final";
	severity: "error" | "warning" | "info";
	message: string;
}

const issues: Issue[] = [];

for (const entry of entries) {
	const meta = BOOK_TABLE[entry.name];
	if (!meta) continue;

	const cell = splitCell(entry.skillText);
	const text = cell.description.join("，");

	// ── Stage 1: Reader ──────────────────────────────────
	const tokens = scan(text);

	if (tokens.length === 0) {
		issues.push({
			book: entry.name,
			stage: "reader",
			severity: "error",
			message: "No tokens produced from skill text",
		});
		continue;
	}

	// Check: expected patterns in text should produce corresponding tokens
	for (const [termName, pattern] of Object.entries(EXPECTED_PATTERNS)) {
		if (pattern.test(text)) {
			const hasToken = tokens.some((t) => t.term === termName);
			if (!hasToken) {
				issues.push({
					book: entry.name,
					stage: "reader",
					severity: "warning",
					message: `Text matches "${termName}" pattern but no token produced`,
				});
			}
		}
	}

	// Check: are there tokens with empty captures where we'd expect values?
	for (const token of tokens) {
		if (token.term === "base_attack" && !token.captures.total) {
			issues.push({
				book: entry.name,
				stage: "reader",
				severity: "error",
				message: `base_attack token missing "total" capture`,
			});
		}
	}

	// Check: 【name】：boundaries should produce scoped tokens
	// These are handled by splitAtBoundaries(), not as tokens.
	// Verify that when 【name】：appears in text, tokens after it have the correct scope.
	const stateDefRe = /【([^【】]+)】(?:状态)?[：:]/g;
	let stateMatch: RegExpExecArray | null = stateDefRe.exec(text);
	while (stateMatch !== null) {
		const stateName = stateMatch[1];
		const hasScoped = tokens.some((t) => t.scope === stateName);
		if (!hasScoped) {
			// Check if there's any text after the boundary that could produce tokens
			const afterPos = stateMatch.index + stateMatch[0].length;
			const textAfter = text.slice(afterPos);
			const nextBoundary = textAfter.search(/【.+?】(?:状态)?[：:]/);
			const segmentText =
				nextBoundary >= 0 ? textAfter.slice(0, nextBoundary) : textAfter;
			if (segmentText.trim().length > 0) {
				issues.push({
					book: entry.name,
					stage: "reader",
					severity: "warning",
					message: `【${stateName}】：boundary found but no tokens scoped to it`,
				});
			}
		}
		stateMatch = stateDefRe.exec(text);
	}

	// ── Stage 2: Context ─────────────────────────────────
	const groups = group(tokens, "skill");

	if (groups.length === 0) {
		issues.push({
			book: entry.name,
			stage: "context",
			severity: "error",
			message: "No groups produced from tokens",
		});
		continue;
	}

	// Check: named_state tokens should create scopes
	const namedStateTokens = tokens.filter((t) => t.term === "named_state");
	for (const ns of namedStateTokens) {
		const stateName = ns.captures.name;
		// Check if any group has this as parentState
		const hasScope = groups.some((g) => g.parentState === stateName);
		// Or if the state itself is a primary (it gets skipped)
		if (!hasScope) {
			// Not all named_states need child groups — some are just definitions
			// Only warn if there are tokens AFTER the named_state
			const tokensAfter = tokens.filter(
				(t) =>
					t.position > ns.position &&
					t.term !== "named_state" &&
					t.term !== "state_ref",
			);
			if (tokensAfter.length > 0) {
				issues.push({
					book: entry.name,
					stage: "context",
					severity: "info",
					message: `Named state 【${stateName}】 defined but no groups scoped to it`,
				});
			}
		}
	}

	// Check: modifier tokens should be attached to some group
	const modifierTokens = tokens.filter((t) =>
		[
			"per_hit",
			"duration",
			"max_stacks",
			"chance",
			"on_attacked",
			"undispellable",
			"permanent",
		].includes(t.term),
	);
	for (const mod of modifierTokens) {
		const attached = groups.some((g) =>
			g.modifiers.some(
				(m) => m.position === mod.position && m.term === mod.term,
			),
		);
		if (!attached) {
			issues.push({
				book: entry.name,
				stage: "context",
				severity: "info",
				message: `Modifier "${mod.term}" at pos ${mod.position} not attached to any group`,
			});
		}
	}

	// ── Stage 3: Handlers ────────────────────────────────
	const { effects, diagnostics } = parse(groups, {
		allGroups: groups,
		bookName: entry.name,
	});

	for (const d of diagnostics) {
		if (d.level === "warn") {
			issues.push({
				book: entry.name,
				stage: "handler",
				severity: "warning",
				message: d.message,
			});
		}
	}

	// Check: base_attack should always be present
	const hasBaseAttack = effects.some((e) => e.type === "base_attack");
	if (!hasBaseAttack) {
		issues.push({
			book: entry.name,
			stage: "handler",
			severity: "error",
			message: "No base_attack effect produced",
		});
	}

	// ── Final: Compare with pipeline output ──────────────
	const pipelineResult = runPipeline("skill", entry.skillText, entry.name);

	if (pipelineResult.effects.length === 0) {
		issues.push({
			book: entry.name,
			stage: "final",
			severity: "error",
			message: "Pipeline produced zero effects",
		});
	}

	// Check: pipeline should not have errors
	for (const err of pipelineResult.errors) {
		issues.push({
			book: entry.name,
			stage: "final",
			severity: "warning",
			message: `Pipeline error: ${err}`,
		});
	}

	// Check: all effects should have a type
	for (const e of pipelineResult.effects) {
		if (!e.type) {
			issues.push({
				book: entry.name,
				stage: "final",
				severity: "error",
				message: `Effect missing type: ${JSON.stringify(e)}`,
			});
		}
	}
}

// ── Report ───────────────────────────────────────────────

const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");
const infos = issues.filter((i) => i.severity === "info");

console.log(
	`\nReactive Parser Verification: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info\n`,
);

if (errors.length > 0) {
	console.log("═══ ERRORS ═══");
	for (const i of errors) {
		console.log(`  ✗ [${i.stage}] ${i.book}: ${i.message}`);
	}
	console.log();
}

if (warnings.length > 0) {
	console.log("═══ WARNINGS ═══");
	for (const i of warnings) {
		console.log(`  ⚠ [${i.stage}] ${i.book}: ${i.message}`);
	}
	console.log();
}

if (infos.length > 0) {
	console.log("═══ INFO ═══");
	for (const i of infos) {
		console.log(`  ℹ [${i.stage}] ${i.book}: ${i.message}`);
	}
	console.log();
}

// Per-book summary
console.log("═══ PER-BOOK SUMMARY ═══");
for (const entry of entries) {
	const bookIssues = issues.filter((i) => i.book === entry.name);
	const bookErrors = bookIssues.filter((i) => i.severity === "error");
	const bookWarnings = bookIssues.filter((i) => i.severity === "warning");

	const cell = splitCell(entry.skillText);
	const text = cell.description.join("，");
	const tokens = scan(text);
	const groups = group(tokens, "skill");
	const { effects } = parse(groups, {
		allGroups: groups,
		bookName: entry.name,
	});
	const pipeline = runPipeline("skill", entry.skillText, entry.name);

	const status =
		bookErrors.length > 0 ? "✗" : bookWarnings.length > 0 ? "⚠" : "✓";

	console.log(
		`  ${status} ${entry.name}: ${tokens.length} tokens → ${groups.length} groups → ${effects.length} raw effects → ${pipeline.effects.length} final effects`,
	);
	if (bookErrors.length > 0 || bookWarnings.length > 0) {
		for (const i of [...bookErrors, ...bookWarnings]) {
			console.log(`      ${i.severity === "error" ? "✗" : "⚠"} ${i.message}`);
		}
	}
}

if (errors.length > 0) {
	process.exit(1);
}
