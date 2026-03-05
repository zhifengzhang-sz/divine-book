/**
 * Generator: Registry → keyword.map.md
 *
 * Pure function that generates the keyword map markdown document
 * from the TypeScript registry. Static sections (condition vocab,
 * data state vocab, unresolved formulas) are embedded as constants.
 */

import type { Registry } from "../domain/registry.js";
import type { EffectTypeDef, GroupDef } from "../domain/types.js";

// ---------------------------------------------------------------------------
// Static content sections
// ---------------------------------------------------------------------------

const STYLE = `<style>
body {
  max-width: none !important;
  width: 95% !important;
  margin: 0 auto !important;
  padding: 20px 40px !important;
  background-color: #282c34 !important;
  color: #abb2bf !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
  line-height: 1.6 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

h1, h2, h3, h4, h5, h6 {
  color: #ffffff !important;
}

a {
  color: #61afef !important;
}

code {
  background-color: #3e4451 !important;
  color: #e5c07b !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
}

pre {
  background-color: #2c313a !important;
  border: 1px solid #4b5263 !important;
  border-radius: 6px !important;
  padding: 16px !important;
  overflow-x: auto !important;
}

pre code {
  background-color: transparent !important;
  color: #abb2bf !important;
  padding: 0 !important;
  border-radius: 0 !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
}

table {
  border-collapse: collapse !important;
  width: auto !important;
  margin: 16px 0 !important;
  table-layout: auto !important;
  display: table !important;
}

table th,
table td {
  border: 1px solid #4b5263 !important;
  padding: 8px 10px !important;
  word-wrap: break-word !important;
}

table th:first-child,
table td:first-child {
  min-width: 60px !important;
}

table th {
  background: #3e4451 !important;
  color: #e5c07b !important;
  font-size: 14px !important;
  text-align: center !important;
}

table td {
  background: #2c313a !important;
  font-size: 12px !important;
  text-align: left !important;
}

blockquote {
  border-left: 3px solid #4b5263 !important;
  padding-left: 10px !important;
  color: #5c6370 !important;
  background-color: #2c313a !important;
}

strong {
  color: #e5c07b !important;
}
</style>`;

const UNIT_TABLE = `**Unit definitions** (unit identifiers used in the "Fields → Units" column):

| Unit | Meaning | Example values |
|:---|:---|:---|
| \`%atk\` | Percentage of attack power | 1500, 20265 |
| \`%stat\` | Percentage of a stat (generic stat modifier) | 15, 104 |
| \`%max_hp\` | Percentage of maximum HP | 12, 2.1 |
| \`%lost_hp\` | Percentage of lost HP | 16, 7 |
| \`%current_hp\` | Percentage of current HP | 10, 7 |
| \`seconds\` | Duration in seconds | 4, 8, 12 |
| \`count\` | Integer count | 1, 5, 10 |
| \`probability\` | Percentage chance (0–100) | 11, 25, 30 |
| \`multiplier\` | Multiplicative factor | 1.2, 1.4, 4 |
| \`bool\` | Boolean (true/false) | true, false |
| \`string\` | Text identifier | 灵涸, healing_received |
| \`list\` | List of sub-objects | — |`;

const CONVENTIONS = `**Conventions**:
- \`{x}\`, \`{y}\`, \`{z}\`, \`{w}\` = numeric variables
- \`{n}\` = count variable
- \`{d}\`, \`{t}\` = time variables (seconds)
- \`{p}\` = probability variable
- \`{m}\` = cap / multiplier variable
- \`[name]\` = state / affix name
- \`[stat]\` = attribute name
- \`[condition]\` = condition expression
- \`(...)\` = optional text (e.g., \`共(计)\` means 计 may or may not appear)
- Backtick usage in about.md is inconsistent; matching should ignore backticks
- A single affix text may contain multiple effect types (compound patterns); parsing should split them into independent effects`;

