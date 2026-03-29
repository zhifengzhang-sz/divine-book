import type * as ohm from "ohm-js";

import type {
	AttackBonus,
	BaseAttack,
	BuffStackIncrease,
	Effect,
	PerBuffStackDamage,
	SelfBuff,
	StateRef,
} from "../../schema/元磁神光.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, stateClause) {
			return [...baseAttack.toEffects(), ...stateClause.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atk) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		stateClause(_trigger, _yiceng, stateName, _colon, stateBody) {
			const ref: StateRef = {
				type: "state_ref",
				state: stateName.extractVar,
				trigger: "on_attacked_by_skill",
			};
			return [ref, ...stateBody.toEffects()];
		},
		stateBody(
			_tisheng,
			varRef,
			_pct,
			_shjs,
			_sep1,
			_zddj,
			maxVar,
			_ceng,
			_sep2,
			_cx,
			durVar,
			_miao,
		) {
			const effect: SelfBuff = {
				type: "self_buff",
				damage_increase: varRef.extractVar,
				max_stacks: maxVar.extractVar,
				duration: durVar.extractVar,
			};
			return [effect];
		},
		primaryAffix(_meiceng, stateName, _ewtszs, varRef, _pct, _gkl) {
			const effect: AttackBonus = {
				type: "attack_bonus",
				value: varRef.extractVar,
				per_state_stack: stateName.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(
			_sbstcjdzyzt,
			varRef1,
			_pct1,
			_sep1,
			_zsmei,
			varRef2,
			_czyzt,
			_sep2,
			_ts,
			varRef3,
			_pct3,
			_sh,
			_sep3,
			_zdts,
			varRef4,
			_pct4,
			_sh2,
		) {
			const stackIncrease: BuffStackIncrease = { type: "buff_stack_increase", value: varRef1.extractVar };
			const perStackDmg: PerBuffStackDamage = {
				type: "per_buff_stack_damage",
				per_stack: varRef2.extractVar,
				value: varRef3.extractVar,
				max: varRef4.extractVar,
			};
			return [stackIncrease, perStackDmg];
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
