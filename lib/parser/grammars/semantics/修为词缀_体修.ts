import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		affixDescription(child) { return child.toEffects(); },
		tx_jinGangHuTi(_bst, _s, _hzsfqjts, varRef, _p, _dshjm) {
			return [{ type: "damage_reduction_during_cast", value: varRef.extractVar }];
		},
		tx_poMieTianGuang(_bst, _s, _hsbcstew, varRef, _p, _gkldsh) {
			return [{ type: "flat_extra_damage", value: varRef.extractVar }];
		},
		tx_qingYunLingDun(_pre, varRef, _p) {
			return [{ type: "shield_value_increase", value: varRef.extractVar }];
		},
		tx_tanLangTunXing(_bst, _s1, _dfmdss, perVar, _p1, _zdqxz, _s2, _hsbcshts, varRef, _p2) {
			return [{ type: "per_enemy_lost_hp", per_percent: perVar.extractVar, value: varRef.extractVar }];
		},
		tx_yiZhuiShenYuan(_sbst, varRef1, _p1, _js, _s, _bsbcshts, varRef2, _p2) {
			return [{ type: "min_lost_hp_threshold", min_percent: varRef1.extractVar, damage_increase: varRef2.extractVar }];
		},
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
