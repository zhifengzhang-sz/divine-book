import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BOOK_TABLE } from "./book-table.js";
import { readExclusiveAffixTable } from "./exclusive.js";
import { parseMainSkills, parseSingleBook } from "./index.js";
import { readMainSkillTables, splitCell } from "./md-table.js";
import { buildStateRegistry } from "./states.js";

const RAW_PATH = resolve("data/raw/主书.md");
const EXCLUSIVE_PATH = resolve("data/raw/专属词缀.md");
const markdown = readFileSync(RAW_PATH, "utf-8");
const exclusiveMarkdown = existsSync(EXCLUSIVE_PATH)
	? readFileSync(EXCLUSIVE_PATH, "utf-8")
	: undefined;

// ─── Layer 1: MD Table Reader ───────────────────────────

describe("readMainSkillTables", () => {
	const entries = readMainSkillTables(markdown);

	it("extracts 28 books (7 per school)", () => {
		expect(entries.length).toBe(28);
	});

	it("assigns correct schools", () => {
		const sword = entries.filter((e) => e.school === "Sword");
		const spell = entries.filter((e) => e.school === "Spell");
		const demon = entries.filter((e) => e.school === "Demon");
		const body = entries.filter((e) => e.school === "Body");
		expect(sword.length).toBe(7);
		expect(spell.length).toBe(7);
		expect(demon.length).toBe(7);
		expect(body.length).toBe(7);
	});

	it("extracts book names correctly", () => {
		const names = entries.map((e) => e.name);
		expect(names).toContain("千锋聚灵剑");
		expect(names).toContain("大罗幻诀");
		expect(names).toContain("十方真魄");
		expect(names).toContain("九天真雷诀");
	});

	it("preserves raw skill text", () => {
		const qianfeng = entries.find((e) => e.name === "千锋聚灵剑");
		expect(qianfeng).toBeDefined();
		expect(qianfeng?.skillText).toContain("六段共计");
		expect(qianfeng?.skillText).toContain("<br>");
	});

	it("preserves raw affix text", () => {
		const qianfeng = entries.find((e) => e.name === "千锋聚灵剑");
		expect(qianfeng?.affixText).toContain("惊神剑光");
	});

	it("handles empty affix cells", () => {
		const wuji = entries.find((e) => e.name === "无极御剑诀");
		expect(wuji?.affixText).toBe("");
	});
});

// ─── splitCell ──────────────────────────────────────────

describe("splitCell", () => {
	it("splits description from tiers", () => {
		const result = splitCell(
			"造成六段共计x%攻击力的灵法伤害<br>悟0境：x=1500<br>悟10境，融合51重：x=20265",
		);
		expect(result.description).toHaveLength(1);
		expect(result.tiers).toHaveLength(2);
	});

	it("parses tier variables", () => {
		const result = splitCell("text<br>悟0境：x=1500, y=11, z=2200");
		expect(result.tiers[0].vars).toEqual({
			x: 1500,
			y: 11,
			z: 2200,
		});
		expect(result.tiers[0].enlightenment).toBe(0);
	});

	it("parses fusion tiers", () => {
		const result = splitCell("text<br>悟1境，融合20重：x=11265, y=15");
		expect(result.tiers[0].enlightenment).toBe(1);
		expect(result.tiers[0].fusion).toBe(20);
	});

	it("handles locked tiers", () => {
		const result = splitCell(
			"text<br>悟0境，此功能未解锁<br>悟1境，融合51重：x=1500",
		);
		expect(result.tiers[0].locked).toBe(true);
		expect(result.tiers[1].locked).toBeUndefined();
	});

	it("handles bare tier lines (no progression qualifier)", () => {
		const result = splitCell("text<br>x=1500, y=100, z=50");
		expect(result.tiers[0].enlightenment).toBeUndefined();
		expect(result.tiers[0].fusion).toBeUndefined();
		expect(result.tiers[0].vars).toEqual({ x: 1500, y: 100, z: 50 });
	});

	it("handles 融合重数>= syntax", () => {
		const result = splitCell("text<br>融合重数>=50: x=120, y=200");
		expect(result.tiers[0].fusion).toBe(50);
	});

	it("handles multiple description lines", () => {
		const result = splitCell(
			"desc1<br>【噬心魔咒】：描述<br>【断魂之咒】：描述",
		);
		expect(result.description).toHaveLength(3);
		expect(result.tiers).toHaveLength(0);
	});
});

