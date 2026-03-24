import type * as ohm from "ohm-js";

import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<any[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, perHitDmg) {
			return [...baseAttack.toEffects(), ...perHitDmg.toEffects()];
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
		perHitMaxHpDmg(_mdshfj, varRef, _pct, _zszdqxzdsh) {
			return [
				{
					type: "percent_max_hp_damage",
					value: varRef.extractVar,
					per_hit: true,
				},
			];
		},
		primaryAffix(
			_dqqxgy,
			varRef1,
			_pct1,
			_shhdshjs,
			_sep,
			_meewgc,
			varRef2,
			_pct2,
			_qxzhdz,
			varRef3,
			_pct3,
			_shjs,
		) {
			return [
				{
					type: "conditional_hp_scaling",
					hp_threshold: varRef1.extractVar,
					per_step: varRef2.extractVar,
					value: varRef3.extractVar,
				},
			];
		},
		exclusiveAffix(_sbstdwjdjjia, varRef1, _sep, _bsbstzcdshts, varRef2, _pct) {
			return [
				{ type: "enlightenment_bonus", value: varRef1.extractVar },
				{ type: "damage_increase", value: varRef2.extractVar },
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
