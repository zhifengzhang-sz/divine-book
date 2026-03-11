/**
 * Domain enumerations — Zone, Unit, Scope.
 *
 * Zone values match FactorsSchema fields in effect.model.ts.
 * Unit values match unit annotations in keyword.map.md.
 */

/** Model parameter zones — which factor an effect type feeds */
export enum Zone {
	D_base = "D_base",
	D_flat = "D_flat",
	M_dmg = "M_dmg",
	M_skill = "M_skill",
	M_final = "M_final",
	S_coeff = "S_coeff",
	D_res = "D_res",
	sigma_R = "sigma_R",
	M_crit = "M_crit",
	M_buff = "M_buff",
	M_state = "M_state",
	M_enlight = "M_enlight",
	M_synchro = "M_synchro",
	D_ortho = "D_ortho",
	H_A = "H_A",
	DR_A = "DR_A",
	S_A = "S_A",
	H_red = "H_red",
}

/** Unit identifiers for numeric fields (from keyword.map.md) */
export enum Unit {
	PctAtk = "%atk",
	PctStat = "%stat",
	PctMaxHp = "%max_hp",
	PctLostHp = "%lost_hp",
	PctCurrentHp = "%current_hp",
	Seconds = "seconds",
	Count = "count",
	Probability = "probability",
	Multiplier = "multiplier",
	Bool = "bool",
	Str = "string",
}

/** Whether an effect operates within the same skill slot or across slots */
export enum Scope {
	Same = "same",
	Cross = "cross",
}

/** Target categories for the provides/requires binding model.
 *  See domain.category.md §Target Categories. */
export enum TargetCategory {
	Damage = "damage", // T1 伤害 — always free (inherent to any skill)
	Debuff = "debuff", // T2 减益效果
	Buff = "buff", // T3 增益效果
	Dot = "dot", // T4 持续伤害
	Shield = "shield", // T5 护盾
	Healing = "healing", // T6 治疗效果
	State = "state", // T7 所有状态 (superset of T2–T6)
	Probability = "probability", // T8 概率触发
	LostHp = "lost_hp", // T9 已损气血
	Control = "control", // T10 控制效果
}

/** When the effect activates */
export enum Trigger {
	/** Fires once when skill is cast */
	OnCast = "on_cast",
	/** Fires per hit of the skill */
	PerHit = "per_hit",
	/** Fires every tick_interval seconds while active */
	PerTick = "per_tick",
	/** Fires when entity is attacked (reactive) */
	OnAttacked = "on_attacked",
	/** Always active while equipped / state exists */
	Permanent = "permanent",
	/** Fires when a specific event occurs (dispel, shield expire, etc.) */
	OnEvent = "on_event",
}

/** Who the effect targets */
export enum ExecTarget {
	Self = "self",
	Opponent = "opponent",
}

/** Which combat attribute is read or written */
export enum Attr {
	/** 气血 — hit points */
	HP = "hp",
	/** 攻击 — attack power */
	ATK = "atk",
	/** 灵力 — spiritual power (shield generation) */
	SP = "sp",
	/** 守御 — defense / damage reduction */
	DEF = "def",
	/** Damage output (multiplicative chain result) */
	Damage = "damage",
	/** Healing rate */
	Healing = "healing",
	/** Shield value */
	Shield = "shield",
	/** Crit rate */
	CritRate = "crit_rate",
	/** Crit damage multiplier */
	CritDamage = "crit_damage",
	/** Active buff/debuff states */
	State = "state",
}

/** School identifiers for school-restricted affixes */
export enum School {
	Sword = "sword", // 剑修
	Spell = "spell", // 法修
	Demon = "demon", // 魔修
	Body = "body", // 体修
}
