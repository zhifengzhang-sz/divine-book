#!/usr/bin/env bun
/**
 * Experiment: ohm-js for parsing Chinese game text
 *
 * Goal: understand ohm-js capabilities, NOT integrate into the parser yet.
 * Start with simple patterns, gradually add complexity.
 */

import * as ohm from "ohm-js";

// ── Example 1: Simple base_attack ────────────────────────
// "造成五段共计x%攻击力的灵法伤害"

const grammar1 = ohm.grammar(`
  GameText {
    Skill = BaseAttack

    BaseAttack = "造成" HitCount? "共"? "计"? VarRef "%" "攻击力的" DamageType "伤害"

    HitCount = CnNumber "段"
    CnNumber = "一" | "二" | "三" | "四" | "五" | "六" | "七" | "八" | "九" | "十"

    VarRef = letter+    -- var
           | digit+     -- literal

    DamageType = "灵法" | ""
  }
`);

const semantics1 = grammar1.createSemantics().addOperation("extract", {
	Skill(baseAttack) {
		return baseAttack.extract();
	},
	BaseAttack(_zc, hitCount, _gong, _ji, varRef, _pct, _atk, dmgType, _dmg) {
		return {
			type: "base_attack",
			hits: hitCount.children.length > 0 ? hitCount.children[0].extract() : 1,
			total: varRef.extract(),
			damageType: dmgType.sourceString || "physical",
		};
	},
	HitCount(cnNum, _duan) {
		return cnNum.extract();
	},
	CnNumber(char) {
		const map: Record<string, number> = {
			一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
			六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
		};
		return map[char.sourceString] ?? 1;
	},
	VarRef_var(letters) {
		return letters.sourceString;
	},
	VarRef_literal(digits) {
		return Number(digits.sourceString);
	},
	DamageType(s) {
		return s.sourceString;
	},
});

// Test
const tests1 = [
	"造成五段共计x%攻击力的灵法伤害",
	"造成x%攻击力的伤害",
	"造成八段共x%攻击力的灵法伤害",
	"造成1500%攻击力的灵法伤害",
];

console.log("=== Example 1: Base Attack ===\n");
for (const text of tests1) {
	const match = grammar1.match(text);
	if (match.succeeded()) {
		const result = semantics1(match).extract();
		console.log(`✓ "${text}"`);
		console.log(`  → ${JSON.stringify(result)}`);
	} else {
		console.log(`✗ "${text}"`);
		console.log(`  → ${match.shortMessage}`);
	}
}

// ── Example 2: Compound sentence with conjunction ────────
// "受到伤害时，各有30%概率对攻击方添加1层【噬心之咒】与【断魂之咒】，各自最多叠加5层"

const grammar2 = ohm.grammar(`
  GameText {
    Sentence = Clause ("，" Clause)*

    Clause = TriggerClause     -- trigger
           | ChanceAction      -- chanceAction
           | StackQualifier    -- stackQual
           | any+              -- fallback

    TriggerClause = TriggerPhrase "时"
    TriggerPhrase = "受到伤害" | "受到攻击"

    ChanceAction = "各有"? number "%" "概率" TargetAction
    TargetAction = "对" Target ActionList
    Target = "攻击方" | "敌方" | "自身" | "目标"
    ActionList = Action ("与" ActionOrRef)*
    ActionOrRef = Action     -- full
               | StateName   -- shortRef
    Action = ActionVerb number "层" StateName
    ActionVerb = "添加" | "移除" | "施加"
    StateName = "【" (~"】" any)+ "】"

    StackQualifier = "各自"? "最多叠加" number "层"

    number = digit+
  }
`);

const semantics2 = grammar2.createSemantics().addOperation("extract", {
	Sentence(first, _commas, rest) {
		return [first.extract(), ...rest.children.map((c: any) => c.extract())];
	},
	Clause_trigger(tc) { return tc.extract(); },
	Clause_chanceAction(ca) { return ca.extract(); },
	Clause_stackQual(sq) { return sq.extract(); },
	Clause_fallback(chars) { return { type: "unknown", text: chars.sourceString }; },
	TriggerClause(phrase, _shi) {
		return { type: "trigger", trigger: phrase.sourceString };
	},
	ChanceAction(geYou, num, _pct, _gailv, targetAction) {
		const result = targetAction.extract();
		result.distributed = geYou.sourceString === "各有";
		result.chance = Number(num.sourceString);
		return result;
	},
	TargetAction(_dui, target, actionList) {
		const actions = actionList.extract();
		return { type: "action", target: target.sourceString, actions };
	},
	ActionList(first, _conj, rest) {
		return [first.extract(), ...rest.children.map((c: any) => c.extract())];
	},
	ActionOrRef_full(action) { return action.extract(); },
	ActionOrRef_shortRef(stateName) {
		return { verb: "inherit", count: "inherit", state: stateName.extract() };
	},
	Action(verb, count, _ceng, stateName) {
		return {
			verb: verb.sourceString,
			count: Number(count.sourceString),
			state: stateName.extract(),
		};
	},
	StateName(_open, chars, _close) {
		return chars.sourceString;
	},
	StackQualifier(geZi, _zdddj, num, _ceng) {
		return {
			type: "stack_limit",
			perChild: geZi.sourceString === "各自",
			limit: Number(num.sourceString),
		};
	},
	ActionVerb(v) { return v.sourceString; },
	TriggerPhrase(p) { return p.sourceString; },
	Target(t) { return t.sourceString; },
	number(d) { return Number(d.sourceString); },
});

console.log("\n=== Example 2: Compound Sentence ===\n");

const text2 = "受到伤害时，各有30%概率对攻击方添加1层【噬心之咒】与【断魂之咒】，各自最多叠加5层";
const match2 = grammar2.match(text2);
if (match2.succeeded()) {
	const result = semantics2(match2).extract();
	console.log(`✓ "${text2}"`);
	console.log(`  → ${JSON.stringify(result, null, 2)}`);
} else {
	console.log(`✗ "${text2}"`);
	console.log(`  → ${match2.shortMessage}`);
}
