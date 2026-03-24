import type * as ohm from "ohm-js";

import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
		skillDescription(
			_pre,
			hpCost,
			_s1,
			baseAttack,
			_s2,
			selfLostHpHeal,
			_s3,
			stateAdd,
			_colon,
			stateBody,
		) {
			return [
				...hpCost.toEffects(),
				...baseAttack.toEffects(),
				...selfLostHpHeal.toEffects(),
				{ type: "state_add", state: stateAdd.extractVar },
				...stateBody.toEffects(),
			];
		},
		hpCost(_xhzs, varRef, _p, _dqqxz) {
			return [{ type: "self_hp_cost", value: varRef.extractVar }];
		},
		baseAttack(_dmbzc, cnHit, _g, varRef, _p, _a) {
			return [
				{
					type: "base_attack",
					hits: parseCn(cnHit.sourceString.replace("段", "")),
					total: varRef.extractVar,
				},
			];
		},
		selfLostHpWithHeal(_gap, selfLostHp, _sep, _selfHeal) {
			const effects = selfLostHp.toEffects() as any[];
			effects[0].self_heal = true;
			return effects;
		},
		selfLostHpDmg(_ewdqzc, varRef, _p, _yssl) {
			return [{ type: "self_lost_hp_damage", value: varRef.extractVar }];
		},
		selfEqualHeal(_dehfzsqx) {
			return [];
		},
		stateAdd(_verb, stateName) {
			return stateName.extractVar;
		},
		stateBody(_cxqjts, varRef, _p, _dgklyshjm, _sep, _cx, durVar, _m) {
			return [
				{
					type: "self_buff",
					attack_bonus: varRef.extractVar,
					damage_reduction: varRef.extractVar,
					duration: durVar.extractVar,
				},
			];
		},
		primaryAffix(
			_yc,
			durVar,
			_m,
			stateName,
			_cxsj,
			_sep1,
			_bqmmyyou,
			chanceVar,
			_p,
			_glqs,
			_sep2,
			cdVar,
			_mnzdcf,
			maxVar,
			_ci,
			_trailing,
		) {
			return [
				{
					type: "self_buff_extend",
					value: durVar.extractVar,
					state: stateName.extractVar,
				},
				{
					type: "periodic_cleanse",
					chance: chanceVar.extractVar,
					target: "控制状态",
					cooldown: cdVar.extractVar,
					max_times: maxVar.extractVar,
				},
			];
		},
		exclusiveAffix(
			_bstsfshi,
			_sep,
			_hsbcstshts,
			varRef1,
			_p1,
			_sep2,
			_sfqjzssddshyts,
			varRef2,
			_p2,
		) {
			return [
				{ type: "damage_increase", value: varRef1.extractVar },
				{ type: "self_damage_taken_increase", value: varRef2.extractVar },
			];
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
