import type * as ohm from "ohm-js";

import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<any[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, summonClause) {
			return [...baseAttack.toEffects(), ...summonClause.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [
				{
					type: "base_attack",
					hits: parseCn(cnHit.sourceString.replace("段", "")),
					total: varRef.extractVar,
				},
			];
		},
		summonClause(
			_intro,
			durVar,
			_miaoDeFenshen,
			_sep1,
			summon,
			_period,
			_trigger,
			_sep2,
			dmgTaken,
		) {
			const effects = summon.toEffects() as any[];
			effects[0].duration = durVar.extractVar;
			effects[0].trigger = "on_cast";
			effects[0].damage_taken_multiplier = (
				dmgTaken.toEffects() as any[]
			)[0].value;
			return effects;
		},
		summon(_jczs, varRef, _pct, _dsx) {
			return [{ type: "summon", value: varRef.extractVar }];
		},
		summonTrigger(_sfstfs, _gap, _gjdf) {
			return [];
		},
		summonDmgTaken(_fssddshwzsd, varRef, _pct) {
			return [{ type: "_extract", value: varRef.extractVar }];
		},
		primaryAffix(
			_fssddsh,
			_deOpt,
			_shjdz,
			dmgReductionVar,
			_pct1,
			_sep,
			_sp,
			_zcdshjz,
			dmgIncreaseVar,
			_pct2,
		) {
			return [
				{
					type: "summon_buff",
					damage_taken: dmgReductionVar.extractVar,
					damage_dealt: dmgIncreaseVar.extractVar,
				},
			];
		},
		exclusiveAffix(
			_pre,
			_sep,
			_hddftj,
			durVar,
			_miaoDe,
			stateName,
			_colon,
			_mmsd,
			dotVar,
			_pct1,
			_gkldsh,
			_sep2,
			_rbqs,
			_sep3,
			_ljsd,
			dispelVar,
			_pct2,
			_gkldsh2,
			_sep4,
			_byxz,
			stunVar,
			_miao,
		) {
			return [
				{
					type: "dot",
					state: stateName.extractVar,
					damage_per_tick: dotVar.extractVar,
					duration: durVar.extractVar,
					tick_interval: "1",
				},
				{
					type: "on_dispel",
					value: dispelVar.extractVar,
					stun_duration: stunVar.extractVar,
				},
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
