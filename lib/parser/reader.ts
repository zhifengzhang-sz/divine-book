/**
 * Stage 1: Reader — Linguistic Pattern Recognition
 *
 * Two-phase scan: split at structural boundaries, then match
 * patterns within each segment independently.
 *
 * Architecture (impl.reactive.md §4.0 + §4.1):
 *
 *   text
 *     ↓
 *   splitAtBoundaries(text)  ← split at 【name】：
 *     ↓
 *   Segment[]  (text + stateName + offset)
 *     ↓
 *   scanSegment() per segment  ← longest-match-first within segment
 *     ↓
 *   TokenEvent[]  (scope inherited from segment)
 */

// ── Types ────────────────────────────────────────────────

/** A single recognized Chinese term in the source text. */
export interface TokenEvent {
	/** Unique term identifier (e.g., "base_attack", "hp_cost", "per_hit") */
	term: string;
	/** Raw matched substring from the source text */
	raw: string;
	/** Extracted captures — variable refs or literal values */
	captures: Record<string, string>;
	/** Character offset in the original text (for modifier attachment) */
	position: number;
	/** Named state scope inherited from segment (from 【name】：boundary splitting) */
	scope?: string;
}

/** A segment produced by splitting at structural boundaries. */
interface Segment {
	/** The text content of this segment */
	text: string;
	/** Named state scope this segment defines (from preceding 【name】：) */
	stateName?: string;
	/** Character offset of this segment in the original text */
	offset: number;
	/** Text preceding the 【name】：boundary (for target detection) */
	preText?: string;
}

/** State metadata extracted from boundary splitting + tokens. */
export interface StateInfo {
	name: string;
	/** Target from context before 【name】 (对敌方/为自身) */
	target: "self" | "opponent";
	/** Text before the boundary that created this state */
	preText: string;
}

/** A reader pattern entry — one Chinese term = one entry. */
interface ReaderPattern {
	term: string;
	regex: RegExp;
	captureNames: string[];
}

// ── Chinese number utilities ─────────────────────────────

