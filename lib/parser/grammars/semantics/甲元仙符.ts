import type * as ohm from "ohm-js";

import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<any[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, stateClause) {
			return [...baseAttack.toEffects(), ...stateClause.toEffects()];
		},
		baseAttack(_zc, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: 1, total: varRef.extractVar }];
		},
		stateClause(
			_gap,
			_huode,
			stateName,
			_zt,
			_sep,
			tripleBuff,
			_sep2,
			_duration,
		) {
			return [
				{ type: "state_ref", state: stateName.extractVar },
				...tripleBuff.toEffects(),
			];
		},
		tripleStatBuff(_tszs, varRef, _pct, _gkljcszjczdqxz) {
			return [
				{
					type: "self_buff",
					attack_bonus: varRef.extractVar,
					defense_bonus: varRef.extractVar,
					hp_bonus: varRef.extractVar,
				},
			];
		},
		duration(_cx, _varRef, _miao) {
			return [];
		},
		primaryAffix(stateName, _ztewszshdz, varRef, _pct, _zljc) {
			return [
				{
					type: "self_buff",
					name: stateName.extractVar,
					healing_bonus: varRef.extractVar,
				},
			];
		},
		exclusiveAffix(
			_pre,
			_sep,
			_hddftjcx,
			durVar,
			_miaoDe,
			stateName,
			_colon,
			_zlljd,
			varRef1,
			_pct1,
			_sep2,
			_rdfqxzdy,
			varRef2,
			_pct2,
			_sep3,
			_sjddzl,
			varRef3,
			_pct3,
		) {
			return [
				{
					type: "heal_reduction",
					value: varRef1.extractVar,
					state: stateName.extractVar,
					duration: durVar.extractVar,
					enhanced_value: varRef3.extractVar,
					hp_threshold: varRef2.extractVar,
				},
			];
		},
		preamble(_) {
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