const CONDITION_VOCAB = `## Condition Vocabulary

Mapping of Chinese keywords to canonical \`condition\` field values:

| Chinese Pattern | condition Value |
|:---|:---|
| \`敌方处于控制效果\` / \`敌方处于控制状态\` | \`target_controlled\` |
| \`敌方气血值低于{x}%\` | \`target_hp_below_{x}\` |
| \`(攻击)带有减益状态的敌方\` / \`敌方具有减益状态\` | \`target_has_debuff\` |
| \`目标不存在任何治疗状态\` | \`target_has_no_healing\` |
| \`在神通悟境(悟{n}境)的条件下\` | \`enlightenment_{n}\` / \`enlightenment_max\` |`;

const DATA_STATE_VOCAB = `## Data State Vocabulary

When about.md explicitly annotates the cultivation stage a value belongs to, the corresponding \`data_state\` field is:

| Chinese Annotation | data_state Value |
|:---|:---|
| \`悟10境\` (default maximum) | *(omitted; this is the default)* |
| \`悟0境\` / \`没有悟境\` / \`数据为没有悟境的情况\` | \`enlightenment=0\` |
| \`悟{n}境\` (n ≠ 10 and n ≠ 0) | \`enlightenment={n}\` |
| \`最高融合加成\` / \`受融合影响，数据为最高融合加成\` | \`max_fusion\` |
| \`融合{n}重\` | \`fusion={n}\` |
| \`此功能未解锁\` / \`此词缀未解锁\` | \`locked\` |

> **Default values vary by school** (per about.md):
> - Sword / Demon: \`没有标识的数据为悟境最高加成\` — unlabeled values default to maximum enlightenment.
> - Body: \`没有标识的数据为没有悟境的情况\` — unlabeled values default to no enlightenment.
> - Spell: states only \`数值受悟境影响\`; no explicit default declared.
> - Demon additionally states: \`主技能效果受悟境影响，也可能受修炼阶数影响\`.`;

const UNRESOLVED_FORMULAS = `## Unresolved Formulas

The following game-mechanic-level details from about.md lack precise formulas and must be treated as assumptions during modeling:

1. **\`神通加成\` (skill bonus)** — The exact calculation of \`提升{x}%神通加成\` in 惊神剑光 is undefined. Mapped as the \`stat: skill_bonus\` field value in \`per_hit_escalation\`, but the formula by which \`skill_bonus\` converts to final damage is unknown.

2. **\`灵法伤害\` (spirit-art damage) and \`灵法防御\` (spirit-art defense)** — \`灵法伤害\` is the damage-type label on all skills. Whether a corresponding \`灵法防御\` damage-reduction attribute exists is unknown.

3. **\`守御\` (defense) attribute** — Referenced in 甲元仙符【仙佑】as \`守御加成\`, mapped to \`self_buff.defense_bonus\`. The precise damage-reduction formula is unknown.

4. **Multiplier zone resolution order** — The priority and additive-vs-multiplicative relationships among \`伤害加深\` / \`神通伤害加深\` / \`最终伤害加深\` / \`伤害减免\` / \`最终伤害减免\` are unknown.

5. **碎魂剑意 "total annihilated shields" accumulation rule** — Per-tick damage = total count x {x}% ATK, but the accumulation method for "total count" (whether it resets across ticks, how shieldless targets are counted) is only partially described; the complete formula is undefined.

6. **心逐神随 cumulative probabilities** — ~~Resolved~~. The 悟2境 data (x=60, y=80, z=100, sum 240%) confirms percentages are cumulative thresholds. At 悟0境, 49% (=100−z=100−51) is the no-boost probability; at 悟2境, 0% (=100−100) means guaranteed at least ×2.`;

// ---------------------------------------------------------------------------
// Section notes — additional context for specific sections
// ---------------------------------------------------------------------------

