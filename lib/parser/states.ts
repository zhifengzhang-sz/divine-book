/**
 * Layer 3: State Extractor
 *
 * Scans skill/affix text for named state patterns (【name】)
 * and builds a state registry per book.
 */

export type { StateDef } from "../data/types.js";

import type { StateDef } from "../data/types.js";

export type StateRegistry = Record<string, StateDef>;

/**
 * Build a state registry from the description lines of a skill cell.
 * This scans all description text for 【name】 patterns and extracts
 * state properties.
 */
export function buildStateRegistry(descriptionLines: string[]): StateRegistry {
	const registry: StateRegistry = {};

	// First pass: find all named states
	for (const line of descriptionLines) {
		const stateMatches = line.matchAll(/【(.+?)】/g);
		for (const m of stateMatches) {
			const name = m[1];
			if (registry[name]) continue;

			// Only create state entries for states that are defined (have 【name】：pattern)
			// Skip references to states (e.g. "添加1层【X】与【Y】" — these are children)
			const defPattern = new RegExp(`【${escapeRegex(name)}】(?:状态)?[：:]`);
			const hasDef = descriptionLines.some((l) => defPattern.test(l));

			// Also check if it's mentioned in "添加...【X】" context (state creation)
			const createPattern = new RegExp(
				`(?:添加|获得|施加|进入).*?【${escapeRegex(name)}】`,
			);
			const isCreated = descriptionLines.some((l) => createPattern.test(l));

			if (hasDef || isCreated) {
				registry[name] = extractStateDef(name, descriptionLines);
			}
		}
	}

	// Second pass: identify parent-child relationships
	for (const [name, def] of Object.entries(registry)) {
		const children = findChildren(name, descriptionLines);
		if (children.length > 0) {
			def.children = children;
		}
	}

	return registry;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractStateDef(name: string, lines: string[]): StateDef {
	// Find the line that defines this state
	// Handles both 【name】：and 【name】状态：patterns
	const defLine = lines.find((l) =>
		new RegExp(`【${escapeRegex(name)}】(?:状态)?[：:]`).test(l),
	);
	const fullText = lines.join("\n");

	// Determine target from context before 【name】
	let target: "self" | "opponent" | "both" = "self";

	// Look at the text preceding the state name
	for (const line of lines) {
		const idx = line.indexOf(`【${name}】`);
		if (idx === -1) continue;
		const before = line.slice(0, idx);

		if (
			/对其施加|对敌方施加|对敌方添加|对攻击方添加|为目标添加|对目标添加|对目标施加/.test(
				before,
			)
		) {
			target = "opponent";
			break;
		}
		if (/为自身添加|自身获得|使自身进入|获得.*?状态/.test(before)) {
			target = "self";
			break;
		}
	}

	// Duration — prefer the state's own definition line (【name】：) over other lines
	let duration: number | "permanent" = 0;

	// First: check if there is a definition line (【name】：...) and extract from it
	if (defLine) {
		const stateIdx = defLine.indexOf(`【${name}】`);
		if (stateIdx !== -1) {
			const afterState = defLine.slice(stateIdx + name.length + 2);
			const durAfter = afterState.match(/持续(?:存在)?(\d+(?:\.\d+)?)秒/);
			if (durAfter) {
				duration = Number(durAfter[1]);
			}
		}
	}

	// Second: if no duration from def line, search all lines mentioning the state
	if (duration === 0) {
		for (const line of lines) {
			if (!line.includes(name)) continue;
			const stateIdx = line.indexOf(`【${name}】`);
			if (stateIdx === -1) continue;

			// Look AFTER the state name first
			const afterState = line.slice(stateIdx + name.length + 2);
			const durAfter = afterState.match(/持续(?:存在)?(\d+(?:\.\d+)?)秒/);
			if (durAfter) {
				duration = Number(durAfter[1]);
				break;
			}

			// Also look BEFORE the state name (e.g. "持续存在20秒的【回生灵鹤】")
			const beforeState = line.slice(0, stateIdx);
			const durBefore = beforeState.match(/持续(?:存在)?(\d+(?:\.\d+)?)秒/);
			if (durBefore) {
				duration = Number(durBefore[1]);
				break;
			}
		}
	}
	// Also check in full text for "【name】战斗状态内永久生效" pattern
	// which can be on a separate <br> line
	const permPattern = new RegExp(
		`【${escapeRegex(name)}】(?:.*)?战斗状态内永久生效`,
	);
	if (permPattern.test(fullText)) duration = "permanent";
	// Check on any line
	for (const line of lines) {
		if (line.includes(name) && /战斗状态内永久生效/.test(line)) {
			duration = "permanent";
		}
	}

	// Max stacks — check all lines mentioning the state name
	// Supports both literal numbers and variable references (e.g. "最多叠加z层")
	let max_stacks: number | undefined;
	let max_stacks_var: string | undefined;
	for (const line of lines) {
		if (!line.includes(name)) continue;
		const stackMatch = line.match(/最多叠加(\w+)层/);
		if (stackMatch) {
			// "各自最多叠加" means stacking applies to children, not this state
			const beforeMatch = line.slice(0, stackMatch.index);
			if (/各自$/.test(beforeMatch.trim())) continue;
			const val = Number(stackMatch[1]);
			if (!Number.isNaN(val)) {
				max_stacks = val;
			} else {
				max_stacks_var = stackMatch[1];
			}
			break;
		}
		const limitMatch = line.match(/上限(\d+)层/);
		if (limitMatch) {
			max_stacks = Number(limitMatch[1]);
			break;
		}
	}

	// Trigger
	let trigger: "on_cast" | "on_attacked" | "per_tick" | undefined;
	if (defLine && /受到(?:伤害|攻击)时/.test(defLine)) {
		trigger = "on_attacked";
	}
	// Check context: "自身每次受到神通攻击时获得"
	for (const line of lines) {
		if (line.includes(name) && /受到(?:伤害|攻击|神通攻击)时/.test(line)) {
			trigger = "on_attacked";
		}
	}

	// Chance
	let chance: number | undefined;
	if (defLine) {
		const chanceMatch = defLine.match(/各?有?(\d+)%概率/);
		if (chanceMatch) chance = Number(chanceMatch[1]);
	}

	// Dispellable
	let dispellable: boolean | undefined;
	if (
		(defLine && /不可驱散|无法被驱散/.test(defLine)) ||
		fullText.includes(`不可驱散的【${name}】`)
	) {
		dispellable = false;
	}

	// Per-hit stacking
	let per_hit_stack: boolean | undefined;
	for (const line of lines) {
		if (line.includes(name) && /每段攻击.*?添加.*?层/.test(line)) {
			per_hit_stack = true;
		}
	}

	const result: StateDef = { target, duration };
	if (max_stacks !== undefined) result.max_stacks = max_stacks;
	// Store unresolved variable reference for later resolution by split.ts
	if (max_stacks_var) {
		result._max_stacks_var = max_stacks_var;
	}
	if (trigger && trigger !== "on_cast") result.trigger = trigger;
	if (chance !== undefined) result.chance = chance;
	if (dispellable !== undefined) result.dispellable = dispellable;
	if (per_hit_stack) result.per_hit_stack = per_hit_stack;

	return result;
}

function findChildren(parentName: string, lines: string[]): string[] {
	const children: string[] = [];

	for (const line of lines) {
		if (!line.includes(parentName)) continue;

		// Pattern: 添加1层【X】与【Y】
		const multiMatch = line.match(/添加.*?层【(.+?)】与【(.+?)】/);
		if (multiMatch) {
			if (multiMatch[1] !== parentName) children.push(multiMatch[1]);
			if (multiMatch[2] !== parentName) children.push(multiMatch[2]);
		}
	}

	// Also check for sub-state lines (separate <br> lines that define child states)
	// These are lines like "【噬心魔咒】：..." that appear after the parent definition
	let afterParent = false;
	for (const line of lines) {
		if (
			line.includes(`【${parentName}】：`) ||
			line.includes(`【${parentName}】,`)
		) {
			afterParent = true;
			continue;
		}
		if (afterParent) {
			const childMatch = line.match(/^【(.+?)】[：:]/);
			if (childMatch && childMatch[1] !== parentName) {
				children.push(childMatch[1]);
			}
		}
	}

	return [...new Set(children)];
}
