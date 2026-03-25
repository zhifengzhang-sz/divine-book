import type * as ohm from "ohm-js";

import type {
	Effect,
	OnShieldExpire,
	PeriodicDispel,
	SelfBuff,
	SelfHpCostPerHit,
	SelfHpFloor,
	SelfLostHpDamage,
	StateAddPerHit,
} from "../../schema/九重天凤诀.js";
import type { BaseAttack } from "../../schema/千锋聚灵剑.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		skillDescription(
			_pre,
			baseAttack,
			_s1,
			perHitLostHp,
			_s2,
			perHitCostState,
			_colon,
			stateBody,
		) {
			return [
				...baseAttack.toEffects(),
				...perHitLostHp.toEffects(),
				...perHitCostState.toEffects(),
				...stateBody.toEffects(),
			];
		},
		baseAttack(_dmbzc, cnHit, _g, varRef, _p, _a) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		perHitSelfLostHpDmg(_mdgjew, varRef, _p, _yssl) {
			const effect: SelfLostHpDamage = {
				type: "self_lost_hp_damage",
				value: varRef.extractVar,
				per_hit: true,
			};
			return [effect];
		},
		perHitCostAndState(
			_mdgjhxhzs,
			costVar,
			_p,
			_dqqxzbwzstj,
			countVar,
			_c,
			stateName,
		) {
			const costEffect: SelfHpCostPerHit = {
				type: "self_hp_cost",
				value: costVar.extractVar,
				per_hit: true,
			};
			const stateEffect: StateAddPerHit = {
				type: "state_add",
				state: stateName.extractVar,
				count: countVar.extractVar,
				per_hit: true,
			};
			return [costEffect, stateEffect];
		},
		stateBody(_cxqjtszs, varRef, _p, _dgklybkl, _sep, _cx, durVar, _m) {
			const effect: SelfBuff = {
				type: "self_buff",
				attack_bonus: varRef.extractVar,
				crit_rate: varRef.extractVar,
				duration: durVar.extractVar,
			};
			return [effect];
		},
		primaryAffix(
			_bjzcshqyxqsmb,
			cnNum,
			_gzyxg,
			_sep,
			_sfbjshqxbhjz,
			varRef,
			_p,
			_yx,
		) {
			const dispelEffect: PeriodicDispel = {
				type: "periodic_dispel",
				count: cnNum.extractVar,
			};
			const floorEffect: SelfHpFloor = {
				type: "self_hp_floor",
				value: varRef.extractVar,
			};
			return [dispelEffect, floorEffect];
		},
		exclusiveAffix(_dbstcjdhdxsshi, _sep, _hddfeewzc, varRef, _p, _dsh) {
			const effect: OnShieldExpire = {
				type: "on_shield_expire",
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
