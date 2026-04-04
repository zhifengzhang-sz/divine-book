import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	DamageBuff,
	Effect,
	PeriodicCleanse,
	SelfBuff,
	SelfBuffExtend,
	SelfDamageTakenIncrease,
	SelfHpCost,
	SelfLostHpDamage,
	StateAdd,
} from "../../schema/十方真魄.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(
			_pre,
			hpCost,
			_s1,
			baseAttack,
			_s2,
			selfLostHpHeal,
			_s3,
			stateAdd,
			_colon,
			stateBuffBody,
			_comma,
			_cx,
			durVar,
			_miao,
		) {
			const stateAddEffect: StateAdd = {
				type: "state_add",
				state: stateAdd.extractVar,
				duration: durVar.extractVar,
			};
			const buffEffects = stateBuffBody.toEffects() as Effect[];
			for (const e of buffEffects) {
				if (e.type === "self_buff") {
					(e as SelfBuff).duration = durVar.extractVar;
				}
			}
			return [
				...hpCost.toEffects(),
				...baseAttack.toEffects(),
				...selfLostHpHeal.toEffects(),
				stateAddEffect,
				...buffEffects,
			];
		},
		hpCost(_xhzs, varRef, _p, _dqqxz) {
			const effect: SelfHpCost = {
				type: "self_hp_cost",
				value: varRef.extractVar,
			};
			return [effect];
		},
		baseAttack(_dmbzc, cnHit, _g, varRef, _p, _a) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		selfLostHpWithHeal(_gap, selfLostHp, _sep, _selfHeal) {
			const effects = selfLostHp.toEffects() as Effect[];
			(effects[0] as SelfLostHpDamage).self_heal = true;
			return effects;
		},
		selfLostHpDmg(_ewdqzc, varRef, _p, _yssl) {
			const effect: SelfLostHpDamage = {
				type: "self_lost_hp_damage",
				value: varRef.extractVar,
				self_heal: true,
			};
			return [effect];
		},
		selfEqualHeal(_dehfzsqx) {
			return [];
		},
		stateAdd(_verb, stateName) {
			return stateName.extractVar;
		},
		stateBuffBody(_cxqjts, varRef, _p, _dgklyshjm) {
			const effect: SelfBuff = {
				type: "self_buff",
				attack_buff: varRef.extractVar,
				damage_reduction: varRef.extractVar,
			};
			return [effect];
		},
		primaryAffix(
			_yc,
			durVar,
			_m,
			stateName,
			_cxsj,
			_sep1,
			_bqmmyyou,
			chanceVar,
			_p,
			_glqs,
			_sep2,
			cdVar,
			_mnzdcf,
			maxVar,
			_ci,
			_trailing,
		) {
			const extendEffect: SelfBuffExtend = {
				type: "self_buff_extend",
				value: durVar.extractVar,
				state: stateName.extractVar,
			};
			const cleanseEffect: PeriodicCleanse = {
				type: "periodic_cleanse",
				chance: chanceVar.extractVar,
				target: "控制状态",
				cooldown: cdVar.extractVar,
				max_times: maxVar.extractVar,
			};
			return [extendEffect, cleanseEffect];
		},
		exclusiveAffix(
			_bstsfshi,
			_sep,
			_hsbcstshts,
			varRef1,
			_p1,
			_sep2,
			_sfqjzssddshyts,
			varRef2,
			_p2,
		) {
			const dmgEffect: DamageBuff = {
				type: "damage_buff",
				value: varRef1.extractVar,
			};
			const takenEffect: SelfDamageTakenIncrease = {
				type: "self_damage_taken_increase",
				value: varRef2.extractVar,
			};
			return [dmgEffect, takenEffect];
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
