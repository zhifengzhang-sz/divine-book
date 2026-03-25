import type * as ohm from "ohm-js";

import type {
	Effect,
	PeriodicDispel,
	SelfHpCost,
	SelfLostHpDamage,
	StateRef,
} from "../../schema/天煞破虚诀.js";
import type { BaseAttack } from "../../schema/千锋聚灵剑.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _period, hpCost, _sep, stateClause) {
			return [
				...baseAttack.toEffects(),
				...hpCost.toEffects(),
				...stateClause.toEffects(),
			];
		},
		baseAttack(_zc, cnHit, _g, varRef, _p, _a) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		hpCost(_xh, varRef, _p, _dqqxz) {
			const effect: SelfHpCost = {
				type: "self_hp_cost",
				value: varRef.extractVar,
			};
			return [effect];
		},
		stateClause(_gap, _jinru, stateName, _zt, _colon, stateBody) {
			const stateRef: StateRef = {
				type: "state_ref",
				state: stateName.extractVar,
			};
			return [stateRef, ...stateBody.toEffects()];
		},
		stateBody(_jxlstd, hitsVar, _dgj, _sep, _mdgjfjzs, varRef, _p, _yslqxzdsh) {
			const effect: SelfLostHpDamage = {
				type: "self_lost_hp_damage",
				value: varRef.extractVar,
				per_hit: true,
				next_skill_hits: hitsVar.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(
			_bstmzhmmqs,
			_sep1,
			_cx,
			durVar,
			_m,
			_sep2,
			_qbjmq,
			varRef,
			_p,
			_dlfsh,
			_sep3,
			_rwqs,
			_sep4,
			_zcbpsh,
		) {
			const effect: PeriodicDispel = {
				type: "periodic_dispel",
				interval: 1,
				duration: durVar.extractVar,
				damage_percent_of_skill: varRef.extractVar,
				no_buff_double: true,
			};
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
