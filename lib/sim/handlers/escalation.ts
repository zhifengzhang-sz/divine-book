/**
 * Escalation handler: per_hit_escalation
 */

import { register } from "./registry.js";

// per_hit_escalation: { value, stat: "skill_bonus" | "damage" | "remaining_hits", max? }
// Each hit k gets a bonus zone contribution based on hit index.
register("per_hit_escalation", (effect) => {
	const stat = effect.stat as string;
	const value = (effect.value as number) / 100;
	const max =
		effect.max !== undefined ? (effect.max as number) / 100 : undefined;

	return {
		perHitEscalation: (hitIndex: number) => {
			if (stat === "skill_bonus") {
				return { M_skill: hitIndex * value };
			}
			if (stat === "damage") {
				const raw = hitIndex * value;
				return { M_dmg: max !== undefined ? Math.min(raw, max) : raw };
			}
			if (stat === "remaining_hits") {
				// 破竹: each hit, remaining hits get +value%, max cap
				const raw = hitIndex * value;
				return { M_dmg: max !== undefined ? Math.min(raw, max) : raw };
			}
			return {};
		},
	};
});
