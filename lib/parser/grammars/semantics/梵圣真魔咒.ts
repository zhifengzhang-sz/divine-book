import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	Dot,
	DotFrequencyIncrease,
	Effect,
	ExclusiveAffixEffect,
	PrimaryAffixEffect,
	SkillEffect,
	StateAdd,
} from "../../schema/梵圣真魔咒.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
			skillDescription(_pre, baseAttack, _sep, perHitState, _colon, stateBody) {
				return [
					...baseAttack.toEffects(),
					...perHitState.toEffects(),
					...stateBody.toEffects(),
				];
			},
			baseAttack(_dqzc, cnHit, _g, varRef, _p, _a) {
				const effect: BaseAttack = {
					type: "base_attack",
					hits: parseCn(cnHit.sourceString.replace("段", "")),
					total: varRef.extractVar,
				};
				return [effect];
			},
			perHitStateAdd(_mdgjhwmbtj, countVar, _c, stateName) {
				const effect: StateAdd = {
					type: "state_add",
					state: stateName.extractVar,
					count: countVar.extractVar,
					per_hit: true,
				};
				return [effect];
			},
			stateBody(dot, _sep, durNode) {
				const effects = dot.toEffects() as SkillEffect[];
				const durMatch = durNode.sourceString.match(/(\d+(?:\.\d+)?)/);
				const dur = durMatch ? Number(durMatch[1]) : undefined;
				for (const e of effects) {
					if (e.type === "dot" && dur !== undefined) {
						(e as Dot).duration = dur;
					}
				}
				return effects;
			},
			dotCurrentHp(_mmdmbzc, varRef, _p, _dqqxzdsh) {
				const effect: Dot = {
					type: "dot",
					tick_interval: "1",
					percent_current_hp: varRef.extractVar,
				};
				return [effect];
			},
			duration(_cx, _varRef, _m) {
				return [];
			},
			primaryAffix(
				_mbmhd,
				cnNumOrDigit,
				_ge,
				state1,
				_sep,
				_hewcx,
				durVar,
				_mde,
				state2,
				_colon,
				_mmzc,
				varRef,
				_p,
				_yslqxzsh,
			) {
				const effect: Dot = {
					type: "dot",
					name: state2.extractVar,
					tick_interval: "1",
					percent_lost_hp: varRef.extractVar,
					duration: durVar.extractVar,
					trigger_stack: cnNumOrDigit.extractVar,
					source_state: state1.extractVar,
				};
				return [effect];
			},
			exclusiveAffix(_sbstcjdcxshxg, varRef, _p) {
				const effect: DotFrequencyIncrease = {
					type: "dot_frequency_increase",
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
		},
	);
}