const SECTION_NOTES: Record<string, string> = {
	base_damage: `> **Pattern notes**:
> - \`共计\` and \`共\` (without 计) both appear in about.md; treat them as equivalent when matching.
> - 甲元仙符's primary skill has no hit-count modifier — it uses only \`造成{x}%攻击力的灵法伤害\` (single-hit variant).`,

	damage_multiplier_zones: `> **Multiplier zone hierarchy** (inferred from 奇能诡道 descriptions):
> - \`伤害加深类\` = { \`神通伤害加深\`, \`技能伤害加深\`, \`最终伤害加深\` }
> - \`神通伤害加深\` → \`skill_damage_increase\`
> - \`技能伤害加深\` → \`technique_damage_increase\`
> - \`最终伤害加深\` → \`final_damage_bonus\`
> - Bare \`伤害\` / \`造成的伤害\` → \`damage_increase\``,

	resonance_system: `> **Mechanic**: 会心 (resonance) is a fixed multiplier on the entire skill's damage output. It is deterministic (always applies \`base_mult\`), with a probability-gated enhancement to \`enhanced_mult\`. No interaction with 暴击率 (crit rate) or 暴击伤害 (crit damage) stats. Examples: 【灵犀九重】(×2.97), 【通明】(×1.2).`,

	synchrony_system: `> **Mechanic**: 心逐 (synchrony) multiplies **ALL** skill effects (damage, healing, debuffs), not just damage. It is an outer wrapper applied after the damage chain. This is a separate multiplier zone from 会心.
>
> **Cumulative probability note**: \`probability_multiplier\` (心逐神随) percentages are cumulative thresholds, not independent probabilities. The 悟2境 data (x=60, y=80, z=100, sum 240% > 100%) confirms this reading. Meaning: z% chance of at least ×m3, y% chance of at least ×m2, x% chance of ×m1. Marginals: P(×m1)=x, P(×m2)=y−x, P(×m3)=z−y, P(no boost)=100−z.`,

	standard_crit: `> **Mechanic**: Standard crit system — scales with 暴击率 (crit rate) and 暴击伤害 (crit damage) stats. Separate multiplier zone from 会心 (resonance). Both can coexist on the same 灵書 and multiply independently.
>
> **Note on \`crit_damage_bonus\`**: The \`crit_damage_bonus\` type in §2 (mapping \`暴击伤害提升\` / \`致命伤害提升\`) correctly belongs to this system. 致命伤害 and 暴击伤害 are synonyms for the same standard crit damage stat.`,

	conditional_triggers: `> **\`conditional_buff\` variable stat fields** (canonical names for the stat being modified):
> - \`附加目标最大气血的伤害提高\` → \`percent_max_hp_increase\`
> - \`附加自身已损气血的伤害提高\` → \`percent_lost_hp_increase\`
> - \`造成的伤害提升\` → \`damage_increase\``,

	per_hit_escalation: `> **\`stat\` field values**:
> - \`damage\` — per-hit damage (corresponds to 伤害提升)
> - \`skill_bonus\` — skill bonus (corresponds to 神通加成)`,

	hp_based_calculations: `> **Modifier keywords**:
> - \`等额恢复自身气血\` → append \`heal_equal: true\`
> - \`在神通的最后\` → append \`on_last_hit: true\``,

	damage_over_time: `> **\`[hp_type]\` field values**:
> - \`当前气血值\` → \`percent_current_hp\`
> - \`已损失气血值\` → \`percent_lost_hp\`
>
> **Inference flag**: \`shield_destroy_dot\` (碎魂剑意) — the formula structure, specifically how "total number of annihilated shields" accumulates across ticks and whether already-expired shields are counted, is not precisely defined in about.md.`,

	self_buffs: `> **\`self_buff\` attribute keywords**:
> - \`攻击力(加成)\` → \`attack_bonus\`
> - \`守御(加成)\` → \`defense_bonus\`
> - \`最大气血值\` → \`hp_bonus\`
> - \`伤害减免\` → \`damage_reduction\`
> - \`治疗(加成)\` → \`healing_bonus\``,

	debuffs: `> **\`target\` field values** (debuff target attributes):
> - \`治疗量\` → \`healing_received\`
> - \`伤害减免\` → \`damage_reduction\`
> - \`最终伤害减免\` → \`final_damage_reduction\`
>
> **\`无法被驱散\`** → \`dispellable: false\`
>
> **Non-numeric \`duration\`**: \`与触发的增益状态相同\` → \`duration=same_as_trigger\``,

	special_mechanics: `> **Random effect option keywords**:
> - \`攻击提升{x}%\` → \`attack_bonus\`
> - \`致命伤害提升{x}%\` → \`crit_damage_bonus\`
> - \`造成的伤害提升{x}%\` → \`damage_increase\`
> - \`攻击降低{x}%\` → \`attack_reduction\`
> - \`暴击率降低{x}%\` → \`crit_rate_reduction\`
> - \`暴击伤害降低{x}%\` → \`crit_damage_reduction\`
>
> **\`dot_half\`** corresponds to the keyword: \`持续伤害效果受一半伤害加成\``,
};

