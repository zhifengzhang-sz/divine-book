import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, untargetable, _sep1, _mid, baseAttack, _sep2, periodicEsc) {
			return [...untargetable.toEffects(), ...baseAttack.toEffects(), ...periodicEsc.toEffects()];
		},
		untargetable(_zai, varRef, _mnbkbxz) {
			return [{ type: "untargetable", value: varRef.extractVar }];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		periodicEscalation(_gap1, _mzc, hitsVar, _cshshi, _sep, _gap2, _shts, multVar, _bei, _sep2, _dcsh, maxVar, _ci) {
			return [{ type: "periodic_escalation", hits: hitsVar.extractVar, multiplier: multVar.extractVar, max: maxVar.extractVar }];
		},
		primaryAffix(_gap, _ewcx, durVar, _miao, _sep, _mei, intervalVar, _mzcycsh) {
			return [{ type: "extended_dot", duration: durVar.extractVar, interval: intervalVar.extractVar }];
		},
		exclusiveAffix(_lit) {
			return [{ type: "buff_duration", value: _lit.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		midProse(_) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
