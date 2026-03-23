import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, stateClause) {
			return [...baseAttack.toEffects(), ...stateClause.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		stateClause(_gap, _huode, stateName, _colon, stateBody) {
			const effects = stateBody.toEffects() as Effect[];
			return [{ type: "state_ref", state: stateName.extractVar }, ...effects];
		},
		stateBody(_perHit, shieldDestroy, _sep1, noShieldDouble, _sep2, _stateName, maxStacks, _sep3, duration) {
			return [
				...shieldDestroy.toEffects(),
				...noShieldDouble.toEffects(),
			];
		},
		perHit(_lit) { return []; },
		shieldDestroy(_ymdf, shieldCount, _gehd, _sep, _bew, _zc, dmgVar, _pct, _dfmxhp, _lp, cap, _rp) {
			return [{ type: "shield_destroy_damage", shields_per_hit: shieldCount.extractVar, percent_max_hp: dmgVar.extractVar, cap_vs_monster: cap.extractVar }];
		},
		noShieldDouble(_lit, _lp, cap, _rp) {
			return [{ type: "no_shield_double_damage", cap_vs_monster: cap.extractVar }];
		},
		capVsMonster(_dgwzdzc, varRef, _pct, _gkldsh) {
			return varRef.extractVar;
		},
		maxStacks(_sx, varRef, _ceng) { return []; },
		duration(_cx, varRef, _miao) { return []; },
		primaryAffix(stateName, _mei, intervalVar, _mdmbzc, _ymhd, _xgs, dmgVar, _pct, _gkldsh, _parenOpt) {
			return [{ type: "shield_destroy_dot", state: stateName.extractVar, interval: intervalVar.extractVar, value: dmgVar.extractVar }];
		},
		exclusiveAffix(part1, _sep, part2) {
			return [...part1.toEffects(), ...part2.toEffects()];
		},
		exclusiveAffix_1(_pre, _sep, _ewzc, varRef, _pct, _yssl) {
			return [{ type: "dot_extra_per_tick", value: varRef.extractVar }];
		},
		exclusiveAffix_2(_pre, _bstg, varRef1, _pct1, _sep, _bing, varRef2, _pct2) {
			return [{ type: "percent_max_hp_damage", value: varRef1.extractVar }, { type: "damage_increase", value: varRef2.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
