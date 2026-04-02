/**
 * Function catalog — maps each combat function to its native platforms,
 * core aux affixes, and amplifier aux affixes.
 *
 * Data extracted from docs/model/function.themes.md.
 */

export interface FunctionDef {
	id: string;
	name: string;
	category: "offense" | "suppression" | "defense" | "amplification";
	nativePlatforms: string[];
	coreAux: string[];
	amplifierAux: string[];
}

export const FUNCTION_CATALOG: Record<string, FunctionDef> = {
	F_burst: {
		id: "F_burst",
		name: "Max single-slot damage",
		category: "offense",
		nativePlatforms: [
			"千锋聚灵剑",
			"春黎剑阵",
			"皓月剑诀",
			"念剑诀",
			"甲元仙符",
			"大罗幻诀",
		],
		coreAux: ["通明", "灵犀九重"],
		amplifierAux: [
			"击瑕",
			"破竹",
			"怒目",
			"福荫",
			"战意",
			"斩岳",
			"吞海",
			"摧山",
			"摧云折月",
			"破碎无双",
			"心火淬锋",
			"明王之路",
			"天命有归",
			"景星天佑",
			"溃魂击瑕",
			"破灭天光",
			"贪狼吞星",
			"意坠深渊",
		],
	},
	F_exploit: {
		id: "F_exploit",
		name: "%maxHP damage",
		category: "offense",
		nativePlatforms: ["千锋聚灵剑", "皓月剑诀"],
		coreAux: [],
		amplifierAux: ["福荫", "摧山", "通明"],
	},
	F_buff: {
		id: "F_buff",
		name: "Team stat buff",
		category: "amplification",
		nativePlatforms: ["甲元仙符", "十方真魄"],
		coreAux: ["福荫", "景星天佑"],
		amplifierAux: ["清灵", "业焰"],
	},
	F_survive: {
		id: "F_survive",
		name: "CC cleanse + DR",
		category: "defense",
		nativePlatforms: ["十方真魄"],
		coreAux: ["金汤", "金刚护体"],
		amplifierAux: [],
	},
	F_counter: {
		id: "F_counter",
		name: "Reflect attacks",
		category: "defense",
		nativePlatforms: ["疾风九变"],
		coreAux: [],
		amplifierAux: ["清灵", "业焰"],
	},
	F_delayed: {
		id: "F_delayed",
		name: "Delayed burst",
		category: "offense",
		nativePlatforms: ["无相魔劫咒"],
		coreAux: [],
		amplifierAux: ["业焰", "福荫"],
	},
	F_hp_exploit: {
		id: "F_hp_exploit",
		name: "Own HP loss to damage",
		category: "offense",
		nativePlatforms: ["十方真魄", "玄煞灵影诀", "疾风九变"],
		coreAux: ["战意"],
		amplifierAux: [
			"福荫",
			"摧山",
			"通明",
			"摧云折月",
			"灵犀九重",
			"破碎无双",
			"明王之路",
			"天命有归",
			"景星天佑",
			"意坠深渊",
		],
	},
	F_truedmg: {
		id: "F_truedmg",
		name: "True dmg from debuffs",
		category: "offense",
		nativePlatforms: ["大罗幻诀", "无相魔劫咒"],
		coreAux: [],
		amplifierAux: [],
	},
	F_dot: {
		id: "F_dot",
		name: "Sustained DoT",
		category: "offense",
		nativePlatforms: ["皓月剑诀", "念剑诀", "大罗幻诀"],
		coreAux: [],
		amplifierAux: ["业焰", "鬼印"],
	},
	F_sustain: {
		id: "F_sustain",
		name: "Lifesteal / self-healing",
		category: "defense",
		nativePlatforms: ["甲元仙符", "十方真魄", "疾风九变"],
		coreAux: [],
		amplifierAux: ["长生天则", "瑶光却邪"],
	},
	F_antiheal: {
		id: "F_antiheal",
		name: "Suppress enemy healing",
		category: "suppression",
		nativePlatforms: [],
		coreAux: ["祸星无妄"],
		amplifierAux: ["咒书", "业焰"],
	},
	F_dr_remove: {
		id: "F_dr_remove",
		name: "Bypass enemy DR",
		category: "suppression",
		nativePlatforms: [],
		coreAux: [],
		amplifierAux: [
			"业焰",
			"福荫",
			"破碎无双",
			"天命有归",
			"景星天佑",
			"意坠深渊",
		],
	},
};

/** Get all function IDs that a given book natively provides. */
export function getPlatformFunctions(bookId: string): string[] {
	return Object.entries(FUNCTION_CATALOG)
		.filter(([, fn]) => fn.nativePlatforms.includes(bookId))
		.map(([id]) => id);
}

/** Get aux affixes (core + amplifier) that serve a given function. */
export function getAuxAffixesForFunction(fnId: string): {
	core: string[];
	amplifier: string[];
} {
	const fn = FUNCTION_CATALOG[fnId];
	if (!fn) return { core: [], amplifier: [] };
	return { core: fn.coreAux, amplifier: fn.amplifierAux };
}
