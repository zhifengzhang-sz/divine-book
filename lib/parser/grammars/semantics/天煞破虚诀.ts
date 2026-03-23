import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _period, hpCost, _sep, stateClause) {
			return [...baseAttack.toEffects(), ...hpCost.toEffects(), ...stateClause.toEffects()];
		},
		baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		hpCost(_xh, varRef, _p, _dqqxz) {
			return [{ type: "self_hp_cost", value: varRef.extractVar }];
		},
		stateClause(_gap, _jinru, stateName, _zt, _colon, stateBody) {
			return [{ type: "state_ref", state: stateName.extractVar }, ...stateBody.toEffects()];
		},
		stateBody(_jxlstd, hitsVar, _dgj, _sep, _mdgjfjzs, varRef, _p, _yslqxzdsh) {
			return [{ type: "self_lost_hp_damage", value: varRef.extractVar, per_hit: true, next_skill_hits: hitsVar.extractVar }];
		},
		exclusiveAffix(_bstmzhmmqs, _sep1, _cx, durVar, _m, _sep2, _qbjmq, varRef, _p, _dlfsh, _sep3, _rwqs, _sep4, _zcbpsh) {
			return [{ type: "periodic_dispel", interval: 1, duration: durVar.extractVar, damage_percent_of_skill: varRef.extractVar, no_buff_double: true }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
