/**
 * Per-book grammar lookup table.
 *
 * Grammar types:
 * - G2: base_attack + effects (no named state in skill)
 * - G3: base_attack + named state(s) (【name】 in skill)
 * - G4: leading self_hp_cost + base_attack + effects
 * - G5: leading self_hp_cost + base_attack + named state(s)
 * - G6: base_attack + self_cleanse + conditional cross-skill carry
 */

export type Grammar = "G2" | "G3" | "G4" | "G5" | "G6";

export interface BookMeta {
	grammar: Grammar;
	school: string;
}

export const BOOK_TABLE: Record<string, BookMeta> = {
	// Sword (剑修)
	千锋聚灵剑: { grammar: "G2", school: "Sword" },
	春黎剑阵: { grammar: "G2", school: "Sword" },
	皓月剑诀: { grammar: "G3", school: "Sword" },
	念剑诀: { grammar: "G2", school: "Sword" },
	通天剑诀: { grammar: "G2", school: "Sword" },
	"新-青元剑诀": { grammar: "G2", school: "Sword" },
	无极御剑诀: { grammar: "G2", school: "Sword" },

	// Spell (法修)
	浩然星灵诀: { grammar: "G3", school: "Spell" },
	元磁神光: { grammar: "G3", school: "Spell" },
	周天星元: { grammar: "G3", school: "Spell" },
	甲元仙符: { grammar: "G3", school: "Spell" },
	星元化岳: { grammar: "G2", school: "Spell" },
	玉书天戈符: { grammar: "G2", school: "Spell" },
	九天真雷诀: { grammar: "G6", school: "Spell" },

	// Demon (魔修)
	天魔降临咒: { grammar: "G3", school: "Demon" },
	天轮魔经: { grammar: "G2", school: "Demon" },
	天刹真魔: { grammar: "G3", school: "Demon" },
	解体化形: { grammar: "G2", school: "Demon" },
	大罗幻诀: { grammar: "G3", school: "Demon" },
	梵圣真魔咒: { grammar: "G3", school: "Demon" },
	无相魔劫咒: { grammar: "G3", school: "Demon" },

	// Body (体修)
	玄煞灵影诀: { grammar: "G3", school: "Body" },
	惊蜇化龙: { grammar: "G4", school: "Body" },
	十方真魄: { grammar: "G5", school: "Body" },
	疾风九变: { grammar: "G5", school: "Body" },
	煞影千幻: { grammar: "G5", school: "Body" },
	九重天凤诀: { grammar: "G3", school: "Body" },
	天煞破虚诀: { grammar: "G3", school: "Body" },
};
