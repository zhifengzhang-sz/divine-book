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

function _num(name: string): string {
	return `(?<${name}>${NUM.slice(1, -1)})`;
}

function _capture(groups: Record<string, number>): Record<string, number> {
	const out: Record<string, number> = {};
	for (const [k, v] of Object.entries(groups)) {
		out[k] = v;
	}
	return out;
}

function _toNum(
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
export function extractBaseAttackWithVars(text: string): {
	hits: number;
	totalVar: string;
	extra?: ExtractedEffect[];
} | null {
	// Try literal number first
	const litMatch = text.match(
		/造成(?:(?:一|二|三|四|五|六|七|八|九|十)+段)?(?:共(?:计)?)?(\d+(?:\.\d+)?)%攻击力的(?:灵法)?伤害/,
	);
	const hitsMatch = text.match(/造成((?:一|二|三|四|五|六|七|八|九|十)+)段/);
	const hits = hitsMatch ? parseCnNumber(hitsMatch[1]) : 1;

	// Check if total is a variable reference (x, y) or literal
	const varMatch = text.match(/(?:共(?:计)?)?([a-zA-Z])%攻击力的(?:灵法)?伤害/);
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

export function extractSelfHpCost(text: string): ExtractedEffect | null {
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
	const childMatch = fullText.match(/添加.*?层【(.+?)】与【(.+?)】/);
	const children = childMatch ? [childMatch[1], childMatch[2]] : undefined;

	// Description text after 【name】：
	const colonIdx = text.indexOf("】：");
	const descriptionText = colonIdx !== -1 ? text.slice(colonIdx + 2) : "";

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
	const finalMatch = text.match(/(\w+)%(?:的)?最终伤害(?:加成|加深)/);
	if (finalMatch) stats.final_damage_bonus = finalMatch[1];

	// 暴击率
	const critMatch = text.match(/(\w+)%(?:的)?暴击率/);
	if (critMatch) stats.crit_rate = critMatch[1];

	return stats;
}

// ─────────────────────────────────────────────────────────
// DoT extraction
// ─────────────────────────────────────────────────────────

export function extractDot(text: string): ExtractedEffect | null {
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

	// 每秒对目标造成{x}%最大气血值的伤害[，持续d秒]
	const perSecMaxHpMatch = text.match(
		/每秒(?:对目标)?造成(?:目标)?(\w+)%(?:最大)?(?:当前)?气血值的伤害(?:[，,]持续(\w+)秒)?/,
	);
	if (perSecMaxHpMatch) {
		const fields: Record<string, string | number> = {
			tick_interval: 1,
			percent_current_hp: perSecMaxHpMatch[1],
		};
		if (perSecMaxHpMatch[2]) fields.duration = perSecMaxHpMatch[2];
		return { type: "dot", fields };
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

export function extractCritDamageBonus(text: string): ExtractedEffect | null {
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
	const m = text.match(/额外附加(\w+)%(?:目标)?当前气血值的伤害/);
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
		// "降低" → negative value
		const raw = finalDrMatch[1];
		return {
			type: "debuff",
			fields: {
				target: "final_damage_reduction",
				value: /^\d/.test(raw) ? -Number(raw) : `-${raw}`,
				duration: finalDrMatch[2],
			},
		};
	}

	// 使敌方的神通伤害降低{x}%，持续{d}秒
	const skillDmgMatch = text.match(
		/使敌方的?神通伤害降低(\w+)%[，,]持续(\w+)秒/,
	);
	if (skillDmgMatch) {
		// "降低" → negative value
		const raw = skillDmgMatch[1];
		return {
			type: "debuff",
			fields: {
				target: "skill_damage",
				value: /^\d/.test(raw) ? -Number(raw) : `-${raw}`,
				duration: skillDmgMatch[2],
			},
		};
	}

	// 攻击力降低{x}%，持续{d}秒
	// Skip if this is part of a per-stolen-buff pattern (handled by extractPerStolenBuffDebuff)
	if (/每偷取.*?增益状态.*?攻击力降低/.test(text)) return null;
	const atkMatch = text.match(/攻击力降低(\w+)%[，,]持续(\w+)秒/);
	if (atkMatch) {
		// "降低" → negative value
		const raw = atkMatch[1];
		return {
			type: "debuff",
			fields: {
				target: "attack",
				value: /^\d/.test(raw) ? -Number(raw) : `-${raw}`,
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
// No-shield double damage
// ─────────────────────────────────────────────────────────

export function extractNoShieldDoubleDamage(
	text: string,
): ExtractedEffect | null {
	// 对无盾目标造成双倍伤害（对怪物最多造成w%攻击力的伤害）
	const m = text.match(
		/对无盾目标造成双倍伤害(?:（对怪物最多造成(\w+)%攻击力的伤害）)?/,
	);
	if (m) {
		const fields: Record<string, string | number> = {
			no_shield_double: 1,
		};
		if (m[1]) fields.cap_vs_monster = m[1];
		return { type: "no_shield_double_damage", fields };
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self lost HP damage
// ─────────────────────────────────────────────────────────

export function extractSelfLostHpDamage(text: string): ExtractedEffect | null {
	// 额外对(其|目标)造成自身{x}%已损失气血值的伤害[，并等额恢复自身气血]
	const m = text.match(
		/(?:额外)?对(?:其|目标)?造成自身(\w+)%已损(?:失)?气血值的伤害/,
	);
	if (m) {
		const meta: Record<string, unknown> = {};
		// Check for "等额恢复自身气血" — self-heal equal to damage dealt
		if (/等额恢复自身气血/.test(text)) {
			meta.self_heal = true;
		}
		return {
			type: "self_lost_hp_damage",
			fields: { value: m[1] },
			meta: Object.keys(meta).length > 0 ? meta : undefined,
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

export function extractCounterBuff(text: string): ExtractedEffect | null {
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
		/(?:每秒)?对目标`?(?:反射|造成)`?自身所?受到(?:的)?伤害(?:值)?的(\w+)%与自身(\w+)%已损(?:失)?气血值的伤害[，,]持续(\w+)秒/,
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

export function extractUntargetable(text: string): ExtractedEffect | null {
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

export function extractPerHitEscalation(text: string): ExtractedEffect | null {
	// 本神通每段攻击造成伤害后，下一段提升{x}%神通加成
	const m = text.match(/每段攻击.*?下一段提升(\w+)%神通加成/);
	if (m) {
		return {
			type: "per_hit_escalation",
			fields: { value: m[1] },
			meta: { stat: "skill_bonus" },
		};
	}
	// 每造成1段伤害，剩余段数伤害提升x%，最多提升y%
	const m2 = text.match(
		/每造成1段伤害.*?剩余.*?段.*?伤害提升(\w+)%.*?最多提升(\w+)%/,
	);
	if (m2) {
		return {
			type: "per_hit_escalation",
			fields: { value: m2[1], max: m2[2] },
			meta: { stat: "remaining_hits" },
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

export function extractPerEnemyLostHp(text: string): ExtractedEffect | null {
	// Pattern 1: 敌方当前气血值每损失x%...伤害增加y% (skill text, configurable step)
	const m1 = text.match(
		/敌方(?:当前)?气血值每损失(\w+)%[，,].*?伤害(?:额外)?增加(\w+)%/,
	);
	if (m1) {
		return {
			type: "per_enemy_lost_hp",
			fields: { per_percent: m1[1], value: m1[2] },
		};
	}
	// Pattern 2: 敌方每多损失1%最大气血值...伤害提升x% (affix text, fixed 1% step)
	const m2 = text.match(/敌方每多损失1%最大(?:值)?气血值.*?伤害提升(\w+)%/);
	if (m2) {
		return {
			type: "per_enemy_lost_hp",
			fields: { per_percent: 1, value: m2[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self cleanse
// ─────────────────────────────────────────────────────────

export function extractSelfCleanse(text: string): ExtractedEffect | null {
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
	const m = text.match(/(?:为自身)?恢复(?:共)?(\w+)%(?:的)?(?:最大)?气血值/);
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

export function extractDelayedBurst(text: string): ExtractedEffect | null {
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

export function extractEchoDamage(text: string): ExtractedEffect | null {
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

export function extractCounterDebuff(text: string): ExtractedEffect | null {
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

export function extractSelfHpCostDot(text: string): ExtractedEffect | null {
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

export function extractSelfBuff(text: string): ExtractedEffect | null {
	// Match patterns like:
	// 获得【仙佑】状态，提升自身y%攻击力加成
	// 为自身添加【怒灵降世】：持续期间提升自身w%的攻击力
	// 使自身进入【破虚】状态：...
	const m = text.match(/(?:获得|添加|进入).*?【(.+?)】(?:状态)?[：:，,](.+)/);
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
// Self buff: skill_damage_increase (standalone pattern)
// ─────────────────────────────────────────────────────────

export function extractSelfBuffSkillDamageIncrease(
	text: string,
): ExtractedEffect | null {
	// 提升自身z%神通伤害加深，持续d秒 (standalone, not inside a 【name】 state def)
	// Skip if already inside a named state pattern (handled by extractSelfBuff)
	if (/(?:获得|添加|进入).*?【.+?】/.test(text)) return null;
	const m = text.match(
		/(?:并)?提升自身(\w+)%(?:的)?神通伤害加深[，,]持续(\w+)秒/,
	);
	if (m) {
		return {
			type: "self_buff",
			fields: { skill_damage_increase: m[1], duration: m[2] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self HP cost per hit
// ─────────────────────────────────────────────────────────

export function extractSelfHpCostPerHit(text: string): ExtractedEffect | null {
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

export function extractNextSkillCarry(text: string): ExtractedEffect | null {
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

export function extractHpCostAvoidChance(text: string): ExtractedEffect | null {
	// y%的概率不消耗气血值
	const m = text.match(/(\w+)%(?:的)?概率不消耗气血值/);
	if (m) {
		return {
			type: "hp_cost_avoid_chance",
			fields: { value: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Lifesteal
// ─────────────────────────────────────────────────────────

export function extractLifesteal(text: string): ExtractedEffect | null {
	// Skip if lifesteal-with-parent pattern matches (has 【X】 parent reference)
	if (/恢复【.+?】造成/.test(text)) return null;
	// 恢复...造成伤害x%的气血值
	const m = text.match(
		/恢复.*?(?:造成(?:的)?)?(?:伤害|本次伤害)(\w+)%(?:的)?气血值/,
	);
	if (m) {
		return {
			type: "lifesteal",
			fields: { value: m[1] },
		};
	}
	// 获得x%的吸血效果
	const m2 = text.match(/获得(\w+)%(?:的)?吸血效果/);
	if (m2) {
		return {
			type: "lifesteal",
			fields: { value: m2[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Shield strength (affix pattern)
// ─────────────────────────────────────────────────────────

export function extractShieldStrength(text: string): ExtractedEffect | null {
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

export function extractSelfBuffExtra(text: string): ExtractedEffect | null {
	// 【X】额外提升自身x%攻击力 / 【X】状态额外使自身获得x%治疗加成
	// Skip "提升敌方" / "提升...伤害上限" patterns (not self-buff)
	if (/【.+?】.*?提升敌方/.test(text)) return null;
	if (/【.+?】.*?伤害.*?上限/.test(text)) return null;
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
// Affix-specific extractors
// ─────────────────────────────────────────────────────────

/** 无视敌方所有伤害减免效果 */
export function extractIgnoreDamageReduction(
	text: string,
): ExtractedEffect | null {
	if (/无视敌方所有伤害减免效果/.test(text)) {
		return { type: "ignore_damage_reduction", fields: {} };
	}
	return null;
}

/** 提升x%伤害 / 伤害提升x% / 神通伤害提升x% (standalone damage increase) */
export function extractDamageIncrease(text: string): ExtractedEffect | null {
	// Exclude conditional damage patterns (handled by extractConditionalDamageAffix)
	if (/控制(?:状态|效果)/.test(text) || /减益.*?状态.*?伤害提升/.test(text))
		return null;
	// Exclude per-stack patterns (handled by extractPerBuffStackDamage / extractPerDebuffStackDamageAffix)
	if (/每\d+层/.test(text)) return null;
	// Exclude enlightenment bonus patterns (handled by extractEnlightenmentBonus)
	if (/悟境等级加/.test(text)) return null;
	// NOT "持续伤害" / "已损" / "气血" / "伤害加深"
	if (/持续伤害/.test(text) || /已损/.test(text) || /气血/.test(text))
		return null;
	// Exclude delayed_burst_increase patterns (handled by extractDelayedBurstIncrease)
	if (/状态结束时的伤害提升/.test(text)) return null;
	// Exclude "段数伤害" (per-hit escalation), "任意1个加成" (random buff), "概率触发" (probability_to_certain)
	if (
		/段数伤害/.test(text) ||
		/任意1个加成/.test(text) ||
		/概率触发/.test(text)
	)
		return null;
	// Try "伤害提升x%" pattern (including "神通伤害提升x%")
	const m1 = text.match(/(?:神通)?(?:造成的)?伤害提升(\w+)%/);
	if (m1 && !/伤害加深/.test(text)) {
		return { type: "damage_increase", fields: { value: m1[1] } };
	}
	// Try "提升x%伤害" pattern
	const m2 = text.match(/(?:并)?(?:使.*?)?提升(\w+)%(?:的)?伤害/);
	if (m2 && !/伤害加深/.test(text)) {
		return { type: "damage_increase", fields: { value: m2[1] } };
	}
	return null;
}

/** 处于控制状态时伤害提升x% / 带有减益状态时伤害提升x% */
export function extractConditionalDamageAffix(
	text: string,
): ExtractedEffect | null {
	// target_controlled: 处于控制状态/控制效果
	const controlledMatch = text.match(
		/(?:敌方)?处于.*?控制(?:状态|效果).*?伤害提升(\w+)%/,
	);
	if (controlledMatch) {
		return {
			type: "conditional_damage",
			fields: { value: controlledMatch[1] },
			meta: { condition: "target_controlled" },
		};
	}

	// target_has_debuff: 带有减益状态
	const debuffMatch = text.match(
		/(?:攻击)?带有.*?减益.*?状态.*?伤害提升(\w+)%/,
	);
	if (debuffMatch) {
		return {
			type: "conditional_damage",
			fields: { value: debuffMatch[1] },
			meta: { condition: "target_has_debuff" },
		};
	}

	return null;
}

/** 自身每多损失1%最大气血值，伤害提升x% */
export function extractPerSelfLostHp(text: string): ExtractedEffect | null {
	// Must be "自身" (self) lost HP, not "敌方" (enemy)
	if (/敌方每多损失/.test(text)) return null;
	const m = text.match(/每多损失1%最大气血值.*?伤害提升(\w+)%/);
	if (m) {
		return {
			type: "per_self_lost_hp",
			fields: { per_percent: m[1] },
		};
	}
	return null;
}

/** 每有1层减益状态，额外造成x%最大气血值真实伤害，最多y% */
export function extractPerDebuffStackTrueDamage(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/每有1层.*?减益.*?状态.*?造成(?:目标)?(\w+)%最大气血值.*?真实伤害.*?最多(?:造成)?(\w+)%/,
	);
	if (m) {
		return {
			type: "per_debuff_stack_true_damage",
			fields: { per_stack: m[1], max: m[2] },
		};
	}
	return null;
}

/** 持续伤害上升x% */
export function extractDotDamageIncrease(text: string): ExtractedEffect | null {
	const m = text.match(/持续伤害(?:上升|提升)(\w+)%/);
	if (m) {
		return {
			type: "dot_damage_increase",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 持续伤害触发间隙缩短x% */
export function extractDotFrequencyIncrease(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/持续伤害.*?触发间隙缩短(\w+)%/);
	if (m) {
		return {
			type: "dot_frequency_increase",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 持续伤害触发时额外造成x%已损失气血 */
export function extractDotExtraPerTick(text: string): ExtractedEffect | null {
	const m = text.match(
		/持续伤害触发时.*?额外造成(?:目标)?(\w+)%已损(?:失)?气血/,
	);
	if (m) {
		return {
			type: "dot_extra_per_tick",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 增益状态持续时间延长x% */
export function extractBuffDuration(text: string): ExtractedEffect | null {
	// Must NOT match "所有状态" (that's extractAllStateDuration)
	if (/所有状态/.test(text)) return null;
	const m = text.match(/增益.*?(?:状态)?持续时间延长(\w+)%/);
	if (m) {
		return {
			type: "buff_duration",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 所有状态持续时间延长x% */
export function extractAllStateDuration(text: string): ExtractedEffect | null {
	const m = text.match(/所有状态.*?持续时间延长(\w+)%/);
	if (m) {
		return {
			type: "all_state_duration",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 增益效果强度提升x% */
export function extractBuffStrength(text: string): ExtractedEffect | null {
	const m = text.match(/增益.*?效果强度提升(\w+)%/);
	if (m) {
		return {
			type: "buff_strength",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 增益状态层数增加x% */
export function extractBuffStackIncrease(text: string): ExtractedEffect | null {
	const m = text.match(/增益.*?状态层数增加(\w+)%/);
	if (m) {
		return {
			type: "buff_stack_increase",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 减益状态层数增加x% */
export function extractDebuffStackIncrease(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/减益.*?状态层数增加(\w+)%/);
	if (m) {
		return {
			type: "debuff_stack_increase",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 下一个施放的神通额外获得x%神通伤害加深 */
export function extractNextSkillBuff(text: string): ExtractedEffect | null {
	const m = text.match(
		/下一个施放的神通(?:释放时)?额外获得(\w+)%.*?神通伤害加深/,
	);
	if (m) {
		return {
			type: "next_skill_buff",
			fields: { value: m[1] },
			meta: { stat: "skill_damage_increase" },
		};
	}
	return null;
}

/** 提升x%神通伤害 */
export function extractSkillDamageIncrease(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/提升(\w+)%.*?神通伤害/);
	if (!m) return null;
	// Don't match "神通伤害加深" or "神通伤害减免" immediately after match
	const after = text.slice(text.indexOf("神通伤害") + 4);
	if (/^加深/.test(after) || /^减免/.test(after)) return null;
	return {
		type: "skill_damage_increase",
		fields: { value: m[1] },
	};
}

/** 目标对本神通提升y%神通伤害减免 */
export function extractEnemySkillDamageReduction(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/目标对本神通提升(\w+)%.*?神通伤害减免/);
	if (m) {
		return {
			type: "enemy_skill_damage_reduction",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 施放期间自身受到的伤害提升y% */
export function extractSelfDamageTakenDuringCast(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/施放期间自身受到的伤害.*?提升(\w+)%/);
	if (m) {
		return {
			type: "self_damage_taken_increase",
			fields: { value: m[1] },
			meta: { duration: "during_cast" },
		};
	}
	return null;
}

/** 护盾消失时对敌方造成护盾值x%的伤害 */
export function extractOnShieldExpire(text: string): ExtractedEffect | null {
	const m = text.match(/护盾.*?消失时.*?造成护盾值(\w+)%的伤害/);
	if (m) {
		return {
			type: "on_shield_expire",
			fields: { damage_percent_of_shield: m[1] },
		};
	}
	return null;
}

/** 每次施加增益/减益/护盾时，造成x%灵法伤害 */
export function extractOnBuffDebuffShieldTrigger(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/每次施加.*?(?:增益|减益).*?(?:护盾).*?造成.*?(\w+)%.*?灵法伤害/,
	);
	if (m) {
		return {
			type: "on_buff_debuff_shield_trigger",
			fields: { damage_percent: m[1] },
		};
	}
	return null;
}

/** x%概率提升4倍，y%概率提升3倍，z%概率提升2倍 */
export function extractProbabilityMultiplier(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/(\w+)%概率提升4倍.*?(\w+)%概率提升3倍.*?(\w+)%概率提升2倍/,
	);
	if (m) {
		return {
			type: "probability_multiplier",
			fields: { chance_4x: m[1], chance_3x: m[2], chance_2x: m[3] },
		};
	}
	return null;
}

/** 悟境等级加1 */
export function extractEnlightenmentBonus(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/悟境等级加(\d+)/);
	if (!m) return null;
	// Also extract associated damage_increase if present
	const dmgMatch = text.match(/伤害提升(\w+)%/);
	const fields: Record<string, string | number> = { value: Number(m[1]) };
	if (dmgMatch) fields.damage_increase = dmgMatch[1];
	return {
		type: "enlightenment_bonus",
		fields,
	};
}

/** 有x%概率额外多附加1层 */
export function extractDebuffStackChance(text: string): ExtractedEffect | null {
	const m = text.match(/有(\w+)%概率额外多附加1层/);
	if (m) {
		return {
			type: "debuff_stack_chance",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 治疗量降低x% (with named state) */
export function extractHealReductionDebuff(
	text: string,
): ExtractedEffect | null {
	// 治疗量降低x%，且无法被驱散
	const m = text.match(/治疗量降低(\w+)%/);
	if (!m) return null;

	// "降低" is always negative — negate the value
	const rawVal = m[1];
	const negatedVal: string | number = /^\d/.test(rawVal)
		? -Number(rawVal)
		: `-${rawVal}`;

	const fields: Record<string, string | number> = {
		target: "healing_received",
		value: negatedVal,
	};

	// Check for duration
	const durMatch = text.match(/持续(\d+)秒/);
	if (durMatch) fields.duration = Number(durMatch[1]);

	// Check for dispellable
	const meta: Record<string, unknown> = {};
	if (/无法被驱散|不可驱散/.test(text)) meta.dispellable = false;

	// Named state
	const nameMatch = text.match(/【(.+?)】/);
	if (nameMatch) meta.name = nameMatch[1];

	// Conditional value (气血低于30%时降低y%)
	const condMatch = text.match(
		/气血(?:值)?低于(\d+)%.*?(?:降低.*?治疗量)?增至(\w+)%/,
	);
	if (condMatch) {
		const condRaw = condMatch[2];
		fields.conditional_value = /^\d/.test(condRaw)
			? -Number(condRaw)
			: `-${condRaw}`;
		meta.condition = `target_hp_below_${condMatch[1]}`;
	}

	return {
		type: "debuff",
		fields,
		meta: Object.keys(meta).length > 0 ? meta : undefined,
	};
}

/** 每秒受到x%攻击力的伤害 (ATK-based DoT) */
export function extractAtkDot(text: string): ExtractedEffect | null {
	const m = text.match(/每秒受到(\w+)%攻击力的伤害/);
	if (m) {
		return {
			type: "dot",
			fields: { tick_interval: 1, damage_per_tick: m[1] },
		};
	}
	return null;
}

/** 若被驱散，立即受到y%攻击力的伤害 */
export function extractOnDispel(text: string): ExtractedEffect | null {
	const m = text.match(/若被驱散.*?受到(\w+)%攻击力的伤害/);
	if (!m) return null;
	const fields: Record<string, string | number> = { damage: m[1] };
	const stunMatch = text.match(/眩晕(\w+)秒/);
	if (stunMatch) fields.stun = stunMatch[1];
	return {
		type: "on_dispel",
		fields,
	};
}

/** 每秒驱散1个增益...造成x%灵法伤害 */
export function extractPeriodicDispelWithDamage(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/每秒.*?驱散.*?(\d+)个.*?增益.*?持续(\d+)秒.*?造成.*?(\w+)%.*?灵法伤害/,
	);
	if (m) {
		const fields: Record<string, string | number> = {
			interval: 1,
			duration: Number(m[2]),
			damage_percent_of_skill: m[3],
		};
		if (/无.*?状态.*?双倍|若无驱散.*?双倍/.test(text)) {
			return {
				type: "periodic_dispel",
				fields,
				meta: { no_buff_double: true },
			};
		}
		return { type: "periodic_dispel", fields };
	}
	return null;
}

/** 每5层增益状态提升y%伤害 */
export function extractPerBuffStackDamage(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/每(\d+)层增益状态.*?提升(\w+)%伤害.*?最大.*?(\w+)%/);
	if (m) {
		return {
			type: "per_buff_stack_damage",
			fields: { per_n_stacks: Number(m[1]), value: m[2], max: m[3] },
		};
	}
	return null;
}

/** 每5层减益状态提升y%伤害 */
export function extractPerDebuffStackDamageAffix(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/每(?:有)?(\d+)层减益状态.*?伤害提升(\w+)%.*?最大.*?(\w+)%/,
	);
	if (m) {
		return {
			type: "per_debuff_stack_damage",
			fields: { per_n_stacks: Number(m[1]), value: m[2], max: m[3] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Common/School affix extractors
// ─────────────────────────────────────────────────────────

/** 减益效果强度提升x% */
export function extractDebuffStrength(text: string): ExtractedEffect | null {
	const m = text.match(/减益.*?效果强度提升(\w+)%/);
	if (m) {
		return { type: "debuff_strength", fields: { value: m[1] } };
	}
	return null;
}

/** 施放期间提升自身x%的伤害减免 */
export function extractDamageReductionDuringCast(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/施放期间提升自身(\w+)%(?:的)?伤害减免/);
	if (m) {
		return {
			type: "damage_reduction_during_cast",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 敌方气血值低于30%伤害提升x%+暴击率y%/必定暴击 */
export function extractExecuteConditional(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/敌方气血值低于(\d+)%.*?伤害提升(\w+)%.*?(?:暴击率提升(\w+)%|必定暴击)/,
	);
	if (m) {
		const fields: Record<string, string | number> = {
			hp_threshold: Number(m[1]),
			damage_increase: m[2],
		};
		if (m[3]) {
			fields.crit_rate_increase = m[3];
		} else {
			fields.guaranteed_crit = 1;
		}
		return {
			type: "execute_conditional",
			fields,
		};
	}
	return null;
}

/** 任意1个加成：攻击提升x%、致命伤害提升x%、造成的伤害提升x% */
export function extractRandomBuff(text: string): ExtractedEffect | null {
	const m = text.match(
		/任意1个加成[：:].*?攻击提升(\w+)%.*?致命伤害提升(\w+)%.*?(?:造成的)?伤害提升(\w+)%/,
	);
	if (m) {
		return {
			type: "random_buff",
			fields: { attack: m[1], crit_damage: m[2], damage: m[3] },
		};
	}
	return null;
}

/** 额外造成x%攻击力的伤害 */
export function extractFlatExtraDamage(text: string): ExtractedEffect | null {
	const m = text.match(/额外造成(\w+)%攻击力的伤害/);
	if (m) {
		return {
			type: "flat_extra_damage",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 护盾值提升x% */
export function extractShieldValueIncrease(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/护盾值提升(\w+)%/);
	if (m) {
		return {
			type: "shield_value_increase",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 提升x%攻击力的效果 */
export function extractAttackBonusAffix(text: string): ExtractedEffect | null {
	// Exclude triple bonus patterns (attack + damage + crit_damage)
	if (/攻击力的效果.*?伤害.*?暴击伤害/.test(text)) return null;
	const m = text.match(/提升(\w+)%攻击力的效果/);
	if (m) {
		return {
			type: "attack_bonus",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 必定会心x倍+y%概率z倍 */
export function extractGuaranteedResonance(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/必定.*?会心.*?造成(\w+)倍伤害.*?(\w+)%概率.*?提升至(\w+)倍/,
	);
	if (m) {
		return {
			type: "guaranteed_resonance",
			fields: {
				base_multiplier: m[1],
				chance: m[2],
				upgraded_multiplier: m[3],
			},
		};
	}
	return null;
}

/** 攻击力+伤害+暴击伤害三合一 */
export function extractTripleBonus(text: string): ExtractedEffect | null {
	const m = text.match(
		/提升(\w+)%攻击力的效果.*?(\w+)%的伤害.*?(\w+)%的暴击伤害/,
	);
	if (m) {
		return {
			type: "triple_bonus",
			fields: {
				attack_bonus: m[1],
				damage_increase: m[2],
				crit_damage_increase: m[3],
			},
		};
	}
	return null;
}

/** 治疗效果提升x% */
export function extractHealingIncrease(text: string): ExtractedEffect | null {
	const m = text.match(/治疗效果提升(\w+)%/);
	if (m) {
		return {
			type: "healing_increase",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 最终伤害加深提升x% */
export function extractFinalDamageBonus(text: string): ExtractedEffect | null {
	const m = text.match(/最终伤害加深.*?提升(\w+)%/);
	if (m) {
		return {
			type: "final_damage_bonus",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 概率触发→必定触发+伤害提升x% */
export function extractProbabilityToCertain(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/概率触发.*?效果提升为必定触发.*?伤害提升(\w+)%/);
	if (m) {
		return {
			type: "probability_to_certain",
			fields: { damage_increase: m[1] },
		};
	}
	return null;
}

/** 治疗量→伤害转换x% */
export function extractHealingToDamage(text: string): ExtractedEffect | null {
	const m = text.match(/造成治疗效果时.*?额外造成治疗量(\w+)%的伤害/);
	if (m) {
		return {
			type: "healing_to_damage",
			fields: { value: m[1] },
		};
	}
	return null;
}

/** 伤害→护盾转换x% */
export function extractDamageToShield(text: string): ExtractedEffect | null {
	const m = text.match(
		/造成伤害后.*?获得.*?伤害值的(\w+)%(?:的)?护盾.*?持续(\d+)秒/,
	);
	if (m) {
		return {
			type: "damage_to_shield",
			fields: { value: m[1], duration: Number(m[2]) },
		};
	}
	return null;
}

/** 随机减益：攻击降低/暴击率降低/暴击伤害降低 */
export function extractRandomDebuff(text: string): ExtractedEffect | null {
	const m = text.match(
		/任意1个.*?减益.*?效果[：:].*?攻击降低(\w+)%.*?暴击率降低(\w+)%.*?暴击伤害降低(\w+)%/,
	);
	if (m) {
		return {
			type: "random_debuff",
			fields: { attack: m[1], crit_rate: m[2], crit_damage: m[3] },
		};
	}
	return null;
}

/** 已损气血计算最低x%+伤害提升y% */
export function extractMinLostHpThreshold(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/已损(?:气血值)?.*?至少按已损(\w+)%计算.*?伤害提升(\w+)%/,
	);
	if (m) {
		return {
			type: "min_lost_hp_threshold",
			fields: { min_percent: m[1], damage_increase: m[2] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Summon buff (affix: damage_taken_reduction + damage_increase for summon)
// ─────────────────────────────────────────────────────────

/** 分身受到伤害降低至自身的x%，造成的伤害增加y% */
export function extractSummonBuff(text: string): ExtractedEffect | null {
	const m = text.match(
		/分身受到(?:的)?伤害降低至(?:自身的)?(\w+)%[，,]\s*造成的伤害增加(\w+)%/,
	);
	if (m) {
		return {
			type: "summon_buff",
			fields: { damage_taken_reduction_to: m[1], damage_increase: m[2] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Extended dot (affix: dot persists after skill ends)
// ─────────────────────────────────────────────────────────

/** 额外持续存在x秒，每y秒造成一次伤害 */
export function extractExtendedDot(text: string): ExtractedEffect | null {
	const m = text.match(
		/额外持续(?:存在)?(\w+)秒[，,]每(\w+(?:\.\w+)?)秒造成一次伤害/,
	);
	if (m) {
		return {
			type: "extended_dot",
			fields: { extra_seconds: m[1], tick_interval: m[2] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Shield destroy DoT (affix: per-shield periodic damage)
// ─────────────────────────────────────────────────────────

/** 【X】每y秒对目标造成`湮灭护盾`的总个数*z%攻击力的伤害 */
export function extractShieldDestroyDot(text: string): ExtractedEffect | null {
	const m = text.match(
		/【(.+?)】每(\w+(?:\.\w+)?)秒对目标造成.*?湮灭护盾.*?(\d+)%攻击力的伤害/,
	);
	if (!m) return null;
	const fields: Record<string, string | number> = {
		tick_interval: Number(m[2]),
		per_shield_damage: Number(m[3]),
	};
	const meta: Record<string, unknown> = { parent: m[1] };
	// Check for "若...敌方无护盾...计算湮灭N个护盾" fallback
	const noShieldMatch = text.match(
		/(?:无护盾.*?计算湮灭|无护盾.*?则计算.*?)(\d+)个/,
	);
	if (noShieldMatch) fields.no_shield_assumed = Number(noShieldMatch[1]);
	return { type: "shield_destroy_dot", fields, meta };
}

// ─────────────────────────────────────────────────────────
// Lifesteal with parent from 【parentName】
// ─────────────────────────────────────────────────────────

/** 恢复【X】造成伤害y%的气血值 / 造成伤害时恢复...with parent */
export function extractLifestealWithParent(
	text: string,
): ExtractedEffect | null {
	// Pattern: 恢复【X】造成伤害y%的气血值
	const m1 = text.match(/恢复【(.+?)】造成(?:的)?伤害(\w+)%(?:的)?气血值/);
	if (m1) {
		return {
			type: "lifesteal",
			fields: { value: Number(m1[2]) },
			meta: { parent: m1[1] },
		};
	}
	// Pattern: 【X】造成伤害时，恢复...本次伤害x%的气血值
	const m2 = text.match(
		/(?:真灵)?(?:.+?)造成伤害时[，,]恢复.*?(?:伤害|本次伤害)(\w+)%(?:的)?气血值/,
	);
	if (m2) {
		// Find parent from 【X】 in the text
		const parentMatch = text.match(/【(.+?)】/);
		if (parentMatch) {
			return {
				type: "lifesteal",
				fields: { value: m2[1] },
				meta: { parent: parentMatch[1] },
			};
		}
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Shield from heal (affix: shield on heal with named parent)
// ─────────────────────────────────────────────────────────

/** 每次恢复气血时会为目标添加一个x%自身最大气血值的护盾，持续d秒 */
export function extractShieldOnHeal(text: string): ExtractedEffect | null {
	const m = text.match(
		/恢复气血时.*?添加.*?(\w+)%(?:自身)?最大气血值的护盾[，,]持续(\w+)秒/,
	);
	if (m) {
		// Find parent from 【X】 in text
		const parentMatch = text.match(/【(.+?)】/);
		const meta: Record<string, unknown> = { source: "self_max_hp" };
		if (parentMatch) meta.parent = parentMatch[1];
		return { type: "shield", fields: { value: m[1], duration: m[2] }, meta };
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Per-stolen-buff debuff
// ─────────────────────────────────────────────────────────

/** 每偷取目标一个增益状态对目标附加一层【X】状态：攻击力降低x%，持续d秒 */
export function extractPerStolenBuffDebuff(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/每偷取.*?增益状态.*?附加.*?层【(.+?)】.*?攻击力降低(\w+)%[，,]持续(\w+)秒/,
	);
	if (m) {
		return {
			type: "debuff",
			fields: {
				target: "attack",
				value: `-${m[2]}`,
				duration: m[3],
			},
			meta: { name: m[1], per_stolen_buff: true },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Attack bonus per debuff stack
// ─────────────────────────────────────────────────────────

/** 根据目标身上减益状态的最高层数提升自身攻击力，每层提升x%，最多计算n层 */
export function extractAttackBonusPerDebuff(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/减益状态.*?(?:最高)?层数.*?攻击力.*?每层.*?(\w+)%.*?最多.*?(\d+)层/,
	);
	if (m) {
		return {
			type: "attack_bonus",
			fields: { value: m[1], max_stacks: Number(m[2]) },
			meta: { per_debuff_stack: true },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Percent max HP damage (affix: named state variant)
// ─────────────────────────────────────────────────────────

/** 每叠加N层便会消耗并造成目标x%最大气血值伤害 */
export function extractPercentMaxHpDamageAffix(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/叠加.*?层.*?造成(?:目标)?(\w+)%最大气血值(?:的)?伤害/);
	if (m) {
		// Find named state from 【X】
		const nameMatch = text.match(/【(.+?)】/);
		const meta: Record<string, unknown> = {};
		if (nameMatch) meta.name = nameMatch[1];
		return { type: "percent_max_hp_damage", fields: { value: m[1] }, meta };
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self buff extend
// ─────────────────────────────────────────────────────────

/** 延长x秒【Y】持续时间 */
export function extractSelfBuffExtend(text: string): ExtractedEffect | null {
	const m = text.match(/延长(\w+)秒【(.+?)】持续时间/);
	if (m) {
		return {
			type: "self_buff_extend",
			fields: { value: m[1] },
			meta: { buff_name: m[2] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Periodic cleanse (affix)
// ─────────────────────────────────────────────────────────

/** 每秒有y%概率驱散自身所有控制状态，N秒内最多触发M次 */
export function extractPeriodicCleanse(text: string): ExtractedEffect | null {
	const m = text.match(
		/(?:每秒有)?(\w+)%概率驱散自身.*?(?:`?控制状态`?|负面状态)[，,](\d+)秒内最多触发(\d+)次/,
	);
	if (m) {
		return {
			type: "periodic_cleanse",
			fields: {
				chance: m[1],
				interval: 1,
				cooldown: Number(m[2]),
				max_triggers: Number(m[3]),
			},
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Delayed burst increase (affix)
// ─────────────────────────────────────────────────────────

/** 【X】状态结束时的伤害提升y% */
export function extractDelayedBurstIncrease(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/【(.+?)】状态结束时的伤害提升(\d+)%/);
	if (m) {
		return {
			type: "delayed_burst_increase",
			fields: { value: Number(m[2]) },
			meta: { parent: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self lost HP damage every N hits (affix)
// ─────────────────────────────────────────────────────────

/** 每造成N次伤害，额外附加x%自身已损气血值...的伤害 */
export function extractSelfLostHpDamageEveryN(
	text: string,
): ExtractedEffect | null {
	const m = text.match(
		/每造成(\d+)次伤害[，,]额外.*?(\w+)%自身已损(?:失)?气血值/,
	);
	if (m) {
		// Find parent from 【X】
		const parentMatch = text.match(/【(.+?)】/);
		const meta: Record<string, unknown> = { every_n_hits: Number(m[1]) };
		if (parentMatch) meta.parent = parentMatch[1];
		return {
			type: "self_lost_hp_damage",
			fields: { value: m[2] },
			meta,
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Periodic dispel (affix: simple dispel without damage)
// ─────────────────────────────────────────────────────────

/** 造成伤害前优先驱散目标N个增益效果 */
export function extractPeriodicDispelAffix(
	text: string,
): ExtractedEffect | null {
	const CN_NUMS_LOCAL: Record<string, number> = {
		一: 1,
		二: 2,
		两: 2,
		三: 3,
		四: 4,
		五: 5,
		六: 6,
		七: 7,
		八: 8,
		九: 9,
		十: 10,
	};
	const m = text.match(
		/(?:造成伤害前)?(?:优先)?驱散目标([\w一二两三四五六七八九十]+)个增益(?:效果|状态)/,
	);
	if (m) {
		const val = m[1];
		const count =
			CN_NUMS_LOCAL[val] !== undefined
				? CN_NUMS_LOCAL[val]
				: Number.parseInt(val, 10);
		return {
			type: "periodic_dispel",
			fields: { count: Number.isNaN(count) ? val : count },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Self HP floor (affix)
// ─────────────────────────────────────────────────────────

/** 气血不会降至x%以下 */
export function extractSelfHpFloor(text: string): ExtractedEffect | null {
	const m = text.match(/气血不会降至(\w+)%以下/);
	if (m) {
		return {
			type: "self_hp_floor",
			fields: { value: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Permanent DoT based on max HP (affix)
// ─────────────────────────────────────────────────────────

/** 处于【X】下，每秒受到x%最大气血值的伤害 */
export function extractDotPermanentMaxHp(text: string): ExtractedEffect | null {
	const m = text.match(/处于【(.+?)】下[，,]每秒受到(\w+)%最大气血值的伤害/);
	if (m) {
		return {
			type: "dot",
			fields: {
				tick_interval: 1,
				percent_max_hp: m[2],
				duration: "permanent",
			},
			meta: { parent: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Per debuff stack damage with fixed value (affix: 天魔降临咒 pattern)
// ─────────────────────────────────────────────────────────

/** 【X】提升敌方受到的伤害上限提升至y% */
export function extractPerDebuffStackDamageUpgrade(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/【(.+?)】.*?伤害.*?上限(?:提升至|增加至)(\w+)%/);
	if (m) {
		return {
			type: "per_debuff_stack_damage",
			fields: { per_n_stacks: 1, value: 0.5, max: m[2] },
			meta: { parent: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Counter debuff upgrade (affix: 大罗幻诀 pattern)
// ─────────────────────────────────────────────────────────

/** 【X】状态下附加异常概率提升至y% */
export function extractCounterDebuffUpgrade(
	text: string,
): ExtractedEffect | null {
	const m = text.match(/【(.+?)】状态下.*?概率提升至(\d+)%/);
	if (m) {
		return {
			type: "counter_debuff_upgrade",
			fields: { on_attacked_chance: Number(m[2]) },
			meta: { parent: m[1] },
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// Cross-slot debuff (affix: 大罗幻诀 pattern)
// ─────────────────────────────────────────────────────────

/** 受到攻击时，额外给目标附加【X】：最终伤害减免减低y%，持续d秒 */
export function extractCrossSlotDebuff(text: string): ExtractedEffect | null {
	const m = text.match(
		/受到攻击时[，,].*?附加【(.+?)】[：:].*?(?:最终伤害减免|`最终伤害减免`)(?:减低|降低)(\w+)%[，,]持续(\w+)秒/,
	);
	if (m) {
		// Find the parent state (the state under which this happens)
		// It's typically the first 【X】 in the text
		const parentMatch = text.match(/【(.+?)】状态下/);
		const meta: Record<string, unknown> = {
			name: m[1],
			trigger: "on_attacked",
		};
		if (parentMatch) meta.parent = parentMatch[1];
		return {
			type: "cross_slot_debuff",
			fields: {
				target: "final_damage_reduction",
				value: `-${m[2]}`,
				duration: m[3],
			},
			meta,
		};
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// DoT per N stacks (affix: 梵圣真魔咒 pattern)
// ─────────────────────────────────────────────────────────

/** 每获得N个【X】，会额外附加一层持续d秒的【Y】：每秒造成...伤害 */
export function extractDotPerNStacks(text: string): ExtractedEffect | null {
	const CN_NUMS_LOCAL: Record<string, number> = {
		一: 1,
		二: 2,
		两: 2,
		三: 3,
		四: 4,
		五: 5,
	};
	const m = text.match(
		/每获得.*?([\d一二两三四五])个【(.+?)】.*?附加.*?持续(\w+)秒的【(.+?)】.*?每秒造成(?:目标)?(\w+)%已损(?:失)?气血值(?:的)?伤害/,
	);
	if (m) {
		const nVal = CN_NUMS_LOCAL[m[1]] ?? Number(m[1]);
		return {
			type: "dot",
			fields: {
				tick_interval: 1,
				percent_lost_hp: m[5],
				duration: m[3],
			},
			meta: {
				name: m[4],
				parent: m[2],
				per_n_stacks: nVal,
			},
		};
	}
	return null;
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
	{
		name: "self_hp_cost",
		fn: extractSelfHpCost,
		order: 0,
		grammars: ["G4", "G5"],
	},
	{ name: "untargetable", fn: extractUntargetable, order: 1 },
	{
		name: "base_attack",
		fn: (text) => {
			const r = extractBaseAttackWithVars(text);
			if (!r) return null;
			return {
				type: "base_attack",
				fields: { hits: r.hits, total: r.totalVar },
			};
		},
		order: 10,
	},
	{ name: "percent_max_hp_damage", fn: extractPercentHpDamage, order: 20 },
	{ name: "self_lost_hp_damage", fn: extractSelfLostHpDamage, order: 20 },
	{
		name: "self_lost_hp_damage_per_hit",
		fn: extractSelfLostHpDamagePerHit,
		order: 20,
	},
	{ name: "self_hp_cost_per_hit", fn: extractSelfHpCostPerHit, order: 20 },
	{ name: "shield", fn: extractShield, order: 20 },
	{ name: "debuff", fn: extractDebuff, order: 20 },
	{ name: "shield_destroy_damage", fn: extractShieldDestroyDamage, order: 20 },
	{
		name: "no_shield_double_damage",
		fn: extractNoShieldDoubleDamage,
		order: 21,
	},
	{
		name: "percent_current_hp_damage",
		fn: extractPercentCurrentHpDamage,
		order: 20,
	},
	{ name: "summon", fn: extractSummon, order: 20 },
	{ name: "crit_damage_bonus", fn: extractCritDamageBonus, order: 20 },
	{
		name: "self_damage_taken_increase",
		fn: extractSelfDamageTakenIncrease,
		order: 20,
	},
	{ name: "periodic_escalation", fn: extractPeriodicEscalation, order: 20 },
	{ name: "buff_steal", fn: extractBuffSteal, order: 20 },
	{
		name: "per_debuff_stack_damage",
		fn: extractPerDebuffStackDamage,
		order: 20,
	},
	{ name: "echo_damage", fn: extractEchoDamage, order: 20 },
	{ name: "counter_debuff", fn: extractCounterDebuff, order: 20 },
	{ name: "counter_buff", fn: extractCounterBuff, order: 20 },
	{ name: "self_hp_cost_dot", fn: extractSelfHpCostDot, order: 20 },
	{
		name: "self_lost_hp_damage_dot",
		fn: extractSelfLostHpDamageDot,
		order: 20,
	},
	{ name: "self_heal", fn: extractSelfHeal, order: 20 },
	{ name: "self_cleanse", fn: extractSelfCleanse, order: 20 },
	{ name: "delayed_burst", fn: extractDelayedBurst, order: 20 },
	{
		name: "conditional_damage_cleanse",
		fn: extractConditionalDamageFromCleanse,
		order: 25,
	},
	{ name: "skill_cooldown_debuff", fn: extractSkillCooldownDebuff, order: 25 },
	{ name: "self_buff", fn: extractSelfBuff, order: 25 },
	{
		name: "self_buff_skill_damage_increase",
		fn: extractSelfBuffSkillDamageIncrease,
		order: 25,
		grammars: ["G4"],
	},
	{ name: "next_skill_carry", fn: extractNextSkillCarry, order: 25 },
	{ name: "per_enemy_lost_hp", fn: extractPerEnemyLostHp, order: 30 },
];

/**
 * Extractors for affix text (primary + exclusive).
 * Order matters: more specific patterns before general ones.
 */
export const AFFIX_EXTRACTORS: ExtractorDef[] = [
	// Damage modifiers
	{
		name: "ignore_damage_reduction",
		fn: extractIgnoreDamageReduction,
		order: 5,
	},
	{ name: "per_self_lost_hp", fn: extractPerSelfLostHp, order: 10 },
	{
		name: "per_debuff_stack_true_damage",
		fn: extractPerDebuffStackTrueDamage,
		order: 10,
	},
	{ name: "dot_extra_per_tick", fn: extractDotExtraPerTick, order: 10 },
	{ name: "dot_damage_increase", fn: extractDotDamageIncrease, order: 10 },
	{
		name: "dot_frequency_increase",
		fn: extractDotFrequencyIncrease,
		order: 10,
	},
	{
		name: "conditional_damage_affix",
		fn: extractConditionalDamageAffix,
		order: 10,
	},
	{ name: "damage_increase", fn: extractDamageIncrease, order: 10 },
	{
		name: "self_damage_taken_during_cast",
		fn: extractSelfDamageTakenDuringCast,
		order: 15,
	},

	// State modifiers
	{ name: "all_state_duration", fn: extractAllStateDuration, order: 10 },
	{ name: "buff_duration", fn: extractBuffDuration, order: 10 },
	{ name: "buff_strength", fn: extractBuffStrength, order: 10 },
	{ name: "buff_stack_increase", fn: extractBuffStackIncrease, order: 10 },
	{ name: "debuff_stack_increase", fn: extractDebuffStackIncrease, order: 10 },

	// Skill modifiers
	{ name: "next_skill_buff", fn: extractNextSkillBuff, order: 10 },
	{ name: "skill_damage_increase", fn: extractSkillDamageIncrease, order: 15 },
	{
		name: "enemy_skill_damage_reduction",
		fn: extractEnemySkillDamageReduction,
		order: 15,
	},

	// Triggers
	{ name: "on_shield_expire", fn: extractOnShieldExpire, order: 10 },
	{
		name: "on_buff_debuff_shield_trigger",
		fn: extractOnBuffDebuffShieldTrigger,
		order: 10,
	},
	{
		name: "probability_multiplier",
		fn: extractProbabilityMultiplier,
		order: 10,
	},
	{ name: "enlightenment_bonus", fn: extractEnlightenmentBonus, order: 10 },

	// Debuff applications
	{ name: "debuff_stack_chance", fn: extractDebuffStackChance, order: 10 },
	{ name: "heal_reduction_debuff", fn: extractHealReductionDebuff, order: 15 },
	{ name: "atk_dot", fn: extractAtkDot, order: 15 },
	{ name: "on_dispel", fn: extractOnDispel, order: 20 },
	{
		name: "periodic_dispel_with_damage",
		fn: extractPeriodicDispelWithDamage,
		order: 10,
	},

	// Per-stack scaling
	{ name: "per_buff_stack_damage", fn: extractPerBuffStackDamage, order: 20 },
	{
		name: "per_debuff_stack_damage_affix",
		fn: extractPerDebuffStackDamageAffix,
		order: 20,
	},

	// Existing extractors reused for affixes
	{ name: "per_hit_escalation", fn: extractPerHitEscalation, order: 10 },
	{
		name: "lifesteal_with_parent",
		fn: extractLifestealWithParent,
		order: 8,
	},
	{ name: "lifesteal", fn: extractLifesteal, order: 10 },
	{ name: "shield_strength", fn: extractShieldStrength, order: 10 },
	{ name: "self_buff_extra", fn: extractSelfBuffExtra, order: 15 },
	{ name: "per_enemy_lost_hp", fn: extractPerEnemyLostHp, order: 10 },
	{ name: "hp_cost_avoid_chance", fn: extractHpCostAvoidChance, order: 20 },

	// Book-specific affix extractors (migrated from AFFIX_PARSERS)
	{ name: "summon_buff", fn: extractSummonBuff, order: 10 },
	{ name: "extended_dot", fn: extractExtendedDot, order: 10 },
	{ name: "shield_destroy_dot", fn: extractShieldDestroyDot, order: 5 },
	{ name: "debuff", fn: extractDebuff, order: 15 },
	{
		name: "per_stolen_buff_debuff",
		fn: extractPerStolenBuffDebuff,
		order: 10,
	},
	{
		name: "attack_bonus_per_debuff",
		fn: extractAttackBonusPerDebuff,
		order: 10,
	},
	{
		name: "percent_max_hp_damage_affix",
		fn: extractPercentMaxHpDamageAffix,
		order: 10,
	},
	{ name: "self_buff_extend", fn: extractSelfBuffExtend, order: 10 },
	{ name: "periodic_cleanse", fn: extractPeriodicCleanse, order: 15 },
	{
		name: "delayed_burst_increase",
		fn: extractDelayedBurstIncrease,
		order: 10,
	},
	{
		name: "self_lost_hp_damage_every_n",
		fn: extractSelfLostHpDamageEveryN,
		order: 10,
	},
	{
		name: "periodic_dispel_affix",
		fn: extractPeriodicDispelAffix,
		order: 10,
	},
	{ name: "self_hp_floor", fn: extractSelfHpFloor, order: 15 },
	{
		name: "dot_permanent_max_hp",
		fn: extractDotPermanentMaxHp,
		order: 10,
	},
	{
		name: "per_debuff_stack_damage_upgrade",
		fn: extractPerDebuffStackDamageUpgrade,
		order: 15,
	},
	{
		name: "counter_debuff_upgrade",
		fn: extractCounterDebuffUpgrade,
		order: 5,
	},
	{ name: "cross_slot_debuff", fn: extractCrossSlotDebuff, order: 10 },
	{ name: "dot_per_n_stacks", fn: extractDotPerNStacks, order: 10 },
	{ name: "shield_on_heal", fn: extractShieldOnHeal, order: 10 },

	// Common/school affix extractors
	{ name: "debuff_strength", fn: extractDebuffStrength, order: 10 },
	{
		name: "damage_reduction_during_cast",
		fn: extractDamageReductionDuringCast,
		order: 10,
	},
	{ name: "execute_conditional", fn: extractExecuteConditional, order: 5 },
	{ name: "random_buff", fn: extractRandomBuff, order: 5 },
	{ name: "flat_extra_damage", fn: extractFlatExtraDamage, order: 10 },
	{ name: "shield_value_increase", fn: extractShieldValueIncrease, order: 10 },
	{ name: "attack_bonus", fn: extractAttackBonusAffix, order: 10 },
	{ name: "guaranteed_resonance", fn: extractGuaranteedResonance, order: 5 },
	{ name: "triple_bonus", fn: extractTripleBonus, order: 5 },
	{ name: "healing_increase", fn: extractHealingIncrease, order: 10 },
	{ name: "final_damage_bonus", fn: extractFinalDamageBonus, order: 10 },
	{ name: "probability_to_certain", fn: extractProbabilityToCertain, order: 5 },
	{ name: "healing_to_damage", fn: extractHealingToDamage, order: 10 },
	{ name: "damage_to_shield", fn: extractDamageToShield, order: 10 },
	{ name: "random_debuff", fn: extractRandomDebuff, order: 5 },
	{ name: "min_lost_hp_threshold", fn: extractMinLostHpThreshold, order: 5 },
];
