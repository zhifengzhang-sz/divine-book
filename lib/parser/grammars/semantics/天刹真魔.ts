import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	CounterBuff,
	DebuffOnHit,
	Effect,
	ExclusiveAffixEffect,
	PrimaryAffixEffect,
	SelfBuffExtra,
	SelfBuffHealing,
	SkillEffect,
	StateAdd,
} from "../../schema/天刹真魔.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
			skillDescription(
				_pre,
				baseAttack,
				_sep,
				stateAdd,
				_colon,
				stateBody,
				_ws,
				_mods,
			) {
				return [
					...baseAttack.toEffects(),
					...stateAdd.toEffects(),
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
				const effect: StateAdd = {
					type: "state_add",
					state: stateName.extractVar,
				};
				return [effect];
			},
			stateBody(counterBuff, _lp, _noHeal, _rp) {
				return counterBuff.toEffects();
			},
			counterBuffHeal(_sdshshi, _sep, _zshfgcsh, varRef, _p, _dqxz) {
				const effect: CounterBuff = {
					type: "counter_buff",
					trigger: "on_attacked",
					heal_on_damage_taken: varRef.extractVar,
					no_healing_bonus: true,
				};
				return [effect];
			},
			noHealingBonus(_lit) {
				return [];
			},
			stateModifiers(_sn, _yj) {
				return [];
			},
			primaryAffix(
				_zai,
				state1,
				_ztxsdgjshi,
				_sep,
				_wmbfj,
				state2,
				_colon,
				_mei,
				_intervalVar,
				_xlljdmb,
				v1,
				_p1,
				_zml,
				_sep2,
				_v2,
				_p2,
				_bjsh,
				_sep3,
				_v3,
				_p3,
				_bjl,
				_sep4,
				_v4,
				_p4,
				_gkl,
				_sep5,
				_v5,
				_p5,
				_zzshjm,
				_sep6,
				_cx,
				durVar,
				_m,
			) {
				const effect: SelfBuffExtra = {
					type: "self_buff_extra",
					state: state1.extractVar,
					target_state: state2.extractVar,
					crit_rate: v1.extractVar,
					duration: durVar.extractVar,
				};
				return [effect];
			},
			exclusiveAffix(part1, _sep, part2) {
				return [...part1.toEffects(), ...part2.toEffects()];
			},
			exclusiveAffix_1(
				_pre,
				_sep,
				_rdfyjyzt,
				_sep2,
				_ztszs,
				varRef,
				_p,
				_dzll,
				_sep3,
				_cx,
				durVar,
				_m,
			) {
				const effect: SelfBuffHealing = {
					type: "self_buff",
					healing_bonus: varRef.extractVar,
					duration: durVar.extractVar,
					condition: "enemy_has_debuff",
				};
				return [effect];
			},
			exclusiveAffix_2(
				_zstwd,
				_colon,
				_bstmczcshs,
				_sep,
				_jddf,
				varRef,
				_p,
				_zzshjm,
				_sep2,
				_cx,
				durVar,
				_m,
			) {
				const effect: DebuffOnHit = {
					type: "debuff",
					target: "final_damage_reduction",
					value: varRef.extractVar,
					duration: durVar.extractVar,
					trigger: "on_hit",
				};
				return [effect];
			},
			preamble(_) {
				return [];
			},
			cnHitCount(_cn, _d) {
				return [];
			},
			ws(_) {
				return [];
			},
			_terminal() {
				return [];
			},
			_iter(...children) {
				return children.flatMap((c: ohm.Node) => c.toEffects());
			},
		},
	);
}
