import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep1, critDmg, _sep2, selfDmgTaken) {
			return [...baseAttack.toEffects(), ...critDmg.toEffects(), ...selfDmgTaken.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		critDmgBonus(_sbst, varRef, _pct) {
			return [{ type: "crit_dmg_bonus", value: varRef.extractVar }];
		},
		selfDmgTakenIncrease(_sfhzs, durVar, _mnsdsh, dmgVar, _pct) {
			return [{ type: "self_damage_taken_increase", duration: durVar.extractVar, value: dmgVar.extractVar }];
		},
		primaryAffix(_dfhp, varRef1, _pct1, _sep, _stsh, varRef2, _pct2) {
			return [{ type: "conditional_damage", condition: "enemy_hp_loss", per_step: varRef1.extractVar, value: varRef2.extractVar }];
		},
		exclusiveAffix(_sbst, _sep, _bts, varRef, _pct, _sh) {
			return [{ type: "ignore_damage_reduction" }, { type: "damage_increase", value: varRef.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
