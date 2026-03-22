#!/usr/bin/env bun
/**
 * Experiment 2: Parse a full book skill description
 *
 * 九重天凤诀: "化身星猿，对目标造成八段共x%攻击力的灵法伤害，
 *   同时每段攻击额外对目标造成自身y%已损失气血值的伤害，
 *   每段攻击会消耗自身z%当前气血值
 *   并为自身添加1层【蛮神】：
 *   持续期间提升自身w%的攻击力与暴击率，持续4秒"
 */

import * as ohm from "ohm-js";

const grammar = ohm.grammar(`
  GameText {
    // A skill description is a series of clauses separated by ，
    Description = Preamble? EffectClause (clauseSep EffectClause)*
    clauseSep = "，" | "并" | "；"

    // Preamble: flavor text before first effect (e.g., "化身星猿")
    Preamble = (~EffectStart any)+

    // An effect clause is one of several recognized patterns
    EffectClause = BaseAttack         -- baseAttack
                 | PerHitDamage       -- perHitDamage
                 | PerHitCost         -- perHitCost
                 | StateCreation      -- stateCreation
                 | StateDef           -- stateDef
                 | Duration           -- duration
                 | UnknownClause      -- unknown

    Duration = duration

    // Base attack: 对目标造成X段共Y%攻击力的灵法伤害
    BaseAttack = prefix? "造成" HitCount? totalPrefix? VarRef "%" "攻击力的" "灵法"? "伤害"

    // Per-hit damage: 每段攻击额外对目标造成自身Y%已损失气血值的伤害
    PerHitDamage = "同时"? "每段攻击" "额外"? "对" target "造成" "自身"? VarRef "%" "已损" "失"? "气血值的伤害"

    // Per-hit cost: 每段攻击会消耗自身Z%当前气血值
    PerHitCost = "每段攻击" "会"? "消耗" "自身"? VarRef "%" "的"? "当前气血值"

    // State creation: 并为自身添加1层【name】
    StateCreation = "并"? "为"? target? actionVerb number "层" StateName

    // State definition (after 【name】：)
    StateDef = "持续期间"? StatModList duration?

    // Stat modifier list
    StatModList = StatMod ("与" StatModOrType)*
    StatModOrType = StatMod     -- full
                  | StatType    -- shortRef
    StatMod = "提升" "自身"? VarRef "%" "的"? StatType

    StatType = "攻击力" | "暴击率" | "伤害减免" | "暴击伤害" | "治疗加成" | "守御"

    // Duration clause
    duration = "持续" number "秒"

    // Common pieces
    HitCount = CnNumber "段"
    CnNumber = "一" | "二" | "三" | "四" | "五" | "六" | "七" | "八" | "九" | "十"

    VarRef = letter+    -- var
           | number     -- literal

    StateName = "【" (~"】" any)+ "】"

    prefix = "对" target
    target = "目标" | "自身" | "敌方" | "攻击方"
    totalPrefix = "共" "计"?
    actionVerb = "添加" | "获得" | "施加" | "进入"
    number = digit+

    // Effect start markers — used by Preamble to know when to stop
    EffectStart = "造成" | "消耗" | "每段" | "同时" | "并" | "为自身" | "持续期间"

    // Unknown clause — any text that doesn't match known patterns
    UnknownClause = (~"，" any)+
  }
`);

