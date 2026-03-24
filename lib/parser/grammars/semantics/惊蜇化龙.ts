import type * as ohm from "ohm-js";

import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
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
			return [{ type: "self_hp_cost", value: varRef.extractVar }];
		},
		baseAttack(_dmbzc, cnHit, _g, varRef, _p, _a) {
			return [
				{
					type: "base_attack",
					hits: parseCn(cnHit.sourceString.replace("段", "")),
					total: varRef.extractVar,
				},
			];
		},
		selfLostHpDmg(_ewdmbzc, varRef, _p, _yssl) {
			return [{ type: "self_lost_hp_damage", value: varRef.extractVar }];
		},
		skillDmgBuff(_tszs, varRef, _p, _stshjs) {
			return [{ type: "self_buff", skill_damage_increase: varRef.extractVar }];
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
			return [
				{
					type: "percent_max_hp_affix",
					value: varRef.extractVar,
					state: stateName.extractVar,
					trigger_stack: cnNum.extractVar,
				},
			];
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
			return [
				{
					type: "per_debuff_true_damage",
					value: varRef2.extractVar,
					max: varRef3.extractVar,
				},
			];
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
			return [
				{ type: "self_lost_hp_damage", value: varRef1.extractVar },
				{ type: "damage_increase", value: varRef2.extractVar },
			];
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
