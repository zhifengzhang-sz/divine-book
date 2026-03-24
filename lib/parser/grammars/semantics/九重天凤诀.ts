import type * as ohm from "ohm-js";

import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
		skillDescription(
			_pre,
			baseAttack,
			_s1,
			perHitLostHp,
			_s2,
			perHitCostState,
			_colon,
			stateBody,
		) {
			return [
				...baseAttack.toEffects(),
				...perHitLostHp.toEffects(),
				...perHitCostState.toEffects(),
				...stateBody.toEffects(),
			];
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
		perHitSelfLostHpDmg(_mdgjew, varRef, _p, _yssl) {
			return [
				{
					type: "self_lost_hp_damage",
					value: varRef.extractVar,
					per_hit: true,
				},
			];
		},
		perHitCostAndState(
			_mdgjhxhzs,
			costVar,
			_p,
			_dqqxzbwzstj,
			countVar,
			_c,
			stateName,
		) {
			return [
				{ type: "self_hp_cost", value: costVar.extractVar, per_hit: true },
				{
					type: "state_add",
					state: stateName.extractVar,
					count: countVar.extractVar,
					per_hit: true,
				},
			];
		},
		stateBody(_cxqjtszs, varRef, _p, _dgklybkl, _sep, _cx, durVar, _m) {
			return [
				{
					type: "self_buff",
					attack_bonus: varRef.extractVar,
					crit_rate: varRef.extractVar,
					duration: durVar.extractVar,
				},
			];
		},
		primaryAffix(
			_bjzcshqyxqsmb,
			cnNum,
			_gzyxg,
			_sep,
			_sfbjshqxbhjz,
			varRef,
			_p,
			_yx,
		) {
			return [
				{ type: "periodic_dispel", count: cnNum.extractVar },
				{ type: "self_hp_floor", value: varRef.extractVar },
			];
		},
		exclusiveAffix(_dbstcjdhdxsshi, _sep, _hddfeewzc, varRef, _p, _dsh) {
			return [{ type: "on_shield_expire", value: varRef.extractVar }];
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
