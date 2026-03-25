import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	CounterDebuff,
	CounterDebuffUpgrade,
	CrossSlotDebuff,
	Dot,
	DotDamageIncrease,
	Effect,
	ExclusiveAffixEffect,
	PrimaryAffixEffect,
	SkillEffect,
	StateAdd,
} from "../../schema/大罗幻诀.js";
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
				mainBody,
				_period,
				_mainDur,
				_ws,
				child1,
				_ws2,
				child2,
			) {
				const states = mainBody.toEffects() as CounterDebuff[];
				return [
					...baseAttack.toEffects(),
					{ type: "state_add", state: stateAdd.extractVar } satisfies StateAdd,
					...states,
					...child1.toEffects(),
					...child2.toEffects(),
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
				return stateName.extractVar;
			},
			mainBody(counterDebuff, _sep, _maxStacks) {
				return counterDebuff.toEffects();
			},
			counterDebuff(
				_sdshshi,
				_sep,
				_geyou,
				chanceVar,
				_p,
				_gldjgftj,
				countVar,
				_c,
				firstName,
				_yus,
				conjStateNames,
			) {
				const stateNames: string[] = [firstName.extractVar];
				for (const child of conjStateNames.children) {
					stateNames.push(child.extractVar);
				}
				// Emit one counter_debuff per state — raw text says each triggers independently
				return stateNames.map((name): CounterDebuff => ({
					type: "counter_debuff",
					trigger: "on_attacked",
					chance: chanceVar.extractVar,
					count: countVar.extractVar,
					name,
				}));
			},
			maxStacks(_gzzddj, _varRef, _c) {
				return [];
			},
			mainDuration(_sn, _cx, _varRef, _m) {
				return [];
			},
			childBlock(stateName, _colon, childBody) {
				const effects = childBody.toEffects() as Dot[];
				for (const e of effects) e.name = stateName.extractVar;
				return effects;
			},
			childBody_currentHp(
				_mei,
				intervalVar,
				_mewzc,
				dmgVar,
				_p,
				_dqqxzdsh,
				_sep,
				_cx,
				durVar,
				_m,
			) {
				const effect: Dot = {
					type: "dot",
					name: "", // filled in by childBlock
					tick_interval: intervalVar.extractVar,
					percent_current_hp: dmgVar.extractVar,
					duration: durVar.extractVar,
				};
				return [effect];
			},
			childBody_lostHp(
				_mei,
				intervalVar,
				_mewzc,
				dmgVar,
				_p,
				_yssl,
				_sep,
				_cx,
				durVar,
				_m,
			) {
				const effect: Dot = {
					type: "dot",
					name: "", // filled in by childBlock
					tick_interval: intervalVar.extractVar,
					percent_lost_hp: dmgVar.extractVar,
					duration: durVar.extractVar,
				};
				return [effect];
			},
			primaryAffix(
				stateName,
				_ztxfj,
				varRef1,
				_p1,
				_sep,
				_sdgjshi,
				_sep2,
				_ewgmb,
				state2,
				_colon,
				_zzshjm,
				_jdOrJd,
				varRef2,
				_p2,
				_sep3,
				_cx,
				durVar,
				_m,
			) {
				const upgrade: CounterDebuffUpgrade = {
					type: "counter_debuff_upgrade",
					state: stateName.extractVar,
					value: varRef1.extractVar,
				};
				const debuff: CrossSlotDebuff = {
					type: "cross_slot_debuff",
					name: state2.extractVar,
					target: "final_damage_reduction",
					value: varRef2.extractVar,
					duration: durVar.extractVar,
					trigger: "on_attacked",
				};
				return [upgrade, debuff];
			},
			exclusiveAffix(_sbstcjdcxshsx, varRef, _p) {
				const effect: DotDamageIncrease = {
					type: "dot_damage_increase",
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
