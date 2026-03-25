import type * as ohm from "ohm-js";

import type {
	BaseAttack,
	BuffStrength,
	ConditionalHpScaling,
	Effect,
	SelfBuff,
	StateRef,
} from "../../schema/浩然星灵诀.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
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
		stateClause(_gap, _huode, stateName, _zt, _colon, stateBody) {
			const ref: StateRef = { type: "state_ref", state: stateName.extractVar };
			return [ref, ...stateBody.toEffects()];
		},
		stateBody(_tisheng, varRef, _pct, _zzshjs, _sep, _chixu, durVar, _miao) {
			const effect: SelfBuff = {
				type: "self_buff",
				final_damage_bonus: varRef.extractVar,
				duration: durVar.extractVar,
			};
			return [effect];
		},
		primaryAffix(
			_zsmyy,
			varRef1,
			_pct1,
			_zzshjs,
			_sep1,
			_btjfj,
			varRef2,
			_pct2,
			_gkldsh,
			_sep2,
			_zdjsz,
			varRef3,
			_pct3,
			_zzshjs2,
		) {
			const effect: ConditionalHpScaling = {
				type: "conditional_hp_scaling",
				hp_threshold: varRef1.extractVar,
				value: varRef2.extractVar,
				max: varRef3.extractVar,
				basis: "final_damage_bonus",
			};
			return [effect];
		},
		exclusiveAffix(_sbstcjdzyx, varRef, _pct) {
			const effect: BuffStrength = { type: "buff_strength", value: varRef.extractVar };
			return [effect];
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
