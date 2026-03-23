import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, perHitState, _colon, stateBody) {
			return [...baseAttack.toEffects(), ...perHitState.toEffects(), ...stateBody.toEffects()];
		},
		baseAttack(_dqzc, cnHit, _g, varRef, _p, _a) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		perHitStateAdd(_mdgjhwmbtj, countVar, _c, stateName) {
			return [{ type: "state_add", state: stateName.extractVar, count: countVar.extractVar, per_hit: true }];
		},
		stateBody(dot, _sep, dur) {
			return dot.toEffects();
		},
		dotCurrentHp(_mmdmbzc, varRef, _p, _dqqxzdsh) {
			return [{ type: "dot", tick_interval: "1", percent_current_hp: varRef.extractVar }];
		},
		duration(_cx, varRef, _m) { return []; },
		primaryAffix(_mbmhd, cnNumOrDigit, _ge, state1, _sep, _hew, _cx, durVar, _mde, state2, _colon, _mmzc, varRef, _p, _yslqxzsh) {
			return [{ type: "dot", name: state2.extractVar, tick_interval: "1", percent_lost_hp: varRef.extractVar, duration: durVar.extractVar, trigger_stack: cnNumOrDigit.extractVar, source_state: state1.extractVar }];
		},
		exclusiveAffix(_sbstcjdcxshxg, varRef, _p) {
			return [{ type: "dot_frequency_increase", value: varRef.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
