import type * as ohm from "ohm-js";

import type {
	CrossSlotDebuff,
	DebuffStackChance,
	Effect,
	HealEchoDamage,
	PeriodicHeal,
	SelfHeal,
	Shield,
	StateRef,
} from "../../schema/周天星元.js";
import type { BaseAttack } from "../../schema/千锋聚灵剑.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(
			_pre,
			selfHeal,
			_sep1,
			_mid,
			baseAttack,
			_sep2,
			healEcho,
			_sep3,
			stateClause,
		) {
			return [
				...selfHeal.toEffects(),
				...baseAttack.toEffects(),
				...healEcho.toEffects(),
				...stateClause.toEffects(),
			];
		},
		selfHeal(_wzshuifu, varRef, _pct, _zdqxz) {
			const effect: SelfHeal = { type: "self_heal", value: varRef.extractVar };
			return [effect];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		healEcho(_fjlmqjshfqxzdedsh) {
			const effect: HealEchoDamage = { type: "heal_echo_damage", ratio: 1 };
			return [effect];
		},
		stateClause(_gap, stateName, _colon, stateBody) {
			const ref: StateRef = { type: "state_ref", state: stateName.extractVar };
			return [ref, ...stateBody.toEffects()];
		},
		stateBody(
			_mmhf,
			perTickVar,
			_pct1,
			_qxz,
			_sep,
			_gjhf,
			totalVar,
			_pct2,
			_dzdqxz,
		) {
			const effect: PeriodicHeal = {
				type: "self_heal",
				per_tick: perTickVar.extractVar,
				total: totalVar.extractVar,
				tick_interval: 1,
			};
			return [effect];
		},
		primaryAffix(
			_stateName,
			_mchfqxs,
			_gap,
			varRef,
			_pct,
			_zszdqxzdhd,
			_sep,
			_cx,
			durVar,
			_miao,
		) {
			const effect: Shield = {
				type: "shield",
				value: varRef.extractVar,
				duration: durVar.extractVar,
				source: "self_max_hp",
				trigger: "per_tick",
			};
			return [effect];
		},
		exclusiveAffix(part1, _sep, part2) {
			return [...part1.toEffects(), ...part2.toEffects()];
		},
		exclusiveAffix_1(_pre, _sep, _you, varRef, _pct, _glewdfj1c) {
			const effect: DebuffStackChance = { type: "debuff_stack_chance", value: varRef.extractVar };
			return [effect];
		},
		exclusiveAffix_2(
			_rbst,
			_gap,
			_zyztshi,
			_sep,
			_zhewdfm,
			stateName,
			_colon,
			_dfhjsbc,
			varRef,
			_bei,
			_sep2,
			_dchsj,
		) {
			const effect: CrossSlotDebuff = {
				type: "cross_slot_debuff",
				state: stateName.extractVar,
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
		midProse(_) {
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