const semantics = grammar.createSemantics().addOperation("extract", {
	Description(preamble, first, _seps, rest) {
		const effects = [first.extract(), ...rest.children.map((c: any) => c.extract())];
		return {
			preamble: preamble.children.length > 0 ? preamble.children[0].sourceString.trim() : null,
			effects: effects.filter((e: any) => e.type !== "unknown"),
			unknown: effects.filter((e: any) => e.type === "unknown"),
		};
	},
	EffectClause_baseAttack(ba) { return ba.extract(); },
	EffectClause_perHitDamage(phd) { return phd.extract(); },
	EffectClause_perHitCost(phc) { return phc.extract(); },
	EffectClause_stateCreation(sc) { return sc.extract(); },
	EffectClause_stateDef(sd) { return sd.extract(); },
	EffectClause_duration(d) { return d.extract(); },
	EffectClause_unknown(u) { return u.extract(); },
	Duration(d) { return { type: "duration", value: d.extract() }; },

	BaseAttack(_prefix, _zc, hitCount, _tp, varRef, _pct, _atk, _lf, _dmg) {
		return {
			type: "base_attack",
			hits: hitCount.children.length > 0 ? hitCount.children[0].extract() : 1,
			total: varRef.extract(),
		};
	},
	PerHitDamage(_ts, _mda, _ew, _dui, _tgt, _zc, _zs, varRef, _pct, _ys, _shi, _qx) {
		return {
			type: "self_lost_hp_damage",
			value: varRef.extract(),
			per_hit: true,
		};
	},
	PerHitCost(_mda, _hui, _xh, _zs, varRef, _pct, _de, _dq) {
		return {
			type: "self_hp_cost",
			value: varRef.extract(),
			per_hit: true,
		};
	},
	StateCreation(_bing, _wei, _tgt, _verb, count, _ceng, stateName) {
		return {
			type: "state_ref",
			count: Number(count.sourceString),
			state: stateName.extract(),
		};
	},
	StateDef(_cxqj, statModList, dur) {
		const result: any = {
			type: "self_buff",
			stats: statModList.extract(),
		};
		if (dur.children.length > 0) {
			result.duration = dur.children[0].extract();
		}
		return result;
	},
	StatModList(first, _conj, rest) {
		return [first.extract(), ...rest.children.map((c: any) => c.extract())];
	},
	StatModOrType_full(statMod) { return statMod.extract(); },
	StatModOrType_shortRef(statType) {
		return { stat: statType.sourceString, value: "inherit" };
	},
	StatMod(_ts, _zs, varRef, _pct, _de, statType) {
		return { stat: statType.sourceString, value: varRef.extract() };
	},
	duration(_chi, num, _miao) {
		return Number(num.sourceString);
	},
	HitCount(cn, _duan) { return cn.extract(); },
	CnNumber(c) {
		const map: Record<string, number> = {
			一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
			六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
		};
		return map[c.sourceString] ?? 1;
	},
	VarRef_var(l) { return l.sourceString; },
	VarRef_literal(n) { return Number(n.sourceString); },
	StateName(_open, chars, _close) { return chars.sourceString; },
	UnknownClause(chars) { return { type: "unknown", text: chars.sourceString }; },
	number(d) { return Number(d.sourceString); },
});

// Test with 九重天凤诀
// Note: we need to split at 【name】：boundaries first (same as reader.ts does)
// The part before 【蛮神】：is the skill, the part after is the state definition.

const skillText = "化身星猿，对目标造成八段共x%攻击力的灵法伤害，同时每段攻击额外对目标造成自身y%已损失气血值的伤害，每段攻击会消耗自身z%当前气血值并为自身添加1层【蛮神】";
const stateDefText = "持续期间提升自身w%的攻击力与暴击率，持续4秒";

console.log("=== 九重天凤诀 (skill part) ===\n");
const m1 = grammar.match(skillText);
if (m1.succeeded()) {
	const result = semantics(m1).extract();
	console.log("✓ Parsed successfully");
	console.log(JSON.stringify(result, null, 2));
} else {
	console.log("✗ Parse failed");
	console.log(m1.shortMessage);
}

console.log("\n=== 九重天凤诀 (state def part) ===\n");
const m2 = grammar.match(stateDefText);
if (m2.succeeded()) {
	const result = semantics(m2).extract();
	console.log("✓ Parsed successfully");
	console.log(JSON.stringify(result, null, 2));
} else {
	console.log("✗ Parse failed");
	console.log(m2.shortMessage);
}
