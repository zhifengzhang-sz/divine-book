import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	ExclusiveAffixEffect,
	HealReduction,
	PercentMaxHpDamage,
	PerHitEscalation,
	PrimaryAffixEffect,
	SkillEffect,
} from "../../schema/千锋聚灵剑.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
			skillDescription(_pre, baseAttack, _sep, _perHit, damageWithCap) {
				return [...baseAttack.toEffects(), ...damageWithCap.toEffects()];
			},
			baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
				const effect: BaseAttack = {
					type: "base_attack",
					hits: parseCn(cnHit.sourceString.replace("段", "")),
					total: varRef.extractVar,
				};
				return [effect];
			},
			damageWithCap(dmg, _lp, cap, _rp) {
				const effect: PercentMaxHpDamage = {
					type: "percent_max_hp_damage",
					value: dmg.extractVar,
					cap_vs_monster: cap.extractVar,
				};
				return [effect];
			},
			percentMaxHpDmg(_zc, varRef, _pct, _hp) {
				return varRef.extractVar;
			},
			capVsMonster(_dgw, varRef, _pct, _atk) {
				return varRef.extractVar;
			},
			primaryAffix(_pre, _sep, _xydts, varRef, _pct, _stjc) {
				const effect: PerHitEscalation = {
					type: "per_hit_escalation",
					value: varRef.extractVar,
					stat: "skill_bonus",
					parent: "this",
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
				_zlljd,
				healVar,
				_pct,
				_sep2,
				_qwfbqs,
			) {
				const effect: HealReduction = {
					type: "heal_reduction",
					value: healVar.extractVar,
					state: stateName.extractVar,
					duration: durVar.extractVar,
					undispellable: true,
				};
				return [effect];
			},
		preamble(_) {
			return [];
		},
		cnHitCount(_cn, _d) {
			return [];
		},
		perHit(_) {
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
