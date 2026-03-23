import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, _perHit, damageWithCap) {
			return [...baseAttack.toEffects(), ...damageWithCap.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		damageWithCap(dmg, _lp, cap, _rp) {
			return [{ type: "percent_max_hp_damage", value: dmg.extractVar, cap_vs_monster: cap.extractVar }];
		},
		percentMaxHpDmg(_zc, varRef, _pct, _hp) {
			return varRef.extractVar;
		},
		capVsMonster(_dgw, varRef, _pct, _atk) {
			return varRef.extractVar;
		},
		primaryAffix(_pre, _sep, _xydts, varRef, _pct, _stjc) {
			return [{ type: "per_hit_escalation", value: varRef.extractVar }];
		},
		exclusiveAffix(_pre, _sep, _hddftj, durVar, _miaoDe, stateName, _colon, _zlljd, healVar, _pct, _sep2, _qwfbqs) {
			return [{ type: "heal_reduction", value: healVar.extractVar, state: stateName.extractVar, duration: durVar.extractVar, undispellable: true }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		perHit(_) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
