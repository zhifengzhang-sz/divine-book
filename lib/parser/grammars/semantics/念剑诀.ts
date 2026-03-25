import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	BuffDuration,
	Effect,
	ExclusiveAffixEffect,
	ExtendedDot,
	PeriodicEscalation,
	PrimaryAffixEffect,
	SkillEffect,
	Untargetable,
} from "../../schema/念剑诀.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<(SkillEffect | PrimaryAffixEffect | ExclusiveAffixEffect)[]>(
		"toEffects",
		{
		skillDescription(
			_pre,
			untargetable,
			_sep1,
			_mid,
			baseAttack,
			_sep2,
			periodicEsc,
		) {
			return [
				...untargetable.toEffects(),
				...baseAttack.toEffects(),
				...periodicEsc.toEffects(),
			];
		},
		untargetable(_zai, varRef, _mnbkbxz) {
			const effect: Untargetable = { type: "untargetable", value: varRef.extractVar };
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
		periodicEscalation(
			_gap1,
			_mzc,
			hitsVar,
			_cshshi,
			_sep,
			_gap2,
			_shts,
			multVar,
			_bei,
			_sep2,
			_dcsh,
			maxVar,
			_ci,
		) {
			const effect: PeriodicEscalation = {
				type: "periodic_escalation",
				every_n_hits: hitsVar.extractVar,
				multiplier: multVar.extractVar,
				max_stacks: maxVar.extractVar,
			};
			return [effect];
		},
		primaryAffix(
			_gap,
			_ewcx,
			durVar,
			_miao,
			_sep,
			_mei,
			intervalVar,
			_mzcycsh,
		) {
			const effect: ExtendedDot = {
				type: "extended_dot",
				extra_seconds: durVar.extractVar,
				interval: intervalVar.extractVar,
			};
			return [effect];
		},
		exclusiveAffix(_lit, varRef, _p) {
			const effect: BuffDuration = { type: "buff_duration", value: varRef.extractVar };
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
