import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, _sp, crossSkillDmg) {
			return [...baseAttack.toEffects(), ...crossSkillDmg.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		crossSkillDamage(_stmz, _sep, _ewfj, varRef, _pct, _mbdqqxz) {
			return [{ type: "percent_current_hp_damage", value: varRef.extractVar, accumulation: "cross_skill", per_prior_hit: true }];
		},
		exclusiveAffix(_bstgjmb, varRef1, _pct1, _stsh, _sep, _dmbdbst, varRef2, _pct2, _stshjm) {
			return [{ type: "skill_damage_increase_affix", value: varRef1.extractVar }, { type: "debuff", target: "enemy_skill_damage_reduction", value: varRef2.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
