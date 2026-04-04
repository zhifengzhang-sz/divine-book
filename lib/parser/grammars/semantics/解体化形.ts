import type * as ohm from "ohm-js";

import type {
	AttackBuff,
	BaseAttack,
	Effect,
	ExclusiveAffixEffect,
	PerDebuffStackDamage,
	PrimaryAffixEffect,
	ProbabilityMultiplier,
	SkillEffect,
} from "../../schema/解体化形.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
			skillDescription(_pre, baseAttack, _sep, perDebuff) {
				return [...baseAttack.toEffects(), ...perDebuff.toEffects()];
			},
			baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
				const effect: BaseAttack = {
					type: "base_attack",
					hits: parseCn(cnHit.sourceString.replace("段", "")),
					total: varRef.extractVar,
				};
				return [effect];
			},
			perDebuffStackDmg(
				_mbdq,
				_sep1,
				_bcstshts,
				varRef,
				_p,
				_sep2,
				_zdjs,
				maxVar,
				_gjyzt,
			) {
				const effect: PerDebuffStackDamage = {
					type: "per_debuff_stack_damage",
					value: varRef.extractVar,
					max: maxVar.extractVar,
				};
				return [effect];
			},
			primaryAffix(
				_jnsfq,
				_sep1,
				_mcts,
				varRef,
				_p,
				_dgkl,
				_sep2,
				_zd,
				_jsOrJs,
				maxVar,
				_c,
			) {
				const effect: AttackBuff = {
					type: "attack_buff",
					value: varRef.extractVar,
					max_stacks: maxVar.extractVar,
					per_debuff_stack: true,
					timing: "pre_cast",
				};
				return [effect];
			},
			exclusiveAffix(
				_bstsfshi,
				_sep,
				_hsbcst,
				varRef1,
				_p1,
				_glts4bei,
				_sep2,
				varRef2,
				_p2,
				_glts3bei,
				_sep3,
				varRef3,
				_p3,
				_glts2bei,
			) {
				const effect: ProbabilityMultiplier = {
					type: "probability_multiplier",
					chance_4x: varRef1.extractVar,
					chance_3x: varRef2.extractVar,
					chance_2x: varRef3.extractVar,
				};
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
		},
	);
}
