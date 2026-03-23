import type * as ohm from "ohm-js";
import type { Effect } from "../effect-types.js";
import { addExtractVar, parseCn } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);

	s.addOperation<Effect[]>("toEffects", {
		skillDescription(_pre, baseAttack, _sep, seqCooldown) {
			return [...baseAttack.toEffects(), ...seqCooldown.toEffects()];
		},
		baseAttack(_zc, cnHit, _gongji, varRef, _pct, _atkli) {
			return [{ type: "base_attack", hits: parseCn(cnHit.sourceString.replace("段", "")), total: varRef.extractVar }];
		},
		sequencedCooldown(_ydfst, _sep, skillCooldown) {
			return skillCooldown.toEffects();
		},
		skillCooldown(_sqxyg, varRef, _mlqsj) {
			return [{ type: "debuff", name: "神通封印", target: "next_skill_cooldown", value: varRef.extractVar, duration: varRef.extractVar, sequenced: true }];
		},
		primaryAffix(_sdfst, varRef, _pct, _sep, _cx, durVar, _miao) {
			return [{ type: "debuff", target: "skill_damage", value: varRef.extractVar, duration: durVar.extractVar }];
		},
		exclusiveAffix(_pre, _sep, _sqygsfst, varRef, _pct, _dstshjs) {
			return [{ type: "next_skill_buff", value: varRef.extractVar }];
		},
		preamble(_) { return []; },
		cnHitCount(_cn, _d) { return []; },
		_terminal() { return []; },
		_iter(...children) { return children.flatMap((c: ohm.Node) => c.toEffects()); },
	});
}
