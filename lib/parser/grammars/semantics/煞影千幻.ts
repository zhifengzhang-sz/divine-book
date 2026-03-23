import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, hpCost, _s1, baseAttack, _s2, selfLostHp, _s3, shield, _s4, shieldDur, _s5, stateAddClause) {
			return [...hpCost.toEffects(), ...baseAttack.toEffects(), ...selfLostHp.toEffects(), ...shield.toEffects(), ...stateAddClause.toEffects()];
		},
		hpCost(_xhzs, varRef, _p, _dqqxz) {
			return [{ type: "self_hp_cost", value: varRef.extractVar }];
		},
		baseAttack(_dmbzc, cnHit, _g, varRef, _p, _a) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		selfLostHpDmg(_ewdmbzc, varRef, _p, _yssl) {
			return [{ type: "self_lost_hp_damage", value: varRef.extractVar }];
		},
		shield(_wzsftj, varRef, _p, _zdqxzdhd) {
			return [{ type: "shield", value: varRef.extractVar }];
		},
		shieldDur(_hdcx, varRef, _m) {
			return [];
		},
		stateAddClause(_mdgj, _gap, _tj, countVar, _c, _bkqsd, stateName, _colon, debuffBody) {
			return [{ type: "state_add", state: stateName.extractVar, count: countVar.extractVar, per_hit: true, undispellable: true }, ...debuffBody.toEffects()];
		},
		debuffBody(_jd, varRef, _p, _zzshjm, _sep, _cx, durVar, _m) {
			return [{ type: "debuff", name: "落星", target: "final_damage_reduction", value: varRef.extractVar, duration: durVar.extractVar }];
		},
		primaryAffix(_hddhdtsz, varRef1, _p1, _zdqxz, _sep, _qyyou, varRef2, _p2, _dglbxhqxz) {
			return [{ type: "shield_strength", value: varRef1.extractVar }, { type: "chance", value: varRef2.extractVar, effect: "no_hp_cost" }];
		},
		exclusiveAffix(_bstzcshshi, _sep, _rdfcykzzt, _sep2, _zsbcshts, varRef, _p) {
			return [{ type: "conditional_damage_controlled", value: varRef.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
