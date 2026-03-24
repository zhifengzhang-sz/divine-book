import type * as ohm from "ohm-js";

import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
		skillDescription(
			_pre,
			baseAttack,
			_sep,
			stateAdd,
			_colon,
			stateBody,
			_period,
			_mods,
			_period2,
		) {
			return [
				...baseAttack.toEffects(),
				{ type: "state_add", state: stateAdd.extractVar },
				...stateBody.toEffects(),
			];
		},
		baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
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
		stateBody(hpCostDot, _sep, selfLostHpDot) {
			return [...hpCostDot.toEffects(), ...selfLostHpDot.toEffects()];
		},
		hpCostDot(_zsmssl, varRef, _p, _ddqqxz) {
			return [
				{ type: "self_hp_cost", value: varRef.extractVar, tick_interval: 1 },
			];
		},
		selfLostHpDamageDot(_mmdmbzc, varRef, _p, _yslqxzhqjxhqdsh) {
			return [
				{
					type: "self_lost_hp_damage",
					value: varRef.extractVar,
					tick_interval: 1,
				},
			];
		},
		stateModifiers(_sn, _yj, _sep, _zddj, _v, _c) {
			return [];
		},
		primaryAffix(
			_stateName,
			_mzc,
			hitsVar,
			_csh,
			_sep,
			_ewfj,
			varRef,
			_p,
			_zsyslqxzhqjxhqzdsh,
		) {
			return [
				{
					type: "self_lost_hp_damage",
					value: varRef.extractVar,
					every_n_hits: hitsVar.extractVar,
				},
			];
		},
		exclusiveAffix(_bstzcshshi, _sep, _zsmdss, _sep2, _hsbcshts, varRef, _p) {
			return [{ type: "per_self_lost_hp", value: varRef.extractVar }];
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
