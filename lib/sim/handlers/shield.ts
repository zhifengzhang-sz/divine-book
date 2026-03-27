/**
 * Shield handlers: shield_strength, shield
 *
 * Both left untyped:
 * - shield_strength: handler reads `duration`, schema (煞影千幻.ShieldStrength) only has `value`
 * - shield: handler reads `parent` (from Effect), not present in schema (周天星元.Shield)
 */

import type { Shield, ShieldStrength } from "../../parser/schema/effects.js";
import { register } from "./registry.js";

register<ShieldStrength>("shield_strength", (effect, ctx) => ({
	intents: [
		{
			type: "SHIELD" as const,
			value: ((effect.value as number) / 100) * ctx.atk,
			duration: (effect.duration as number) ?? 0,
		},
	],
}));

// shield: { value, duration, source, parent?, trigger? }
// Grants a shield based on a source stat (e.g., self_max_hp).
// Two forms:
//   Direct:  immediate SHIELD intent
//   Reactive (parent + trigger=per_tick): periodic shield via listener
register<Shield>("shield", (effect, ctx) => {
	const percent = effect.value as number;
	const duration = (effect.duration as number) ?? 0;
	const source = effect.source as string | undefined;

	// Resolve shield value from source
	let basis = ctx.atk;
	if (source === "self_max_hp") {
		basis = ctx.sourcePlayer.maxHp;
	}
	const shieldValue = (percent / 100) * basis;

	// Reactive form: periodic shield via listener on parent state
	if (effect.parent && effect.trigger === "per_tick") {
		const parent = effect.parent as string;
		return {
			listeners: [
				{
					parent,
					trigger: "per_tick" as const,
					handler: (listenerCtx) => {
						let b = listenerCtx.sourcePlayer.atk;
						if (source === "self_max_hp") {
							b = listenerCtx.sourcePlayer.maxHp;
						}
						return [
							{
								type: "SHIELD" as const,
								value: (percent / 100) * b,
								duration,
							},
						];
					},
				},
			],
		};
	}

	// Direct form: immediate shield
	return {
		intents: [{ type: "SHIELD" as const, value: shieldValue, duration }],
	};
});
