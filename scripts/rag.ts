/**
 * RAG retrieval for divine book construction.
 *
 * Construction model (from data/raw/构造规则.md):
 *   灵书 = 1 主位 (main) + 2 辅助位 (aux)
 *   - Main slot: contributes skill + 主词缀 (deterministic)
 *   - Each aux slot: randomly rolls 1 副词缀 from that book's pool
 *     Pool = 通用词缀 (common, likely) + 修为词缀 (school, medium) + 专属词缀 (exclusive, rare)
 *   - Player builds 6 灵书, each using 3 different books, no source conflicts
 *
 * Usage:
 *   ! bun scripts/rag.ts "十方真魄配什么词缀"    → main book + best aux book candidates
 *   ! bun scripts/rag.ts "体修高爆发怎么搭"       → school-wide build advice
 *   ! bun scripts/rag.ts "哪些书有持续伤害"       → search by mechanic
 *   ! bun scripts/rag.ts "天魔降临咒的结魂锁链"    → mechanic lookup
 */
import { readFileSync } from "fs";
import { parse } from "yaml";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");

// ══════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════

interface BookDoc {
	kind: "book";
	id: string;
	school: string;
	prose: string;
	hits: number;
	skillTypes: string[];
	primaryAffix: { name: string; types: string[]; effects: any[] } | null;
	exclusiveAffix: { name: string; types: string[]; effects: any[] } | null;
	skillEffects: any[];
	allEffects: any[];
	archetype: string[];
	/** What this book offers as an aux (its 副词缀 pool: exclusive + school affixes) */
	auxPool: { exclusive: string | null; school: string[] };
	tags: string[];
}

interface AffixDoc {
	kind: "affix";
	id: string;
	affixType: "universal" | "school";
	school?: string;
	prose: string;
	effects: any[];
	category: string;
	tags: string[];
	synergies: string[];
}

type Doc = BookDoc | AffixDoc;

// ══════════════════════════════════════════════════════════
// Archetype classification
// ══════════════════════════════════════════════════════════

const ARCHETYPE_RULES: Record<string, (b: BookDoc) => boolean> = {
	"multi-hit-burst": (b) => b.hits >= 6,
	"hp-shred": (b) => b.skillTypes.some(t => t.includes("percent_max_hp") || t.includes("percent_current_hp")),
	"self-destruct": (b) => b.skillTypes.includes("self_hp_cost") && b.skillTypes.includes("self_lost_hp_damage"),
	"dot-attrition": (b) => b.skillTypes.includes("dot") || b.allEffects.some(e => e.type === "dot_permanent_max_hp"),
	"buff-stacker": (b) => b.skillTypes.includes("self_buff") && b.allEffects.some(e => e.type === "self_buff" && e.max_stacks),
	"counter-reactive": (b) => b.skillTypes.some(t => t.startsWith("counter_")),
	"debuff-engine": (b) => b.skillTypes.includes("debuff") || b.skillTypes.includes("buff_steal") || b.allEffects.some(e => e.type === "per_debuff_stack_damage"),
	"delayed-burst": (b) => b.skillTypes.includes("delayed_burst"),
	"summon": (b) => b.skillTypes.includes("summon"),
	"healer": (b) => b.skillTypes.includes("self_heal") && b.allEffects.filter(e => e.type === "self_heal").length >= 2,
	"shield-builder": (b) => b.skillTypes.includes("shield"),
};

const AFFIX_SYNERGY: Record<string, string[]> = {
	"per_hit_escalation": ["multi-hit-burst"],
	"guaranteed_crit": ["multi-hit-burst"],
	"flat_extra_damage": ["multi-hit-burst"],
	"dot_extra_per_tick": ["dot-attrition"],
	"dot_damage_buff": ["dot-attrition"],
	"dot_frequency_increase": ["dot-attrition"],
	"debuff_strength": ["dot-attrition", "debuff-engine"],
	"all_state_duration": ["dot-attrition", "buff-stacker", "counter-reactive"],
	"buff_strength": ["buff-stacker"],
	"buff_duration": ["buff-stacker"],
	"per_self_lost_hp": ["self-destruct"],
	"min_lost_hp_threshold": ["self-destruct"],
	"damage_reduction_during_cast": ["self-destruct"],
	"shield_value_increase": ["self-destruct", "shield-builder"],
	"conditional_damage_controlled": ["debuff-engine"],
	"conditional_damage_debuff": ["debuff-engine"],
	"per_enemy_lost_hp": ["debuff-engine", "dot-attrition"],
	"execute_conditional": ["multi-hit-burst", "debuff-engine"],
	"damage_buff": ["multi-hit-burst", "self-destruct"],
	"attack_buff": ["multi-hit-burst"],
	"triple_bonus": ["multi-hit-burst"],
	"final_damage_multiplier": ["buff-stacker"],
	"healing_buff": ["healer"],
	"healing_to_damage": ["healer"],
	"random_buff": ["multi-hit-burst", "buff-stacker"],
	"next_skill_buff": ["multi-hit-burst", "delayed-burst"],
	"damage_to_shield": ["self-destruct", "shield-builder"],
	"probability_to_certain": ["counter-reactive"],
	"ignore_damage_reduction": ["multi-hit-burst"],
};

