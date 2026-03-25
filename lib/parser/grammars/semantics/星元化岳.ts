import type * as ohm from "ohm-js";

import type {
	EchoDamage,
	Effect,
	Lifesteal,
	LifestealExclusive,
} from "../../schema/星元化岳.js";
import type { BaseAttack } from "../../schema/千锋聚灵剑.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, echoClause) {
			return [...baseAttack.toEffects(), ...echoClause.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		echoDamageClause(echo, _lp, _noDmgBonus, _rp, _sep, dur) {
			const effects = echo.toEffects() as any[];
			effects[0].ignore_damage_bonus = true;
			effects[0].duration = dur.extractVar;
			return effects as EchoDamage[];
		},
		echoDamage(
			_dmbmcsdshshi,
			_sep1,
			_hwewsdycgj,
			_sep2,
			_shzwdcshd,
			varRef,
			_pct,
		) {
			return [{ type: "echo_damage", value: varRef.extractVar }] as any;
		},
		noDamageBonus(_lit) {
			return [];
		},
		duration(_cx, varRef, _miao) {
			return varRef.extractVar;
		},
		primaryAffix(_gap, _zcshshf, _sep, _hfzsbcsh, varRef, _pct, _dqxz) {
			const effect: Lifesteal = { type: "lifesteal", value: varRef.extractVar };
			return [effect];
		},
		exclusiveAffix(_pre, _sep, _hsbcsthdz, varRef, _pct, _dxxjg) {
			const effect: LifestealExclusive = { type: "lifesteal", value: varRef.extractVar };
			return [effect];
		},
		preamble(_) {
			return [];
		},
		cnHitCount(_cn, _d) {
			return [];
		},
		_terminal() {
			return [];
		},
		_iter(...children) {
			return children.flatMap((c: ohm.Node) => c.toEffects());
		},
	});
}
