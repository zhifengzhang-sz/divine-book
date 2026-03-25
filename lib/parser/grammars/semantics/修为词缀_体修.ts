import type * as ohm from "ohm-js";
import type { Effect, MinLostHpThreshold } from "../../schema/修为词缀_体修.js";
import type {
	DamageReductionDuringCast,
	FlatExtraDamage,
	PerEnemyLostHp,
	ShieldValueIncrease,
} from "../../schema/通用词缀.js";
import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		affixDescription(child) {
			return child.toEffects();
		},
		tx_jinGangHuTi(_bst, _s, _hzsfqjts, varRef, _p, _dshjm) {
			const effect: DamageReductionDuringCast = {
				type: "damage_reduction_during_cast",
				value: varRef.extractVar,
			};
			return [effect];
		},
		tx_poMieTianGuang(_bst, _s, _hsbcstew, varRef, _p, _gkldsh) {
			const effect: FlatExtraDamage = {
				type: "flat_extra_damage",
				value: varRef.extractVar,
			};
			return [effect];
		},
		tx_qingYunLingDun(_pre, varRef, _p) {
			const effect: ShieldValueIncrease = {
				type: "shield_value_increase",
				value: varRef.extractVar,
			};
			return [effect];
		},
		tx_tanLangTunXing(
			_bst,
			_s1,
			_dfmdss,
			perVar,
			_p1,
			_zdqxz,
			_s2,
			_hsbcshts,
			varRef,
			_p2,
		) {
			const effect: PerEnemyLostHp = {
				type: "per_enemy_lost_hp",
				per_percent: perVar.extractVar,
				value: varRef.extractVar,
			};
			return [effect];
		},
		tx_yiZhuiShenYuan(_sbst, varRef1, _p1, _js, _s, _bsbcshts, varRef2, _p2) {
			const effect: MinLostHpThreshold = {
				type: "min_lost_hp_threshold",
				min_percent: varRef1.extractVar,
				damage_increase: varRef2.extractVar,
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
