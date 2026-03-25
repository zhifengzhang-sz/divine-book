import type * as ohm from "ohm-js";

import type {
	DamageIncrease,
	DotExtraPerTick,
	Effect,
	ExclusiveAffixEffect,
	NoShieldDoubleDamage,
	PercentMaxHpDamageIncrease,
	PrimaryAffixEffect,
	ShieldDestroyDamage,
	ShieldDestroyDot,
	SkillEffect,
	StateRef,
} from "../../schema/皓月剑诀.js";
import type { BaseAttack } from "../../schema/千锋聚灵剑.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
		skillDescription(_pre, baseAttack, _sep, stateClause) {
			return [...baseAttack.toEffects(), ...stateClause.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		stateClause(_gap, _huode, stateName, _colon, stateBody) {
			const effects = stateBody.toEffects() as any[];
			const ref: StateRef = { type: "state_ref", state: stateName.extractVar };
			return [ref, ...effects];
		},
		stateBody(
			_perHit,
			shieldDestroy,
			_sep1,
			noShieldDouble,
			_sep2,
			_stateName,
			_maxStacks,
			_sep3,
			_duration,
		) {
			return [...shieldDestroy.toEffects(), ...noShieldDouble.toEffects()];
		},
		perHit(_lit) {
			return [];
		},
		shieldDestroy(
			_ymdf,
			shieldCount,
			_gehd,
			_bew,
			dmgVar,
			_pct,
			_dfmxhp,
			_lp,
			cap,
			_rp,
		) {
			const effect: ShieldDestroyDamage = {
				type: "shield_destroy_damage",
				shields_per_hit: shieldCount.extractVar,
				percent_max_hp: dmgVar.extractVar,
				cap_vs_monster: cap.extractVar,
			};
			return [effect];
		},
		noShieldDouble(_lit, _lp, cap, _rp) {
			const effect: NoShieldDoubleDamage = {
				type: "no_shield_double_damage",
				cap_vs_monster: cap.extractVar,
			};
			return [effect];
		},
		capVsMonster(_dgwzdzc, varRef, _pct, _gkldsh) {
			return varRef.extractVar;
		},
		maxStacks(_sx, _varRef, _ceng) {
			return [];
		},
		duration(_cx, _varRef, _miao) {
			return [];
		},
		primaryAffix(
			stateName,
			_mei,
			intervalVar,
			_mdmbzc,
			_ymhd,
			_xgs,
			dmgVar,
			_pct,
			_gkldsh,
			_parenOpt,
		) {
			const effect: ShieldDestroyDot = {
				type: "shield_destroy_dot",
				state: stateName.extractVar,
				interval: intervalVar.extractVar,
				value: dmgVar.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(part1, _sep, part2) {
			return [...part1.toEffects(), ...part2.toEffects()];
		},
		exclusiveAffix_1(_pre, _sep, _ewzc, varRef, _pct, _yssl) {
			const effect: DotExtraPerTick = { type: "dot_extra_per_tick", value: varRef.extractVar };
			return [effect];
		},
		exclusiveAffix_2(_bstg, varRef1, _pct1, _sep, _bing, varRef2, _pct2) {
			const e1: PercentMaxHpDamageIncrease = { type: "percent_max_hp_damage", value: varRef1.extractVar };
			const e2: DamageIncrease = { type: "damage_increase", value: varRef2.extractVar };
			return [e1, e2];
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
