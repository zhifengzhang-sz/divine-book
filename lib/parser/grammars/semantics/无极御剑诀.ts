import type * as ohm from "ohm-js";

import type {
	Effect,
	EnemySkillDamageReduction,
	ExclusiveAffixEffect,
	PercentCurrentHpDamage,
	SkillDamageIncreaseAffix,
	SkillEffect,
} from "../../schema/无极御剑诀.js";
import type { BaseAttack } from "../../schema/千锋聚灵剑.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<(SkillEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
		skillDescription(_pre, baseAttack, _sep, _sp, crossSkillDmg) {
			return [...baseAttack.toEffects(), ...crossSkillDmg.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			const effect: BaseAttack = {
				type: "base_attack",
				hits: parseCn(cnHit.sourceString.replace("段", "")),
				total: varRef.extractVar,
			};
			return [effect];
		},
		crossSkillDamage(_stmz, _sep, _ewfj, varRef, _pct, _mbdqqxz) {
			const effect: PercentCurrentHpDamage = {
				type: "percent_current_hp_damage",
				value: varRef.extractVar,
				accumulation: "cross_skill",
				per_prior_hit: true,
			};
			return [effect];
		},
		exclusiveAffix(
			_bstgjmb,
			varRef1,
			_pct1,
			_stsh,
			_sep,
			_dmbdbst,
			varRef2,
			_pct2,
			_stshjm,
		) {
			const e1: SkillDamageIncreaseAffix = { type: "skill_damage_increase_affix", value: varRef1.extractVar };
			const e2: EnemySkillDamageReduction = {
				type: "debuff",
				target: "enemy_skill_damage_reduction",
				value: varRef2.extractVar,
			};
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
