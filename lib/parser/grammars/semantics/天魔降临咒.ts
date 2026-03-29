import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	ConditionalDamageDebuff,
	Debuff,
	DotPermanentMaxHp,
	Effect,
	ExclusiveAffixEffect,
	PerDebuffDamageUpgrade,
	PerDebuffStackDamage,
	PrimaryAffixEffect,
	SelfBuff,
	SkillEffect,
	StateAdd,
} from "../../schema/天魔降临咒.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
			skillDescription(
				_pre,
				baseAttack,
				_sep,
				stateAdd,
				_colon,
				stateBody,
				_ws,
				_stateName2,
				_permanent,
				_comma,
				_sp,
				_zddj,
				maxStacksVar,
				_ceng,
			) {
				const sa = stateAdd.toEffects() as any[];
				// Attach permanent + max_stacks to the state_add effect
				for (const e of sa) {
					if (e.type === "state_add") {
						e.permanent = true;
						e.max_stacks = maxStacksVar.extractVar;
					}
				}
				return [
					...baseAttack.toEffects(),
					...sa,
					...stateBody.toEffects(),
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
			stateAdd(_verb, stateName) {
				const effect: StateAdd = {
					type: "state_add",
					state: stateName.extractVar,
				};
				return [effect];
			},
			stateBody(dmgRed, _s1, dmgInc, _s2, perDebuff) {
				return [
					...dmgRed.toEffects(),
					...dmgInc.toEffects(),
					...perDebuff.toEffects(),
				];
			},
			inlineDmgReduction(_shi, _letter, _verb, varRef, _p) {
				const effect: SelfBuff = {
					type: "self_buff",
					name: "结魂锁链",
					damage_reduction: varRef.extractVar,
				};
				return [effect];
			},
			inlineDmgIncrease(_df, varRef, _p) {
				const effect: Debuff = {
					type: "debuff",
					name: "结魂锁链",
					target: "damage_taken",
					value: varRef.extractVar,
				};
				return [effect];
			},
			inlinePerDebuff(
				_prefix,
				_gap,
				_sh,
				varRef,
				_p,
				_sep,
				_sp,
				_zdtsz,
				maxVar,
				_p2,
			) {
				const effect: PerDebuffStackDamage = {
					type: "per_debuff_stack_damage",
					per_n_stacks: 1,
					value: varRef.extractVar,
					max: maxVar.extractVar,
					parent: "结魂锁链",
				};
				return [effect];
			},
			primaryAffix(
				_dfcy,
				state1,
				_xia,
				_sep1,
				_mmsd,
				varRef1,
				_p1,
				_zdqxzdsh,
				_sep2,
				_bq,
				state2,
				_tsdf,
				varRef2,
				_p2,
			) {
				const dot: DotPermanentMaxHp = {
					type: "dot_permanent_max_hp",
					state: state1.extractVar,
					value: varRef1.extractVar,
				};
				const upgrade: PerDebuffDamageUpgrade = {
					type: "per_debuff_damage_upgrade",
					state: state2.extractVar,
					value: varRef2.extractVar,
				};
				return [dot, upgrade];
			},
			exclusiveAffix(_pre, _sep, _hsbcshts, varRef, _p) {
				const effect: ConditionalDamageDebuff = {
					type: "conditional_damage_debuff",
					value: varRef.extractVar,
				};
				return [effect];
			},
			preamble(_) {
				return [];
			},
			cnHitCount(_cn, _d) {
				return [];
			},
			ws(_) {
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