// ─── Book Table ─────────────────────────────────────────

describe("BOOK_TABLE", () => {
	it("has entries for all 28 books", () => {
		expect(Object.keys(BOOK_TABLE).length).toBe(28);
	});

	it("matches schools from raw data", () => {
		const entries = readMainSkillTables(markdown);
		for (const entry of entries) {
			const meta = BOOK_TABLE[entry.name];
			expect(meta).toBeDefined();
			expect(meta?.school).toBe(entry.school);
		}
	});
});

// ─── State Registry ─────────────────────────────────────

describe("buildStateRegistry", () => {
	it("extracts 寂灭剑心 from 皓月剑诀", () => {
		const entry = readMainSkillTables(markdown).find(
			(e) => e.name === "皓月剑诀",
		)!;
		const cell = splitCell(entry.skillText);
		const states = buildStateRegistry(cell.description);
		expect(states["寂灭剑心"]).toBeDefined();
		expect(states["寂灭剑心"].target).toBe("self");
		expect(states["寂灭剑心"].duration).toBe(4);
		expect(states["寂灭剑心"].max_stacks).toBe(1);
	});

	it("extracts 不灭魔体 as permanent on_attacked", () => {
		const entry = readMainSkillTables(markdown).find(
			(e) => e.name === "天刹真魔",
		)!;
		const cell = splitCell(entry.skillText);
		const states = buildStateRegistry(cell.description);
		expect(states["不灭魔体"]).toBeDefined();
		expect(states["不灭魔体"].duration).toBe("permanent");
		expect(states["不灭魔体"].trigger).toBe("on_attacked");
	});

	it("extracts 结魂锁链 as permanent", () => {
		const entry = readMainSkillTables(markdown).find(
			(e) => e.name === "天魔降临咒",
		)!;
		const cell = splitCell(entry.skillText);
		const states = buildStateRegistry(cell.description);
		expect(states["结魂锁链"]).toBeDefined();
		expect(states["结魂锁链"].duration).toBe("permanent");
		expect(states["结魂锁链"].max_stacks).toBe(1);
	});

	it("extracts 罗天魔咒 with children", () => {
		const entry = readMainSkillTables(markdown).find(
			(e) => e.name === "大罗幻诀",
		)!;
		const cell = splitCell(entry.skillText);
		const states = buildStateRegistry(cell.description);
		expect(states["罗天魔咒"]).toBeDefined();
		expect(states["罗天魔咒"].duration).toBe(8);
		expect(states["罗天魔咒"].children).toContain("噬心之咒");
		expect(states["罗天魔咒"].children).toContain("断魂之咒");
	});

	it("extracts 落星 as non-dispellable per-hit stack", () => {
		const entry = readMainSkillTables(markdown).find(
			(e) => e.name === "煞影千幻",
		)!;
		const cell = splitCell(entry.skillText);
		const states = buildStateRegistry(cell.description);
		expect(states["落星"]).toBeDefined();
		expect(states["落星"].dispellable).toBe(false);
		expect(states["落星"].per_hit_stack).toBe(true);
		expect(states["落星"].duration).toBe(4);
	});
});

// ─── Full Parse ─────────────────────────────────────────

describe("parseMainSkills", () => {
	const result = parseMainSkills(markdown);

	it("parses all 28 books without errors", () => {
		expect(result.errors).toHaveLength(0);
		expect(Object.keys(result.books).length).toBe(28);
	});

	it("every book has a school", () => {
		for (const [_name, book] of Object.entries(result.books)) {
			expect(book.school).toBeTruthy();
		}
	});

	it("every book has skill effects", () => {
		for (const [_name, book] of Object.entries(result.books)) {
			expect(book.skill).toBeDefined();
			expect(book.skill?.length).toBeGreaterThan(0);
		}
	});

	it("every book has base_attack in skills", () => {
		for (const [_name, book] of Object.entries(result.books)) {
			const hasBA = book.skill?.some((e) => e.type === "base_attack");
			expect(hasBA).toBe(true);
		}
	});
});

// ─── Per-book verification ──────────────────────────────

