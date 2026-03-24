import type * as ohm from "ohm-js";

import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
		affixDescription(child) {
			return child.toEffects();
		},
		ty_zhouShu(_pre, varRef, _p) {
			return [{ type: "debuff_strength", value: varRef.extractVar }];
		},
		ty_qingLing(_pre, varRef, _p) {
			return [{ type: "buff_strength", value: varRef.extractVar }];
		},
		ty_yeYan(_pre, varRef, _p) {
			return [{ type: "all_state_duration", value: varRef.extractVar }];
		},
		ty_jiXia(_bst, _s1, _rdfcy, _s2, _zsbcshts, varRef, _p) {
			return [
				{ type: "conditional_damage_controlled", value: varRef.extractVar },
			];
		},
		ty_poZhu(
			_bst,
			_s1,
			_mzc,
			hitsVar,
			_dsh,
			_s2,
			_syssshts,
			perVar,
			_p1,
			_s3,
			_zdts,
			maxVar,
			_p2,
		) {
			return [
				{
					type: "per_hit_escalation",
					hits: hitsVar.extractVar,
					per_hit: perVar.extractVar,
					max: maxVar.extractVar,
				},
			];
		},
		ty_jinTang(_bst, _s, _hzsfqjts, varRef, _p, _dshjm) {
			return [
				{ type: "damage_reduction_during_cast", value: varRef.extractVar },
			];
		},
		ty_nuMu(
			_bst,
			_s1,
			_rdfqxzdy,
			threshVar,
			_p1,
			_s2,
			_zsbcshts,
			dmgVar,
			_p2,
			_s3,
			_qbjlts,
			critVar,
			_p3,
		) {
			return [
				{
					type: "execute_conditional",
					hp_threshold: threshVar.extractVar,
					damage_increase: dmgVar.extractVar,
					crit_rate_increase: critVar.extractVar,
				},
			];
		},
		ty_guiYin(_dbstcjd, _s, _ewzc, varRef, _p, _yssl) {
			return [{ type: "dot_extra_per_tick", value: varRef.extractVar }];
		},
		ty_fuYin(
			_bst,
			_s1,
			_hsbcsthdxyry1gjc,
			_colon,
			_gjts,
			v1,
			_p1,
			_s2,
			_zmshts,
			_v2,
			_p2,
			_s3,
			_zcdsshts,
			_v3,
			_p3,
		) {
			return [{ type: "random_buff", attack: v1.extractVar }];
		},
		ty_zhanYi(_bst, _s1, _zsmdss, _s2, _hsbcshts, varRef, _p) {
			return [{ type: "per_self_lost_hp", value: varRef.extractVar }];
		},
		ty_zhanYue(_bst, _s, _hsbcstew, varRef, _p, _gkldsh) {
			return [{ type: "flat_extra_damage", value: varRef.extractVar }];
		},
		ty_tunHai(_bst, _s1, _dfmdss, _zhiOpt, _qxz, _s2, _hsbcshts, varRef, _p) {
			return [
				{
					type: "per_enemy_lost_hp",
					per_percent: "1",
					value: varRef.extractVar,
				},
			];
		},
		ty_lingDun(_pre, varRef, _p) {
			return [{ type: "shield_value_increase", value: varRef.extractVar }];
		},
		ty_lingWei(_bst, _s, _sxygsfs, varRef, _p, _dstshjs) {
			return [{ type: "next_skill_buff", value: varRef.extractVar }];
		},
		ty_cuiShan(_bst, _s, _hsbcstts, varRef, _p, _gkldxg) {
			return [{ type: "attack_bonus", value: varRef.extractVar }];
		},
		ty_tongMing(
			_sbstbdhx,
			varRef1,
			_bei1,
			_s,
			_byou,
			varRef2,
			_p,
			_gltsz,
			varRef3,
			_bei2,
		) {
			return [
				{
					type: "guaranteed_resonance",
					base_multiplier: varRef1.extractVar,
					chance: varRef2.extractVar,
					upgraded_multiplier: varRef3.extractVar,
				},
			];
		},
		_terminal() {
			return [];
		},
		_iter(...children) {
			return children.flatMap((c: ohm.Node) => c.toEffects());
		},
	});
}
