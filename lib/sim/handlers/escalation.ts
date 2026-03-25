/**
 * Escalation handler: per_hit_escalation
 */

import type { PerHitEscalation } from "../../parser/schema/千锋聚灵剑.js";
import type { PerHitEscalationAffix } from "../../parser/schema/通用词缀.js";
import { register } from "./registry.js";

type V = string | number;

/**
 * The skill-form (千锋聚灵剑) has { value, stat: "skill_bonus", parent }.
 * Other books use stat: "damage" or "remaining_hits" (no schema yet).
 * The affix-form (通用词缀 破竹) has { hits, per_hit, max }.
 * Both share type: "per_hit_escalation". We union them so the handler
 * can discriminate via "per_hit" presence.
 */
type PerHitEscalationEffect =
	| PerHitEscalation
	| PerHitEscalationAffix
	| {
			type: "per_hit_escalation";
			value: V;
			stat: string;
			max?: V;
	  };

// per_hit_escalation: { value, stat: "skill_bonus" | "damage" | "remaining_hits", max? }
// Each hit k gets a bonus zone contribution based on hit index.
register<PerHitEscalationEffect>("per_hit_escalation", (effect) => {
	// Affix form: { hits, per_hit, max } — implies stat "remaining_hits"
	if ("per_hit" in effect) {
		const value = Number(effect.per_hit) / 100;
		const max = Number(effect.max) / 100;
		return {
			perHitEscalation: (hitIndex: number) => {
				const raw = hitIndex * value;
				return { M_dmg: max !== undefined ? Math.min(raw, max) : raw };
			},
		};
	}

	// Skill form: { value, stat, parent }
	const stat = "stat" in effect ? effect.stat : "skill_bonus";
	const value = Number(effect.value) / 100;
	const max =
		"max" in effect && effect.max !== undefined
			? Number(effect.max) / 100
			: undefined;

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