describe("千锋聚灵剑 (G2, multi-tier)", () => {
	const parsed = parseSingleBook(markdown, "千锋聚灵剑")!;

	it("has 4 tiers × 2 effects = 8 skill effects", () => {
		expect(parsed.skill.length).toBe(8);
	});

	it("tier 0 has correct values", () => {
		const ba = parsed.skill[0];
		expect(ba.type).toBe("base_attack");
		expect(ba.hits).toBe(6);
		expect(ba.total).toBe(1500);
		expect(ba.data_state).toBe("enlightenment=0");
	});

	it("tier 3 (fusion=51) has correct values", () => {
		const ba = parsed.skill[6];
		expect(ba.type).toBe("base_attack");
		expect(ba.total).toBe(20265);
	});

	it("has primary affix 惊神剑光", () => {
		expect(parsed.primaryAffix).toBeDefined();
		expect(parsed.primaryAffix?.name).toBe("惊神剑光");
		expect(parsed.primaryAffix?.effects.length).toBe(2);
		expect(parsed.primaryAffix?.effects[0].type).toBe("per_hit_escalation");
		expect(parsed.primaryAffix?.effects[0].value).toBe(25);
	});
});

describe("春黎剑阵 (G2, summon)", () => {
	const parsed = parseSingleBook(markdown, "春黎剑阵")!;

	it("has base_attack + summon", () => {
		expect(parsed.skill.length).toBe(2);
		expect(parsed.skill[0].type).toBe("base_attack");
		expect(parsed.skill[0].hits).toBe(5);
		expect(parsed.skill[1].type).toBe("summon");
		expect(parsed.skill[1].duration).toBe(16);
	});

	it("has summon_buff affix", () => {
		expect(parsed.primaryAffix?.effects[0].type).toBe("summon_buff");
	});
});

describe("大罗幻诀 (G3, counter_debuff with children)", () => {
	const parsed = parseSingleBook(markdown, "大罗幻诀")!;

	it("has 2 tiers × 4 effects = 8 skill effects", () => {
		expect(parsed.skill.length).toBe(8);
	});

	it("tier 0 has base_attack + counter_debuff + 2 dots", () => {
		expect(parsed.skill[0].type).toBe("base_attack");
		expect(parsed.skill[0].total).toBe(1500);
		expect(parsed.skill[1].type).toBe("counter_debuff");
		expect(parsed.skill[1].name).toBe("罗天魔咒");
		expect(parsed.skill[2].type).toBe("dot");
		expect(parsed.skill[2].name).toBe("噬心之咒");
		expect(parsed.skill[2].parent).toBe("罗天魔咒");
		expect(parsed.skill[3].type).toBe("dot");
		expect(parsed.skill[3].name).toBe("断魂之咒");
	});

	it("tier 1 has correct values", () => {
		expect(parsed.skill[4].type).toBe("base_attack");
		expect(parsed.skill[4].total).toBe(20265);
		expect(parsed.skill[6].type).toBe("dot");
		expect(parsed.skill[6].percent_current_hp).toBe(7);
	});

	it("has counter_debuff_upgrade + cross_slot_debuff affix", () => {
		expect(parsed.primaryAffix?.name).toBe("魔魂咒界");
		expect(parsed.primaryAffix?.effects[0].type).toBe("counter_debuff_upgrade");
		expect(parsed.primaryAffix?.effects[1].type).toBe("cross_slot_debuff");
	});
});

describe("天魔降临咒 (G3, dual-target state)", () => {
	const parsed = parseSingleBook(markdown, "天魔降临咒")!;

	it("has self_buff + debuff for 结魂锁链", () => {
		expect(parsed.skill[1].type).toBe("self_buff");
		expect(parsed.skill[1].name).toBe("结魂锁链");
		expect(parsed.skill[1].duration).toBe("permanent");
		expect(parsed.skill[2].type).toBe("debuff");
		expect(parsed.skill[2].name).toBe("结魂锁链");
	});

	it("has per_debuff_stack_damage with parent", () => {
		expect(parsed.skill[3].type).toBe("per_debuff_stack_damage");
		expect(parsed.skill[3].parent).toBe("结魂锁链");
	});
});