// ---------------------------------------------------------------------------
// Section pre-notes — notes that appear before the table (e.g., §3's 会心 ≠ 暴击)
// ---------------------------------------------------------------------------

const SECTION_PRE_NOTES: Record<string, string> = {
	resonance_system: `> **会心 ≠ 暴击.** The game has three distinct multiplier mechanics that were previously conflated under "Critical System." They are now separated into §3, §3b, and §3c. See the note at the end of §3c for details.`,

	shared_mechanics: `The Sword / Spell / Demon / Body schools share the following keyword patterns under their respective "shared mechanics" sections in about.md:`,
};

// ---------------------------------------------------------------------------
// Sub-section headers for §13
// ---------------------------------------------------------------------------

const SUBSECTION_HEADERS: Record<string, string> = {
	summon: "### §13.1 Summons and Clones",
	untargetable_state: "### §13.2 Untargetable State",
	periodic_dispel: "### §13.3 Dispel and Crowd Control",
	delayed_burst: "### §13.4 Delayed Burst",
	random_buff: "### §13.5 Random Effects",
	per_buff_stack_damage: "### §13.6 Stack-Based Damage",
	on_buff_debuff_shield_trigger: "### §13.7 Other Triggers",
};

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

function formatFields(def: EffectTypeDef): string {
	if (def.fields.length === 0) return "*(no fields)*";
	return def.fields
		.map((f) => {
			const opt = f.optional ? " (optional)" : "";
			return `\`${f.name}\`→${f.unit}${opt}`;
		})
		.join(", ");
}

function generateTable(defs: EffectTypeDef[], hasNotes: boolean): string {
	const header = hasNotes
		? "| Effect Type | Chinese Pattern | Fields → Units | Notes |"
		: "| Effect Type | Chinese Pattern | Fields → Units |";
	const sep = hasNotes
		? "|:---|:---|:---|:---|"
		: "|:---|:---|:---|";

	const rows = defs.map((d) => {
		const type = `\`${d.type}\``;
		const pattern = d.patterns.map((p) => `\`${p}\``).join(" / ");
		const fields = formatFields(d);
		if (hasNotes) {
			return `| ${type} | ${pattern} | ${fields} | ${d.notes ?? ""} |`;
		}
		return `| ${type} | ${pattern} | ${fields} |`;
	});

	return [header, sep, ...rows].join("\n");
}

