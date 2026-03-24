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
			stateAdd,
			_colon,
			stateBody,
		) {
			return [
				...hpCost.toEffects(),
				...baseAttack.toEffects(),
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
		stateAdd(_verb, stateName) {
			return stateName.extractVar;
		},
		stateBody(counterBuff, _sep, _dur) {
			return counterBuff.toEffects();
		},
		counterBuffReflect(
			_mmdmb,
			_gap,
			_fszssddshzd,
			reflectVar,
			_p1,
			_yuzishen,
			lostHpVar,
			_p2,
			_yssl,
		) {
			return [
				{
					type: "counter_buff",
					reflect_received_damage: reflectVar.extractVar,
					reflect_percent_lost_hp: lostHpVar.extractVar,
				},
			];
		},
		duration(_cx, _varRef, _m) {
			return [];
		},
		primaryAffix(_huifu, stateName, _zcsh, varRef, _p, _dqxz) {
			return [
				{
					type: "lifesteal_with_parent",
					state: stateName.extractVar,
					value: varRef.extractVar,
				},
			];
		},
		exclusiveAffix(_sbstcjdsyztcxsjyc, varRef, _p) {
			return [{ type: "all_state_duration", value: varRef.extractVar }];
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
