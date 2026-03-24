import type * as ohm from "ohm-js";

import { addExtractVar } from "./shared.js";

export function addSemantics(s: ohm.Semantics): void {
	addExtractVar(s);
	s.addOperation<any[]>("toEffects", {
		affixDescription(child) {
			return child.toEffects();
		},
		fx_changShengTianZe(_pre, varRef, _p) {
			return [{ type: "healing_increase", value: varRef.extractVar }];
		},
		fx_mingWangZhiLu(_bst, _s, _hsbcstdzzshjs, varRef, _p) {
			return [{ type: "final_dmg_bonus", value: varRef.extractVar }];
		},
		fx_tianMingYouGui(_sbstd, _s, _bsbstzcdshts, varRef, _p) {
			return [
				{ type: "probability_to_certain" },
				{ type: "damage_increase", value: varRef.extractVar },
			];
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
			_v2,
			_p2,
			_s3,
			_zcdsshts,
			_v3,
			_p3,
		) {
			return [{ type: "random_buff", attack: v1.extractVar }];
		},
		_terminal() {
			return [];
		},
		_iter(...children) {
			return children.flatMap((c: ohm.Node) => c.toEffects());
		},
	});
}
