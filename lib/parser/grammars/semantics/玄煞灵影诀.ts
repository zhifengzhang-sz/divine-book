import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	Effect,
	ExclusiveAffixEffect,
	PerSelfLostHp,
	PrimaryAffixEffect,
	SelfHpCost,
	SelfLostHpDamage,
	SkillEffect,
	StateAdd,
} from "../../schema/玄煞灵影诀.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(
			_pre,
			baseAttack,
			_sep,
			stateAdd,
			_colon,
			stateBody,
			_period,
			_stateName2,
			_permanent,
			_comma,
			_zddj,
			maxStacksVar,
			_ceng,
			_period2,
		) {
			const stateAddEffect: StateAdd = {
				type: "state_add",
				state: stateAdd.extractVar,
				permanent: true,
				max_stacks: maxStacksVar.extractVar,
			};
			return [
				...baseAttack.toEffects(),
				stateAddEffect,
				...stateBody.toEffects(),
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
		stateAdd(_verb, stateName) {
			return stateName.extractVar;
		},
		stateBody(hpCostDot, _sep, selfLostHpDot) {
			return [...hpCostDot.toEffects(), ...selfLostHpDot.toEffects()];
		},
		hpCostDot(_zsmssl, varRef, _p, _ddqqxz) {
			const effect: SelfHpCost = {
				type: "self_hp_cost",
				value: varRef.extractVar,
				tick_interval: 1,
			};
			return [effect];
		},
		selfLostHpDamageDot(_mmdmbzc, varRef, _p, _yslqxzhqjxhqdsh) {
			const effect: SelfLostHpDamage = {
				type: "self_lost_hp_damage",
				value: varRef.extractVar,
				tick_interval: 1,
			};
			return [effect];
		},
		primaryAffix(
			_stateName,
			_mzc,
			hitsVar,
			_csh,
			_sep,
			_ewfj,
			varRef,
			_p,
			_zsyslqxzhqjxhqzdsh,
		) {
			const effect: SelfLostHpDamage = {
				type: "self_lost_hp_damage",
				value: varRef.extractVar,
				every_n_hits: hitsVar.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(_bstzcshshi, _sep, _zsmdss, _sep2, _hsbcshts, varRef, _p) {
			const effect: PerSelfLostHp = {
				type: "per_self_lost_hp",
				value: varRef.extractVar,
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
