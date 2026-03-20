#!/usr/bin/env bun
/**
 * Generate affix-taxonomy.yaml — classifies all affixes into
 * 7 behavioral categories from docs/model/affix-taxonomy.md.
 *
 * Reads: data/yaml/affixes.yaml, data/yaml/books.yaml
 * Writes: data/yaml/affix-taxonomy.yaml
 *
 * Usage:
 *   bun app/gen-affix-taxonomy.ts                              # stdout
 *   bun app/gen-affix-taxonomy.ts -o data/yaml/affix-taxonomy.yaml  # file
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { parse as parseYaml } from "yaml";

const { values } = parseArgs({
	options: {
		output: { type: "string", short: "o" },
	},
});

// ── Load data ───────────────────────────────────────────────────────

const affixes = parseYaml(
	readFileSync(resolve("data/yaml/affixes.yaml"), "utf-8"),
) as {
	universal: Record<
		string,
		{ text?: string; effects: { type: string; [k: string]: unknown }[] }
	>;
	school: Record<
		string,
		Record<
			string,
			{ text?: string; effects: { type: string; [k: string]: unknown }[] }
		>
	>;
};

const books = parseYaml(
	readFileSync(resolve("data/yaml/books.yaml"), "utf-8"),
) as {
	books: Record<
		string,
		{
			school: string;
			primary_affix?: {
				name: string;
				effects: { type: string; [k: string]: unknown }[];
			};
			exclusive_affix?: {
				name: string;
				effects: { type: string; [k: string]: unknown }[];
			};
		}
	>;
};

// ── Category definitions ────────────────────────────────────────────

const CATEGORIES: Record<number, { name: string; cn: string; desc: string }> = {
	1: {
		name: "Passive Multipliers",
		cn: "被动加成",
		desc: "Always active when equipped",
	},
	2: {
		name: "Conditional Multipliers",
		cn: "条件加成",
		desc: "Scale with HP%, states, debuff count",
	},
	3: {
		name: "Flat Damage Additions",
		cn: "固定伤害",
		desc: "Extra damage per hit or cast",
	},
	4: {
		name: "State-Creating Effects",
		cn: "状态创建",
		desc: "Create buffs, debuffs, DoTs, shields",
	},
	5: {
		name: "Cross-Skill Effects",
		cn: "跨技能",
		desc: "Affect the next skill cast",
	},
	6: {
		name: "Reactive Triggers",
		cn: "被动触发",
		desc: "Fire on being attacked or per-tick",
	},
	7: {
		name: "State-Referencing",
		cn: "状态联动",
		desc: "Behavior depends on a named state",
	},
};

// ── Classifier ──────────────────────────────────────────────────────

function classifyAffix(
	effects: { type: string; [k: string]: unknown }[],
	sourceType: "universal" | "school" | "primary" | "exclusive",
): number {
	const types = new Set(effects.map((e) => e.type));
	const hasParent = effects.some((e) => e.parent && e.parent !== "this");
	const hasTrigger = effects.some(
		(e) => e.trigger === "on_attacked" || e.trigger === "per_tick",
	);

	// Primary affixes with parent= are state-referencing by definition —
	// they modify the platform skill's named state behavior.
	// Check this FIRST for primary affixes.
	if (sourceType === "primary" && hasParent) return 7;

	// Category 6: reactive triggers
	if (
		hasTrigger ||
		types.has("counter_buff") ||
		types.has("counter_debuff") ||
		types.has("counter_debuff_upgrade") ||
		types.has("cross_slot_debuff") ||
		types.has("attack_reduction") ||
		types.has("lethal_rate_reduction") ||
		types.has("crit_damage_reduction") ||
		types.has("crit_rate_reduction")
	)
		return 6;

	// Category 5: cross-skill
	if (types.has("next_skill_buff")) return 5;

	// Category 4: state-creating (for non-primary affixes that create states)
	if (
		types.has("dot") ||
		types.has("debuff") ||
		types.has("conditional_debuff") ||
		types.has("random_debuff") ||
		types.has("shield") ||
		types.has("damage_to_shield") ||
		types.has("self_buff") ||
		types.has("random_buff") ||
		types.has("heal_echo_damage") ||
		types.has("lifesteal") ||
		types.has("on_dispel")
	)
		return 4;

	// Category 7: state-referencing (non-primary with parent)
	if (hasParent) return 7;

	// Category 3: flat damage
	if (
		types.has("flat_extra_damage") ||
		types.has("per_hit_escalation") ||
		types.has("on_buff_debuff_shield_trigger") ||
		types.has("conditional_damage")
	)
		return 3;

	// Category 2: conditional multipliers
	if (
		types.has("execute_conditional") ||
		types.has("per_enemy_lost_hp") ||
		types.has("per_self_lost_hp") ||
		types.has("per_debuff_stack_damage") ||
		types.has("per_buff_stack_damage") ||
		types.has("per_debuff_stack_true_damage") ||
		types.has("min_lost_hp_threshold") ||
		types.has("ignore_damage_reduction") ||
		types.has("self_damage_taken_increase") ||
		types.has("enemy_skill_damage_reduction") ||
		types.has("probability_to_certain")
	)
		return 2;

	// Category 1: passive multipliers (default)
	return 1;
}

// ── Build taxonomy ──────────────────────────────────────────────────

interface TaxonomyEntry {
	name: string;
	source: string;
	source_type: "universal" | "school" | "primary" | "exclusive";
	category: number;
	effect_types: string[];
}

const entries: TaxonomyEntry[] = [];

// Universal affixes
for (const [name, data] of Object.entries(affixes.universal)) {
	entries.push({
		name,
		source: "通用",
		source_type: "universal",
		category: classifyAffix(data.effects, "universal"),
		effect_types: data.effects.map((e) => e.type),
	});
}

// School affixes
for (const [school, schoolAffixes] of Object.entries(affixes.school)) {
	for (const [name, data] of Object.entries(schoolAffixes)) {
		entries.push({
			name,
			source: school,
			source_type: "school",
			category: classifyAffix(data.effects, "school"),
			effect_types: data.effects.map((e) => e.type),
		});
	}
}

// Book affixes
for (const [bookName, book] of Object.entries(books.books)) {
	if (book.primary_affix) {
		entries.push({
			name: book.primary_affix.name,
			source: bookName,
			source_type: "primary",
			category: classifyAffix(book.primary_affix.effects, "primary"),
			effect_types: book.primary_affix.effects.map((e) => e.type),
		});
	}
	if (book.exclusive_affix) {
		entries.push({
			name: book.exclusive_affix.name,
			source: bookName,
			source_type: "exclusive",
			category: classifyAffix(book.exclusive_affix.effects, "exclusive"),
			effect_types: book.exclusive_affix.effects.map((e) => e.type),
		});
	}
}

// ── Output YAML ─────────────────────────────────────────────────────

const lines: string[] = [
	"# Affix Taxonomy — auto-generated behavioral classification",
	"# Regenerate with: bun app/gen-affix-taxonomy.ts -o data/yaml/affix-taxonomy.yaml",
	"# Categories from docs/model/affix-taxonomy.md",
	"",
	"categories:",
];

for (const [id, cat] of Object.entries(CATEGORIES)) {
	lines.push(`  ${id}:`);
	lines.push(`    name: ${cat.name}`);
	lines.push(`    cn: ${cat.cn}`);
	lines.push(`    desc: ${cat.desc}`);
}

lines.push("");
lines.push("affixes:");

// Group by category
for (let cat = 1; cat <= 7; cat++) {
	const catEntries = entries.filter((e) => e.category === cat);
	if (catEntries.length === 0) continue;
	lines.push(`  # ── ${CATEGORIES[cat].cn} (${CATEGORIES[cat].name}) ──`);
	for (const entry of catEntries) {
		lines.push(`  - name: ${entry.name}`);
		lines.push(`    source: ${entry.source}`);
		lines.push(`    source_type: ${entry.source_type}`);
		lines.push(`    category: ${entry.category}`);
		lines.push(`    effect_types: [${entry.effect_types.join(", ")}]`);
	}
}

const yaml = `${lines.join("\n")}\n`;

// Summary
const counts = Object.fromEntries(
	Object.keys(CATEGORIES).map((id) => [
		id,
		entries.filter((e) => e.category === Number(id)).length,
	]),
);
console.error(
	`Classified ${entries.length} affixes: ${Object.entries(counts)
		.map(([id, n]) => `${CATEGORIES[Number(id)].cn}(${n})`)
		.join(", ")}`,
);

if (values.output) {
	writeFileSync(values.output, yaml);
	console.error(`Written to ${values.output}`);
} else {
	console.log(yaml);
}
