import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, selfHeal, _sep1, _mid, baseAttack, _sep2, healEcho, _sep3, stateClause) {
			return [...selfHeal.toEffects(), ...baseAttack.toEffects(), ...healEcho.toEffects(), ...stateClause.toEffects()];
		},
		selfHeal(_wzshuifu, varRef, _pct, _zdqxz) {
			return [{ type: "self_heal", value: varRef.extractVar }];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		healEcho(_fjlmqjshfqxzdedsh) {
			return [{ type: "heal_echo_damage", ratio: 1 }];
		},
		stateClause(_gap, stateName, _colon, stateBody) {
			return [{ type: "state_ref", state: stateName.extractVar }, ...stateBody.toEffects()];
		},
		stateBody(_mmhf, perTickVar, _pct1, _qxz, _sep, _gjhf, totalVar, _pct2, _dzdqxz) {
			return [{ type: "self_heal", per_tick: perTickVar.extractVar, total: totalVar.extractVar, tick_interval: 1 }];
		},
		primaryAffix(stateName, _mchfqxs, _gap, varRef, _pct, _zszdqxzdhd, _sep, _cx, durVar, _miao) {
			return [{ type: "shield", value: varRef.extractVar, duration: durVar.extractVar, source: "self_max_hp", trigger: "per_tick" }];
		},
		exclusiveAffix(part1, _sep, part2) {
			return [...part1.toEffects(), ...part2.toEffects()];
		},
		exclusiveAffix_1(_pre, _sep, _you, varRef, _pct, _glewdfj1c) {
			return [{ type: "debuff_stack_chance", value: varRef.extractVar }];
		},
		exclusiveAffix_2(_rbst, _gap, _zyztshi, _sep, _zhewdfm, stateName, _colon, _dfhjsbc, varRef, _bei, _dchsj) {
			return [{ type: "cross_slot_debuff", state: stateName.extractVar, value: varRef.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		midProse(_) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
