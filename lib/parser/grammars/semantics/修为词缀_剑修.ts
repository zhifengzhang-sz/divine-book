import type * as ohm from "ohm-js";

import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
		affixDescription(child) {
			return child.toEffects();
		},
		jx_cuiYunZheYue(_pre, varRef, _p, _gkldxg) {
			return [{ type: "attack_bonus", value: varRef.extractVar }];
		},
		jx_lingXiJiuChong(
			_sbstbdhx,
			varRef1,
			_bei1,
			_s,
			_byou,
			varRef2,
			_p,
			_gltsz,
			varRef3,
			_bei2,
		) {
			return [
				{
					type: "guaranteed_resonance",
					base_multiplier: varRef1.extractVar,
					chance: varRef2.extractVar,
					upgraded_multiplier: varRef3.extractVar,
				},
			];
		},
		jx_poSuiWuShuang(
			_bst,
			_s,
			_hsbcstts,
			varRef1,
			_p1,
			_gkldxg,
			_s2,
			varRef2,
			_p2,
			_dsh,
			_s3,
			varRef3,
			_p3,
			_dbjsh,
		) {
			return [
				{
					type: "triple_bonus",
					attack_bonus: varRef1.extractVar,
					damage_increase: varRef2.extractVar,
					crit_damage_increase: varRef3.extractVar,
				},
			];
		},
		jx_xinHuoCuiFeng(
			_bst,
			_s1,
			_mzc,
			hitsVar,
			_dsh,
			_s2,
			_syssshts,
			perVar,
			_p1,
			_s3,
			_zdts,
			maxVar,
			_p2,
		) {
			return [
				{
					type: "per_hit_escalation",
					hits: hitsVar.extractVar,
					per_hit: perVar.extractVar,
					max: maxVar.extractVar,
				},
			];
		},
		_terminal() {
			return [];
		},
		_iter(...children) {
			return children.flatMap((c: ohm.Node) => c.toEffects());
		},
	});
}
