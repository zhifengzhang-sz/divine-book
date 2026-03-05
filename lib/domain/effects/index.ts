/** Aggregates all effect type definitions from §0–§13 */

import type { EffectTypeDef } from "../types.js";
import { BASE_DAMAGE_DEFS } from "./base-damage.js";
import { CONDITIONAL_DEFS } from "./conditional.js";
import { CRIT_DEFS } from "./crit.js";
import { DEBUFF_DEFS } from "./debuff.js";
import { DOT_DEFS } from "./dot.js";
import { ESCALATION_DEFS } from "./escalation.js";
import { HEALING_DEFS } from "./healing.js";
import { HP_BASED_DEFS } from "./hp-based.js";
import { MULTIPLIER_DEFS } from "./multiplier.js";
import { RESONANCE_DEFS } from "./resonance.js";
import { SELF_BUFF_DEFS } from "./self-buff.js";
import { SHARED_DEFS } from "./shared.js";
import { SHIELD_DEFS } from "./shield.js";
import { SPECIAL_DEFS } from "./special.js";
import { STATE_MOD_DEFS } from "./state-mod.js";
import { SYNCHRONY_DEFS } from "./synchrony.js";

export const ALL_EFFECT_DEFS: EffectTypeDef[] = [
	...SHARED_DEFS,
	...BASE_DAMAGE_DEFS,
	...MULTIPLIER_DEFS,
	...RESONANCE_DEFS,
	...SYNCHRONY_DEFS,
	...CRIT_DEFS,
	...CONDITIONAL_DEFS,
	...ESCALATION_DEFS,
	...HP_BASED_DEFS,
	...HEALING_DEFS,
	...SHIELD_DEFS,
	...STATE_MOD_DEFS,
	...DOT_DEFS,
	...SELF_BUFF_DEFS,
	...DEBUFF_DEFS,
	...SPECIAL_DEFS,
];
