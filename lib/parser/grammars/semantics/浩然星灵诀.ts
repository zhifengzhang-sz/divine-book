import type * as ohm from "ohm-js";

import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<any[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, stateClause) {
			return [...baseAttack.toEffects(), ...stateClause.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [
				{
					type: "base_attack",
					hits: parseCn(cnHit.sourceString.replace("段", "")),
					total: varRef.extractVar,
				},
			];
		},
		stateClause(_gap, _huode, stateName, _zt, _colon, stateBody) {
			return [
				{ type: "state_ref", state: stateName.extractVar },
				...stateBody.toEffects(),
			];
		},
		stateBody(_tisheng, varRef, _pct, _zzshjs, _sep, _chixu, durVar, _miao) {
			return [
				{
					type: "self_buff",
					final_damage_bonus: varRef.extractVar,
					duration: durVar.extractVar,
				},
			];
		},
		primaryAffix(
			_zsmyy,
			varRef1,
			_pct1,
			_zzshjs,
			_sep1,
			_btjfj,
			varRef2,
			_pct2,
			_gkldsh,
			_sep2,
			_zdjsz,
			varRef3,
			_pct3,
			_zzshjs2,
		) {
			return [
				{
					type: "conditional_hp_scaling",
					hp_threshold: varRef1.extractVar,
					value: varRef2.extractVar,
					max: varRef3.extractVar,
				},
			];
		},
		exclusiveAffix(_sbstcjdzyx, varRef, _pct) {
			return [{ type: "buff_strength", value: varRef.extractVar }];
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