describe("十方真魄 (G5, self_hp_cost + counter_buff)", () => {
	const parsed = parseSingleBook(markdown, "十方真魄")!;

	it("has self_hp_cost first", () => {
		expect(parsed.skill[0].type).toBe("self_hp_cost");
		expect(parsed.skill[0].value).toBe(10);
	});

	it("has self_buff 怒灵降世", () => {
		const buff = parsed.skill.find(
			(e) => e.type === "self_buff" && e.name === "怒灵降世",
		);
		expect(buff).toBeDefined();
		expect(buff?.attack_bonus).toBe(20);
		expect(buff?.damage_reduction).toBe(20);
		expect(buff?.duration).toBe(4);
	});

	it("has self_buff_extend + periodic_cleanse affix", () => {
		expect(parsed.primaryAffix?.effects[0].type).toBe("self_buff_extend");
		expect(parsed.primaryAffix?.effects[1].type).toBe("periodic_cleanse");
	});
});

describe("九天真雷诀 (G6, cross-skill carry)", () => {
	const parsed = parseSingleBook(markdown, "九天真雷诀")!;

	it("has self_cleanse + conditional_damage", () => {
		expect(parsed.skill[1].type).toBe("self_cleanse");
		expect(parsed.skill[1].count).toBe(2);
		expect(parsed.skill[2].type).toBe("conditional_damage");
		expect(parsed.skill[2].condition).toBe("cleanse_excess");
	});

	it("has no primary affix (empty affix cell)", () => {
		expect(parsed.primaryAffix).toBeUndefined();
	});
});

describe("甲元仙符 (G3, multi-tier with locked)", () => {
	const parsed = parseSingleBook(markdown, "甲元仙符")!;

	it("has locked first tier", () => {
		expect(parsed.skill[0].data_state).toBe("locked");
	});

	it("has self_buff 仙佑", () => {
		const buff = parsed.skill.find(
			(e) => e.type === "self_buff" && e.name === "仙佑",
		);
		expect(buff).toBeDefined();
		expect(buff?.attack_bonus).toBe(70);
	});

	it("affix has locked + tiered self_buff_extra", () => {
		expect(parsed.primaryAffix?.effects[0].data_state).toBe("locked");
		expect(parsed.primaryAffix?.effects[1].healing_bonus).toBe(70);
	});
});

describe("煞影千幻 (G5, shield + debuff)", () => {
	const parsed = parseSingleBook(markdown, "煞影千幻")!;

	it("has self_hp_cost + base_attack + effects", () => {
		expect(parsed.skill[0].type).toBe("self_hp_cost");
		expect(parsed.skill[1].type).toBe("base_attack");
		expect(parsed.skill[1].hits).toBe(3);
	});

	it("has shield and debuff 落星", () => {
		const shield = parsed.skill.find((e) => e.type === "shield");
		expect(shield).toBeDefined();
		const debuff = parsed.skill.find(
			(e) => e.type === "debuff" && e.name === "落星",
		);
		expect(debuff).toBeDefined();
		expect(debuff?.dispellable).toBe(false);
		expect(debuff?.per_hit_stack).toBe(true);
	});
});

describe("无相魔劫咒 (G3, delayed_burst)", () => {
	const parsed = parseSingleBook(markdown, "无相魔劫咒")!;

	it("has delayed_burst with correct values", () => {
		const burst = parsed.skill.find((e) => e.type === "delayed_burst");
		expect(burst).toBeDefined();
		expect(burst?.name).toBe("无相魔劫");
		expect(burst?.duration).toBe(12);
		expect(burst?.data_state).toBe("enlightenment=0");
	});
});

// ─── States in output ───────────────────────────────────

