/**
 * Affix Browser — browse all affixes organized by the 7 behavioral categories
 * from docs/model/affix-taxonomy.md.
 */

import { useState } from "react";
import affixesData from "./affixes-data.json";
import booksData from "./books-data.json";
import {
	btnStyle,
	dialogStyle,
	dialogTitleStyle,
	labelStyle,
	overlayStyle,
	selectStyle,
	theme as T,
} from "./components.tsx";

// ── Taxonomy Categories ─────────────────────────────────────────────

interface TaxonomyEntry {
	name: string;
	source: string; // e.g., "通用", "Sword", "千锋聚灵剑 (专属)"
	category: number;
	text?: string;
	effects: { type: string; [k: string]: unknown }[];
}

const CATEGORIES = [
	{ id: 1, name: "Passive Multipliers", cn: "被动加成", desc: "Always active when equipped" },
	{ id: 2, name: "Conditional Multipliers", cn: "条件加成", desc: "Scale with HP%, states, debuff count" },
	{ id: 3, name: "Flat Damage Additions", cn: "固定伤害", desc: "Extra damage per hit or cast" },
	{ id: 4, name: "State-Creating Effects", cn: "状态创建", desc: "Create buffs, debuffs, DoTs, shields" },
	{ id: 5, name: "Cross-Skill Effects", cn: "跨技能", desc: "Affect the next skill cast" },
	{ id: 6, name: "Reactive Triggers", cn: "被动触发", desc: "Fire on being attacked or per-tick" },
	{ id: 7, name: "State-Referencing", cn: "状态联动", desc: "Behavior depends on a named state" },
];

// ── Category Classification ─────────────────────────────────────────

/** Classify an affix's effects into a taxonomy category */
function classifyAffix(effects: { type: string; [k: string]: unknown }[]): number {
	const types = new Set(effects.map((e) => e.type));
	const hasParent = effects.some((e) => e.parent && e.parent !== "this");
	const hasTrigger = effects.some((e) => e.trigger === "on_attacked" || e.trigger === "per_tick");

	// Category 6: reactive triggers (check BEFORE state-referencing since
	// reactive effects often reference a parent state)
	if (hasTrigger || types.has("counter_buff") || types.has("counter_debuff") ||
		types.has("counter_debuff_upgrade") || types.has("cross_slot_debuff") ||
		types.has("attack_reduction") || types.has("lethal_rate_reduction") ||
		types.has("crit_damage_reduction") || types.has("crit_rate_reduction")) return 6;

	// Category 7: state-referencing (has parent= reference to a named state)
	if (hasParent) return 7;

	// Category 5: cross-skill
	if (types.has("next_skill_buff")) return 5;

	// Category 4: state-creating
	if (types.has("dot") || types.has("debuff") || types.has("conditional_debuff") ||
		types.has("random_debuff") || types.has("shield") || types.has("damage_to_shield") ||
		types.has("self_buff") || types.has("random_buff") || types.has("heal_echo_damage") ||
		types.has("lifesteal")) return 4;

	// Category 3: flat damage
	if (types.has("flat_extra_damage") || types.has("per_hit_escalation") ||
		types.has("on_buff_debuff_shield_trigger") || types.has("conditional_damage")) return 3;

	// Category 2: conditional multipliers
	if (types.has("execute_conditional") || types.has("per_enemy_lost_hp") ||
		types.has("per_self_lost_hp") || types.has("per_debuff_stack_damage") ||
		types.has("per_buff_stack_damage") || types.has("per_debuff_stack_true_damage") ||
		types.has("min_lost_hp_threshold") || types.has("ignore_damage_reduction") ||
		types.has("self_damage_taken_increase") || types.has("enemy_skill_damage_reduction") ||
		types.has("probability_to_certain")) return 2;

	// Category 1: passive multipliers (default)
	return 1;
}

// ── Build Full Affix Index ──────────────────────────────────────────

function buildAffixIndex(): TaxonomyEntry[] {
	const entries: TaxonomyEntry[] = [];
	const allAffixes = affixesData as {
		universal: Record<string, { text?: string; effects: { type: string; [k: string]: unknown }[] }>;
		school: Record<string, Record<string, { text?: string; effects: { type: string; [k: string]: unknown }[] }>>;
	};
	const allBooks = (booksData as { books: Record<string, {
		school: string;
		affix_text?: string;
		exclusive_affix_text?: string;
		primary_affix?: { name: string; effects: { type: string; [k: string]: unknown }[] };
		exclusive_affix?: { name: string; effects: { type: string; [k: string]: unknown }[] };
	}> }).books;

	// Universal affixes
	for (const [name, data] of Object.entries(allAffixes.universal)) {
		entries.push({
			name,
			source: "通用",
			category: classifyAffix(data.effects),
			text: data.text,
			effects: data.effects,
		});
	}

	// School affixes
	for (const [school, affixes] of Object.entries(allAffixes.school)) {
		for (const [name, data] of Object.entries(affixes)) {
			entries.push({
				name,
				source: school,
				category: classifyAffix(data.effects),
				text: data.text,
				effects: data.effects,
			});
		}
	}

	// Exclusive affixes (from books)
	for (const [bookName, book] of Object.entries(allBooks)) {
		if (book.exclusive_affix) {
			entries.push({
				name: book.exclusive_affix.name,
				source: `${bookName} (专属)`,
				category: classifyAffix(book.exclusive_affix.effects),
				text: book.exclusive_affix_text,
				effects: book.exclusive_affix.effects,
			});
		}
		if (book.primary_affix) {
			entries.push({
				name: book.primary_affix.name,
				source: `${bookName} (主词缀)`,
				category: classifyAffix(book.primary_affix.effects),
				text: book.affix_text,
				effects: book.primary_affix.effects,
			});
		}
	}

	return entries;
}

