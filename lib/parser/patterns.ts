/**
 * Pattern map: extractor name → primary regex used for matching.
 *
 * Used by the pipeline to find the actual Chinese text that
 * triggered each extractor, so the visualizer can show it.
 *
 * These patterns are display-only approximations of the real
 * extractor regexes in lib/parser/extract.ts. They don't need
 * to be perfect — just good enough to highlight the matched
 * source text for debugging.
 */

// ── Skill extractor patterns ─────────────────────────────

const SKILL_PATTERNS: Record<string, RegExp> = {
	self_hp_cost: /消耗(?:自身)?\w+%(?:的)?当前气血值/,
	untargetable: /\d+秒内不可被选中/,
	base_attack:
		/造成(?:(?:一|二|三|四|五|六|七|八|九|十)+段)?(?:共(?:计)?)?\w+%攻击力的(?:灵法)?伤害/,
	percent_max_hp_damage:
		/(?:每段(?:攻击|伤害))?(?:造成|附加)(?:目标)?\w+%(?:自身)?最大气血值的伤害/,
	self_lost_hp_damage:
		/(?:额外)?对(?:其|目标)?造成自身\w+%已损(?:失)?气血值的伤害/,
	self_lost_hp_damage_per_hit:
		/每段攻击(?:额外)?对目标造成自身\w+%已损(?:失)?气血值的伤害/,
	self_hp_cost_per_hit: /每段攻击(?:会)?消耗自身\w+%(?:的)?当前气血值/,
	shield: /(?:添加|获得)(?:自身)?\w+%最大气血值的护盾[，,](?:护盾)?持续\w+秒/,
	debuff: /降低\w+%(?:的)?最终伤害减免[，,]持续\w+秒/,
	shield_destroy_damage:
		/湮灭敌方\w+个护盾[，,](?:并)?(?:额外)?造成\w+%敌方最大气血值的伤害/,
	no_shield_double_damage: /对无盾目标造成双倍伤害/,
	percent_current_hp_damage: /额外附加\w+%(?:目标)?当前气血值的伤害/,
	summon: /持续(?:存在)?\w+秒的分身[，,]继承自身\w+%的属性/,
	crit_damage_bonus: /(?:使本神通)?暴击伤害提[升高]\w+%/,
	self_damage_taken_increase:
		/(?:释放后)?(?:自身)?\d+秒内受到(?:的)?伤害(?:提[升高])\w+%/,
	periodic_escalation: /每造成\d+次伤害时[，,].*?伤害提升\w+倍/,
	buff_steal: /偷取目标\w+个增益状态/,
	per_debuff_stack_damage:
		/每(?:具有)?(?:一个)?减益状态(?:效果)?[，,].*?伤害(?:提升|增加)\w+%/,
	echo_damage: /(?:每次)?受到(?:的)?伤害时[，,].*?额外受到.*?伤害/,
	counter_debuff: /受到(?:伤害|攻击)时[，,]各有\d+%概率对攻击方添加/,
	counter_buff:
		/(?:受到(?:伤害|攻击)时[，,].*?(?:恢复|反射).*?\w+%|反射.*?自身所?受到伤害值的\w+%)/,
	self_hp_cost_dot: /自身每秒损失\w+%(?:的)?当前气血值/,
	self_lost_hp_damage_dot: /每秒对目标造成(?:自身)?\w+%已损(?:失)?气血值/,
	self_heal: /(?:为自身)?恢复(?:共)?\w+%(?:的)?(?:最大)?气血值/,
	per_tick_heal: /每秒恢复(?:自身)?(?:和友方)?\w+%(?:的)?(?:最大)?气血值/,
	heal_echo_damage: /附加(?:临摹)?期间(?:所)?恢复气血值的等额伤害/,
	self_cleanse: /驱散自身\w+个负面状态/,
	delayed_burst: /【.+?】[，,]持续\d+秒/,
	conditional_damage_cleanse: /若净化.*?每段攻击附加\w+%自身最大气血值的伤害/,
	skill_cooldown_debuff: /下一个未释放的神通进入\d+秒冷却/,
	self_buff: /(?:获得|添加|进入).*?【.+?】(?:状态)?[：:，,]/,
	self_buff_skill_damage_increase:
		/(?:并)?提升自身\w+%(?:的)?神通伤害加深[，,]持续\w+秒/,
	next_skill_carry: /接下来(?:神通的)?\d+段攻击[，,]每段攻击附加/,
	per_enemy_lost_hp:
		/敌方(?:(?:当前)?气血值)?每(?:多)?损失\w+%(?:最大(?:值)?气血值)?.*?伤害(?:提升|增加)\w+%/,
};