describe("states in BookData output", () => {
	const result = parseMainSkills(markdown);

	it("books with named states have states registry", () => {
		const withStates = Object.entries(result.books).filter(
			([, b]) => b.states && Object.keys(b.states).length > 0,
		);
		// 16 books have named states
		expect(withStates.length).toBe(16);
	});

	it("G2 books without named states have no states", () => {
		expect(result.books["千锋聚灵剑"].states).toBeUndefined();
		expect(result.books["通天剑诀"].states).toBeUndefined();
		expect(result.books["无极御剑诀"].states).toBeUndefined();
	});

	it("结魂锁链 has correct state def", () => {
		const states = result.books["天魔降临咒"].states!;
		expect(states["结魂锁链"]).toEqual({
			target: "opponent",
			duration: "permanent",
			max_stacks: 1,
		});
	});

	it("落星 has opponent target and per_hit_stack", () => {
		const states = result.books["煞影千幻"].states!;
		expect(states["落星"].target).toBe("opponent");
		expect(states["落星"].per_hit_stack).toBe(true);
		expect(states["落星"].dispellable).toBe(false);
		expect(states["落星"].duration).toBe(4);
	});

	it("仙佑 has duration 12", () => {
		const states = result.books["甲元仙符"].states!;
		expect(states["仙佑"].duration).toBe(12);
		expect(states["仙佑"].target).toBe("self");
	});

	it("罗天魔咒 has children and chance", () => {
		const states = result.books["大罗幻诀"].states!;
		expect(states["罗天魔咒"].duration).toBe(8);
		expect(states["罗天魔咒"].chance).toBe(30);
		expect(states["罗天魔咒"].trigger).toBe("on_attacked");
		expect(states["罗天魔咒"].children).toBeDefined();
		expect(states["罗天魔咒"].children?.length).toBeGreaterThan(0);
	});

	it("回生灵鹤 has duration 20", () => {
		const states = result.books["周天星元"].states!;
		expect(states["回生灵鹤"].duration).toBe(20);
	});

	it("不灭魔体 is permanent on_attacked", () => {
		const states = result.books["天刹真魔"].states!;
		expect(states["不灭魔体"].duration).toBe("permanent");
		expect(states["不灭魔体"].trigger).toBe("on_attacked");
	});

	it("怒意滔天 is permanent", () => {
		const states = result.books["玄煞灵影诀"].states!;
		expect(states["怒意滔天"].duration).toBe("permanent");
		expect(states["怒意滔天"].max_stacks).toBe(1);
	});

	it("蛮神 has per_hit_stack", () => {
		const states = result.books["九重天凤诀"].states!;
		expect(states["蛮神"].per_hit_stack).toBe(true);
		expect(states["蛮神"].duration).toBe(4);
	});
});

describe("玄煞灵影诀 (G3, self_hp_cost as DoT)", () => {
	const parsed = parseSingleBook(markdown, "玄煞灵影诀")!;

	it("has self_hp_cost with tick_interval", () => {
		const cost = parsed.skill.find((e) => e.type === "self_hp_cost");
		expect(cost).toBeDefined();
		expect(cost?.tick_interval).toBe(1);
		expect(cost?.name).toBe("怒意滔天");
		expect(cost?.duration).toBe("permanent");
	});

	it("has self_lost_hp_damage with parent", () => {
		const dmg = parsed.skill.find((e) => e.type === "self_lost_hp_damage");
		expect(dmg).toBeDefined();
		expect(dmg?.parent).toBe("怒意滔天");
	});
});

// ─── Exclusive Affixes ──────────────────────────────────

describe("readExclusiveAffixTable", () => {
	if (!exclusiveMarkdown) return;
	const entries = readExclusiveAffixTable(exclusiveMarkdown);

	it("reads 28 exclusive affix entries", () => {
		expect(entries.length).toBe(28);
	});

	it("normalizes name variants", () => {
		const names = entries.map((e) => e.bookName);
		expect(names).toContain("天刹真魔");
		expect(names).toContain("梵圣真魔咒");
		expect(names).toContain("惊蜇化龙");
		expect(names).not.toContain("天剎真魔");
		expect(names).not.toContain("焚圣真魔咒");
		expect(names).not.toContain("惊蛰化龙");
	});
});

