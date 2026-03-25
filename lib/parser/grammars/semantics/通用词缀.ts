import type * as ohm from "ohm-js";

import type {
	AllStateDuration,
	AttackBonus,
	BuffStrength,
	ConditionalDamageControlled,
	DamageReductionDuringCast,
	DebuffStrength,
	DotExtraPerTick,
	Effect,
	ExecuteConditional,
	FlatExtraDamage,
	GuaranteedResonance,
	NextSkillBuff,
	PerEnemyLostHp,
	PerHitEscalationAffix,
	PerSelfLostHp,
	RandomBuff,
	ShieldValueIncrease,
} from "../../schema/通用词缀.js";
import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<Effect[]>("toEffects", {
		affixDescription(child) {
			return child.toEffects();
		},
		ty_zhouShu(_pre, varRef, _p) {
			const effect: DebuffStrength = {
				type: "debuff_strength",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_qingLing(_pre, varRef, _p) {
			const effect: BuffStrength = {
				type: "buff_strength",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_yeYan(_pre, varRef, _p) {
			const effect: AllStateDuration = {
				type: "all_state_duration",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_jiXia(_bst, _s1, _rdfcy, _s2, _zsbcshts, varRef, _p) {
			const effect: ConditionalDamageControlled = {
				type: "conditional_damage_controlled",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_poZhu(
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
		ty_jinTang(_bst, _s, _hzsfqjts, varRef, _p, _dshjm) {
			const effect: DamageReductionDuringCast = {
				type: "damage_reduction_during_cast",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_nuMu(
			_bst,
			_s1,
			_rdfqxzdy,
			threshVar,
			_p1,
			_s2,
			_zsbcshts,
			dmgVar,
			_p2,
			_s3,
			_qbjlts,
			critVar,
			_p3,
		) {
			const effect: ExecuteConditional = {
				type: "execute_conditional",
				hp_threshold: threshVar.extractVar,
				damage_increase: dmgVar.extractVar,
				crit_rate_increase: critVar.extractVar,
			};
			return [effect];
		},
		ty_guiYin(_dbstcjd, _s, _ewzc, varRef, _p, _yssl) {
			const effect: DotExtraPerTick = {
				type: "dot_extra_per_tick",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_fuYin(
			_bst,
			_s1,
			_hsbcsthdxyry1gjc,
			_colon,
			_gjts,
			v1,
			_p1,
			_s2,
			_zmshts,
			_v2,
			_p2,
			_s3,
			_zcdsshts,
			_v3,
			_p3,
		) {
			const effect: RandomBuff = {
				type: "random_buff",
				attack: v1.extractVar,
			};
			return [effect];
		},
		ty_zhanYi(_bst, _s1, _zsmdss, _s2, _hsbcshts, varRef, _p) {
			const effect: PerSelfLostHp = {
				type: "per_self_lost_hp",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_zhanYue(_bst, _s, _hsbcstew, varRef, _p, _gkldsh) {
			const effect: FlatExtraDamage = {
				type: "flat_extra_damage",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_tunHai(_bst, _s1, _dfmdss, _zhiOpt, _qxz, _s2, _hsbcshts, varRef, _p) {
			const effect: PerEnemyLostHp = {
				type: "per_enemy_lost_hp",
				per_percent: "1",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_lingDun(_pre, varRef, _p) {
			const effect: ShieldValueIncrease = {
				type: "shield_value_increase",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_lingWei(_bst, _s, _sxygsfs, varRef, _p, _dstshjs) {
			const effect: NextSkillBuff = {
				type: "next_skill_buff",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_cuiShan(_bst, _s, _hsbcstts, varRef, _p, _gkldxg) {
			const effect: AttackBonus = {
				type: "attack_bonus",
				value: varRef.extractVar,
			};
			return [effect];
		},
		ty_tongMing(
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
			const effect: GuaranteedResonance = {
				type: "guaranteed_resonance",
				base_multiplier: varRef1.extractVar,
				chance: varRef2.extractVar,
				upgraded_multiplier: varRef3.extractVar,
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
