import type * as ohm from "ohm-js";

import type {
	ConditionalDamage,
	CritDmgBonus,
	DamageIncrease,
	Effect,
	ExclusiveAffixEffect,
	IgnoreDamageReduction,
	PrimaryAffixEffect,
	SelfDamageTakenIncrease,
	SkillEffect,
} from "../../schema/通天剑诀.js";
import type { BaseAttack } from "../../schema/千锋聚灵剑.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
		skillDescription(_pre, baseAttack, _sep1, critDmg, _sep2, selfDmgTaken) {
			return [
				...baseAttack.toEffects(),
				...critDmg.toEffects(),
				...selfDmgTaken.toEffects(),
			];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		critDmgBonus(_sbst, varRef, _pct) {
			const effect: CritDmgBonus = { type: "crit_dmg_bonus", value: varRef.extractVar };
			return [effect];
		},
		selfDmgTakenIncrease(_sfhzs, durVar, _mnsdsh, dmgVar, _pct) {
			const effect: SelfDamageTakenIncrease = {
				type: "self_damage_taken_increase",
				duration: durVar.extractVar,
				value: dmgVar.extractVar,
			};
			return [effect];
		},
		primaryAffix(_dfhp, varRef1, _pct1, _sep, _stsh, varRef2, _pct2) {
			const effect: ConditionalDamage = {
				type: "conditional_damage",
				condition: "enemy_hp_loss",
				per_step: varRef1.extractVar,
				value: varRef2.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(_sbst, _sep, _bts, varRef, _pct, _sh) {
			const e1: IgnoreDamageReduction = { type: "ignore_damage_reduction" };
			const e2: DamageIncrease = { type: "damage_increase", value: varRef.extractVar };
			return [e1, e2];
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