describe("parseMainSkills with exclusive affixes", () => {
	if (!exclusiveMarkdown) return;
	const result = parseMainSkills(markdown, exclusiveMarkdown);

	it("all 28 books have exclusive_affix", () => {
		const booksWithExclusive = Object.values(result.books).filter(
			(b) => b.exclusive_affix,
		);
		expect(booksWithExclusive.length).toBe(28);
	});

	it("通天剑诀 exclusive: ignore_damage_reduction + damage_increase", () => {
		const book = result.books["通天剑诀"];
		expect(book.exclusive_affix).toBeDefined();
		expect(book.exclusive_affix?.name).toBe("神威冲云");
		const effects = book.exclusive_affix!.effects;
		expect(effects.some((e) => e.type === "ignore_damage_reduction")).toBe(
			true,
		);
		expect(effects.some((e) => e.type === "damage_increase")).toBe(true);
	});

	it("春黎剑阵 exclusive: dot with on_dispel child", () => {
		const book = result.books["春黎剑阵"];
		expect(book.exclusive_affix?.name).toBe("玄心剑魄");
		const effects = book.exclusive_affix!.effects;
		const dot = effects.find((e) => e.type === "dot");
		expect(dot).toBeDefined();
		expect(dot?.name).toBe("噬心");
		const dispel = effects.find((e) => e.type === "on_dispel");
		expect(dispel).toBeDefined();
		expect(dispel?.parent).toBe("噬心");
	});

	it("新-青元剑诀 exclusive: multi-tier next_skill_buff", () => {
		const book = result.books["新-青元剑诀"];
		expect(book.exclusive_affix?.name).toBe("天威煌煌");
		const effects = book.exclusive_affix!.effects;
		const buffs = effects.filter((e) => e.type === "next_skill_buff");
		expect(buffs.length).toBe(3);
		expect(buffs[0].value).toBe(88);
		expect(buffs[2].value).toBe(128);
	});

	it("无相魔劫咒 exclusive: debuff + conditional_damage with parent", () => {
		const book = result.books["无相魔劫咒"];
		expect(book.exclusive_affix?.name).toBe("无相魔威");
		const effects = book.exclusive_affix!.effects;
		const debuff = effects.find((e) => e.type === "debuff");
		expect(debuff).toBeDefined();
		expect(debuff?.name).toBe("魔劫");
		const cond = effects.find((e) => e.type === "conditional_damage");
		expect(cond).toBeDefined();
		expect(cond?.parent).toBe("魔劫");
	});

	it("解体化形 exclusive: probability_multiplier with tiers", () => {
		const book = result.books["解体化形"];
		expect(book.exclusive_affix?.name).toBe("心逐神随");
		const effects = book.exclusive_affix!.effects;
		const mults = effects.filter((e) => e.type === "probability_multiplier");
		expect(mults.length).toBe(2); // two tiers
	});

	it("天煞破虚诀 exclusive: periodic_dispel with damage", () => {
		const book = result.books["天煞破虚诀"];
		expect(book.exclusive_affix?.name).toBe("天煞破虚");
		const effects = book.exclusive_affix!.effects;
		const dispel = effects.find((e) => e.type === "periodic_dispel");
		expect(dispel).toBeDefined();
		expect(dispel?.damage_percent_of_skill).toBe(25.5);
		expect(dispel?.no_buff_double).toBe(true);
	});
});

// ─── Common & School Affixes ────────────────────────────

import {
	parseCommonAffixes,
	readSchoolAffixTable,
	readUniversalAffixTable,
} from "./common-affixes.js";

const UNIVERSAL_PATH = resolve("data/raw/通用词缀.md");
const SCHOOL_PATH = resolve("data/raw/修为词缀.md");
const universalMd = existsSync(UNIVERSAL_PATH)
	? readFileSync(UNIVERSAL_PATH, "utf-8")
	: undefined;
const schoolMd = existsSync(SCHOOL_PATH)
	? readFileSync(SCHOOL_PATH, "utf-8")
	: undefined;

describe("readUniversalAffixTable", () => {
	if (!universalMd) return;
	const entries = readUniversalAffixTable(universalMd);

	it("reads 16 universal affix entries", () => {
		expect(entries.length).toBe(16);
	});

	it("entries have no school", () => {
		for (const e of entries) {
			expect(e.school).toBeUndefined();
		}
	});

	it("extracts names correctly", () => {
		const names = entries.map((e) => e.name);
		expect(names).toContain("咒书");
		expect(names).toContain("通明");
		expect(names).toContain("福荫");
	});
});

describe("readSchoolAffixTable", () => {
	if (!schoolMd) return;
	const entries = readSchoolAffixTable(schoolMd);

	it("reads 17 school affix entries", () => {
		expect(entries.length).toBe(17);
	});

	it("assigns correct schools", () => {
		const sword = entries.filter((e) => e.school === "Sword");
		const spell = entries.filter((e) => e.school === "Spell");
		const demon = entries.filter((e) => e.school === "Demon");
		const body = entries.filter((e) => e.school === "Body");
		expect(sword.length).toBe(4);
		expect(spell.length).toBe(4);
		expect(demon.length).toBe(4);
		expect(body.length).toBe(5);
	});
});

