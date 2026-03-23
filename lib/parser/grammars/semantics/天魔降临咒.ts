import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, stateAdd, _colon, stateBody, _ws, _stateMods) {
			return [...baseAttack.toEffects(), { type: "state_add", state: stateAdd.extractVar }, ...stateBody.toEffects()];
		},
		baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		stateAdd(_verb, stateName) { return stateName.extractVar; },
		stateBody(dmgRed, _s1, dmgInc, _s2, perDebuff) {
			return [...dmgRed.toEffects(), ...dmgInc.toEffects(), ...perDebuff.toEffects()];
		},
		inlineDmgReduction(_shi, _letter, _verb, varRef, _p) {
			return [{ type: "self_buff", name: "结魂锁链", damage_reduction: varRef.extractVar }];
		},
		inlineDmgIncrease(_df, varRef, _p) {
			return [{ type: "debuff", name: "结魂锁链", target: "damage_taken", value: varRef.extractVar }];
		},
		inlinePerDebuff(_prefix, _gap, _sh, varRef, _p, _sep, _sp, _zdtsz, maxVar, _p2) {
			return [{ type: "per_debuff_stack_damage", per_n_stacks: 1, value: varRef.extractVar, max: maxVar.extractVar, parent: "结魂锁链" }];
		},
		stateModifiers(_sn, _yj, _sep, _sp, _zddj, _v, _c) { return []; },
		primaryAffix(_dfcy, state1, _xia, _sep1, _mmsd, varRef1, _p1, _zdqxzdsh, _sep2, _bq, state2, _tsdf, varRef2, _p2) {
			return [{ type: "dot_permanent_max_hp", state: state1.extractVar, value: varRef1.extractVar }, { type: "per_debuff_damage_upgrade", state: state2.extractVar, value: varRef2.extractVar }];
		},
		exclusiveAffix(_pre, _sep, _hsbcshts, varRef, _p) {
			return [{ type: "conditional_damage_debuff", value: varRef.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		ws(_) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