const CN_NUMS: Record<string, number> = {
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

export function parseCnNumber(text: string): number {
	if (!text) return 1;
	if (text.length === 1 && CN_NUMS[text]) return CN_NUMS[text];
	if (text.startsWith("十") && text.length === 2) {
		return 10 + (CN_NUMS[text[1]] || 0);
	}
	return CN_NUMS[text] || 1;
}

// ── Pattern Table ────────────────────────────────────────
//
// Each entry: { term, regex, captureNames }
// Patterns are matched longest-first to prevent substring collisions.
// E.g., "神通伤害加深" matches before "伤害加深".

const READER_PATTERNS: ReaderPattern[] = [
	// ── Damage ───────────────────────────────────────────

	{
		term: "base_attack",
		regex:
			/(?<!额外)造成(?:((?:一|二|三|四|五|六|七|八|九|十)+)段)?(?:共(?:计)?)?(\w+)%攻击力的(?:灵法)?伤害/,
		captureNames: ["hits_cn", "total"],
	},
	{
		term: "percent_max_hp_damage",
		regex: /(?:造成|附加)(?:目标)?(\w+)%(?:自身)?最大气血值的伤害/,
		captureNames: ["value"],
	},
	{
		term: "cap_vs_monster",
		regex:
			/对怪物(?:伤害)?(?:最多|不超过)(?:造成)?(?:自身)?(\w+)%攻击力(?:的伤害)?/,
		captureNames: ["value"],
	},
	{
		term: "percent_current_hp_damage",
		regex: /额外附加(\w+)%(?:目标)?当前气血值的伤害/,
		captureNames: ["value"],
	},
	{
		term: "self_lost_hp_damage",
		regex:
			/(?:额外)?(?:对(?:其|目标)?造成|附加)(?:自身)?(\w+)%已损(?:失)?气血值的伤害/,
		captureNames: ["value"],
	},
	{
		term: "shield_destroy_damage",
		regex:
			/湮灭敌方(\w+)个护盾[，,](?:并)?(?:额外)?造成(\w+)%敌方最大气血值的伤害/,
		captureNames: ["shields", "value"],
	},
	{
		term: "no_shield_double_damage",
		regex: /对无盾目标造成双倍伤害/,
		captureNames: [],
	},
	{
		term: "flat_extra_damage",
		regex: /额外造成(\w+)%攻击力的伤害/,
		captureNames: ["value"],
	},
	{
		term: "echo_damage",
		regex:
			/(?:每次)?受到(?:的)?伤害时[，,].*?额外受到.*?伤害(?:值)?为当次伤害的(\w+)%/,
		captureNames: ["value"],
	},

	// ── Cost ─────────────────────────────────────────────

	{
		term: "hp_cost",
		regex: /消耗(?:自身)?(\w+)%(?:的)?当前气血值/,
		captureNames: ["value"],
	},
	{
		term: "hp_cost_dot",
		regex: /自身每秒损失(\w+)%(?:的)?当前气血值/,
		captureNames: ["value"],
	},

	// ── Stat modifiers ───────────────────────────────────
	// Order matters: longer/more-specific patterns first

	{
		term: "skill_dmg_increase",
		regex: /(\w+)%(?:的)?神通伤害加深/,
		captureNames: ["value"],
	},
	{
		term: "final_dmg_bonus",
		regex: /(\w+)%(?:的)?最终伤害(?:加成|加深)/,
		captureNames: ["value"],
	},
	{
		term: "final_dmg_bonus",
		regex: /最终伤害(?:加成|加深).*?(?:提升)?(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "damage_increase_stat",
		regex: /(\w+)%(?:的)?伤害加深/,
		captureNames: ["value"],
	},
	{
		term: "attack_bonus_stat",
		regex: /(?:提升|提高)(?:自身)?(\w+)%(?:的)?攻击力(?:加成)?/,
		captureNames: ["value"],
	},
	{
		term: "damage_reduction_stat",
		regex: /(\w+)%(?:的)?(?:伤害减免)/,
		captureNames: ["value"],
	},
	{
		term: "crit_rate_stat",
		regex: /(\w+)%(?:的)?暴击率/,
		captureNames: ["value"],
	},
	{
		term: "crit_dmg_bonus",
		regex: /(?:使本神通)?暴击伤害提[升高](\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "healing_bonus_stat",
		regex: /(\w+)%(?:的)?治疗加成/,
		captureNames: ["value"],
	},
	{
		term: "defense_bonus_stat",
		regex: /(\w+)%(?:的)?守御(?:加成)?/,
		captureNames: ["value"],
	},
	{
		term: "hp_bonus_stat",
		regex: /(\w+)%(?:的)?最大气血值/,
		captureNames: ["value"],
	},

	// ── DoT ──────────────────────────────────────────────

	{
		term: "dot_current_hp",
		regex:
			/每(\w+(?:\.\w+)?)?秒(?:额外)?(?:对目标)?造成(?:目标)?(\w+)%当前气血值的伤害/,
		captureNames: ["interval", "value"],
	},
	{
		term: "dot_lost_hp",
		regex:
			/每(\w+(?:\.\w+)?)?秒(?:额外)?造成(?:目标)?(\w+)%已损(?:失)?气血值(?:的)?伤害/,
		captureNames: ["interval", "value"],
	},
	{
		term: "dot_max_hp",
		regex: /每秒(?:对目标)?(?:受到)?(\w+)%(?:最大)?气血值的伤害/,
		captureNames: ["value"],
	},
	{
		term: "dot_atk",
		regex: /每秒受到(\w+)%攻击力的伤害/,
		captureNames: ["value"],
	},
	{
		term: "self_lost_hp_damage_dot",
		regex:
			/每秒对目标造成(?:自身)?(\w+)%已损(?:失)?气血值(?:和期间消耗气血)?的伤害/,
		captureNames: ["value"],
	},

	// ── Structure / modifiers ────────────────────────────

	{
		term: "named_state",
		regex: /【(.+?)】(?:状态)?[：:]/,
		captureNames: ["name"],
	},
	{
		term: "state_ref",
		regex: /(?:获得|添加|进入|施加).*?【(.+?)】/,
		captureNames: ["name"],
	},
	{
		term: "per_hit",
		regex: /每段攻击/,
		captureNames: [],
	},
	{
		term: "duration",
		regex: /持续(?:存在)?(\w+(?:\.\w+)?)秒/,
		captureNames: ["value"],
	},
	{
		term: "max_stacks",
		regex: /(各自)?最多叠加(\w+)层/,
		captureNames: ["qualifier", "value"],
	},
	{
		term: "max_stacks",
		regex: /上限(\w+)层/,
		captureNames: ["value"],
	},
	{
		term: "chance",
		regex: /(?:各?有)?(\w+)%(?:的)?概率/,
		captureNames: ["value"],
	},
	{
		term: "on_attacked",
		regex: /受到(?:伤害|攻击)时/,
		captureNames: [],
	},
	{
		term: "undispellable",
		regex: /(?:无法被驱散|不可驱散)/,
		captureNames: [],
	},
	{
		term: "permanent",
		regex: /战斗状态内永久生效/,
		captureNames: [],
	},
	{
		term: "stack_add",
		regex: /(?:会)?(?:为目标)?添加(\w+)层/,
		captureNames: ["count"],
	},

	// ── Healing / Shield ─────────────────────────────────

	{
		term: "self_heal",
		regex: /(?:为自身)?恢复(?:共)?(\w+)%(?:的)?(?:最大)?气血值/,
		captureNames: ["value"],
	},
	{
		term: "per_tick_heal",
		regex:
			/每秒恢复(?:自身)?(?:和友方)?(\w+)%(?:的)?(?:最大)?气血值[，,]共计恢复(\w+)%(?:的)?最大气血值/,
		captureNames: ["per_tick", "total"],
	},
	{
		term: "heal_echo_damage",
		regex: /附加(?:临摹)?期间(?:所)?恢复气血值的等额伤害/,
		captureNames: [],
	},
	{
		term: "shield",
		regex: /(?:添加|获得)(?:自身)?(\w+)%最大气血值的护盾/,
		captureNames: ["value"],
	},
	{
		term: "lifesteal",
		regex:
			/(?:恢复.*?(?:造成(?:的)?)?(?:伤害|本次伤害)(\w+)%(?:的)?气血值|获得(\w+)%(?:的)?吸血效果)/,
		captureNames: ["value", "value2"],
	},
	{
		term: "self_equal_heal",
		regex: /等额恢复自身气血/,
		captureNames: [],
	},

	// ── Debuff ────────────────────────────────────────────

	{
		term: "debuff_final_dr",
		regex: /降低(\w+)%(?:的)?最终伤害减免/,
		captureNames: ["value"],
	},
	{
		term: "debuff_skill_dmg",
		regex: /使敌方的?神通伤害降低(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "debuff_attack",
		regex: /攻击力降低(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "heal_reduction",
		regex: /治疗量降低(\w+)%/,
		captureNames: ["value"],
	},

	// ── Complex skill patterns ───────────────────────────

	{
		term: "summon",
		regex: /的分身[，,]继承自身(\w+)%的属性/,
		captureNames: ["inherit"],
	},
	{
		term: "self_damage_taken_increase",
		regex: /(?:释放后)?(?:自身)?(\d+)秒内受到(?:的)?伤害(?:提[升高])(\w+)%/,
		captureNames: ["duration", "value"],
	},
	{
		term: "periodic_escalation",
		regex:
			/每造成(\d+)次伤害时[，,].*?伤害提升(\w+)倍[，,].*?至多.*?加成(\d+)次/,
		captureNames: ["every_n", "multiplier", "max"],
	},
	{
		term: "buff_steal",
		regex: /偷取目标(\w+)个增益状态/,
		captureNames: ["count"],
	},
	{
		term: "per_debuff_stack_damage",
		regex:
			/每(?:具有)?(?:一个)?减益状态(?:效果)?[，,].*?伤害(?:提升|增加)(\w+)%[，,]最多计算(\d+)个/,
		captureNames: ["value", "max"],
	},
	{
		term: "counter_debuff",
		regex: /受到(?:伤害|攻击)时[，,]各有(\d+)%概率对攻击方添加.*?层【(.+?)】/,
		captureNames: ["chance", "name"],
	},
	{
		term: "counter_buff_heal",
		regex:
			/受到伤害时[，,](?:自身)?恢复该次伤害(?:损失气血值的)?(\w+)%的?气血值/,
		captureNames: ["value"],
	},
	{
		term: "counter_buff_reflect",
		regex:
			/每秒对目标.*?反射.*?自身所?受到(?:的)?伤害(?:值)?的(\w+)%与自身(\w+)%已损(?:失)?气血值的伤害/,
		captureNames: ["reflect_dmg", "reflect_hp"],
	},
	{
		term: "untargetable",
		regex: /(\d+)秒内不可被选中/,
		captureNames: ["duration"],
	},
	{
		term: "self_cleanse",
		regex: /驱散自身(\w+)个负面状态/,
		captureNames: ["count"],
	},
	{
		term: "delayed_burst",
		regex:
			/【(.+?)】[，,]持续(\d+)秒.*?伤害增加(\d+)%.*?造成(\d+)%.*?伤害\+(\d+)%攻击力的伤害/,
		captureNames: ["name", "dur", "increase", "accum", "base"],
	},
	{
		term: "conditional_cleanse",
		regex: /若净化.*?接下来.*?([一二三四五六七八九十\d]+)个?神通.*?命中时/,
		captureNames: ["max_triggers_cn"],
	},
	{
		term: "skill_cooldown",
		regex: /下一个未释放的神通进入(\d+)秒冷却/,
		captureNames: ["duration"],
	},
	{
		term: "next_skill_scope",
		regex: /接下来(?:神通的)?(\d+)段攻击/,
		captureNames: ["hits"],
	},
	{
		term: "per_enemy_lost_hp",
		regex:
			/敌方(?:(?:当前)?气血值)?每(?:多)?损失(\w+)%(?:最大(?:值)?气血值)?.*?伤害(?:提升|增加)(\w+)%/,
		captureNames: ["per_percent", "value"],
	},
	{
		term: "cross_skill_accumulation",
		regex: /此前.*?每被神通.*?攻击命中/,
		captureNames: [],
	},
	{
		term: "summon_trigger_on_cast",
		regex: /释放神通后分身.*?攻击/,
		captureNames: [],
	},
	{
		term: "summon_damage_taken",
		regex: /分身受到的伤害为自身的(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "no_healing_bonus",
		regex: /不受治疗加成影响/,
		captureNames: [],
	},
	{
		term: "no_damage_bonus",
		regex: /该伤害不受伤害加成影响/,
		captureNames: [],
	},
	{
		term: "sequenced_skill",
		regex: /依.*?神通装配顺序/,
		captureNames: [],
	},
	{
		term: "includes_hp_spent",
		regex: /和期间消耗气血/,
		captureNames: [],
	},

	// ── Affix-specific patterns ──────────────────────────

	{
		term: "ignore_damage_reduction",
		regex: /无视敌方所有伤害减免效果/,
		captureNames: [],
	},
	{
		term: "per_self_lost_hp",
		regex: /每多损失1%最大气血值.*?伤害提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "per_debuff_true_damage",
		regex:
			/每有1层.*?减益.*?状态.*?造成(?:目标)?(\w+)%最大气血值.*?真实伤害.*?最多(?:造成)?(\w+)%/,
		captureNames: ["per_stack", "max"],
	},
	{
		term: "dot_extra_per_tick",
		regex: /持续伤害触发时.*?额外造成(?:目标)?(\w+)%已损(?:失)?气血/,
		captureNames: ["value"],
	},
	{
		term: "dot_damage_increase",
		regex: /持续伤害(?:上升|提升)(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "dot_frequency_increase",
		regex: /持续伤害.*?触发间隙缩短(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "conditional_damage_controlled",
		regex: /(?:敌方)?处于.*?控制(?:状态|效果).*?伤害提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "conditional_damage_debuff",
		regex: /(?:攻击)?带有.*?减益.*?状态.*?伤害提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "damage_increase_affix",
		regex: /(?:神通)?(?:造成的)?伤害提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "self_damage_during_cast",
		regex: /施放期间自身受到的伤害.*?提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "all_state_duration",
		regex: /所有状态.*?持续时间延长(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "buff_duration",
		regex: /增益.*?(?:状态)?持续时间延长(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "buff_strength",
		regex: /增益.*?效果强度提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "buff_stack_increase",
		regex: /增益.*?状态层数增加(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "debuff_stack_increase",
		regex: /减益.*?状态层数增加(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "next_skill_buff",
		regex: /下一个施放的神通(?:释放时)?额外获得(\w+)%.*?神通伤害加深/,
		captureNames: ["value"],
	},
	{
		term: "skill_damage_increase_affix",
		regex: /提升(\w+)%.*?神通伤害(?!加深|减免)/,
		captureNames: ["value"],
	},
	{
		term: "enemy_skill_dmg_reduction",
		regex: /目标对本神通提升(\w+)%.*?神通伤害减免/,
		captureNames: ["value"],
	},
	{
		term: "on_shield_expire",
		regex: /护盾.*?消失时.*?造成护盾值(\w+)%的伤害/,
		captureNames: ["value"],
	},
	{
		term: "on_buff_debuff_shield",
		regex: /每次施加.*?(?:增益|减益).*?(?:护盾).*?造成.*?(\w+)%.*?灵法伤害/,
		captureNames: ["value"],
	},
	{
		term: "probability_multiplier",
		regex: /(\w+)%概率提升4倍.*?(\w+)%概率提升3倍.*?(\w+)%概率提升2倍/,
		captureNames: ["c4x", "c3x", "c2x"],
	},
	{
		term: "enlightenment_bonus",
		regex: /悟境等级加(\d+)/,
		captureNames: ["value"],
	},
	{
		term: "debuff_stack_chance",
		regex: /有(\w+)%概率额外多附加1层/,
		captureNames: ["value"],
	},
	{
		term: "on_dispel",
		regex: /若被驱散.*?受到(\w+)%攻击力的伤害/,
		captureNames: ["damage"],
	},
	{
		term: "periodic_dispel_with_damage",
		regex:
			/每秒.*?驱散.*?(\d+)个.*?增益.*?持续(\d+)秒.*?造成.*?(\w+)%.*?灵法伤害/,
		captureNames: ["count", "duration", "damage"],
	},
	{
		term: "per_buff_stack_damage",
		regex: /每(\d+)层增益状态.*?提升(\w+)%伤害.*?最大.*?(\w+)%/,
		captureNames: ["per_n", "value", "max"],
	},
	{
		term: "per_debuff_stack_damage_affix",
		regex: /每(?:有)?(\d+)层减益状态.*?伤害提升(\w+)%.*?最大.*?(\w+)%/,
		captureNames: ["per_n", "value", "max"],
	},
	{
		term: "per_hit_escalation",
		regex: /每段攻击.*?下一段提升(\w+)%神通加成/,
		captureNames: ["value"],
	},
	{
		term: "per_hit_escalation_remaining",
		regex: /每造成1段伤害.*?剩余.*?段.*?伤害提升(\w+)%.*?最多提升(\w+)%/,
		captureNames: ["value", "max"],
	},
	{
		term: "lifesteal_with_parent",
		regex: /恢复【(.+?)】造成(?:的)?伤害(\w+)%(?:的)?气血值/,
		captureNames: ["parent", "value"],
	},
	{
		term: "shield_strength",
		regex: /护盾提升至(?:自身)?(\w+)%最大气血值/,
		captureNames: ["value"],
	},
	{
		term: "self_buff_extra",
		regex: /【([^【】]+)】(?:状态)?(?:额外|下)/,
		captureNames: ["buff_name"],
	},
	{
		term: "summon_buff",
		regex:
			/分身受到(?:的)?伤害降低至(?:自身的)?(\w+)%[，,]\s*造成的伤害增加(\w+)%/,
		captureNames: ["dr", "dmg"],
	},
	{
		term: "extended_dot",
		regex: /额外持续(?:存在)?(\w+)秒[，,]每(\w+(?:\.\w+)?)秒造成一次伤害/,
		captureNames: ["extra_sec", "interval"],
	},
	{
		term: "shield_destroy_dot",
		regex:
			/【(.+?)】每(\w+(?:\.\w+)?)秒对目标造成.*?湮灭护盾.*?(\d+)%攻击力的伤害/,
		captureNames: ["parent", "interval", "damage"],
	},
	{
		term: "per_stolen_buff_debuff",
		regex:
			/每偷取.*?增益状态.*?附加.*?层【(.+?)】.*?攻击力降低(\w+)%[，,]持续(\w+)秒/,
		captureNames: ["name", "value", "duration"],
	},
	{
		term: "attack_bonus_per_debuff",
		regex: /减益状态.*?(?:最高)?层数.*?攻击力.*?每层.*?(\w+)%.*?最多.*?(\d+)层/,
		captureNames: ["value", "max"],
	},
	{
		term: "percent_max_hp_affix",
		regex: /叠加.*?层.*?造成(?:目标)?(\w+)%最大气血值(?:的)?伤害/,
		captureNames: ["value"],
	},
	{
		term: "self_buff_extend",
		regex: /延长(\w+)秒【(.+?)】持续时间/,
		captureNames: ["value", "buff_name"],
	},
	{
		term: "periodic_cleanse",
		regex:
			/(?:每秒有)?(\w+)%概率驱散自身.*?(?:控制状态|负面状态)[，,](\d+)秒内最多触发(\d+)次/,
		captureNames: ["chance", "cooldown", "max"],
	},
	{
		term: "delayed_burst_increase",
		regex: /【(.+?)】状态结束时的伤害提升(\d+)%/,
		captureNames: ["parent", "value"],
	},
	{
		term: "self_lost_hp_every_n",
		regex: /每造成(\d+)次伤害[，,]额外.*?(\w+)%自身已损(?:失)?气血值/,
		captureNames: ["every_n", "value"],
	},
	{
		term: "periodic_dispel_affix",
		regex:
			/(?:造成伤害前)?(?:优先)?驱散目标([\w一二两三四五六七八九十]+)个增益/,
		captureNames: ["count"],
	},
	{
		term: "self_hp_floor",
		regex: /气血不会降至(\w+)%以下/,
		captureNames: ["value"],
	},
	{
		term: "dot_permanent_max_hp",
		regex: /处于【(.+?)】下[，,]每秒受到(\w+)%最大气血值的伤害/,
		captureNames: ["parent", "value"],
	},
	{
		term: "per_debuff_damage_upgrade",
		regex: /【(.+?)】.*?伤害.*?上限(?:提升至|增加至)(\w+)%/,
		captureNames: ["parent", "value"],
	},
	{
		term: "counter_debuff_upgrade",
		regex: /【(.+?)】状态下.*?概率提升至(\d+)%/,
		captureNames: ["parent", "value"],
	},
	{
		term: "cross_slot_debuff",
		regex:
			/受到攻击时[，,].*?附加【(.+?)】[：:].*?(?:最终伤害减免)?(?:减低|降低)(\w+)%[，,]持续(\w+)秒/,
		captureNames: ["name", "value", "duration"],
	},
	{
		term: "dot_per_n_stacks",
		regex:
			/每获得.*?([\d一二两三四五])个【(.+?)】.*?附加.*?持续(\w+)秒的【(.+?)】.*?每秒造成(?:目标)?(\w+)%已损(?:失)?气血值(?:的)?伤害/,
		captureNames: ["n", "parent", "duration", "name", "value"],
	},
	{
		term: "debuff_strength",
		regex: /减益.*?效果强度提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "damage_reduction_during_cast",
		regex: /施放期间提升自身(\w+)%(?:的)?伤害减免/,
		captureNames: ["value"],
	},
	{
		term: "execute_conditional",
		regex:
			/敌方气血值低于(\d+)%.*?伤害提升(\w+)%.*?(?:暴击率提升(\w+)%|必定暴击)/,
		captureNames: ["threshold", "value", "crit_rate"],
	},
	{
		term: "execute_conditional",
		regex: /敌方气血值低于(\d+)%.*?伤害提升(\w+)%/,
		captureNames: ["threshold", "value"],
	},
	{
		term: "random_buff",
		regex: /任意1个加成[：:].*?攻击提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "random_debuff",
		regex:
			/任意1个.*?减益.*?效果[：:].*?攻击降低(\w+)%.*?暴击率降低(\w+)%.*?暴击伤害降低(\w+)%/,
		captureNames: ["attack", "crit_rate", "crit_damage"],
	},
	{
		term: "guaranteed_resonance",
		regex: /必定.*?会心.*?造成(\w+)倍伤害.*?(\w+)%概率.*?提升至(\w+)倍/,
		captureNames: ["base_multiplier", "chance", "upgraded_multiplier"],
	},
	{
		term: "triple_bonus",
		regex: /提升(\w+)%攻击力的效果.*?(\w+)%的伤害.*?(\w+)%的暴击伤害/,
		captureNames: ["atk", "dmg", "crit"],
	},
	{
		term: "attack_bonus_affix",
		regex: /提升(\w+)%攻击力的效果/,
		captureNames: ["value"],
	},
	{
		term: "probability_to_certain",
		regex: /概率触发.*?效果提升为必定触发/,
		captureNames: [],
	},
	{
		term: "min_lost_hp_threshold",
		regex: /已损(?:气血值)?.*?至少按已损(\w+)%计算.*?伤害提升(\w+)%/,
		captureNames: ["min_percent", "damage_increase"],
	},
	{
		term: "conditional_hp_scaling",
		regex:
			/(?:当前)?气血高于(\w+)%时.*?每(?:额外)?高出(\w+)%.*?获得(\w+)%伤害加成/,
		captureNames: ["threshold", "per_step", "value"],
	},
	{
		term: "hp_cost_avoid_chance",
		regex: /(\w+)%(?:的)?概率不消耗气血值/,
		captureNames: ["value"],
	},
	{
		term: "shield_on_heal",
		regex:
			/恢复气血时.*?添加.*?(\w+)%(?:自身)?最大气血值的护盾[，,]持续(\w+)秒/,
		captureNames: ["value", "duration"],
	},
	{
		term: "healing_increase",
		regex: /治疗效果提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "healing_to_damage",
		regex: /造成治疗效果时.*?额外造成治疗量(\w+)%的伤害/,
		captureNames: ["value"],
	},
	{
		term: "damage_to_shield",
		regex: /造成伤害后.*?获得.*?伤害值的(\w+)%(?:的)?护盾.*?持续(\d+)秒/,
		captureNames: ["value", "duration"],
	},
	{
		term: "shield_value_increase",
		regex: /护盾值提升(\w+)%/,
		captureNames: ["value"],
	},
	{
		term: "no_shield_fallback",
		regex: /(?:无护盾.*?计算湮灭|无护盾.*?则计算.*?)(\d+)个/,
		captureNames: ["count"],
	},
	{
		term: "stun_on_dispel",
		regex: /眩晕(\w+)秒/,
		captureNames: ["duration"],
	},
	{
		term: "no_buff_double",
		regex: /(?:无.*?状态.*?双倍|若无驱散.*?双倍)/,
		captureNames: [],
	},
	{
		term: "dot_half_bonus",
		regex: /持续伤害效果受一半伤害加成/,
		captureNames: [],
	},
	{
		term: "pre_cast_timing",
		regex: /释放前/,
		captureNames: [],
	},
	{
		term: "conditional_self_hp",
		regex: /(?:自身|敌方).*?(?:每|低于|高于).*?伤害.*?(\w+)%/,
		captureNames: ["value"],
	},
];

// ── Boundary Splitting ───────────────────────────────────
//
// Split text at 【name】：boundaries before scanning.
// Each segment knows its state scope. Tokens inherit scope
// from the segment they were scanned in.

const STATE_DEF_RE = /【([^【】]+)】(?:状态)?[：:]/g;

/**
 * Split text at 【name】：structural boundaries.
 * Text before the first 【name】：is "main" (no scope).
 * Text after each 【name】：is scoped to that state until
 * the next 【name】：or end of text.
 */
function splitAtBoundaries(text: string): Segment[] {
	const segments: Segment[] = [];
	const matches: { name: string; index: number; fullMatch: string }[] = [];

	let m: RegExpExecArray | null = STATE_DEF_RE.exec(text);
	while (m !== null) {
		matches.push({ name: m[1], index: m.index, fullMatch: m[0] });
		m = STATE_DEF_RE.exec(text);
	}

	if (matches.length === 0) {
		// No state boundaries — entire text is one segment
		return [{ text, offset: 0 }];
	}

	// Text before the first 【name】：
	if (matches[0].index > 0) {
		segments.push({
			text: text.slice(0, matches[0].index),
			offset: 0,
		});
	}

	for (let i = 0; i < matches.length; i++) {
		const boundary = matches[i];
		const contentStart = boundary.index + boundary.fullMatch.length;
		const contentEnd =
			i + 1 < matches.length ? matches[i + 1].index : text.length;

		// Capture text before this boundary for target detection
		const prevEnd =
			i > 0 ? matches[i - 1].index + matches[i - 1].fullMatch.length : 0;
		const preText = text.slice(prevEnd, boundary.index);

		segments.push({
			text: text.slice(contentStart, contentEnd),
			stateName: boundary.name,
			offset: contentStart,
			preText,
		});
	}

	return segments;
}

// ── Scan Algorithm ───────────────────────────────────────
//
// Two-phase: split at boundaries, then scan each segment.
// Longest-match-first within each segment.

/** Sort patterns by regex source length descending (longest first). */
const SORTED_PATTERNS = [...READER_PATTERNS].sort(
	(a, b) => b.regex.source.length - a.regex.source.length,
);

/** Result of scan(): tokens + state info from boundaries. */
export interface ScanResult {
	tokens: TokenEvent[];
	/** State info from boundary splitting (name + target from preText) */
	stateInfos: StateInfo[];
}

const OPPONENT_RE =
	/对其施加|对敌方施加|对敌方添加|对攻击方添加|为目标添加|对目标添加|对目标施加/;

/**
 * Scan text and return tokens only (convenience wrapper).
 * Use scanWithStates() to also get state info from boundaries.
 */
export function scan(text: string): TokenEvent[] {
	return scanWithStates(text).tokens;
}

/**
 * Scan text: split at 【name】：boundaries, then match patterns
 * within each segment. Tokens inherit scope from their segment.
 * Also returns state info (name + target) from boundary context.
 */
export function scanWithStates(text: string): ScanResult {
	// Strip backticks — source markdown uses them for emphasis
	const cleanText = text.replace(/`/g, "");
	const segments = splitAtBoundaries(cleanText);
	const tokens: TokenEvent[] = [];
	const stateInfos: StateInfo[] = [];

	for (const segment of segments) {
		const segTokens = scanSegment(segment.text);
		for (const token of segTokens) {
			token.position += segment.offset;
			if (segment.stateName) {
				token.scope = segment.stateName;
			}
			tokens.push(token);
		}

		// Extract state info from boundary context
		if (segment.stateName && segment.preText !== undefined) {
			const target = OPPONENT_RE.test(segment.preText) ? "opponent" : "self";
			stateInfos.push({
				name: segment.stateName,
				target,
				preText: segment.preText,
			});
		}
	}

	tokens.sort((a, b) => a.position - b.position);
	return { tokens, stateInfos };
}

/** Scan a single segment for pattern matches. */
function scanSegment(text: string): TokenEvent[] {
	const tokens: TokenEvent[] = [];
	const consumed = new Set<number>();

	for (const pattern of SORTED_PATTERNS) {
		const re = new RegExp(pattern.regex.source, "g");
		let match: RegExpExecArray | null = re.exec(text);
		while (match !== null) {
			const start = match.index;
			const end = start + match[0].length;

			// Skip if any character in this range is already consumed
			let overlap = false;
			for (let i = start; i < end; i++) {
				if (consumed.has(i)) {
					overlap = true;
					break;
				}
			}

			if (!overlap) {
				// Mark range as consumed
				for (let i = start; i < end; i++) {
					consumed.add(i);
				}

				// Build captures from positional groups
				const captures: Record<string, string> = {};
				for (let i = 0; i < pattern.captureNames.length; i++) {
					if (match[i + 1] !== undefined) {
						captures[pattern.captureNames[i]] = match[i + 1];
					}
				}

				tokens.push({
					term: pattern.term,
					raw: match[0],
					captures,
					position: start,
				});
			}

			match = re.exec(text);
		}
	}

	tokens.sort((a, b) => a.position - b.position);
	return tokens;
}
