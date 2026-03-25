import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	Debuff,
	Effect,
	ExclusiveAffixEffect,
	NextSkillBuff,
	PrimaryAffixEffect,
	SkillEffect,
} from "../../schema/新青元剑诀.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
		skillDescription(_pre, baseAttack, _sep, seqCooldown) {
			return [...baseAttack.toEffects(), ...seqCooldown.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		sequencedCooldown(_ydfst, _sep, skillCooldown) {
			return skillCooldown.toEffects();
		},
		skillCooldown(_sqxyg, varRef, _mlqsj) {
			const effect: Debuff = {
				type: "debuff",
				name: "神通封印",
				target: "next_skill_cooldown",
				value: varRef.extractVar,
				duration: varRef.extractVar,
				sequenced: true,
			};
			return [effect];
		},
		primaryAffix(_sdfst, varRef, _pct, _sep, _cx, durVar, _miao) {
			const effect: Debuff = {
				type: "debuff",
				target: "skill_damage",
				value: varRef.extractVar,
				duration: durVar.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(_pre, _sep, _sqygsfst, varRef, _pct, _dstshjs) {
			const effect: NextSkillBuff = { type: "next_skill_buff", value: varRef.extractVar };
			return [effect];
		},
		preamble(_) {
			return [];
		},
		cnHitCount(_cn, _d) {
			return [];
		},
		_terminal() {
			return [];
		},
		_iter(...children) {
			return children.flatMap((c: ohm.Node) => c.toEffects());
		},
	});
}
