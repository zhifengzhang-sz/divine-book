/**
 * Layer 4: Pattern-based effect extractor
 *
 * Matches Chinese game text fragments against known patterns
 * to produce typed effect records. Each pattern is a regex with
 * named capture groups.
 */

export interface ExtractedEffect {
	type: string;
	fields: Record<string, string | number>;
	/** Additional metadata (name, parent, per_hit, etc.) */
	meta?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────
// Numeric capture helper
// ─────────────────────────────────────────────────────────

const NUM = "(-?\\d+(?:\\.\\d+)?)";

function num(name: string): string {
	return `(?<${name}>${NUM.slice(1, -1)})`;
}

function capture(groups: Record<string, number>): Record<string, number> {
	const out: Record<string, number> = {};
	for (const [k, v] of Object.entries(groups)) {
		out[k] = v;
	}
	return out;
}

function toNum(
	match: RegExpMatchArray,
	...names: string[]
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const name of names) {
		const val = match.groups?.[name];
		if (val !== undefined) out[name] = Number(val);
	}
	return out;
}

// ─────────────────────────────────────────────────────────
// Base attack pattern
// ─────────────────────────────────────────────────────────

const BASE_ATTACK_RE =
	/造成(?<hits_text>(?:(?:一|二|三|四|五|六|七|八|九|十)+)段)?(?:共(?:计)?)?(?<total>\d+(?:\.\d+)?)%攻击力的(?:灵法)?伤害/;

const CN_NUMS: Record<string, number> = {
	一: 1,
	二: 2,
	三: 3,
	四: 4,
	五: 5,
	六: 6,
	七: 7,
	八: 8,
	九: 9,
	十: 10,
};

function parseCnNumber(text: string): number {
	if (!text) return 1;
	// Handle simple cases like 五, 八, 十
	if (text.length === 1 && CN_NUMS[text]) return CN_NUMS[text];
	// Handle 十X (10+X)
	if (text.startsWith("十") && text.length === 2) {
		return 10 + (CN_NUMS[text[1]] || 0);
	}
	return CN_NUMS[text] || 1;
}

export function extractBaseAttack(
	text: string,
): { hits: number | string; total: number | string } | null {
	const m = BASE_ATTACK_RE.exec(text);
	if (!m) return null;

	const hitsText = m.groups?.hits_text;
	const total = m.groups?.total;

	return {
		hits: hitsText ? parseCnNumber(hitsText) : 1,
		total: total ? (total.includes(".") ? Number(total) : "x") : "x",
	};
}

/**
 * Extract base_attack from text, using variable names for tier substitution.
 * Tries to detect which variable maps to total and hits from the pattern.
 */
export function extractBaseAttackWithVars(
	text: string,
): {
	hits: number;
	totalVar: string;
	extra?: ExtractedEffect[];
} | null {
	// Try literal number first
	const litMatch = text.match(
		/造成(?:(?:一|二|三|四|五|六|七|八|九|十)+段)?(?:共(?:计)?)?(\d+(?:\.\d+)?)%攻击力的(?:灵法)?伤害/,
	);
	const hitsMatch = text.match(
		/造成((?:一|二|三|四|五|六|七|八|九|十)+)段/,
	);
	const hits = hitsMatch ? parseCnNumber(hitsMatch[1]) : 1;

	// Check if total is a variable reference (x, y) or literal
	const varMatch = text.match(
		/(?:共(?:计)?)?([a-zA-Z])%攻击力的(?:灵法)?伤害/,
	);
	if (varMatch) {
		return { hits, totalVar: varMatch[1] };
	}

	if (litMatch) {
		return { hits, totalVar: String(litMatch[1]) };
	}

	return null;
}

// ─────────────────────────────────────────────────────────
// Percent HP damage patterns
// ─────────────────────────────────────────────────────────