const AFFIX_CATEGORIES: Record<string, string[]> = {
	"伤害增幅": ["damage_buff", "flat_extra_damage", "attack_buff", "crit_damage_buff", "final_damage_multiplier", "triple_bonus", "skill_damage_buff"],
	"条件增伤": ["conditional_damage_controlled", "conditional_damage_debuff", "execute_conditional", "per_self_lost_hp", "per_enemy_lost_hp", "conditional_stat_scaling", "min_lost_hp_threshold"],
	"递增/暴击": ["per_hit_escalation", "guaranteed_crit", "probability_to_certain", "random_buff", "probability_multiplier"],
	"状态强化": ["buff_strength", "debuff_strength", "all_state_duration", "buff_duration", "buff_stack_increase", "debuff_stack_increase", "debuff_stack_chance", "next_skill_buff"],
	"持续伤害": ["dot_extra_per_tick", "dot_damage_buff", "dot_frequency_increase"],
	"生存防御": ["damage_reduction_during_cast", "shield_value_increase", "damage_to_shield", "healing_buff", "self_damage_taken_increase"],
	"治疗压制": ["heal_reduction", "healing_to_damage"],
	"驱散/穿透": ["periodic_dispel", "ignore_damage_reduction"],
};

// ══════════════════════════════════════════════════════════
// Build index
// ══════════════════════════════════════════════════════════

