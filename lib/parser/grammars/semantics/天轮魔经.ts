import type * as ohm from "ohm-js";

import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep1, buffSteal, _sep2, perStealDmg) {
			return [
				...baseAttack.toEffects(),
				...buffSteal.toEffects(),
				...perStealDmg.toEffects(),
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
		buffSteal(_gap, _ttmb, varRef, _gzyzt) {
			return [{ type: "buff_steal", value: varRef.extractVar }];
		},
		perStealDmg(_mtq1g, _sep, _dmbzc, varRef, _p, _zdqxzdsh) {
			return [
				{
					type: "percent_max_hp_damage",
					value: varRef.extractVar,
					trigger: "per_steal",
				},
			];
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
			return [
				{
					type: "per_stolen_buff_debuff",
					state: stateName.extractVar,
					value: varRef.extractVar,
					duration: durVar.extractVar,
				},
			];
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
		) {
			return [
				{ type: "debuff_stack_increase", value: varRef1.extractVar },
				{
					type: "per_debuff_stack_damage",
					value: varRef3.extractVar,
					max: varRef4.extractVar,
					per_stack: varRef2.extractVar,
				},
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