function generateSection(group: GroupDef, defs: EffectTypeDef[]): string {
	const lines: string[] = [];

	lines.push(`## ${group.section}. ${group.label}`);
	lines.push("");

	const preNote = SECTION_PRE_NOTES[group.id];
	if (preNote) {
		lines.push(preNote);
		lines.push("");
	}

	// For §13, we need subsection headers
	if (group.id === "special_mechanics") {
		let lastSubsection = "";
		for (const def of defs) {
			const sub = SUBSECTION_HEADERS[def.type];
			if (sub && sub !== lastSubsection) {
				if (lastSubsection) lines.push("");
				lines.push(sub);
				lines.push("");
				lastSubsection = sub;
			}

			// Generate a mini-table for each subsection group
			const subDefs: EffectTypeDef[] = [];
			let j = defs.indexOf(def);
			const currentSub = sub ?? lastSubsection;
			while (j < defs.length) {
				const nextSub = SUBSECTION_HEADERS[defs[j].type];
				if (nextSub && nextSub !== currentSub) break;
				subDefs.push(defs[j]);
				j++;
			}

			if (sub) {
				const hasNotes = subDefs.some((d) => d.notes);
				lines.push(generateTable(subDefs, hasNotes));
				lines.push("");
				// Skip the defs we just processed (handled via subsection grouping below)
			}
		}

		// Simplified: generate subsection-grouped tables
		lines.length = 0;
		lines.push(`## ${group.section}. ${group.label}`);
		lines.push("");

		let currentHeader = "";
		let currentDefs: EffectTypeDef[] = [];

		const flush = () => {
			if (currentDefs.length > 0) {
				const hasNotes = currentDefs.some((d) => d.notes);
				lines.push(generateTable(currentDefs, hasNotes));
				lines.push("");
				currentDefs = [];
			}
		};

		for (const def of defs) {
			const sub = SUBSECTION_HEADERS[def.type];
			if (sub && sub !== currentHeader) {
				flush();
				lines.push(sub);
				lines.push("");
				currentHeader = sub;
			}
			currentDefs.push(def);
		}
		flush();
	} else {
		const hasNotes = defs.some((d) => d.notes);
		lines.push(generateTable(defs, hasNotes));
		lines.push("");
	}

	const note = SECTION_NOTES[group.id];
	if (note) {
		lines.push(note);
		lines.push("");
	}

	return lines.join("\n");
}

export function generateKeywordMap(reg: Registry): string {
	const sections: string[] = [];

	// Header
	sections.push(`<!-- Generated from TypeScript registry — do not edit manually -->`);
	sections.push("");
	sections.push(STYLE);
	sections.push("");
	sections.push("# Keyword → Effect Type Mapping");
	sections.push("");
	sections.push("**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)");
	sections.push("");
	sections.push(
		"> **Language decoder for the Divine Book data pipeline.** This document maps Chinese keyword patterns in [about.md](../../data/raw/about.md) to canonical effect type names and field structures. It contains no numeric instances — it is purely a parsing specification that tells downstream code *how to read* the source text.",
	);
	sections.push(">");
	sections.push(
		"> **English version of** [`keyword.map.cn.md`](./keyword.map.cn.md). Chinese patterns are preserved verbatim — they are the data being mapped.",
	);
	sections.push("");
	sections.push("**Data source**: `data/raw/about.md` (sole source of truth)");
	sections.push("");
	sections.push(CONVENTIONS);
	sections.push("");
	sections.push(UNIT_TABLE);
	sections.push("");
	sections.push(
		"**Sign convention**: Debuff values that reduce a stat must be negative. `value=-31` means \"reduced by 31%\". Positive = buff/increase; negative = debuff/reduction.",
	);
	sections.push("");
	sections.push("---");
	sections.push("");

	// Generate each section from registry groups
	for (const group of reg.groups) {
		const defs = reg.allTypes.filter((d) => d.group === group.id);
		if (defs.length === 0) continue;
		sections.push(generateSection(group, defs));
		sections.push("---");
		sections.push("");
	}

	// Static reference sections
	sections.push(CONDITION_VOCAB);
	sections.push("");
	sections.push("---");
	sections.push("");
	sections.push(DATA_STATE_VOCAB);
	sections.push("");
	sections.push("---");
	sections.push("");
	sections.push(UNRESOLVED_FORMULAS);
	sections.push("");

	return sections.join("\n");
}
