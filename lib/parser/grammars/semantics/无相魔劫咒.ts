import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, stateApply, delayedBurst) {
			return [...baseAttack.toEffects(), ...stateApply.toEffects(), ...delayedBurst.toEffects()];
		},
		baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		stateApply(_gap, _sfmzt, stateName, _sep, _cx, durVar, _m, _period) {
			return [{ type: "state_ref", state: stateName.extractVar }];
		},
		delayedBurstBody(stateName1, _qjdfsdstshzj, increaseVar, _p1, _sep, stateName2, _sjjss, _sep2, _dmbzc, burstDmgVar, _p2, stateName3, _qjts, _plus, burstAtkVar, _p3, _gkldsh) {
			return [{ type: "delayed_burst", name: stateName1.extractVar, increase: increaseVar.extractVar, burst_damage: burstDmgVar.extractVar, burst_atk_damage: burstAtkVar.extractVar }];
		},
		primaryAffix(stateName, _ztjssdshts, varRef, _p) {
			return [{ type: "delayed_burst_increase", state: stateName.extractVar, value: varRef.extractVar }];
		},
		exclusiveAffix(_bstmzshi, _sep, _dmbsfmzt, stateName, _sep2, _cx, durVar, _m, _ws, stateName2, _colon, stateBody) {
			return [{ type: "debuff", name: stateName.extractVar, duration: durVar.extractVar, ...stateBody.toEffects()[0] }];
		},
		exclusiveAffixStateBody(_jddf, healRedVar, _p1, _dzll, _sep1, _bsst, dmgIncVar, _p2, _sep2, _rmbbc, _sep3, _shtsxgjytsz, enhancedVar, _p3) {
			return [{ heal_reduction: healRedVar.extractVar, damage_increase: dmgIncVar.extractVar, enhanced_damage_increase: enhancedVar.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		ws(_) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
