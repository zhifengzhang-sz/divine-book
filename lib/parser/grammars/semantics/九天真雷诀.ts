import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep1, selfCleanse, _sep2, condDmg, _period) {
			return [...baseAttack.toEffects(), ...selfCleanse.toEffects(), ...condDmg.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		selfCleanse(_gap, _qszs, varRef, _gfmzt) {
			return [{ type: "self_cleanse", count: varRef.extractVar }];
		},
		conditionalDamage(_rjh, _gap1, _jxl, _gap2, _mzshi, _sep, _mdgjfj, varRef, _pct, _zszdqxzdsh) {
			return [{ type: "conditional_damage", value: varRef.extractVar, damage_base: "self_max_hp", per_hit: true, condition: "cleanse_excess" }];
		},
		exclusiveAffix(_bstmcsh, _sep1, _yddqjdf, _sep2, _zcycbst, varRef, _pct, _dlfsh) {
			return [{ type: "on_buff_debuff_shield", trigger_kind: "增益/减益/护盾", value: varRef.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