export function extractPercentHpDamage(text: string): ExtractedEffect | null {
	// 每段攻击造成目标{x}%最大气血值的伤害（对怪物伤害不超过自身{z}%攻击力）
	const maxHpMatch = text.match(
		/(?:每段攻击)?造成(?:目标)?(\w+)%最大气血值的伤害(?:（对怪物(?:伤害)?(?:最多|不超过)(?:造成)?(?:自身)?(\w+)%攻击力(?:的伤害)?）)?/,
	);
	if (maxHpMatch) {
		const fields: Record<string, string | number> = {
			value: maxHpMatch[1],
		};
		if (maxHpMatch[2]) fields.cap_vs_monster = maxHpMatch[2];
		return { type: "percent_max_hp_damage", fields };
	}

	// 每段伤害附加{y}%自身最大气血值的伤害 (NOT preceded by 若净化)
	const selfMaxHpMatch = text.match(
		/(?:每段)?(?:伤害|攻击)附加(\w+)%自身最大气血值的伤害/,
	);
	// Skip if this is part of a conditional_damage pattern (若净化...)
	if (selfMaxHpMatch && /若净化.*附加/.test(text)) return null;
	if (selfMaxHpMatch) {
		return {
			type: "percent_max_hp_damage",
			fields: { value: selfMaxHpMatch[1] },
			meta: { source: "self" },
		};
	}

	return null;
}

// ─────────────────────────────────────────────────────────
// Self HP cost
// ─────────────────────────────────────────────────────────

