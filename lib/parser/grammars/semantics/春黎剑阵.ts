import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	Dot,
	Effect,
	ExclusiveAffixEffect,
	OnDispel,
	PrimaryAffixEffect,
	SkillEffect,
	Summon,
	SummonBuff,
} from "../../schema/春黎剑阵.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
		skillDescription(_pre, baseAttack, _sep, summonClause) {
			return [...baseAttack.toEffects(), ...summonClause.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
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
			const partial = summon.toEffects() as any[];
			const dmgTakenVal = (dmgTaken.toEffects() as any[])[0].value;
			const effect: Summon = {
				type: "summon",
				inherit_stats: partial[0].inherit_stats,
				duration: durVar.extractVar,
				trigger: "on_cast",
				damage_taken_multiplier: dmgTakenVal,
			};
			return [effect];
		},
		summon(_jczs, varRef, _pct, _dsx) {
			return [{ type: "summon", inherit_stats: varRef.extractVar }] as any;
		},
		summonTrigger(_sfstfs, _gap, _gjdf) {
			return [];
		},
		summonDmgTaken(_fssddshwzsd, varRef, _pct) {
			return [{ type: "_extract", value: varRef.extractVar }] as any;
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
			const effect: SummonBuff = {
				type: "summon_buff",
				damage_taken_reduction_to: dmgReductionVar.extractVar,
				damage_buff: dmgIncreaseVar.extractVar,
			};
			return [effect];
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
			const dot: Dot = {
				type: "dot",
				state: stateName.extractVar,
				damage_per_tick: dotVar.extractVar,
				duration: durVar.extractVar,
				tick_interval: "1",
			};
			const onDispel: OnDispel = {
				type: "on_dispel",
				damage: dispelVar.extractVar,
				stun_duration: stunVar.extractVar,
			};
			return [dot, onDispel];
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

