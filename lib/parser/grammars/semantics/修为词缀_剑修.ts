import type * as ohm from "ohm-js";
import type {
	AttackBuff,
	Effect,
	GuaranteedCrit,
	PerHitEscalationAffix,
	TripleBonus,
} from "../../schema/修为词缀_剑修.js";
import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		affixDescription(child) {
			return child.toEffects();
		},
		jx_cuiYunZheYue(_pre, varRef, _p, _gkldxg) {
			const effect: AttackBuff = {
				type: "attack_buff",
				value: varRef.extractVar,
			};
			return [effect];
		},
		jx_lingXiJiuChong(
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
			const effect: GuaranteedCrit = {
				type: "guaranteed_crit",
				base_multiplier: varRef1.extractVar,
				chance: varRef2.extractVar,
				upgraded_multiplier: varRef3.extractVar,
			};
			return [effect];
		},
		jx_poSuiWuShuang(
			_bst,
			_s,
			_hsbcstts,
			varRef1,
			_p1,
			_gkldxg,
			_s2,
			varRef2,
			_p2,
			_dsh,
			_s3,
			varRef3,
			_p3,
			_dbjsh,
		) {
			const effect: TripleBonus = {
				type: "triple_bonus",
				attack_buff: varRef1.extractVar,
				damage_buff: varRef2.extractVar,
				crit_damage_buff: varRef3.extractVar,
			};
			return [effect];
		},
		jx_xinHuoCuiFeng(
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
			const effect: PerHitEscalationAffix = {
				type: "per_hit_escalation",
				hits: hitsVar.extractVar,
				per_hit: perVar.extractVar,
				max: maxVar.extractVar,
			};
			return [effect];
		},
		_terminal() {
			return [];
		},
		_iter(...children) {
			return children.flatMap((c: ohm.Node) => c.toEffects());
		},
	});
}
