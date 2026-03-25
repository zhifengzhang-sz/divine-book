import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	Chance,
	ConditionalDamageControlled,
	Debuff,
	Effect,
	SelfHpCost,
	SelfLostHpDamage,
	Shield,
	ShieldStrength,
	StateAdd,
} from "../../schema/煞影千幻.js";
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
			selfLostHp,
			_s3,
			shield,
			_s4,
			shieldDurNode,
			_s5,
			stateAddClause,
		) {
			const shieldEffects = shield.toEffects() as Effect[];
			const durMatch = shieldDurNode.sourceString.match(/(\d+(?:\.\d+)?)/);
			const dur = durMatch ? Number(durMatch[1]) : undefined;
			for (const e of shieldEffects) {
				if (e.type === "shield" && dur !== undefined) {
					(e as Shield).duration = dur;
				}
			}
			return [
				...hpCost.toEffects(),
				...baseAttack.toEffects(),
				...selfLostHp.toEffects(),
				...shieldEffects,
				...stateAddClause.toEffects(),
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
		selfLostHpDmg(_ewdmbzc, varRef, _p, _yssl) {
			const effect: SelfLostHpDamage = {
				type: "self_lost_hp_damage",
				value: varRef.extractVar,
			};
			return [effect];
		},
		shield(_wzsftj, varRef, _p, _zdqxzdhd) {
			const effect: Shield = {
				type: "shield",
				value: varRef.extractVar,
			};
			return [effect];
		},
		shieldDur(_hdcx, _varRef, _m) {
			return [];
		},
		stateAddClause(
			_mdgj,
			_gap,
			_tj,
			countVar,
			_c,
			_bkqsd,
			stateName,
			_colon,
			debuffBody,
		) {
			const stateEffect: StateAdd = {
				type: "state_add",
				state: stateName.extractVar,
				count: countVar.extractVar,
				per_hit: true,
				undispellable: true,
			};
			return [stateEffect, ...debuffBody.toEffects()];
		},
		debuffBody(_jd, varRef, _p, _zzshjm, _sep, _cx, durVar, _m) {
			const effect: Debuff = {
				type: "debuff",
				name: "落星",
				target: "final_damage_reduction",
				value: varRef.extractVar,
				duration: durVar.extractVar,
			};
			return [effect];
		},
		primaryAffix(
			_hddhdtsz,
			varRef1,
			_p1,
			_zdqxz,
			_sep,
			_qyyou,
			varRef2,
			_p2,
			_dglbxhqxz,
		) {
			const shieldEffect: ShieldStrength = {
				type: "shield_strength",
				value: varRef1.extractVar,
			};
			const chanceEffect: Chance = {
				type: "chance",
				value: varRef2.extractVar,
				effect: "no_hp_cost",
			};
			return [shieldEffect, chanceEffect];
		},
		exclusiveAffix(
			_bstzcshshi,
			_sep,
			_rdfcykzzt,
			_sep2,
			_zsbcshts,
			varRef,
			_p,
		) {
			const effect: ConditionalDamageControlled = {
				type: "conditional_damage_controlled",
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
