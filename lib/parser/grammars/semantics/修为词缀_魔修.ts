import type * as ohm from "ohm-js";

import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
		affixDescription(child) {
			return child.toEffects();
		},
		mx_yaoGuangQueXie(_dbstzc, _s, _hddfeewzc, varRef, _p, _dsh) {
			return [{ type: "healing_to_damage", value: varRef.extractVar }];
		},
		mx_kuiHunJiXia(
			_bst,
			_s1,
			_rdfqxzdy,
			threshVar,
			_p1,
			_s2,
			_zsbcshts,
			dmgVar,
			_p2,
			_s3,
			_qbdbj,
		) {
			return [
				{
					type: "execute_conditional",
					hp_threshold: threshVar.extractVar,
					damage_increase: dmgVar.extractVar,
					guaranteed_crit: 1,
				},
			];
		},
		mx_xuanNvHuXin(
			_bstzcshh,
			_s1,
			_zshhdz,
			varRef,
			_p,
			_dhd,
			_s2,
			_hdcx,
			durVar,
			_m,
		) {
			return [
				{
					type: "damage_to_shield",
					value: varRef.extractVar,
					duration: durVar.extractVar,
				},
			];
		},
		mx_huoXingWuWang(
			_bst,
			_s,
			_hddftjxy,
			_colon,
			_gjjd,
			v1,
			_p1,
			_s2,
			_bjljd,
			v2,
			_p2,
			_s3,
			_bjshjd,
			v3,
			_p3,
		) {
			return [
				{
					type: "random_debuff",
					attack: v1.extractVar,
					crit_rate: v2.extractVar,
					crit_damage: v3.extractVar,
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
