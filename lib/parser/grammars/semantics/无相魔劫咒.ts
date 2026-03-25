import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	Debuff,
	DelayedBurst,
	DelayedBurstIncrease,
	Effect,
	ExclusiveAffixEffect,
	PrimaryAffixEffect,
	SkillEffect,
	StateRef,
} from "../../schema/无相魔劫咒.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
			skillDescription(_pre, baseAttack, _sep, stateApply, delayedBurst) {
				return [
					...baseAttack.toEffects(),
					...stateApply.toEffects(),
					...delayedBurst.toEffects(),
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
			stateApply(_gap, _sfmzt, stateName, _sep, _cx, _durVar, _m, _period) {
				const effect: StateRef = {
					type: "state_ref",
					state: stateName.extractVar,
				};
				return [effect];
			},
			delayedBurstBody(
				stateName1,
				_qjdfsdstshzj,
				increaseVar,
				_p1,
				_sep,
				_stateName2,
				_sjjss,
				_sep2,
				_dmbzc,
				burstDmgVar,
				_p2,
				_stateName3,
				_qjts,
				burstAtkVar,
				_p3,
				_gkldsh,
			) {
				const effect: DelayedBurst = {
					type: "delayed_burst",
					name: stateName1.extractVar,
					increase: increaseVar.extractVar,
					burst_damage: burstDmgVar.extractVar,
					burst_atk_damage: burstAtkVar.extractVar,
				};
				return [effect];
			},
			primaryAffix(stateName, _ztjssdshts, varRef, _p) {
				const effect: DelayedBurstIncrease = {
					type: "delayed_burst_increase",
					state: stateName.extractVar,
					value: varRef.extractVar,
				};
				return [effect];
			},
			exclusiveAffix(
				_bstmzshi,
				_sep,
				_dmbsfmzt,
				stateName,
				_sep2,
				_cx,
				durVar,
				_m,
				_ws,
				_stateName2,
				_colon,
				stateBody,
			) {
				const bodyFields = stateBody.toEffects()[0] as {
					heal_reduction: string | number;
					damage_increase: string | number;
					enhanced_damage_increase: string | number;
				};
				const effect: Debuff = {
					type: "debuff",
					name: stateName.extractVar,
					duration: durVar.extractVar,
					...bodyFields,
				};
				return [effect];
			},
			exclusiveAffixStateBody(
				_jddf,
				healRedVar,
				_p1,
				_dzll,
				_sep1,
				_bsst,
				dmgIncVar,
				_p2,
				_sep2,
				_rmbbc,
				_sep3,
				_shtsxgjytsz,
				enhancedVar,
				_p3,
			): any[] {
				return [
					{
						heal_reduction: healRedVar.extractVar,
						damage_increase: dmgIncVar.extractVar,
						enhanced_damage_increase: enhancedVar.extractVar,
					},
				];
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
