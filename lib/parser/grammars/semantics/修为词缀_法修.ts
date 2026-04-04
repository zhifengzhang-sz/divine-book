import type * as ohm from "ohm-js";
import type {
	DamageBuff,
	Effect,
	FinalDamageMultiplier,
	HealingBuff,
	ProbabilityToCertain,
	RandomBuff,
} from "../../schema/修为词缀_法修.js";
import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		affixDescription(child) {
			return child.toEffects();
		},
		fx_changShengTianZe(_pre, varRef, _p) {
			const effect: HealingBuff = {
				type: "healing_buff",
				value: varRef.extractVar,
			};
			return [effect];
		},
		fx_mingWangZhiLu(_bst, _s, _hsbcstdzzshjs, varRef, _p) {
			const effect: FinalDamageMultiplier = {
				type: "final_damage_multiplier",
				value: varRef.extractVar,
			};
			return [effect];
		},
		fx_tianMingYouGui(_sbstd, _s, _bsbstzcdshts, varRef, _p) {
			const e1: ProbabilityToCertain = {
				type: "probability_to_certain",
			};
			const e2: DamageBuff = {
				type: "damage_buff",
				value: varRef.extractVar,
			};
			return [e1, e2];
		},
		fx_jingXingTianYou(
			_bst,
			_s,
			_hsbcsthdxyry,
			_colon,
			_gjts,
			v1,
			_p1,
			_s2,
			_zmshts,
			v2,
			_p2,
			_s3,
			_zcdsshts,
			v3,
			_p3,
		) {
			const effect: RandomBuff = {
				type: "random_buff",
				attack: v1.extractVar,
				crit_damage: v2.extractVar,
				damage_buff: v3.extractVar,
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
