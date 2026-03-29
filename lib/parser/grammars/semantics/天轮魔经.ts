import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	BuffSteal,
	DebuffStackIncrease,
	Effect,
	ExclusiveAffixEffect,
	PerDebuffStackDamage,
	PerStolenBuffDebuff,
	PercentMaxHpDamage,
	PrimaryAffixEffect,
	SkillEffect,
} from "../../schema/天轮魔经.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
			skillDescription(_pre, baseAttack, _sep1, buffSteal, _sep2, perStealDmg) {
				return [
					...baseAttack.toEffects(),
					...buffSteal.toEffects(),
					...perStealDmg.toEffects(),
				];
			},
			baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
				const effect: BaseAttack = {
					type: "base_attack",
					hits: parseCn(cnHit.sourceString.replace("段", "")),
					total: varRef.extractVar,
				};
				return [effect];
			},
			buffSteal(_gap, _ttmb, varRef, _gzyzt) {
				const effect: BuffSteal = {
					type: "buff_steal",
					value: varRef.extractVar,
				};
				return [effect];
			},
			perStealDmg(_mtq1g, _sep, _dmbzc, varRef, _p, _zdqxzdsh) {
				const effect: PercentMaxHpDamage = {
					type: "percent_max_hp_damage",
					value: varRef.extractVar,
					trigger: "per_steal",
				};
				return [effect];
			},
			primaryAffix(
				_mtq,
				stateName,
				_zt,
				_colon,
				_gkljd,
				varRef,
				_p,
				_sep,
				_cx,
				durVar,
				_m,
			) {
				const effect: PerStolenBuffDebuff = {
					type: "per_stolen_buff_debuff",
					state: stateName.extractVar,
					value: varRef.extractVar,
					duration: durVar.extractVar,
				};
				return [effect];
			},
			exclusiveAffix(
				_sbst,
				varRef1,
				_p1,
				_sep1,
				_dfmy,
				varRef2,
				_cjyzt,
				varRef3,
				_p3,
				_sep3,
				_zdts,
				varRef4,
				_p4,
				_dotHalf,
			) {
				const stackInc: DebuffStackIncrease = {
					type: "debuff_stack_increase",
					value: varRef1.extractVar,
				};
				const perStack: PerDebuffStackDamage = {
					type: "per_debuff_stack_damage",
					value: varRef3.extractVar,
					max: varRef4.extractVar,
					per_stack: varRef2.extractVar,
					dot_half_bonus: true,
				};
				return [stackInc, perStack];
			},
			dotHalfBonus(_lit) {
				return [];
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
		},
	);
}
