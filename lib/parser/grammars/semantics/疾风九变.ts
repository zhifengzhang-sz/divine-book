import type * as ohm from "ohm-js";

import type {
	AllStateDuration,
	BaseAttack,
	CounterBuff,
	Effect,
	LifestealWithParent,
	SelfHpCost,
	StateAdd,
} from "../../schema/疾风九变.js";
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
			stateAdd,
			_colon,
			stateBody,
		) {
			const stateAddEffect: StateAdd = {
				type: "state_add",
				state: stateAdd.extractVar,
			};
			return [
				...hpCost.toEffects(),
				...baseAttack.toEffects(),
				stateAddEffect,
				...stateBody.toEffects(),
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
		stateAdd(_verb, stateName) {
			return stateName.extractVar;
		},
		stateBody(counterBuff, _sep, durNode) {
			const effects = counterBuff.toEffects() as Effect[];
			const durMatch = durNode.sourceString.match(/(\d+(?:\.\d+)?)/);
			const dur = durMatch ? Number(durMatch[1]) : undefined;
			for (const e of effects) {
				if (e.type === "counter_buff" && dur !== undefined) {
					(e as CounterBuff).duration = dur;
				}
			}
			return effects;
		},
		counterBuffReflect(
			_mmdmb,
			_gap,
			_fszssddshzd,
			reflectVar,
			_p1,
			_yuzishen,
			lostHpVar,
			_p2,
			_yssl,
		) {
			const effect: CounterBuff = {
				type: "counter_buff",
				reflect_received_damage: reflectVar.extractVar,
				reflect_percent_lost_hp: lostHpVar.extractVar,
			};
			return [effect];
		},
		duration(_cx, _varRef, _m) {
			return [];
		},
		primaryAffix(_huifu, stateName, _zcsh, varRef, _p, _dqxz) {
			const effect: LifestealWithParent = {
				type: "lifesteal_with_parent",
				state: stateName.extractVar,
				value: varRef.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(_sbstcjdsyztcxsjyc, varRef, _p) {
			const effect: AllStateDuration = {
				type: "all_state_duration",
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