const AFFIX_INDEX = buildAffixIndex();

// ── AffixBrowser Component ──────────────────────────────────────────

export function AffixBrowser({
	onClose,
}: {
	onClose: () => void;
}) {
	const [selectedCategory, setSelectedCategory] = useState(0); // 0 = all
	const [selectedAffix, setSelectedAffix] = useState<TaxonomyEntry | null>(null);

	const filtered = selectedCategory === 0
		? AFFIX_INDEX
		: AFFIX_INDEX.filter((a) => a.category === selectedCategory);

	return (
		<div style={overlayStyle} onClick={onClose}>
			<div
				style={{ ...dialogStyle, maxHeight: "85vh", overflowY: "auto", minWidth: 600, maxWidth: 800 }}
				onClick={(e) => e.stopPropagation()}
			>
				<div style={dialogTitleStyle}>Affix Browser</div>

				{/* Category filter */}
				<div style={{ marginBottom: 12 }}>
					<label style={labelStyle}>Category</label>
					<select
						value={selectedCategory}
						onChange={(e) => { setSelectedCategory(Number(e.target.value)); setSelectedAffix(null); }}
						style={selectStyle}
					>
						<option value={0}>All ({AFFIX_INDEX.length})</option>
						{CATEGORIES.map((c) => {
							const count = AFFIX_INDEX.filter((a) => a.category === c.id).length;
							return (
								<option key={c.id} value={c.id}>
									{c.id}. {c.cn} — {c.name} ({count})
								</option>
							);
						})}
					</select>
				</div>

				{/* Category description */}
				{selectedCategory > 0 && (
					<div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10, textShadow: "1px 1px 2px black" }}>
						{CATEGORIES.find((c) => c.id === selectedCategory)?.desc}
					</div>
				)}

				{/* Affix list + detail split */}
				<div style={{ display: "flex", gap: 12, minHeight: 300 }}>
					{/* List */}
					<div style={{
						flex: "0 0 220px",
						overflowY: "auto",
						maxHeight: 400,
						background: "#111",
						borderRadius: 4,
						border: "1px solid #444",
						boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)",
					}}>
						{filtered.map((affix, i) => (
							<div
								key={`${affix.name}-${affix.source}-${i}`}
								onClick={() => setSelectedAffix(affix)}
								style={{
									padding: "6px 10px",
									cursor: "pointer",
									borderBottom: "1px solid #333",
									background: selectedAffix === affix ? `${T.goldDark}33` : "transparent",
									color: selectedAffix === affix ? T.goldLight : T.text,
									fontSize: 12,
									textShadow: "1px 1px 2px black",
								}}
							>
								<div style={{ fontWeight: selectedAffix === affix ? "bold" : "normal" }}>
									{affix.name}
								</div>
								<div style={{ fontSize: 10, color: T.textMuted }}>
									{affix.source}
								</div>
							</div>
						))}
					</div>

					{/* Detail */}
					<div style={{
						flex: 1,
						background: "#111",
						borderRadius: 4,
						border: "1px solid #444",
						padding: 10,
						overflowY: "auto",
						maxHeight: 400,
						boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)",
					}}>
						{selectedAffix ? (
							<>
								<div style={{ fontFamily: T.heading, color: T.goldLight, fontSize: 14, marginBottom: 6, textShadow: "1px 1px 3px #000" }}>
									{selectedAffix.name}
								</div>
								<div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>
									Source: {selectedAffix.source} | Category {selectedAffix.category}: {CATEGORIES[selectedAffix.category - 1]?.cn}
								</div>

								{selectedAffix.text && (
									<>
										<div style={{ color: T.goldLight, fontSize: 11, marginBottom: 2 }}>原文</div>
										<div style={{
											color: T.textMuted,
											whiteSpace: "pre-wrap",
											paddingLeft: 8,
											borderLeft: `2px solid ${T.goldDark}44`,
											fontSize: 11,
											marginBottom: 8,
											textShadow: "1px 1px 2px black",
										}}>
											{selectedAffix.text}
										</div>
									</>
								)}

								<div style={{ color: T.goldLight, fontSize: 11, marginBottom: 4 }}>Parsed Effects</div>
								{selectedAffix.effects.map((e, j) => {
									const { type, data_state, ...params } = e;
									const paramStr = Object.entries(params)
										.filter(([, v]) => v !== undefined)
										.map(([k, v]) => `${k}=${v}`)
										.join(", ");
									return (
										<div key={`${type}-${j}`} style={{ fontSize: 11, paddingLeft: 8, marginBottom: 2, color: T.text }}>
											<span style={{ color: T.sp }}>{type as string}</span>
											{paramStr ? `: ${paramStr}` : ""}
										</div>
									);
								})}
							</>
						) : (
							<div style={{ color: T.textMuted, fontSize: 12, padding: 20, textAlign: "center" }}>
								Select an affix to view details
							</div>
						)}
					</div>
				</div>

				{/* Close */}
				<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
					<button type="button" onClick={onClose} className={btnStyle}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