// ── Affix extractor patterns ─────────────────────────────

const AFFIX_PATTERNS: Record<string, RegExp> = {
	ignore_damage_reduction: /无视敌方所有伤害减免效果/,
	per_self_lost_hp: /每多损失1%最大气血值.*?伤害提升\w+%/,
	per_debuff_stack_true_damage:
		/每有1层.*?减益.*?状态.*?造成(?:目标)?\w+%最大气血值.*?真实伤害/,
	dot_extra_per_tick: /持续伤害触发时.*?额外造成(?:目标)?\w+%已损(?:失)?气血/,
	dot_damage_increase: /持续伤害(?:上升|提升)\w+%/,
	dot_frequency_increase: /持续伤害.*?触发间隙缩短\w+%/,
	conditional_damage_affix:
		/(?:(?:敌方)?处于.*?控制(?:状态|效果).*?伤害提升\w+%|攻击带有.*?`?(?:减益|增益)`?.*?状态.*?伤害提升\w+%)/,
	damage_increase: /(?:(?:神通)?(?:造成的)?伤害提升|提升\w+%(?:的)?伤害)\w*%?/,
	self_damage_taken_during_cast: /施放期间自身受到的伤害.*?提升\w+%/,
	all_state_duration: /所有状态.*?持续时间延长\w+%/,
	buff_duration: /增益.*?(?:状态)?持续时间延长\w+%/,
	buff_strength: /增益.*?效果强度提升\w+%/,
	buff_stack_increase: /增益.*?状态层数增加\w+%/,
	debuff_stack_increase: /减益.*?状态层数增加\w+%/,
	next_skill_buff: /下一个施放的神通(?:释放时)?额外获得\w+%.*?神通伤害加深/,
	skill_damage_increase: /提升\w+%.*?神通伤害/,
	enemy_skill_damage_reduction: /目标对本神通提升\w+%.*?神通伤害减免/,
	on_shield_expire: /护盾.*?消失时.*?造成护盾值\w+%的伤害/,
	on_buff_debuff_shield_trigger:
		/每次施加.*?(?:增益|减益).*?(?:护盾).*?造成.*?\w+%.*?灵法伤害/,
	probability_multiplier: /\w+%概率提升4倍/,
	enlightenment_bonus: /悟境等级加\d+/,
	debuff_stack_chance: /有\w+%概率额外多附加1层/,
	heal_reduction_debuff: /治疗量降低\w+%/,
	atk_dot: /每秒受到\w+%攻击力的伤害/,
	on_dispel: /若被驱散.*?受到\w+%攻击力的伤害/,
	periodic_dispel_with_damage: /每秒.*?驱散.*?\d+个.*?增益/,
	per_buff_stack_damage: /每\d+层增益状态.*?提升\w+%伤害/,
	per_debuff_stack_damage_affix: /每(?:有)?\d+层减益状态.*?伤害提升\w+%/,
	per_hit_escalation:
		/(?:每段攻击.*?下一段提升\w+%神通加成|每造成\d+段伤害.*?剩余段数伤害提升\w+%)/,
	lifesteal_with_parent: /恢复【.+?】造成(?:的)?伤害\w+%(?:的)?气血值/,
	lifesteal:
		/(?:恢复.*?(?:造成(?:的)?)?(?:伤害|本次伤害)\w+%(?:的)?气血值|获得\w+%(?:的)?吸血效果)/,
	shield_strength: /护盾提升至(?:自身)?\w+%最大气血值/,
	self_buff_extra: /【.+?】(?:状态)?(?:额外|下)?(?:使自身获得|提升(?:自身)?)/,
	summon_buff: /分身受到(?:的)?伤害降低至(?:自身的)?\w+%/,
	extended_dot: /额外持续(?:存在)?\w+秒[，,]每\w+(?:\.\w+)?秒造成一次伤害/,
	shield_destroy_dot: /【.+?】每\w+(?:\.\w+)?秒对目标造成.*?湮灭护盾/,
	per_stolen_buff_debuff: /每偷取.*?增益状态.*?附加.*?层【.+?】/,
	attack_bonus_per_debuff: /减益状态.*?(?:最高)?层数.*?攻击力.*?每层.*?\w+%/,
	percent_max_hp_damage_affix:
		/叠加.*?层.*?造成(?:目标)?\w+%最大气血值(?:的)?伤害/,
	self_buff_extend: /延长\w+秒【.+?】持续时间/,
	periodic_cleanse: /(?:每秒有)?\w+%概率驱散自身/,
	delayed_burst_increase: /【.+?】状态结束时的伤害提升\d+%/,
	self_lost_hp_damage_every_n:
		/每造成\d+次伤害[，,]额外.*?\w+%自身已损(?:失)?气血值/,
	periodic_dispel_affix:
		/(?:造成伤害前)?(?:优先)?驱散目标[\w一二两三四五六七八九十]+个增益/,
	self_hp_floor: /气血不会降至\w+%以下/,
	dot_permanent_max_hp: /处于【.+?】下[，,]每秒受到\w+%最大气血值的伤害/,
	per_debuff_stack_damage_upgrade: /【.+?】.*?伤害.*?上限(?:提升至|增加至)\w+%/,
	counter_debuff_upgrade: /【.+?】状态下.*?概率提升至\d+%/,
	cross_slot_debuff: /受到攻击时[，,].*?附加【.+?】/,
	dot_per_n_stacks: /每获得.*?个【.+?】.*?附加.*?持续\w+秒的【.+?】/,
	debuff_strength: /减益.*?效果强度提升\w+%/,
	damage_reduction_during_cast: /施放期间提升自身\w+%(?:的)?伤害减免/,
	execute_conditional: /敌方气血值低于\d+%.*?伤害提升\w+%/,
	attack_bonus_affix: /提升\w+%攻击力的效果/,
	shield_value_increase: /护盾值提升\w+%/,
	flat_extra_damage: /额外造成\w+%攻击力的伤害/,
	healing_increase: /治疗效果提升\w+%/,
	final_damage_bonus: /最终伤害加深.*?提升\w+%/,
	healing_to_damage: /造成治疗效果时.*?额外造成治疗量\w+%的伤害/,
	damage_to_shield: /造成伤害后.*?获得.*?伤害值的\w+%(?:的)?护盾/,
	hp_cost_avoid_chance: /\w+%概率不消耗气血/,
	shield_on_heal: /恢复气血.*?获得.*?护盾/,
	conditional_damage:
		/(?:(?:自身|敌方).*?(?:每|低于|高于).*?伤害.*?\w+%|攻击带有.*?`?(?:减益|增益)`?.*?状态.*?伤害提升\w+%)/,
	// Missing affix patterns
	random_buff: /任意1个加成[：:].*?攻击提升\w+%/,
	random_debuff: /任意1个.*?减益.*?效果[：:].*?攻击降低\w+%.*?暴击率降低\w+%/,
	guaranteed_resonance: /必定.*?会心.*?造成\w+倍伤害/,
	triple_bonus: /提升\w+%攻击力的效果.*?\w+%的伤害.*?\w+%的暴击伤害/,
	attack_bonus: /提升\w+%攻击力的效果/,
	probability_to_certain: /概率触发.*?效果提升为必定触发/,
	min_lost_hp_threshold: /已损(?:气血值)?.*?至少按已损\w+%计算/,
	per_enemy_lost_hp:
		/敌方(?:(?:当前)?气血值)?每(?:多)?损失\w+%(?:最大(?:值)?气血值)?.*?伤害(?:提升|增加)\w+%/,
};

// ── Public API ───────────────────────────────────────────

/** All known pattern keys — used by tests to verify sync with extractors. */
export const SKILL_PATTERN_KEYS = new Set(Object.keys(SKILL_PATTERNS));
export const AFFIX_PATTERN_KEYS = new Set(Object.keys(AFFIX_PATTERNS));

/**
 * Find the matched substring in `text` for a given extractor name.
 * Returns the matched text or null if not found.
 */
export function findMatchedText(
	extractorName: string,
	text: string,
	isAffix: boolean,
): string | null {
	const patterns = isAffix ? AFFIX_PATTERNS : SKILL_PATTERNS;
	const pattern = patterns[extractorName];
	if (!pattern) {
		// Try the other map as fallback
		const fallback = isAffix
			? SKILL_PATTERNS[extractorName]
			: AFFIX_PATTERNS[extractorName];
		if (fallback) {
			const m = text.match(fallback);
			return m ? m[0] : null;
		}
		return null;
	}
	const m = text.match(pattern);
	return m ? m[0] : null;
}