function buildIndex() {
	const books = parse(readFileSync(resolve(ROOT, "data/yaml/books.yaml"), "utf-8")).books;
	const affixes = parse(readFileSync(resolve(ROOT, "data/yaml/affixes.yaml"), "utf-8"));
	const docs: Doc[] = [];

	// Collect school affix names per school
	const schoolAffixNames: Record<string, string[]> = {};
	for (const [school, m] of Object.entries<any>(affixes.school ?? {})) {
		schoolAffixNames[school] = Object.keys(m);
	}

	// ── Books ──
	const bookDocs: BookDoc[] = [];
	for (const [name, b] of Object.entries<any>(books)) {
		const skill = b.skill ?? [];
		const pa = b.primary_affix?.effects ?? [];
		const ea = b.exclusive_affix?.effects ?? [];
		const allEffects = [...skill, ...pa, ...ea];
		const skillTypes = [...new Set(skill.map((e: any) => e.type))] as string[];
		const ba = skill.find((e: any) => e.type === "base_attack");

		// Map school enum to Chinese name for affix lookup
		const schoolCn: Record<string, string> = { Sword: "剑修", Spell: "法修", Demon: "魔修", Body: "体修" };
		const cn = schoolCn[b.school] ?? "";

		const tags = [
			name, b.school, cn,
			...skillTypes,
			...allEffects.flatMap((e: any) => [e.state, e.name, e.target_state].filter(Boolean)),
			b.primary_affix?.name, b.exclusive_affix?.name,
		].filter(Boolean) as string[];

		const doc: BookDoc = {
			kind: "book",
			id: name,
			school: b.school,
			prose: [b.skill_text, b.affix_text, b.exclusive_affix_text].filter(Boolean).join("\n"),
			hits: ba?.hits ?? 1,
			skillTypes,
			primaryAffix: b.primary_affix ? { name: b.primary_affix.name, types: pa.map((e: any) => e.type), effects: pa } : null,
			exclusiveAffix: b.exclusive_affix ? { name: b.exclusive_affix.name, types: ea.map((e: any) => e.type), effects: ea } : null,
			skillEffects: skill,
			allEffects,
			archetype: [],
			auxPool: {
				exclusive: b.exclusive_affix?.name ?? null,
				school: schoolAffixNames[cn] ?? [],
			},
			tags,
		};

		for (const [arch, test] of Object.entries(ARCHETYPE_RULES)) {
			if (test(doc)) doc.archetype.push(arch);
		}
		doc.tags.push(...doc.archetype);

		docs.push(doc);
		bookDocs.push(doc);
	}

	// ── Affixes (universal + school) ──
	const addAffix = (id: string, a: any, affixType: "universal" | "school", school?: string) => {
		const effs = a.effects ?? [];
		const types = effs.map((e: any) => e.type) as string[];
		let category = "其他";
		for (const [cat, catTypes] of Object.entries(AFFIX_CATEGORIES)) {
			if (types.some(t => catTypes.includes(t))) { category = cat; break; }
		}
		const synergies = [...new Set(types.flatMap(t => AFFIX_SYNERGY[t] ?? []))];
		const tags = [id.replace(/.*\//, ""), category, ...types, ...synergies, ...(school ? [school] : [])];
		docs.push({ kind: "affix", id, affixType, school, prose: a.text ?? "", effects: effs, category, tags, synergies });
	};

	for (const [name, a] of Object.entries<any>(affixes.universal ?? {}))
		addAffix(`通用/${name}`, a, "universal");
	for (const [school, m] of Object.entries<any>(affixes.school ?? {}))
		for (const [name, a] of Object.entries<any>(m))
			addAffix(`${school}/${name}`, a, "school", school);

	return { docs, bookDocs };
}

// ══════════════════════════════════════════════════════════
// Retrieval
// ══════════════════════════════════════════════════════════

const QUERY_EXPAND: Record<string, string[]> = {
	"爆发": ["multi-hit-burst", "hits", "escalation", "暴击"],
	"持续": ["dot-attrition", "dot", "持续伤害", "业火"],
	"减益": ["debuff-engine", "debuff", "减益", "偷取"],
	"增益": ["buff-stacker", "buff", "增益", "self_buff"],
	"护盾": ["shield-builder", "shield", "护盾"],
	"治疗": ["healer", "heal", "self_heal", "治疗", "恢复"],
	"反伤": ["counter-reactive", "counter", "反射", "受到伤害"],
	"体修": ["self-destruct", "Body", "气血", "已损", "消耗"],
	"剑修": ["Sword", "剑气", "剑阵"],
	"法修": ["Spell", "天书", "灵鹤"],
	"魔修": ["Demon", "魔", "业火", "咒"],
	"配什么": ["synergy", "affix", "aux"],
	"词缀": ["affix", "通用", "修为", "专属", "aux"],
	"搭配": ["synergy", "affix", "aux"],
};

const SCHOOL_NAMES: Record<string, string> = {
	"体修": "Body", "剑修": "Sword", "法修": "Spell", "魔修": "Demon",
};

function expandQuery(query: string): string[] {
	const extra: string[] = [];
	for (const [trigger, expansions] of Object.entries(QUERY_EXPAND)) {
		if (query.includes(trigger)) extra.push(...expansions);
	}
	return extra;
}

function score(query: string, doc: Doc, expansions: string[]): number {
	let s = 0;
	const allTags = doc.tags;
	const searchId = doc.id.replace(/.*\//, "");

	if (query.includes(searchId)) s += 15;

	if (doc.kind === "book") {
		for (const [cn, en] of Object.entries(SCHOOL_NAMES)) {
			if (query.includes(cn) && (doc as BookDoc).school === en) s += 12;
		}
	}

	for (const tag of allTags) {
		if (typeof tag === "string" && query.includes(tag)) s += 5;
	}

	for (const exp of expansions) {
		for (const tag of allTags) {
			if (typeof tag === "string" && (tag.includes(exp) || exp.includes(tag))) s += 3;
		}
	}

	if (doc.kind === "affix") {
		for (const syn of (doc as AffixDoc).synergies) {
			if (expansions.includes(syn)) s += 8;
		}
	}

	const prose = doc.prose;
	for (let i = 0; i < query.length - 1; i++) {
		if (prose.includes(query.slice(i, i + 2))) s += 1;
	}

	return s;
}

function retrieve(query: string, docs: Doc[], topK = 10): Doc[] {
	const expansions = expandQuery(query);
	const mentionedBooks = docs.filter(d => d.kind === "book" && query.includes(d.id)).map(d => d as BookDoc);
	const archetypesNeeded = mentionedBooks.flatMap(b => b.archetype);
	const boostedExpansions = [...expansions, ...archetypesNeeded];

	const scored = docs.map(doc => ({ doc, score: score(query, doc, boostedExpansions) }));
	return scored.sort((a, b) => b.score - a.score).slice(0, topK).filter(s => s.score > 1).map(s => s.doc);
}

// ══════════════════════════════════════════════════════════
// Aux book recommendation
// ══════════════════════════════════════════════════════════

function recommendAux(mainBook: BookDoc, allBooks: BookDoc[]): { book: BookDoc; reason: string }[] {
	const mainArchetypes = new Set(mainBook.archetype);
	const candidates: { book: BookDoc; score: number; reason: string }[] = [];

	for (const b of allBooks) {
		if (b.id === mainBook.id) continue;

		let s = 0;
		const reasons: string[] = [];

		// Score exclusive affix synergy with main book's archetypes
		if (b.exclusiveAffix) {
			for (const t of b.exclusiveAffix.types) {
				const synArchetypes = AFFIX_SYNERGY[t] ?? [];
				for (const syn of synArchetypes) {
					if (mainArchetypes.has(syn)) {
						s += 10;
						reasons.push(`专属【${b.exclusiveAffix.name}】synergizes with ${syn}`);
					}
				}
			}
		}

		// Same school = access to same school affixes (already available via any same-school book)
		if (b.school === mainBook.school) s += 2;

		// Different school = access to that school's 修为 affixes
		if (b.school !== mainBook.school) {
			reasons.push(`brings ${b.school} school affixes`);
			s += 1;
		}

		if (s > 0) {
			candidates.push({ book: b, score: s, reason: reasons.join("; ") });
		}
	}

	return candidates
		.sort((a, b) => b.score - a.score)
		.slice(0, 8)
		.map(c => ({ book: c.book, reason: c.reason }));
}

// ══════════════════════════════════════════════════════════
// Format output
// ══════════════════════════════════════════════════════════

function formatBookAsMain(doc: BookDoc): string {
	const lines = [
		`### 📖 ${doc.id} (${doc.school}) — as MAIN slot`,
		`Archetype: ${doc.archetype.join(", ") || "generic"} | Hits: ${doc.hits}`,
		"",
		doc.prose.trim(),
		"",
		`Primary affix (确定): ${doc.primaryAffix ? `【${doc.primaryAffix.name}】 ${doc.primaryAffix.types.join(", ")}` : "(none)"}`,
		"",
		"Skill effects:",
	];
	for (const e of doc.skillEffects) lines.push(`  - ${JSON.stringify(e)}`);
	if (doc.primaryAffix) {
		lines.push("", "Primary affix effects:");
		for (const e of doc.primaryAffix.effects) lines.push(`  - ${JSON.stringify(e)}`);
	}
	return lines.join("\n");
}

function formatBookAsAux(doc: BookDoc, reason: string): string {
	const lines = [
		`### 🔧 ${doc.id} (${doc.school}) — as AUX slot`,
		`Reason: ${reason}`,
		`Aux pool: 专属【${doc.exclusiveAffix?.name ?? "none"}】+ ${doc.auxPool.school.length} school affixes + 16 universal`,
	];
	if (doc.exclusiveAffix) {
		lines.push(``, `Exclusive affix (rare roll):`, `  【${doc.exclusiveAffix.name}】 ${doc.exclusiveAffix.types.join(", ")}`);
		for (const e of doc.exclusiveAffix.effects) lines.push(`    ${JSON.stringify(e)}`);
	}
	return lines.join("\n");
}

function formatBook(doc: BookDoc): string {
	const lines = [
		`### 📖 ${doc.id} (${doc.school})`,
		`Archetype: ${doc.archetype.join(", ") || "generic"} | Hits: ${doc.hits}`,
		"",
		doc.prose.trim(),
		"",
	];
	if (doc.primaryAffix) lines.push(`Primary [${doc.primaryAffix.name}]: ${doc.primaryAffix.types.join(", ")}`);
	if (doc.exclusiveAffix) lines.push(`Exclusive [${doc.exclusiveAffix.name}]: ${doc.exclusiveAffix.types.join(", ")}`);
	lines.push("", "Effects:");
	for (const e of doc.allEffects) lines.push(`  - ${JSON.stringify(e)}`);
	return lines.join("\n");
}

function formatAffix(doc: AffixDoc): string {
	const lines = [
		`### 🏷 ${doc.id}${doc.school ? ` (${doc.school})` : ""} [${doc.affixType}]`,
		`Category: ${doc.category} | Synergies: ${doc.synergies.join(", ") || "generic"}`,
		"",
		doc.prose.trim(),
		"",
		"Effects:",
	];
	for (const e of doc.effects) lines.push(`  - ${JSON.stringify(e)}`);
	return lines.join("\n");
}

// ══════════════════════════════════════════════════════════
// JSON output types
// ══════════════════════════════════════════════════════════

interface RagJsonOutput {
	query: string;
	mode: "general" | "construction";
	books: Array<{
		id: string; school: string; hits: number;
		archetypes: string[];
		skillEffects: any[];
		primaryAffix: { name: string; types: string[]; effects: any[] } | null;
		exclusiveAffix: { name: string; types: string[]; effects: any[] } | null;
	}>;
	affixes: Array<{
		id: string; type: "universal" | "school";
		school?: string; effects: any[];
	}>;
	auxRecommendations?: Array<{
		bookId: string; score: number; reason: string;
	}>;
}

// ══════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════

// Parse flags: extract --json and the positional query from argv
const rawArgs = process.argv.slice(2);
const jsonMode = rawArgs.includes("--json");
const positionalArgs = rawArgs.filter(a => a !== "--json");
const query = positionalArgs[0];

if (!query) {
	console.error("Usage: bun scripts/rag.ts [--json] <query>");
	console.error("");
	console.error("Construction model: 灵书 = 1 主位 (main) + 2 辅助位 (aux)");
	console.error("  Main: skill + 主词缀 (deterministic)");
	console.error("  Each aux: random 副词缀 from 通用/修为/专属 pool");
	console.error("");
	console.error('  ! bun run rag "十方真魄配什么词缀"    → main + aux candidates');
	console.error('  ! bun run rag "体修高爆发怎么搭"       → school build advice');
	console.error('  ! bun run rag "哪些书有持续伤害"       → search by mechanic');
	console.error('  ! bun run rag --json "十方真魄配什么词缀"  → JSON output');
	process.exit(1);
}

const { docs, bookDocs } = buildIndex();
const expansions = expandQuery(query);
const isConstructionQuery = expansions.some(e => ["synergy", "affix", "aux"].includes(e));
const mentionedBooks = bookDocs.filter(b => query.includes(b.id));

// ── Construction query: specific book + "配什么/词缀/搭配" ──
if (isConstructionQuery && mentionedBooks.length > 0) {
	const mainBook = mentionedBooks[0];

	// Map school enum to Chinese for affix lookup
	const schoolCn: Record<string, string> = { Sword: "剑修", Spell: "法修", Demon: "魔修", Body: "体修" };
	const mainSchoolCn = schoolCn[mainBook.school] ?? "";

	// Collect the full 副词缀 pool that ANY aux book of a given school provides
	const affixDocs = docs.filter(d => d.kind === "affix") as AffixDoc[];
	const universalAffixes = affixDocs.filter(d => d.affixType === "universal");
	const sameSchoolAffixes = affixDocs.filter(d => d.affixType === "school" && d.school === mainSchoolCn);
	const otherSchoolAffixes = affixDocs.filter(d => d.affixType === "school" && d.school !== mainSchoolCn);

	// Collect exclusive affixes from other books
	const exclusives = bookDocs
		.filter(b => b.id !== mainBook.id && b.exclusiveAffix)
		.map(b => ({
			book: b.id,
			school: b.school,
			name: b.exclusiveAffix!.name,
			types: b.exclusiveAffix!.types,
			effects: b.exclusiveAffix!.effects,
		}));

	if (jsonMode) {
		// ── JSON output for construction mode ──
		const allAffixDocs = [...universalAffixes, ...sameSchoolAffixes, ...otherSchoolAffixes];
		const auxRecs = recommendAux(mainBook, bookDocs);

		const output: RagJsonOutput = {
			query,
			mode: "construction",
			books: [{
				id: mainBook.id,
				school: mainBook.school,
				hits: mainBook.hits,
				archetypes: mainBook.archetype,
				skillEffects: mainBook.skillEffects,
				primaryAffix: mainBook.primaryAffix,
				exclusiveAffix: mainBook.exclusiveAffix,
			}],
			affixes: allAffixDocs.map(a => ({
				id: a.id,
				type: a.affixType,
				...(a.school ? { school: a.school } : {}),
				effects: a.effects,
			})),
			auxRecommendations: auxRecs.map(r => ({
				bookId: r.book.id,
				score: score(query, r.book, expandQuery(query)),
				reason: r.reason,
			})),
		};
		console.log(JSON.stringify(output, null, 2));
	} else {
		// ── Markdown output for construction mode ──
		console.log(`── 灵书构造 context for: ${query} ──`);
		console.log(`── Model: 灵书 = 1 主位 + 2 辅助位. Each aux rolls 1 副词缀 ──`);
		console.log(`── Roll probability: 通用(likely) > 修为(medium) > 专属(rare) ──\n`);

		// 1. Main book
		console.log("## 1. Main Book (主位) — skill + 主词缀, deterministic\n");
		console.log(formatBook(mainBook));

		// 2. Full 副词缀 pool — this is what Claude needs to reason about
		console.log("\n\n## 2. 副词缀 Pool — what each aux slot can roll\n");
		console.log("Choose 2 affixes (one per aux slot). These are ALL possible rolls:\n");

		console.log("### 通用词缀 (16, high probability from any aux book)\n");
		for (const a of universalAffixes) {
			const name = a.id.replace("通用/", "");
			const types = a.effects.map((e: any) => e.type).join(", ");
			console.log(`  【${name}】${types}: ${JSON.stringify(a.effects[0])}`);
		}

		console.log(`\n### ${mainSchoolCn}修为词缀 (same-school aux book, medium probability)\n`);
		for (const a of sameSchoolAffixes) {
			const name = a.id.replace(/.*\//, "");
			const types = a.effects.map((e: any) => e.type).join(", ");
			console.log(`  【${name}】${types}: ${JSON.stringify(a.effects[0])}`);
		}

		if (otherSchoolAffixes.length > 0) {
			console.log("\n### Other school 修为词缀 (cross-school aux book, medium probability)\n");
			const bySchool: Record<string, AffixDoc[]> = {};
			for (const a of otherSchoolAffixes) {
				const s = a.school ?? "unknown";
				(bySchool[s] ??= []).push(a);
			}
			for (const [school, affixes] of Object.entries(bySchool)) {
				console.log(`  ${school}:`);
				for (const a of affixes) {
					const name = a.id.replace(/.*\//, "");
					const types = a.effects.map((e: any) => e.type).join(", ");
					console.log(`    【${name}】${types}`);
				}
			}
		}

		console.log("\n### 专属词缀 (rare roll, specific to aux book chosen)\n");
		for (const ex of exclusives) {
			console.log(`  ${ex.book} (${ex.school}) →【${ex.name}】${ex.types.join(", ")}`);
		}

		// 3. Aux book selection guide
		console.log("\n\n## 3. Aux Book Selection\n");
		console.log("Which aux book you pick determines which 修为 + 专属 are in the pool:");
		console.log(`  Same school (${mainSchoolCn}): access to ${mainSchoolCn} 修为词缀`);
		console.log("  Cross school: access to that school's 修为词缀 instead");
		console.log("  通用词缀 are always available regardless of aux book choice\n");

		console.log(`\n── End context. Now answer: ${query} ──`);
	}
}
// ── General query ──
else {
	const results = retrieve(query, docs);

	if (jsonMode) {
		// ── JSON output for general mode ──
		const bookResults = results.filter(d => d.kind === "book") as BookDoc[];
		const affixResults = results.filter(d => d.kind === "affix") as AffixDoc[];

		const output: RagJsonOutput = {
			query,
			mode: "general",
			books: bookResults.map(b => ({
				id: b.id,
				school: b.school,
				hits: b.hits,
				archetypes: b.archetype,
				skillEffects: b.skillEffects,
				primaryAffix: b.primaryAffix,
				exclusiveAffix: b.exclusiveAffix,
			})),
			affixes: affixResults.map(a => ({
				id: a.id,
				type: a.affixType,
				...(a.school ? { school: a.school } : {}),
				effects: a.effects,
			})),
		};
		console.log(JSON.stringify(output, null, 2));
	} else {
		// ── Markdown output for general mode ──
		if (results.length === 0) { console.log(`No results for: ${query}`); process.exit(0); }

		const bookResults = results.filter(d => d.kind === "book") as BookDoc[];
		const affixResults = results.filter(d => d.kind === "affix") as AffixDoc[];

		console.log(`── Retrieved ${results.length} docs (${bookResults.length} books, ${affixResults.length} affixes) for: ${query} ──\n`);

		if (bookResults.length) {
			console.log("## Books\n");
			console.log(bookResults.map(formatBook).join("\n\n---\n\n"));
		}
		if (affixResults.length) {
			console.log("\n\n## Affixes\n");
			console.log(affixResults.map(formatAffix).join("\n\n---\n\n"));
		}

		console.log(`\n── End context. Now answer: ${query} ──`);
	}
}