describe("parseCommonAffixes", () => {
	if (!universalMd || !schoolMd) return;
	const result = parseCommonAffixes(universalMd, schoolMd);

	it("parses all 16 universal affixes", () => {
		expect(Object.keys(result.universal).length).toBe(16);
	});

	it("parses all 17 school affixes across 4 schools", () => {
		const schools = Object.keys(result.school);
		expect(schools.length).toBe(4);
		const total = Object.values(result.school).reduce(
			(s, g) => s + Object.keys(g).length,
			0,
		);
		expect(total).toBe(17);
	});

	it("no empty effects arrays", () => {
		for (const [_name, data] of Object.entries(result.universal)) {
			expect(data.effects.length).toBeGreaterThan(0);
		}
		for (const [_school, affixes] of Object.entries(result.school)) {
			for (const [_name, data] of Object.entries(affixes)) {
				expect(data.effects.length).toBeGreaterThan(0);
			}
		}
	});

	it("no warnings", () => {
		expect(result.warnings).toHaveLength(0);
	});

	// Spot checks — universal
	it("咒书: debuff_strength value=20", () => {
		const e = result.universal["咒书"].effects;
		expect(e[0].type).toBe("debuff_strength");
		expect(e[0].value).toBe(20);
	});

	it("通明: guaranteed_resonance 1.2/25%/1.5", () => {
		const e = result.universal["通明"].effects;
		expect(e[0].type).toBe("guaranteed_resonance");
		expect(e[0].base_multiplier).toBe(1.2);
		expect(e[0].chance).toBe(25);
		expect(e[0].upgraded_multiplier).toBe(1.5);
	});

	it("福荫: random_buff all=20", () => {
		const e = result.universal["福荫"].effects;
		expect(e[0].type).toBe("random_buff");
		expect(e[0].attack).toBe(20);
	});

	it("斩岳: flat_extra_damage value=2000", () => {
		const e = result.universal["斩岳"].effects;
		expect(e[0].type).toBe("flat_extra_damage");
		expect(e[0].value).toBe(2000);
	});

	// Spot checks — school
	it("灵犀九重 (Sword): guaranteed_resonance 2.97/25%/3.97", () => {
		const e = result.school["Sword"]["灵犀九重"].effects;
		expect(e[0].type).toBe("guaranteed_resonance");
		expect(e[0].base_multiplier).toBe(2.97);
		expect(e[0].upgraded_multiplier).toBe(3.97);
	});

	it("破碎无双 (Sword): triple_bonus", () => {
		const e = result.school["Sword"]["破碎无双"].effects;
		expect(e[0].type).toBe("triple_bonus");
		expect(e[0].attack_bonus).toBe(15);
		expect(e[0].damage_increase).toBe(15);
		expect(e[0].crit_damage_increase).toBe(15);
	});

	it("天命有归 (Spell): probability_to_certain", () => {
		const e = result.school["Spell"]["天命有归"].effects;
		expect(e[0].type).toBe("probability_to_certain");
		expect(e[0].damage_increase).toBe(50);
	});

	it("溃魂击瑕 (Demon): execute_conditional with guaranteed_crit", () => {
		const e = result.school["Demon"]["溃魂击瑕"].effects;
		expect(e[0].type).toBe("execute_conditional");
		expect(e[0].damage_increase).toBe(100);
		expect(e[0].guaranteed_crit).toBe(1);
	});

	it("意坠深渊 (Body): min_lost_hp_threshold", () => {
		const e = result.school["Body"]["意坠深渊"].effects;
		expect(e[0].type).toBe("min_lost_hp_threshold");
		expect(e[0].min_percent).toBe(11);
		expect(e[0].damage_increase).toBe(50);
	});

	it("贪狼吞星 (Body): per_enemy_lost_hp only (not per_self_lost_hp)", () => {
		const e = result.school["Body"]["贪狼吞星"].effects;
		expect(e.length).toBe(1);
		expect(e[0].type).toBe("per_enemy_lost_hp");
		expect(e[0].per_percent).toBe(1);
		expect(e[0].value).toBe(1);
	});
});
