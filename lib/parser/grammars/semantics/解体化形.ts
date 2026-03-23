import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, perDebuff) {
			return [...baseAttack.toEffects(), ...perDebuff.toEffects()];
		},
		baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		perDebuffStackDmg(_mbdq, _sep1, _bcstshts, varRef, _p, _sep2, _zdjs, maxVar, _g, _jyzt) {
			return [{ type: "per_debuff_stack_damage", value: varRef.extractVar, max: maxVar.extractVar }];
		},
		primaryAffix(_jnsfq, _sep1, _mcts, varRef, _p, _dgkl, _sep2, _zd, maxVar, _c) {
			return [{ type: "attack_bonus", value: varRef.extractVar, max_stacks: maxVar.extractVar, per_debuff_stack: true, timing: "pre_cast" }];
		},
		exclusiveAffix(_bstsfshi, _sep, _hsbcst, varRef1, _p1, _glts4bei, _sep2, varRef2, _p2, _glts3bei, _sep3, varRef3, _p3, _glts2bei) {
			return [{ type: "probability_multiplier", chance_4x: varRef1.extractVar, chance_3x: varRef2.extractVar, chance_2x: varRef3.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