export function extractSelfHpCost(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/消耗自身(\w+)%(?:的)?当前气血值/);
	if (m) {
		return {
			type: "self_hp_cost",
			fields: { value: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Named state extraction
// ─────────────────────────────────────────────────────────

export interface NamedStateInfo {
	name: string;
	target: "self" | "opponent" | "both";
	trigger: "on_cast" | "on_attacked" | "per_tick";
	duration?: number | "permanent";
	maxStacks?: number;
	chance?: number;
	dispellable?: boolean;
	perHitStack?: boolean;
	children?: string[];
	/** Raw description text after the state name */
	descriptionText: string;
}

/**
 * Extract named state info from text containing 【name】.
 */
export function extractNamedState(text: string): NamedStateInfo | null {
	// Match 【X】 pattern
	const nameMatch = text.match(/【(.+?)】/);
	if (!nameMatch) return null;

	const name = nameMatch[1];
	const fullText = text;

	// Determine target
	let target: "self" | "opponent" | "both" = "self";
	if (
		/对其施加|对敌方施加|对攻击方添加|为目标添加|对目标/.test(
			text.split("【")[0],
		)
	) {
		target = "opponent";
	}
	if (/为自身添加|自身获得|使自身进入/.test(text.split("【")[0])) {
		target = "self";
	}

	// Determine trigger
	let trigger: "on_cast" | "on_attacked" | "per_tick" = "on_cast";
	if (/受到(?:伤害|攻击)时/.test(fullText)) {
		trigger = "on_attacked";
	}

	// Duration
	let duration: number | "permanent" | undefined;
	const durMatch = fullText.match(/持续(\d+(?:\.\d+)?)秒/);
	if (durMatch) duration = Number(durMatch[1]);
	if (/战斗状态内永久生效/.test(fullText)) duration = "permanent";

	// Max stacks
	let maxStacks: number | undefined;
	const stackMatch = fullText.match(/最多叠加(\d+)层/);
	if (stackMatch) maxStacks = Number(stackMatch[1]);

	// Chance
	let chance: number | undefined;
	const chanceMatch = fullText.match(/各?有?(\d+)%概率/);
	if (chanceMatch) chance = Number(chanceMatch[1]);

	// Dispellable
	let dispellable: boolean | undefined;
	if (/不可驱散|无法被驱散/.test(fullText)) dispellable = false;

	// Per-hit stacking
	let perHitStack: boolean | undefined;
	if (/每段攻击.*?添加1层/.test(fullText)) perHitStack = true;

	// Children (【X】与【Y】)
	const childMatch = fullText.match(
		/添加.*?层【(.+?)】与【(.+?)】/,
	);
	const children = childMatch
		? [childMatch[1], childMatch[2]]
		: undefined;

	// Description text after 【name】：
	const colonIdx = text.indexOf("】：");
	const descriptionText =
		colonIdx !== -1 ? text.slice(colonIdx + 2) : "";

	return {
		name,
		target,
		trigger,
		duration,
		maxStacks,
		chance,
		dispellable,
		perHitStack,
		children,
		descriptionText,
	};
}

// ─────────────────────────────────────────────────────────
// Self buff stat extraction
// ─────────────────────────────────────────────────────────

export function extractSelfBuffStats(
	text: string,
): Record<string, string | number> {
	const stats: Record<string, string | number> = {};

	// 提升{x}%攻击力(加成)
	const atkMatch = text.match(/(?:提升|提高)(?:自身)?(\w+)%(?:的)?攻击力/);
	if (atkMatch) stats.attack_bonus = atkMatch[1];

	// 守御(加成)
	const defMatch = text.match(/(\w+)%(?:的)?守御(?:加成)?/);
	if (defMatch) stats.defense_bonus = defMatch[1];

	// 最大气血值
	const hpMatch = text.match(/(\w+)%(?:的)?最大气血值/);
	if (hpMatch) stats.hp_bonus = hpMatch[1];

	// 伤害减免
	const drMatch = text.match(/(\w+)%(?:的)?(?:伤害减免|damage_reduction)/);
	if (drMatch) stats.damage_reduction = drMatch[1];

	// 治疗加成
	const healMatch = text.match(/(\w+)%(?:的)?治疗加成/);
	if (healMatch) stats.healing_bonus = healMatch[1];

	// 伤害加深
	const dmgIncMatch = text.match(/(\w+)%(?:的)?(?:伤害加深|神通伤害加深)/);
	if (dmgIncMatch) stats.skill_damage_increase = dmgIncMatch[1];

	// 最终伤害加成/加深
	const finalMatch = text.match(
		/(\w+)%(?:的)?最终伤害(?:加成|加深)/,
	);
	if (finalMatch) stats.final_damage_bonus = finalMatch[1];

	// 暴击率
	const critMatch = text.match(/(\w+)%(?:的)?暴击率/);
	if (critMatch) stats.crit_rate = critMatch[1];

	return stats;
}

// ─────────────────────────────────────────────────────────
// DoT extraction
// ─────────────────────────────────────────────────────────

export function extractDot(
	text: string,
): ExtractedEffect | null {
	// 每{t}秒(额外)造成(目标){x}%当前气血值的伤害，持续{d}秒
	const currentHpMatch = text.match(
		/每(\w+(?:\.\w+)?)秒(?:额外)?造成(?:目标)?(\w+)%当前气血值的伤害[，,]持续(\w+)秒/,
	);
	if (currentHpMatch) {
		return {
			type: "dot",
			fields: {
				tick_interval: currentHpMatch[1],
				percent_current_hp: currentHpMatch[2],
				duration: currentHpMatch[3],
			},
		};
	}

	// 每{t}秒额外造成目标{x}%已损失气血值的伤害，持续{d}秒
	const lostHpMatch = text.match(
		/每(\w+(?:\.\w+)?)秒(?:额外)?造成(?:目标)?(\w+)%已损(?:失)?气血值的伤害[，,]持续(\w+)秒/,
	);
	if (lostHpMatch) {
		return {
			type: "dot",
			fields: {
				tick_interval: lostHpMatch[1],
				percent_lost_hp: lostHpMatch[2],
				duration: lostHpMatch[3],
			},
		};
	}

	// 每秒对目标造成{x}%最大气血值的伤害 (no explicit tick_interval)
	const perSecMaxHpMatch = text.match(
		/每秒(?:对目标)?造成(?:目标)?(\w+)%(?:最大)?(?:当前)?气血值的伤害/,
	);
	if (perSecMaxHpMatch) {
		return {
			type: "dot",
			fields: {
				tick_interval: 1,
				percent_current_hp: perSecMaxHpMatch[1],
			},
		};
	}

	return null;
}

// ─────────────────────────────────────────────────────────
// Summon extraction
// ─────────────────────────────────────────────────────────

export function extractSummon(text: string): ExtractedEffect | null {
	// 持续存在{d}秒的分身，继承自身{x}%的属性...分身受到的伤害为自身的{y}%
	const m = text.match(
		/持续(?:存在)?(\w+)秒的分身[，,]继承自身(\w+)%的属性.*?分身受到的伤害为自身的(\w+)%/,
	);
	if (m) {
		return {
			type: "summon",
			fields: {
				duration: m[1],
				inherit_stats: m[2],
				damage_taken_multiplier: m[3],
			},
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Crit damage bonus
// ─────────────────────────────────────────────────────────

export function extractCritDamageBonus(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/(?:使本神通)?暴击伤害提[升高](\w+)%/);
	if (m) {
		return {
			type: "crit_damage_bonus",
			fields: { value: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self damage taken increase
// ─────────────────────────────────────────────────────────

export function extractSelfDamageTakenIncrease(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/(?:释放后)?(?:自身)?(\d+)秒内受到(?:的)?伤害(?:提[升高])(\w+)%/,
	);
	if (m) {
		return {
			type: "self_damage_taken_increase",
			fields: { value: m[2], duration: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Percent current HP damage (per-hit)
// ─────────────────────────────────────────────────────────

export function extractPercentCurrentHpDamage(
	text: string,
): ExtractedEffect | null {
	// 额外附加{y}%目标当前气血值的伤害
	const m = text.match(
		/额外附加(\w+)%(?:目标)?当前气血值的伤害/,
	);
	if (m) {
		return {
			type: "percent_current_hp_damage",
			fields: { value: m[1] },
			meta: { per_prior_hit: true },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Shield
// ─────────────────────────────────────────────────────────

export function extractShield(text: string): ExtractedEffect | null {
	// 添加{w}%最大气血值的护盾，护盾持续{d}秒
	const m = text.match(
		/(?:添加|获得)(?:自身)?(\w+)%最大气血值的护盾[，,](?:护盾)?持续(\w+)秒/,
	);
	if (m) {
		return {
			type: "shield",
			fields: { value: m[1], duration: m[2] },
			meta: { source: "self_max_hp" },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Debuff
// ─────────────────────────────────────────────────────────

export function extractDebuff(text: string): ExtractedEffect | null {
	// 降低{x}%最终伤害减免，持续{d}秒
	const finalDrMatch = text.match(
		/降低(\w+)%(?:的)?最终伤害减免[，,]持续(\w+)秒/,
	);
	if (finalDrMatch) {
		return {
			type: "debuff",
			fields: {
				target: "final_damage_reduction",
				value: finalDrMatch[1],
				duration: finalDrMatch[2],
			},
		};
	}

	// 使敌方的神通伤害降低{x}%，持续{d}秒
	const skillDmgMatch = text.match(
		/使敌方的?神通伤害降低(\w+)%[，,]持续(\w+)秒/,
	);
	if (skillDmgMatch) {
		return {
			type: "debuff",
			fields: {
				target: "skill_damage",
				value: skillDmgMatch[1],
				duration: skillDmgMatch[2],
			},
		};
	}

	// 攻击力降低{x}%，持续{d}秒
	const atkMatch = text.match(
		/攻击力降低(\w+)%[，,]持续(\w+)秒/,
	);
	if (atkMatch) {
		return {
			type: "debuff",
			fields: {
				target: "attack",
				value: atkMatch[1],
				duration: atkMatch[2],
			},
		};
	}

	return null;
}

// ─────────────────────────────────────────────────────────
// Shield destroy damage
// ─────────────────────────────────────────────────────────

export function extractShieldDestroyDamage(
	text: string,
): ExtractedEffect | null {
	// 每段伤害命中时湮灭敌方{n}个护盾，并额外造成{y}%敌方最大气血值的伤害
	const m = text.match(
		/湮灭敌方(\w+)个护盾[，,](?:并)?(?:额外)?造成(\w+)%敌方最大气血值的伤害(?:（对怪物最多造成(\w+)%攻击力的伤害）)?/,
	);
	if (m) {
		const fields: Record<string, string | number> = {
			shields_per_hit: m[1],
			percent_max_hp: m[2],
		};
		if (m[3]) fields.cap_vs_monster = m[3];
		return {
			type: "shield_destroy_damage",
			fields,
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self lost HP damage
// ─────────────────────────────────────────────────────────

export function extractSelfLostHpDamage(
	text: string,
): ExtractedEffect | null {
	// 额外对(其|目标)造成自身{x}%已损失气血值的伤害
	const m = text.match(
		/(?:额外)?对(?:其|目标)?造成自身(\w+)%已损(?:失)?气血值的伤害/,
	);
	if (m) {
		return {
			type: "self_lost_hp_damage",
			fields: { value: m[1] },
		};
	}

	// 每段攻击额外对目标造成自身{y}%已损失气血值的伤害
	const perHitMatch = text.match(
		/每段攻击(?:额外)?对目标造成自身(\w+)%已损(?:失)?气血值的伤害/,
	);
	if (perHitMatch) {
		return {
			type: "self_lost_hp_damage",
			fields: { value: perHitMatch[1] },
			meta: { per_hit: true },
		};
	}

	return null;
}

// ─────────────────────────────────────────────────────────
// Counter buff (reactive on being attacked)
// ─────────────────────────────────────────────────────────

export function extractCounterBuff(
	text: string,
): ExtractedEffect | null {
	// 受到伤害时，自身恢复该次伤害损失气血值的{y}%的气血值（该效果不受治疗加成影响）
	const healMatch = text.match(
		/受到伤害时[，,](?:自身)?恢复该次伤害(?:损失气血值的)?(\w+)%的?气血值/,
	);
	if (healMatch) {
		return {
			type: "counter_buff",
			fields: { heal_on_damage_taken: healMatch[1] },
			meta: {
				no_healing_bonus: /不受治疗加成影响/.test(text),
			},
		};
	}

	// 每秒对目标反射自身所受到伤害值的{x}%与自身{y}%已损失气血值的伤害，持续{d}秒
	const reflectMatch = text.match(
		/(?:每秒)?对目标(?:反射|造成)自身所?受到(?:的)?伤害(?:值)?的(\w+)%与自身(\w+)%已损(?:失)?气血值的伤害[，,]持续(\w+)秒/,
	);
	if (reflectMatch) {
		return {
			type: "counter_buff",
			fields: {
				reflect_received_damage: reflectMatch[1],
				reflect_percent_lost_hp: reflectMatch[2],
				duration: reflectMatch[3],
			},
		};
	}

	return null;
}

// ─────────────────────────────────────────────────────────
// Untargetable state
// ─────────────────────────────────────────────────────────

export function extractUntargetable(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/(\d+)秒内不可被选中/);
	if (m) {
		return {
			type: "untargetable_state",
			fields: { duration: Number(m[1]) },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Periodic escalation
// ─────────────────────────────────────────────────────────

export function extractPeriodicEscalation(
	text: string,
): ExtractedEffect | null {
	// 每造成{n}次伤害时，剑阵接下来的伤害提升{m}倍，单次伤害至多被该效果重复加成{max}次
	const m = text.match(
		/每造成(\d+)次伤害时[，,].*?伤害提升(\w+)倍[，,].*?至多.*?加成(\d+)次/,
	);
	if (m) {
		return {
			type: "periodic_escalation",
			fields: {
				every_n_hits: Number(m[1]),
				multiplier: m[2],
				max_stacks: Number(m[3]),
			},
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Per-hit escalation
// ─────────────────────────────────────────────────────────

export function extractPerHitEscalation(
	text: string,
): ExtractedEffect | null {
	// 本神通每段攻击造成伤害后，下一段提升{x}%神通加成
	const m = text.match(
		/每段攻击.*?下一段提升(\w+)%神通加成/,
	);
	if (m) {
		return {
			type: "per_hit_escalation",
			fields: { value: m[1] },
			meta: { stat: "skill_bonus" },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Buff steal
// ─────────────────────────────────────────────────────────

export function extractBuffSteal(text: string): ExtractedEffect | null {
	const m = text.match(/偷取目标(\w+)个增益状态/);
	if (m) {
		return {
			type: "buff_steal",
			fields: { count: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Per-debuff stack damage
// ─────────────────────────────────────────────────────────

export function extractPerDebuffStackDamage(
	text: string,
): ExtractedEffect | null {
	// 目标当前每具有一个减益状态效果，本次神通伤害提升{y}%，最多计算{max}个
	const m = text.match(
		/每(?:具有)?(?:一个)?减益状态(?:效果)?[，,].*?伤害(?:提升|增加)(\w+)%[，,]最多计算(\d+)个/,
	);
	if (m) {
		return {
			type: "per_debuff_stack_damage",
			fields: { per_n_stacks: 1, value: m[1], max_stacks: Number(m[2]) },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Per enemy lost hp damage
// ─────────────────────────────────────────────────────────

export function extractPerEnemyLostHp(
	text: string,
): ExtractedEffect | null {
	// 敌方当前气血值每损失{x}%，本神通伤害额外增加{y}%
	const m = text.match(
		/敌方(?:当前)?气血值每损失(\w+)%[，,].*?伤害(?:额外)?增加(\w+)%/,
	);
	if (m) {
		return {
			type: "per_enemy_lost_hp",
			fields: { per_percent: m[1], value: m[2] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self cleanse
// ─────────────────────────────────────────────────────────

export function extractSelfCleanse(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/驱散自身(\w+)个负面状态/);
	if (m) {
		return {
			type: "self_cleanse",
			fields: { count: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self heal
// ─────────────────────────────────────────────────────────

export function extractSelfHeal(text: string): ExtractedEffect | null {
	// 恢复共{x}%最大气血值
	const m = text.match(
		/(?:为自身)?恢复(?:共)?(\w+)%(?:的)?(?:最大)?气血值/,
	);
	if (m) {
		return {
			type: "self_heal",
			fields: { value: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Delayed burst
// ─────────────────────────────────────────────────────────

export function extractDelayedBurst(
	text: string,
): ExtractedEffect | null {
	// 【无相魔劫】，持续{d}秒。期间敌方受到的神通伤害增加{y}%，时间结束时，对目标造成{z}%期间提升的伤害+{w}%攻击力的伤害
	const m = text.match(
		/【(.+?)】[，,]持续(\d+)秒.*?伤害增加(\d+)%.*?造成(\d+)%.*?伤害\+(\d+)%攻击力的伤害/,
	);
	if (m) {
		return {
			type: "delayed_burst",
			fields: {
				duration: Number(m[2]),
				damage_increase_during: Number(m[3]),
				burst_accumulated_pct: Number(m[4]),
				burst_base: Number(m[5]),
			},
			meta: { name: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Conditional damage (cross-skill carry from cleanse)
// ─────────────────────────────────────────────────────────

export function extractConditionalDamageFromCleanse(
	text: string,
): ExtractedEffect | null {
	// 若净化的数量多于自身负面状态，则在接下来的三个神通命中时，每段攻击附加{z}%自身最大气血值的伤害
	const m = text.match(
		/若净化.*?接下来.*?每段攻击附加(\w+)%自身最大气血值的伤害/,
	);
	if (m) {
		return {
			type: "conditional_damage",
			fields: { value: m[1] },
			meta: { condition: "cleanse_excess" },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Debuff for skill cooldown
// ─────────────────────────────────────────────────────────

export function extractSkillCooldownDebuff(
	text: string,
): ExtractedEffect | null {
	// 使其下一个未释放的神通进入{d}秒冷却时间
	const m = text.match(/下一个未释放的神通进入(\d+)秒冷却/);
	if (m) {
		return {
			type: "debuff",
			fields: {
				target: "next_skill_cooldown",
				value: Number(m[1]),
				duration: Number(m[1]),
			},
			meta: { name: "神通封印" },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Echo damage (damage echo debuff)
// ─────────────────────────────────────────────────────────

export function extractEchoDamage(
	text: string,
): ExtractedEffect | null {
	// 每次受到伤害时，会额外受到一次攻击，伤害值为当次伤害的{y}%...持续{d}秒
	const m = text.match(
		/(?:每次)?受到(?:的)?伤害时[，,].*?额外受到.*?伤害(?:值)?为当次伤害的(\w+)%.*?持续(\w+)秒/,
	);
	if (m) {
		return {
			type: "debuff",
			fields: {
				target: "echo_damage",
				value: m[1],
				duration: m[2],
			},
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Counter debuff
// ─────────────────────────────────────────────────────────

export function extractCounterDebuff(
	text: string,
): ExtractedEffect | null {
	// 受到伤害时，各有{x}%概率对攻击方添加1层【X】与【Y】
	const m = text.match(
		/受到(?:伤害|攻击)时[，,]各有(\d+)%概率对攻击方添加.*?层【(.+?)】/,
	);
	if (m) {
		return {
			type: "counter_debuff",
			fields: {
				on_attacked_chance: Number(m[1]),
			},
			meta: { name: m[2] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self HP cost DoT (怒意滔天 pattern)
// ─────────────────────────────────────────────────────────

export function extractSelfHpCostDot(
	text: string,
): ExtractedEffect | null {
	// 自身每秒损失{y}%的当前气血值
	const m = text.match(/自身每秒损失(\w+)%(?:的)?当前气血值/);
	if (m) {
		return {
			type: "self_hp_cost",
			fields: { value: m[1], tick_interval: 1 },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self lost HP damage DoT (怒意滔天 pattern)
// ─────────────────────────────────────────────────────────

export function extractSelfLostHpDamageDot(
	text: string,
): ExtractedEffect | null {
	// 每秒对目标造成自身{z}%已损气血值和期间消耗气血的伤害
	const m = text.match(
		/每秒对目标造成(?:自身)?(\w+)%已损(?:失)?气血值(?:和期间消耗气血)?的伤害/,
	);
	if (m) {
		return {
			type: "self_lost_hp_damage",
			fields: { value: m[1], tick_interval: 1 },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self buff (named state with stat bonuses)
// ─────────────────────────────────────────────────────────

export function extractSelfBuff(
	text: string,
): ExtractedEffect | null {
	// Match patterns like:
	// 获得【仙佑】状态，提升自身y%攻击力加成
	// 为自身添加【怒灵降世】：持续期间提升自身w%的攻击力
	// 使自身进入【破虚】状态：...
	const m = text.match(
		/(?:获得|添加|进入).*?【(.+?)】(?:状态)?[：:，,](.+)/,
	);
	if (!m) return null;

	const name = m[1];
	const desc = m[2];

	// Try special pattern: "提升自身y%攻击力加成、守御加成、最大气血值"
	const tripleMatch = desc.match(
		/提升(?:自身)?(\w+)%(?:的)?攻击力(?:加成)?[、，,]守御(?:加成)?[、，,]最大气血值/,
	);
	if (tripleMatch) {
		const fields: Record<string, string | number> = {
			attack_bonus: tripleMatch[1],
			defense_bonus: tripleMatch[1],
			hp_bonus: tripleMatch[1],
		};
		const durMatch = desc.match(/持续(\d+(?:\.\d+)?)秒/);
		if (durMatch) fields.duration = Number(durMatch[1]);
		return { type: "self_buff", fields, meta: { name } };
	}

	// Try "提升自身w%的攻击力与伤害减免" pattern
	const dualMatch = desc.match(
		/提升(?:自身)?(\w+)%(?:的)?攻击力与(?:伤害减免|暴击率)/,
	);
	if (dualMatch) {
		const fields: Record<string, string | number> = {};
		fields.attack_bonus = dualMatch[1];
		if (/暴击率/.test(desc)) {
			fields.crit_rate = dualMatch[1];
		} else {
			fields.damage_reduction = dualMatch[1];
		}
		const durMatch = desc.match(/持续(\d+(?:\.\d+)?)秒/);
		if (durMatch) fields.duration = Number(durMatch[1]);
		return { type: "self_buff", fields, meta: { name } };
	}

	const stats = extractSelfBuffStats(desc);
	if (Object.keys(stats).length === 0) return null;

	const fields: Record<string, string | number> = { ...stats };
	const durMatch = desc.match(/持续(\d+(?:\.\d+)?)秒/);
	if (durMatch) fields.duration = Number(durMatch[1]);

	return {
		type: "self_buff",
		fields,
		meta: { name },
	};
}

// ─────────────────────────────────────────────────────────
// Self HP cost per hit
// ─────────────────────────────────────────────────────────

export function extractSelfHpCostPerHit(
	text: string,
): ExtractedEffect | null {
	// 每段攻击会消耗自身z%当前气血值
	const m = text.match(/每段攻击(?:会)?消耗自身(\w+)%(?:的)?当前气血值/);
	if (m) {
		return {
			type: "self_hp_cost",
			fields: { value: m[1] },
			meta: { per_hit: true },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self lost HP damage per hit
// ─────────────────────────────────────────────────────────

export function extractSelfLostHpDamagePerHit(
	text: string,
): ExtractedEffect | null {
	// 每段攻击额外对目标造成自身y%已损失气血值的伤害
	const m = text.match(
		/每段攻击(?:额外)?对目标造成自身(\w+)%已损(?:失)?气血值的伤害/,
	);
	if (m) {
		return {
			type: "self_lost_hp_damage",
			fields: { value: m[1] },
			meta: { per_hit: true },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Next skill carry (破虚 pattern)
// ─────────────────────────────────────────────────────────

export function extractNextSkillCarry(
	text: string,
): ExtractedEffect | null {
	// 接下来神通的n段攻击，每段攻击附加z%已损气血值的伤害
	const m = text.match(
		/接下来(?:神通的)?(\d+)段攻击[，,]每段攻击附加(?:自身)?(\w+)%已损(?:失)?气血值的伤害/,
	);
	if (m) {
		return {
			type: "self_lost_hp_damage",
			fields: { value: m[2] },
			meta: { per_hit: true, name: "破虚", next_skill_hits: Number(m[1]) },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// HP cost avoid chance
// ─────────────────────────────────────────────────────────

export function extractHpCostAvoidChance(
	text: string,
): ExtractedEffect | null {
	// y%的概率不消耗气血值
	const m = text.match(/(\d+)%(?:的)?概率不消耗气血值/);
	if (m) {
		return {
			type: "hp_cost_avoid_chance",
			fields: { value: Number(m[1]) },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Lifesteal
// ─────────────────────────────────────────────────────────

export function extractLifesteal(
	text: string,
): ExtractedEffect | null {
	// 恢复...造成伤害x%的气血值
	const m = text.match(/恢复.*?(?:造成(?:的)?)?(?:伤害|本次伤害)(\w+)%(?:的)?气血值/);
	if (m) {
		return {
			type: "lifesteal",
			fields: { value: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Shield strength (affix pattern)
// ─────────────────────────────────────────────────────────

export function extractShieldStrength(
	text: string,
): ExtractedEffect | null {
	// 获得的护盾提升至自身x%最大气血值
	const m = text.match(/护盾提升至(?:自身)?(\w+)%最大气血值/);
	if (m) {
		return {
			type: "shield_strength",
			fields: { value: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self buff extra (affix adds stats to existing buff)
// ─────────────────────────────────────────────────────────

export function extractSelfBuffExtra(
	text: string,
): ExtractedEffect | null {
	// 【X】额外提升自身x%攻击力 / 【X】状态额外使自身获得x%治疗加成
	const m = text.match(
		/【(.+?)】(?:状态)?(?:额外|下)?(?:使自身获得|提升(?:自身)?)/,
	);
	if (!m) return null;

	const buffName = m[1];
	const stats = extractSelfBuffStats(text);
	if (Object.keys(stats).length === 0) return null;

	return {
		type: "self_buff_extra",
		fields: stats,
		meta: { buff_name: buffName },
	};
}

// ─────────────────────────────────────────────────────────
// Extractor Registry
// ─────────────────────────────────────────────────────────

export interface ExtractorDef {
	name: string;
	fn: (text: string) => ExtractedEffect | null;
	/** Lower order = earlier in output */
	order: number;
	/** Only run for these grammar types (undefined = all) */
	grammars?: string[];
	/** Context: "skill" | "affix" | "both" */
	context?: "skill" | "affix" | "both";
}

export const SKILL_EXTRACTORS: ExtractorDef[] = [
	{ name: "self_hp_cost", fn: extractSelfHpCost, order: 0, grammars: ["G4", "G5"] },
	{ name: "untargetable", fn: extractUntargetable, order: 1 },
	{ name: "base_attack", fn: (text) => {
		const r = extractBaseAttackWithVars(text);
		if (!r) return null;
		return {
			type: "base_attack",
			fields: { hits: r.hits, total: r.totalVar },
		};
	}, order: 10 },
	{ name: "percent_max_hp_damage", fn: extractPercentHpDamage, order: 20 },
	{ name: "self_lost_hp_damage", fn: extractSelfLostHpDamage, order: 20 },
	{ name: "self_lost_hp_damage_per_hit", fn: extractSelfLostHpDamagePerHit, order: 20 },
	{ name: "self_hp_cost_per_hit", fn: extractSelfHpCostPerHit, order: 20 },
	{ name: "shield", fn: extractShield, order: 20 },
	{ name: "debuff", fn: extractDebuff, order: 20 },
	{ name: "shield_destroy_damage", fn: extractShieldDestroyDamage, order: 20 },
	{ name: "percent_current_hp_damage", fn: extractPercentCurrentHpDamage, order: 20 },
	{ name: "summon", fn: extractSummon, order: 20 },
	{ name: "crit_damage_bonus", fn: extractCritDamageBonus, order: 20 },
	{ name: "self_damage_taken_increase", fn: extractSelfDamageTakenIncrease, order: 20 },
	{ name: "periodic_escalation", fn: extractPeriodicEscalation, order: 20 },
	{ name: "buff_steal", fn: extractBuffSteal, order: 20 },
	{ name: "per_debuff_stack_damage", fn: extractPerDebuffStackDamage, order: 20 },
	{ name: "echo_damage", fn: extractEchoDamage, order: 20 },
	{ name: "counter_debuff", fn: extractCounterDebuff, order: 20 },
	{ name: "counter_buff", fn: extractCounterBuff, order: 20 },
	{ name: "self_hp_cost_dot", fn: extractSelfHpCostDot, order: 20 },
	{ name: "self_lost_hp_damage_dot", fn: extractSelfLostHpDamageDot, order: 20 },
	{ name: "self_heal", fn: extractSelfHeal, order: 20 },
	{ name: "self_cleanse", fn: extractSelfCleanse, order: 20 },
	{ name: "delayed_burst", fn: extractDelayedBurst, order: 20 },
	{ name: "conditional_damage_cleanse", fn: extractConditionalDamageFromCleanse, order: 25 },
	{ name: "skill_cooldown_debuff", fn: extractSkillCooldownDebuff, order: 25 },
	{ name: "self_buff", fn: extractSelfBuff, order: 25 },
	{ name: "next_skill_carry", fn: extractNextSkillCarry, order: 25 },
	{ name: "per_enemy_lost_hp", fn: extractPerEnemyLostHp, order: 30 },
];
