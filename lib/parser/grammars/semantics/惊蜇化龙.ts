import type * as ohm from "ohm-js";

import type {
	DamageIncrease,
	Effect,
	PerDebuffStackTrueDamage,
	PercentMaxHpAffix,
	SelfBuff,
	SelfHpCost,
	SelfLostHpDamage,
	SelfLostHpDamageIncrease,
} from "../../schema/惊蜇化龙.js";
import type { BaseAttack } from "../../schema/千锋聚灵剑.js";
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
			skillDmg,
			_s4,
			_dur,
		) {
			return [
				...hpCost.toEffects(),
				...baseAttack.toEffects(),
				...selfLostHp.toEffects(),
				...skillDmg.toEffects(),
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
		skillDmgBuff(_tszs, varRef, _p, _stshjs) {
			const effect: SelfBuff = {
				type: "self_buff",
				skill_damage_increase: varRef.extractVar,
			};
			return [effect];
		},
		duration(_cx, _varRef, _m) {
			return [];
		},
		primaryAffix(
			_bjmdjmb,
			stateName,
			_colon,
			_mdj,
			cnNum,
			_cbhxhbzc,
			varRef,
			_p,
			_zdqxzsh,
		) {
			const effect: PercentMaxHpAffix = {
				type: "percent_max_hp_affix",
				value: varRef.extractVar,
				state: stateName.extractVar,
				trigger_stack: cnNum.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(part1, _sep, part2) {
			return [...part1.toEffects(), ...part2.toEffects()];
		},
		exclusiveAffix_1(
			_pre,
			_sep,
			_mbmy,
			_varRef1,
			_c,
			_sep2,
			_hsbcew,
			varRef2,
			_p2,
			_zdqxz,
			_sep3,
			_zdzc,
			varRef3,
			_p3,
			_zdqxz2,
		) {
			const effect: PerDebuffStackTrueDamage = {
				type: "per_debuff_stack_true_damage",
				per_stack: varRef2.extractVar,
				max: varRef3.extractVar,
			};
			return [effect];
		},
		exclusiveAffix_2(
			_zstwdtjx,
			_colon,
			_bstfj,
			varRef1,
			_p1,
			_sep,
			_bszc,
			varRef2,
			_p2,
		) {
			const lostHpEffect: SelfLostHpDamageIncrease = {
				type: "self_lost_hp_damage",
				value: varRef1.extractVar,
			};
			const dmgEffect: DamageIncrease = {
				type: "damage_increase",
				value: varRef2.extractVar,
			};
			return [lostHpEffect, dmgEffect];
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
